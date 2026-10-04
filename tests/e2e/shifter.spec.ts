import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { strFromU8, unzipSync, zipSync } from 'fflate';

const fixture = (f: string) => fileURLToPath(new URL(`../fixtures/${f}`, import.meta.url));

test('shift a file earlier and download it', async ({ page }) => {
  await page.goto('/subtitle-shifter');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.srt'));

  await expect(page.getByText('sample.srt: 4 cues, SRT.')).toBeVisible();
  await expect(page.getByLabel('Read as')).toHaveValue('UTF-8');
  await expect(page.getByRole('status')).toContainText('Line 19');

  await page.getByLabel('Amount').fill('1.5');
  await page.getByLabel('Direction').selectOption('earlier');

  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(0)).toContainText('00:00:00,000');
  await expect(rows.nth(1)).toContainText('removed');
  await expect(rows.nth(3)).toContainText('01:02:01,956');
  await expect(page.getByRole('status')).toContainText('start too early: cue 1.');
  await expect(page.getByRole('status')).toContainText('end before 0:00: cue 2.');

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(download.suggestedFilename()).toBe('sample.srt');
  const got = await readFile(await download.path());
  expect(got.equals(await readFile(fixture('sample-shifted-1.5s-earlier.srt')))).toBe(true);
});

test('changing the encoding re-renders the preview', async ({ page }) => {
  await page.goto('/subtitle-shifter');
  await page.getByLabel('Choose a subtitle file').setInputFiles({
    name: 'cafe.srt',
    mimeType: 'text/plain',
    buffer: Buffer.from('1\n00:00:01,000 --> 00:00:02,000\nCaf\xe9\n', 'latin1'),
  });
  await expect(page.getByLabel('Read as')).not.toHaveValue('UTF-8');
  await page.getByLabel('Read as').selectOption('windows-1251');
  await expect(page.locator('tbody tr').first()).toContainText('Cafй');
});

test('a non-subtitle file shows an error', async ({ page }) => {
  await page.goto('/subtitle-shifter');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('not-subtitle.txt'));
  await expect(page.getByRole('alert')).toHaveText("This does not look like a subtitle file. Plain text can't be read: it has no timing.");
  await expect(page.getByRole('button', { name: 'Download' })).toBeHidden();
});

const payload = async (f: string) => ({ name: f, mimeType: 'text/plain', buffer: await readFile(fixture(f)) });
const two = { name: 'two.srt', mimeType: 'text/plain', buffer: Buffer.from('1\n00:00:05,000 --> 00:00:06,000\nTwo\n') };

test('several files shift as a batch and download as one zip', async ({ page }) => {
  await page.goto('/subtitle-shifter');
  await page.getByLabel('Choose a subtitle file').setInputFiles([await payload('sample.srt'), two]);

  await expect(page.getByText('2 files.')).toBeVisible();
  const files = page.getByRole('listitem').filter({ hasText: '.srt' });
  await expect(files).toHaveCount(2);
  await expect(files.nth(0)).toContainText('sample.srt');
  await expect(files.nth(0)).toContainText('4 cues, SRT');
  await expect(files.nth(0)).toContainText('Line 19');
  await expect(files.nth(1)).toContainText('two.srt');

  await page.getByLabel('Amount').fill('1.5');
  await page.getByLabel('Direction').selectOption('earlier');
  await expect(files.nth(0)).toContainText('start too early: cue 1.');
  await expect(files.nth(1)).toContainText('1 cue shifted 1.5 seconds earlier.');
  await expect(page.locator('tbody tr')).toBeHidden();

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download all (.zip)' }).click()]);
  expect(download.suggestedFilename()).toBe('subtitles.zip');
  const zip = unzipSync(await readFile(await download.path()));
  expect(Object.keys(zip)).toEqual(['sample.srt', 'two.srt']);
  expect(Buffer.from(zip['sample.srt']).equals(await readFile(fixture('sample-shifted-1.5s-earlier.srt')))).toBe(true);
  expect(strFromU8(zip['two.srt'])).toBe('1\n00:00:03,500 --> 00:00:04,500\nTwo\n');
});

test('a zip of subtitles opens as a batch, skipping files that are not subtitles', async ({ page }) => {
  await page.goto('/subtitle-shifter');
  const buffer = Buffer.from(zipSync({ 'sample.srt': await readFile(fixture('sample.srt')), 'two.srt': two.buffer, 'cover.jpg': new Uint8Array([1]) }));
  await page.getByLabel('Choose a subtitle file').setInputFiles({ name: 'season.zip', mimeType: 'application/zip', buffer });
  await expect(page.getByText('2 files.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download all (.zip)' })).toBeVisible();
});

test('a zip with one subtitle keeps the normal preview', async ({ page }) => {
  await page.goto('/subtitle-shifter');
  const buffer = Buffer.from(zipSync({ 'sample.srt': await readFile(fixture('sample.srt')) }));
  await page.getByLabel('Choose a subtitle file').setInputFiles({ name: 'one.zip', mimeType: 'application/zip', buffer });
  await expect(page.getByText('sample.srt: 4 cues, SRT.')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Download', exact: true })).toBeVisible();
});

test('a file that cannot be read is listed and left out of the zip', async ({ page }) => {
  await page.goto('/subtitle-shifter');
  await page.getByLabel('Choose a subtitle file').setInputFiles([await payload('not-subtitle.txt'), two]);
  await expect(page.getByText('2 files, 1 could not be read.')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'not-subtitle.txt' })).toContainText('does not look like a subtitle file');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download all (.zip)' }).click()]);
  expect(Object.keys(unzipSync(await readFile(await download.path())))).toEqual(['two.srt']);
});
