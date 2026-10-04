import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

const fixture = (f: string) => fileURLToPath(new URL(`../fixtures/${f}`, import.meta.url));

test('convert a Windows-1251 file to UTF-8', async ({ page }) => {
  await page.goto('/utf-8-converter');
  await page.getByLabel('Choose a file').setInputFiles(fixture('cp1251.srt'));
  await expect(page.getByLabel('Read as')).toHaveValue('windows-1251');
  await expect(page.locator('tbody tr').nth(2)).toContainText('Привет');

  await page.getByLabel('Read as').selectOption('windows-1252');
  await expect(page.locator('tbody tr').nth(2)).toContainText('Ïðèâåò');
  await page.getByLabel('Read as').selectOption('windows-1251');

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(download.suggestedFilename()).toBe('cp1251.srt');
  expect((await readFile(await download.path())).equals(await readFile(fixture('cp1251-utf8.srt')))).toBe(true);
});

test('UTF-8 and non-subtitle text: says so and drops the BOM', async ({ page }) => {
  await page.goto('/utf-8-converter');
  await page.getByLabel('Choose a file').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('\ufeffcafé\r\nnot subtitles\n') });
  await expect(page.getByRole('status')).toContainText('already UTF-8');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect((await readFile(await download.path())).equals(Buffer.from('café\r\nnot subtitles\n'))).toBe(true);
});

test('a batch converts each file with its own encoding', async ({ page }) => {
  await page.goto('/utf-8-converter');
  const payload = async (f: string) => ({ name: f, mimeType: 'text/plain', buffer: await readFile(fixture(f)) });
  await page.getByLabel('Choose a file').setInputFiles([await payload('cp1251.srt'), await payload('gbk.srt')]);
  await expect(page.getByRole('listitem').filter({ hasText: 'cp1251.srt' })).toContainText('read as windows-1251');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download all (.zip)' }).click()]);
  const zip = unzipSync(await readFile(await download.path()));
  expect(Buffer.from(zip['cp1251.srt']).equals(await readFile(fixture('cp1251-utf8.srt')))).toBe(true);
  expect(Buffer.from(zip['gbk.srt']).equals(await readFile(fixture('gbk-utf8.srt')))).toBe(true);
});
