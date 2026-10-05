import type { Cue, SubtitleFile } from './types.ts';

// Where cues sit on screen, numbered like a numpad and like ASS \an: 1-3 bottom, 4-6 middle, 7-9 top, left to right.
export type Position = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// SSA (V4 Styles, \a) numbers rows differently: bottom 1-3, top 5-7, middle 9-11.
const ssaAlignment = (p: Position) => (p <= 3 ? p : p >= 7 ? p - 2 : p + 5);

const isSection = (l: string) => /^\[.*\]\s*$/.test(l);

// Rewrites one field of every Style: line in the styles section.
function setStyleField(header: string, field: string, update: (old: string) => string): string {
  const lines = header.split('\n');
  let inStyles = false;
  let index = -1;
  return lines
    .map((l) => {
      if (isSection(l)) {
        inStyles = /^\[v4\+? styles\]/i.test(l);
        index = -1;
        return l;
      }
      if (!inStyles) return l;
      const format = /^Format\s*:(.*)/i.exec(l);
      if (format) index = format[1].split(',').findIndex((f) => f.trim().toLowerCase() === field);
      const style = /^(Style\s*:\s?)(.*)$/i.exec(l);
      if (!style || index === -1) return l;
      const values = style[2].split(',');
      if (index >= values.length) return l;
      values[index] = update(values[index]);
      return style[1] + values.join(',');
    })
    .join('\n');
}

// Only inside {...} override blocks.
const inBlocks = (text: string, fn: (block: string) => string) =>
  text.replace(/\{([^}]*)\}/g, (_, block: string) => {
    const out = fn(block);
    return out === '' && block !== '' ? '' : `{${out}}`;
  });

const anTag = /\\an\d/g;
const aTag = /\\a\d+(?!\w)/g; // \a1..\a11, always in the legacy SSA numbering; not \alpha
const posTag = /\\pos\([^)]*\)/g;
const placed = /\\(pos|move)\(/; // with these, \an sets the anchor point, so changing it would move the text

const stripAlignment = (block: string) => block.replace(anTag, '').replace(aTag, '');

function assCue(c: Cue, position: Position | null): string {
  return inBlocks(c.text, (block) =>
    position === null
      ? stripAlignment(block).replace(posTag, '')
      : placed.test(block) ? block : block.replace(anTag, `\\an${position}`).replace(aTag, `\\a${ssaAlignment(position)}`),
  );
}

const vttLine = ['line:0%', 'line:50%,center', 'line:100%,end']; // top, middle, bottom
const vttColumn = ['position:10%,line-left align:left', 'position:50%,center align:center', 'position:90%,line-right align:right'];

function vttSettings(settings: string | undefined, position: Position | null): string {
  const kept = (settings ?? '').split(/\s+/).filter((s) => s && !/^(line|position|align):/.test(s));
  if (position !== null) kept.push(vttLine[2 - Math.floor((position - 1) / 3)], vttColumn[(position - 1) % 3]);
  return kept.join(' ');
}

function vttCue(c: Cue, position: Position | null): Cue {
  const { settings: _, ...rest } = c.extras ?? {};
  const settings = vttSettings(c.extras?.settings, position);
  const extras = settings ? { ...rest, settings } : rest;
  return { ...c, extras: Object.keys(extras).length ? extras : undefined };
}

// Sets every cue's position, or removes the positions it had (null). Returns a new file.
// pinned: ASS cues placed with \pos or \move, which keep their exact spot and anchor.
export function setPosition(file: SubtitleFile, position: Position | null): { file: SubtitleFile; pinned: number[] } {
  const { format } = file;
  if (format === 'srt') {
    const cues = file.cues.map((c) => ({ ...c, text: (position === null ? '' : `{\\an${position}}`) + inBlocks(c.text, stripAlignment) }));
    return { file: { ...file, cues }, pinned: [] };
  }
  if (format === 'vtt') return { file: { ...file, cues: file.cues.map((c) => vttCue(c, position)) }, pinned: [] };
  if (format === 'ass' || format === 'ssa') {
    const ssa = format === 'ssa';
    const header = position === null || !file.header ? file.header : setStyleField(file.header, 'alignment', () => String(ssa ? ssaAlignment(position) : position));
    const pinned = position === null ? [] : file.cues.flatMap((c, i) => (/\{[^}]*\\(pos|move)\(/.test(c.text) ? [i + 1] : []));
    return { file: { ...file, header, cues: file.cues.map((c) => ({ ...c, text: assCue(c, position) })) }, pinned };
  }
  throw new Error('Positions can only be set on SRT, WebVTT, ASS and SSA files.');
}

// SRT: the attributes and inner text when one <font> tag wraps all of s.
function fontWrapped(s: string): { attrs: string; inner: string } | null {
  const open = /^<font\b([^>]*)>/i.exec(s);
  if (!open) return null;
  let depth = 0;
  for (const m of s.matchAll(/<(\/?)font\b[^>]*>/gi)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return m.index + m[0].length === s.length ? { attrs: open[1], inner: s.slice(open[0].length, m.index) } : null;
  }
  return null;
}

const colorAttr = /\s*\bcolor\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i;

// A color on the whole cue or on a whole line is replaced; a color on part of a line stays.
function srtCue(text: string, color: string): string {
  if (!text) return text;
  const [, lead, body] = /^((?:\{[^}]*\})*)([\s\S]*)$/.exec(text)!; // {\an8} stays in front
  const outer = fontWrapped(body);
  const attrs = outer ? outer.attrs.replace(colorAttr, '') : '';
  const inner = (outer ? outer.inner : body)
    .split('\n')
    .map((line) => {
      const w = fontWrapped(line);
      if (!w || !colorAttr.test(w.attrs)) return line;
      const rest = w.attrs.replace(colorAttr, '');
      return rest.trim() ? `<font${rest}>${w.inner}</font>` : w.inner;
    })
    .join('\n');
  return `${lead}<font color="${color}"${attrs}>${inner}</font>`;
}

// The color in a bare ::cue rule (not ::cue(.class)) of a WebVTT STYLE block.
const cueRuleColor = /(::cue\s*\{[^}]*?(?<![\w-])color\s*:\s*)[^;}]*?(\s*[;}])/g;

function vttHeader(header: string | undefined, color: string): string {
  let found = false;
  const blocks = (header ?? 'WEBVTT').split('\n\n').map((b) => {
    if (!/^STYLE\b/.test(b) || !b.match(cueRuleColor)) return b;
    found = true;
    return b.replace(cueRuleColor, `$1${color}$2`);
  });
  if (!found) blocks.push(`STYLE\n::cue { color: ${color}; }`);
  return blocks.join('\n\n');
}

// ASS colors are &HAABBGGRR (alpha kept); SSA styles often store the same BGR value as a decimal number.
function assColor(old: string, bgr: string): string {
  if (/^-?\d+$/.test(old.trim())) return String(parseInt(bgr, 16));
  const digits = old.trim().replace(/^&H/i, '').replace(/&$/, '');
  return `&H${digits.length > 6 ? digits.slice(0, -6) : '00'}${bgr}`;
}

const inlineColor = /\\(1?c)&H[0-9a-f]+&?/gi; // \c and \1c; not \2c-\4c (karaoke, outline, shadow)

// Sets the text color of every cue (color is #rrggbb). Returns a new file.
// kept: SRT cues where part of a line has its own <font color>, which still shows in that color.
export function setColor(file: SubtitleFile, color: string): { file: SubtitleFile; kept: number[] } {
  color = color.toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(color)) throw new Error(`Not a color: ${color}`);
  const { format } = file;
  if (format === 'srt') {
    const cues = file.cues.map((c) => ({ ...c, text: srtCue(c.text, color) }));
    const kept = cues.flatMap((c, i) => (/<font\b[^>]*\bcolor\s*=[\s\S]*<font\b[^>]*\bcolor\s*=/i.test(c.text) ? [i + 1] : []));
    return { file: { ...file, cues }, kept };
  }
  if (format === 'vtt') return { file: { ...file, header: vttHeader(file.header, color) }, kept: [] };
  if (format === 'ass' || format === 'ssa') {
    const bgr = (color.slice(5, 7) + color.slice(3, 5) + color.slice(1, 3)).toUpperCase();
    const header = file.header && setStyleField(file.header, 'primarycolour', (old) => assColor(old, bgr));
    const cues = file.cues.map((c) => ({ ...c, text: inBlocks(c.text, (b) => b.replace(inlineColor, `\\$1&H${bgr}&`)) }));
    return { file: { ...file, header, cues }, kept: [] };
  }
  throw new Error('Colors can only be set on SRT, WebVTT, ASS and SSA files.');
}
