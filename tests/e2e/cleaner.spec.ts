import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const fixture = (f: string) => fileURLToPath(new URL(`../fixtures/${f}`, import.meta.url));

test('toggle options, check the preview, download', async ({ page }) => {
  await page.goto('/srt-cleaner');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.srt'));

  for (const name of ['Remove SDH descriptions', 'Remove speaker labels', 'Remove subtitle-site credits', 'Merge neighbouring cues']) {
    await expect(page.getByLabel(name)).not.toBeChecked();
  }
  await expect(page.getByRole('status')).toContainText('0 cues changed, 0 removed.');

  await page.getByLabel('italic').uncheck();
  await page.getByLabel('Remove unnecessary line breaks').check();
  const row = page.locator('tbody tr').nth(2);
  await expect(row).toContainText('Line one line two');
  await expect(row).toHaveClass('flag');
  await expect(page.getByRole('status')).toContainText('1 cues changed, 0 removed.');

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(download.suggestedFilename()).toBe('sample.srt');
  expect((await readFile(await download.path())).toString()).toBe((await readFile(fixture('sample-cleaned.srt'))).toString());
});
