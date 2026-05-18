---
name: sketch-findings-climato
description: Validated design decisions, CSS patterns, and visual direction from sketch experiments. Auto-loaded during UI implementation on climato — comparison pages, calendar component, versus diptych. Use when building any comparison-page UI (`/compare/{a}/vs/{b}`).
---

<context>
## Project: climato

Comparison pages (`/compare/{a}/vs/{b}`) for Climato — calendar-led, decision-aid framing. The page exists to help users decide when to visit each city. Visual language inherits from existing Climato variations: cream backgrounds, Inter Tight + JetBrains Mono, large bold typography, mono labels in uppercase, single-pixel border grids.

Reference points:
- Existing Climato `VariationA.tsx` / `VariationB.tsx` / `VariationC.tsx` (editorial cream layouts)
- Per-city OG images (`api/og.tsx`)
- Monthly Breakdown table in `ClimateNarrative.tsx`

Sketch session wrapped: 2026-05-18.
</context>

<design_direction>
## Overall Direction

### Palette

| Token | Hex | Role |
|-------|-----|------|
| `--color-bg` | `#f0f1ed` | Page background (cream, matches VariationA) |
| `--color-text` | `#111` | Primary text and 1px border grid |
| `--color-text-muted` | `#85847d` | Mono labels, sub-lines, subtitles |
| `--color-accent` | `#cc3b1f` | **Brand red — reserved for verdict-word emphasis only.** Never use as a category identifier for one of N peer items. |
| `--color-city-a` | `#1d5a52` | Deep teal — City A identity (cool, water/sky) |
| `--color-city-b` | `#b08229` | Warm ochre — City B identity (warm, sun/earth) |
| `--color-overlap` | `#5a6240` | Muted olive — "both ideal" overlap, mix of teal + ochre |
| `--color-good` | `#4a7c3a` | Moss green — suitability "ideal" |
| `--color-warn` | `#cf9a3a` | Amber — suitability "workable" / "poor" (gradient via alpha) |

The full theme file is in `sources/themes/default.css` and is the source of truth.

### Typography

- **Display:** Inter Tight, 700 weight, negative letter-spacing (-0.04em typical), uppercase
- **Body:** Inter, 400/500
- **Labels:** JetBrains Mono, 10–11px, letter-spacing 1.5px, uppercase

Heading scale (matches existing Climato site):
- Hero (h1): `clamp(80px, 13vw, 168px)` — comparison page entry
- City-name h2 in tables/diptych header: 56px
- Section labels: 10–11px mono caps

### Layout System

- Max-width container: `1280px`, side padding `32px`
- Single-pixel borders (`1px solid var(--color-border)`) form grid divisions everywhere
- White (`#fff`) backgrounds inside grid cells; cream (`#f0f1ed`) for the page chrome
- `font-variant-numeric: tabular-nums` on all numeric cells/values for column alignment

### Interaction Patterns

- `transition: filter 0.15s` or `all 0.15s ease` baseline for hovers
- Subtle `filter: brightness(0.92)` hover on cells/buttons
- No drop shadows (keep editorial flatness)

### Two-City Color Rule

**CRITICAL:** When introducing any new component that compares two cities, items, or categories — use the teal/ochre City-A/City-B pair, NOT brand red. Brand red carries alarm/error semantics and unbalances the design when used as one of two peers. Reserve red for verdict-word emphasis ("Paris is **2°C warmer**") and the Climato wordmark only.
</design_direction>

<findings_index>
## Design Areas

| Area | Reference | Key Decision |
|------|-----------|--------------|
| Page Layout | [references/page-layout.md](references/page-layout.md) | Sticky calendar split — calendar pinned left, scrolling content right, full-width tables below |
| Calendar Component | [references/calendar-component.md](references/calendar-component.md) | Paired heatmap rows (PAR / LON / ★ both), suitability score 0–3 encoded by color intensity |
| Versus Comparison Component | [references/versus-component.md](references/versus-component.md) | Diptych — persistent city header + per-metric face-off rows with center "referee" column |

## Theme

The winning theme file lives at [sources/themes/default.css](sources/themes/default.css). Import or copy CSS custom properties from there as the source of truth for the comparison page implementation.

## Source Files

Original sketch HTML files are preserved in `sources/` for complete reference:
- [sources/001-page-structure/index.html](sources/001-page-structure/index.html)
- [sources/002-best-months-calendar/index.html](sources/002-best-months-calendar/index.html)
- [sources/003-headline-stat-band/index.html](sources/003-headline-stat-band/index.html)
</findings_index>

<implementation_notes>
## When implementing the real comparison page

1. **Route:** `/compare/{country-a}/{city-a}/vs/{country-b}/{city-b}` or similar — fit existing Climato slug system in `src/lib/route.ts`
2. **Data source:** Both cities come from the existing `City` shape; suitability scores derived via `src/lib/climate-summary.ts` (extend if needed)
3. **SEO:** Each comparison page needs its own title, meta description (with both cities + differential headline), and a `Dataset`-style JSON-LD as in `useDocumentMeta.ts`. Add comparison pages to sitemap with `lastmod` based on the freshest of the two cities' `fetched_at`.
4. **Sitemap strategy:** Pre-generate top N comparison pairs (e.g. all capital × capital from the existing catalog). Generating all pairs of all cities is `O(N²)` and bloats the sitemap.
5. **Reuse:** The full-width side-by-side monthly tables can reuse the existing Monthly Breakdown table component from `ClimateNarrative.tsx` — just render it twice in a 2-column grid.
6. **Color contract:** When adding components, pull from CSS custom properties in the theme — don't hardcode hex.
</implementation_notes>

<metadata>
## Processed Sketches

- 001-page-structure (winner: Variant C — Sticky Calendar Split)
- 002-best-months-calendar (winner: Variant A — Paired Heatmap Rows)
- 003-headline-stat-band (winner: Variant C — Versus Diptych, with city-subheading iteration)
</metadata>
