# Subtitle Tools keyword research

**Run date:** 2026-10-01  
**Market:** Worldwide English, with the United States as the working market  
**Site type:** Browser-first subtitle file utilities  
**Research goal:** Build a keyword-to-page plan that can earn organic traffic and move searchers into a working tool.

## What this run covers

This run combines the routes and features currently present in the repository, the existing SEO documents in `docs/seo/`, public search-result observations collected on 2026-10-01, competitive page patterns, and a clean list of terms to enter into Semrush Keyword Overview, Keyword Magic Tool, and Keyword Gap.

The Semrush and keyword-platform tabs were open in Chrome, but Computer Use stopped before it could safely read the browser URL and page state. I did not invent volume, keyword difficulty, CPC, traffic, or ranking values. The existing DataForSEO run also returned `40104: account verification required`. Live provider metrics remain marked `Unknown` until a verified export is added.

## Decision summary

The first SEO push should focus on five jobs that match the current product:

1. Convert subtitle formats, especially SRT to VTT, VTT to SRT, ASS to SRT, and subtitle to plain text.
2. Fix a constant subtitle delay.
3. Clean SRT files by removing tags, SDH notes, speaker labels, duplicates, and empty cues.
4. Validate subtitle files and explain the exact errors.
5. Repair garbled subtitle text by converting legacy encodings to UTF-8.

These jobs have direct tool intent. They also let the site compete on a clear promise: local, private, fast subtitle repair with a visible result.

Do not publish pages for MKV extraction, OCR, SUP/PGS, SUB/IDX, translation, lyrics, or subtitle styling until the product supports those jobs. Those terms can attract visitors, but a page without the matching working action will create thin content and poor search-to-tool completion.

## Current product inventory

| Current route | Product action | Primary keyword | Intent | Priority |
|---|---|---|---|---|
| `/` | Choose a subtitle repair task | subtitle tools, subtitle converter | Mixed tool discovery | P0 |
| `/convert-to-srt` | Convert supported files to SRT | convert subtitles to srt, subtitle converter | Transactional | P0 |
| `/convert-to-webvtt` | Convert supported files to WebVTT | srt to vtt, convert to webvtt | Transactional | P0 |
| `/convert-to-plain-text` | Remove timing and extract dialogue | srt to txt, subtitle to text | Transactional | P0 |
| `/subtitle-shifter` | Shift every cue by a fixed offset | subtitle shifter, fix subtitle delay | Transactional | P0 |
| `/partial-subtitle-shifter` | Shift one time range | partial subtitle shifter, subtitle timing drift | Tool plus informational | P0 |
| `/srt-cleaner` | Remove tags, notes, duplicates, and empty cues | srt cleaner, clean srt file | Transactional | P0 |
| `/subtitle-validator` | Find and fix safe subtitle errors | srt validator, subtitle checker | Transactional | P0 |
| `/utf-8-converter` | Repair character encoding | fix garbled subtitles, convert srt to utf 8 | Transactional | P0 |

## Keyword map

The demand signal below is editorial. It is based on direct product fit, how often the task appears in public SERPs, and whether competing pages are tools or guides. It is not a Semrush volume estimate.

| Keyword | Cluster | Intent | Demand signal | Target URL | Priority | Page decision |
|---|---|---|---|---|---|---|
| subtitle converter | Core conversion | Tool | High | `/convert-to-srt` | P0 | Keep as secondary home and converter term |
| convert subtitles to srt | SRT conversion | Tool | High | `/convert-to-srt` | P0 | Primary page term |
| convert subtitle file to srt | SRT conversion | Tool | Medium | `/convert-to-srt` | P0 | Supporting copy |
| convert ass to srt | Format conversion | Tool | Medium | `/convert-to-srt` | P0 | Add format-specific section |
| ass to srt converter | Format conversion | Tool | Medium | `/convert-to-srt` | P0 | Use only if the page supports it |
| ssa to srt | Format conversion | Tool | Medium | `/convert-to-srt` | P0 | Supporting term |
| vtt to srt | Format conversion | Tool | High | `/convert-to-srt` | P0 | Add prominent input/output path |
| webvtt to srt | Format conversion | Tool | Medium | `/convert-to-srt` | P0 | Supporting term |
| sub to srt | Format conversion | Tool | Medium | `/convert-to-srt` | P0 | Keep only if the parser is exposed |
| mpl2 to srt | Format conversion | Tool | Low | `/convert-to-srt` | P1 | Supporting format guide |
| srt to vtt | WebVTT conversion | Tool | High | `/convert-to-webvtt` | P0 | Primary page term |
| srt to webvtt | WebVTT conversion | Tool | High | `/convert-to-webvtt` | P0 | Supporting title phrase |
| convert srt for html5 video | WebVTT conversion | Tool plus guide | Medium | `/convert-to-webvtt` | P0 | Add HTML5 track example |
| vtt converter | WebVTT conversion | Tool | Medium | `/convert-to-webvtt` | P1 | Use in copy, do not create a duplicate page |
| srt to txt | Plain text | Tool | Medium | `/convert-to-plain-text` | P0 | Primary page term |
| subtitle to text | Plain text | Tool | Medium | `/convert-to-plain-text` | P0 | Add as H2 and internal anchor |
| extract transcript from srt | Plain text | Tool | Medium | `/convert-to-plain-text` | P0 | Add workflow example |
| remove timestamps from subtitles | Plain text | Tool plus guide | Medium | `/convert-to-plain-text` | P1 | Add FAQ and guide section |
| subtitle shifter | Fixed sync | Tool | Medium | `/subtitle-shifter` | P0 | Primary page term |
| subtitle delay fixer | Fixed sync | Tool | Medium | `/subtitle-shifter` | P0 | Use as title support |
| fix subtitle delay | Fixed sync | Tool plus guide | High | `/subtitle-shifter` | P0 | Add symptom language |
| fix out of sync subtitles | Fixed sync | Tool plus guide | High | `/subtitle-shifter` | P0 | Add early/late examples |
| shift srt timing | Fixed sync | Tool | Medium | `/subtitle-shifter` | P0 | Add exact millisecond example |
| adjust subtitle delay | Fixed sync | Tool | Medium | `/subtitle-shifter` | P0 | Supporting term |
| subtitles too early | Fixed sync | Informational | Medium | `/guides/subtitle-sync` | P1 | Guide intent, link to tool |
| subtitles too late | Fixed sync | Informational | Medium | `/guides/subtitle-sync` | P1 | Guide intent, link to tool |
| subtitle timing drift | Drift | Informational/tool | Medium | `/partial-subtitle-shifter` | P0 | Explain drift versus constant offset |
| subtitles get out of sync over time | Drift | Informational | Medium | `/guides/subtitle-sync` | P1 | Guide with stretch workflow |
| partial subtitle shifter | Range sync | Tool | Low | `/partial-subtitle-shifter` | P0 | Own the exact feature term |
| shift part of subtitle | Range sync | Tool | Low | `/partial-subtitle-shifter` | P0 | Supporting copy |
| srt cleaner | Cleaning | Tool | Medium | `/srt-cleaner` | P0 | Primary page term |
| clean srt file | Cleaning | Tool | Medium | `/srt-cleaner` | P0 | Supporting term |
| remove html tags from srt | Cleaning | Tool | Medium | `/srt-cleaner` | P0 | Add before/after example |
| remove sdh subtitles | Cleaning | Tool | Medium | `/srt-cleaner` | P0 | Add only if the current cleaner does it |
| remove speaker labels srt | Cleaning | Tool | Medium | `/srt-cleaner` | P0 | Add option and example |
| remove music notes subtitles | Cleaning | Tool | Medium | `/srt-cleaner` | P0 | Add option and example |
| remove duplicate subtitles | Cleaning | Tool | Low | `/srt-cleaner` | P1 | Supporting copy |
| subtitle validator | Validation | Tool | Medium | `/subtitle-validator` | P0 | Primary page term |
| srt validator | Validation | Tool | Medium | `/subtitle-validator` | P0 | Primary page term |
| subtitle checker | Validation | Tool | Medium | `/subtitle-validator` | P0 | Use as alternate phrasing |
| validate srt file | Validation | Tool | Medium | `/subtitle-validator` | P0 | Add exact error examples |
| fix invalid srt | Validation | Tool | Medium | `/subtitle-validator` | P0 | Add safe-fix explanation |
| webvtt validator | Validation | Tool | Low | `/subtitle-validator` | P1 | Use only if WebVTT checks are implemented |
| fix garbled subtitles | Encoding | Tool plus guide | High | `/utf-8-converter` | P0 | Primary page term |
| subtitle encoding converter | Encoding | Tool | Medium | `/utf-8-converter` | P0 | Primary page support |
| convert srt to utf 8 | Encoding | Tool | Medium | `/utf-8-converter` | P0 | Use exact phrase |
| fix mojibake subtitles | Encoding | Guide/tool | Low | `/utf-8-converter` | P1 | Add technical explanation |
| shift jis subtitles | Encoding | Tool | Low | `/utf-8-converter` | P1 | Add only with tested decoder |
| gbk subtitles | Encoding | Tool | Low | `/utf-8-converter` | P1 | Add only with tested decoder |
| merge subtitles | Merge | Tool | Medium | `/merge-subtitles` | P1 | Build feature before page |
| merge srt files | Merge | Tool | Medium | `/merge-subtitles` | P1 | Build feature before page |
| combine bilingual subtitles | Merge | Tool | Low | `/merge-subtitles` | P1 | Build feature before page |
| extract subtitles from mkv | Extraction | Tool | High | `/extract-subtitles` | P2 | Defer until local container parsing works |
| extract srt from mp4 | Extraction | Tool | Medium | `/extract-subtitles` | P2 | Defer until feature exists |
| sup to srt | OCR | Tool | Medium | `/convert-sup-to-srt` | P2 | Defer until OCR quality is tested |
| pgs to srt | OCR | Tool | Medium | `/convert-sup-to-srt` | P2 | Defer until OCR quality is tested |
| srt vs vtt | Format education | Informational | Medium | `/guides/subtitle-formats` | P1 | Publish guide |
| what is webvtt | Format education | Informational | Medium | `/guides/subtitle-formats` | P1 | Publish guide |

## Search-result observations

Public result pages checked on 2026-10-01 show a repeatable pattern.

**Conversion and sync pages win with a combined tool.** Results such as 99tools, Bluebird Tools, OrchidLines, CaliberVisual, and LightUtils pair SRT/VTT conversion with a constant time shift. This matches the user's next task after conversion. Subtitle Tools should make the cross-link between converter and shifter obvious, while keeping separate canonical URLs for each main job.

**Privacy is a real click reason.** Competitors repeatedly lead with "runs in your browser", "nothing is uploaded", and "no account". Subtitle Tools already has the right product direction. Put the privacy sentence beside the file control, repeat it near the FAQ, and make sure the implementation remains true.

**Format explanations are part of the page.** Ranking pages explain the comma versus period in timestamps, the WebVTT header, cue numbering, and HTML5 track use. Add a short before/after example to each conversion page.

**Cleaning pages describe specific operations.** Competitors name SDH removal, sound-effect removal, speaker labels, watermark removal, HTML tags, duplicate cues, and whitespace. A generic "clean your subtitles" page will be weaker than an option-led page with a visible preview.

**Encoding searches are symptom-led.** Searchers say "garbled subtitles", "question marks", "black diamonds", or "weird characters". The UTF-8 page should open with those symptoms, then explain legacy encodings such as Windows-1252, Windows-1251, GBK, and Shift-JIS.

**Extraction is a separate product.** MKV and MP4 extraction pages need container parsing, track selection, and clear handling of image-based PGS subtitles. Keep this in the roadmap, but do not index a placeholder.

Sources used for competitor observations:

- https://khangyen.github.io/subtitle-toolbox/
- https://99tools.dev/tools/subtitle-converter
- https://bluebirdtools.app/subtitle-converter
- https://orchidlines.com/tools/video/subtitle.html
- https://www.calibervisual.com/tools/subtitle-converter
- https://lightutils.com/subtitle-converter
- https://subconverter.com/srt-cleaner-online
- https://www.subextractor.com/tools/srt-cleaner
- https://subalign.com/guides/fix-garbled-subtitle-characters/
- https://www.veed.io/learn/how-to-extract-subtitles-from-mkv
- https://syncmysubs.com/extract-subtitles

## Page briefs

### `/convert-to-srt`

- **Title direction:** Convert subtitles to SRT online | Subtitle Tools
- **Primary query:** convert subtitles to srt
- **Secondary queries:** subtitle converter, VTT to SRT, ASS to SRT, SSA to SRT, SUB to SRT
- **Above the fold:** file input, supported formats, local-processing statement, target format control
- **Proof section:** input and output sample, including a WebVTT header and SRT numbering
- **FAQ topics:** styling loss from ASS, unsupported image subtitles, encoding detection, large-file handling
- **Internal links:** WebVTT converter, validator, UTF-8 converter, format guide

### `/convert-to-webvtt`

- **Title direction:** SRT to VTT converter online | Subtitle Tools
- **Primary query:** srt to vtt
- **Secondary queries:** srt to webvtt, convert srt for HTML5 video, VTT to SRT
- **Proof section:** show `WEBVTT`, period milliseconds, and cue settings
- **FAQ topics:** HTML5 track use, cue numbering, styling limitations
- **Internal links:** SRT converter, validator, subtitle shifter

### `/convert-to-plain-text`

- **Title direction:** Convert SRT to text online | Subtitle Tools
- **Primary query:** srt to txt
- **Secondary queries:** subtitle to text, extract transcript from srt, remove timestamps from subtitles
- **Proof section:** show timestamped input and clean dialogue output
- **FAQ topics:** joining lines, preserving paragraph breaks, removing SDH markers
- **Internal links:** SRT cleaner, validator, format guide

### `/subtitle-shifter`

- **Title direction:** Fix subtitle delay online | Subtitle Tools
- **Primary query:** fix subtitle delay
- **Secondary queries:** subtitle shifter, fix out of sync subtitles, shift SRT timing, adjust subtitle delay
- **Proof section:** "text appears early" means shift later; "text appears late" means shift earlier
- **FAQ topics:** milliseconds versus seconds, negative values, constant delay versus drift
- **Internal links:** partial shifter, sync guide, validator

### `/partial-subtitle-shifter`

- **Title direction:** Shift part of an SRT file | Subtitle Tools
- **Primary query:** partial subtitle shifter
- **Secondary queries:** shift part of subtitle, subtitle timing drift, subtitles get out of sync over time
- **Proof section:** before and after around a scene cut
- **FAQ topics:** selecting a time range, avoiding overlap, when to use a stretch factor
- **Internal links:** full shifter, sync guide, validator

### `/srt-cleaner`

- **Title direction:** SRT cleaner online | Remove tags and SDH
- **Primary query:** srt cleaner
- **Secondary queries:** clean srt file, remove HTML tags from SRT, remove SDH subtitles, remove speaker labels SRT
- **Proof section:** show tags, notes, duplicates, and empty cues before and after
- **FAQ topics:** whether timings change, which annotations are removed, safe cleanup
- **Internal links:** validator, plain text converter, UTF-8 converter

### `/subtitle-validator`

- **Title direction:** SRT validator and subtitle checker | Subtitle Tools
- **Primary query:** srt validator
- **Secondary queries:** subtitle validator, subtitle checker, validate SRT file, fix invalid SRT
- **Proof section:** real error list with line number, cue number, and safe fix
- **FAQ topics:** overlapping cues, invalid timestamps, numbering, WebVTT support
- **Internal links:** cleaner, shifter, converter

### `/utf-8-converter`

- **Title direction:** Fix garbled subtitles and convert to UTF-8
- **Primary query:** fix garbled subtitles
- **Secondary queries:** subtitle encoding converter, convert SRT to UTF-8, fix mojibake subtitles, Shift-JIS subtitles, GBK subtitles
- **Proof section:** visible examples such as `Ã¼` and correct `ü`
- **FAQ topics:** source encoding, BOM, legacy code pages, VLC compatibility
- **Internal links:** cleaner, validator, format guide

## Content roadmap

| Order | Page | Target cluster | Reason |
|---:|---|---|---|
| 1 | Convert to SRT refresh | SRT conversion | Broad product fit and strongest internal hub |
| 2 | Convert to WebVTT refresh | SRT to VTT | Clear transactional demand and HTML5 use case |
| 3 | Subtitle shifter refresh | Delay and sync | High pain intent and easy product proof |
| 4 | SRT cleaner refresh | Cleaning | Specific operations create long-tail coverage |
| 5 | UTF-8 converter refresh | Garbled subtitles | Symptom language is underserved by generic converter pages |
| 6 | Subtitle validator refresh | Validation | Supports trust and links to every repair action |
| 7 | Subtitle sync guide | Early, late, and drift | Captures informational searches and routes to tools |
| 8 | Subtitle formats guide | SRT, VTT, ASS, SSA | Builds topical authority and explains product limits |
| 9 | Convert to plain text refresh | SRT to TXT | Useful adjacent task with a simple proof example |
| 10 | Merge subtitles | Merge | Build feature first, then publish |
| 11 | Extract subtitles | MKV and MP4 | Build local container parsing first |
| 12 | OCR pages | SUP/PGS and SUB/IDX | Defer until quality and resource use are proven |

## Semrush collection sheet

Use the exact list in `KEYWORD-RESEARCH-2026-10-01.csv` in Semrush after the browser session is available. Export `Keyword`, `Intent`, `Volume`, `Keyword Difficulty`, `CPC`, `SERP Features`, `Trend`, and `Result Count`.

For Keyword Gap, compare the eventual production domain against the strongest task competitors discovered in the SERP, beginning with 99tools.dev, subtitletoolkit.tools, subtitlewise.com, subconverter.com, and the browser-first tools listed above. Filter for keywords where competitors rank and the site has no URL. Group by the target URL in this report before making new pages.

## Measurement plan

Track these events by route: `tool_view`, `upload_start`, `file_read_success`, `file_read_error`, `process_success`, `process_error`, and `download`. Include route, input format, output format, error class, and file-size bucket. Never send subtitle text or file contents.

In Search Console, review queries and pages in positions 5 to 20 every two weeks. Check for two URLs receiving impressions for the same task. If that happens, merge the pages or narrow one page's intent.

## Live-data handoff

When Semrush or DataForSEO access is available:

1. Export the CSV in this folder for the United States and worldwide English.
2. Save the raw export with the run date and provider name.
3. Preserve original provider values and add derived scores in a separate file.
4. Fill volume, difficulty, CPC, intent, SERP features, and trend.
5. Keep the current `docs/seo/DATAFORSEO-KEYWORD-RESEARCH.md` failed run and its raw JSON. Do not replace it with a successful run.
6. Re-score priorities using product fit first, then intent, then difficulty and volume.
7. Update titles and page briefs only after checking the actual SERP for the term.

## Limits and open questions

- The production domain is still `https://example.com` in `src/site.ts`; canonical and measurement work cannot be finalized until the real domain is set.
- Live Semrush metrics were not readable in this run because Computer Use stopped at browser URL safety validation.
- DataForSEO live metrics are blocked by account verification.
- The current route inventory does not include merge, extraction, OCR, or styling tools, so those keywords remain roadmap items.
- Search-result observations are directional. They identify intent and page patterns, not monthly demand.
