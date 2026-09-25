import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const fixture = (f: string) => fileURLToPath(new URL(`../fixtures/${f}`, import.meta.url));

test('list problems in a broken file, fix and download', async ({ page }) => {
  await page.goto('/subtitle-validator');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('broken.srt'));

  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(8);
  await expect(rows.nth(0)).toContainText('Cue 2 is numbered 3.');
  await expect(rows.nth(6)).toContainText('Cue 7 overlaps cue 6.');
  await expect(page.getByRole('status')).toContainText('8 problems found.');

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Fix and download' }).click()]);
  expect(download.suggestedFilename()).toBe('broken.srt');
  expect((await readFile(await download.path())).toString()).toBe((await readFile(fixture('broken-fixed.srt'))).toString());
});

test('a clean file shows no problems found', async ({ page }) => {
  await page.goto('/subtitle-validator');
  await page.getByLabel('Choose a subtitle file').setInputFiles({ name: 'ok.srt', mimeType: 'text/plain', buffer: Buffer.from('1\n00:00:01,000 --> 00:00:02,000\nHi\n') });
  await expect(page.locator('tbody tr')).toHaveText(['No problems found.']);
});
