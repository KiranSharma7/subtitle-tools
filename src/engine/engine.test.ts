import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, write } from './formats.ts';
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
