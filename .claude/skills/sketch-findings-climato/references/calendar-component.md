# Calendar Component (Best Months)

## Design Decisions

### Visualization: Paired heatmap rows (Sketch 002 Variant A)

The "best months" calendar shows when each of two cities is good to visit, and where both are simultaneously ideal. The winning approach is **three rows of 12 discrete cells**:

| Row | Content |
|-----|---------|
| `PAR` | Per-month suitability score for City A, color intensity = score |
| `LON` | Per-month suitability score for City B, color intensity = score |
| `★` | Olive-filled cells only where both cities are at peak (score 3) |

**Suitability score is 0–3** (derived per-month from temp band, rainfall, sunshine — exact rules to be specified during implementation; should live in `src/lib/climate-summary.ts`).

### Why this won
- Discrete cells map cleanly to "what's this month?" — most readable for quick scanning
- A dedicated `★ both` row makes the overlap unambiguous and SEO-readable
- Works equally well at 420px sidebar width and at full width (mobile-stack)
- Color encoding is consistent regardless of city — same gradient for both rows means readers can compare suitability directly

### Color encoding (suitability gradient)

The same color gradient is used for both city rows:

| Score | Color | Meaning |
|-------|-------|---------|
| 0 | `transparent` | Bad (too cold/wet/dark) |
| 1 | `rgba(207, 154, 58, 0.12)` | Poor (workable but cool/wet) |
| 2 | `rgba(207, 154, 58, 0.32)` | Workable (acceptable conditions) |
| 3 | `rgba(74, 124, 58, 0.38)` | Ideal (mild temp, low rain, decent sun) |
| both | `var(--color-overlap)` (`#5a6240` muted olive) | Both ideal simultaneously |

The gradient goes from no-fill → amber-tinted → moss-green — communicating "warmer/sunnier/better" upward. The "both ideal" row uses the dedicated olive overlap color (which is `--color-overlap`, the mix of teal + ochre).

## CSS Patterns

```css
.heatmap {
  display: grid;
  grid-template-columns: 44px repeat(12, 1fr);
  border: 1px solid var(--color-border);
  background: #fafaf7;
}
.heatmap .hm-row-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  display: flex; align-items: center; justify-content: center;
  color: var(--color-text-muted);
  border-right: 1px solid var(--color-border);
  background: #fafaf7;
}
.heatmap .hm-row-label.par  { color: var(--color-city-a); font-weight: 600; }
.heatmap .hm-row-label.lon  { color: var(--color-city-b); font-weight: 600; }
.heatmap .hm-row-label.both {
  background: rgba(90, 98, 64, 0.08);
  color: var(--color-overlap);
  font-weight: 600;
}

.heatmap .hm-month {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 1px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  padding: 7px 0;
  text-align: center;
  border-right: 1px solid var(--color-border-soft);
  border-bottom: 1px solid var(--color-border);
  background: #fafaf7;
}
.heatmap .hm-month:last-child { border-right: none; }

.heatmap .hm-cell {
  height: 34px;
  border-right: 1px solid var(--color-border-soft);
  border-bottom: 1px solid var(--color-border-soft);
  transition: filter 0.15s;
  cursor: pointer;
}
.heatmap .hm-cell:last-child { border-right: none; }
.heatmap .hm-cell:hover { filter: brightness(0.92); }

/* Suitability score classes */
.hm-cell.s0   { background: transparent; }
.hm-cell.s1   { background: rgba(207, 154, 58, 0.12); }
.hm-cell.s2   { background: rgba(207, 154, 58, 0.32); }
.hm-cell.s3   { background: rgba(74, 124, 58, 0.38); }
.hm-cell.both { background: var(--color-overlap); }
```

### Wide-context override
At full width (e.g. mobile-stack at top of page), use a wider first column for the row label and full month names instead of single letters:
```css
.heatmap.wide { grid-template-columns: 70px repeat(12, 1fr); }
.heatmap.wide .hm-month { font-size: 11px; padding: 10px 0; }
```

## HTML Structure

```html
<div class="heatmap">
  <!-- Top-left corner empty -->
  <div class="hm-row-label" style="border-bottom: 1px solid var(--color-border);"></div>
  <!-- Month headers -->
  <div class="hm-month">J</div><div class="hm-month">F</div> ... <div class="hm-month">D</div>

  <!-- Paris row -->
  <div class="hm-row-label par">PAR</div>
  <div class="hm-cell s0"></div><div class="hm-cell s0"></div><div class="hm-cell s1"></div>
  <div class="hm-cell s2"></div><div class="hm-cell s3"></div><div class="hm-cell s3"></div>
  <div class="hm-cell s3"></div><div class="hm-cell s3"></div><div class="hm-cell s3"></div>
  <div class="hm-cell s2"></div><div class="hm-cell s1"></div><div class="hm-cell s0"></div>

  <!-- London row -->
  <div class="hm-row-label lon">LON</div>
  <!-- 12 cells -->

  <!-- Both row (overlap only) -->
  <div class="hm-row-label both">★</div>
  <!-- 12 cells: .both where both cities are at score 3, otherwise .s0 -->
</div>
```

### Sidebar context wrapper
Place inside `position: sticky` parent at `top: 72px`. Below the heatmap, include:
- A small "PEAK OVERLAP" pull-quote card with `border-left: 3px solid var(--color-overlap)` and the overlap month range
- A legend with 4 dots: cool/wet, workable, ideal, best-for-both

## Legend pattern

```html
<div class="legend">
  <span><span class="dot" style="background: rgba(207, 154, 58, 0.12);
                                 border: 1px solid var(--color-border-soft);"></span>Cool/wet</span>
  <span><span class="dot" style="background: rgba(207, 154, 58, 0.32);
                                 border: 1px solid var(--color-border-soft);"></span>Workable</span>
  <span><span class="dot" style="background: rgba(74, 124, 58, 0.38);
                                 border: 1px solid var(--color-border-soft);"></span>Ideal</span>
  <span><span class="dot both-fill"></span>Best for both</span>
</div>
```

## What to Avoid

- **Diverging bars (Sketch 002 B)** — Paris bars going up, London bars going down from a center axis. The up/down asymmetry felt like London was the "loser" team. The framing was competitive when it should be neutral.
- **Smooth suitability curves (Sketch 002 C)** — Two filled SVG areas (teal + ochre) overlapping. Visually elegant and the overlap color emerges automatically, but the smooth lines lost the "calendar" affordance — users scanning for a specific month had to estimate position on a curve rather than land on a cell.
- **Single combined row** — Trying to encode both cities in a single row (e.g. split cells, gradient cells) made overlap unreadable. The dedicated `★` row earns its vertical weight.

## Data Shape

```ts
interface CalendarData {
  cityA: { name: string; scores: number[]; }  // 12 elements, 0–3
  cityB: { name: string; scores: number[]; }
}

// Overlap derived: both[i] = (cityA.scores[i] === 3 && cityB.scores[i] === 3)
```

The implementation should auto-derive scores from `City` shape via the existing `climate-summary.ts` scoring rules (mild temp + low rain + decent sun → 3).

## Origin

Synthesized from sketch: **002-best-months-calendar** (Variant A — Paired Heatmap Rows).
Source file: `sources/002-best-months-calendar/index.html`
