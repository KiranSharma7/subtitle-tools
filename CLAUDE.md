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

## Architecture

- `src/engine/`: the **engine**, plain TypeScript with no DOM code. Every tool goes through it.
  - `types.ts`: shared `SubtitleFile` / `Cue` model. Format-specific per-cue data lives in `cue.extras`, file-level data in `header` as raw text (ADR 0002).
  - `formats.ts`: `detect`, `parse`, `write`, `plainText`. Handles SRT/WebVTT/txt itself and dispatches to one file per other format (`ass.ts`, `sami.ts`, `microdvd.ts`, `mpl2.ts`). Parsers return `{ file, problems }` and don't throw.
  - `convert.ts`: cross-format conversion (only to SRT, WebVTT, txt). Each format supplies a `*ToCommon` function that returns SRT-style text plus what was lost. Losses must always be reported, never dropped silently.
  - `decode.ts`: byte decoding / charset detection (jschardet). `shift.ts`, `time.ts`: re-timing and timestamp parse/format.
  - All tests are in `engine.test.ts`.
- `src/components/`: `ToolShell.astro` is the shared upload/preview/download markup. `tool-shell.ts` `mountTool()` wires it up; each tool supplies `view` (warnings + preview rows) and `output`. `converter.ts` is the shared script for the convert pages.
- `src/pages/*.astro`: one page per tool. `src/tools.ts` lists the tools for the index page, so add new tools there too.
- Adding a format touches: `types.ts` `Format`, `formats.ts` detect/parse/write, `convert.ts` `toCommon`, `formatNames` in `tool-shell.ts`, the tool pages' format lists, and tests.

## Docs

- `docs/adr/`: decisions (Astro static site, shared cue model with extras, GA4 with own consent banner).
- `docs/DESIGN.md`: visual design rules.
- Issues are in GitHub Issues via `gh`; see `docs/agents/issue-tracker.md`. Domain doc conventions: `docs/agents/domain.md`.
