import type { Cue, Format, SubtitleFile } from './types.ts';
import { formatTime, parseTime } from './time.ts';
import { convert } from './convert.ts';
import { parseAss, writeAss } from './ass.ts';
import { parseSami, writeSami } from './sami.ts';
import { parseMicroDvd, writeMicroDvd } from './microdvd.ts';
import { parseMpl2, writeMpl2 } from './mpl2.ts';
import { parseLrc, writeLrc } from './lrc.ts';

// What the SRT/WebVTT parser saw in the text but doesn't keep in the file; the validator reads it.
// Cue positions count every block with a --> line, including ones skipped for a bad timestamp.
export type RawInfo = {
  numbers: (string | null)[]; // per position: the line above the timing, if any
  unreadable: number[]; // 1-based positions whose timestamp couldn't be read
  dotTimes: boolean; // read as SRT, timed like WebVTT (00:01.000) and no cue numbers, so the WEBVTT line is probably missing
};

export type ParseResult = { file: SubtitleFile; problems: string[]; raw?: RawInfo };

type Block = { line: number; lines: string[] };

function splitBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let cur: Block | null = null;
  text.split('\n').forEach((raw, i) => {
    const l = raw.trimEnd();
    if (!l.trim()) cur = null;
    else if (cur) cur.lines.push(l);
    else blocks.push((cur = { line: i + 1, lines: [l] }));
  });
  return blocks;
}

function parseTiming(line: string): { start: number; end: number; settings: string } | null {
  const [left, right = ''] = line.split('-->');
  const [endStr = '', ...rest] = right.trim().split(/\s+/);
  const start = parseTime(left);
  const end = parseTime(endStr);
  return start == null || end == null ? null : { start, end, settings: rest.join(' ') };
}

export function detect(text: string): Format | null {
  if (/^WEBVTT(?:[ \t\n]|$)/.test(text)) return 'vtt';
  if (/^\[Script Info\]|^Dialogue\s*:/im.test(text)) return /^\[V4 Styles\]|^ScriptType:\s*v4\.00\s*$/im.test(text) ? 'ssa' : 'ass';
  if (/<sami[\s>]/i.test(text)) return 'sami';
  if (/^\s*\d*:?\d{1,2}:\d{1,2}[,.]\d{1,3}\s*-->/m.test(text)) return 'srt';
  if (/^\[\d+:\d{1,2}(?:[.:]\d{1,3})?\]/m.test(text)) return 'lrc';
  if (/^\{\d+\}\{\d+\}/m.test(text)) return 'microdvd';
  if (/^\[\d+\]\[\d+\]/m.test(text)) return 'mpl2';
  return null;
}

// fps is the MicroDVD frame rate to use when the file doesn't state one.
export function parse(input: string, { fps }: { fps?: number } = {}): ParseResult {
  const text = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const format = detect(text);
  if (!format) throw new Error("This does not look like a subtitle file. Plain text can't be read: it has no timing.");
  if (format === 'ass' || format === 'ssa') return parseAss(text, format);
  if (format === 'sami') return parseSami(text);
  if (format === 'microdvd') return parseMicroDvd(text, fps);
  if (format === 'mpl2') return parseMpl2(text);
  if (format === 'lrc') return parseLrc(text);

  const cues: Cue[] = [];
  const problems: string[] = [];
  const headerBlocks: string[] = [];
  const raw: RawInfo = { numbers: [], unreadable: [], dotTimes: false };
  const blocks = splitBlocks(text);

  for (const [bi, b] of blocks.entries()) {
    if (format === 'vtt' && (bi === 0 || /^(NOTE|STYLE|REGION)\b/.test(b.lines[0]))) {
      // STYLE/REGION must come before the first cue; later NOTE comments are dropped.
      if (!cues.length) headerBlocks.push(b.lines.join('\n'));
      continue;
    }
    const ti = b.lines.findIndex((l) => l.includes('-->'));
    if (ti === -1) {
      // A blank line inside a cue splits it; keep the text on the previous cue instead of losing it.
      const prev = cues.at(-1);
      if (prev) prev.text += '\n\n' + b.lines.join('\n');
      else problems.push(`Line ${b.line}: text with no timestamp before the first cue was skipped.`);
      continue;
    }
    raw.numbers.push(ti > 0 ? b.lines[ti - 1] : null);
    if (format === 'srt' && /\d\.\d+\s*-->/.test(b.lines[ti])) raw.dotTimes = true;
    const t = parseTiming(b.lines[ti]);
    if (!t) {
      raw.unreadable.push(raw.numbers.length);
      problems.push(`Line ${b.line + ti}: can't read the timestamp "${b.lines[ti]}", cue skipped.`);
      continue;
    }
    const cue: Cue = { start: t.start, end: t.end, text: b.lines.slice(ti + 1).join('\n') };
    if (format === 'vtt') {
      const extras: Record<string, string> = {};
      if (ti > 0) extras.id = b.lines.slice(0, ti).join(' ');
      if (t.settings) extras.settings = t.settings;
      if (Object.keys(extras).length) cue.extras = extras;
    }
    cues.push(cue);
  }

  // Numbered cues mean an SRT that happens to use dots, not a WebVTT file.
  if (raw.numbers.some((n) => n !== null)) raw.dotTimes = false;
  const header = headerBlocks.length ? headerBlocks.join('\n\n') : undefined;
  return { file: { format, header, cues }, problems, raw };
}

const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', nbsp: ' ', lrm: '‎', rlm: '‏' };

// Cue text with HTML and ASS tags removed, blank lines dropped, and lines optionally joined.
export function plainText(text: string, keepLineBreaks = true): string {
  const lines = text
    // A tag starts with a letter (or is a VTT timestamp), so "x < 5 and y > 3" stays as dialogue.
    .replace(/<\/?[a-z][^<>\n]*>|<[\d:.]+>|\{\\[^}]*\}/gi, '')
    .replace(/&(amp|lt|gt|nbsp|lrm|rlm);/g, (_, e) => entities[e])
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.join(keepLineBreaks ? '\n' : ' ');
}

// Writing to another format converts first, so tags are mapped and extras dropped (see convert for the loss report).
export function write(file: SubtitleFile, format: Format = file.format, { keepLineBreaks = true } = {}): string {
  if (format !== file.format) file = convert(file, format).file;
  if (format === 'ass' || format === 'ssa') return writeAss(file);
  if (format === 'sami') return writeSami(file);
  if (format === 'microdvd') return writeMicroDvd(file);
  if (format === 'mpl2') return writeMpl2(file);
  if (format === 'lrc') return writeLrc(file);
  if (format === 'txt') {
    const cues = file.cues.map((c) => plainText(c.text, keepLineBreaks)).filter(Boolean);
    return cues.join(keepLineBreaks ? '\n\n' : '\n') + '\n';
  }
  if (format === 'srt') {
    return file.cues
      .map((c, i) => `${i + 1}\n${formatTime(c.start, ',')} --> ${formatTime(c.end, ',')}\n${c.text}`)
      .join('\n\n') + '\n';
  }
  const header = file.format === 'vtt' && file.header ? file.header : 'WEBVTT';
  const cues = file.cues.map((c) => {
    const id = c.extras?.id ? c.extras.id + '\n' : '';
    const settings = c.extras?.settings ? ' ' + c.extras.settings : '';
    return `${id}${formatTime(c.start, '.')} --> ${formatTime(c.end, '.')}${settings}\n${c.text}`;
  });
  return [header, ...cues].join('\n\n') + '\n';
}
