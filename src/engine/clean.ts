import type { SubtitleFile } from './types.ts';
import { plainText } from './formats.ts';

export type CleanOptions = {
  htmlTags: boolean;
  keep: string[]; // tag names that survive htmlTags: 'i', 'b', 'font'
  assTags: boolean;
  parens: boolean;
  brackets: boolean;
  braces: boolean;
  asterisks: boolean;
  hashtags: boolean;
  musicNotes: boolean;
  lineBreaks: boolean;
  uppercase: boolean;
  duplicates: boolean;
  empty: boolean;
  // Guesswork: these can delete real dialogue, so they're off by default.
  sdh: boolean;
  speakers: boolean;
  watermarks: boolean;
  merge: boolean;
};

export const defaultCleanOptions: CleanOptions = {
  htmlTags: true, keep: ['i', 'b', 'font'], assTags: false, parens: false, brackets: false, braces: false, asterisks: false,
  hashtags: false, musicNotes: false, lineBreaks: false, uppercase: false, duplicates: true, empty: true,
  sdh: false, speakers: false, watermarks: false, merge: false,
};

export type CleanResult = {
  file: SubtitleFile;
  after: (string | null)[]; // per original cue: new text, or null when removed
  changed: number[]; // 1-based cue numbers whose text changed
  removed: number[]; // 1-based cue numbers that were dropped
};

// Squeeze the gaps a removal leaves behind: double spaces, blank lines, lone dialogue dashes.
const tidy = (t: string) =>
  t.split('\n').map((l) => l.replace(/[ \t]{2,}/g, ' ').trim()).filter((l) => l && l !== '-').join('\n');

const strip = (re: RegExp) => (t: string) => tidy(t.replace(re, ''));

const dropLines = (bad: (l: string) => boolean) => (t: string) => tidy(t.split('\n').filter((l) => !bad(l)).join('\n'));

// A line that is only an uppercase description, like "DOOR SLAMS". Shouting ends in ! or ?, so it stays.
const sdhLine = (l: string) => /^[\p{Lu}\s'-]+$/u.test(l.trim()) && /\p{Lu}{2,}\s+\p{Lu}{2,}/u.test(l);
const watermark = /\b(www\.|https?:\/\/|[\w-]+\.(com|org|net|tv)\b|(subtitles?|subs|synced?|ripped|corrected|translated|encoded)( and \w+)? by\b|opensubtitles|addic7ed|subscene|yify|podnapisi)/i;

const sentenceCase = (t: string) =>
  t.toLowerCase().replace(/(^|[.!?]\s+|\n-?\s*)(\p{L})/gu, (_, pre, c) => pre + c.toUpperCase()).replace(/\bi\b/g, 'I');

// Text steps run in this order; cue-removing steps run after them, with empty cues last.
export function clean(file: SubtitleFile, opts: Partial<CleanOptions>): CleanResult {
  const keep = new Set(opts.keep ?? []);
  const steps: ((t: string) => string)[] = [];
  if (opts.htmlTags) steps.push((t) => tidy(t.replace(/<\/?([a-z]+)[^<>\n]*>/gi, (tag, name) => (keep.has(name.toLowerCase()) ? tag : ''))));
  if (opts.assTags) steps.push(strip(/\{\\[^}]*\}/g));
  if (opts.parens) steps.push(strip(/\([^()]*\)/g));
  if (opts.brackets) steps.push(strip(/\[[^\[\]]*\]/g));
  if (opts.braces) steps.push(strip(/\{[^{}]*\}/g));
  if (opts.asterisks) steps.push(strip(/\*[^*\n]*\*/g));
  if (opts.hashtags) steps.push(strip(/#[^#\n]*#/g));
  if (opts.sdh) steps.push(strip(/\[[^\[\]]*\]|\([^()]*\)/g), dropLines(sdhLine));
  if (opts.speakers) steps.push((t) => tidy(t.replace(/^(-\s*)?\p{Lu}[\p{Lu}\d .'-]*:\s*/gmu, '$1')));
  if (opts.watermarks) steps.push(dropLines((l) => watermark.test(l)));
  // A line starting with a dialogue dash is a new speaker, so it keeps its break.
  if (opts.lineBreaks) steps.push((t) => t.replace(/\\N/g, '\n').replace(/\n(?!-)/g, ' '));
  if (opts.uppercase) steps.push((t) => (/\p{Ll}/u.test(t) || !/\p{Lu}.*\p{Lu}/su.test(t) ? t : sentenceCase(t)));

  const seen = new Set<string>();
  const after: (string | null)[] = file.cues.map((c) => {
    const text = steps.reduce((t, f) => f(t), c.text);
    if (opts.musicNotes && /[♪♫]/.test(text)) return null;
    if (opts.duplicates) {
      const key = `${c.start}|${c.end}|${text}`;
      if (seen.has(key)) return null;
      seen.add(key);
    }
    return text;
  });
  const ends = file.cues.map((c) => c.end);
  // Neighbours with the same text become one cue running from the first start to the last end.
  if (opts.merge)
    for (let i = after.length - 1, next = -1; i >= 0; i--) {
      if (after[i] === null) continue;
      if (next >= 0 && after[i] === after[next]) (ends[i] = ends[next]), (after[next] = null);
      next = i;
    }
  if (opts.empty) after.forEach((t, i) => t !== null && !plainText(t) && (after[i] = null));

  const nums = (f: (t: string | null, i: number) => boolean) => after.flatMap((t, i) => (f(t, i) ? [i + 1] : []));
  return {
    file: { ...file, cues: file.cues.flatMap((c, i) => (after[i] === null ? [] : [{ ...c, end: ends[i], text: after[i]! }])) },
    after,
    changed: nums((t, i) => t !== null && (t !== file.cues[i].text || ends[i] !== file.cues[i].end)),
    removed: nums((t) => t === null),
  };
}
