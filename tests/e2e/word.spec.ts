import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { strFromU8, unzipSync } from 'fflate';

const fixture = (f: string) => fileURLToPath(new URL(`../fixtures/${f}`, import.meta.url));
const documentXml = async (path: string) => strFromU8(unzipSync(new Uint8Array(await readFile(path)))['word/document.xml']);

test('convert an SRT to a Word document, with and without timestamps', async ({ page }) => {
  await page.goto('/srt-to-word');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.srt'));
  await expect(page.locator('tbody tr').first()).toContainText('00:00:01 – 00:00:03');

  const [d1] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(d1.suggestedFilename()).toBe('sample.docx');
  const withTimes = await documentXml(await d1.path());
  expect(withTimes).toContain('>sample.srt<');
  expect(withTimes).toContain('>00:00:01 – 00:00:03<');
  expect(withTimes).toContain('>Hello<');

  await page.getByLabel('Timestamps').uncheck();
  const [d2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(await documentXml(await d2.path())).not.toContain('00:00:01');
});

test('several files can be combined into one document', async ({ page }) => {
  await page.goto('/srt-to-word');
  await page.getByLabel('Choose a subtitle file').setInputFiles([fixture('sample.srt'), fixture('sample.vtt')]);
  await page.getByLabel('Combine into one document').check();
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(d.suggestedFilename()).toBe('subtitles.docx');
  const xml = await documentXml(await d.path());
  expect(xml).toContain('>sample.srt<');
  expect(xml).toContain('>sample.vtt<');
  expect(xml.match(/<w:pageBreakBefore\/>/g)).toHaveLength(1);
});
