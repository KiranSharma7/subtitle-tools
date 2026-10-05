import type { Cue, SubtitleFile } from './types.ts';
import { assToCommon, defaultAssExtras } from './ass.ts';
import { convert, type Loss } from './convert.ts';
import { shift } from './shift.ts';
import { addTopStyle, colorCueText, cueClassColor, setPosition } from './style.ts';

// Merge modes and options, as described in CONTEXT.md.
export type MergeOptions = {
  mode: 'nearest' | 'simple' | 'glue';
  threshold?: number; // nearest: ms between starts (default 1000)
  offset?: number; // glue: length of the first video in ms
  top?: boolean; // merge cues go on top of the screen
  unbreakBase?: boolean; // line breaks become spaces
  unbreakMerge?: boolean;
  colorBase?: string; // #rrggbb
  colorMerge?: string;
};

export type MergeResult = {
  file: SubtitleFile;
  losses: Loss[]; // what the merge file lost on the way into the base format; cue numbers are the merge file's
  joined: number[]; // 1-based output cues changed by nearest-cue matching
  from: Side[]; // per output cue, which file it came from
};

type Side = 'base' | 'merge';
type Tagged = Cue & { from: Side; joined?: boolean };
type Numbered = Cue & { n: number }; // n: the merge file's cue number

const assLike = (f: SubtitleFile) => f.format === 'ass' || f.format === 'ssa';
const extrasKinds = new Set(['layer', 'style', 'name', 'margins', 'effect']);

// Adds what merge cue n lost to a loss list, one entry per kind, kinds in name order.
function addLoss(losses: Loss[], kind: string, n: number) {
  const l = losses.find((x) => x.kind === kind);
  if (!l) losses.push({ kind, cues: [n] }), losses.sort((a, b) => (a.kind === 'header' ? -1 : b.kind === 'header' ? 1 : a.kind.localeCompare(b.kind)));
  else if (!l.cues.includes(n)) l.cues.push(n), l.cues.sort((a, b) => a - b);
}

// The merge file's cues with text in the base format's syntax. Their ASS extras are set by the caller.
function adopt(base: SubtitleFile, mergeFile: SubtitleFile): { cues: Cue[]; losses: Loss[] } {
  if (mergeFile.format === base.format && !assLike(base)) return { cues: mergeFile.cues, losses: [] };
  if (!assLike(base) || !assLike(mergeFile)) {
    const r = convert(mergeFile, assLike(base) ? 'ass' : base.format);
    return { cues: r.file.cues, losses: r.losses };
  }
  // ASS into ASS: inline tags are already ASS and stay. The merge file's styles and per-cue fields don't come along.
  const losses: Loss[] = mergeFile.header ? [{ kind: 'header', cues: [] }] : [];
  mergeFile.cues.forEach((c, i) => {
    for (const k of assToCommon(c).lost) if (extrasKinds.has(k)) addLoss(losses, k, i + 1);
  });
  return { cues: mergeFile.cues, losses };
}

function firstStyle(header: string | undefined): string {
  const m = /^Style\s*:\s?([^,\n]*)/im.exec(header ?? '');
  return m ? m[1].trim() : 'Default';
}

const unbreak = (text: string, ass: boolean) => (ass ? text.replace(/\s*\\[Nn]\s*/g, ' ') : text.replace(/[ \t]*\n[ \t]*/g, ' '));

export function merge(base: SubtitleFile, mergeFile: SubtitleFile, options: MergeOptions): MergeResult {
  const { mode, threshold = 1000, offset = 0, top = false } = options;
  if (!['srt', 'vtt', 'ass', 'ssa'].includes(base.format)) throw new Error('The base file must be SRT, WebVTT, ASS or SSA.');
  const ass = assLike(base);
  const adopted = adopt(base, mode === 'glue' ? shift(mergeFile, offset).file : mergeFile);
  const losses = adopted.losses.map((l) => ({ ...l, cues: [...l.cues] }));
  let header = base.header;

  const prepare = <C extends Cue>(c: C, side: Side): C => {
    let text = c.text;
    if (side === 'base' ? options.unbreakBase : options.unbreakMerge) text = unbreak(text, ass);
    const color = side === 'base' ? options.colorBase : options.colorMerge;
    if (color) text = colorCueText(text, base.format, color, side);
    return { ...c, text };
  };
  if (base.format === 'vtt') {
    if (options.colorBase) header = cueClassColor(header, 'base', options.colorBase);
    if (options.colorMerge) header = cueClassColor(header, 'merge', options.colorMerge);
  }

  const baseCues: Tagged[] = base.cues.map((c) => ({ ...prepare(c, 'base'), from: 'base' }));
  let mergeCues: Numbered[] = adopted.cues.map((c, i) => prepare({ ...c, n: i + 1 }, 'merge'));

  // Merge cues take the base format's per-cue fields: ASS gets the base's first style, or a Top style.
  if (ass) {
    let style = firstStyle(header);
    let inlineTop = false;
    if (top) {
      const added = header ? addTopStyle(header, base.format === 'ssa') : null;
      if (added) ({ header, name: style } = added);
      else inlineTop = true;
    }
    const extras = base.format === 'ssa' ? { ...defaultAssExtras, marked: 'Marked=0', style } : { ...defaultAssExtras, style };
    mergeCues = mergeCues.map((c) => ({ ...c, text: inlineTop ? `{\\an8}${c.text}` : c.text, extras: { ...extras } }));
  } else if (top) {
    const placed = setPosition({ format: base.format, cues: mergeCues }, 8).file.cues;
    mergeCues = mergeCues.map((c, i) => ({ ...c, extras: placed[i].extras, text: placed[i].text }));
  }

  const sep = ass ? '\\N' : '\n';
  // In ASS a colored base part would color the merge text after it, so the merge part resets to the style.
  const reset = ass && options.colorBase && !options.colorMerge ? '{\\r}' : '';
  let cues: Tagged[];
  if (mode === 'nearest') {
    // Each merge cue joins the base cue whose start is nearest to its own, if that's within the threshold.
    // ponytail: O(n·m) scan; fine for subtitle-sized files.
    const groups = baseCues.map(() => [] as Numbered[]);
    const loose: Numbered[] = [];
    for (const m of [...mergeCues].sort((a, b) => a.start - b.start)) {
      let best = -1;
      baseCues.forEach((b, i) => {
        const d = Math.abs(m.start - b.start);
        if (d <= threshold && (best === -1 || d < Math.abs(m.start - baseCues[best].start))) best = i;
      });
      if (best === -1) loose.push(m);
      else groups[best].push(m);
    }
    cues = [...baseCues.flatMap((b, i): Tagged[] => {
      const group = groups[i];
      if (!group.length) return [b];
      const end = Math.max(b.end, ...group.map((m) => m.end));
      const texts = group.map((m) => m.text);
      // A merge cue folded into another cue loses its own cue settings and id (ASS ones were replaced already).
      if (!ass) for (const m of top ? group.slice(1) : group) for (const k of Object.keys(adopted.cues[m.n - 1].extras ?? {})) addLoss(losses, k, m.n);
      if (!top) return [{ ...b, end, text: [b.text, reset + texts.join(sep)].join(sep), joined: true }];
      // On top, the merge text stays its own cue (so it can sit elsewhere on screen), timed like the base cue.
      const strip = (t: string) => (ass ? t : t.replace(/^\{\\an8\}/, ''));
      const text = (ass ? texts : [texts[0], ...texts.slice(1).map(strip)]).join(sep);
      return [{ ...b, end, joined: true }, { ...group[0], start: b.start, end, text, from: 'merge', joined: true }];
    }), ...loose.map((m): Tagged => ({ ...m, from: 'merge' }))];
  } else {
    cues = [...baseCues, ...mergeCues.map((c): Tagged => ({ ...c, from: 'merge' }))];
  }
  // Glue appends; the others keep time order, base before merge at the same start.
  if (mode !== 'glue') cues = cues.map((c, i) => ({ c, i })).sort((a, b) => a.c.start - b.c.start || a.i - b.i).map(({ c }) => c);

  return {
    file: { ...base, header, cues: cues.map(({ from: _, joined: __, n: ___, ...c }: Tagged & { n?: number }) => c) },
    losses,
    joined: cues.flatMap((c, i) => (c.joined ? [i + 1] : [])),
    from: cues.map((c) => c.from),
  };
}

export type EpisodeTag = { season?: number; episode: number };

// S01E03, 1x03 or E03/Ep03 in a file name. Not 1920x1080.
export function episodeTag(name: string): EpisodeTag | null {
  const se = /(?<![a-z\d])s(\d{1,2})[ ._-]?e(\d{1,3})(?!\d)/i.exec(name) ?? /(?<![a-z\d.])(\d{1,2})x(\d{2,3})(?![a-z\d])/i.exec(name);
  if (se) return { season: +se[1], episode: +se[2] };
  const e = /(?<![a-z\d])ep?(\d{1,3})(?!\d)/i.exec(name);
  return e ? { episode: +e[1] } : null;
}

const sameEpisode = (a: EpisodeTag | null, b: EpisodeTag | null) =>
  !!a && !!b && a.episode === b.episode && (a.season === undefined || b.season === undefined || a.season === b.season);

const byName = (names: string[]) => (a: number, b: number) => names[a].localeCompare(names[b], undefined, { numeric: true });

// For each base file, the merge file it pairs with (an index into merges), or null.
// One merge file goes into every base file. Otherwise pairs match by episode tag, then the rest by filename order,
// skipping a pair whose two tags name different episodes.
export function pairFiles(bases: string[], merges: string[]): (number | null)[] {
  if (merges.length === 1) return bases.map(() => 0);
  const pairs: (number | null)[] = bases.map(() => null);
  const used = new Set<number>();
  bases.forEach((b, i) => {
    const tag = episodeTag(b);
    const j = merges.findIndex((m, k) => !used.has(k) && sameEpisode(tag, episodeTag(m)));
    if (j !== -1) (pairs[i] = j), used.add(j);
  });
  const restBases = bases.map((_, i) => i).filter((i) => pairs[i] === null).sort(byName(bases));
  const restMerges = merges.map((_, k) => k).filter((k) => !used.has(k)).sort(byName(merges));
  for (const i of restBases) {
    const tag = episodeTag(bases[i]);
    const at = restMerges.findIndex((k) => !tag || !episodeTag(merges[k]));
    if (at !== -1) pairs[i] = restMerges.splice(at, 1)[0];
  }
  return pairs;
}
