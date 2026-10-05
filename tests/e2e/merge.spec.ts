import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { strFromU8, unzipSync } from 'fflate';

const srt = (name: string, ...cues: [string, string, string][]) => ({
  name,
  mimeType: 'text/plain',
  buffer: Buffer.from(cues.map(([s, e, t], i) => `${i + 1}\n${s} --> ${e}\n${t}\n`).join('\n')),
});

test('nearest cue joins two languages and lists joined cues', async ({ page }) => {
  await page.goto('/merge-subtitles');
  await page.getByLabel('Choose a subtitle file').setInputFiles(srt('film.en.srt', ['00:00:01,000', '00:00:03,000', 'Hello'], ['00:00:10,000', '00:00:12,000', 'Bye']));
  await expect(page.getByText('Choose a merge file.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download' })).toBeDisabled();

  await page.getByLabel('Choose a merge file').setInputFiles(srt('film.es.srt', ['00:00:01,500', '00:00:04,000', 'Hola'], ['00:00:20,000', '00:00:21,000', 'Solo']));
  await expect(page.getByText('3 cues, merged with film.es.srt.')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Joined by nearest cue: cue 1.');
  await expect(page.locator('#rows tr').first()).toContainText('Hello\nHola');

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(download.suggestedFilename()).toBe('film.en.srt');
  expect(await readFile(await download.path(), 'utf8')).toBe(
    '1\n00:00:01,000 --> 00:00:04,000\nHello\nHola\n\n2\n00:00:10,000 --> 00:00:12,000\nBye\n\n3\n00:00:20,000 --> 00:00:21,000\nSolo\n',
  );
});

test('glue appends the merge file after the first video length', async ({ page }) => {
  await page.goto('/merge-subtitles');
  await page.getByLabel('Choose a subtitle file').setInputFiles(srt('cd1.srt', ['00:00:01,000', '00:00:02,000', 'One']));
  await page.getByLabel('Choose a merge file').setInputFiles(srt('cd2.srt', ['00:00:01,000', '00:00:02,000', 'Two']));
  await page.getByLabel('Glue end-to-end').check();
  await expect(page.getByRole('button', { name: 'Download' })).toBeDisabled();
  await page.getByLabel('Length of the first video').fill('01:00:00');
  await expect(page.locator('#rows tr').nth(1)).toContainText('01:00:01,000');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(await readFile(await download.path(), 'utf8')).toContain('2\n01:00:01,000 --> 01:00:02,000\nTwo\n');
});

test('a season is paired by episode tag, editable, and downloads as a zip', async ({ page }) => {
  await page.goto('/merge-subtitles');
  const cue = (t: string): [string, string, string] => ['00:00:01,000', '00:00:02,000', t];
  await page.getByLabel('Choose a subtitle file').setInputFiles([srt('Show.S01E02.en.srt', cue('en 2')), srt('Show.S01E01.en.srt', cue('en 1'))]);
  await page.getByLabel('Choose a merge file').setInputFiles([srt('show 1x01 es.srt', cue('es 1')), srt('show 1x02 es.srt', cue('es 2'))]);
  await expect(page.getByLabel('Merge file for Show.S01E01.en.srt')).toHaveValue('0');
  await expect(page.getByLabel('Merge file for Show.S01E02.en.srt')).toHaveValue('1');
  await page.getByLabel('Merge file for Show.S01E02.en.srt').selectOption({ label: 'No merge file' });
  await expect(page.getByText('1 file ready to download.')).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download all (.zip)' }).click()]);
  const files = unzipSync(new Uint8Array(await readFile(await download.path())));
  expect(Object.keys(files)).toEqual(['Show.S01E01.en.srt']);
  expect(strFromU8(files['Show.S01E01.en.srt'])).toContain('en 1\nes 1');
});

test('merge on top with a color, from a different format', async ({ page }) => {
  await page.goto('/merge-subtitles');
  await page.getByLabel('Choose a subtitle file').setInputFiles(srt('film.srt', ['00:00:01,000', '00:00:03,000', 'Hello']));
  await page.getByLabel('Choose a merge file').setInputFiles({ name: 'film.vtt', mimeType: 'text/vtt', buffer: Buffer.from('WEBVTT\n\n00:01.000 --> 00:02.000 align:start\nHola\n') });
  await page.getByLabel('Merge file on top').check();
  await page.getByRole('checkbox', { name: 'Color merge' }).check();
  await expect(page.getByRole('status')).toContainText('film.vtt: Cue settings (position and alignment) dropped: cue 1.');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(await readFile(await download.path(), 'utf8')).toContain('{\\an8}<font color="#ffff00">Hola</font>');
});
