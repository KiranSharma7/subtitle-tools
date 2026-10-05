// Artist and title for the timed lyrics editor's "Find lyrics online": ID3v2 tags (MP3) first,
// then an "Artist - Title" file name. Other tag formats (FLAC, MP4) fall back to the file name.
export type SongInfo = { artist: string; title: string };

function frameText(frame: Uint8Array): string {
  const [enc] = frame;
  const data = frame.subarray(1);
  const label = enc === 0 ? 'latin1' : enc === 1 ? 'utf-16' : enc === 2 ? 'utf-16be' : 'utf-8';
  return new TextDecoder(label).decode(data).replace(/\0[\s\S]*$/, '').trim();
}

function id3(bytes: Uint8Array): Partial<SongInfo> {
  if (bytes.length < 10 || bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return {};
  const version = bytes[3];
  const syncsafe = (i: number) => (bytes[i] << 21) | (bytes[i + 1] << 14) | (bytes[i + 2] << 7) | bytes[i + 3];
  const end = Math.min(bytes.length, 10 + syncsafe(6));
  let i = 10;
  // Skip the extended header: v2.4 counts its own size, v2.3 doesn't.
  if (bytes[5] & 0x40) i += version === 4 ? syncsafe(10) : 4 + ((bytes[10] << 24) | (bytes[11] << 16) | (bytes[12] << 8) | bytes[13]);
  const found: Record<string, string> = {};
  const idLen = version === 2 ? 3 : 4;
  const headLen = version === 2 ? 6 : 10;
  while (i + headLen <= end) {
    const id = String.fromCharCode(...bytes.subarray(i, i + idLen));
    if (!/^[A-Z0-9]+$/.test(id)) break; // padding
    const size = version === 2
      ? (bytes[i + 3] << 16) | (bytes[i + 4] << 8) | bytes[i + 5]
      : version === 4 ? syncsafe(i + 4) : ((bytes[i + 4] << 24) | (bytes[i + 5] << 16) | (bytes[i + 6] << 8) | bytes[i + 7]) >>> 0;
    const frame = bytes.subarray(i + headLen, Math.min(end, i + headLen + size));
    if (['TIT2', 'TPE1', 'TT2', 'TP1'].includes(id) && frame.length) found[id] = frameText(frame);
    i += headLen + size;
  }
  return { title: found.TIT2 ?? found.TT2, artist: found.TPE1 ?? found.TP1 };
}

// bytes only needs the start of the file: ID3v2 sits at the front.
export function songInfo(bytes: Uint8Array, filename: string): SongInfo {
  const tags = id3(bytes);
  const base = filename.replace(/\.[^.]*$/, '').replace(/^\d+[\s.\-_]+/, '').trim();
  const [nameArtist, nameTitle] = base.includes(' - ') ? [base.slice(0, base.indexOf(' - ')), base.slice(base.indexOf(' - ') + 3)] : ['', base];
  return { artist: tags.artist || nameArtist.trim(), title: tags.title || nameTitle.trim() };
}
