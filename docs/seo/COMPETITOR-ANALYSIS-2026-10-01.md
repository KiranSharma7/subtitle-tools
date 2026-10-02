# subtitletools.com and the subtitle-tool market

**Prepared:** 2026-10-01  
**Market:** Worldwide, English-first product planning; Semrush keyword data uses the United States desktop database  
**Subject site:** Subtitle Tools in this repository; the production URL is still `https://example.com` in `src/site.ts`  
**Named competitor:** [subtitletools.com](https://subtitletools.com/)

## Executive read

SubtitleTools.com is the strongest established direct competitor in this set. Its advantage is not one feature; it is a large library of exact-task pages, format explanations, batch processing, OCR, extraction, and a long operating history. The current repository can compete for the same high-fit searches by making a smaller set of browser-local utilities clearer, more diagnostic, and more trustworthy.

The clearest opening is the workflow around an existing subtitle file: **convert -> validate -> clean -> repair encoding -> resync**. Semrush's dated keyword export shows the best measurable demand in SRT/VTT conversion and SRT-to-text, while `subtitle shifter` has unusually low difficulty. A validator with visible error explanations and safe fixes is the best product differentiator because it connects every other tool.

The site should launch with one page per task, a real preview, before/after examples, a loss report for format conversions, and explicit local-processing/privacy copy. It should avoid creating thin pages for OCR, translation, lyrics, or an API until those experiences are complete.

## Snapshot

Semrush figures below are estimates from public Semrush pages, not first-party analytics. The latest public snapshots found are from July/August 2026 for the larger domains and April 2026 for EditingTools.io. They are useful for relative scale, but the dates and locales differ.

| Domain / product | Role in the market | Latest public Semrush snapshot | Organic / authority evidence | Product evidence |
|---|---|---:|---:|---|
| **Subtitle Tools (this repo)** | Subject site / launch candidate | No live production domain; `example.com` remains in source | No traffic, keyword, or backlink baseline yet | Browser-local worker; pages for SRT, WebVTT, plain text, whole-file shift, partial shift, cleaner, UTF-8, and validator |
| [subtitletools.com](https://subtitletools.com/) | Primary direct competitor | **720.36K visits, Aug 2026** | Authority Score **36**; organic search **15.96K**; **989** referring domains; **49.06K** backlinks | Long-running library of converters, OCR, extraction, sync, cleaner, merger, PDF, styling, lyrics, pinyin, and API pages |
| [editingtools.io](https://en.editingtools.io/subtitles/) | Professional workflow competitor | **170.94K visits, Apr 2026** | Authority Score **34**; organic search **10.26K**; **892** referring domains; about **5K** backlinks | Broad format conversion, guideline checks, timing repair, batch limits, Pro plan, and REST API |
| [subtitlestranslator.com](https://subtitlestranslator.com/en/) | Translation and editor competitor | **393.26K visits, Aug 2026** | Authority Score **32**; organic search **33.91K**; **553** referring domains; **3.26K** backlinks | Translation into 80+ languages, six formats, multi-file workflow, editor, and converter |
| [SubMuse](https://submuse.com/) | Modern all-in-one browser competitor | No public Semrush snapshot found in the available index | Treat scale as unknown | 25+ tools; browser processing; free tier plus $4.99/$14.99 plans; translation, AI sync, frame-rate, preview, batch, and API features |
| [Scriptery](https://scriptery.app/en/tools) | Browser-local utility and transcript competitor | No public Semrush snapshot found in the available index | Treat scale as unknown | Format conversion, frame-rate conversion, line-length fixing, cleanup, transcript extraction, many platform-specific pages, and API/pricing links |
| [Subtitle Toolkit](https://subtitletoolkit.tools/tools/webvtt-validator/) | QA and educational competitor | No public Semrush snapshot found in the available index | Treat scale as unknown | Local WebVTT validator, SRT validator, encoding fixer, cleaner, merger, extractor, and a substantial guide cluster |
| [Trustample](https://www.trustample.com/subtitles) | Privacy-led narrow competitor | No public Semrush snapshot found in the available index | Treat scale as unknown | Four browser-local tools, no signup/upload/watermark, character counter, WPM calculator, and strong SRT/VTT education |

Semrush also lists **emapp.cc**, **toolslick.com**, and **subtitlestranslator.com** as audience competitors for subtitletools.com in a May 2026 snapshot. Only the last of those is a close subtitle workflow match; emapp.cc is primarily a multi-view browser tool and toolslick.com has moved much of its tool surface to Converts.me. Do not use an audience-competitor list as a substitute for SERP or product-fit analysis.

## The biggest lesson

Exact task pages compound. Subtitletools.com names the output format or problem in the title, H1, upload flow, and explanatory copy. Its SRT page covers ASS/SSA, WebVTT, SMI, MicroDVD, MPL2, batch behavior, and conversion loss on one URL; its sync page explains positive versus negative offsets and when fixed shifting will fail. That lets one useful page capture many long-tail variants without making separate doorway pages.

The subject site already has the right product shape for a smaller version of this strategy. The missing advantage is explanatory depth around the result: what changed, what was preserved, what was removed, and which next tool should be used.

## Where competitors are vulnerable

1. **Conversion pages often stop at download.** Subtitletools.com has good format notes, but a new page can show a cue-level preview, an explicit loss report, and a validation result before download. This is a stronger answer for users who worry that styling, positioning, or cue settings disappeared.

2. **The validator opportunity is still open.** Subtitle Toolkit has a strong WebVTT validator and Scriptery advertises a checker, while EditingTools.io bundles many repair controls into one dense workflow. A focused SRT/WebVTT validator that names each error, highlights the affected cue, and offers safe one-click fixes can be easier to understand and easier to rank for `srt validator`, `subtitle checker`, and `validate srt file`.

3. **Fixed delay and progressive drift are easy to confuse.** Subtitletools.com handles constant offsets and partial ranges. Scriptery and SubMuse expose frame-rate tools. The subject site should teach the distinction plainly and route users to whole-file shift, partial shift, or frame-rate correction based on what they observe.

4. **Privacy claims vary in strength.** SubMuse says files auto-delete after one hour; Trustample and Scriptery make browser-local processing a headline promise. The subject site's worker already processes files in-browser and displays “Your file stays in this browser.” Make that a documented, testable product promise with a short explanation of what happens after the page loads.

5. **Professional tools are powerful but dense.** EditingTools.io exposes a very large option surface, formats, guidelines, and an API. That is a moat for post-production teams, but it creates a usability opening for a fast one-job flow aimed at a person who only needs to convert, clean, or shift one file.

6. **Several competitors mix unrelated intent.** Translation, AI transcription, video generation, watermark tools, and subtitle conversion often share one navigation tree. Keep the launch information architecture centered on existing subtitle files, then add separate sections for transcription or translation when the product supports them.

7. **The subject site's production baseline is unfinished.** `src/site.ts` still uses `https://example.com`, `hello@example.com`, and a placeholder GA ID. Canonicals, Open Graph URLs, sitemap output, and measurement cannot be trusted until those values are replaced.

## Semrush keyword evidence

The repository's live export is dated 2026-10-01 and records United States desktop results. The table below keeps the values that Semrush exposed and marks lower-volume rows as volume-only instead of estimating their missing fields.

| Theme | Example keyword | US volume / month | KD | CPC | Intent | Page decision |
|---|---|---:|---:|---:|---|---|
| SRT ↔ VTT | `vtt to srt` | 1,300 | 29 | $0.00 | Informational | P0: SRT converter page |
| SRT ↔ VTT | `srt to vtt` | 1,000 | 22 | $1.87 | Commercial | P0: WebVTT converter page |
| SRT ↔ VTT | `srt to webvtt` | 260 | 22 | $0.00 | Informational | P0: WebVTT page and FAQ |
| SRT to text | `srt to txt` | 1,300 | 25 | $1.67 | Informational | P0: plain-text page |
| Category | `subtitle converter` | 320 | 35 | $0.35 | Informational | P0: homepage/category hub |
| Format conversion | `convert ass to srt` | 110 | 9 | $0.00 | Informational | P0: SRT page section and example |
| Sync | `subtitle shifter` | 110 | 5 | $0.00 | Informational | P0: shifter page |
| Format education | `srt vs vtt` | 210 | 24 | $0.00 | Commercial | P1: format guide |
| Subtitle text | `subtitle to text` | 70 | 29 | $0.00 | Informational | P0: plain-text page |
| Cleaning | `srt cleaner` | 30 | — | — | — | P0: keep; refresh individually |
| Encoding | `convert srt to utf 8` | 20 | — | — | — | P0: keep; refresh individually |
| Validation | `srt validator`, `subtitle checker`, `validate srt file` | 20 each | — | — | — | P0: validator; refresh individually |

For `srt to vtt`, Semrush's detailed overview showed **5,000 global monthly volume**, **206 keyword variations**, and **18 visible questions**. The highest-fit question variants were “how to convert vtt to srt,” “how to convert srt to vtt,” and “how to convert .vtt to .srt.” The same report surfaced unrelated audio, translation, MKV, and entertainment-title terms; exclude those until the product supports them.

For `subtitle shifter`, the detailed overview showed **1,300 global monthly volume**, **182 variations**, and **5% KD**. Entertainment-title variants were noise; the useful intent was the tool query plus “how to shift subtitles,” VLC delay questions, and subtitle-sync wording.

## Keyword gaps and page map

| Opportunity | Current subject-site fit | Competitor evidence | Recommended URL / treatment | Priority |
|---|---|---|---|---|
| SRT ↔ WebVTT conversion | Existing converter pages and shared parser | Subtitletools.com, SubMuse, Scriptery, Trustample | `/convert-to-webvtt` with timestamp example, `WEBVTT` header, cue-settings note, preview, and FAQ | P0 |
| VTT/ASS/SSA/SMI/MicroDVD/MPL2 to SRT | Existing engine supports several formats | Subtitletools.com wins with format-specific explanations | `/convert-to-srt` with a support matrix and loss report | P0 |
| SRT to TXT / transcript | Existing plain-text page | TextToSRT, Scriptery, Toolslick/Converts.me | `/convert-to-plain-text` with options for timings, cue numbers, line breaks, and language study | P0 |
| Fixed subtitle delay | Existing shifter | Subtitletools.com, SubMuse, Scriptery | `/subtitle-shifter` with early/late examples and milliseconds | P0 |
| Partial shift | Existing partial shifter | Subtitletools.com, TextToSRT | `/partial-subtitle-shifter` with non-overlapping ranges and drift explanation | P0 |
| SRT/WebVTT validation | Existing validator page | Subtitle Toolkit, Scriptery, EditingTools.io | `/subtitle-validator` with error taxonomy, highlighted cues, and safe fixes | P0 |
| Encoding repair | Existing UTF-8 page and decoder | Subtitletools.com, Subtitle Toolkit, CaptionPass | `/utf-8-converter` with mojibake examples and detected encoding | P0 |
| SRT cleaning | Existing cleaner | Subtitletools.com, SubMuse, EditingTools.io | `/srt-cleaner` with conservative defaults and before/after output | P0 |
| Frame-rate drift | Not yet a dedicated tool | Scriptery and SubMuse expose FPS workflows | Add a guide first; add a converter only with tested frame-rate math | P1 |
| Readability QA | Validator foundation exists | Trustample character/WPM checks; EditingTools.io guideline presets | Add CPS, line length, duration, and gap checks after structural validation | P1 |
| Merge bilingual files | Planned in project summary, absent from current pages | Subtitletools.com, SubMuse, Subtitle Toolkit | New `/merge-subtitles` only after cue-matching rules are explicit | P1 |
| Embedded video extraction / OCR | Planned, not in current MVP | Subtitletools.com and EditingTools.io | Defer until browser/server limits and OCR review are real | P2 |
| Translation / transcription / lyrics | Planned adjacent products | SubtitlesTranslator, Scriptery, SubMuse, TimedSubs | Separate sections and monetization; do not dilute the launch hub | P2 |

## Competitor profiles

### subtitletools.com — direct benchmark

It has the broadest exact-match library in this set. The homepage groups converters, syncing, fixing, and other tools; the SRT converter explains styling loss and format quirks; the shifter explains sign conventions and constant-offset limits; the cleaner exposes granular controls for SDH, watermarks, speaker labels, music notes, tags, brackets, case, and duplicate cues. The site also supports batch conversion, OCR for image subtitles, video extraction, a developer API, and premium plans.

Semrush's public August snapshot puts it at 720.36K visits, Authority Score 36, 15.96K organic search visits, 989 referring domains, and 49.06K backlinks. Its public top US keywords include `.ass to srt` (position 1, volume 880), `ass to srt` (position 1, volume 590), `subtitle tools` (position 1, volume 170), `timed lyrics` (position 3, volume 1,600), and the branded `subtitletools` term (position 1, volume 110). The `.ass to srt` variants are a concrete reason to make ASS/SSA handling prominent on the subject SRT page.

**Response:** match the task vocabulary, then win on clarity: show the first result before download, state exactly what conversion loses, and route users to validation and encoding repair.

### EditingTools.io — professional breadth

Its subtitle tool is a configurable conversion and repair workbench. It supports ASS, DFXP, STL, SUB, TTML, SRT, VTT, SBV, TXT, CSV, TSV, JSON, XML, EDL, and more; it can remove tags and line breaks, repair overlaps, merge identical subtitles, set duration/gaps, shift timing, change frame rate, check guidelines, and expose an API. That depth makes it the most serious product competitor for editors and post-production teams.

The tradeoff is density and gating. The page presents a very large option surface, free-tier limits, and Pro-only features. The subject site can serve the one-file, one-problem job much faster and explain each choice in plain language.

**Response:** build narrow flows with a visible safe default, then add an advanced disclosure for users who need more control.

### SubMuse — modern freemium toolkit

SubMuse positions around 25+ browser tools, no signup, mobile support, privacy, and a free tier. It covers SRT/VTT/ASS/SUB conversion, plain text, whole-file shift, range shift, frame-rate conversion, AI sync, preview, cleaner, encoding, CPS, quality score, editing, merging, styling, translation, extraction, AI generation, batch, and API. Its free plan advertises 20 operations per day and 5 MB files; Pro is $4.99/month and Pro Plus is $14.99/month.

**Response:** keep the subject site simpler and more inspectable. Make local processing, unlimited core use, and result transparency the trust story; reserve advanced processing for a clearly separate roadmap.

### Scriptery — utility plus acquisition funnel

Scriptery has a strong browser-local utility set: SRT/VTT/TXT/ASS/JSON/CSV conversion, text-to-SRT, frame-rate conversion, line-length fixing, timestamp removal, auto-caption cleanup, and chapter generation. It also expands into platform-specific transcript pages for TikTok, YouTube, Instagram, Reddit, Facebook, Vimeo, Twitch, and more, with pricing and API links.

**Response:** copy the hub-and-spoke discipline, not the breadth. Build a small number of excellent subtitle-file pages first, then add platform pages only when each one has a real workflow behind it.

### Subtitle Toolkit — validator-led content strategy

Subtitle Toolkit is the clearest SEO model for the validator gap. Its WebVTT validator explains missing headers, comma-based SRT timestamps, cue order, parse errors, MIME/CORS/player issues, and local processing. The same site links validators, converters, cleaner, encoding fixer, merger, extractor, and many troubleshooting guides.

**Response:** make validation a product workflow, not a hidden page. Show the failing cue, the rule, the safe fix, and the next action. Link every converter result through the validator.

### Trustample — narrow privacy and education

Trustample has only four subtitle tools, but it gives the category a clear promise: no signup, no upload, no watermark, browser-local processing. It adds a 42-character counter, words-per-minute calculator, and unusually clear SRT versus VTT education.

**Response:** make the privacy and readability story concrete. Add a small format guide, sample files, line-length/CPS checks, and a visible statement that the file is processed in the browser.

### SubtitlesTranslator.com — translation-led adjacent competitor

The site translates up to 20 subtitle files at once into 80+ languages, supports SRT, VTT, STL, SBV, SUB, and ASS, and includes a converter and editor. Semrush's August 2026 snapshot reports 393.26K visits, Authority Score 32, 33.91K organic search visits, 553 referring domains, and 3.26K backlinks. Its Brazil-led keyword profile is dominated by Portuguese translation terms, so it is an adjacent audience competitor rather than the first SERP benchmark for English subtitle-file repair.

**Response:** do not chase translation demand before the core file workflow is excellent. Consider language-specific encoding examples later.

## Content patterns and authority

The winning pattern is a tool page that also answers the failure question. Subtitletools.com explains format loss and sync signs. Subtitle Toolkit explains why a VTT file will not load. Trustample explains when to use SRT versus VTT. EditingTools.io documents professional constraints and an API. Scriptery turns each utility into a crawlable spoke and uses transcript pages for acquisition.

The subject site's code supports a credible technical story: files are read and parsed in a worker, encoding selection is visible, previews and warnings are rendered, and the UI states that the file stays in the browser. That is product evidence. It should be paired with public documentation and tests rather than vague “secure” language.

Authority is concentrated in a few established domains. Subtitletools.com has roughly 989 referring domains in the latest public Semrush snapshot; EditingTools.io has about 892; SubtitlesTranslator.com has 553. The practical lesson is to earn links to useful references—format differences, invalid-file examples, encoding repair, and sample fixtures—rather than publish generic SEO articles. A downloadable malformed SRT, a WebVTT checklist, and an explanation of conversion loss are linkable assets that also help users.

## What to do next

1. **Replace launch placeholders.** Set the real domain, support address, analytics ID, canonical URLs, Open Graph URLs, and sitemap host before publishing. The current `src/site.ts` makes the site look unfinished to search engines and users.
2. **Polish the seven core tool pages.** Use standard `SRT` and `WebVTT` casing, put the primary task in the title/H1/first paragraph, show a sample input/output, disclose format loss, and link to the next job.
3. **Make the validator the cross-site spine.** Detect numbering, timestamp syntax, ordering, overlaps, empty cues, negative times, missing WebVTT header, and encoding problems. Highlight the exact cue and offer safe fixes with a downloadable result.
4. **Own the SRT ↔ VTT and SRT → TXT clusters.** Add the Semrush-supported variants and five high-fit questions to the page copy and FAQ; do not create near-duplicate pages for every wording variant.
5. **Publish one sync guide.** Explain fixed delay, partial ranges, frame-rate drift, VLC shortcuts, positive/negative delay, and when each tool applies.
6. **Add readability QA after structural validation.** Character count, CPS, cue duration, gap, and line-length checks connect the subject site to the gaps exposed by Trustample and EditingTools.io.
7. **Build a small authority loop.** Publish sample SRT/VTT fixtures, a format glossary, and troubleshooting pages that link directly into working tools. Offer the fixtures to captioning, accessibility, and video-editing references that already cite format rules.
8. **Defer expensive surface area.** Ship merger, extraction, OCR, translation, lyrics, and API pages only when each has a tested experience, clear limits, and support copy.
9. **Reconnect first-party measurement.** After the real domain is live, submit the sitemap to Search Console and track impressions, clicks, CTR, positions 5–20, upload starts, successful downloads, validation errors, and route-level conversion.

## How this report was made

- The local repository, page inventory, feature summary, browser-worker implementation, and dated SEO exports were inspected directly.
- The supplied Semrush reseller URL was opened in the provided browser and returned **Access Denied — Please access Semrush through the Dashboard**. No credentials, CAPTCHA, or access gate was bypassed.
- Public Semrush indexed snapshots were used for `subtitletools.com`, `editingtools.io`, and `subtitlestranslator.com` traffic, organic traffic, Authority Score, keyword, and backlink estimates. The snapshots are linked in the source list below.
- The repository's [live Semrush keyword export](./KEYWORD-RESEARCH-LIVE-2026-10-01.md) supplied the United States keyword volumes, KD, CPC, intent, SERP-feature counts, detailed variations, and question counts. Rows where Semrush withheld metrics remain unknown.
- Direct public pages were read for the product and content claims about Subtitletools.com, SubMuse, Scriptery, Subtitle Toolkit, TimedSubs, Trustample, CaptionPass, EditingTools.io, TextToSRT, Converts.me, and SubtitlesTranslator.com.
- No traffic, ranking, keyword, or backlink metric is presented for the subject site because it is not live under its intended domain and has no Search Console baseline.

### Source links

- [Semrush: subtitletools.com July 2026 overview](https://www.semrush.com/website/subtitletools.com/overview/?source=trending-websites)
- [Semrush: subtitletools.com August 2026 overview](https://de.semrush.com/website/subtitletools.com/overview/)
- [Semrush: subtitlestranslator.com August 2026 overview](https://www.semrush.com/website/subtitlestranslator.com/overview/)
- [Semrush: editingtools.io April 2026 overview](https://es.semrush.com/website/editingtools.io/overview/)
- [Semrush: subtitletools.com audience competitors, May 2026](https://fr.semrush.com/website/subtitletools.com/competitors/)
- [Subtitle Tools homepage](https://subtitletools.com/)
- [Subtitle Tools SRT converter](https://subtitletools.com/convert-to-srt-online)
- [Subtitle Tools sync shifter](https://subtitletools.com/subtitle-sync-shifter)
- [Subtitle Tools SRT cleaner](https://subtitletools.com/srt-cleaner)
- [EditingTools.io subtitle converter](https://en.editingtools.io/subtitles/)
- [EditingTools.io API documentation](https://en.editingtools.io/api/v2/subtitles/)
- [SubMuse tools](https://submuse.com/)
- [Scriptery tools](https://scriptery.app/en/tools)
- [Subtitle Toolkit WebVTT validator](https://subtitletoolkit.tools/tools/webvtt-validator/)
- [TimedSubs tools](https://timedsubs.com/en/tools)
- [Trustample subtitle tools](https://www.trustample.com/subtitles)
- [CaptionPass SRT vs VTT guide](https://www.captionpass.com/learn/srt-vs-vtt)
- [TextToSRT tools](https://texttosrt.com/tools)
- [Converts.me SRT to TXT](https://converts.me/tools/conversion/subtitle/srt-to-txt)
- [SubtitlesTranslator](https://subtitlestranslator.com/en/)
