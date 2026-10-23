import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeCue, autoTime, fromRow, parseClock, readingTime, retextLines, stampEnd, stampStart, toFile, toRow, type Line } from './srt-editor.ts';
import { write } from '../engine/formats.ts';

const line = (start: number | null, end: number | null, text: string): Line => ({ start, end, text });

test('a row is one subtitle; | is a line break inside it', () => {
  assert.equal(fromRow('  Wait. | Over here!  '), 'Wait.\nOver here!');
  assert.equal(fromRow('Plain'), 'Plain');
  assert.equal(toRow('Wait.\nOver here!'), 'Wait. | Over here!');
});

test('retextLines keeps the times of subtitles that are still there and skips blank rows', () => {
  const lines = [line(1000, 2000, 'A'), line(3000, 4000, 'B\nb'), line(5000, 6000, 'C')];
  assert.deepEqual(retextLines(lines, 'A\nnew\n\nB | b\nC'), [line(1000, 2000, 'A'), line(null, null, 'new'), line(3000, 4000, 'B\nb'), line(5000, 6000, 'C')]);
  // Same number of rows: an edited row keeps the times at its position.
  assert.deepEqual(retextLines(lines, 'A\nBee\nC'), [line(1000, 2000, 'A'), line(3000, 4000, 'Bee'), line(5000, 6000, 'C')]);
  assert.deepEqual(retextLines(lines, '\n\n'), []);
});

test('stampStart starts a line and ends the one before it, unless that one already ended', () => {
  let lines = [line(null, null, 'A'), line(null, null, 'B'), line(null, null, 'C')];
  lines = stampStart(lines, 0, 1000);
  lines = stampStart(lines, 1, 2500);
  assert.deepEqual(lines.slice(0, 2), [line(1000, 2500, 'A'), line(2500, null, 'B')]);
  lines = stampEnd(lines, 1, 3000);
  lines = stampStart(lines, 2, 4000);
  assert.deepEqual(lines, [line(1000, 2500, 'A'), line(2500, 3000, 'B'), line(4000, null, 'C')]);
  // Stamping a line again earlier pulls the line before it back so they don't overlap.
  lines = stampStart(lines, 1, 2000);
  assert.deepEqual(lines.slice(0, 2), [line(1000, 2000, 'A'), line(2000, 3000, 'B')]);
  // An end before the line's start is ignored.
  assert.deepEqual(stampEnd(lines, 2, 3500)[2], line(4000, null, 'C'));
});

test('readingTime gives about 15 characters a second, between 1 and 7 seconds', () => {
  assert.equal(readingTime('Hi'), 1000);
  assert.equal(readingTime('x'.repeat(30)), 2000);
  assert.equal(readingTime('x'.repeat(500)), 7000);
  // Tags and line breaks aren't read.
  assert.equal(readingTime('<i>' + 'x'.repeat(15) + '</i>\n' + 'x'.repeat(15)), 2000);
});

test('autoTime fills untimed lines after the last timed one and leaves timed lines alone', () => {
  const lines = autoTime([line(null, null, 'Hi'), line(5000, 6000, 'Timed'), line(null, null, 'x'.repeat(30))]);
  assert.deepEqual(lines, [line(0, 1000, 'Hi'), line(5000, 6000, 'Timed'), line(6100, 8100, 'x'.repeat(30))]);
});

test('toFile writes timed lines in time order, ends open lines, and reports what is left out', () => {
  const r = toFile([line(4000, null, 'C'), line(1000, 2000, 'A'), line(null, null, 'untimed'), line(1500, 3000, 'B'), line(9000, null, 'last')]);
  assert.equal(write(r.file), '1\n00:00:01,000 --> 00:00:02,000\nA\n\n2\n00:00:01,500 --> 00:00:03,000\nB\n\n3\n00:00:04,000 --> 00:00:05,000\nC\n\n4\n00:00:09,000 --> 00:00:10,000\nlast\n');
  assert.deepEqual(r.untimed, [3]);
  // B (line 4) starts before A (line 2) ends.
  assert.deepEqual(r.overlaps, [4]);
});

test('toFile ends an open line at the next start when that comes sooner', () => {
  const r = toFile([line(1000, null, 'x'.repeat(100)), line(2000, 2500, 'B')]);
  assert.deepEqual(r.file.cues.map((c) => [c.start, c.end]), [[1000, 2000], [2000, 2500]]);
});

test('activeCue is the line on screen at a time', () => {
  const lines = [line(1000, 2000, 'A'), line(null, null, 'x'), line(3000, null, 'B')];
  assert.equal(activeCue(lines, 500), -1);
  assert.equal(activeCue(lines, 1500), 0);
  assert.equal(activeCue(lines, 2500), -1);
  assert.equal(activeCue(lines, 3200), 2);
});

test('parseClock reads SRT and VTT times, m:ss and plain seconds', () => {
  assert.equal(parseClock('00:01:02,500'), 62500);
  assert.equal(parseClock('01:02.5'), 62500);
  assert.equal(parseClock('1:02'), 62000);
  assert.equal(parseClock('1:02:03'), 3723000);
  assert.equal(parseClock('12.25'), 12250);
  assert.equal(parseClock('soon'), null);
  assert.equal(parseClock(''), null);
});
