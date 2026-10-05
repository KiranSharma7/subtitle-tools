import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeLine, lrcHeader, lrcName, pickLyrics, retext, splitTags } from './lyrics.ts';

test('retext keeps the times of lines that are still there', () => {
  const lines = [{ time: 1000, text: 'A' }, { time: 2000, text: 'B' }, { time: 3000, text: 'C' }];
  assert.deepEqual(retext(lines, 'A\nnew\nB\nC'), [{ time: 1000, text: 'A' }, { time: null, text: 'new' }, { time: 2000, text: 'B' }, { time: 3000, text: 'C' }]);
  assert.deepEqual(retext(lines, 'A\nC'), [{ time: 1000, text: 'A' }, { time: 3000, text: 'C' }]);
  // Same number of lines: an edited line keeps the time at its position.
  assert.deepEqual(retext(lines, 'A\nBee\nC'), [{ time: 1000, text: 'A' }, { time: 2000, text: 'Bee' }, { time: 3000, text: 'C' }]);
  assert.deepEqual(retext(lines, ''), []);
});

test('activeLine is the latest line that has started, in time order', () => {
  const lines = [{ time: 1000, text: 'A' }, { time: null, text: 'x' }, { time: 500, text: 'B' }, { time: 3000, text: 'C' }];
  assert.equal(activeLine(lines, 200), -1);
  assert.equal(activeLine(lines, 700), 2);
  assert.equal(activeLine(lines, 1500), 0);
  assert.equal(activeLine(lines, 9000), 3);
});

test('pickLyrics prefers synced lyrics, then plain, and skips instrumentals', () => {
  const synced = { trackName: 'T', artistName: 'A', instrumental: false, plainLyrics: 'one\ntwo', syncedLyrics: '[00:01.00] one\n[00:02.50] two\n' };
  const plain = { trackName: 'P', artistName: 'Q', instrumental: false, plainLyrics: 'x\n\ny', syncedLyrics: null };
  const none = { trackName: 'I', artistName: 'A', instrumental: true, plainLyrics: null, syncedLyrics: null };
  assert.deepEqual(pickLyrics([none, plain, synced]), { title: 'T', artist: 'A', synced: true, lines: [{ time: 1000, text: 'one' }, { time: 2500, text: 'two' }] });
  assert.deepEqual(pickLyrics([none, plain]), { title: 'P', artist: 'Q', synced: false, lines: [{ time: null, text: 'x' }, { time: null, text: '' }, { time: null, text: 'y' }] });
  assert.equal(pickLyrics([none]), null);
});

test('tags: artist and title split out of the header and put back with the other tags', () => {
  const tags = splitTags('[ar:Ana]\n[al:Album]\n[ti: Song ]\n[offset:+100]');
  assert.deepEqual(tags, { artist: 'Ana', title: 'Song', others: ['[al:Album]', '[offset:+100]'] });
  assert.equal(lrcHeader(' Ana ', 'Song', tags.others), '[ar:Ana]\n[ti:Song]\n[al:Album]\n[offset:+100]');
  assert.equal(lrcHeader('', '', []), undefined);
  assert.deepEqual(splitTags(undefined), { artist: '', title: '', others: [] });
});

test('download name: artist - title, else title, else the audio name, without characters files cannot hold', () => {
  assert.equal(lrcName('AC/DC', 'Song?', 'x.mp3'), 'ACDC - Song.lrc');
  assert.equal(lrcName('', 'Song', 'x.mp3'), 'Song.lrc');
  assert.equal(lrcName('', '', 'track 1.mp3'), 'track 1.lrc');
  assert.equal(lrcName('', '', ''), 'lyrics.lrc');
});

test('retext with the same number of lines matches by text first, so swapped lines keep their times', () => {
  const lines = [{ time: 1000, text: 'A' }, { time: 2000, text: 'B' }, { time: 3000, text: 'C' }];
  assert.deepEqual(retext(lines, 'A\nC\nB').map((l) => l.time), [1000, 3000, null]);
  assert.deepEqual(retext(lines, 'A\nX\nC').map((l) => l.time), [1000, 2000, 3000]);
});
