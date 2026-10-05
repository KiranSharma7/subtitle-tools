import type { Cue, SubtitleFile } from './types.ts';
import type { ParseResult } from './formats.ts';

// LRC stores only start times. A line ends where the next timed line starts; an empty timed line
// ([01:02.00] with no text) ends the line before it without starting a new one. The last line gets LAST_LINE_MS.
export const LAST_LINE_MS = 5000;

const STAMP = /^\[(\d+):(\d{1,2})(?:[.:](\d{1,3}))?\]/;
const WORD = /<(\d+):(\d{1,2})(?:[.:](\d{1,3}))?>/g;
const TAG = /^\[([a-z#]+):(.*)\]$/i;

// One timed LRC line: what the timed lyrics editor works with. time is null until the line is synced.
export type Stamp = { time: number | null; text: string };

const ms = (m: RegExpExecArray | RegExpMatchArray) => (+m[1] * 60 + +m[2]) * 1000 + +(m[3] ?? '0').padEnd(3, '0');

// mm:ss.xx, rounded to the nearest centisecond.
export function lrcTime(t: number): string {
  const cs = Math.round(Math.max(0, t) / 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(cs / 6000))}:${pad(Math.floor(cs / 100) % 60)}.${pad(cs % 100)}`;
}

// [offset:+500] makes every line show 500 ms sooner.
const offsetOf = (header = '') => +(/^\[offset:\s*([+-]?\d+)\s*\]$/im.exec(header)?.[1] ?? 0);

// Enhanced LRC word timings (<mm:ss.xx>) are stored relative to their line's start, so shifting a line moves its words.
const shiftWords = (text: string, delta: number) =>
  text.replace(WORD, (...m) => `<${lrcTime(ms(m as unknown as RegExpMatchArray) + delta)}>`);

// Timed lines become cues; empty lines only end the line before them. Untimed lines are left out.
export function fromStamps(stamps: Stamp[], header?: string): SubtitleFile {
  const timed = stamps.filter((s): s is { time: number; text: string } => s.time != null).sort((a, b) => a.time - b.time);
  const cues: Cue[] = timed.flatMap((s, i) => {
    if (!s.text.trim()) return [];
    const next = timed.slice(i + 1).find((n) => n.time > s.time);
    return [{ start: s.time, end: next?.time ?? s.time + LAST_LINE_MS, text: s.text }];
  });
  return { format: 'lrc', header, cues };
}

// The reverse of fromStamps: an empty line wherever a cue ends before the next one starts.
export function toStamps(file: SubtitleFile): { time: number; text: string }[] {
  return file.cues.flatMap((c, i) => {
    const next = file.cues[i + 1];
    const gap = next ? c.end < next.start : c.end !== c.start + LAST_LINE_MS;
    return [{ time: c.start, text: c.text }, ...(gap ? [{ time: c.end, text: '' }] : [])];
  });
}

// [ar:], [ti:], [offset:] and other tag lines are the header; [mm:ss.xx] lines, with one or more stamps, the lyrics.
export function parseLrc(text: string): ParseResult {
  const header: string[] = [];
  const problems: string[] = [];
  const found: { at: number; text: string }[] = [];
  text.split('\n').forEach((raw, i) => {
    const l = raw.trim();
    if (!l) return;
    let rest = l;
    const times: number[] = [];
    for (let m; (m = STAMP.exec(rest)); rest = rest.slice(m[0].length)) times.push(ms(m));
    if (times.length) for (const at of times) found.push({ at, text: rest.trim() });
    else if (TAG.test(l)) header.push(l);
    else problems.push(`Line ${i + 1}: can't read "${l}", skipped.`);
  });
  const h = header.length ? header.join('\n') : undefined;
  const offset = offsetOf(h);
  const stamps = found.map(({ at, text }) => ({ time: Math.max(0, at - offset), text: shiftWords(text, -at) }));
  return { file: fromStamps(stamps, h), problems };
}

export function writeLrc(file: SubtitleFile): string {
  const offset = offsetOf(file.header);
  // An LRC line can't hold a line break; text from another tool that added one goes on one line.
  const lines = toStamps(file).map((s) => `[${lrcTime(s.time + offset)}]${shiftWords(s.text.replace(/\s*\n\s*/g, ' '), s.time + offset)}`);
  return [...(file.header ? [file.header] : []), ...lines].join('\n') + '\n';
}

export function lrcToCommon(c: Cue): { text: string; lost: string[] } {
  const text = c.text.replace(WORD, '');
  return { text, lost: text === c.text ? [] : ['wordTimings'] };
}

// LRC lines are plain text on one line. A line with no text only ends the line before it, so an empty cue is lost.
export function commonToLrc(text: string): { text: string; lost: string[] } {
  const lines = text
    .replace(/<\/?[a-z][^<>\n]*>/gi, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const lost = [];
  if (!lines.length) lost.push('emptyCue');
  if (/<\/?[a-z][^<>\n]*>/i.test(text)) lost.push('formatting');
  if (lines.length > 1) lost.push('lineBreaks');
  return { text: lines.join(' '), lost };
}
