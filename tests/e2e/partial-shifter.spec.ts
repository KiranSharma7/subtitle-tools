import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const fixture = (f: string) => fileURLToPath(new URL(`../fixtures/${f}`, import.meta.url));

test('shift two ranges and download', async ({ page }) => {
  await page.goto('/partial-subtitle-shifter');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.srt'));

  const r1 = page.getByRole('group', { name: 'Range 1' });
  await r1.getByLabel('To').fill('00:00:05,000');
  await r1.getByLabel('Shift by').fill('2');
  await page.getByRole('button', { name: 'Add range' }).click();
  const r2 = page.getByRole('group', { name: 'Range 2' });
  await r2.getByLabel('From').fill('01:00:00,000');
  await r2.getByLabel('To').fill('02:00:00,000');
  await r2.getByLabel('Shift by').fill('-3.456');

  const rows = page.locator('tbody tr');
  await expect(rows.nth(0)).toContainText('00:00:03,000Range 1');
  await expect(rows.nth(2)).not.toContainText('Range');
  await expect(rows.nth(3)).toContainText('01:02:00,000Range 2');

  await r2.getByLabel('From').fill('00:00:04,000');
  await expect(page.getByRole('status')).toContainText('Range 1 and range 2 overlap');
  await r2.getByLabel('From').fill('01:00:00,000');
  await expect(page.getByRole('status')).not.toContainText('overlap');

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect((await readFile(await download.path())).toString()).toBe((await readFile(fixture('sample-partial-shifted.srt'))).toString());

  await r2.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByRole('group', { name: 'Range 2' })).toHaveCount(0);
  await expect(rows.nth(3)).toContainText('01:02:03,456');
});
