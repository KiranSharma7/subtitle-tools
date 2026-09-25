// txt can be written but not read: plain text has no timing.
export type Format = 'srt' | 'vtt' | 'ass' | 'ssa' | 'sami' | 'microdvd' | 'mpl2' | 'txt';

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
