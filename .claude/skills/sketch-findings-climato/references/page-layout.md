# Page Layout

## Design Decisions

### Macro layout: Sticky calendar split (Sketch 001 Variant C)

The comparison page (`/compare/{a}/vs/{b}`) is calendar-led. The user is here to answer "when should I visit each, and when are both ideal?" — so the calendar must be the anchor.

**Structure (top to bottom):**
1. **Breadcrumb** — `CLIMATO · COMPARE` in mono caps
2. **Hero headline** — `Paris vs London` at `clamp(80px, 13vw, 168px)`, uppercase, with the `vs` connector at `0.4em` and muted gray
3. **Subtitle** — one short editorial sentence, 22px, muted gray
4. **Split layout** — two columns, `grid-template-columns: 420px 1fr; gap: 32px`
   - **Left (sticky):** Best-months calendar component + a small "PEAK OVERLAP" pull-quote + legend. Uses `position: sticky; top: 72px;` to stay visible while the right column scrolls.
   - **Right (scrolling):** Stat band (versus diptych) → monthly chart → narrative paragraph
5. **Full-width comparison tables** — Below the split, two side-by-side `.col` panels (one per city) with full monthly breakdown tables. Uses `.data-table` grid pattern with `grid-template-columns: 1fr 1fr`.
6. **Footer** — `SOURCE · OPEN-METEO · 30-YR NORMALS · CLIMATO` in mono caps

### Why this won

- Calendar always visible while the user reads supporting data → "when?" stays answered no matter how deep they scroll
- The hero headline + sticky calendar both live above the fold, so the most monetisable intent (decision-aid → affiliate CTAs) is established before any scrolling
- Tables get full width below the split — each city's monthly breakdown gets a comfortable half-page column rather than being squeezed into the narrow 820px right column

## CSS Patterns

### Split layout with sticky sidebar
```css
.split-layout {
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 32px;
  align-items: start;
}
.split-layout .sticky-cal {
  position: sticky;
  top: 72px;
}
```

### Hero headline (matches VariationA hero scale)
```css
h1.display {
  font-family: var(--font-display);  /* Inter Tight */
  font-weight: 700;
  font-size: clamp(80px, 13vw, 168px);
  line-height: 0.9;
  letter-spacing: -0.045em;
  text-transform: uppercase;
  word-break: break-word;
  margin: 0;
}
```

### The small "vs" connector
The "vs" between two city names is dramatically smaller than the city names so the cities visually dominate. Apply inline on a span inside the h1:
```html
<span class="city-a">Paris</span>
<span style="color: var(--color-text-muted); font-weight: 400;
             font-size: 0.4em; vertical-align: 0.55em; letter-spacing: 0;">vs</span>
<span class="city-b">London</span>
```

### Side-by-side table grid (below the split)
```css
.data-table {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border-top: 1px solid var(--color-border);
}
.col {
  padding: 24px;
  background: #fff;
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  border-left: 1px solid var(--color-border);
}
.col:last-child { border-left: none; }  /* avoid double border */
.col h2 {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 56px;
  letter-spacing: -0.03em;
  margin: 0 0 4px 0;
  text-transform: uppercase;
  line-height: 0.92;
}
.col .country {
  font-size: 18px;
  color: var(--color-text-muted);
  margin-bottom: 16px;
}
```

## HTML Structure

```html
<div class="page">
  <div class="breadcrumb">CLIMATO · COMPARE</div>

  <div style="margin-bottom: 36px;">
    <h1 class="display" style="font-size: clamp(80px, 13vw, 168px); ...">
      <span class="city-a">Paris</span>
      <span style="font-size: 0.4em; vertical-align: 0.55em; ...">vs</span>
      <span class="city-b">London</span>
    </h1>
    <div style="font-size: 22px; color: var(--color-text-muted);">
      When should you visit each — and when are both ideal?
    </div>
  </div>

  <div class="split-layout">
    <div class="sticky-cal">
      <!-- Best-months calendar (see references/calendar-component.md) -->
    </div>
    <div>
      <!-- Versus diptych (see references/versus-component.md) -->
      <!-- Chart, narrative -->
    </div>
  </div>

  <!-- Full-width tables below the split -->
  <div class="data-table">
    <div class="col"><h2>Paris</h2><table>...</table></div>
    <div class="col"><h2>London</h2><table>...</table></div>
  </div>
</div>
```

## What to Avoid

- **Calendar Hero (Sketch 001 A)** — Pure data-forward, calendar fills the fold, stats and chart stack below. Felt too utilitarian and lacked the editorial framing that fits Climato.
- **Verdict + Calendar (Sketch 001 B)** — A pulled-quote verdict band between hero and calendar. The verdict competed with the calendar for attention rather than supporting it; reading order felt cluttered.
- **Stacked tables in the right column** — The early version of C had two stacked tables inside the right column (~820px wide). Each table got squeezed; the side-by-side comparison was lost. Tables must be full-width below the split.
- **Brand red as a city accent** — Using `#cc3b1f` (Climato brand red) for one of the two cities reads as alarm/danger. Brand red is single-voice and must stay reserved for verdict-word emphasis only. See `feedback_colors_brand_red` memory.

## Stress-Test Considerations

Long city names stress the hero headline. The `clamp(80px, 13vw, 168px)` scales down gracefully on narrow viewports, and `word-break: break-word` prevents overflow. Tested against:
- Reykjavík / Bratislava (medium, with diacritics)
- Saint Petersburg / Christchurch (long)
- Cluj-Napoca / Frankfurt am Main (hyphenated, multi-word)
- San Cristóbal de las Casas / Vereeniging (extreme)

The toolbar in Sketch 001 has a swap dropdown for re-testing.

## Origin

Synthesized from sketch: **001-page-structure** (Variant C — Sticky Calendar Split).
Source file: `sources/001-page-structure/index.html`
