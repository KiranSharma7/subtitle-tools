// Accepts 1:02:03,4 / 01:02:03.456 / 02:03.456 (hours optional, 1-3 ms digits).
const TIME = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})[,.](\d{1,3})$/;

export function parseTime(s: string): number | null {
  const m = TIME.exec(s.trim());
  if (!m) return null;
  const [, h = '0', min, sec, ms] = m;
  return ((+h * 60 + +min) * 60 + +sec) * 1000 + +ms.padEnd(3, '0');
}

export function formatTime(ms: number, sep: ',' | '.'): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(ms % 1000, 3)}`;
}
