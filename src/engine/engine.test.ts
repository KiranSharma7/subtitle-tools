import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, plainText, write } from './formats.ts';
import { shift, shiftRanges, type RangeShiftResult } from './shift.ts';
import { convert } from './convert.ts';
import { parseTime } from './time.ts';
import { decode } from './decode.ts';
import { clean, defaultCleanOptions, type CleanOptions } from './clean.ts';
import { validate, fixSafe } from './validate.ts';
import { setColor, setPosition } from './style.ts';
import { episodeTag, merge, pairFiles } from './merge.ts';
import { fromStamps, toStamps } from './lrc.ts';
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

test('ass: Dialogue lines with no [Events] heading are still read', () => {
  assert.deepEqual(parse('Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,Hi\n').file.cues.map((c) => c.text), ['Hi']);
});

test('partial shift: boundaries, clamp and new overlaps', () => {
  const { file } = parse(
    '1\n00:00:01,000 --> 00:00:02,000\nA\n\n2\n00:00:05,000 --> 00:00:06,000\nB\n\n3\n00:00:10,000 --> 00:00:11,000\nC\n\n4\n00:00:12,000 --> 00:00:13,000\nD\n',
  );
  const r = shiftRanges(file, [
    { from: 0, to: 5000, offset: -1500 }, // cue 1 moves and clamps; cue 2 starts on To so stays
    { from: 10000, to: 12000, offset: 2500 }, // cue 3 starts on From so moves, onto cue 4
  ]);
  assert.ok(!('error' in r));
  assert.deepEqual(r.range, [0, null, 1, null]);
  assert.deepEqual(r.clamped, [1]);
  assert.deepEqual(r.removed, []);
  assert.deepEqual(r.overlaps, [3]);
  assert.deepEqual(r.file.cues.map((c) => [c.start, c.end]), [[0, 500], [5000, 6000], [12500, 13500], [12000, 13000]]);
  assert.deepEqual((shiftRanges(file, [{ from: 0, to: 2000, offset: -5000 }]) as RangeShiftResult).removed, [1]);
});

test('partial shift refuses overlapping ranges', () => {
  const { file } = parse('1\n00:00:01,000 --> 00:00:02,000\nA\n');
  const r = shiftRanges(file, [{ from: 0, to: 5000, offset: 1 }, { from: 4000, to: 6000, offset: 1 }]);
  assert.deepEqual(r, { error: 'Range 1 and range 2 overlap. Change one so they don\'t.' });
});

const cleaned = (text: string, opts: Partial<CleanOptions>) => {
  const r = clean({ format: 'srt', cues: [{ start: 0, end: 1000, text }] }, opts);
  return r.file.cues[0]?.text ?? null;
};

test('clean: each option on its own', () => {
  assert.equal(cleaned('<i>Hi</i> <font color="red">you</font>', { htmlTags: true }), 'Hi you');
  assert.equal(cleaned('{\\an8}Hi {\\i1}you', { assTags: true }), 'Hi you');
  assert.equal(cleaned('Hi (sighs) you', { parens: true }), 'Hi you');
  assert.equal(cleaned('[door] Hi', { brackets: true }), 'Hi');
  assert.equal(cleaned('Hi {note}', { braces: true }), 'Hi');
  assert.equal(cleaned('Hi *laughs* you', { asterisks: true }), 'Hi you');
  assert.equal(cleaned('#tag# Hi', { hashtags: true }), 'Hi');
  assert.equal(cleaned('♪ la la la ♪', { musicNotes: true }), null);
  assert.equal(cleaned('Hi', { musicNotes: true }), 'Hi');
  assert.equal(cleaned('Hi\nthere\n- Yes\n- No', { lineBreaks: true }), 'Hi there\n- Yes\n- No');
  assert.equal(cleaned('WHERE ARE YOU? I AM HERE.', { uppercase: true }), 'Where are you? I am here.');
  assert.equal(cleaned('I saw NASA', { uppercase: true }), 'I saw NASA');
  assert.equal(cleaned('<i></i>', { empty: true }), null);
  const dup = { format: 'srt' as const, cues: [{ start: 0, end: 1, text: 'A' }, { start: 0, end: 1, text: 'A' }, { start: 0, end: 2, text: 'A' }] };
  assert.deepEqual(clean(dup, { duplicates: true }).removed, [2]);
  assert.equal(cleaned('<i></i>', {}), '<i></i>');
});

test('clean: kept tags survive html removal', () => {
  assert.equal(cleaned('<i>Hi</i> <b>big</b> <u>you</u>', { htmlTags: true, keep: ['i', 'b'] }), '<i>Hi</i> <b>big</b> you');
});

test('clean: duplicates, cues emptied by other options, and the change report', () => {
  const { file } = parse('1\n00:00:01,000 --> 00:00:02,000\nA\n\n2\n00:00:01,000 --> 00:00:02,000\nA\n\n3\n00:00:03,000 --> 00:00:04,000\n[music]\n\n4\n00:00:05,000 --> 00:00:06,000\nB (off)\n\n5\n00:00:07,000 --> 00:00:08,000\nC\n');
  const r = clean(file, { duplicates: true, brackets: true, parens: true, empty: true });
  assert.deepEqual(r.file.cues.map((c) => c.text), ['A', 'B', 'C']);
  assert.deepEqual(r.removed, [2, 3]);
  assert.deepEqual(r.changed, [4]);
  assert.deepEqual(r.after, ['A', null, null, 'B', 'C']);
  assert.deepEqual(clean(file, { brackets: true }).after[2], '');
});

test('clean guesswork: SDH descriptions', () => {
  assert.equal(cleaned('[DOOR SLAMS]\nWho is it? (whispers)', { sdh: true }), 'Who is it?');
  assert.equal(cleaned('THUNDER RUMBLING\nRun!', { sdh: true }), 'Run!');
  assert.equal(cleaned('NO! STOP!\nI am OK', { sdh: true }), 'NO! STOP!\nI am OK');
});

test('clean guesswork: speaker labels', () => {
  assert.equal(cleaned('JOHN: Hi\n- MARY SMITH: Bye', { speakers: true }), 'Hi\n- Bye');
  assert.equal(cleaned('Note: this is real\nAt 10:30 we go', { speakers: true }), 'Note: this is real\nAt 10:30 we go');
});

test('clean guesswork: watermarks', () => {
  assert.equal(cleaned('Hi\nSubtitles by explosiveskull', { watermarks: true }), 'Hi');
  assert.equal(cleaned('www.opensubtitles.org', { watermarks: true, empty: true }), null);
  assert.equal(cleaned('I will sync it by tomorrow', { watermarks: true }), 'I will sync it by tomorrow');
});

test('clean guesswork: merge identical neighbours, and all four are off by default', () => {
  const { file } = parse('1\n00:00:01,000 --> 00:00:02,000\nA\n\n2\n00:00:02,000 --> 00:00:03,000\nA\n\n3\n00:00:04,000 --> 00:00:05,000\nB\n\n4\n00:00:06,000 --> 00:00:07,000\nA\n');
  const r = clean(file, { merge: true });
  assert.deepEqual(r.file.cues.map((c) => [c.start, c.end, c.text]), [[1000, 3000, 'A'], [4000, 5000, 'B'], [6000, 7000, 'A']]);
  assert.deepEqual(r.removed, [2]);
  assert.deepEqual(r.changed, [1]);
  assert.deepEqual(clean(file, defaultCleanOptions).file, file);
  for (const k of ['sdh', 'speakers', 'watermarks', 'merge'] as const) assert.equal(defaultCleanOptions[k], false);
});

const BROKEN =
  '1\n00:00:05,000 --> 00:00:06,000\nA\n\n3\n00:00:01,000 --> 00:00:02,000\nB\n\n00:00:03,000 --> 00:00:03,000\nC\n\n4\n00:00:04,000 --> 00:00:03,500\nD\n\n5\n00:00:0x --> 00:00:09,000\nE\n\n6\n00:00:10,000 --> 00:00:12,000\nF\n\n7\n00:00:11,000 --> 00:00:13,000\nG\n\n8\n00:00:14,000 --> 00:00:15,000\n<i></i>\n';

test('validate: each issue kind', () => {
  const issues = validate(parse(BROKEN));
  assert.deepEqual(issues.map((i) => [i.cue, i.kind]), [
    [2, 'numbering'],
    [2, 'order'],
    [3, 'numbering'],
    [3, 'zero-length'],
    [4, 'end-before-start'],
    [5, 'timestamp'],
    [7, 'overlap'],
    [8, 'empty'],
  ]);
  assert.equal(issues[0].message, 'Cue 2 is numbered 3.');
  assert.equal(issues[2].message, 'Cue 3 has no number.');
  assert.equal(issues[6].message, 'Cue 7 overlaps cue 6.');
});

test('validate: missing WEBVTT line, clean file, and safe fixes', () => {
  const noHeader = parse('00:01.000 --> 00:02.000\nHi\n');
  assert.deepEqual(validate(noHeader).map((i) => i.kind), ['header']);
  assert.equal(write(fixSafe(noHeader)), 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi\n');
  assert.deepEqual(validate(parse(write(fixSafe(noHeader)))), []);
  assert.deepEqual(validate(parse(SRT)), []);
  const dotSrt = parse('1\n00:00:01.000 --> 00:00:02.000\nHi\n');
  assert.deepEqual(validate(dotSrt), []);
  assert.equal(fixSafe(dotSrt).format, 'srt');

  const fixed = parse(write(fixSafe(parse(BROKEN))));
  assert.deepEqual(fixed.file.cues.map((c) => c.text), ['B', 'C', 'D', 'A', 'F', 'G']);
  assert.deepEqual(validate(fixed).map((i) => i.kind), ['zero-length', 'end-before-start', 'overlap']);
});

test('decode: legacy fixtures come out as the expected UTF-8, line endings kept', async () => {
  const fixture = (f: string) => readFile(new URL(`../../tests/fixtures/${f}`, import.meta.url));
  for (const name of ['cp1251', 'shift-jis', 'gbk']) {
    const { text } = await decode(await fixture(`${name}.srt`));
    assert.deepEqual(Buffer.from(text), await fixture(`${name}-utf8.srt`), name);
  }
  const names = await Promise.all(['cp1251', 'shift-jis', 'gbk'].map(async (n) => (await decode(await fixture(`${n}.srt`))).encoding));
  assert.deepEqual(names, ['windows-1251', 'shift_jis', 'gbk']);
});

test('position: srt gets {\\an#} in front, replacing any it had; remove strips them', () => {
  const { file } = parse('1\n00:00:01,000 --> 00:00:02,000\n{\\an8}Top\n\n2\n00:00:03,000 --> 00:00:04,000\n<i>Plain</i>\n');
  assert.deepEqual(setPosition(file, 7).file.cues.map((c) => c.text), ['{\\an7}Top', '{\\an7}<i>Plain</i>']);
  assert.deepEqual(setPosition(file, null).file.cues.map((c) => c.text), ['Top', '<i>Plain</i>']);
  assert.equal(file.cues[0].text, '{\\an8}Top', 'input is not changed');
  const mixed = parse('1\n00:00:01,000 --> 00:00:02,000\n{\\an8\\i1}A{\\a6}B\n').file;
  assert.equal(setPosition(mixed, 1).file.cues[0].text, '{\\an1}{\\i1}AB');
});

test('position: webvtt line, position and align settings replace the old ones, other settings stay', () => {
  const vtt = 'WEBVTT\n\nintro\n00:01.000 --> 00:02.000 align:start line:0 size:80%\nA\n\n00:03.000 --> 00:04.000\nB\n';
  const { file } = parse(vtt);
  const top = setPosition(file, 9).file;
  assert.deepEqual(top.cues.map((c) => c.extras), [
    { id: 'intro', settings: 'size:80% line:0% position:90%,line-right align:right' },
    { settings: 'line:0% position:90%,line-right align:right' },
  ]);
  assert.deepEqual(setPosition(file, 4).file.cues[1].extras, { settings: 'line:50%,center position:10%,line-left align:left' });
  assert.deepEqual(setPosition(file, 2).file.cues[1].extras, { settings: 'line:100%,end position:50%,center align:center' });
  const removed = setPosition(file, null).file;
  assert.deepEqual(removed.cues.map((c) => c.extras), [{ id: 'intro', settings: 'size:80%' }, undefined]);
});

test('position: ass changes Alignment in every style, inline \\an only where a cue has one; \\pos cues are pinned', async () => {
  const ass = await fixture('sample.ass');
  const r = setPosition(parse(ass).file, 9);
  assert.deepEqual(r.pinned, [2]);
  assert.equal(write(r.file), ass
    .replace(',1,2,2,2,10,10,10,1', ',1,2,2,9,10,10,10,1')
    .replace(',1,2,2,8,10,10,10,1', ',1,2,2,9,10,10,10,1'));
  const inline = setPosition(parse(ass.replace('{\\an8\\pos(960,50)}', '{\\an8}').replace('{\\i1}Hello', '{\\a6\\i1}Hello')).file, 7).file;
  assert.deepEqual(inline.cues.map((c) => c.text.slice(0, 10)), ['{\\a5\\i1}He', '{\\an7}EXIT', '{\\k20}Sing']);
});

test('position: remove strips ass \\an, \\a and \\pos overrides, keeps the styles', async () => {
  const ass = await fixture('sample.ass');
  const r = setPosition(parse(ass).file, null);
  assert.deepEqual(r.pinned, []);
  assert.equal(write(r.file), ass.replace('{\\an8\\pos(960,50)}', ''));
  const keepsOthers = setPosition(parse(ass.replace('{\\an8\\pos(960,50)}', '{\\a6\\b1}')).file, null);
  assert.equal(keepsOthers.file.cues[1].text, '{\\b1}EXIT');
});

test('position: ssa uses the legacy alignment numbers in V4 Styles and \\a tags', async () => {
  const ssa = await fixture('sample.ssa');
  const top = setPosition(parse(ssa).file, 8).file;
  assert.equal(write(top), ssa.replace(',1,2,2,2,10,10,10,0,0', ',1,2,2,6,10,10,10,0,0'));
  const middle = setPosition(parse(ssa.replace('Bye, now', '{\\a1}Bye, now')).file, 6).file;
  assert.match(write(middle), /,1,2,2,11,10,10,10,0,0/);
  assert.equal(middle.cues[1].text, '{\\a11}Bye, now');
});

test('position: formats with no position support throw', () => {
  assert.throws(() => setPosition(parse('[1][20]Hi\n').file, 8), /SRT, WebVTT, ASS and SSA/);
});

test('convert srt to ass: default header and style, tags mapped, unmapped formatting reported', () => {
  const r = convert(parse('1\n00:00:01,000 --> 00:00:02,500\n{\\an8}<i>Hello</i>\nthere\n\n2\n00:00:03,000 --> 00:00:04,000\n<font color="#ff0000">Red</font> &amp; <b>bold</b>\n').file, 'ass');
  assert.deepEqual(r.losses, [{ kind: 'formatting', cues: [2] }]);
  const out = write(r.file);
  assert.match(out, /^\[Script Info\]\nScriptType: v4\.00\+\n/);
  assert.match(out, /\nStyle: Default,Arial,20,&H00FFFFFF,[^\n]*,2,10,10,10,1\n/);
  assert.ok(out.endsWith(
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n' +
    'Dialogue: 0,0:00:01.00,0:00:02.50,Default,,0,0,0,,{\\an8}{\\i1}Hello{\\i0}\\Nthere\n' +
    'Dialogue: 0,0:00:03.00,0:00:04.00,Default,,0,0,0,,Red & {\\b1}bold{\\b0}\n'));
  assert.deepEqual(parse(out).file.cues.map((c) => [c.start, c.end]), [[1000, 2500], [3000, 4000]]);
});

test('convert vtt to ass: header and cue settings reported, then a position can be set', () => {
  const r = convert(parse('WEBVTT\n\nSTYLE\n::cue { color: red }\n\n00:01.000 --> 00:02.000 line:0\n<v Anna>Hi</v>\n').file, 'ass');
  assert.deepEqual(r.losses, [{ kind: 'header', cues: [] }, { kind: 'formatting', cues: [1] }, { kind: 'settings', cues: [1] }]);
  assert.equal(r.file.cues[0].text, 'Hi');
  assert.match(write(setPosition(r.file, 8).file), /\nStyle: Default,[^\n]*,8,10,10,10,1\n/);
});

test('color: srt wraps each cue in <font color>, replacing a color that covers the cue or a whole line', () => {
  const srt = (...texts: string[]) => parse(texts.map((t, i) => `${i + 1}\n00:00:0${i + 1},000 --> 00:00:0${i + 1},500\n${t}\n`).join('\n')).file;
  const file = srt('Plain', '{\\an8}<font color="red" face="Arial">Top</font>', '<font color=#00ff00>A</font>\n<font color="blue">B</font>', 'Say <font color="red">this</font>');
  const r = setColor(file, '#ffcc00');
  assert.deepEqual(r.file.cues.map((c) => c.text), [
    '<font color="#ffcc00">Plain</font>',
    '{\\an8}<font color="#ffcc00" face="Arial">Top</font>',
    '<font color="#ffcc00">A\nB</font>',
    '<font color="#ffcc00">Say <font color="red">this</font></font>',
  ]);
  assert.deepEqual(r.kept, [4]);
  assert.equal(file.cues[0].text, 'Plain', 'input is not changed');
  assert.equal(setColor(r.file, '#ffffff').file.cues[0].text, '<font color="#ffffff">Plain</font>', 'running twice does not nest');
});

test('color: webvtt gets a STYLE ::cue block, or the color in an existing ::cue rule is replaced', () => {
  const bare = setColor(parse('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nA\n').file, '#FFCC00').file;
  assert.equal(write(bare), 'WEBVTT\n\nSTYLE\n::cue { color: #ffcc00; }\n\n00:00:01.000 --> 00:00:02.000\nA\n');
  const styled = 'WEBVTT\n\nSTYLE\n::cue(.x) { color: red; }\n::cue { background-color: black; color: red; }\n\n00:00:01.000 --> 00:00:02.000\nA\n';
  assert.equal(write(setColor(parse(styled).file, '#00ff00').file), styled.replace('color: red; }\n\n', 'color: #00ff00; }\n\n'));
  const noColor = 'WEBVTT\n\nSTYLE\n::cue { font-size: 90%; }\n\n00:00:01.000 --> 00:00:02.000\nA\n';
  assert.match(write(setColor(parse(noColor).file, '#00ff00').file), /font-size: 90%; }\n\nSTYLE\n::cue \{ color: #00ff00; \}\n\n00:00:01/);
});

test('color: ass changes PrimaryColour in every style (alpha kept), inline \\c and \\1c only where a cue has one', async () => {
  const ass = (await fixture('sample.ass')).replace('&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0', '&H40FFFFFF,&H000000FF,&H00000000,&H00000000,0');
  const r = setColor(parse(ass).file, '#ffcc00');
  assert.deepEqual(r.kept, []);
  assert.equal(write(r.file), ass.replace('&H40FFFFFF,', '&H4000CCFF,').replace('&H0000FFFF,', '&H0000CCFF,'));
  const inline = setColor(parse(ass.replace('{\\i1}Hello', '{\\c&H0000FF&\\3c&HFF0000&\\i1}Hello').replace('{\\b1}', '{\\1c&HFF&\\b1}')).file, '#102030').file;
  assert.deepEqual(inline.cues.map((c) => c.text.split('}')[0]), ['{\\c&H302010&\\3c&HFF0000&\\i1', '{\\an8\\pos(960,50)', '{\\k20']);
  assert.match(inline.cues[2].text, /\{\\1c&H302010&\\b1\}loud/);
});

test('color: ssa writes PrimaryColour as a decimal BGR number', async () => {
  const ssa = await fixture('sample.ssa');
  assert.equal(write(setColor(parse(ssa).file, '#ffcc00').file), ssa.replace('Default,Arial,28,16777215,', `Default,Arial,28,${0x00ccff},`));
});

test('color: save as ass sets the Default style; other formats throw', () => {
  const r = convert(parse('1\n00:00:01,000 --> 00:00:02,000\nHi\n').file, 'ass');
  assert.match(write(setColor(r.file, '#ff0000').file), /\nStyle: Default,Arial,20,&H000000FF,/);
  assert.throws(() => setColor(parse('[1][20]Hi\n').file, '#ff0000'), /SRT, WebVTT, ASS and SSA/);
});

const srtOf = (...cues: [number, number, string][]) => parse(cues.map(([s, e, t], i) => `${i + 1}\n00:00:${String(s).padStart(2, '0')},000 --> 00:00:${String(e).padStart(2, '0')},000\n${t}\n`).join('\n')).file;

test('merge nearest: cues within the threshold join the base cue in time order, start snaps, end is the later', () => {
  const base = srtOf([1, 3, 'Hello'], [10, 12, 'Bye']);
  const extra = srtOf([1, 2, 'Hola'], [2, 4, 'amigo'], [5, 6, 'Alone'], [11, 13, 'Adiós']);
  const r = merge(base, extra, { mode: 'nearest', threshold: 1000 });
  assert.deepEqual(r.file.cues.map((c) => [c.start, c.end, c.text]), [
    [1000, 4000, 'Hello\nHola\namigo'],
    [5000, 6000, 'Alone'],
    [10000, 13000, 'Bye\nAdiós'],
  ]);
  assert.deepEqual(r.joined, [1, 3]);
  assert.deepEqual(r.losses, []);
  assert.equal(r.file.format, 'srt');
});

test('merge nearest: a merge cue joins the nearest base cue, and only within the threshold', () => {
  const base = srtOf([1, 2, 'A'], [3, 4, 'B']);
  const extra = srtOf([2, 3, 'near A'], [3, 5, 'on B']);
  // 2.4 s is 1.4 s from A and 0.6 s from B.
  extra.cues[0].start = 2400;
  const r = merge(base, extra, { mode: 'nearest', threshold: 500 });
  assert.deepEqual(r.file.cues.map((c) => c.text), ['A', 'near A', 'B\non B']);
  assert.deepEqual(merge(base, extra, { mode: 'nearest', threshold: 700 }).file.cues.map((c) => c.text), ['A', 'B\nnear A\non B']);
});

test('merge simple keeps all timings; glue shifts the merge file by the first video length and appends it', () => {
  const base = srtOf([1, 3, 'Hello'], [10, 12, 'Bye']);
  const extra = srtOf([1, 2, 'Hola']);
  assert.deepEqual(merge(base, extra, { mode: 'simple' }).file.cues.map((c) => [c.start, c.text]), [[1000, 'Hello'], [1000, 'Hola'], [10000, 'Bye']]);
  const glued = merge(base, extra, { mode: 'glue', offset: 3600000 });
  assert.deepEqual(glued.file.cues.map((c) => [c.start, c.end, c.text]), [[1000, 3000, 'Hello'], [10000, 12000, 'Bye'], [3601000, 3602000, 'Hola']]);
  assert.deepEqual(glued.joined, []);
});

test('merge on top: srt {\\an8}, webvtt line:0, ass a second Top style', async () => {
  const base = srtOf([1, 3, 'Hello']);
  const extra = srtOf([1, 2, 'Hola'], [5, 6, 'Alone']);
  const srt = merge(base, extra, { mode: 'nearest', threshold: 1000, top: true });
  assert.deepEqual(srt.file.cues.map((c) => [c.start, c.end, c.text]), [[1000, 3000, 'Hello'], [1000, 3000, '{\\an8}Hola'], [5000, 6000, '{\\an8}Alone']]);
  assert.deepEqual(srt.joined, [1, 2]);

  const vttBase = parse('WEBVTT\n\n00:01.000 --> 00:03.000 align:start\nHello\n').file;
  const vtt = merge(vttBase, extra, { mode: 'simple', top: true }).file;
  assert.equal(vtt.cues[0].extras?.settings, 'align:start');
  assert.match(vtt.cues[1].extras?.settings ?? '', /line:0%/);

  const ass = parse(await readFile(new URL('../../tests/fixtures/sample.ass', import.meta.url), 'utf8')).file;
  const r = merge(ass, extra, { mode: 'simple', top: true }).file;
  assert.match(r.header ?? '', /\nStyle: Top,Arial,48,[^\n]*,8,/);
  const added = r.cues.filter((c) => c.text === 'Hola' || c.text === 'Alone');
  assert.equal(added.length, 2);
  assert.ok(added.every((c) => c.extras?.style === 'Top'));
});

test('merge: other formats go through the common format and their losses are reported; base must be SRT, WebVTT, ASS or SSA', async () => {
  const base = srtOf([1, 3, 'Hello']);
  const ass = parse(await readFile(new URL('../../tests/fixtures/sample.ass', import.meta.url), 'utf8')).file;
  const r = merge(base, ass, { mode: 'simple' });
  assert.ok(r.losses.some((l) => l.kind === 'header'));
  assert.ok(r.file.cues.every((c) => !c.text.includes('\\N')));
  assert.throws(() => merge(parse('{1}{24}Hi\n').file, base, { mode: 'simple' }), /SRT, WebVTT, ASS or SSA/);

  // ASS into ASS keeps the inline tags; the merge file's styles are lost and reported.
  const assIn = merge(ass, ass, { mode: 'simple' });
  assert.ok(assIn.losses.some((l) => l.kind === 'header'));
  assert.equal(assIn.file.cues.length, ass.cues.length * 2);
});

test('merge options: remove line breaks and color each side', () => {
  const base = srtOf([1, 3, 'Hello\nthere']);
  const extra = srtOf([1, 2, 'Hola\namigo']);
  const r = merge(base, extra, { mode: 'nearest', threshold: 1000, unbreakBase: true, colorMerge: '#FFFF00' });
  assert.equal(r.file.cues[0].text, 'Hello there\n<font color="#ffff00">Hola\namigo</font>');

  const vtt = merge(parse('WEBVTT\n\n00:01.000 --> 00:03.000\nHello\n').file, extra, { mode: 'simple', colorBase: '#ff0000', unbreakMerge: true }).file;
  assert.deepEqual(vtt.cues.map((c) => c.text), ['<c.base>Hello</c>', 'Hola amigo']);
  assert.match(vtt.header ?? '', /STYLE\n::cue\(\.base\) \{ color: #ff0000; \}/);
});

test('merge into ass: joined text uses \\N, colors are inline', () => {
  const ass = parse('[Script Info]\nScriptType: v4.00+\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:01.00,0:00:03.00,Main,,0,0,0,,Hello\\Nthere\n').file;
  const r = merge(ass, srtOf([1, 2, '<i>Hola</i>']), { mode: 'nearest', threshold: 1000, colorBase: '#ff0000', unbreakBase: true }).file;
  assert.equal(r.cues[0].text, '{\\c&H0000FF&}Hello there\\N{\\r}{\\i1}Hola{\\i0}');
  assert.equal(r.cues[0].extras?.style, 'Main');
});

test('episode tags and pairing by tag, then by filename order', () => {
  assert.deepEqual(episodeTag('Show.S01E03.720p.srt'), { season: 1, episode: 3 });
  assert.deepEqual(episodeTag('show 1x03 en.srt'), { season: 1, episode: 3 });
  assert.deepEqual(episodeTag('Show_E03.srt'), { episode: 3 });
  assert.equal(episodeTag('movie.1920x1080.srt'), null);
  assert.equal(episodeTag('film.srt'), null);

  assert.deepEqual(pairFiles(['S01E02.en.srt', 'S01E01.en.srt'], ['1x01.es.srt', '1x02.es.srt']), [1, 0]);
  assert.deepEqual(pairFiles(['b.srt', 'a.srt', 'E05.srt'], ['y.srt', 'x.srt', 'Ep05.srt']), [0, 1, 2]);
  assert.deepEqual(pairFiles(['a.srt', 'b.srt', 'c.srt'], ['only.srt']), [0, 0, 0]);
  assert.deepEqual(pairFiles(['a.srt', 'b.srt', 'c.srt'], ['x.srt', 'y.srt']), [0, 1, null]);
  // Filename order never pairs two different episodes.
  assert.deepEqual(pairFiles(['E05.srt', 'film.srt'], ['E06.srt', 'other.srt']), [1, 0]);
  assert.deepEqual(pairFiles(['E05.srt', 'b.srt'], ['E06.srt', 'E07.srt']), [null, 0]);
  assert.equal(episodeTag('Show.DD5.1x264.srt'), null);
});

test('merge: webvtt cue settings lost when merge cues join a base cue are reported', () => {
  const base = parse('WEBVTT\n\n00:01.000 --> 00:03.000\nHello\n').file;
  const extra = parse('WEBVTT\n\nhi\n00:01.000 --> 00:02.000 align:start\nHola\n\n00:09.000 --> 00:10.000 align:start\nAlone\n').file;
  const r = merge(base, extra, { mode: 'nearest' });
  assert.deepEqual(r.losses, [{ kind: 'id', cues: [1] }, { kind: 'settings', cues: [1] }]);
  assert.equal(r.file.cues[1].extras?.settings, 'align:start');
});

const LRC = '[ar:Some Artist]\n[ti:Some Song]\n[00:01.00]First line\n[00:03.50]Second line\n[00:06.00]\n[00:08.25]Last line\n';

test('lrc: detected, tags kept as the header, lines end where the next one starts', () => {
  const { file, problems } = parse(LRC);
  assert.deepEqual(problems, []);
  assert.equal(file.format, 'lrc');
  assert.equal(file.header, '[ar:Some Artist]\n[ti:Some Song]');
  // The empty [00:06.00] line ends the line before it; the last line gets 5 s.
  assert.deepEqual(file.cues.map((c) => [c.start, c.end, c.text]), [[1000, 3500, 'First line'], [3500, 6000, 'Second line'], [8250, 13250, 'Last line']]);
  assert.equal(write(file), LRC);
});

test('lrc: several timestamps on one line, 3-digit and missing fractions, unreadable lines reported', () => {
  const { file, problems } = parse('[00:05.123][00:01]Chorus\n[01:02.3]Verse\nnot a lyric line\n');
  assert.deepEqual(file.cues.map((c) => [c.start, c.text]), [[1000, 'Chorus'], [5123, 'Chorus'], [62300, 'Verse']]);
  assert.match(problems[0], /Line 3/);
  assert.equal(write(file), '[00:01.00]Chorus\n[00:05.12]Chorus\n[01:02.30]Verse\n');
});

test('lrc: offset tag is applied when reading and put back when writing', () => {
  const lrc = '[offset:+500]\n[00:02.00]A\n[00:04.00]B\n';
  const { file } = parse(lrc);
  assert.deepEqual(file.cues.map((c) => c.start), [1500, 3500]);
  assert.equal(write(file), lrc);
  assert.equal(write(shift(file, 1000).file), '[offset:+500]\n[00:03.00]A\n[00:05.00]B\n');
});

test('lrc: word timings are kept relative to the line, so a shift moves them too', () => {
  const lrc = '[00:10.00]<00:10.00>Hello <00:10.50>big <00:11.20>world\n';
  const { file } = parse(lrc);
  assert.equal(file.cues[0].text, '<00:00.00>Hello <00:00.50>big <00:01.20>world');
  assert.equal(write(file), lrc);
  assert.equal(write(shift(file, -2000).file), '[00:08.00]<00:08.00>Hello <00:08.50>big <00:09.20>world\n');
});

test('lrc to srt: word timings and tags reported; srt to lrc: tags, line breaks and overlaps reported', () => {
  const r = convert(parse('[ti:Song]\n[00:10.00]<00:10.00>Hello <00:10.50>world\n[00:12.00]Plain\n').file, 'srt');
  assert.equal(write(r.file), '1\n00:00:10,000 --> 00:00:12,000\nHello world\n\n2\n00:00:12,000 --> 00:00:17,000\nPlain\n');
  assert.deepEqual(r.losses, [{ kind: 'header', cues: [] }, { kind: 'wordTimings', cues: [1] }]);

  const srt = parse('1\n00:00:01,000 --> 00:00:04,000\n<i>One</i>\ntwo\n\n2\n00:00:03,000 --> 00:00:05,000\nThree\n\n3\n00:00:07,000 --> 00:00:08,000\nFour\n').file;
  const l = convert(srt, 'lrc');
  assert.deepEqual(l.losses, [{ kind: 'formatting', cues: [1] }, { kind: 'lineBreaks', cues: [1] }, { kind: 'overlap', cues: [1] }]);
  assert.equal(write(l.file), '[00:01.00]One two\n[00:03.00]Three\n[00:05.00]\n[00:07.00]Four\n[00:08.00]\n');
  assert.equal(write(srt, 'lrc'), write(l.file));
});

test('lrc stamps: the editor model round-trips through a file', () => {
  const file = fromStamps([{ time: 3000, text: 'B' }, { time: 1000, text: 'A' }, { time: 4000, text: '' }, { time: null, text: 'untimed' }], '[ti:T]');
  assert.deepEqual(file.cues.map((c) => [c.start, c.end, c.text]), [[1000, 3000, 'A'], [3000, 4000, 'B']]);
  assert.deepEqual(toStamps(file), [{ time: 1000, text: 'A' }, { time: 3000, text: 'B' }, { time: 4000, text: '' }]);
  assert.equal(write(file), '[ti:T]\n[00:01.00]A\n[00:03.00]B\n[00:04.00]\n');
});

test('lrc: a cue with no text left is reported when converting; multi-line text is written on one line', () => {
  const srt = parse('1\n00:00:01,000 --> 00:00:02,000\n<i></i>\n\n2\n00:00:03,000 --> 00:00:04,000\nB\n').file;
  assert.deepEqual(convert(srt, 'lrc').losses, [{ kind: 'emptyCue', cues: [1] }, { kind: 'formatting', cues: [1] }]);
  assert.equal(write({ format: 'lrc', cues: [{ start: 1000, end: 6000, text: 'A\nsecond' }] }), '[00:01.00]A second\n');
});
