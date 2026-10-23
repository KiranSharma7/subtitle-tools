# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Static Astro site of small subtitle tools (shift, convert). Everything runs in the visitor's browser; files are never uploaded. Domain terms (cue, header, extras, loss report, clamp, range) are defined in `CONTEXT.md`. Use them.

## Commands

- `npm run dev`: dev server
- `npm run build` / `npm run preview`: static build and serve it
- `npm run check`: Astro + TypeScript type check
- `npm test`: engine unit tests (`node --test`, runs `.ts` directly, no build step)
- One unit test: `node --test --test-name-pattern "timestamps" src/engine/engine.test.ts`
- `npm run test:e2e`: Playwright. Builds, then serves on port 4322. One spec: `npx playwright test tests/e2e/shifter.spec.ts`
- `node scripts/screenshots.ts` (after `npm run build`): retakes the tool screenshots in `public/images/tools/` and their sizes in `src/screenshots.json`. Rerun when a tool's UI changes; a new tool needs an entry there and a `<ToolImage>` on its page.

## Architecture

- `src/engine/`: the **engine**, plain TypeScript with no DOM code. Every tool goes through it.
  - `types.ts`: shared `SubtitleFile` / `Cue` model. Format-specific per-cue data lives in `cue.extras`, file-level data in `header` as raw text (ADR 0002).
  - `formats.ts`: `detect`, `parse`, `write`, `plainText`. Handles SRT/WebVTT/txt itself and dispatches to one file per other format (`ass.ts`, `sami.ts`, `microdvd.ts`, `mpl2.ts`, `lrc.ts`). Parsers return `{ file, problems }` and don't throw.
  - `convert.ts`: cross-format conversion (only to SRT, WebVTT, txt, LRC for the LRC maker, and ASS for the style tools' "Save as ASS"). Each format supplies a `*ToCommon` function that returns SRT-style text plus what was lost. Losses must always be reported, never dropped silently.
  - `decode.ts`: byte decoding / charset detection (jschardet). `shift.ts`, `time.ts`: re-timing and timestamp parse/format.
  - All tests are in `engine.test.ts`.
- `src/components/pdf.ts`: the PDF page's output (pdf-lib + fontkit, imported only when a PDF is made). Fonts are Noto TTFs in `public/fonts`, one per script, fetched only when the text needs them and subset on embed. The CJK fonts are Google's variable fonts pinned to Regular with fontTools, and their glyphs must be padded to an even length or pdf-lib's subsetter breaks their outlines (a test in `pdf.test.ts` checks every font).
- `src/components/`: `ToolShell.astro` is the shared upload/preview/download markup. `tool-shell.ts` `mountTool()` wires it up; each tool supplies `view` (warnings + preview rows) and `output`. `converter.ts` is the shared script for the convert pages.
- `src/pages/*.astro`: one page per tool. `src/tools.ts` lists the tools for the index page and menu, so add new tools there too. Its `conversions` list holds the format-pair pages (`/vtt-to-srt`, `/ass-to-srt`...): same converter, own copy, linked from home and `/convert-to-srt` instead of the menu.
- `src/components/srt-editor.ts`, `docx.ts`: logic for the SRT editor and the Word output (a minimal .docx zipped with fflate), unit-tested like `lyrics.ts` and `pdf.ts`.
- `src/pages/guides/*.astro` use `components/Guide.astro` (TechArticle schema, breadcrumb, byline); `src/guides.ts` lists them for `/guides`.
- Adding a format touches: `types.ts` `Format`, `formats.ts` detect/parse/write, `convert.ts` `toCommon`, `formatNames` in `tool-shell.ts`, the tool pages' format lists, and tests.

## Domain, hosting, SEO

- Live as **SubtitleMate** at `https://subtitlemate.com`. Name, URL, contact email and GA4 id live in `src/site.ts`.
- Hosted on Cloudflare Pages as plain static files. `.node-version` pins Node 22 for its build. `public/_headers` sets security headers. The Content-Security-Policy is not there: `security.csp` in `astro.config.mjs` writes it as a `<meta>` tag with hashes of inline scripts, so a new third-party origin (script, image, fetch) must be added there or the browser blocks it. The `site.spec.ts` CSP test catches misses. `404.astro` must exist: without a `404.html` Cloudflare serves the home page with status 200 for every bad URL.
- `build.format: 'file'` builds `/contact.html`, which Cloudflare serves at `/contact` with no redirect. Canonical URLs have no `.html` and no trailing slash; `cleanPath()` in `site.ts` does that mapping. Keep the two in step. A section index is `src/pages/guides.astro`, not `guides/index.astro`, so it gets the same treatment.
- Renamed URLs get a 301 in `public/_redirects`. Never rename an indexed URL without one.
- The sitemap's `lastmod` is each page file's last commit date. Cloudflare builds from a shallow clone, so `sitemap.xml.ts` unshallows first and leaves `lastmod` out if it can't.
- `src/layouts/Layout.astro` sets title (`"<title> | SubtitleMate"`, home page bare), description, canonical and Open Graph tags. Every page passes `title` and `description`.
- `src/pages/sitemap.xml.ts` lists every `.astro` page automatically. A page that shouldn't be indexed needs a filter there. `public/robots.txt` points at it.
- `Layout.astro` also adds the favicon, `og.png` share image, and JSON-LD: `WebSite` on home, `WebApplication` on any page listed in `tools.ts` (both lists), `BreadcrumbList` on every page but home, and a page's own `schema` prop (guides pass `TechArticle`). `Faq.astro` emits `FAQPage` JSON-LD. For other pages follow the schema map in `docs/seo/SITE-STRUCTURE.md`.
- `site.spec.ts` checks every page's title (≤60 chars with the suffix) and description (≤160), and that every internal link resolves.
- `docs/seo/`: planned URL tree, internal-link rules, tool page template, keyword research, competitor analysis, audit. Read `SITE-STRUCTURE.md` before adding a page; only add routes once the tool actually works.

## Docs

- `docs/adr/`: decisions (Astro static site, shared cue model with extras, GA4 with own consent banner).
- `docs/DESIGN.md`: visual design rules.
- Issues are in GitHub Issues via `gh`; see `docs/agents/issue-tracker.md`. Domain doc conventions: `docs/agents/domain.md`.
