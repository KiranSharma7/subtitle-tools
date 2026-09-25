import type { SubtitleFile } from './types.ts';
import { plainText, type ParseResult } from './formats.ts';

export type Issue = {
  cue: number | null; // 1-based position in the file as written; null for file-level issues
  kind: 'header' | 'numbering' | 'order' | 'zero-length' | 'end-before-start' | 'timestamp' | 'empty' | 'overlap';
  message: string;
};

export function validate({ file, raw }: ParseResult): Issue[] {
  const issues: Issue[] = [];
  const add = (cue: number | null, kind: Issue['kind'], message: string) => issues.push({ cue, kind, message });

  if (raw?.dotTimes) add(null, 'header', 'The WEBVTT line at the top is missing.');
  // Parsed cue i sits at position pos[i]; unreadable blocks take up positions but produce no cue.
  const total = raw ? raw.numbers.length : file.cues.length;
  const pos = Array.from({ length: total }, (_, p) => p + 1).filter((p) => !raw?.unreadable.includes(p));

  let c = 0;
  for (let p = 1; p <= total; p++) {
    if (file.format === 'srt' && raw && !raw.dotTimes) {
      const n = raw.numbers[p - 1];
      if (n === null) add(p, 'numbering', `Cue ${p} has no number.`);
      else if (n !== String(p)) add(p, 'numbering', `Cue ${p} is numbered ${n}.`);
    }
    if (pos[c] !== p) {
      add(p, 'timestamp', `Cue ${p} has a timestamp that can't be read. It will be dropped.`);
      continue;
    }
    const cue = file.cues[c];
    const prev = file.cues[c - 1];
    if (prev && cue.start < prev.start) add(p, 'order', `Cue ${p} starts before cue ${pos[c - 1]}.`);
    else if (prev && cue.start < prev.end) add(p, 'overlap', `Cue ${p} overlaps cue ${pos[c - 1]}.`);
    if (cue.end === cue.start) add(p, 'zero-length', `Cue ${p} starts and ends at the same time.`);
    if (cue.end < cue.start) add(p, 'end-before-start', `Cue ${p} ends before it starts.`);
    if (!plainText(cue.text)) add(p, 'empty', `Cue ${p} has no text.`);
    c++;
  }
  return issues;
}

// Safe fixes only: renumber (the writer numbers SRT itself), sort, remove empty cues, add the WEBVTT line.
// Unreadable cues were already dropped by the parser. Overlaps and bad times are left alone.
export function fixSafe({ file, raw }: ParseResult): SubtitleFile {
  const cues = file.cues.filter((c) => plainText(c.text)).sort((a, b) => a.start - b.start);
  return { ...file, format: raw?.dotTimes ? 'vtt' : file.format, cues };
}
