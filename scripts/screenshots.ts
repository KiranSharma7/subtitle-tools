// Screenshots of each tool with a demo file loaded, for the "what you get" image on its page.
// Run after `npm run build`: node scripts/screenshots.ts. Writes public/images/tools/*.jpg and src/screenshots.json.
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from '@playwright/test';
import { write } from '../src/engine/formats.ts';
import type { Cue, Format } from '../src/engine/types.ts';

const port = 4323;
const base = `http://localhost:${port}`;
const out = new URL('../public/images/tools/', import.meta.url);

// One short scene, original dialogue, with the things the tools act on: italics, a line break,
// an SDH note, a speaker label and a music line.
const t = (s: string) => Math.round(parseFloat(s) * 1000);
const cues = (rows: [string, string, string][]): Cue[] => rows.map(([s, e, text]) => ({ start: t(s), end: t(e), text }));
const scene = cues([
  ['1.2', '3.4', 'Is the coffee still warm?'],
  ['3.9', '6.1', '<i>Barely.</i> You took your time.'],
  ['6.8', '9.5', 'The train stopped twice\nbetween stations.'],
  ['10.2', '12.0', '[DOOR CLOSES]'],
  ['12.6', '15.3', 'SAM: Did anyone see you leave?'],
  ['16.0', '18.2', 'Only the man at the ticket desk.'],
  ['18.9', '21.4', 'Then we have until morning.'],
  ['22.0', '24.5', '♪ Rain on the window ♪'],
]);
const spanish = cues([
  ['1.3', '3.4', '¿Todavía está caliente el café?'],
  ['4.0', '6.1', 'Apenas. Te has tomado tu tiempo.'],
  ['6.9', '9.5', 'El tren paró dos veces\nentre estaciones.'],
  ['12.7', '15.3', '¿Alguien te vio salir?'],
  ['16.0', '18.2', 'Solo el hombre de la taquilla.'],
  ['19.0', '21.4', 'Entonces tenemos hasta la mañana.'],
]);

// SAMI and MicroDVD are read-only for convert(), so those are written directly; the rest go through SRT
// so ASS gets its default header.
// ASS input with a sign at the top and a fade, so ASS to SRT has something to report.
const styled = scene.map((c, i) => (i === 3 ? { ...c, text: '{\\an8}' + c.text } : i === 7 ? { ...c, text: '{\\fad(200,200)}' + c.text } : c));
// Song lines for the LRC maker, back to back like real lyrics.
const song = cues([
  ['12.4', '16.8', 'Rain on the window, light on the stairs'],
  ['16.8', '21.2', 'Nobody knows that we are still there'],
  ['21.2', '25.6', 'Hold the last train, hold it for me'],
  ['25.6', '30.0', 'Morning is far, and the city is free'],
  ['30.0', '34.4', 'Rain on the window'],
  ['34.4', '38.8', 'Rain on the window'],
]);

const file = (name: string, format: Format, c = scene) => ({
  name,
  mimeType: 'text/plain',
  buffer: Buffer.from(['sami', 'microdvd'].includes(format) ? write({ format, cues: c }) : write({ format: 'srt', cues: c }, format)),
});
const srt = file('scene.srt', 'srt');
// The validator needs something to find: two cues out of order, an overlap and an empty cue.
const broken = file('scene.srt', 'srt', [scene[0], scene[2], scene[1], { ...scene[3], text: '' }, { ...scene[4], end: t('16.5') }, ...scene.slice(5)]);
const fixture = async (f: string) => ({ name: f, mimeType: 'text/plain', buffer: await readFile(new URL(`../tests/fixtures/${f}`, import.meta.url)) });

type Shot = { path: string; files?: Parameters<Page['setInputFiles']>[1]; setup?: (page: Page) => Promise<void>; target?: string };
const shots: Record<string, Shot> = {
  'subtitle-shifter': { path: '/subtitle-shifter', files: srt },
  'partial-subtitle-shifter': {
    path: '/partial-subtitle-shifter',
    files: srt,
    setup: async (page) => {
      await page.getByLabel('From').fill('00:00:10,000');
      await page.getByLabel('Shift by').fill('-0.5');
    },
  },
  'srt-cleaner': {
    path: '/srt-cleaner',
    files: srt,
    setup: async (page) => {
      for (const option of ['Music cues', 'SDH notes', 'Speaker labels']) await page.getByLabel(option).check();
    },
  },
  'subtitle-validator': { path: '/subtitle-validator', files: broken },
  'convert-to-srt': { path: '/convert-to-srt', files: file('scene.ass', 'ass', styled) },
  'srt-to-vtt': { path: '/srt-to-vtt', files: srt },
  'srt-to-txt': { path: '/srt-to-txt', files: srt },
  // Noto Sans has no music note, so the PDF shot leaves out the music line rather than show that warning.
  'convert-subtitles-to-pdf': { path: '/convert-subtitles-to-pdf', files: file('scene.srt', 'srt', scene.slice(0, 7)) },
  'utf-8-converter': { path: '/utf-8-converter', setup: async (page) => page.getByLabel('Choose a file').setInputFiles(await fixture('cp1251.srt')) },
  'merge-subtitles': {
    path: '/merge-subtitles',
    setup: async (page) => {
      await page.getByLabel('Choose a subtitle file').setInputFiles({ ...srt, name: 'scene.en.srt' });
      await page.getByLabel('Choose a merge file').setInputFiles(file('scene.es.srt', 'srt', spanish));
    },
  },
  'change-subtitle-position': { path: '/change-subtitle-position', files: srt },
  'change-subtitle-color': { path: '/change-subtitle-color', files: srt },
  'lrc-maker': {
    path: '/lrc-maker',
    target: '#editor',
    setup: async (page) => {
      await page.getByLabel('Open a lyrics file').setInputFiles(file('rain.lrc', 'lrc', song));
      await page.getByLabel('Artist').fill('The Night Trains');
      await page.getByLabel('Song title').fill('Rain on the Window');
      await page.getByRole('tab', { name: '3. Preview' }).click();
    },
  },
  'srt-editor': {
    path: '/srt-editor',
    target: '#editor',
    setup: async (page) => {
      await page.getByLabel('Open a subtitle file').setInputFiles(srt);
      await page.getByRole('tab', { name: '3. Edit' }).click();
    },
  },
  'srt-to-word': { path: '/srt-to-word', files: srt },
  'vtt-to-srt': { path: '/vtt-to-srt', files: file('scene.vtt', 'vtt') },
  'ass-to-srt': { path: '/ass-to-srt', files: file('scene.ass', 'ass', styled) },
  'srt-to-ass': { path: '/srt-to-ass', files: srt },
  'smi-to-srt': { path: '/smi-to-srt', files: file('scene.smi', 'sami') },
  'sub-to-srt': { path: '/sub-to-srt', files: file('scene.sub', 'microdvd') },
};

// Node runs Astro directly (no shell), so kill() stops the server itself and not just a wrapper.
const server = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url)), 'preview', '--port', String(port)], { stdio: 'ignore' });
try {
  for (let i = 0; ; i++) {
    if (await fetch(base).then(() => true, () => false)) break;
    if (i > 60) throw new Error('Preview server did not start. Run npm run build first.');
    await new Promise((r) => setTimeout(r, 500));
  }
  await mkdir(out, { recursive: true });
  const browser = await chromium.launch();
  // Tall enough that every tool fits without scrolling, so element boxes are page coordinates.
  const page = await browser.newPage({ viewport: { width: 1200, height: 2400 } });
  const sizes: Record<string, { width: number; height: number }> = {};
  for (const [name, shot] of Object.entries(shots)) {
    await page.goto(base + shot.path);
    // The consent banner would sit on top of the tool.
    await page.getByRole('button', { name: 'Reject' }).click({ timeout: 2000 }).catch(() => {});
    if (shot.files) await page.getByLabel('Choose a subtitle file').setInputFiles(shot.files);
    await shot.setup?.(page);
    const target = page.locator(shot.target ?? '.tool');
    if (!shot.target) await page.locator('#rows tr').first().waitFor();
    await page.waitForTimeout(500);
    const box = (await target.boundingBox())!;
    const clip = { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 760) };
    await page.screenshot({ path: fileURLToPath(new URL(`${name}.jpg`, out)), clip, type: 'jpeg', quality: 80 });
    sizes[name] = { width: Math.round(clip.width), height: Math.round(clip.height) };
    console.log(name, sizes[name]);
  }
  await browser.close();
  await writeFile(new URL('../src/screenshots.json', import.meta.url), JSON.stringify(sizes, null, 2) + '\n');
} finally {
  server.kill();
}
