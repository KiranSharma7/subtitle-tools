import type { SubtitleFile } from '../engine/types.ts';
import { parseTime } from '../engine/time.ts';
import { rematch } from './lyrics.ts';

// One subtitle in the SRT editor. start and end are null until timed; text keeps its line breaks.
export type Line = { start: number | null; end: number | null; text: string };

// The Text tab shows one subtitle per row, with " | " where the subtitle breaks onto a second line.
export const toRow = (text: string) => text.split('\n').join(' | ');
export const fromRow = (row: string) => row.split('|').map((s) => s.trim()).filter(Boolean).join('\n');

// After the Text tab is edited. Blank rows are not subtitles.
export function retextLines(lines: Line[], text: string): Line[] {
  const next = text.split('\n').map(fromRow).filter(Boolean);
  return rematch(lines.map((l) => l.text), next).map((k, i) => (k < 0 ? { start: null, end: null, text: next[i] } : { ...lines[k], text: next[i] }));
}

// R on the Timing tab: line i starts now, and the line before it ends now unless it already ended sooner.
export function stampStart(lines: Line[], i: number, ms: number): Line[] {
  return lines.map((l, k) => {
    if (k === i) return { ...l, start: ms, end: l.end != null && l.end > ms ? l.end : null };
    if (k === i - 1 && l.start != null && l.start < ms && (l.end == null || l.end > ms)) return { ...l, end: ms };
    return l;
  });
}

// E on the Timing tab: line i ends now, for a pause before the next line.
export const stampEnd = (lines: Line[], i: number, ms: number): Line[] =>
  lines.map((l, k) => (k === i && l.start != null && ms > l.start ? { ...l, end: ms } : l));

// How long a subtitle needs on screen: about 15 characters a second, between 1 and 7 seconds.
export function readingTime(text: string): number {
  const chars = text.replace(/<[^>]*>|\{[^}]*\}|\n/g, '').length;
  return Math.min(7000, Math.max(1000, Math.round((chars / 15) * 1000)));
}

// Times every untimed line by reading speed, one after another, starting after the timed line before it.
export function autoTime(lines: Line[], gap = 100): Line[] {
  let at = 0;
  return lines.map((l) => {
    const start = l.start ?? at;
    const end = l.end ?? start + readingTime(l.text);
    at = end + gap;
    return l.start == null ? { ...l, start, end } : l;
  });
}

// The subtitle file to download: timed lines in time order. A line with no end ends at the next start or
// after its reading time, whichever comes first. untimed and overlaps are 1-based line numbers in the editor.
export function toFile(lines: Line[]): { file: SubtitleFile; untimed: number[]; overlaps: number[] } {
  const timed = lines.flatMap((l, i) => (l.text && l.start != null ? [{ ...l, start: l.start, n: i + 1 }] : [])).sort((a, b) => a.start - b.start);
  const cues = timed.map((l, k) => {
    const next = timed[k + 1]?.start;
    const open = l.start + readingTime(l.text);
    return { start: l.start, end: l.end ?? (next != null && next > l.start ? Math.min(next, open) : open), text: l.text, n: l.n };
  });
  return {
    file: { format: 'srt', cues: cues.map(({ start, end, text }) => ({ start, end, text })) },
    untimed: lines.flatMap((l, i) => (l.text && l.start == null ? [i + 1] : [])),
    overlaps: cues.flatMap((c, k) => (k > 0 && c.start < cues[k - 1].end ? [c.n] : [])),
  };
}

// The line on screen at ms, for the caption over the video. -1 for none.
export function activeCue(lines: Line[], ms: number): number {
  return lines.findIndex((l) => l.start != null && l.start <= ms && ms < (l.end ?? l.start + readingTime(l.text)));
}

// A time typed on the Edit tab: 00:01:02,500, 01:02.5, 1:02, 1:02:03 or plain seconds like 62.5.
export function parseClock(s: string): number | null {
  const t = s.trim();
  const exact = parseTime(t);
  if (exact != null) return exact;
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})$/.exec(t);
  if (m) return ((+(m[1] ?? 0) * 60 + +m[2]) * 60 + +m[3]) * 1000;
  return /^\d+(\.\d+)?$/.test(t) ? Math.round(parseFloat(t) * 1000) : null;
}
