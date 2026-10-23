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
  await page.goto('/srt-to-vtt');
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
  await page.getByRole('button', { name: 'All tools' }).click();
  for (const name of ['Convert to SRT', 'SRT to VTT']) {
    await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name })).toBeVisible();
  }
});

// Each format-pair page runs the same converter as the hub, so the hub's expected files apply.
for (const [path, input, expected] of [
  ['/vtt-to-srt', 'sample.vtt', 'sample-converted.srt'],
  ['/ass-to-srt', 'sample.ass', 'sample-ass-converted.srt'],
  ['/smi-to-srt', 'sample.smi', 'sample-sami-converted.srt'],
]) {
  test(`${path} converts ${input} the same as the SRT converter`, async ({ page }) => {
    await page.goto(path);
    await page.getByLabel('Choose a subtitle file').setInputFiles(fixture(input));
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
    expect(download.suggestedFilename()).toBe(input.replace(/\.\w+$/, '.srt'));
    expect((await readFile(await download.path())).equals(await readFile(fixture(expected)))).toBe(true);
  });
}

test('/sub-to-srt turns MicroDVD frames into SRT times', async ({ page }) => {
  await page.goto('/sub-to-srt');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.sub'));
  await expect(page.locator('#fps-picker')).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(download.suggestedFilename()).toBe('sample.srt');
  expect(await readFile(await download.path(), 'utf8')).toMatch(/^1\n\d\d:\d\d:\d\d,\d{3} --> /);
});

test('/srt-to-ass writes an ASS file with a Default style', async ({ page }) => {
  await page.goto('/srt-to-ass');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.srt'));
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(download.suggestedFilename()).toBe('sample.ass');
  const ass = await readFile(await download.path(), 'utf8');
  expect(ass).toContain('[V4+ Styles]');
  expect(ass).toMatch(/\nDialogue: 0,0:00:01\.00,[^\n]*,Default,/);
});

test('the old converter URLs are listed as permanent redirects', async () => {
  const rules = await readFile(fileURLToPath(new URL('../../public/_redirects', import.meta.url)), 'utf8');
  for (const [from, to] of [['/timed-lyrics', '/lrc-maker'], ['/convert-to-webvtt', '/srt-to-vtt'], ['/convert-to-plain-text', '/srt-to-txt']]) {
    expect(rules).toMatch(new RegExp(`^${from} ${to} 301$`, 'm'));
  }
});
