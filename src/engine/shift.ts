import type { Cue, SubtitleFile } from './types.ts';

export type ShiftResult = {
  file: SubtitleFile;
  clamped: number[]; // 1-based cue numbers whose start was moved up to 0
  removed: number[]; // 1-based cue numbers that ended before 0 and were dropped
};

// Moves each cue by offsetOf(cue), clamping at 0 as described in CONTEXT.md.
function shiftEach(file: SubtitleFile, offsetOf: (c: Cue, i: number) => number): ShiftResult {
  const clamped: number[] = [];
  const removed: number[] = [];
  const cues = file.cues.flatMap((c, i) => {
    const off = offsetOf(c, i);
    const start = c.start + off;
    const end = c.end + off;
    if (end <= 0) return removed.push(i + 1), [];
    if (start < 0) clamped.push(i + 1);
    return [{ ...c, start: Math.max(0, start), end }];
  });
  return { file: { ...file, cues }, clamped, removed };
}

export function shift(file: SubtitleFile, offsetMs: number): ShiftResult {
  return shiftEach(file, () => offsetMs);
}

export type Range = { from: number; to: number; offset: number }; // ms; a cue is in it when from <= start < to

export type RangeShiftResult = ShiftResult & {
  range: (number | null)[]; // per original cue: index of the range that moved it
  overlaps: number[]; // 1-based moved cues that now overlap a cue outside their range and didn't before
};

export function shiftRanges(file: SubtitleFile, ranges: Range[]): RangeShiftResult | { error: string } {
  for (let a = 0; a < ranges.length; a++) {
    if (ranges[a].to <= ranges[a].from) return { error: `Range ${a + 1} ends before it starts.` };
    for (let b = a + 1; b < ranges.length; b++)
      if (ranges[a].from < ranges[b].to && ranges[b].from < ranges[a].to)
        return { error: `Range ${a + 1} and range ${b + 1} overlap. Change one so they don't.` };
  }
  const range = file.cues.map((c) => {
    const k = ranges.findIndex((r) => r.from <= c.start && c.start < r.to);
    return k < 0 ? null : k;
  });
  const r = shiftEach(file, (_, i) => (range[i] === null ? 0 : ranges[range[i]!].offset));

  // Compare moved times (by original index) against every cue outside the same range.
  // ponytail: O(n²) scan; fine for subtitle-sized files.
  const removed = new Set(r.removed);
  const after: (Cue | null)[] = [];
  let j = 0;
  file.cues.forEach((_, i) => after.push(removed.has(i + 1) ? null : r.file.cues[j++]));
  const hits = (a: Cue, b: Cue) => a.start < b.end && b.start < a.end;
  const overlaps = file.cues.flatMap((c, i) => {
    const moved = after[i];
    if (range[i] === null || !moved) return [];
    const bad = file.cues.some((d, k) => range[k] !== range[i] && after[k] && hits(moved, after[k]!) && !hits(c, d));
    return bad ? [i + 1] : [];
  });
  return { ...r, range, overlaps };
}
