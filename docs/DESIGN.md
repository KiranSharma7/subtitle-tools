# Design: Pirsch-style

> Sunlit paper notebook with highlighter swatches. Ink hairlines do the structure, one yellow marks the action.

**Theme:** light. Tokens live in `src/layouts/Layout.astro` `:root`.

## How this site uses it

- **Canvas is pure white**, not the Pirsch cream. Cream is used for cards and hover fills.
- **Type**: DM Sans only (self-hosted variable Latin subset, `public/fonts/dm-sans-latin.woff2`), with `ss03` and `ss04` on.
- **Headings** (`h1`): 500 weight, `clamp(40px, 6vw, 64px)`, tracking -0.016em.
- **Header**: white, 1px ink bottom line. Menu items are ghost buttons with a cream hover. Login is an outlined ink button.
- **Primary button** (Download, Accept): Sunshine fill, ink text, 24px radius, 16px 24px padding. One per view.
- **Secondary buttons**: transparent, 1px ink border, 24px radius.
- **Tool area**: no panel. The drop zone, controls and result box sit straight on the white page.
- **Tool cards** (home page): Sunshine fill, 1px ink border, 24px radius, 32px padding.
- **Inner boxes** (drop zone, preview, notices): white, 1px ink border, 12px radius.
- **Inputs**: white, 1px ink border, 6px radius.
- **Footer**: white, 1px ink top line, graphite text.
- **Focus ring**: 2px ink outline.

## Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Sunshine | `#ffda6e` | `--sun` | Primary action fill, active item, highlighted rows. Rationed |
| Mint | `#6ece9d` | `--mint` | Status dots and positive chips only. Never a button |
| Cream | `#f8f5ed` | `--cream` | Card and panel surfaces, hover fill |
| Ink | `#000000` | `--ink` | Headings, text, all 1px borders |
| Graphite | `#707070` | `--graphite` | Secondary text, helper copy |
| Paper | `#ffffff` | `--paper` | Page canvas, inner boxes |
| Error | `#c62828` | `--error` | Error text |

## Type scale

| Role | Size | Line height | Tracking |
|------|------|-------------|----------|
| caption | 14px | 1.5 | 0 |
| body-sm | 16px | 1.5 | 0 |
| body | 18px | 1.5 | 0 |
| subheading | 20px | 1.5 | 0 |
| heading-sm | 24px | 1.5 | 0 |
| heading | 28px | 1.25 | 0 |
| display | 64px | 1.25 | -0.016em |

Headings, FAQ questions and card titles use `text-wrap: balance`. Paragraphs and list items use `text-wrap: pretty`.

Weights: 400 for prose, 500 for headings, labels and buttons. Uppercase labels get +0.286em tracking; body copy stays untracked.

## Shape and spacing

- Base unit 8px. Section gap 64px. Card padding 32px. Element gap 16px.
- Radius: cards and buttons `24px` (`--radius`), images and inner tiles `12px` (`--radius-sm`), inputs `6px` (`--radius-input`), tags `9999px` (`--pill`).
- Max width 1200px, 16px side gutter.

## Elevation

None. Everything is ink lines on paper. To lift something, thicken its border (e.g. `box-shadow: 0 0 0 1px var(--ink)` on top of the 1px border) or fill it with Sunshine. Never a drop shadow, blur or gradient.

## Motion

- Hover and press: 150ms. Buttons, chips and cards shrink a touch on press (`scale: .97`, cards `.98`).
- Things appearing (tool states, menus, consent banner, new range rows): 300–400ms `rise` with `--spring`. Global keyframes and tokens are in `Layout.astro`.
- Never animate preview rows. They re-render on every keystroke.
- `prefers-reduced-motion` turns all of it off with one global rule.

## Do

- One Sunshine fill per view.
- Define containers with a 1px ink border, not a fill change or shadow.
- Use Graphite for body and helper text. Keep ink for headings and emphasis.
- Keep Mint for status only.

## Don't

- No drop shadows, blurs, gradients or decorative fills.
- No second font.
- No Sunshine on small text. It's unreadable.
- No Mint buttons.
