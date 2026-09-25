import type { SubtitleFile } from './types.ts';

export type ShiftResult = {
  file: SubtitleFile;
  clamped: number[]; // 1-based cue numbers whose start was moved up to 0
  removed: number[]; // 1-based cue numbers that ended before 0 and were dropped
};

export function shift(file: SubtitleFile, offsetMs: number): ShiftResult {
  const clamped: number[] = [];
  const removed: number[] = [];
  const cues = file.cues.flatMap((c, i) => {
    const start = c.start + offsetMs;
    const end = c.end + offsetMs;
    if (end <= 0) return removed.push(i + 1), [];
    if (start < 0) clamped.push(i + 1);
    return [{ ...c, start: Math.max(0, start), end }];
  });
  return { file: { ...file, cues }, clamped, removed };
}
