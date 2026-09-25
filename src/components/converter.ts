import { write } from '../engine/formats.ts';
import { convert, type Loss } from '../engine/convert.ts';
import { formatTime } from '../engine/time.ts';
import type { Format } from '../engine/types.ts';
import { mountTool } from './tool-shell.ts';

const lost: Record<string, string> = {
  header: 'The file header (title, styles and other settings)',
  id: 'Cue ids',
  settings: 'Cue settings (position and alignment)',
  style: 'ASS styles',
  layer: 'ASS layers',
  name: 'Speaker names',
  margins: 'Margins',
  effect: 'ASS effects',
  positioning: 'Position and alignment tags',
  karaoke: 'Karaoke timing',
  formatting: 'Formatting tags (colours, fonts, fades)',
};

export const lossWarnings = (losses: Loss[]) =>
  losses.map((l) => `${lost[l.kind] ?? l.kind} ${l.cues.length ? `dropped: cue ${l.cues.join(', ')}.` : 'dropped.'}`);

// Shared script for the Convert to SRT / Convert to WebVTT pages.
export function mountConverter(to: Format) {
  mountTool({
    view({ file }) {
      const r = convert(file, to);
      const warnings = lossWarnings(r.losses);
      const hit = new Set(r.losses.flatMap((l) => l.cues));
      const t = (ms: number) => formatTime(ms, to === 'srt' ? ',' : '.');
      const rows = r.file.cues.map((c, i) => ({ cells: [String(i + 1), t(c.start), t(c.end), c.text], flag: hit.has(i + 1) }));
      return { warnings, rows };
    },
    output: ({ file }) => write(convert(file, to).file),
    filename: (name) => name.replace(/\.[^.]*$/, '') + '.' + to,
  });
}
