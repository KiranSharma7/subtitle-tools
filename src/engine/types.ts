export type Format = 'srt' | 'vtt';

export type Cue = {
  start: number; // ms
  end: number; // ms
  text: string; // lines joined with \n, inline tags kept
  extras?: Record<string, string>;
};

export type SubtitleFile = {
  format: Format;
  header?: string;
  cues: Cue[];
};
