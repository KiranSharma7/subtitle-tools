import type { Cue, SubtitleFile } from './types.ts';
import type { ParseResult } from './formats.ts';

// [start][end]text with times in deciseconds, | for line breaks, a leading / for an italic line.
export function parseMpl2(text: string): ParseResult {
  const cues: Cue[] = [];
  const problems: string[] = [];
  text.split('\n').forEach((raw, i) => {
    const l = raw.trim();
    if (!l) return;
    const m = /^\[(\d+)\]\[(\d+)\](.*)$/.exec(l);
    if (!m) return problems.push(`Line ${i + 1}: can't read "${l}", skipped.`);
    cues.push({ start: +m[1] * 100, end: +m[2] * 100, text: m[3].replace(/\|/g, '\n') });
  });
  return { file: { format: 'mpl2', cues }, problems };
}

export function writeMpl2(file: SubtitleFile): string {
  const ds = (ms: number) => Math.round(ms / 100);
  return file.cues.map((c) => `[${ds(c.start)}][${ds(c.end)}]${c.text.replace(/\n/g, '|')}`).join('\n') + '\n';
}

export const mpl2ToCommon = (c: Cue) => ({
  text: c.text.split('\n').map((l) => (l.startsWith('/') ? `<i>${l.slice(1)}</i>` : l)).join('\n'),
  lost: [],
});
