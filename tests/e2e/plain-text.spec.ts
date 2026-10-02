import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const fixture = (f: string) => fileURLToPath(new URL(`../fixtures/${f}`, import.meta.url));

test('convert to plain text, join lines, download', async ({ page }) => {
  await page.goto('/convert-to-plain-text');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.vtt'));

  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1)).toContainText('Line one\nline two');
  await expect(rows.nth(1)).not.toContainText('<i>');
  await expect(page.getByRole('status')).toContainText('Cue settings (position and alignment) dropped: cue 1, 2.');

  await page.getByLabel('Keep line breaks').uncheck();
  await expect(rows.nth(1)).toContainText('Line one line two');

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(download.suggestedFilename()).toBe('sample.txt');
  expect((await readFile(await download.path())).equals(await readFile(fixture('sample-joined.txt')))).toBe(true);
});

test('plain text input is refused with a reason', async ({ page }) => {
  await page.goto('/convert-to-plain-text');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('not-subtitle.txt'));
  await expect(page.getByRole('alert')).toContainText("Plain text can't be read: it has no timing.");
});

test('plain text converter is in the nav and on the homepage', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'All tools' }).click();
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Convert to plain text' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Convert to plain text' })).toBeVisible();
});
