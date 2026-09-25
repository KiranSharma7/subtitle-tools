import type { Cue, Format, SubtitleFile } from './types.ts';
import { formatTime, parseTime } from './time.ts';

export type ParseResult = { file: SubtitleFile; problems: string[] };

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
  if (/^WEBVTT(?:[ \t]|$)/.test(text)) return 'vtt';
  if (/^\s*\d*:?\d{1,2}:\d{1,2}[,.]\d{1,3}\s*-->/m.test(text)) return 'srt';
  return null;
}

export function parse(input: string): ParseResult {
  const text = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const format = detect(text);
  if (!format) throw new Error('This does not look like an SRT or WebVTT file.');

  const cues: Cue[] = [];
  const problems: string[] = [];
  const headerBlocks: string[] = [];
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
    const t = parseTiming(b.lines[ti]);
    if (!t) {
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

  const header = headerBlocks.length ? headerBlocks.join('\n\n') : undefined;
  return { file: { format, header, cues }, problems };
}

export function write(file: SubtitleFile, format: Format = file.format): string {
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
