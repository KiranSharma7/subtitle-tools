import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { strFromU8, unzipSync } from 'fflate';

const fixture = (f: string) => fileURLToPath(new URL(`../fixtures/${f}`, import.meta.url));
const srt = (name: string, text: string) => ({ name, mimeType: 'text/plain', buffer: Buffer.from(`1\n00:00:01,000 --> 00:00:02,000\n${text}\n`) });

test('move srt cues to the top and download', async ({ page }) => {
  await page.goto('/change-subtitle-position');
  await page.getByLabel('Choose a subtitle file').setInputFiles(srt('film.srt', '{\\an2}Hello'));

  await expect(page.getByLabel('Top center')).toBeChecked();
  await expect(page.locator('tbody tr').first()).toContainText('Top center');
  await expect(page.locator('tbody tr').first()).toContainText('Hello');
  await expect(page.getByText('1 cue moved to the top center.')).toBeVisible();

  await page.getByLabel('Bottom right').check();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(download.suggestedFilename()).toBe('film.srt');
  expect(await readFile(await download.path(), 'utf8')).toBe('1\n00:00:01,000 --> 00:00:02,000\n{\\an3}Hello\n');

  await page.getByLabel('Remove position').check();
  await expect(page.getByText('Position removed from 1 cue.')).toBeVisible();
});

test('save srt as ass puts the position in the Default style', async ({ page }) => {
  await page.goto('/change-subtitle-position');
  await page.getByLabel('Choose a subtitle file').setInputFiles(srt('film.srt', '<font color="red">Hi</font>'));
  await page.getByLabel('Save SRT and WebVTT as ASS').check();
  await expect(page.getByRole('status')).toContainText('Formatting tags (colours, fonts, fades) dropped: cue 1.');

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(download.suggestedFilename()).toBe('film.ass');
  const out = await readFile(await download.path(), 'utf8');
  expect(out).toMatch(/\nStyle: Default,[^\n]*,8,10,10,10,1\n/);
  expect(out).toContain('Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,Hi\n');
});

test('ass cues placed with \\pos are listed', async ({ page }) => {
  await page.goto('/change-subtitle-position');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.ass'));
  await expect(page.getByRole('status')).toContainText('keep it: cue 2.');
  await expect(page.locator('tbody tr').nth(1)).toContainText('Kept (\\pos)');
});

test('formats with no position support show an error', async ({ page }) => {
  await page.goto('/change-subtitle-position');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.sub'));
  await expect(page.getByRole('alert')).toContainText('SRT, WebVTT, ASS and SSA');
});

test('several files download as one zip', async ({ page }) => {
  await page.goto('/change-subtitle-position');
  await page.getByLabel('Choose a subtitle file').setInputFiles([srt('a.srt', 'A'), srt('b.srt', 'B')]);
  await expect(page.getByText('2 files.')).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download all (.zip)' }).click()]);
  const files = unzipSync(await readFile(await download.path()));
  expect(Object.keys(files).sort()).toEqual(['a.srt', 'b.srt']);
  expect(strFromU8(files['a.srt'])).toContain('{\\an8}A');
});
