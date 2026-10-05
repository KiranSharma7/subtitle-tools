import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { strFromU8, unzipSync } from 'fflate';

const fixture = (f: string) => fileURLToPath(new URL(`../fixtures/${f}`, import.meta.url));
const srt = (name: string, text: string) => ({ name, mimeType: 'text/plain', buffer: Buffer.from(`1\n00:00:01,000 --> 00:00:02,000\n${text}\n`) });

test('color srt cues and download', async ({ page }) => {
  await page.goto('/change-subtitle-color');
  await page.getByLabel('Choose a subtitle file').setInputFiles(srt('film.srt', '<font color="red">Hello</font>'));

  await expect(page.getByLabel('Text color')).toHaveValue('#ffff00');
  await expect(page.locator('tbody tr').first()).toContainText('#ffff00');
  await expect(page.getByText('1 cue colored #ffff00.')).toBeVisible();

  await page.getByLabel('Text color').fill('#00ccff');
  await expect(page.getByText('1 cue colored #00ccff.')).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(download.suggestedFilename()).toBe('film.srt');
  expect(await readFile(await download.path(), 'utf8')).toBe('1\n00:00:01,000 --> 00:00:02,000\n<font color="#00ccff">Hello</font>\n');
});

test('colors on part of a line are kept and listed', async ({ page }) => {
  await page.goto('/change-subtitle-color');
  await page.getByLabel('Choose a subtitle file').setInputFiles(srt('film.srt', 'Say <font color="red">this</font>'));
  await expect(page.getByRole('status')).toContainText('own color, which stays: cue 1.');
  await expect(page.locator('tbody tr').first()).toContainText('part kept');
});

test('save srt as ass puts the color in the Default style', async ({ page }) => {
  await page.goto('/change-subtitle-color');
  await page.getByLabel('Choose a subtitle file').setInputFiles(srt('film.srt', 'Hi'));
  await page.getByLabel('Text color').fill('#ff0000');
  await page.getByLabel('Save SRT and WebVTT as ASS').check();

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(download.suggestedFilename()).toBe('film.ass');
  expect(await readFile(await download.path(), 'utf8')).toMatch(/\nStyle: Default,Arial,20,&H000000FF,/);
});

test('ass styles get the new PrimaryColour', async ({ page }) => {
  await page.goto('/change-subtitle-color');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.ass'));
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  const out = await readFile(await download.path(), 'utf8');
  expect(out).toContain('Style: Default,Arial,48,&H0000FFFF,');
  expect(out).toContain('Style: Sign,Arial,40,&H0000FFFF,');
});

test('formats with no color support show an error', async ({ page }) => {
  await page.goto('/change-subtitle-color');
  await page.getByLabel('Choose a subtitle file').setInputFiles(fixture('sample.sub'));
  await expect(page.getByRole('alert')).toContainText('SRT, WebVTT, ASS and SSA');
});

test('several files download as one zip', async ({ page }) => {
  await page.goto('/change-subtitle-color');
  await page.getByLabel('Choose a subtitle file').setInputFiles([srt('a.srt', 'A'), srt('b.srt', 'B')]);
  await expect(page.getByText('2 files.')).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download all (.zip)' }).click()]);
  const files = unzipSync(await readFile(await download.path()));
  expect(Object.keys(files).sort()).toEqual(['a.srt', 'b.srt']);
  expect(strFromU8(files['a.srt'])).toContain('<font color="#ffff00">A</font>');
});
