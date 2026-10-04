// Zip in and out for batches (ADR 0006). No DOM code, so it runs under node --test.
import { strToU8, unzipSync, zipSync } from 'fflate';

export type ZipEntry = { name: string; data: Uint8Array };

// Whether a file name matches an <input accept> list of extensions. An empty list takes anything.
export function accepts(name: string, accept: string): boolean {
  const exts = accept.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return !exts.length || exts.some((e) => name.toLowerCase().endsWith(e));
}

const junk = (path: string, base: string) => path.startsWith('__MACOSX/') || base.startsWith('.') || base === 'Thumbs.db';

// Files in the zip, folders flattened to bare names, in zip order. Throws when the bytes aren't a zip.
export function readZip(bytes: Uint8Array, accept = ''): ZipEntry[] {
  const files = unzipSync(bytes);
  return Object.entries(files).flatMap(([path, data]) => {
    const base = path.split('/').pop() ?? '';
    return !base || junk(path, base) || !accepts(base, accept) ? [] : [{ name: base, data }];
  });
}

// Zips UTF-8 text files. A name that's already taken gets " (2)", " (3)", ... before its extension.
export function makeZip(files: { name: string; text: string }[]): Uint8Array {
  const out: Record<string, Uint8Array> = {};
  for (const { name, text } of files) {
    const dot = name.lastIndexOf('.');
    const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
    let unique = name;
    for (let n = 2; unique in out; n++) unique = `${stem} (${n})${ext}`;
    out[unique] = strToU8(text);
  }
  return zipSync(out);
}
