import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const fixture = (f: string) => fileURLToPath(new URL(`../fixtures/${f}`, import.meta.url));

test('toggle options, check the preview, download', async ({ page }) => {
  await page.goto('/srt-cleaner');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.srt'));

  for (const name of ['SDH notes', 'Speaker labels', 'Subtitle-site credits', 'Merge back-to-back repeats']) {
    await expect(page.getByLabel(name)).not.toBeChecked();
  }
  await expect(page.getByText('0 cues changed, 0 removed.')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveText(['No cues change with these settings.']);

  await page.getByText('More options').click();
  await page.getByLabel('italic').uncheck();
  await page.getByLabel('unnecessary line breaks').check();
  // The preview lists only changed cues.
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Line one line two');
  await expect(rows.first()).toHaveClass('flag');
  await expect(page.getByText('1 cues changed, 0 removed.')).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(download.suggestedFilename()).toBe('sample.srt');
  expect((await readFile(await download.path())).toString()).toBe((await readFile(fixture('sample-cleaned.srt'))).toString());
});
