import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// A silent mono 8 kHz 8-bit WAV, long enough to seek around in.
function wav(seconds: number): Buffer {
  const n = 8000 * seconds;
  const b = Buffer.alloc(44 + n, 128);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24); b.writeUInt32LE(8000, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34);
  b.write('data', 36); b.writeUInt32LE(n, 40);
  return b;
}

async function loadAudio(page: Page) {
  await page.getByLabel('Choose an audio file').setInputFiles({ name: 'The Band - A Song.wav', mimeType: 'audio/wav', buffer: wav(20) });
  await page.waitForFunction(() => (document.getElementById('player') as HTMLAudioElement).readyState >= 1);
}
const seekTo = (page: Page, s: number) =>
  page.evaluate((s) => new Promise((done) => {
    const a = document.getElementById('player') as HTMLAudioElement;
    a.addEventListener('seeked', done, { once: true });
    a.currentTime = s;
  }), s);

async function save(page: Page) {
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download .lrc' }).click()]);
  return { name: d.suggestedFilename(), text: (await readFile(await d.path())).toString() };
}

test('sync pasted lyrics to audio with R, nudge a line, download the LRC', async ({ page }) => {
  await page.goto('/timed-lyrics');
  await loadAudio(page);
  await expect(page.getByLabel('Artist')).toHaveValue('The Band');
  await expect(page.getByLabel('Song title')).toHaveValue('A Song');

  await page.getByLabel('Lyrics, one line per row').fill('First line\nSecond line\n\nThird line');
  await expect(page.getByText('0 of 3 lines timed.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download .lrc' })).toBeDisabled();

  await page.getByRole('tab', { name: '2. Sync' }).click();
  for (const s of [1.5, 4, 6.25, 8]) {
    await seekTo(page, s);
    await page.keyboard.press('r');
  }
  await expect(page.getByText('3 of 3 lines timed.')).toBeVisible();

  await page.getByRole('tab', { name: '3. Preview' }).click();
  await page.getByRole('button', { name: 'Later by 0.1 s: line 2' }).click();
  await seekTo(page, 4.5);
  await expect(page.locator('#preview-lines li.active')).toContainText('Second line');

  const d = await save(page);
  expect(d.name).toBe('The Band - A Song.lrc');
  expect(d.text).toBe('[ar:The Band]\n[ti:A Song]\n[00:01.50]First line\n[00:04.10]Second line\n[00:06.25]\n[00:08.00]Third line\n');
});

test('open an LRC, edit the text keeping times, shift all, download', async ({ page }) => {
  await page.goto('/timed-lyrics');
  await page.getByLabel('Open a lyrics file').setInputFiles({
    name: 'old.lrc',
    mimeType: 'text/plain',
    buffer: Buffer.from('[ar:Ana]\n[ti:Old]\n[al:Album]\n[00:02.00]One\n[00:04.00]Two\n'),
  });
  await expect(page.getByLabel('Artist')).toHaveValue('Ana');
  await expect(page.getByLabel('Lyrics, one line per row')).toHaveValue('One\nTwo');

  await page.getByLabel('Lyrics, one line per row').fill('One\nNew\nTwo');
  await expect(page.getByText('2 of 3 lines timed.')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Not timed yet' })).toContainText('line 2.');

  await page.getByRole('tab', { name: '3. Preview' }).click();
  await page.getByLabel('Shift all lines by').fill('-1');
  await page.getByRole('button', { name: 'Apply' }).click();
  const d = await save(page);
  expect(d.text).toBe('[ar:Ana]\n[ti:Old]\n[al:Album]\n[00:01.00]One\n[00:03.00]Two\n');
});

test('find lyrics online asks lrclib.net and uses the result only when asked', async ({ page }) => {
  let asked = '';
  await page.route('https://lrclib.net/api/search?*', (route) => {
    asked = route.request().url();
    return route.fulfill({ json: [{ trackName: 'A Song', artistName: 'The Band', instrumental: false, plainLyrics: 'x', syncedLyrics: '[00:01.00] Hello\n[00:02.00] World\n' }] });
  });
  await page.goto('/timed-lyrics');
  await page.getByLabel('Artist').fill('The Band');
  await page.getByLabel('Song title').fill('A Song');
  await page.getByLabel('Lyrics, one line per row').fill('mine');
  await page.getByRole('button', { name: 'Find lyrics online' }).click();
  await expect(page.getByText('Found synced lyrics for "A Song" by The Band, 2 lines.')).toBeVisible();
  expect(new URL(asked).searchParams.get('artist_name')).toBe('The Band');
  await expect(page.getByLabel('Lyrics, one line per row')).toHaveValue('mine');

  await page.getByRole('button', { name: 'Use these lyrics' }).click();
  await expect(page.getByLabel('Lyrics, one line per row')).toHaveValue('Hello\nWorld');
  await expect(page.getByText('2 of 2 lines timed.')).toBeVisible();
});

test('the content security policy lets the audio play and lrclib.net be asked', async ({ page }) => {
  const violations: string[] = [];
  await page.exposeFunction('cspViolation', (v: string) => violations.push(v));
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) =>
    (window as unknown as { cspViolation: (v: string) => void }).cspViolation(`${e.violatedDirective} ${e.blockedURI}`)));
  await page.route('https://lrclib.net/api/search?*', (route) => route.fulfill({ json: [] }));

  await page.goto('/timed-lyrics');
  await loadAudio(page);
  await page.getByRole('button', { name: 'Find lyrics online' }).click();
  await expect(page.getByText('No lyrics found.', { exact: false })).toBeVisible();
  expect(violations).toEqual([]);
});
