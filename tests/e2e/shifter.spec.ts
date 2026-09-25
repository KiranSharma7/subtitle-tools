import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

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
