import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8, strFromU8 } from 'fflate';
import { accepts, readZip, makeZip } from './zip.ts';

test('readZip keeps files and skips folders and OS junk', () => {
  const bytes = zipSync({
    'a.srt': strToU8('one'),
    'season 1/b.vtt': strToU8('two'),
    'season 1/': new Uint8Array(),
    '__MACOSX/._a.srt': strToU8('junk'),
    '.DS_Store': strToU8('junk'),
    'season 1/Thumbs.db': strToU8('junk'),
  });
  const files = readZip(bytes);
  assert.deepEqual(files.map((f) => f.name), ['a.srt', 'b.vtt']);
  assert.equal(strFromU8(files[1].data), 'two');
});

test('readZip filters by the accept list', () => {
  const bytes = zipSync({ 'a.srt': strToU8('x'), 'cover.jpg': strToU8('x'), 'B.SRT': strToU8('x') });
  assert.deepEqual(readZip(bytes, '.srt,.vtt').map((f) => f.name), ['a.srt', 'B.SRT']);
  assert.deepEqual(readZip(bytes, '').map((f) => f.name), ['a.srt', 'cover.jpg', 'B.SRT']);
});

test('readZip throws on bytes that are not a zip', () => {
  assert.throws(() => readZip(strToU8('not a zip')));
});

test('makeZip round-trips text and renames clashing names', () => {
  const bytes = makeZip([
    { name: 'a.srt', text: 'Café' },
    { name: 'a.srt', text: 'two' },
    { name: 'b', text: 'three' },
    { name: 'b', text: 'four' },
  ]);
  const files = readZip(bytes);
  assert.deepEqual(files.map((f) => f.name), ['a.srt', 'a (2).srt', 'b', 'b (2)']);
  assert.equal(strFromU8(files[0].data), 'Café');
});

test('accepts matches extensions, and an empty accept list takes anything', () => {
  assert.equal(accepts('Movie.SRT', '.srt,.vtt'), true);
  assert.equal(accepts('notes.nfo', '.srt,.vtt'), false);
  assert.equal(accepts('notes.nfo', ''), true);
});
