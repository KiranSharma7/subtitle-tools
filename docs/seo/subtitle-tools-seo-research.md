# Subtitle Tools SEO research, competitor analysis, and keyword map

**Prepared:** 2026-09-28  
**Market:** Worldwide, English-first planning  
**Primary competitor supplied:** [subtitletools.com](https://subtitletools.com/)  
**Target site status:** Not live yet. The repository still uses `https://example.com`.

For the reusable keyword inventory, live DataForSEO run history, request payloads, and future enrichment fields, see [DATAFORSEO-KEYWORD-RESEARCH.md](./DATAFORSEO-KEYWORD-RESEARCH.md) and the machine-readable [DATAFORSEO-KEYWORDS.csv](./DATAFORSEO-KEYWORDS.csv).

## Executive read

The supplied competitor is a real direct competitor for subtitle-file utilities. Its strongest search strategy is a set of narrow, useful tool pages backed by format explanations. It covers SRT/VTT conversion, image-subtitle OCR, syncing, cleaning, encoding, merging, extraction, styling, lyrics, pinyin, and an API. Its homepage says the tools were used 289,009 times in the last 30 days, with 615,226 files uploaded and 516 GB processed. Those figures are self-reported usage counters, not independent organic-traffic estimates.

The best opening for the new site is the overlap between **highly specific problem searches** and the product's browser-first promise: SRT/VTT conversion, fixed-offset sync, partial sync, SRT cleaning, validation, encoding repair, and format-loss explanations. The repository already has pages for those first seven themes. The next build should make those pages unusually clear and trustworthy before expanding into OCR or video processing.

OpenSEO was used for project context and attempted data calls. The project context is now saved with the business description, worldwide goal, positioning, and writing rules. The keyword research call for `subtitle converter` (150 results, United States default, clickstream refinement off) and one `subtitletools.com` domain overview both returned OpenSEO's generic server error. Search Console is not connected, and the saved-keyword set is empty. No volume, KD, CPC, traffic, rank, or backlink number is invented below. Every unavailable metric is marked `unknown`.

## What is already in the repository

| Existing route | Intended search job | Recommendation |
|---|---|---|
| `/` | subtitle tools, subtitle converter, subtitle fixer | Keep as category hub; link every tool by problem and format. |
| `/convert-to-srt` | convert subtitles to SRT | Make the supported input formats and loss report visible above the fold. |
| `/convert-to-webvtt` | convert SRT to VTT/WebVTT | Add an explicit SRT → VTT example and HTML5 video use case. |
| `/convert-to-plain-text` | subtitle/SRT to text or transcript | Add `SRT to TXT`, transcript, print, and language-learning wording. |
| `/subtitle-shifter` | fix out-of-sync subtitles, shift SRT timing | Add “too early/too late” examples and fixed-offset versus drift guidance. |
| `/partial-subtitle-shifter` | fix sections with different offsets | Explain when partial shifting works and when frame-rate retiming is needed. |
| `/srt-cleaner` | remove tags, SDH, labels, music cues, junk | Add before/after examples and safe-default explanation. |
| `/utf-8-converter` | fix garbled subtitles, convert encoding | Add mojibake, Windows-1251, Shift-JIS, and GBK examples. |
| `/subtitle-validator` | validate/fix SRT and WebVTT | This is a useful gap against the supplied competitor. Add error examples and safe one-click fixes. |

The route names in the repository differ from the competitor's route names. That is fine. Optimize for the query and task, then use stable, descriptive slugs.

## Competitor footprint from public pages

The public sample contained 18 pages: the homepage, 16 tools, and API documentation. All 18 returned a canonical link. Seventeen exposed a meta description in the fetched HTML. All 18 had an H1 and at least one H2. No `robots` meta tag was present in the fetched pages. This is on-page evidence only; it does not prove indexation, rankings, traffic, or backlinks.

### Page inventory and content pattern

| Theme | Competitor URL | Page promise / visible angle | What to beat |
|---|---|---|---|
| Hub | `/` | Online tools for syncing, fixing, and converting subtitles | A clearer problem-first hub with format filters, privacy, and validation links. |
| SRT conversion | `/convert-to-srt-online` | ASS, SSA, WebVTT, SMI, MicroDVD, MPL2, batch conversion | Show a real preview, an explicit loss report, encoding detection, and exact output rules. |
| VTT conversion | `/convert-to-vtt-online` | Text subtitle formats to WebVTT | Explain commas versus periods in timestamps and include an HTML `<track>` example. |
| PGS/SUP OCR | `/convert-sup-to-srt-online` | Image subtitles to editable SRT via OCR | If not shipping OCR, publish an honest guide and wait. Do not make a thin placeholder tool. |
| VobSub OCR | `/convert-sub-idx-to-srt-online` | `.sub` + `.idx` image subtitles to SRT | Add a clear “both files required” diagnostic and OCR quality review. |
| Plain text | `/convert-subtitles-to-plain-text-online` | Extract dialogue to TXT, optional timings and blank lines | Position around transcript, print, and language study use cases. |
| PDF | `/convert-subtitles-to-pdf` | Subtitle/text to one or many PDFs | A later opportunity; it is outside the current MVP. |
| Whole-file sync | `/subtitle-sync-shifter` | Shift all cues by milliseconds | Add a preview, clamp/report negative times, and explain fixed delay versus drift. |
| Partial sync | `/partial-subtitle-sync-shifter` | Different offsets for different time windows | Provide a stronger range editor and validation for overlaps/gaps. |
| SRT cleaning | `/srt-cleaner` | Remove HTML, SDH, labels, music notes, watermarks, duplicates, case issues | Match the breadth, then win on safe defaults, preview, and reversible choices. |
| Encoding | `/convert-text-files-to-utf8-online` | Repair old encodings and mojibake | Make the detected encoding visible and support more explicit language examples. |
| Merger | `/merge-subtitles-online` | Bilingual merge, nearest-cue merge, CD1/CD2 glue, batches | A future page; explain cue matching and format limitations precisely. |
| Video extraction | `/extract-subtitles-from-video` | List and download embedded tracks from MKV/MP4/AVI and more | A future page; the browser-local story and ffmpeg explanation are strong. |
| Timed lyrics | `/timed-lyrics-editor` | Create/edit/sync LRC lyrics | Separate audience and intent from subtitle-file SEO. |
| Color | `/change-subtitle-color-online` | Color subtitle text where the format supports it | Explain that SRT cannot reliably store styling; target ASS/WebVTT intent. |
| Position | `/change-subtitle-position` | Move text on screen | Explain format/player support and preserve cue settings. |
| Pinyin | `/make-chinese-pinyin-subtitles` | Chinese subtitles to pinyin | A language-specific expansion, not a launch priority. |
| API | `/docs/api` | Developer API introduction, credits, auth, JSON | Create API pages only after the product API exists. |

### What the competitor does well

1. **It owns the exact task vocabulary.** Page titles and H1s name the output format or problem: “Convert Subtitles to Srt”, “Resync Subtitles”, “Srt Cleaner”, and “Convert to UTF-8”.
2. **It answers format questions on the same URL.** The SRT page discusses ASS/SSA, VTT, SMI, MicroDVD, MPL2, and batch behavior instead of relying on a generic homepage.
3. **It supports long-tail variants naturally.** The SRT page mentions `ass to srt`, `ssa to srt`, `webvtt to srt`, `smi to srt`, MicroDVD frame rates, and MPL2. The UTF-8 page speaks to gibberish, boxes, mojibake, and VLC.
4. **It links tools by the next job.** The extraction page links to the cleaner, SUP-to-SRT, SUB/IDX-to-SRT, and merger pages. This is good internal-link architecture.
5. **It has product depth beyond the current repository.** OCR, video extraction, merger modes, PDF, lyrics, styling, pinyin, premium batches, and an API create many potential entry points.

### Where it is vulnerable

1. **The public pages are mostly one-tool pages with short copy.** A better preview, input/output example, troubleshooting section, and structured FAQ can make the new pages more useful without copying text.
2. **Some titles use inconsistent “Srt”/“Vtt” casing.** Use standard `SRT` and `WebVTT` consistently in title tags, H1s, and headings.
3. **The competitor separates fixed delay from partial corrections but does not appear to offer a validator.** A validator that shows exact cue errors and safe fixes is a clean adjacent entry point.
4. **The sync page is explicit about fixed offsets but leaves a frame-rate/drift education opportunity.** Build a dedicated guide or section for “subtitles get further out of sync over time”.
5. **A tool upload is not enough for every query.** The new site can win long-tail searches with examples, format constraints, downloadable sample files, and explanations of what was preserved or removed.
6. **The competitor's usage numbers are not a ranking advantage by themselves.** Treat them as proof of product activity, not as a reason to copy its claims.

## Keyword clusters and page map

Metrics are intentionally `unknown` because OpenSEO returned a server error and no first-party Search Console data is connected. Priority means business fit and likely winnability from the product, not estimated volume.

| Cluster | Primary keyword | Intent | Target page | Priority |
|---|---|---|---|---|
| SRT conversion | `subtitle converter` / `convert subtitles to srt` | Tool | `/convert-to-srt` | P0 |
| Format to SRT | `ass to srt`, `vtt to srt`, `ssa to srt`, `smi to srt`, `sub to srt`, `mpl2 to srt` | Tool + format | `/convert-to-srt` plus format sections | P0 |
| SRT to WebVTT | `srt to vtt`, `srt to webvtt`, `convert srt for html5 video` | Tool | `/convert-to-webvtt` | P0 |
| Subtitle to text | `srt to txt`, `subtitle to text`, `extract transcript from srt` | Tool / study | `/convert-to-plain-text` | P0 |
| Fixed subtitle sync | `subtitle shifter`, `sync subtitles`, `fix out of sync subtitles`, `adjust subtitle delay`, `shift srt timing` | Tool | `/subtitle-shifter` | P0 |
| Partial sync and drift | `partial subtitle shifter`, `sync part of subtitle`, `subtitle timing drift`, `subtitles get out of sync over time` | Tool + guide | `/partial-subtitle-shifter` and a drift guide | P0 |
| SRT cleaning | `srt cleaner`, `remove html tags from srt`, `remove sdh subtitles`, `remove speaker labels srt`, `remove music notes subtitles` | Tool | `/srt-cleaner` | P0 |
| Subtitle validation | `srt validator`, `subtitle checker`, `validate srt file`, `fix invalid srt`, `webvtt validator` | Tool | `/subtitle-validator` | P0 |
| Encoding repair | `subtitle encoding converter`, `convert srt to utf 8`, `fix garbled subtitles`, `fix mojibake subtitles`, `shift jis subtitles` | Tool | `/utf-8-converter` | P0 |
| Bilingual merge | `merge subtitles`, `merge srt files`, `combine bilingual subtitles`, `put two subtitles together` | Tool | New `/merge-subtitles` | P1 |
| Embedded extraction | `extract subtitles from mkv`, `extract srt from mp4`, `download embedded subtitles`, `extract subtitle track` | Tool / guide | New `/extract-subtitles` | P1 |
| SUP/PGS OCR | `sup to srt`, `pgs to srt`, `convert blu ray subtitles to srt` | Tool | New `/convert-sup-to-srt` only when OCR is reliable | P2 |
| SUB/IDX OCR | `sub idx to srt`, `vobsub to srt`, `convert vobsub subtitles` | Tool | New `/convert-sub-idx-to-srt` only with paired-file checks | P2 |
| Subtitle PDF | `srt to pdf`, `subtitle to pdf`, `print subtitles` | Tool | New `/convert-subtitles-to-pdf` | P1 |
| ASS styling | `change subtitle color`, `subtitle font color`, `color ass subtitles` | Tool | New `/change-subtitle-color` | P2 |
| Subtitle positioning | `change subtitle position`, `move subtitles to top`, `subtitle alignment` | Tool | New `/change-subtitle-position` | P2 |
| LRC lyrics | `timed lyrics editor`, `create lrc file`, `sync lyrics` | Tool | Separate `/timed-lyrics` section | P2 |
| Chinese pinyin | `Chinese subtitles to pinyin`, `pinyin subtitles`, `learn Chinese with subtitles` | Tool / study | Separate language page | P2 |
| Developer API | `subtitle conversion API`, `SRT API`, `WebVTT API` | Commercial/developer | `/docs/api` after API launch | P2 |
| Educational sync | `how to fix subtitles too early`, `VLC subtitle delay`, `subtitle delay positive or negative` | Informational | `/guides/subtitle-sync` | P1 |
| Format education | `SRT vs VTT`, `SRT vs ASS`, `what is WebVTT`, `subtitle format converter guide` | Informational | `/guides/subtitle-formats` | P1 |

### Recommended page briefs

#### `/convert-to-srt`

Lead with a working browser tool, supported formats, a file preview, and a loss report. Add sections for ASS/SSA, WebVTT, SMI/SAMI, MicroDVD, MPL2, encoding detection, batch behavior, and “when `.sub` also needs `.idx`”. Link to the validator, cleaner, and UTF-8 converter.

#### `/convert-to-webvtt`

Use “SRT to WebVTT” in the title and first paragraph. Show the timestamp separator change, required `WEBVTT` header, cue settings, and what happens to styles. Link back to SRT conversion and the validator.

#### `/subtitle-shifter`

Show positive and negative examples: text early means move later; text late means move earlier. Include milliseconds, a live preview, zero-clamping behavior, and a short fixed-delay versus drift explanation. Link to partial shifting and the sync guide.

#### `/partial-subtitle-shifter`

Use a range editor with `From`, `To`, and offset. Explain that ranges must not overlap, cues are moved as a whole, and progressive drift needs frame-rate correction. Include a two-range example.

#### `/srt-cleaner`

Group controls into formatting, SDH, speaker labels, music/watermarks, duplicate/empty cues, and line breaks. Show before/after text and keep risky deletion rules off by default. Link to the validator and conversion pages.

#### `/subtitle-validator`

This is a differentiator. Report malformed timestamps, numbering, order, overlaps, empty cues, missing WebVTT header, and unsupported constructs. Offer safe one-click fixes and explain why overlaps are reported instead of silently changed.

#### `/utf-8-converter`

Use examples of mojibake and broken Cyrillic, Japanese, and Chinese text. Show detected encoding, allow correction, and state that output is UTF-8. Link from the cleaner and every converter.

#### `/convert-to-plain-text`

Target `SRT to TXT`, transcript, print, and language-learning searches. Offer options for blank lines, timings, cue numbers, and file names. Link to pinyin only when that tool exists.

#### `/guides/subtitle-sync`

Answer the questions the tool page cannot cover: how to tell early from late, positive versus negative delay, VLC temporary adjustment, constant offset versus drift, frame-rate mismatch, and when to use partial shifting.

## Content and internal-link plan

Use the homepage as a category hub with four entry points: Convert, Sync, Clean/Fix, and Validate. Each tool page should link to the next likely action using descriptive anchors, for example “validate the converted SRT”, “repair garbled text”, or “shift only part of the file”.

Add a small format glossary with SRT, WebVTT, ASS/SSA, SAMI, MicroDVD, MPL2, SUP/PGS, and VobSub. Each definition should state whether the format is text or image based, what styling it supports, and what a conversion can lose.

Use examples that can be tested in the browser. A downloadable sample SRT and VTT file, a malformed file for the validator, and a small encoded fixture make the pages more useful than generic SEO paragraphs.

## 90-day order of work

1. **Instrument the real site first.** Decide the production domain, publish the current MVP, connect Google Search Console, and submit the sitemap. Without this, there is no first-party query set to prioritize.
2. **Polish the eight existing tool pages.** Add task-specific titles, format tables, examples, error states, privacy copy, and links between converter → validator → cleaner → UTF-8.
3. **Ship the validator as a core differentiator.** Add indexable explanations for each error type and link those explanations from the tool output.
4. **Publish two guides.** Start with subtitle sync and SRT/WebVTT format differences. Keep each guide tied to a working tool.
5. **Add merger and extraction only when the browser implementation is reliable.** These are strong adjacent clusters but have more file and format edge cases.
6. **Re-run OpenSEO after the deployment is connected.** Use worldwide discovery only after choosing a primary language/market in OpenSEO. Pull 150 results for five seeds, hydrate the shortlist with metrics, inspect SERPs for borderline terms, and then save selected keywords after review.
7. **Do not build OCR, pinyin, lyrics, or API pages as empty SEO shells.** Launch each only with a working experience and a clear support path.

## Measurement plan

Track page impressions, clicks, CTR, average position, upload starts, successful downloads, and tool errors by route. In Search Console, watch queries in positions 5–20 and pages receiving impressions for the same query. If two pages begin receiving impressions for the same intent, merge or narrow one before cannibalization grows.

For each cluster, use one primary URL. Variants such as `vtt to srt`, `webvtt to srt`, and `convert vtt to srt` belong in the SRT conversion page when the SERP intent is the same. Split only when the result type or task changes, such as whole-file shifting versus partial shifting.

## How this report was made

- OpenSEO project context was read and updated for the business, worldwide goal, positioning, and writing preferences.
- OpenSEO keyword research was attempted once for `subtitle converter` with 150 results and clickstream refinement off. It returned “An unexpected error occurred”.
- OpenSEO domain overview was attempted once for `subtitletools.com`. It returned the same error.
- OpenSEO Search Console reported that Google OAuth is not configured. Saved Keywords reported zero saved keywords.
- Public competitor pages were read from the [Subtitle Tools homepage](https://subtitletools.com/) and the linked tool pages. The local extractor saved the fetched title, description, canonical, H1, and H2 inventory to [subtitletools-onpage.csv](./subtitletools-onpage.csv).
- The repository page inventory and metadata were inspected directly. No third-party volume, difficulty, CPC, traffic, ranking, or backlink metric is presented as fact.
