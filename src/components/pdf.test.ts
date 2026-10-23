import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { parse } from '../engine/formats.ts';
import { bidi, buildPdf, cueRows, fontFiles, scriptsIn, type PdfDoc, type PdfOptions } from './pdf.ts';

const options: PdfOptions = { size: 'default', page: 'a4', heading: true, pageNumbers: true, gap: true };

// Reads fonts from public/, and remembers which ones were asked for.
function fontLoader() {
  const urls: string[] = [];
  const load = async (url: string) => (urls.push(url), new Uint8Array(await readFile(new URL(`../../public${url}`, import.meta.url))));
  return { urls, load };
}

const pageCount = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPageCount();

test('scriptsIn picks a font per script', () => {
  const s = (text: string) => [...scriptsIn(text).scripts].sort();
  assert.deepEqual(s('Hello, мир, καλημέρα'), ['latin']);
  assert.deepEqual(s('مرحبا'), ['arabic', 'latin']);
  assert.deepEqual(s('שלום'), ['hebrew', 'latin']);
  assert.deepEqual(s('नमस्ते'), ['devanagari', 'latin']);
  assert.deepEqual(s('สวัสดี'), ['latin', 'thai']);
  assert.deepEqual(s('你好'), ['latin', 'sc']);
  assert.deepEqual(s('今日はいい天気'), ['jp', 'latin']);
  assert.deepEqual(s('한국어 漢字'), ['kr', 'latin']);
});

test('scriptsIn lists characters no font can draw', () => {
  assert.deepEqual(scriptsIn('Nice 🎉 work 🎉').missing, ['🎉']);
  assert.deepEqual(scriptsIn('Plain‏ text').missing, []);
});

test('bidi keeps punctuation with the right-to-left words around it', () => {
  assert.deepEqual(bidi('Hello, world'), { rtl: false, parts: [{ text: 'Hello, world', rtl: false }] });
  // The comma sits between two Hebrew words, so it is right to left too: one part.
  assert.deepEqual(bidi('שלום עולם, זה מבחן'), { rtl: true, parts: [{ text: 'שלום עולם, זה מבחן', rtl: true }] });
  // Numbers stay left to right, and in a right-to-left line they're drawn to the left of the words before them.
  assert.deepEqual(bidi('مرحبا 123'), { rtl: true, parts: [{ text: '123', rtl: false }, { text: 'مرحبا ', rtl: true }] });
  assert.deepEqual(bidi('Call שלום now.'), { rtl: false, parts: [{ text: 'Call ', rtl: false }, { text: 'שלום', rtl: true }, { text: ' now.', rtl: false }] });
});

// fontkit's subsetter writes a short loca, which can only point at even offsets. A font whose glyphs
// aren't padded (fontTools' instancer writes them that way) comes out with broken outlines.
test('every font in public/fonts has even-length glyphs', async () => {
  const dir = new URL('../../public/fonts/', import.meta.url);
  for (const file of Object.values(fontFiles)) {
    const bytes = await readFile(new URL(file.replace('/fonts/', ''), dir));
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const tables = new Map<string, { offset: number; length: number }>();
    for (let i = 0; i < view.getUint16(4); i++) {
      const at = 12 + i * 16;
      tables.set(bytes.toString('latin1', at, at + 4), { offset: view.getUint32(at + 8), length: view.getUint32(at + 12) });
    }
    const long = view.getInt16(tables.get('head')!.offset + 50) === 1;
    const loca = tables.get('loca')!;
    const offsets = Array.from({ length: loca.length / (long ? 4 : 2) }, (_, i) => (long ? view.getUint32(loca.offset + i * 4) : view.getUint16(loca.offset + i * 2) * 2));
    assert.ok(offsets.every((o) => o % 2 === 0), `${file} has odd glyph offsets`);
  }
});

test('cueRows strips tags, drops empty cues, and has no time for plain text', () => {
  const srt = parse('1\n00:00:01,000 --> 00:00:04,500\n<i>Hello</i>\n\n2\n00:00:05,000 --> 00:00:06,000\n<b></b>\n');
  assert.deepEqual(cueRows(srt, true), [{ time: '00:00:01 – 00:00:04', text: 'Hello' }]);
  assert.deepEqual(cueRows(srt, false), [{ text: 'Hello' }]);
  const txt = { file: { format: 'txt' as const, cues: [{ start: 0, end: 0, text: 'A paragraph.' }] }, problems: [] };
  assert.deepEqual(cueRows(txt, true), [{ text: 'A paragraph.' }]);
});

test('buildPdf makes a PDF and loads only the fonts it needs', async () => {
  const fonts = fontLoader();
  const bytes = await buildPdf([{ title: 'short.srt', cues: [{ time: '00:00:01 – 00:00:02', text: 'Hello\nthere' }] }], options, fonts.load);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), '%PDF-');
  assert.equal(await pageCount(bytes), 1);
  assert.deepEqual(fonts.urls, ['/fonts/NotoSans-Regular.ttf']);
});

test('buildPdf wraps long text onto more pages', async () => {
  const long = 'A rather long subtitle line that will need wrapping across the page width. '.repeat(4);
  const doc: PdfDoc = { title: 'long.srt', cues: Array.from({ length: 120 }, (_, i) => ({ time: `cue ${i}`, text: long })) };
  const bytes = await buildPdf([doc], { ...options, pageNumbers: false }, fontLoader().load);
  assert.ok((await pageCount(bytes)) > 5);
  const tiny = await buildPdf([doc], { ...options, size: 'tiny' }, fontLoader().load);
  assert.ok((await pageCount(tiny)) < (await pageCount(bytes)));
});

test('buildPdf starts each combined document on a new page', async () => {
  const docs = [{ title: 'one.srt', cues: [{ text: 'One' }] }, { title: 'two.srt', cues: [{ text: 'Two' }] }];
  assert.equal(await pageCount(await buildPdf(docs, { ...options, page: 'letter' }, fontLoader().load)), 2);
});

test('buildPdf shapes Devanagari', async () => {
  const bytes = await buildPdf([{ title: 'hi.srt', cues: [{ text: 'नमस्ते दुनिया, यह एक परीक्षण है' }] }], options, fontLoader().load);
  assert.equal(await pageCount(bytes), 1);
});

test('buildPdf embeds Arabic, Thai and Japanese fonts subset', async () => {
  const fonts = fontLoader();
  const bytes = await buildPdf([{ title: 'mixed.txt', cues: [{ text: 'مرحبا بالعالم 123' }, { text: 'สวัสดีครับ ยินดีต้อนรับ' }, { text: '今日はいい天気ですね 🎉' }] }], options, fonts.load);
  assert.deepEqual(fonts.urls.sort(), ['/fonts/NotoSans-Regular.ttf', '/fonts/NotoSansArabic-Regular.ttf', '/fonts/NotoSansJP-Regular.ttf', '/fonts/NotoSansThai-Regular.ttf']);
  // The JP font file is about 6 MB; a subset of a few glyphs is tiny.
  assert.ok(bytes.length < 200_000, `PDF is ${bytes.length} bytes`);
});
