import type { Cue, SubtitleFile } from './types.ts';
import type { ParseResult } from './formats.ts';
import { parseTime } from './time.ts';

const defaultFields = (format: 'ass' | 'ssa') =>
  [format === 'ass' ? 'layer' : 'marked', 'start', 'end', 'style', 'name', 'marginl', 'marginr', 'marginv', 'effect', 'text'];

const isSection = (l: string) => /^\[.*\]\s*$/.test(l);
const isEvents = (l: string) => /^\[events\]\s*$/i.test(l);

function eventFields(lines: string[], format: 'ass' | 'ssa'): string[] {
  const at = lines.findIndex(isEvents);
  for (const l of at === -1 ? [] : lines.slice(at + 1)) {
    if (isSection(l)) break;
    const m = /^Format\s*:(.*)/i.exec(l);
    if (m) return m[1].split(',').map((f) => f.trim().toLowerCase());
  }
  return defaultFields(format);
}

// Dialogue lines become cues; everything else (Script Info, styles, Comment lines, fonts) stays as raw header text.
export function parseAss(text: string, format: 'ass' | 'ssa'): ParseResult {
  const lines = text.split('\n');
  const fields = eventFields(lines, format);
  const cues: Cue[] = [];
  const problems: string[] = [];
  const header: string[] = [];
  // A file with Dialogue lines but no [Events] heading still gets them read.
  let inEvents = !lines.some(isEvents);

  lines.forEach((l, i) => {
    if (isSection(l)) inEvents = isEvents(l);
    const d = inEvents && /^Dialogue\s*:\s?(.*)$/i.exec(l);
    if (!d) return header.push(l);
    // Only the last field (Text) may contain commas.
    const parts = d[1].split(',');
    const values = [...parts.slice(0, fields.length - 1), parts.slice(fields.length - 1).join(',')];
    const get = (f: string) => values[fields.indexOf(f)] ?? '';
    const start = parseTime(get('start'));
    const end = parseTime(get('end'));
    if (start == null || end == null) return problems.push(`Line ${i + 1}: can't read the timestamp in "${l}", cue skipped.`);
    const extras: Record<string, string> = {};
    for (const f of fields) if (!['start', 'end', 'text'].includes(f)) extras[f] = get(f);
    cues.push({ start, end, text: get('text'), extras });
  });

  return { file: { format, header: header.join('\n').trimEnd(), cues }, problems };
}

// H:MM:SS.cc, rounded to the nearest centisecond.
function assTime(ms: number): string {
  const cs = Math.round(ms / 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${Math.floor(cs / 360000)}:${pad(Math.floor(cs / 6000) % 60)}:${pad(Math.floor(cs / 100) % 60)}.${pad(cs % 100)}`;
}

// Dialogue lines go at the end of the [Events] section, after any Comment lines.
export function writeAss(file: SubtitleFile): string {
  const format = file.format === 'ssa' ? 'ssa' : 'ass';
  const lines = (file.header ?? '').split('\n');
  if (!lines.some(isEvents)) lines.push('', '[Events]', 'Format: ' + defaultFields(format).map((f) => f[0].toUpperCase() + f.slice(1)).join(', '));
  const fields = eventFields(lines, format);
  const dialogue = file.cues.map((c) => {
    const value = (f: string) => (f === 'start' ? assTime(c.start) : f === 'end' ? assTime(c.end) : f === 'text' ? c.text : c.extras?.[f] ?? '');
    return 'Dialogue: ' + fields.map(value).join(',');
  });
  const events = lines.findIndex(isEvents);
  let at = lines.findIndex((l, i) => i > events && isSection(l));
  if (at === -1) at = lines.length;
  while (at > events + 1 && !lines[at - 1].trim()) at--;
  lines.splice(at, 0, ...dialogue);
  return lines.join('\n') + '\n';
}

const tagKind = (tag: string) =>
  /^(pos|move|org|an?\d)/.test(tag) ? 'positioning' : /^(k|K|kf|ko)\d/.test(tag) ? 'karaoke' : 'formatting';

// ASS cue text in SRT/WebVTT terms: i/b/u become tags, \N \n \h become breaks and spaces, other overrides are dropped.
export function assToCommon(c: Cue): { text: string; lost: string[] } {
  const lost = new Set<string>();
  const e = c.extras ?? {};
  if ((e.layer ?? '0') !== '0') lost.add('layer');
  if (!/^\*?default$/i.test(e.style ?? 'Default')) lost.add('style');
  if (e.name) lost.add('name');
  if (['marginl', 'marginr', 'marginv'].some((m) => +(e[m] ?? 0))) lost.add('margins');
  if (e.effect) lost.add('effect');

  const open: string[] = [];
  const ends = (tags: string[]) => [...tags].reverse().map((t) => `</${t}>`).join('');
  // Closing a tag that has others opened inside it closes those too, then reopens them, so the output nests.
  const close = (t: string) => {
    const at = open.indexOf(t);
    if (at === -1) return '';
    const inner = open.splice(at).slice(1);
    open.push(...inner);
    return ends([t, ...inner]) + inner.map((x) => `<${x}>`).join('');
  };
  const set = (t: string, on: boolean) => (on ? (open.includes(t) ? '' : (open.push(t), `<${t}>`)) : close(t));

  let text = c.text.replace(/\{([^}]*)\}/g, (_, block: string) => {
    // A block with no backslash is a comment and never shows on screen.
    let out = '';
    for (const tag of block.split('\\').slice(1)) {
      const m = /^([ibu])(\d*)$/.exec(tag);
      if (m) out += set(m[1], m[1] === 'b' ? +m[2] === 1 || +m[2] >= 500 : m[2] === '1');
      else if (/^r(\D|$)/.test(tag)) out += ends(open.splice(0));
      else if (tag.trim()) lost.add(tagKind(tag));
    }
    return out;
  });
  text = text.replace(/\\[Nn]/g, '\n').replace(/\\h/g, ' ') + ends(open);
  return { text, lost: [...lost] };
}

// The header a file gets when it's converted to ASS: one Default style, bottom center.
export const defaultAssHeader = `[Script Info]
ScriptType: v4.00+
PlayResX: 384
PlayResY: 288
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,1,1,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

export const defaultAssExtras = { layer: '0', style: 'Default', name: '', marginl: '0', marginr: '0', marginv: '0', effect: '' };

const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', nbsp: '\\h' };

// SRT/WebVTT cue text in ASS terms: <i> <b> <u> become override tags, line breaks become \N, other tags are dropped.
// An SRT {\an#} is already ASS and stays.
export function commonToAss(text: string): { text: string; lost: string[] } {
  const lost = new Set<string>();
  const out = text
    .replace(/<(\/?)([ibu])>|<\/?[a-z][^<>\n]*>|<[\d:.]+>/gi, (_, close: string | undefined, t: string | undefined) => {
      if (t) return `{\\${t.toLowerCase()}${close ? 0 : 1}}`;
      lost.add('formatting');
      return '';
    })
    .replace(/&(amp|lt|gt|nbsp);/g, (_, e: string) => entities[e])
    .replace(/\n/g, '\\N');
  return { text: out, lost: [...lost] };
}
