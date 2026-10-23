import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';

const fixture = (f: string) => fileURLToPath(new URL(`../fixtures/${f}`, import.meta.url));
const srt = (name: string, text: string) => ({ name, mimeType: 'text/plain', buffer: Buffer.from(`1\n00:00:01,000 --> 00:00:02,000\n${text}\n`) });
const isPdf = (bytes: Uint8Array) => Buffer.from(bytes.slice(0, 5)).toString() === '%PDF-';

async function downloadFrom(page: Page, button: string) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: button }).click()]);
  return { name: download.suggestedFilename(), bytes: new Uint8Array(await readFile(await download.path())) };
}

test('srt to pdf: preview, then download a PDF', async ({ page }) => {
  const violations: string[] = [];
  await page.exposeFunction('cspViolation', (v: string) => violations.push(v));
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) =>
    (window as unknown as { cspViolation: (v: string) => void }).cspViolation(`${e.violatedDirective} ${e.blockedURI}`)));
  const fonts: string[] = [];
  page.on('request', (r) => r.url().includes('/fonts/Noto') && fonts.push(new URL(r.url()).pathname));

  await page.goto('/convert-subtitles-to-pdf');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.srt'));
  const rows = page.locator('tbody tr');
  await expect(rows.first()).toContainText('00:00:01');
  await page.getByLabel('Timestamps').uncheck();
  await expect(rows.first().locator('td').nth(1)).toHaveText('');

  const { name, bytes } = await downloadFrom(page, 'Download');
  expect(name).toBe('sample.pdf');
  expect(isPdf(bytes)).toBe(true);
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  // Latin text needs only Noto Sans.
  expect(fonts).toEqual(['/fonts/NotoSans-Regular.ttf']);
  expect(violations).toEqual([]);
});

test('any text file is accepted as paragraphs', async ({ page }) => {
  await page.goto('/convert-subtitles-to-pdf');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('not-subtitle.txt'));
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByRole('status')).toContainText('plain text file, so the PDF has no timestamps');
  const { name, bytes } = await downloadFrom(page, 'Download');
  expect(name).toBe('not-subtitle.pdf');
  expect(isPdf(bytes)).toBe(true);
});

test('japanese text loads the JP font, emoji are listed as left out', async ({ page }) => {
  const font = page.waitForRequest((r) => r.url().endsWith('/fonts/NotoSansJP-Regular.ttf'));
  await page.goto('/convert-subtitles-to-pdf');
  await page.getByLabel('Choose a subtitle file').setInputFiles(srt('ja.srt', '今日はいい天気ですね 🎉'));
  await expect(page.getByRole('status')).toContainText('left out of the PDF: 🎉');
  const { bytes } = await downloadFrom(page, 'Download');
  await font;
  expect(isPdf(bytes)).toBe(true);
});

test('a batch downloads a zip of PDFs, or one combined PDF', async ({ page }) => {
  await page.goto('/convert-subtitles-to-pdf');
  await expect(page.getByLabel('Combine into one PDF')).toBeHidden();
  await page.getByLabel('Choose a subtitle file').setInputFiles([srt('a.srt', 'A'), srt('b.srt', 'B')]);
  await expect(page.getByText('2 files.')).toBeVisible();

  const zip = await downloadFrom(page, 'Download all (.zip)');
  const files = unzipSync(zip.bytes);
  expect(Object.keys(files).sort()).toEqual(['a.pdf', 'b.pdf']);
  expect(isPdf(files['a.pdf'])).toBe(true);

  await page.getByLabel('Combine into one PDF').check();
  const one = await downloadFrom(page, 'Download');
  expect(one.name).toBe('subtitles.pdf');
  expect((await PDFDocument.load(one.bytes)).getPageCount()).toBe(2);
});

test('pdf converter is in the nav and on the homepage', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'All tools' }).click();
  await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Convert to PDF' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Convert to PDF' })).toBeVisible();
});
