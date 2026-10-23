# Subtitle Tools site structure and internal linking

## URL hierarchy

Live as of 2026-10-23. Slugs follow what people search for (Semrush, `SEO-AUDIT-2026-10-23.md`); renamed URLs 301 in `public/_redirects`.

```text
/
├── /convert-to-srt            (hub; pair pages below link back to it)
│   ├── /vtt-to-srt  /ass-to-srt  /smi-to-srt  /sub-to-srt
├── /srt-to-ass
├── /srt-to-vtt                (was /convert-to-webvtt)
├── /srt-to-txt                (was /convert-to-plain-text)
├── /srt-to-word
├── /convert-subtitles-to-pdf
├── /subtitle-shifter
├── /partial-subtitle-shifter
├── /srt-cleaner
├── /utf-8-converter
├── /subtitle-validator
├── /srt-editor
├── /merge-subtitles
├── /change-subtitle-position
├── /change-subtitle-color
├── /lrc-maker                 (was /timed-lyrics)
├── /guides
│   ├── /guides/what-is-an-srt-file
│   ├── /guides/srt-vs-vtt
│   ├── /guides/how-to-open-a-vtt-file
│   ├── /guides/what-is-an-lrc-file
│   ├── /guides/fix-out-of-sync-subtitles
│   └── (planned) fix-garbled-subtitles, srt-file-errors
├── /glossary/
│   ├── /glossary/srt
│   ├── /glossary/webvtt
│   ├── /glossary/ass-ssa
│   ├── /glossary/sami
│   ├── /glossary/microdvd
│   └── /glossary/mpl2
├── /about
├── /contact
├── /privacy
└── /terms
```

Future routes should be added only when the feature is working:

```text
/extract-subtitles
/convert-sup-to-srt
/convert-sub-idx-to-srt
/make-chinese-pinyin-subtitles
/docs/api
```

## Information architecture

The home page is the category hub. Its first-level groups are **Convert**, **Sync**, **Clean and fix**, and **Validate**. Every group should expose the tool, one sentence of use-case copy, and the next likely action.

### Primary journeys

1. **Convert:** home → converter → validator → cleaner or UTF-8 converter.
2. **Sync:** home → subtitle shifter → partial shifter → sync guide.
3. **Repair:** home → validator or cleaner → UTF-8 converter → converter.
4. **Learn:** guide → relevant tool → glossary definition → related guide.

## Internal-link rules

- Link from the home page to every launch tool with descriptive anchors.
- Each tool page links to two or three next actions, not a generic “read more”.
- Conversion pages link to the validator and cleaner because conversion can create or expose errors.
- The shifter pages link to the sync guide and each other; the guide links back to both tools.
- The UTF-8 page links from every page that accepts legacy text encodings.
- Format pages link to the tools that read or write that format.
- Guides link to a working tool within the first few sections and again at the conclusion.
- Avoid sitewide links with keyword-stuffed anchor text; use natural task language.

## Page template

Every tool page should contain:

1. One H1 naming the task and format.
2. A short promise and local-processing statement.
3. The working upload/tool interface.
4. Supported inputs and outputs.
5. A real before/after or timestamp example.
6. What is preserved and what may be lost.
7. Common errors and recovery steps.
8. Related tools with task-specific anchors.
9. A concise privacy and download explanation.

## Quality gates for the sitemap

Include a URL only when it is:

- Canonical to itself and returns a successful response.
- Useful without requiring an account or an ad click.
- Distinct in intent from every other indexed URL.
- Supported by working product behavior and accurate copy.
- Linked from at least one relevant page.

Keep privacy, terms, contact, and about pages crawlable for trust, but do not expect them to be primary organic acquisition pages. Keep unfinished future tools out of the sitemap and index.

## Schema map

| URL type | Recommended schema |
|---|---|
| Home | `Organization`, `WebSite`, `SoftwareApplication` when product details are visible |
| Tool page | `SoftwareApplication` or `WebApplication` (no `HowTo`: rich results retired Sept 2023) |
| Guide | `Article` or `TechArticle` |
| Glossary term | `DefinedTerm` inside a `DefinedTermSet` |
| About | `AboutPage`, `Organization` |
| Contact | `ContactPage` |
| Privacy/terms | Standard page metadata; no decorative schema |

