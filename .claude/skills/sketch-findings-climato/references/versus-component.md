# Versus Comparison Component (Diptych)

## Design Decisions

### Component: Versus Diptych (Sketch 003 Variant C)

The headline stat band is rendered as a **diptych** — a vertical stack of face-off rows, each comparing one metric between the two cities. A persistent city subheading row at the top anchors which side is which.

**Structure (top to bottom):**
1. **City header row** — bold display-type city names + country sub-line + small "vs" connector in center
2. **One "duel" row per metric** — left side: city A value · center "referee" column: metric label + differential + winner arrow · right side: city B value
3. **Optional final row** — shared / overlap stat (e.g. "Peak overlap: May–August · 4 months") with olive-tinted background

The center column functions as the metric label AND the differential summary in one place, so each side of each row contains just the value (the metric is shared by both sides).

### Why this won
- **Mirrors page identity** — `PARIS vs LONDON` reads literally as a face-off
- **Each metric is its own readable face-off** — no requirement to scan multiple columns to find the comparison
- **Differentiated from existing Climato patterns** — VariationA's 4-up stat-card grid is great for single-city summary; the diptych is purpose-built for two-city comparison
- **Handles mixed comparisons** — if some metrics favor City A and others City B, each row shows the winner independently. No requirement that one city dominates.

## CSS Patterns

### Container
```css
.diptych {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--color-border);
  background: #fff;
}
```

### Duel row (the face-off layout)
```css
.duel {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: stretch;
  border-bottom: 1px solid var(--color-border-soft);
}
.duel:last-child { border-bottom: none; }

.duel .side {
  padding: 18px 24px;
  display: flex; flex-direction: column;
  justify-content: center;
}
.duel .side.right { text-align: right; }

.duel .side .city-tag {  /* metric label per side */
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.duel .side .num {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 40px;
  line-height: 0.95;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.duel .side .num .unit {
  font-size: 18px;
  color: var(--color-text-muted);
  font-weight: 500;
  margin-left: 2px;
}

.duel .center {
  padding: 12px 18px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 4px;
  border-left: 1px solid var(--color-border-soft);
  border-right: 1px solid var(--color-border-soft);
  background: rgba(17,17,17,0.02);
  min-width: 140px;
}
.duel .center .center-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 1.5px;
  color: var(--color-text-muted);
  text-transform: uppercase;
}
.duel .center .center-delta {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  letter-spacing: -0.01em;
  color: var(--color-accent);   /* brand red — verdict emphasis */
  font-variant-numeric: tabular-nums;
}
.duel .center .winner-arrow {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
```

### Persistent city header row
The diptych ALWAYS opens with this header so the column owners are unambiguous:
```css
.diptych-header {
  border-bottom: 2px solid var(--color-text);   /* bolder separator */
  background: rgba(0,0,0,0.02);
}
.diptych-header .side { padding: 22px 24px; }
.diptych-header .city-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 56px;
  line-height: 0.88;
  letter-spacing: -0.035em;
  margin: 0;
  text-transform: uppercase;
}
.diptych-header .country {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 1.5px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  margin-top: 10px;
}
.diptych-header .center {
  background: transparent;
  border-left: none; border-right: none;
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 22px;
  color: var(--color-text-muted);
  letter-spacing: 1px;
  padding: 22px 18px;
  align-items: center; justify-content: center;
  min-width: 140px;
}
```

## HTML Structure

```html
<div class="diptych">
  <!-- Persistent city header -->
  <div class="duel diptych-header">
    <div class="side">
      <h2 class="city-name city-a">Paris</h2>
      <div class="country">FRANCE · ÎLE-DE-FRANCE</div>
    </div>
    <div class="center">vs</div>
    <div class="side right">
      <h2 class="city-name city-b">London</h2>
      <div class="country">UNITED KINGDOM · ENGLAND</div>
    </div>
  </div>

  <!-- One duel row per metric -->
  <div class="duel">
    <div class="side">
      <div class="city-tag city-a">AVG HIGH</div>
      <div class="num city-a">15.6<span class="unit">°C</span></div>
    </div>
    <div class="center">
      <div class="center-label">DIFFERENCE</div>
      <div class="center-delta">+2.0°</div>
      <div class="winner-arrow city-a">◀ PARIS</div>
    </div>
    <div class="side right">
      <div class="city-tag city-b">AVG HIGH</div>
      <div class="num city-b">13.6<span class="unit">°C</span></div>
    </div>
  </div>

  <!-- Repeat for ANNUAL RAIN, SUN / DAY, etc. -->

  <!-- Optional final row: shared overlap stat -->
  <div class="duel" style="background: rgba(90, 98, 64, 0.04);">
    <div class="side">
      <div class="city-tag" style="color: var(--color-overlap);">PEAK OVERLAP</div>
      <div class="num" style="color: var(--color-overlap);">May–August</div>
    </div>
    <div class="center">
      <div class="center-label">SHARED IDEAL</div>
      <div class="center-delta" style="color: var(--color-overlap);">4 MO</div>
      <div class="winner-arrow" style="color: var(--color-overlap);">★ BOTH</div>
    </div>
    <div class="side right">
      <div class="city-tag" style="color: var(--color-overlap);">PEAK OVERLAP</div>
      <div class="num" style="color: var(--color-overlap);">May–August</div>
    </div>
  </div>
</div>
```

## Winner-Arrow Convention

The center `.winner-arrow` uses a directional arrow + city name:
- `◀ PARIS` — arrow points left, indicates City A wins this metric
- `LONDON ▶` — arrow points right, indicates City B wins this metric
- `★ BOTH` (or similar) — for shared/overlap rows

Color the winner arrow with the winning city's class (`.city-a` or `.city-b`) so the eye picks up the winning side without reading the text.

## What to Avoid

- **Big-typography stat cards 4-up grid (Sketch 003 A)** — Familiar from Climato VariationA, neutral and data-forward, but feels like a single-city summary rather than a comparison. Slashed pairs (`15.6 / 13.6 °C`) require the reader to do the subtraction.
- **Verdict sentences (Sketch 003 B)** — Each stat written as English ("Paris runs 2°C warmer on average"). Highest conversion clarity, but hides raw numbers — bad for SEO (no digits in the hero band) and brittle when the comparison is mixed.
- **City-name prefix on per-row metric labels** — Earlier version had each side's tag say "PARIS · AVG HIGH" / "LONDON · AVG HIGH". Once the persistent header is in place, the city prefix becomes redundant — strip it. Just say "AVG HIGH" on each side (tinted by city color).

## Data Shape

```ts
interface DiptychStat {
  label: string;        // "AVG HIGH"
  cityAValue: string;   // "15.6"
  cityBValue: string;
  unit: string;         // "°C"
  delta: string;        // "+2.0°"  (already formatted with sign)
  winner: 'a' | 'b' | 'tie';
}

interface DiptychOverlapRow {
  label: string;          // "PEAK OVERLAP"
  sharedValue: string;    // "May–August"
  centerLabel: string;    // "SHARED IDEAL"
  centerDelta: string;    // "4 MO"
  centerArrow: string;    // "★ BOTH"
}
```

## Origin

Synthesized from sketch: **003-headline-stat-band** (Variant C — Versus Diptych, with city-subheading iteration).
Source file: `sources/003-headline-stat-band/index.html`
