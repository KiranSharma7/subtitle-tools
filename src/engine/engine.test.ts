import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, plainText, write } from './formats.ts';
import { shift } from './shift.ts';
import { convert } from './convert.ts';
import { parseTime } from './time.ts';
import { decode } from './decode.ts';
import { readFile } from 'node:fs/promises';

const SRT = '﻿1\r\n00:00:01,000 --> 00:00:02,500\r\n<i>Hello</i>\r\nthere\r\n\r\n2\r\n00:00:03,000 --> 00:00:04,000\r\nBye\r\n';

test('timestamps', () => {
  assert.equal(parseTime('01:02:03,456'), 3723456);
  assert.equal(parseTime('1:02:03.4'), 3723400);
  assert.equal(parseTime('02:03.456'), 123456);
  assert.equal(parseTime('nope'), null);
});

test('srt round trip', () => {
  const { file, problems } = parse(SRT);
  assert.deepEqual(problems, []);
  assert.equal(file.cues.length, 2);
  assert.equal(file.cues[0].text, '<i>Hello</i>\nthere');
  assert.equal(write(file), '1\n00:00:01,000 --> 00:00:02,500\n<i>Hello</i>\nthere\n\n2\n00:00:03,000 --> 00:00:04,000\nBye\n');
});

test('srt: bad timestamp is reported, blank line inside cue keeps text', () => {
  const { file, problems } = parse('1\n00:00:01,000 --> 00:00:02,000\nA\n\nB\n\n2\n00:00:0x --> 00:00:03,000\nC\n');
  assert.equal(file.cues[0].text, 'A\n\nB');
  assert.equal(file.cues.length, 1);
  assert.match(problems[0], /Line 8/);
});

test('vtt keeps header, ids and settings on round trip', () => {
  const vtt = 'WEBVTT - title\n\nSTYLE\n::cue { color: red }\n\nintro\n00:01.000 --> 00:02.000 align:start line:0\nHi\n\nNOTE later comment\n\n00:03.000 --> 00:04.000\nBye\n';
  const { file } = parse(vtt);
  assert.equal(file.cues.length, 2);
  assert.deepEqual(file.cues[0].extras, { id: 'intro', settings: 'align:start line:0' });
  assert.equal(
    write(file),
    'WEBVTT - title\n\nSTYLE\n::cue { color: red }\n\nintro\n00:00:01.000 --> 00:00:02.000 align:start line:0\nHi\n\n00:00:03.000 --> 00:00:04.000\nBye\n',
  );
});

test('unknown format throws', () => {
  assert.throws(() => parse('just some text'));
});

test('shift clamps and removes below zero', () => {
  const { file } = parse('1\n00:00:01,000 --> 00:00:03,000\nA\n\n2\n00:00:00,500 --> 00:00:01,000\nB\n\n3\n00:00:05,000 --> 00:00:06,000\nC\n');
  const r = shift(file, -1500);
  assert.deepEqual(r.clamped, [1]);
  assert.deepEqual(r.removed, [2]);
  assert.deepEqual(r.file.cues.map((c) => [c.start, c.end]), [[0, 1500], [3500, 4500]]);
  assert.equal(shift(file, 1000).file.cues[0].start, 2000);
});

test('decode falls back from UTF-8', async () => {
  assert.equal((await decode(new TextEncoder().encode('héllo'))).encoding, 'UTF-8');
  // "Привет, как дела? Это тест." in windows-1251
  const cp1251 = new Uint8Array([0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2, 0x2c, 0x20, 0xea, 0xe0, 0xea, 0x20, 0xe4, 0xe5, 0xeb, 0xe0, 0x3f, 0x20, 0xdd, 0xf2, 0xee, 0x20, 0xf2, 0xe5, 0xf1, 0xf2, 0x2e]);
  const r = await decode(cp1251);
  assert.match(r.text, /Привет/);
});

test('fixture: shift sample.srt 1.5s earlier matches expected bytes', async () => {
  const fixture = (f: string) => readFile(new URL(`../../tests/fixtures/${f}`, import.meta.url));
  const { text } = await decode(await fixture('sample.srt'));
  const { file, problems } = parse(text);
  assert.match(problems[0], /Line 19/);
  const r = shift(file, -1500);
  assert.deepEqual([r.clamped, r.removed], [[1], [2]]);
  assert.equal(write(r.file), (await fixture('sample-shifted-1.5s-earlier.srt')).toString());
});

test('convert srt to vtt: WEBVTT header, dot separators, nothing lost', () => {
  const r = convert(parse(SRT).file, 'vtt');
  assert.deepEqual(r.losses, []);
  assert.equal(write(r.file), 'WEBVTT\n\n00:00:01.000 --> 00:00:02.500\n<i>Hello</i>\nthere\n\n00:00:03.000 --> 00:00:04.000\nBye\n');
});

test('convert vtt to srt: numbered, comma separators, exact loss report', () => {
  const vtt = 'WEBVTT\n\nSTYLE\n::cue { color: red }\n\nintro\n00:01.000 --> 00:02.000 align:start\nHi\n\n00:03.000 --> 00:04.000 line:0\nMid\n\n00:05.000 --> 00:06.000\nBye\n';
  const r = convert(parse(vtt).file, 'srt');
  assert.equal(write(r.file), '1\n00:00:01,000 --> 00:00:02,000\nHi\n\n2\n00:00:03,000 --> 00:00:04,000\nMid\n\n3\n00:00:05,000 --> 00:00:06,000\nBye\n');
  assert.deepEqual(r.losses, [
    { kind: 'header', cues: [] },
    { kind: 'id', cues: [1] },
    { kind: 'settings', cues: [1, 2] },
  ]);
});

test('convert vtt with a plain WEBVTT line and numeric ids loses nothing', () => {
  assert.deepEqual(convert(parse('WEBVTT\n\n1\n00:01.000 --> 00:02.000\nHi\n\n2\n00:03.000 --> 00:04.000\nBye\n').file, 'srt').losses, []);
});

test('convert to the same format keeps everything', () => {
  const vtt = 'WEBVTT - title\n\nSTYLE\n::cue { color: red }\n\nintro\n00:01.000 --> 00:02.000 align:start\nHi\n';
  const { file } = parse(vtt);
  const r = convert(file, 'vtt');
  assert.deepEqual(r.losses, []);
  assert.equal(write(r.file), write(file));
  assert.equal(write(convert(parse(SRT).file, 'srt').file), write(parse(SRT).file));
});

test('plain text: no timing, numbers or tags; line breaks kept or joined', () => {
  const vtt = 'WEBVTT\n\nintro\n00:01.000 --> 00:02.000 align:start\n{\\an8}<i>Hello</i>\n<b>there</b> &amp; you\n\n00:03.000 --> 00:04.000\n<font color="red"></font>\n\n00:05.000 --> 00:06.000\n  Bye  \n';
  const { file } = parse(vtt);
  assert.equal(write(file, 'txt'), 'Hello\nthere & you\n\nBye\n');
  assert.equal(write(file, 'txt', { keepLineBreaks: false }), 'Hello there & you\nBye\n');
});

test('plain text keeps a literal < and > in dialogue, drops VTT timestamp tags', () => {
  assert.equal(plainText('if x < 5 and y > 3 ok'), 'if x < 5 and y > 3 ok');
  assert.equal(plainText('I <3 you'), 'I <3 you');
  assert.equal(plainText('<c.loud>Never</c> <00:00:01.500>drink &lrm;liquid'), 'Never drink ‎liquid');
});

test('plain text is not an input format', () => {
  assert.throws(() => parse('Shopping list\nmilk\n'), /Plain text/);
});

const fixture = (f: string) => readFile(new URL(`../../tests/fixtures/${f}`, import.meta.url), 'utf8');

test('ass: dialogue lines become cues, round trip keeps every byte', async () => {
  const ass = await fixture('sample.ass');
  const { file, problems } = parse(ass);
  assert.deepEqual(problems, []);
  assert.equal(file.format, 'ass');
  assert.deepEqual(file.cues.map((c) => [c.start, c.end]), [[1000, 3500], [5000, 6200], [7000, 9000]]);
  assert.equal(file.cues[0].text, '{\\i1}Hello{\\i0}, there\\Nsecond line');
  assert.deepEqual(file.cues[1].extras, { layer: '1', style: 'Sign', name: '', marginl: '0', marginr: '0', marginv: '20', effect: '' });
  assert.equal(write(file), ass);
});

test('ass: shift keeps header, styles, layer, margins and override tags', async () => {
  const ass = await fixture('sample.ass');
  const out = write(shift(parse(ass).file, 1555).file);
  assert.equal(out, ass
    .replace('0:00:01.00,0:00:03.50', '0:00:02.56,0:00:05.06')
    .replace('0:00:05.00,0:00:06.20', '0:00:06.56,0:00:07.76')
    .replace('0:00:07.00,0:00:09.00', '0:00:08.56,0:00:10.56'));
});

test('ass to srt: italic, bold, line breaks mapped; dropped styling reported by cue', async () => {
  const r = convert(parse(await fixture('sample.ass')).file, 'srt');
  assert.equal(write(r.file), '1\n00:00:01,000 --> 00:00:03,500\n<i>Hello</i>, there\nsecond line\n\n2\n00:00:05,000 --> 00:00:06,200\nEXIT\n\n3\n00:00:07,000 --> 00:00:09,000\nSinging <b>loud</b>\n');
  assert.deepEqual(r.losses, [
    { kind: 'header', cues: [] },
    { kind: 'karaoke', cues: [3] },
    { kind: 'layer', cues: [2] },
    { kind: 'margins', cues: [2] },
    { kind: 'name', cues: [1] },
    { kind: 'positioning', cues: [2] },
    { kind: 'style', cues: [2] },
  ]);
});

test('ass tags: unclosed tags are closed, \\r resets, colours and fades count as formatting', () => {
  const ass = '[Script Info]\nScriptType: v4.00+\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n' +
    'Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,{\\b700\\u1}A{\\r}B {\\i1\\c&H0000FF&}C\\nD{comment}\n' +
    'Dialogue: 0,0:00:03.00,0:00:04.00,Default,,0,0,0,,{\\fad(200,200)\\alpha&H80&\\be1}E\n';
  const r = convert(parse(ass).file, 'vtt');
  assert.deepEqual(r.file.cues.map((c) => c.text), ['<b><u>A</u></b>B <i>C\nD</i>', 'E']);
  assert.deepEqual(r.losses, [{ kind: 'header', cues: [] }, { kind: 'formatting', cues: [1, 2] }]);
});

test('ssa (V4 Styles) works the same as ass', async () => {
  const ssa = await fixture('sample.ssa');
  const { file } = parse(ssa);
  assert.equal(file.format, 'ssa');
  assert.equal(write(file), ssa);
  const r = convert(file, 'srt');
  assert.equal(write(r.file), '1\n00:00:01,000 --> 00:00:02,500\n<i>Hello</i>\nthere\n\n2\n00:00:03,000 --> 00:00:04,000\nBye, now\n');
  assert.deepEqual(r.losses, [{ kind: 'header', cues: [] }]);
});

test('ass: plain text export maps tags and line breaks', async () => {
  assert.equal(write(parse(await fixture('sample.ass')).file, 'txt'), 'Hello, there\nsecond line\n\nEXIT\n\nSinging loud\n');
});

test('ass: unreadable time is reported with its line number', () => {
  const { file, problems } = parse('[Script Info]\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:xx,0:00:02.00,Default,,0,0,0,,A\n');
  assert.equal(file.cues.length, 0);
  assert.match(problems[0], /Line 5/);
});

test('sami to srt: timing from SYNC, entities decoded, <br> is a line break, header reported', async () => {
  const { file, problems } = parse(await fixture('sample.smi'));
  assert.deepEqual(problems, []);
  assert.equal(file.format, 'sami');
  const r = convert(file, 'srt');
  assert.equal(write(r.file), await fixture('sample-sami-converted.srt'));
  assert.deepEqual(r.losses, [{ kind: 'header', cues: [] }]);
});

test('sami: shift and write back keeps the header and round-trips', async () => {
  const { file } = parse(await fixture('sample.smi'));
  const out = write(shift(file, 1000).file);
  assert.ok(out.startsWith((await fixture('sample.smi')).split('<SYNC')[0]));
  assert.match(out, /<SYNC Start=2000><P Class=ENCC>Hello &amp; welcome<br>to the <i>show<\/i>\n<SYNC Start=4500><P Class=ENCC>&nbsp;\n/);
  // 6000 -> 7000 follows straight on from the previous cue, so no blank SYNC between them.
  assert.match(out, /Second cue\n<SYNC Start=7000><P Class=ENCC>5 &lt; 6\n<SYNC Start=9000><P Class=ENCC>&nbsp;\n<\/BODY>\n<\/SAMI>\n$/);
  assert.deepEqual(parse(out).file.cues, shift(file, 1000).file.cues);
});

test('sami: only the first language is read, the others are reported', () => {
  const smi = '<SAMI><BODY>\n<SYNC Start=1000><P Class=ENCC>Hello<P Class=KRCC>안녕\n<SYNC Start=2000><P Class=ENCC>&nbsp;<P Class=KRCC>&nbsp;\n<SYNC Start=3000><P Class=KRCC>only korean\n<SYNC Start=4000><P Class=FRCC>bonjour\n</BODY></SAMI>';
  const { file, problems } = parse(smi);
  assert.deepEqual(file.cues.map((c) => [c.start, c.end, c.text]), [[1000, 2000, 'Hello']]);
  assert.deepEqual(problems, ['This file has more than one language. Only ENCC was read; skipped: KRCC, FRCC.']);
});

test('microdvd: frame rate from the file is used and written back', () => {
  const sub = '{1}{1}25\n{25}{50}Hello|world\n{75}{100}{y:i}Bye\n';
  const { file, problems } = parse(sub, { fps: 30 });
  assert.deepEqual(problems, []);
  assert.equal(file.format, 'microdvd');
  assert.equal(file.fps, 25);
  assert.equal(file.header, '{1}{1}25');
  assert.deepEqual(file.cues.map((c) => [c.start, c.end, c.text]), [[1000, 2000, 'Hello\nworld'], [3000, 4000, '{y:i}Bye']]);
  assert.equal(write(file), sub);
  assert.equal(write(shift(file, 1000).file), '{1}{1}25\n{50}{75}Hello|world\n{100}{125}{y:i}Bye\n');
});

test('microdvd: with no frame rate in the file, the picked one is used (default 23.976)', () => {
  const sub = '{24}{48}Hi\n{2400}{2448}Later\n';
  const a = parse(sub).file;
  assert.equal(a.fps, 23.976);
  assert.equal(a.header, undefined);
  assert.deepEqual([a.cues[0].start, a.cues[0].end], [1001, 2002]);
  assert.equal(write(a), sub);
  assert.deepEqual(parse(sub, { fps: 25 }).file.cues.map((c) => [c.start, c.end]), [[960, 1920], [96000, 97920]]);
});

test('microdvd to srt: y codes become tags, other codes are reported, the frame rate line is not a loss', () => {
  const r = convert(parse('{1}{1}25\n{25}{50}{Y:b}{c:$0000FF}A|{y:i}B\n{75}{100}{P:0,0}C\n').file, 'srt');
  assert.deepEqual(r.file.cues.map((c) => c.text), ['<b>A\n<i>B</i></b>', 'C']);
  assert.deepEqual(r.losses, [{ kind: 'formatting', cues: [1] }, { kind: 'positioning', cues: [2] }]);
});

test('mpl2: deciseconds to ms, / italics become <i> when converting', async () => {
  const mpl2 = await fixture('sample-mpl2.txt');
  const { file, problems } = parse(mpl2);
  assert.deepEqual(problems, []);
  assert.equal(file.format, 'mpl2');
  assert.deepEqual(file.cues.map((c) => [c.start, c.end, c.text]), [[1000, 2500, 'Hello\n/world'], [4000, 5200, '/Whole line italic'], [60000, 61500, 'Bye']]);
  const r = convert(file, 'srt');
  assert.equal(write(r.file), await fixture('sample-mpl2-converted.srt'));
  assert.deepEqual(r.losses, []);
});

test('mpl2: shift and write back round-trips', async () => {
  const mpl2 = await fixture('sample-mpl2.txt');
  assert.equal(write(parse(mpl2).file), mpl2);
  assert.equal(write(shift(parse(mpl2).file, 1000).file), '[20][35]Hello|/world\n[50][62]/Whole line italic\n[610][625]Bye\n');
});
