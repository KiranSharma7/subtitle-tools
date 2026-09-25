import type { Cue, SubtitleFile } from './types.ts';
import type { ParseResult } from './formats.ts';

// {start frame}{end frame}text, | for line breaks. A first cue of {1}{1}25 gives the frame rate and is kept as the header.
export function parseMicroDvd(text: string, fps = 23.976): ParseResult {
  const cues: Cue[] = [];
  const problems: string[] = [];
  let header: string | undefined;

  text.split('\n').forEach((raw, i) => {
    const l = raw.trim();
    if (!l) return;
    const m = /^\{(\d+)\}\{(\d+)\}(.*)$/.exec(l);
    if (!m) return problems.push(`Line ${i + 1}: can't read "${l}", skipped.`);
    const [, a, b, t] = m;
    if (!cues.length && !header && +a <= 1 && +b <= 1 && /^\d+(\.\d+)?$/.test(t) && +t > 0) {
      header = l;
      fps = +t;
      return;
    }
    cues.push({ start: Math.round((+a * 1000) / fps), end: Math.round((+b * 1000) / fps), text: t.replace(/\|/g, '\n') });
  });

  return { file: { format: 'microdvd', header, fps, cues }, problems };
}

export function writeMicroDvd(file: SubtitleFile): string {
  const fps = file.fps ?? 23.976;
  const frame = (ms: number) => Math.round((ms * fps) / 1000);
  const cues = file.cues.map((c) => `{${frame(c.start)}}{${frame(c.end)}}${c.text.replace(/\n/g, '|')}`);
  return [...(file.header ? [file.header] : []), ...cues].join('\n') + '\n';
}

const wrap = (tags: string, s: string) =>
  [...tags].map((t) => `<${t}>`).join('') + s + [...tags].reverse().map((t) => `</${t}>`).join('');

// {y:i} styles its line and {Y:i} the whole cue (i, b, u become tags); other codes are dropped.
export function microDvdToCommon(c: Cue): { text: string; lost: string[] } {
  const lost = new Set<string>();
  let cue = '';
  const lines = c.text.split('\n').map((l) => {
    let line = '';
    const rest = l.replace(/\{([a-z]):([^}]*)\}/gi, (_, k: string, v: string) => {
      if (k.toLowerCase() !== 'y') lost.add(k.toLowerCase() === 'p' ? 'positioning' : 'formatting');
      else {
        const tags = [...'ibu'].filter((t) => v.toLowerCase().includes(t)).join('');
        if (/[^ibu,\s]/i.test(v)) lost.add('formatting');
        if (k === 'Y') cue += tags;
        else line += tags;
      }
      return '';
    });
    return wrap(line, rest);
  });
  return { text: wrap(cue, lines.join('\n')), lost: [...lost] };
}
