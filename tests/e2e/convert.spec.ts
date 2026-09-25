import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const fixture = (f: string) => fileURLToPath(new URL(`../fixtures/${f}`, import.meta.url));

test('convert WebVTT to SRT, see the loss report, download', async ({ page }) => {
  await page.goto('/convert-to-srt');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.vtt'));

  await expect(page.getByText('sample.vtt: 3 cues, VTT.')).toBeVisible();
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(2)).toContainText('01:02:03,456');
  const report = page.getByRole('status');
  await expect(report).toContainText('The file header (title, styles and other settings) dropped.');
  await expect(report).toContainText('Cue ids dropped: cue 1.');
  await expect(report).toContainText('Cue settings (position and alignment) dropped: cue 1, 2.');

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(download.suggestedFilename()).toBe('sample.srt');
  expect((await readFile(await download.path())).equals(await readFile(fixture('sample-converted.srt')))).toBe(true);
});

test('convert SRT to WebVTT and download', async ({ page }) => {
  await page.goto('/convert-to-webvtt');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.srt'));

  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(3)).toContainText('01:02:03.456');
  // Only the parser problem shows; SRT to WebVTT loses nothing.
  await expect(page.getByRole('status').locator('p')).toHaveCount(1);
  await expect(page.getByRole('status')).toContainText('Line 19');

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(download.suggestedFilename()).toBe('sample.vtt');
  expect((await readFile(await download.path())).equals(await readFile(fixture('sample-converted.vtt')))).toBe(true);
});

test('both converters are in the nav and on the homepage', async ({ page }) => {
  await page.goto('/');
  for (const name of ['Convert to SRT', 'Convert to WebVTT']) {
    await expect(page.getByRole('navigation').getByRole('link', { name })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name })).toBeVisible();
  }
});
