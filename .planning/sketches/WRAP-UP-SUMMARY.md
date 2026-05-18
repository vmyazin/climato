# Sketch Wrap-Up Summary

**Date:** 2026-05-18
**Sketches processed:** 3 (all included)
**Design areas:** Page Layout · Calendar Component · Versus Comparison Component
**Skill output:** [./.claude/skills/sketch-findings-climato/](../../.claude/skills/sketch-findings-climato/)

## Included Sketches

| # | Name | Winner | Design Area |
|---|------|--------|-------------|
| 001 | page-structure | C — Sticky Calendar Split | Page Layout |
| 002 | best-months-calendar | A — Paired Heatmap Rows | Calendar Component |
| 003 | headline-stat-band | C — Versus Diptych | Versus Comparison Component |

## Excluded Sketches

None — all three sketches validated decisions worth packaging.

## Design Direction

Comparison pages (`/compare/{a}/vs/{b}`) for Climato. Calendar-led, decision-aid framing — the page exists to help users decide when to visit each city. Visual language inherits from existing Climato variations: cream backgrounds, Inter Tight + JetBrains Mono, large bold typography, mono labels in uppercase, single-pixel border grids.

**Two-city palette:** Deep teal (`#1d5a52`) for City A, warm ochre (`#b08229`) for City B, muted olive (`#5a6240`) for the overlap. Brand red (`#cc3b1f`) is **never** used as a category identifier — reserved exclusively for verdict-word emphasis.

## Key Decisions

### Layout
- Sticky calendar split: 420px sidebar (left, sticky) + scrolling content (right)
- Full-width side-by-side monthly tables BELOW the split (not inside the right column)
- Hero headline at `clamp(80px, 13vw, 168px)`, uppercase, with a small (`0.4em`) muted `vs` connector

### Calendar
- Three rows of 12 discrete cells: `PAR` / `LON` / `★ both`
- Suitability score 0–3 encoded by color intensity (transparent → faint amber → amber → moss green)
- The `★ both` row uses the dedicated olive overlap color
- Works in both 420px sidebar and full-width contexts

### Versus Comparison
- Persistent city header row at top with bold display-type names + country sub-line + "vs" connector
- Per-metric face-off rows: left value · center referee column (label + differential + winner arrow) · right value
- Optional final row for shared/overlap stats with olive accent background

### Typography
- Display: Inter Tight 700, negative letter-spacing
- Body: Inter
- Labels: JetBrains Mono caps with 1.5px letter-spacing
- All numeric cells use `font-variant-numeric: tabular-nums`

### Stress Testing
- City-name swap toggle wired into Sketch 001's toolbar — swaps headline + table h2s + country line through medium / long / hyphenated / extreme city pairs to verify the typography stays legible

## Open Implementation Questions

1. **Suitability scoring rules** — How exactly does the 0–3 score derive from temp / rainfall / sunshine? Should live in `src/lib/climate-summary.ts`. Likely extension of existing best-months heuristic.
2. **Comparison sitemap strategy** — All `N²` pairs is too many. Pre-generate top capitals × top capitals? Or only generate on first visit (like cities are now via Upstash drain)?
3. **Mobile layout** — Does the sticky calendar stack on top, or collapse into a compact strip?

## Next Step

`/gsd-plan-phase` to turn this spec into an executable phase plan for the `/compare/{a}/vs/{b}` implementation.
