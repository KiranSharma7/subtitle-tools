# One shared cue model, with per-format extras

Every format is parsed into the same `SubtitleFile { format, header?, cues[] }`, where each cue is `{ start, end, text, extras? }` in milliseconds. Format-specific data (ASS styles and layers, WebVTT cue settings) rides along in `header` and `extras`, so writing back to the same format keeps it. Writing to a different format drops it and adds an entry to the loss report.

We rejected rewriting timestamps in the raw text: it keeps every byte, but it needs separate rewrite code per format, and the converters need the shared model anyway.
