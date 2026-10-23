import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strFromU8, unzipSync } from 'fflate';
import { buildDocx } from './docx.ts';

const open = (bytes: Uint8Array) => Object.fromEntries(Object.entries(unzipSync(bytes)).map(([k, v]) => [k, strFromU8(v)]));
const options = { page: 'a4' as const, heading: true, gap: true };

test('a docx has the parts Word needs, content types first', () => {
  const parts = open(buildDocx([{ title: 'film.srt', cues: [{ text: 'Hi' }] }], options));
  assert.deepEqual(Object.keys(parts), ['[Content_Types].xml', '_rels/.rels', 'word/_rels/document.xml.rels', 'word/styles.xml', 'word/document.xml']);
  assert.match(parts['[Content_Types].xml'], /PartName="\/word\/document\.xml" ContentType="application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document\.main\+xml"/);
  assert.match(parts['_rels/.rels'], /Target="word\/document\.xml"/);
});

test('each cue is a paragraph: grey time, then its lines with breaks; text is escaped', () => {
  const doc = open(buildDocx([{ title: 'a & b.srt', cues: [{ time: '00:00:01 – 00:00:03', text: 'Tom & <Jerry>\n"Run"' }, { text: 'Bye' }] }], options))['word/document.xml'];
  assert.match(doc, /<w:p><w:pPr><w:pStyle w:val="Title"\/><\/w:pPr><w:r><w:t xml:space="preserve">a &amp; b\.srt<\/w:t><\/w:r><\/w:p>/);
  assert.match(doc, /<w:r><w:rPr><w:rStyle w:val="Time"\/><\/w:rPr><w:t xml:space="preserve">00:00:01 – 00:00:03<\/w:t><\/w:r><w:r><w:br\/><\/w:r><w:r><w:t xml:space="preserve">Tom &amp; &lt;Jerry&gt;<\/w:t><\/w:r><w:r><w:br\/><\/w:r><w:r><w:t xml:space="preserve">"Run"<\/w:t><\/w:r>/);
  // The empty line between cues is spacing after each paragraph.
  assert.equal(doc.match(/<w:spacing w:after="240"\/>/g)?.length, 2);
});

test('options: no heading, no gap, Letter paper', () => {
  const doc = open(buildDocx([{ title: 'x.srt', cues: [{ text: 'Hi' }] }], { page: 'letter', heading: false, gap: false }))['word/document.xml'];
  assert.doesNotMatch(doc, /Title/);
  assert.doesNotMatch(doc, /w:after="240"/);
  assert.match(doc, /<w:pgSz w:w="12240" w:h="15840"\/>/);
  assert.match(open(buildDocx([{ title: 'x', cues: [] }], options))['word/document.xml'], /<w:pgSz w:w="11906" w:h="16838"\/>/);
});

test('combined documents each start on a new page', () => {
  const doc = open(buildDocx([{ title: 'one.srt', cues: [{ text: 'A' }] }, { title: 'two.srt', cues: [{ text: 'B' }] }], options))['word/document.xml'];
  assert.equal(doc.match(/<w:pageBreakBefore\/>/g)?.length, 1);
  assert.ok(doc.indexOf('two.srt') > doc.indexOf('<w:pageBreakBefore/>'));
  // With no heading, the break goes on the next document's first paragraph.
  const bare = open(buildDocx([{ title: 'one', cues: [{ text: 'A' }] }, { title: 'two', cues: [{ text: 'B' }] }], { ...options, heading: false }))['word/document.xml'];
  assert.match(bare, /<w:p><w:pPr><w:pageBreakBefore\/><w:spacing w:after="240"\/><\/w:pPr><w:r><w:t xml:space="preserve">B</);
});

test('right-to-left lines are marked bidi; characters XML cannot hold are dropped', () => {
  const doc = open(buildDocx([{ title: 't', cues: [{ text: 'مرحبا' }, { text: 'bell\u0007 ok' }] }], options))['word/document.xml'];
  assert.match(doc, /<w:p><w:pPr><w:bidi\/>[^]*?<w:rPr><w:rtl\/><\/w:rPr><w:t xml:space="preserve">مرحبا<\/w:t>/);
  assert.match(doc, />bell ok</);
});
