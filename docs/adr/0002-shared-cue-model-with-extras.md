# One shared cue model, with per-format extras

Every format is parsed into the same `SubtitleFile { format, header?, cues[] }`, where each cue is `{ start, end, text, extras? }` in milliseconds. Format-specific data (ASS styles and layers, WebVTT cue settings) rides along in `header` and `extras`, so writing back to the same format keeps it. Writing to a different format drops it and adds an entry to the loss report.

We rejected rewriting timestamps in the raw text: it keeps every byte, but it needs separate rewrite code per format, and the converters need the shared model anyway.

## Additions (phase 1 formats)

- `SubtitleFile.fps` holds the MicroDVD frame rate, because the writer needs it even when the user picked it and the file never stated it. When the file does state it, the `{1}{1}<fps>` line is also kept as the header, and that's how a page tells "from the file" apart from "picked".
- Converting only goes to SRT, WebVTT and plain text. ASS, SSA, SAMI, MicroDVD and MPL2 are written only from a file already in that format, which is all phase 1 needs. `write()` throws for anything else.
- ASS joins the conversion targets for the style tools' "Save as ASS": SRT and WebVTT cues get a default header with one `Default` style, `<i>`/`<b>`/`<u>` become override tags, and other tags and cue settings go in the loss report.
