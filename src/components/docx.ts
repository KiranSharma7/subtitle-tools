// The Word page's output: a minimal .docx (a zip of WordprocessingML parts) built with fflate, no DOM code.
import { strToU8, zipSync } from 'fflate';
import type { PdfCue } from './pdf.ts';

export type DocxOptions = {
  page: 'a4' | 'letter';
  heading: boolean; // the file name above each document
  gap: boolean; // an empty line between cues
};

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
// Page sizes in twentieths of a point, 1 inch margins.
const pages = { a4: [11906, 16838], letter: [12240, 15840] };

// Characters XML 1.0 can't hold (control codes) are dropped, the rest escaped.
const esc = (s: string) =>
  s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const run = (text: string, rPr = '') => `<w:r>${rPr && `<w:rPr>${rPr}</w:rPr>`}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
const br = '<w:r><w:br/></w:r>';
const rtl = (s: string) => /[֐-ࣿיִ-﷿ﹰ-﻿]/.test(s);

// pageBreak goes first: WordprocessingML wants paragraph properties in a fixed order.
function paragraph(cue: PdfCue, options: DocxOptions, pageBreak = ''): string {
  const bidi = rtl(cue.text);
  const pPr = `${pageBreak}${bidi ? '<w:bidi/>' : ''}${options.gap ? '<w:spacing w:after="240"/>' : ''}`;
  const lines = cue.text.split('\n').map((l) => run(l, bidi ? '<w:rtl/>' : ''));
  const time = cue.time ? [run(cue.time, '<w:rStyle w:val="Time"/>')] : [];
  return `<w:p>${pPr && `<w:pPr>${pPr}</w:pPr>`}${[...time, ...lines].join(br)}</w:p>`;
}

export function buildDocx(docs: { title: string; cues: PdfCue[] }[], options: DocxOptions): Uint8Array {
  const body = docs.map((d, i) => {
    // Each document after the first starts on a new page, on its heading or its first paragraph.
    const pageBreak = i > 0 ? '<w:pageBreakBefore/>' : '';
    const title = options.heading ? [`<w:p><w:pPr><w:pStyle w:val="Title"/>${pageBreak}</w:pPr>${run(d.title)}</w:p>`] : [];
    const paras = d.cues.map((c, k) => paragraph(c, options, options.heading || k ? '' : pageBreak));
    return [...title, ...paras].join('');
  }).join('');
  const [w, h] = pages[options.page];
  const document = `${xml}<w:document xmlns:w="${W}"><w:body>${body}<w:sectPr><w:pgSz w:w="${w}" w:h="${h}"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;

  const styles = `${xml}<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`
    + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
    + '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>'
    + '<w:style w:type="character" w:styleId="Time"><w:name w:val="Timestamp"/><w:rPr><w:color w:val="707070"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style></w:styles>';

  const rel = (type: string, target: string) => `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`;
  const rels = (r: string) => `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${r}</Relationships>`;
  const type = (part: string, kind: string) => `<Override PartName="/word/${part}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${kind}+xml"/>`;

  return zipSync({
    '[Content_Types].xml': strToU8(`${xml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${type('document', 'document.main')}${type('styles', 'styles')}</Types>`),
    '_rels/.rels': strToU8(rels(rel('officeDocument', 'word/document.xml'))),
    'word/_rels/document.xml.rels': strToU8(rels(rel('styles', 'styles.xml'))),
    'word/styles.xml': strToU8(styles),
    'word/document.xml': strToU8(document),
  });
}
