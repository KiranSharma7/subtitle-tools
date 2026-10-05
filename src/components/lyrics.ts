import { parse } from '../engine/formats.ts';
import { toStamps, type Stamp } from '../engine/lrc.ts';

// After the lyrics text is edited: each new line takes the time of the matching old line, so adding,
// removing or moving lines keeps the sync done so far. With the same number of lines, an edited line
// (no match) takes the time at its position, unless that old line's time went to another line.
export function retext(lines: Stamp[], text: string): Stamp[] {
  const next = text.trimEnd() ? text.trimEnd().split('\n') : [];
  const used = new Set<number>();
  let from = 0;
  const matched = next.map((t) => {
    const k = lines.findIndex((l, i) => i >= from && l.text === t);
    if (k < 0) return -1;
    from = k + 1;
    used.add(k);
    return k;
  });
  return next.map((t, i) => {
    const k = matched[i] >= 0 ? matched[i] : next.length === lines.length && !used.has(i) ? i : -1;
    return { time: k < 0 ? null : lines[k].time, text: t };
  });
}

// Index of the line showing at ms: the latest start at or before it. -1 before the first line.
export function activeLine(lines: Stamp[], ms: number): number {
  let best = -1;
  lines.forEach((l, i) => {
    if (l.time != null && l.time <= ms && (best < 0 || l.time >= lines[best].time!)) best = i;
  });
  return best;
}

export type LrclibResult = { trackName: string; artistName: string; instrumental: boolean; plainLyrics: string | null; syncedLyrics: string | null };

// The first lrclib.net search result with synced lyrics, else the first with plain lyrics.
export function pickLyrics(results: LrclibResult[]): { title: string; artist: string; synced: boolean; lines: Stamp[] } | null {
  const hit = results.find((r) => r.syncedLyrics) ?? results.find((r) => r.plainLyrics);
  if (!hit) return null;
  const head = { title: hit.trackName, artist: hit.artistName };
  if (hit.syncedLyrics) return { ...head, synced: true, lines: toStamps(parse(hit.syncedLyrics).file) };
  return { ...head, synced: false, lines: hit.plainLyrics!.trimEnd().split('\n').map((t) => ({ time: null, text: t.trim() })) };
}

// Artist and title live in the editor's fields; every other tag of an opened file ([al:], [offset:]...) is kept as it was.
export function splitTags(header = ''): { artist: string; title: string; others: string[] } {
  const tags = { artist: '', title: '', others: [] as string[] };
  for (const l of header.split('\n').filter(Boolean)) {
    const m = /^\[(ar|ti):(.*)\]$/i.exec(l);
    if (!m) tags.others.push(l);
    else tags[m[1].toLowerCase() === 'ar' ? 'artist' : 'title'] = m[2].trim();
  }
  return tags;
}

export function lrcHeader(artist: string, title: string, others: string[]): string | undefined {
  const lines = [artist.trim() && `[ar:${artist.trim()}]`, title.trim() && `[ti:${title.trim()}]`, ...others].filter(Boolean);
  return lines.length ? lines.join('\n') : undefined;
}

export function lrcName(artist: string, title: string, audioName: string): string {
  const [a, t] = [artist.trim(), title.trim()];
  const name = a && t ? `${a} - ${t}` : t || audioName.replace(/\.[^.]*$/, '') || 'lyrics';
  return `${name.replace(/[\\/:*?"<>|]/g, '')}.lrc`;
}
