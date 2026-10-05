import { test } from 'node:test';
import assert from 'node:assert/strict';
import { songInfo } from './audio-tags.ts';

const syncsafe = (n: number) => [(n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127];
const be = (n: number) => [(n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];

function id3(version: 3 | 4, frames: [string, number, number[]][]): Uint8Array {
  const body = frames.flatMap(([id, enc, text]) => {
    const data = [enc, ...text];
    return [...[...id].map((c) => c.charCodeAt(0)), ...(version === 4 ? syncsafe(data.length) : be(data.length)), 0, 0, ...data];
  });
  return new Uint8Array([0x49, 0x44, 0x33, version, 0, 0, ...syncsafe(body.length), ...body, 0xff, 0xfb]);
}
const utf8 = (s: string) => [...new TextEncoder().encode(s)];
const utf16 = (s: string) => [0xff, 0xfe, ...[...s].flatMap((c) => [c.charCodeAt(0) & 255, c.charCodeAt(0) >> 8]), 0, 0];

test('id3v2.4 utf-8 and id3v2.3 utf-16 artist and title', () => {
  assert.deepEqual(songInfo(id3(4, [['TIT2', 3, utf8('Café song')], ['TPE1', 3, utf8('Ana')]]), 'x.mp3'), { artist: 'Ana', title: 'Café song' });
  assert.deepEqual(songInfo(id3(3, [['TPE1', 1, utf16('Bob')], ['TIT2', 0, [72, 105, 0]]]), 'x.mp3'), { artist: 'Bob', title: 'Hi' });
});

test('no tags: artist and title come from an "Artist - Title" file name', () => {
  assert.deepEqual(songInfo(new Uint8Array([1, 2, 3]), '01 Some Band - A Song.mp3'), { artist: 'Some Band', title: 'A Song' });
  assert.deepEqual(songInfo(new Uint8Array(), 'track.flac'), { artist: '', title: 'track' });
  // A tag that's missing is filled from the file name.
  assert.deepEqual(songInfo(id3(3, [['TIT2', 0, [72, 105]]]), 'Band - Other.mp3'), { artist: 'Band', title: 'Hi' });
});
