import type { Cue, SubtitleFile } from './types.ts';
import type { ParseResult } from './formats.ts';

const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s: string) =>
  s.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
    e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : entities[e.toLowerCase()] ?? m,
  );

// Each SYNC's paragraph in the first language starts a cue and ends the one before; a blank (&nbsp;) one only ends it.
// Cue text is stored the way SRT holds it: entities decoded, <br> as a line break, other tags kept.
export function parseSami(text: string): ParseResult {
  const body = text.search(/<sync[\s>]/i);
  const header = (body === -1 ? text : text.slice(0, body)).trimEnd();
  const cues: Cue[] = [];
  const problems: string[] = [];
  const skipped = new Set<string>();
  let lang: string | undefined;
  let open: Cue | undefined;

  for (const sync of body === -1 ? [] : text.slice(body).split(/(?=<sync[\s>])/i)) {
    const start = /^<sync[^>]*\bstart\s*=\s*["']?(\d+)/i.exec(sync)?.[1];
    if (start == null) {
      problems.push(`Can't read the start time in "${sync.split('\n')[0]}", skipped.`);
      continue;
    }
    const ps = sync.split(/(?=<p[\s>])/i).slice(1);
    for (const p of ps.length ? ps : [sync.replace(/^<sync[^>]*>/i, '')]) {
      const cls = /^<p[^>]*\bclass\s*=\s*["']?([\w-]+)/i.exec(p)?.[1] ?? '';
      lang ??= cls;
      if (cls !== lang) {
        skipped.add(cls);
        continue;
      }
      if (open) open.end = +start;
      const words = p
        .replace(/^<p[^>]*>|<\/(p|sync|body|sami)>/gi, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*<br\s*\/?>\s*/gi, '\n');
      const t = decode(words).split('\n').map((l) => l.trim()).join('\n').trim();
      // A cue with no closing SYNC gets 2 seconds on screen.
      open = t ? { start: +start, end: +start + 2000, text: t, extras: { class: cls } } : undefined;
      if (open) cues.push(open);
    }
  }

  if (skipped.size) problems.push(`This file has more than one language. Only ${lang} was read; skipped: ${[...skipped].join(', ')}.`);
  return { file: { format: 'sami', header, cues }, problems };
}

// A blank SYNC ends each cue, unless the next cue starts right when it ends.
export function writeSami(file: SubtitleFile): string {
  const html = (s: string) => s.replace(/&/g, '&amp;').replace(/<(?![a-z/])/gi, '&lt;').replace(/\n/g, '<br>');
  const syncs = file.cues.flatMap((c, i) => {
    const p = `<P Class=${c.extras?.class || 'ENCC'}>`;
    const out = [`<SYNC Start=${c.start}>${p}${html(c.text)}`];
    if (file.cues[i + 1]?.start !== c.end) out.push(`<SYNC Start=${c.end}>${p}&nbsp;`);
    return out;
  });
  return [file.header || '<SAMI>\n<BODY>', ...syncs, '</BODY>\n</SAMI>'].join('\n') + '\n';
}
