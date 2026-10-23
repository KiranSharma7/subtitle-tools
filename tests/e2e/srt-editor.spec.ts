import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// A silent mono 8 kHz 8-bit WAV: the video element plays audio too, which is enough to time against.
function wav(seconds: number): Buffer {
  const n = 8000 * seconds;
  const b = Buffer.alloc(44 + n, 128);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24); b.writeUInt32LE(8000, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34);
  b.write('data', 36); b.writeUInt32LE(n, 40);
  return b;
}

const seekTo = (page: Page, s: number) =>
  page.evaluate((s) => new Promise((done) => {
    const v = document.getElementById('player') as HTMLVideoElement;
    v.addEventListener('seeked', done, { once: true });
    v.currentTime = s;
  }), s);

async function save(page: Page) {
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  return { name: d.suggestedFilename(), text: (await readFile(await d.path())).toString() };
}

test('text only: paste rows, time automatically, download an SRT', async ({ page }) => {
  await page.goto('/srt-editor');
  await page.getByLabel('Subtitles, one per row').fill('Hello there.\nThe train stopped twice | between stations.');
  await expect(page.getByText('0 of 2 subtitles timed.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download' })).toBeDisabled();

  await page.getByRole('button', { name: 'Time automatically' }).click();
  await expect(page.getByText('2 of 2 subtitles timed.')).toBeVisible();
  const d = await save(page);
  expect(d.name).toBe('subtitles.srt');
  expect(d.text).toBe('1\n00:00:00,000 --> 00:00:01,000\nHello there.\n\n2\n00:00:01,100 --> 00:00:03,767\nThe train stopped twice\nbetween stations.\n');
});

test('time to a video with R and E, see the caption, download', async ({ page }) => {
  await page.goto('/srt-editor');
  await page.getByLabel('Choose a video file').setInputFiles({ name: 'clip.wav', mimeType: 'audio/wav', buffer: wav(20) });
  await page.waitForFunction(() => (document.getElementById('player') as HTMLVideoElement).readyState >= 1);
  await page.getByLabel('Subtitles, one per row').fill('One\nTwo\nThree');

  await page.getByRole('tab', { name: '2. Timing' }).click();
  await seekTo(page, 1);
  await page.keyboard.press('r');
  await seekTo(page, 3);
  await page.keyboard.press('r');
  await seekTo(page, 4.5);
  await page.keyboard.press('e');
  await seekTo(page, 6);
  await page.keyboard.press('r');
  await expect(page.getByText('3 of 3 subtitles timed.')).toBeVisible();

  await seekTo(page, 3.5);
  await expect(page.locator('#caption')).toHaveText('Two');

  const d = await save(page);
  expect(d.name).toBe('clip.srt');
  expect(d.text).toBe('1\n00:00:01,000 --> 00:00:03,000\nOne\n\n2\n00:00:03,000 --> 00:00:04,500\nTwo\n\n3\n00:00:06,000 --> 00:00:07,000\nThree\n');
});

test('open an SRT, edit a time and text, delete a line, save as WebVTT', async ({ page }) => {
  await page.goto('/srt-editor');
  await page.getByLabel('Open a subtitle file').setInputFiles({
    name: 'film.srt',
    mimeType: 'text/plain',
    buffer: Buffer.from('1\n00:00:01,000 --> 00:00:02,000\nHi\n\n2\n00:00:03,000 --> 00:00:04,000\nTypo\n\n3\n00:00:05,000 --> 00:00:06,000\nBye\n'),
  });
  await page.getByRole('tab', { name: '3. Edit' }).click();
  await page.getByLabel('Text of subtitle 2').fill('Fixed');
  await page.getByLabel('Start of subtitle 2').fill('2.5');
  await page.getByLabel('Start of subtitle 2').press('Tab');
  await expect(page.getByLabel('Start of subtitle 2')).toHaveValue('00:00:02,500');
  await page.getByLabel('End of subtitle 3').fill('not a time');
  await page.getByLabel('End of subtitle 3').press('Tab');
  await expect(page.getByLabel('End of subtitle 3')).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'Delete subtitle 1' }).click();
  await expect(page.getByLabel('Subtitles, one per row')).toHaveValue('Fixed\nBye');

  await page.getByLabel('Save as').selectOption('vtt');
  const d = await save(page);
  expect(d.name).toBe('film.vtt');
  expect(d.text).toBe('WEBVTT\n\n00:00:02.500 --> 00:00:04.000\nFixed\n\n00:00:05.000 --> 00:00:06.000\nBye\n');
});

test('two lines that overlap are flagged', async ({ page }) => {
  await page.goto('/srt-editor');
  await page.getByLabel('Open a subtitle file').setInputFiles({
    name: 'o.srt',
    mimeType: 'text/plain',
    buffer: Buffer.from('1\n00:00:01,000 --> 00:00:03,000\nA\n\n2\n00:00:02,000 --> 00:00:04,000\nB\n'),
  });
  await expect(page.getByRole('status')).toContainText('Starts before the subtitle above it ends: subtitle 2.');
});
