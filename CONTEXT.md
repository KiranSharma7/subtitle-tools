# SubtitleMate

Browser-first website with small tools that fix, convert, and re-time existing subtitle files. Files are processed in the visitor's browser and never uploaded. The one exception is the opt-in **server OCR** (ADR 0004).

## Language

**Subtitle file**:
One parsed file: its **format**, an optional **header**, and an ordered list of **cues**.
_Avoid_: document, track (track means a stream inside a video)

**Cue**:
One piece of subtitle text with a start and end time in milliseconds.
_Avoid_: line, entry, event (ASS calls them "Dialogue events"; we still say cue)

**Format**:
The file type a subtitle file was read from or will be written to: SRT, WebVTT, ASS, SSA, SAMI, MicroDVD, MPL2, LRC, plain text. PGS (SUP) and VobSub (SUB/IDX) are **image subtitles**, not formats: they are read only through OCR.

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

**Base file** / **Merge file** (merger):
The two inputs to a merge. The output keeps the base file's format and header; the merge file's cues are added to it, converted through the common format if needed (with a loss report).

**Merge mode**:
*Nearest cue*: a merge cue whose start lies within the threshold (default 1000 ms) of a base cue joins that cue. Every matching merge cue joins, in time order; the start snaps to the base cue's start and the end is the later of the two. Every changed cue is listed in the preview. Unmatched merge cues keep their timing. *Simple*: cues are combined without changing timing. *Glue*: the merge file is shifted by the user-given length of the first video and appended (CD1 + CD2).

**Pair**:
One base file and one merge file, in a batch merge. Pairs are proposed by episode tag (`S01E03`, `1x03`, `E03`), falling back to filename order, and shown in an editable table before merging.

**Batch**:
More than one input file (or a zip) on one tool. Each file gets its own result and warnings; output downloads as a zip. A single file keeps the normal preview flow.

**Style** (color changer, position changer):
Color or on-screen position applied to cues. ASS/SSA: changed in the `[V4+ Styles]` header; inline tags only where a cue already overrides that property. SRT: `<font color>` and `{n#}`. WebVTT: a `STYLE ::cue` block and `line:`/`position:` cue settings.

**Word timing**:
Per-word timestamps inside an LRC line (enhanced LRC, `<mm:ss.xx>`). Kept when writing LRC, listed in the loss report when converting.

**Track**:
One subtitle stream inside a video (MKV, WebM, MP4). Has a codec, an optional language and name, and default/forced flags. A track is either text (SRT, ASS, WebVTT, mov_text) or an image subtitle.

**Image subtitle**:
Subtitles stored as bitmaps (PGS/SUP, VobSub SUB+IDX). Turning them into cues needs OCR.

**OCR correction**:
The review step after OCR: each cue's image next to its editable text, low-confidence words flagged, common OCR fixes (`l`->`I`, `|`->`I`) applied and switchable, and find/replace. Italics are not detected. An image in the top third of the screen becomes a top-positioned cue.

**Server OCR**:
The opt-in "process on our server" path for image subtitles only, at `api.subtitlemate.com`. The file is deleted as soon as the response is sent. Never used for video files.

## Relationships

- A **Subtitle file** has one **Format**, zero or one **Header**, and many **Cues**
- A **Cue** has zero or more **Extras**
- Converting to a different **Format** produces a **Loss report**
- A video has many **Tracks**; an image-subtitle track becomes a **Subtitle file** only through **OCR correction**
- A merge combines one **Base file** and one **Merge file**; a batch merge is many **Pairs**

## Flagged ambiguities

- Plain text has no timing, so "plain text → SRT" is not in phase 1. Plain text is an output format only.
- The SRT cleaner ships all 17 options. The guesswork ones (SDH descriptions, speaker labels, watermarks, merge identical text) are off by default, because they can delete real dialogue.
