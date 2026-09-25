# Subtitle Tools

Browser-first website with small tools that fix, convert, and re-time existing subtitle files. Files are processed in the visitor's browser and never uploaded.

## Language

**Subtitle file**:
One parsed file: its **format**, an optional **header**, and an ordered list of **cues**.
_Avoid_: document, track (track means a stream inside a video)

**Cue**:
One piece of subtitle text with a start and end time in milliseconds.
_Avoid_: line, entry, event (ASS calls them "Dialogue events"; we still say cue)

**Format**:
The file type a subtitle file was read from or will be written to: SRT, WebVTT, ASS, SSA, SAMI, MicroDVD, MPL2, plain text.

**Header**:
Format-level data that sits outside the cues, kept as raw text: ASS `[Script Info]` and `[V4+ Styles]`, WebVTT `STYLE`/`REGION` blocks.

**Extras**:
Format-specific data attached to one cue (ASS style, layer, margins; WebVTT cue settings). Kept when writing back to the same format, dropped when converting.

**Loss report**:
The list of things dropped when converting between formats (styles, positions, karaoke effects). Always shown to the user; data is never dropped silently.

**Engine**:
The shared TypeScript library that parses, edits, and writes subtitle files. Every tool goes through it.

**Tool**:
One page on the site that does one job (Subtitle shifter, SRT cleaner, ...).

**Shift**:
Moving cues earlier (negative offset) or later (positive offset) by a fixed amount.

**Clamp**:
What a shift does to a cue that would start before 0:00: start becomes 0. If the end also falls below 0, the cue is removed. Every clamped or removed cue is listed in the preview.

**Range** (partial shifter):
A From/To window with its own offset. A cue belongs to the range its **start** falls in and moves as a whole; cues are never split. Ranges may not overlap.

**Frame rate**:
Needed to read MicroDVD, which stores frame numbers. Taken from the file's first cue (`{1}{1}23.976`) when present, otherwise chosen by the user (default 23.976).

**Encoding detection**:
How every tool reads a file: strict UTF-8 first; if that fails, guess the encoding and show it with a way to change it.

**Validation issue**:
A problem the validator reports against a cue number. **Safe fixes** (renumber, sort, remove empty cues, add WEBVTT header) run on one click. Overlaps are reported but never fixed automatically.

## Relationships

- A **Subtitle file** has one **Format**, zero or one **Header**, and many **Cues**
- A **Cue** has zero or more **Extras**
- Converting to a different **Format** produces a **Loss report**

## Flagged ambiguities

- Plain text has no timing, so "plain text → SRT" is not in phase 1. Plain text is an output format only.
- The SRT cleaner ships all 17 options. The guesswork ones (SDH descriptions, speaker labels, watermarks, merge identical text) are off by default, because they can delete real dialogue.
