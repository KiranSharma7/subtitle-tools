import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const fixture = (f: string) => fileURLToPath(new URL(`../fixtures/${f}`, import.meta.url));

async function download(page: import('@playwright/test').Page) {
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  return { name: d.suggestedFilename(), bytes: await readFile(await d.path()) };
}

test('shift an ASS file and keep it as ASS', async ({ page }) => {
  await page.goto('/subtitle-shifter');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.ass'));
  await expect(page.getByText('sample.ass: 3 cues, ASS.')).toBeVisible();
  await page.getByLabel('Amount').fill('1');

  const d = await download(page);
  expect(d.name).toBe('sample.ass');
  expect(d.bytes.equals(await readFile(fixture('sample-shifted-1s-later.ass')))).toBe(true);
});

test('convert an ASS file to SRT with a loss report', async ({ page }) => {
  await page.goto('/convert-to-srt');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.ass'));
  await expect(page.locator('tbody tr').nth(0)).toContainText('<i>Hello</i>, there\nsecond line');
  const report = page.getByRole('status');
  await expect(report).toContainText('Karaoke timing dropped: cue 3.');
  await expect(report).toContainText('Position and alignment tags dropped: cue 2.');

  const d = await download(page);
  expect(d.name).toBe('sample.srt');
  expect(d.bytes.equals(await readFile(fixture('sample-ass-converted.srt')))).toBe(true);
});

test('convert a SAMI file to SRT', async ({ page }) => {
  await page.goto('/convert-to-srt');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.smi'));
  await expect(page.getByText('sample.smi: 3 cues, SAMI.')).toBeVisible();
  await expect(page.locator('tbody tr').nth(0)).toContainText('Hello & welcome\nto the <i>show</i>');

  const d = await download(page);
  expect(d.name).toBe('sample.srt');
  expect(d.bytes.equals(await readFile(fixture('sample-sami-converted.srt')))).toBe(true);
});

test('MicroDVD with no frame rate: pick one and the preview timing follows', async ({ page }) => {
  await page.goto('/convert-to-srt');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.sub'));
  await expect(page.getByText('sample.sub: 2 cues, MicroDVD.')).toBeVisible();
  const picker = page.getByLabel('Frame rate');
  await expect(picker).toHaveValue('23.976');
  const rows = page.locator('tbody tr');
  await expect(rows.nth(0)).toContainText('00:00:01,001');

  await picker.selectOption('24');
  await expect(rows.nth(0)).toContainText('00:00:01,000');
  await expect(rows.nth(1)).toContainText('00:00:05,000');
});

test('MicroDVD with a frame rate in the file says so and hides the picker', async ({ page }) => {
  await page.goto('/subtitle-shifter');
  await page.getByLabel('Choose a subtitle file').setInputFiles({ name: 'film.sub', mimeType: 'text/plain', buffer: Buffer.from('{1}{1}25\n{25}{50}Hi\n') });
  await expect(page.getByText('film.sub: 1 cues, MicroDVD, 25 fps from the file.')).toBeVisible();
  await expect(page.getByLabel('Frame rate')).toBeHidden();
});

test('convert an MPL2 file to SRT', async ({ page }) => {
  await page.goto('/convert-to-srt');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample-mpl2.txt'));
  await expect(page.getByText('sample-mpl2.txt: 3 cues, MPL2.')).toBeVisible();
  await expect(page.locator('tbody tr').nth(1)).toContainText('<i>Whole line italic</i>');

  const d = await download(page);
  expect(d.name).toBe('sample-mpl2.srt');
  expect(d.bytes.equals(await readFile(fixture('sample-mpl2-converted.srt')))).toBe(true);
});

test('convert an LRC file to SRT with word timings reported', async ({ page }) => {
  await page.goto('/convert-to-srt');
  await page.getByLabel('Choose a subtitle file').setInputFiles({
    name: 'song.lrc',
    mimeType: 'text/plain',
    buffer: Buffer.from('[ar:Band]\n[00:01.00]<00:01.00>One <00:01.50>two\n[00:03.00]Three\n'),
  });
  await expect(page.getByText('song.lrc: 2 cues, LRC.')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Word timings dropped: cue 1.');
  const d = await download(page);
  expect(d.name).toBe('song.srt');
  expect(d.bytes.toString()).toBe('1\n00:00:01,000 --> 00:00:03,000\nOne two\n\n2\n00:00:03,000 --> 00:00:08,000\nThree\n');
});
