// Strict UTF-8 first; only load the detector when that fails.
export async function decode(bytes: Uint8Array): Promise<{ text: string; encoding: string }> {
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'UTF-8' };
  } catch {
    const { default: jschardet } = await import('jschardet');
    let sample = '';
    for (const b of bytes.subarray(0, 64 * 1024)) sample += String.fromCharCode(b);
    // Lower case to match the encoding picker's names; gbk is the superset browsers use for GB2312.
    let guess = (jschardet.detect(sample).encoding || 'windows-1252').toLowerCase();
    if (guess === 'gb2312') guess = 'gbk';
    // jschardet often mistakes short Windows-1251 text for Mac Cyrillic, which subtitle files never use.
    if (guess === 'x-mac-cyrillic') guess = 'windows-1251';
    return decodeAs(bytes, guess);
  }
}

export function decodeAs(bytes: Uint8Array, encoding: string): { text: string; encoding: string } {
  try {
    return { text: new TextDecoder(encoding).decode(bytes), encoding };
  } catch {
    return { text: new TextDecoder('windows-1252').decode(bytes), encoding: 'windows-1252' };
  }
}
