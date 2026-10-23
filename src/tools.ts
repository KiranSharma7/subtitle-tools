export const tools = [
  {
    name: 'Subtitle shifter',
    href: '/subtitle-shifter',
    category: 'Syncing',
    blurb: 'Move every cue earlier or later to fix a constant delay.',
  },
  {
    name: 'Partial subtitle shifter',
    href: '/partial-subtitle-shifter',
    category: 'Syncing',
    blurb: 'Fix one section after a cut, scene change, or ad break.',
  },
  {
    name: 'SRT cleaner',
    href: '/srt-cleaner',
    category: 'Fixing and cleaning',
    blurb: 'Remove tags, SDH notes, labels, duplicates, and empty cues.',
  },
  {
    name: 'Subtitle validator',
    href: '/subtitle-validator',
    category: 'Fixing and cleaning',
    blurb: 'Check timestamps, overlaps, numbering, and empty cues.',
  },
  {
    name: 'Convert to SRT',
    href: '/convert-to-srt',
    category: 'Converters',
    blurb: 'Convert VTT, ASS, SSA, SAMI, SUB, MPL2, or LRC to SRT.',
  },
  {
    name: 'SRT to VTT',
    href: '/srt-to-vtt',
    category: 'Converters',
    blurb: 'Convert SRT and other subtitles to WebVTT for HTML5 video.',
  },
  {
    name: 'SRT to TXT',
    href: '/srt-to-txt',
    category: 'Converters',
    blurb: 'Remove timings and export the dialogue as a TXT file.',
  },
  {
    name: 'Convert to PDF',
    href: '/convert-subtitles-to-pdf',
    category: 'Converters',
    blurb: 'Make a printable PDF transcript from any subtitle file.',
  },
  {
    name: 'SRT to Word',
    href: '/srt-to-word',
    category: 'Converters',
    blurb: 'Make an editable Word document from any subtitle file.',
  },
  {
    name: 'UTF-8 converter',
    href: '/utf-8-converter',
    category: 'Fixing and cleaning',
    blurb: 'Read old encodings and save subtitle text as UTF-8.',
  },
  {
    name: 'SRT editor',
    href: '/srt-editor',
    category: 'Create and edit',
    blurb: 'Make an SRT from text, time it to your video, fix any line.',
  },
  {
    name: 'Subtitle merger',
    href: '/merge-subtitles',
    category: 'Merge and style',
    blurb: 'Merge two languages into one file, or join CD1 and CD2.',
  },
  {
    name: 'Subtitle position changer',
    href: '/change-subtitle-position',
    category: 'Merge and style',
    blurb: 'Move subtitles to the top, middle, or a corner of the screen.',
  },
  {
    name: 'Subtitle color changer',
    href: '/change-subtitle-color',
    category: 'Merge and style',
    blurb: 'Change the text color of SRT, WebVTT, ASS, or SSA subtitles.',
  },
  {
    name: 'LRC maker',
    href: '/lrc-maker',
    category: 'Lyrics',
    blurb: 'Sync lyrics to a song line by line and save an LRC file.',
  },
];

// One page per popular format pair (people search "vtt to srt", not "convert to SRT"). Same engine as the
// converters above; linked from the home page and the SRT converter rather than the menu.
export const conversions = [
  { name: 'VTT to SRT', href: '/vtt-to-srt', blurb: 'WebVTT captions to SRT.' },
  { name: 'ASS to SRT', href: '/ass-to-srt', blurb: 'ASS and SSA to plain SRT.' },
  { name: 'SRT to ASS', href: '/srt-to-ass', blurb: 'SRT to a styled ASS file.' },
  { name: 'SMI to SRT', href: '/smi-to-srt', blurb: 'SAMI (.smi) to SRT.' },
  { name: 'SUB to SRT', href: '/sub-to-srt', blurb: 'MicroDVD (.sub) to SRT.' },
];
