# Comparison Pages — Implementation Plan

**Goal:** Ship `/compare/{country-a}/{city-a}/vs/{country-b}/{city-b}` as a new high-SEO route on Climato. Built against the sketch findings in [.claude/skills/sketch-findings-climato/](../.claude/skills/sketch-findings-climato/).

**Estimated scope:** 6 tasks, ~1 day of focused work. No backend changes (all data is derived from existing per-city Open-Meteo cache).

## URL Shape

```
/compare/{country-a}/{city-a}/vs/{country-b}/{city-b}
/compare/{country-a}/{admin1-a}/{city-a}/vs/{country-b}/{admin1-b}/{city-b}   (when either city needs admin1 disambiguation)
```

Examples:
- `/compare/france/paris/vs/uk/london`
- `/compare/japan/tokyo/vs/usa/illinois/chicago`

Both halves of the URL are built from the **same canonical slug logic** in [src/lib/slug.ts](src/lib/slug.ts) that single-city pages already use — so the canonical URL collapses neatly with the rest of the site.

**Decision: separator is `/vs/`** (not `--` or `-vs-`). Two reasons: (1) `vs` is its own URL segment, which means we can detect comparison routes by `segs.includes('vs')` rather than parsing slug content; (2) any keyword in a URL segment helps SEO and "vs" is the most-searched comparison preposition.

## Task Breakdown

### Wave 1 — Foundation (parallel-safe)

#### Task 1.1 — Routing
**Files:** [src/lib/route.ts](src/lib/route.ts), [src/lib/slug.ts](src/lib/slug.ts)

Extend `ParsedUrl`:
```ts
export type ParsedUrl =
  | { type: 'root' }
  | { type: 'slug'; countrySlug: string; admin1Slug?: string; citySlug: string; ll?: [number, number] }
  | { type: 'compare'; a: ParsedSlug; b: ParsedSlug }   // NEW

interface ParsedSlug { countrySlug: string; admin1Slug?: string; citySlug: string }
```

In `parseUrl()`, detect comparison routes by scanning for `compare` at `segs[0]` and `vs` somewhere after position 2:
- Reject if `segs[0] !== 'compare'`
- Reject if total segs is not in `{5, 6, 7}` (compare + 2/3 + vs + 2/3)
- Find `vs` index; everything before is `a` (offset by 1 for `compare`), everything after is `b`
- Both halves must be 2 or 3 segments (with/without admin1)

Add a helper:
```ts
export function toCompareSlug(a: GeoCity, b: GeoCity): CityUrl {
  const aPath = toSlug(a).path.slice(1)   // 'france/paris'
  const bPath = toSlug(b).path.slice(1)   // 'uk/london'
  return { path: `/compare/${aPath}/vs/${bPath}`, query: '' }
}
```

(No `?@lat,lon` query — coords aren't useful here since geocoding will re-resolve both cities by slug.)

#### Task 1.2 — Suitability scoring → 0–3 bucket
**Files:** [src/lib/climate-summary.ts](src/lib/climate-summary.ts) (extend, don't fork)

The existing `scoreMonth(city, i)` returns 0..1 (specifically: 0, 0.3, 0.4, 0.5, 0.7, 1). The calendar component expects 0..3 discrete classes (`.s0` / `.s1` / `.s2` / `.s3`).

Add a public bucketing helper:
```ts
export function suitabilityClass(score: number): 0 | 1 | 2 | 3 {
  if (score >= 1)   return 3   // ideal
  if (score >= 0.7) return 2   // workable
  if (score >= 0.3) return 1   // poor
  return 0                      // bad
}

export function monthlySuitability(city: City): (0 | 1 | 2 | 3)[] {
  return Array.from({ length: 12 }, (_, i) => suitabilityClass(scoreMonth(city, i)))
}
```

`scoreMonth` itself stays internal (currently it is). Export it OR keep `monthlySuitability` as the only public API.

#### Task 1.3 — Differential helpers
**Files:** [src/lib/comparison.ts](src/lib/comparison.ts) (new)

Pure-functional comparison derivations. No side effects.

```ts
export interface ComparisonStat {
  label: string
  aValue: number
  bValue: number
  unit: string
  delta: string          // "+2.0°" — already signed and formatted
  winner: 'a' | 'b' | 'tie'
}

export interface ComparisonResult {
  stats: ComparisonStat[]
  overlapMonths: number[]      // months where BOTH cities score 3
  overlapFormatted: string     // "May–August"
}

export function compareCities(a: City, b: City): ComparisonResult
```

Stats include: AVG HIGH (annual), ANNUAL RAIN (mm/year sum), SUN HRS/DAY (annual average), and the PEAK OVERLAP row.

### Wave 2 — UI Components (depends on Wave 1)

#### Task 2.1 — `<BestMonthsCalendar>` component
**Files:** [src/components/BestMonthsCalendar.tsx](src/components/BestMonthsCalendar.tsx) (new)

Reusable component. Takes two cities + an optional `variant: 'sidebar' | 'wide'`. Renders the 3-row heatmap exactly as the sketch in [sources/002-best-months-calendar/index.html](.claude/skills/sketch-findings-climato/sources/002-best-months-calendar/index.html).

Props:
```ts
interface Props {
  a: City
  b: City
  variant?: 'sidebar' | 'wide'   // default 'sidebar'
}
```

Internally:
- Calls `monthlySuitability(a)` and `monthlySuitability(b)`
- Derives the `★ both` row inline
- Uses the CSS color tokens (`--color-city-a`, `--color-city-b`, `--color-overlap`) which need to be added to the global theme — see Task 2.4

#### Task 2.2 — `<VersusDiptych>` component
**Files:** [src/components/VersusDiptych.tsx](src/components/VersusDiptych.tsx) (new)

Takes `ComparisonResult` and renders the diptych per [sources/003-headline-stat-band/index.html](.claude/skills/sketch-findings-climato/sources/003-headline-stat-band/index.html). Includes the persistent city header row (city name + country) and the per-metric face-off rows.

#### Task 2.3 — `<ComparisonPage>` page component
**Files:** [src/components/ComparisonPage.tsx](src/components/ComparisonPage.tsx) (new)

Pulls it all together per [sources/001-page-structure/index.html](.claude/skills/sketch-findings-climato/sources/001-page-structure/index.html) Variant C:
- Hero headline (`Paris vs London` at clamp scale)
- Split layout with sticky `<BestMonthsCalendar variant="sidebar">` on the left
- Right column: `<VersusDiptych>` → monthly bar chart (reuse `MonthlyChart` or build a 2-series version) → narrative paragraph
- Full-width side-by-side monthly tables below, reusing the existing Monthly Breakdown table component from [src/components/ClimateNarrative.tsx](src/components/ClimateNarrative.tsx)

#### Task 2.4 — Theme tokens
**Files:** [src/index.css](src/index.css) or wherever global CSS lives

Add the new color tokens to `:root`:
```css
--color-city-a: #1d5a52;   /* deep teal */
--color-city-b: #b08229;   /* warm ochre */
--color-overlap: #5a6240;  /* muted olive */
```

These need to be available globally so all comparison components can use them. The Climato brand red (`#cc3b1f`) stays the single brand accent — these new tokens are additions, not replacements.

### Wave 3 — Integration & SEO (depends on Wave 2)

#### Task 3.1 — Wire into `useUrlSync` and `App.tsx`
**Files:** [src/lib/route.ts](src/lib/route.ts), [src/App.tsx](src/App.tsx)

`useUrlSync` needs a parallel path for `{ type: 'compare', a, b }`:
- Resolve BOTH cities via `resolveSlugViaGeocoding` in parallel (`Promise.all`)
- Set both into the zustand store (extend store to hold an optional "comparison" pair OR create a separate `comparisonStore`)
- `App.tsx` renders `<ComparisonPage>` when the store has a comparison pair, otherwise the existing single-city variations

Both cities also need their climate normals — call the existing `useClimateNormals` hook for each in parallel inside `<ComparisonPage>`. Since normals are cached by id, this is cheap.

#### Task 3.2 — SEO meta + JSON-LD
**Files:** [src/hooks/useDocumentMeta.ts](src/hooks/useDocumentMeta.ts)

Add a comparison-page branch:
- Title: `{CityA} vs {CityB} — Climate Comparison · Climato`
- Description: `Compare monthly weather averages, temperature, rainfall and sunshine for {CityA} and {CityB}. {CityA} is {X}°C warmer on average. Best months for both: {overlap}.`
- Canonical URL: `https://climato.smoxu.com/compare/{a}/vs/{b}` (no query)
- JSON-LD: emit two `Dataset` nodes (one per city) plus a `BreadcrumbList` (Climato → Compare → A vs B)
- OG image: per-comparison image via `/api/og?compare=true&a=...&b=...` (Task 3.4 — optional, defer if low-leverage)

#### Task 3.3 — Sitemap
**Files:** [vite.config.ts](vite.config.ts) `seoFiles()` plugin

Pre-generate the top-N comparison pairs. **Decision: top 50 city × top 50 city = ~1225 unique pairs.** Capped, predictable, and big enough to seed Google's index.

Inside `seoFiles()` build step:
```ts
// Select top N curated/catalog cities, generate pairs, add to sitemap.
const top = items
  .filter(it => it.isCurated || it.population >= 500_000)
  .sort((a, b) => (b.isCurated ? 1 : 0) - (a.isCurated ? 1 : 0) || b.population - a.population)
  .slice(0, 50)

for (let i = 0; i < top.length; i++) {
  for (let j = i + 1; j < top.length; j++) {
    const aPath = paths.get(top[i])?.slice(1)
    const bPath = paths.get(top[j])?.slice(1)
    if (!aPath || !bPath) continue
    urls.push({
      loc: `${siteUrl}/compare/${aPath}/vs/${bPath}`,
      priority: '0.5',
      changefreq: 'monthly',
      lastmod: buildDate,
    })
  }
}
```

(Comparison pages get lower priority `0.5` since single-city pages remain the primary surface.)

#### Task 3.4 — (Optional, defer) Per-comparison OG image
**Files:** [api/og.tsx](api/og.tsx), [middleware.ts](middleware.ts)

Extend the existing OG endpoint to support `compare=true&a=...&b=...` mode. Render a 1200×630 image with both city names + the headline differential.

**Defer if time-pressed.** A fallback to a generic Climato OG works fine for v1.

## What's Out of Scope (deferred)

- **Mobile-specific calendar layout** — Initial impl uses the same component but with the `wide` variant when viewport < 768px. Tune later based on real usage.
- **Comparison "explore" navigation** — A future page that lets users browse "popular comparisons" or "compare with X" buttons on single-city pages. Not needed for v1.
- **Coordinates in URL** — `?@lat,lon` works for single-city URLs because geocoding can be slow; for comparisons, both halves are resolved by slug. No coord query needed.
- **Cooler-alternative pick** — `BestMonthsResult.coolerAlt` exists in `climate-summary.ts` but the comparison page doesn't need it.

## Open Questions to Resolve Before / During Build

1. **Where do CSS variables live?** Climato has inline `style={{}}` in components currently — there's no central `src/index.css` for tokens. Either (a) add a small `src/styles/tokens.css` imported in `main.tsx`, or (b) define the new colors as TS constants in a `src/lib/colors.ts` module and import them where needed. **Recommendation: option (b)** — matches the existing pattern of inline-style components in VariationA/B/C.
2. **Store shape** — extend `weatherStore` with a comparison pair, or build a separate `comparisonStore`? **Recommendation: separate store.** Less risk of mixed-state bugs; the comparison page is a distinct route.
3. **Monthly chart for two cities** — reuse `MonthlyChart` (currently single-city)? Or write a `MonthlyChartCompare` with both series? **Recommendation: new component.** Easier than retrofitting the existing single-series logic, especially since the comparison case wants both bars side-by-side per month.

## Implementation Order Cheat-Sheet

```
Day 1 morning:
  1.1 Routing (parseUrl, toCompareSlug)
  1.2 monthlySuitability helper
  1.3 compareCities helper

Day 1 afternoon:
  2.4 Theme tokens (one-line)
  2.1 BestMonthsCalendar
  2.2 VersusDiptych
  2.3 ComparisonPage (assembles 2.1 + 2.2 + tables)

Day 1 evening / Day 2:
  3.1 Wire into useUrlSync + App.tsx
  3.2 SEO meta + JSON-LD
  3.3 Sitemap
  3.4 (Optional) OG image
```

## Verification Criteria

- [ ] Visiting `/compare/france/paris/vs/uk/london` renders the comparison page
- [ ] Both cities' climate normals load (test with curated cities — Paris isn't curated, London is — pick a curated × curated pair if needed for the first test)
- [ ] The sticky calendar stays pinned while the right column scrolls
- [ ] All 4 stat rows render correctly in the diptych
- [ ] Side-by-side monthly tables render in full width below the split
- [ ] `view-source` shows `<title>`, `<meta description>`, canonical, and both `Dataset` JSON-LD nodes
- [ ] `npm run build` emits the comparison pairs in `dist/sitemap.xml`
- [ ] Existing single-city routes still work unchanged
- [ ] Hero headline doesn't overflow with the longest city pair tested in Sketch 001

## Risk Notes

- **Geocoding rate limits** — Each comparison-page visit triggers TWO `resolveSlugViaGeocoding` calls in parallel. If the route gets heavy traffic before pairs are catalog-resolved, Open-Meteo's geocoder might rate-limit. Mitigation: catalog-resolution already covers most pairs; uncatalogued pairs fall back to per-visit fetch which is already the model.
- **Sitemap bloat** — 1225 comparison URLs added to the sitemap on top of ~6k city URLs. Google's sitemap limit is 50k URLs / 50MB, so we have headroom. Monitor `dist/sitemap.xml` size after first build.
- **Long city names** — Already stress-tested in Sketch 001. The `clamp(80px, 13vw, 168px)` headline handles 36-char pairs gracefully. Worst case the hero wraps to two lines.
