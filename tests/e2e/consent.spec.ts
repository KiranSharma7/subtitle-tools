import { test, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const fixture = (f: string) => fileURLToPath(new URL(`../fixtures/${f}`, import.meta.url));

// Count every request to Google; answer them with an empty script so nothing leaves the test.
async function watchGoogle(page: Page) {
  const hits: string[] = [];
  await page.route(/google(tagmanager|-analytics)\.com/, (route) => (hits.push(route.request().url()), route.fulfill({ body: '' })));
  return hits;
}

test('no GA requests before Accept or after Reject, and the banner stays away', async ({ page }) => {
  const hits = await watchGoogle(page);
  await page.goto('/subtitle-shifter');
  const banner = page.getByRole('region', { name: 'Cookie consent' });
  await expect(banner).toBeVisible();
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.srt'));
  await expect(page.locator('tbody tr')).toHaveCount(4);

  await page.getByRole('button', { name: 'Reject' }).click();
  await expect(banner).toBeHidden();
  await page.reload();
  await expect(banner).toBeHidden();
  expect(hits).toEqual([]);
  expect(await page.evaluate(() => window.dataLayer)).toBeUndefined();
});

test('after Accept, GA loads and tool events carry only tool and formats', async ({ page }) => {
  const hits = await watchGoogle(page);
  await page.goto('/convert-to-webvtt');
  await page.getByRole('button', { name: 'Accept' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeHidden();
  await expect.poll(() => hits.length).toBeGreaterThan(0);

  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.srt'));
  await expect(page.locator('tbody tr').first()).toBeVisible();
  await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);

  const events = await page.evaluate(() => (window.dataLayer as IArguments[]).map((a) => [...a]).filter((a) => a[0] === 'event'));
  expect(events).toEqual([
    ['event', 'file_loaded', { tool: 'convert-to-webvtt', input_format: 'srt' }],
    ['event', 'download', { tool: 'convert-to-webvtt', input_format: 'srt', output_format: 'vtt' }],
  ]);
  expect(JSON.stringify(events)).not.toContain('sample');
});

test('the choice can be changed from the footer and the privacy page', async ({ page }) => {
  await page.goto('/privacy');
  await page.getByRole('button', { name: 'Reject' }).click();
  await page.getByRole('button', { name: 'change cookie settings' }).click();
  await expect(page.getByRole('button', { name: 'Accept' })).toBeFocused();
  await page.getByRole('button', { name: 'Accept' }).click();
  await page.getByRole('button', { name: 'Cookie settings', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeVisible();
});

test('the banner fits at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 700 });
  await page.goto('/');
  const box = (await page.getByRole('region', { name: 'Cookie consent' }).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(360);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});
