// PDF output for the Convert to PDF page. No DOM code, so it runs under node --test.
// pdf-lib is imported inside buildPdf, so the page only downloads it when a PDF is made.
// Fonts are the Noto TTFs in public/fonts: fetched only for the scripts the text uses, and subset on embed.
import type { PDFFont } from 'pdf-lib';
import { plainText, type ParseResult } from '../engine/formats.ts';
import { formatTime } from '../engine/time.ts';

// One font each. latin is Noto Sans, which also covers Greek and Cyrillic.
export type Script = 'latin' | 'arabic' | 'hebrew' | 'devanagari' | 'thai' | 'jp' | 'kr' | 'sc';

export const fontFiles: Record<Script, string> = {
  latin: '/fonts/NotoSans-Regular.ttf',
  arabic: '/fonts/NotoSansArabic-Regular.ttf',
  hebrew: '/fonts/NotoSansHebrew-Regular.ttf',
  devanagari: '/fonts/NotoSansDevanagari-Regular.ttf',
  thai: '/fonts/NotoSansThai-Regular.ttf',
  jp: '/fonts/NotoSansJP-Regular.ttf',
  kr: '/fonts/NotoSansKR-Regular.ttf',
  sc: '/fonts/NotoSansSC-Regular.ttf',
};

// han, kana and hangul pick their font per document (see hanFont). space joins the run it's in;
// ignore is dropped (direction marks, zero-width characters); missing has no font here (emoji, other scripts).
type Class = Exclude<Script, 'jp' | 'kr' | 'sc'> | 'han' | 'kana' | 'hangul' | 'space' | 'ignore' | 'missing';

const ranges: [number, number, Class][] = [
  [0x0000, 0x001f, 'ignore'],
  [0x0020, 0x0020, 'space'],
  [0x0021, 0x052f, 'latin'],
  [0x0590, 0x05ff, 'hebrew'],
  [0x0600, 0x06ff, 'arabic'],
  [0x0750, 0x077f, 'arabic'],
  [0x0870, 0x08ff, 'arabic'],
  [0x0900, 0x097f, 'devanagari'],
  [0x0e00, 0x0e7f, 'thai'],
  [0x1100, 0x11ff, 'hangul'],
  [0x1ab0, 0x1aff, 'latin'],
  [0x1c80, 0x1c8f, 'latin'],
  [0x1d00, 0x1fff, 'latin'],
  [0x200b, 0x200f, 'ignore'],
  [0x2000, 0x2027, 'latin'],
  [0x2028, 0x202e, 'ignore'],
  [0x202f, 0x205f, 'latin'],
  [0x2060, 0x206f, 'ignore'],
  [0x2070, 0x22ff, 'latin'],
  [0x2c60, 0x2c7f, 'latin'],
  [0x2de0, 0x2dff, 'latin'],
  [0x2e80, 0x2fdf, 'han'],
  [0x3000, 0x303f, 'han'],
  [0x3040, 0x30ff, 'kana'],
  [0x3130, 0x318f, 'hangul'],
  [0x31c0, 0x31ef, 'han'],
  [0x31f0, 0x31ff, 'kana'],
  [0x3200, 0x4dbf, 'han'],
  [0x4e00, 0x9fff, 'han'],
  [0xa640, 0xa69f, 'latin'],
  [0xa720, 0xa7ff, 'latin'],
  [0xa8e0, 0xa8ff, 'devanagari'],
  [0xa960, 0xa97f, 'hangul'],
  [0xac00, 0xd7ff, 'hangul'],
  [0xf900, 0xfaff, 'han'],
  [0xfb00, 0xfb06, 'latin'],
  [0xfb1d, 0xfb4f, 'hebrew'],
  [0xfb50, 0xfdff, 'arabic'],
  [0xfe00, 0xfe0f, 'ignore'],
  [0xfe20, 0xfe2f, 'latin'],
  [0xfe30, 0xfe4f, 'han'],
  [0xfe70, 0xfefe, 'arabic'],
  [0xfeff, 0xfeff, 'ignore'],
  [0xff66, 0xff9f, 'kana'],
  [0xff00, 0xffef, 'han'],
  [0xfffd, 0xfffd, 'latin'],
  [0x20000, 0x3ffff, 'han'],
];

function classOf(cp: number): Class {
  if (cp === 0xa0) return 'space';
  // First match wins, so the narrower ranges listed before a wider one (U+200B in U+2000-...) take priority.
  for (const [from, to, c] of ranges) if (cp >= from && cp <= to) return c;
  return 'missing';
}

// Han text has no single font: Japanese files (with kana) use JP, Korean (with hangul) KR, the rest Simplified Chinese.
function hanFont(text: string): Script {
  if (/[぀-ヿㇰ-ㇿｦ-ﾟ]/.test(text)) return 'jp';
  if (/[ᄀ-ᇿ㄰-㆏가-퟿]/.test(text)) return 'kr';
  return 'sc';
}

const scriptFor = (c: Class, han: Script): Script | null =>
  c === 'han' ? han : c === 'kana' ? 'jp' : c === 'hangul' ? 'kr' : c === 'space' || c === 'ignore' || c === 'missing' ? null : c;

// The fonts a text needs, and the characters it has that none of them can draw.
export function scriptsIn(text: string): { scripts: Set<Script>; missing: string[] } {
  const han = hanFont(text);
  const scripts = new Set<Script>(['latin']);
  const missing = new Set<string>();
  for (const ch of text) {
    if (ch === '\n') continue;
    const c = classOf(ch.codePointAt(0)!);
    if (c === 'missing') missing.add(ch);
    const s = scriptFor(c, han);
    if (s) scripts.add(s);
  }
  return { scripts, missing: [...missing] };
}

export type PdfCue = { time?: string; text: string };
export type PdfDoc = { title: string; cues: PdfCue[] };

// Cue text without tags. Cues with no text left are dropped, as in plain text. Plain text input has no time.
export function cueRows({ file }: ParseResult, timestamps: boolean): PdfCue[] {
  const hms = (ms: number) => formatTime(ms, ',').slice(0, 8);
  return file.cues.flatMap((c) => {
    const text = plainText(c.text);
    if (!text) return [];
    return [timestamps && file.format !== 'txt' ? { time: `${hms(c.start)} – ${hms(c.end)}`, text } : { text }];
  });
}

export type PdfOptions = {
  size: 'tiny' | 'small' | 'default' | 'large';
  page: 'a4' | 'letter';
  heading: boolean; // the file name above each document
  pageNumbers: boolean;
  gap: boolean; // an empty line between cues
};

const fontSizes = { tiny: 8, small: 10, default: 12, large: 14 };
const pageSizes: Record<PdfOptions['page'], [number, number]> = { a4: [595.28, 841.89], letter: [612, 792] };
const MARGIN = 56;
const grey = [0.4, 0.4, 0.4] as const;

type Font = { pdf: PDFFont; has: (cp: number) => boolean; width: (text: string, at: number) => number };
type Run = { text: string; font: Font };

// Each document starts on a new page. loadFont gets a URL from fontFiles and returns the font file's bytes.
export async function buildPdf(docs: PdfDoc[], options: PdfOptions, loadFont: (url: string) => Promise<Uint8Array>): Promise<Uint8Array> {
  // fontkit's Indic shaper (Devanagari) calls a global regeneratorRuntime that its build never defines.
  const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([import('pdf-lib'), import('@pdf-lib/fontkit'), import('regenerator-runtime/runtime.js')]);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(docs.length === 1 ? docs[0].title : 'Subtitles');

  const allText = docs.map((d) => [d.title, ...d.cues.map((c) => `${c.time ?? ''}\n${c.text}`)].join('\n'));
  const needed = new Set<Script>(['latin']);
  for (const t of allText) for (const s of scriptsIn(t).scripts) needed.add(s);
  const fonts = Object.fromEntries(await Promise.all([...needed].map(async (s) => {
    const bytes = await loadFont(fontFiles[s]);
    const glyphs = fontkit.create(bytes);
    const embedded = await pdf.embedFont(bytes, { subset: true });
    // Every width is a full fontkit layout, and subtitles repeat their words a lot, so both lookups are kept.
    const known = new Map<number, boolean>();
    const has = (cp: number) => known.get(cp) ?? (known.set(cp, glyphs.hasGlyphForCodePoint(cp)), known.get(cp)!);
    const widths = new Map<string, number>();
    const width = (text: string, at: number) => at * (widths.get(text) ?? (widths.set(text, embedded.widthOfTextAtSize(text, 1)), widths.get(text)!));
    return [s, { pdf: embedded, has, width }] as const;
  }))) as Partial<Record<Script, Font>>;
  const latin = fonts.latin!;

  const size = fontSizes[options.size];
  const lineHeight = size * 1.45;
  const [width, height] = pageSizes[options.page];
  const maxWidth = width - 2 * MARGIN;
  const words = new Intl.Segmenter(undefined, { granularity: 'word' });
  const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

  // Splits a line into runs of one font. Spaces stay in the run they're in; characters no font has are dropped.
  function runs(line: string, han: Script): Run[] {
    const out: Run[] = [];
    for (const ch of line) {
      const cp = ch.codePointAt(0)!;
      const c = classOf(cp);
      if (c === 'ignore' || c === 'missing') continue;
      const script = scriptFor(c, han);
      const last = out.at(-1);
      const font = script ? fonts[script] ?? latin : last?.font ?? latin;
      if (!font.has(cp)) continue;
      if (last && (last.font === font || !script)) last.text += ch;
      else out.push({ text: ch, font });
    }
    return out;
  }

  const measure = (list: Run[], at: number) => list.reduce((w, r) => w + r.font.width(r.text, at), 0);

  // Greedy wrap at word boundaries (Intl.Segmenter knows Thai, Chinese and Japanese words). A word wider than the line breaks between characters.
  function wrap(line: string, han: Script, at: number): string[] {
    const lines: string[] = [];
    let cur = '';
    let curWidth = 0;
    const push = (piece: string, w: number) => {
      const blank = !piece.trim();
      if (cur && curWidth + w > maxWidth) {
        lines.push(cur.trimEnd());
        cur = '';
        curWidth = 0;
      }
      if (blank && !cur) return;
      cur += piece;
      curWidth += w;
    };
    for (const { segment } of words.segment(line)) {
      const w = measure(runs(segment, han), at);
      if (w <= maxWidth) push(segment, w);
      else for (const { segment: g } of graphemes.segment(segment)) push(g, measure(runs(g, han), at));
    }
    if (cur.trim()) lines.push(cur.trimEnd());
    return lines;
  }

  let page = pdf.addPage([width, height]);
  let y = height - MARGIN;
  const fits = (h: number) => y - h >= MARGIN;
  const newPage = () => {
    page = pdf.addPage([width, height]);
    y = height - MARGIN;
  };

  // A right-to-left line is right-aligned. In its right-to-left parts the font runs go in reverse. fontkit lays out
  // a run with Arabic or Hebrew letters right to left itself; a run of only spaces and punctuation is reversed here.
  function draw(line: string, han: Script, at: number, color: readonly [number, number, number] = [0, 0, 0]) {
    const h = at * 1.45;
    if (!fits(h)) newPage();
    y -= h;
    const { rtl, parts } = bidi(line);
    const list = parts.flatMap((part) => {
      const list = runs(part.text, han);
      if (!part.rtl) return list;
      return list.reverse().map((r) => ([...r.text].some(rtlLetter) ? r : { ...r, text: [...graphemes.segment(r.text)].map((g) => g.segment).reverse().join('') }));
    });
    const total = measure(list, at);
    let x = rtl ? width - MARGIN - total : MARGIN;
    for (const r of list) {
      page.drawText(r.text, { x, y: y + (h - at) / 2, size: at, font: r.font.pdf, color: rgb(...color) });
      x += r.font.width(r.text, at);
    }
  }

  for (const [i, doc] of docs.entries()) {
    if (i > 0) newPage();
    const han = hanFont(allText[i]);
    if (options.heading) {
      for (const l of wrap(doc.title, han, size * 1.3)) draw(l, han, size * 1.3);
      y -= lineHeight;
    }
    for (const [ci, cue] of doc.cues.entries()) {
      if (ci > 0 && options.gap) y -= lineHeight;
      const text = cue.text.split('\n').flatMap((l) => wrap(l, han, size));
      // Keep the time on the same page as the cue's first line.
      if (cue.time && !fits(size * 0.85 * 1.45 + lineHeight)) newPage();
      if (cue.time) draw(cue.time, han, size * 0.85, grey);
      for (const l of text) draw(l, han, size);
    }
  }

  if (options.pageNumbers) {
    const pages = pdf.getPages();
    const at = size * 0.8;
    for (const [i, p] of pages.entries()) {
      const label = `${i + 1} / ${pages.length}`;
      p.drawText(label, { x: (width - latin.width(label, at)) / 2, y: MARGIN / 2, size: at, font: latin.pdf, color: rgb(...grey) });
    }
  }
  return pdf.save();
}

const rtlLetter = (ch: string) => {
  const c = classOf(ch.codePointAt(0)!);
  return (c === 'arabic' || c === 'hebrew') && /\p{L}/u.test(ch);
};

// Simplified bidi for one line. Arabic and Hebrew letters are right to left; other letters and all digits are left to right.
// The rest (spaces, punctuation) takes the direction of the letters on both sides when they agree, or else the line's,
// which is its first letter's. Combining marks follow the character before them.
// Returns the line's direction and its parts of one direction, in the order they're drawn from the left.
export function bidi(line: string): { rtl: boolean; parts: { text: string; rtl: boolean }[] } {
  const chars = [...line];
  const dirs = chars.map((ch) => (/\p{N}/u.test(ch) ? 'L' : rtlLetter(ch) ? 'R' : /\p{L}/u.test(ch) ? 'L' : 'N'));
  chars.forEach((ch, i) => i && /\p{M}/u.test(ch) && (dirs[i] = dirs[i - 1]));
  const rtl = dirs.find((d) => d !== 'N') === 'R';
  const base = rtl ? 'R' : 'L';
  for (let i = 0; i < dirs.length;) {
    if (dirs[i] !== 'N') {
      i++;
      continue;
    }
    let j = i;
    while (j < dirs.length && dirs[j] === 'N') j++;
    const before = i ? dirs[i - 1] : base;
    const after = j < dirs.length ? dirs[j] : base;
    dirs.fill(before === after ? before : base, i, j);
    i = j;
  }
  const parts: { text: string; rtl: boolean }[] = [];
  chars.forEach((ch, i) => {
    const last = parts.at(-1);
    if (last && last.rtl === (dirs[i] === 'R')) last.text += ch;
    else parts.push({ text: ch, rtl: dirs[i] === 'R' });
  });
  return { rtl, parts: rtl ? parts.reverse() : parts };
}
