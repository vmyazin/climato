# Comparison Entry Points — Design Spec

**Date:** 2026-05-18
**Topic:** Hero-area UI affordance that lets a user on a single-city page jump to a `/compare/{a}/vs/{b}` comparison page.
**Status:** ✅ Shipped (2026-05-18). 11 atomic commits from `8aceccd` (popular-pairs data) through `c394748` (a11y polish). End-to-end verified at desktop + mobile across all three variations, seed + long-tail source cities, chip-click + search-typeahead navigation, and browser back-navigation.

## Context

`/compare/{a}/vs/{b}` exists end-to-end (route, components, sitemap, OG image) as of commits `8b55077…dbd4f4b` (see `.planning/COMPARISON-PAGES-PLAN.md`). However, **zero entry-point affordances exist in the running app** — users can only reach a comparison page via direct URL or a search-engine result. This spec adds a discoverable in-app entry point.

## Goal

When a user is reading about a single city, give them a low-friction, in-place way to start a comparison without leaving the page or going through a separate "compare" surface.

## Primary intent

`"Compare-with-this"` from a city page — entry point lives on the highest-traffic surface (the single-city page) and builds on the existing audience. Out of scope for v1: a home-page picker, a `/compare` landing page, smart search-bar parsing.

## User flow

1. User is reading the page for City A (e.g. Tokyo).
2. In the hero area, they see a compact pill: `↔ Compare with …`
3. They hover (desktop) or tap (mobile) the pill. It expands inline to reveal:
   - 6 suggested city chips (2 nearby + 2 climate-similar + 2 popular pairings)
   - A search input (typeahead via existing geocoding)
4. They click a chip or submit a search query.
5. The browser navigates to `/compare/{country-a}/{city-a}/vs/{country-b}/{city-b}`. The existing `useUrlSync` + `<ComparisonPage>` handle the rest.

## Architecture

### New components & hooks

| Path | Responsibility |
|------|----------------|
| `src/components/CompareWithPill.tsx` | Resting pill + expanded state container + selection handler |
| `src/hooks/useCompareSuggestions.ts` | Returns the 6 picks (2 nearby + 2 climate-similar + 2 popular) |
| `src/data/popular-compare-pairs.ts` | Editorial-curated map of anchor cities → their popular comparison partners |

### Component placement

`<CompareWithPill>` is rendered inside the hero block of each existing variation:

- `src/components/VariationA.tsx` (the `/* Hero row */` block)
- `src/components/VariationB.tsx` (the `/* HERO */` block)
- `src/components/VariationC.tsx` (the right-column `<div>` that holds the city name)
- `src/components/CityHeroFallback.tsx` (optional — the loading-state placeholder)

The pill itself stays compact in the resting state so it doesn't disturb the editorial hero typography that each variation has already settled on.

### Component hierarchy

```
<VariationA city={...}>
  …existing hero markup…
  <CompareWithPill currentCity={city}>
    <PillResting />          // ↔ Compare with …
    <PillExpanded>           // appears on hover/focus/tap
      <SuggestionStrip />    // 6 chips, color-tinted by source bucket
      <CompareSearchInput /> // typeahead, reuses CitySearch internals
    </PillExpanded>
  </CompareWithPill>
</VariationA>
```

### Data flow

```
city (from useClimateNormals)
   │
   ▼
useCompareSuggestions(city)
   │
   ├── /api/nearby?id={city.id}  ──────────────▶  nearby[]
   ├── climate-similar (sync, against bundled catalog) ──▶  climateSimilar[]
   └── popular-compare-pairs lookup ──────────▶  popular[]
   │
   ▼
dedup + backfill → final 6 chips
```

## Suggestion engine

### Source A — Nearby (2 cities)

Reuses the existing `/api/nearby` endpoint (already serving `<NearbyCitiesSection>`). Takes the top-2 results, filtered to:
- Distance ≥ 50 km (excludes same-metro suggestions like Versailles–Paris)
- Distance ≤ 600 km (matches the existing nearby ceiling)

### Source B — Climate-similar (2 cities)

Pure-functional, no extra fetch. Algorithm:

1. Compute the current city's *climate signature*: `(classifyClimate(), peakHigh, annualPrecipMm, avgSun)` — all derived via helpers already in `src/lib/climate-summary.ts`.
2. Score every catalog city (`data/cities.tsv`, bundled in the SPA) by Euclidean distance in normalized 3-d (peakHigh, precip, sun) space, restricted to the same `ClimateType`.
3. Filter:
   - Population ≥ 200,000 (suggestions should be real destinations)
   - Distance from current city ≥ 1,500 km (avoid overlap with the nearby bucket)
   - Exclude the current city itself
4. Take the top 2 by score.

Runs in the browser against the bundled catalog. No new API call. After first page-load the catalog is in memory, so suggestion compute is sub-millisecond.

### Source C — Popular pairings (2 cities)

Editorial-curated lookup. `data/popular-compare-pairs.ts`:

```ts
export const POPULAR_PAIRS: Record<string, string[]> = {
  paris:    ['london', 'rome', 'madrid', 'barcelona'],
  tokyo:    ['seoul', 'beijing', 'osaka', 'singapore'],
  london:   ['paris', 'amsterdam', 'edinburgh', 'dublin'],
  // … ~50–100 anchor cities, each with 3–5 frequent comparison partners
}

export const GLOBAL_TOP_PAIRS = [
  ['paris', 'london'],
  ['tokyo', 'seoul'],
  ['nyc',   'los-angeles'],
  // … fallback for long-tail cities
]
```

Keyed by the city's slug. Surface 2 entries. If the current city isn't in the map (long-tail), the popular bucket falls back to entries from `GLOBAL_TOP_PAIRS` so every city still has 2 popular suggestions.

### Dedup + backfill

Buckets run in parallel. Final list:

1. Concatenate in priority order: `nearby + climateSimilar + popular`
2. Deduplicate by city id — first occurrence wins.
3. If any bucket is short after dedup, backfill from the next bucket.
4. Final length is always 6 (or fewer only in the degenerate case where everything fails).

### Source identification in UI

Each chip carries its source bucket as a small mono-label tag:
- `NEAR` (teal)
- `LIKE`  (olive)
- `POP` (muted gray)

This educates users about *why* a suggestion is there without cluttering the chip.

## Interaction model

### Resting state

A compact pill in the hero area:

```
↔ Compare with …
```

Styling matches the existing mono-label convention: `JetBrains Mono`, 11–12px, letter-spacing 1.5px, 1px border, hover-darken transition. The arrow icon (`↔`) reinforces the two-way nature of the comparison.

### Expansion mechanic

Inline expansion — **not a modal, not a drawer**. The pill grows into a wider strip directly below the hero. Pushes the rest of the page content down via natural document flow; no layered overlay, no scroll-locking.

| Trigger | Behavior |
|---------|----------|
| Desktop hover on pill | Expand after 100ms |
| Desktop unhover | Collapse after 300ms grace (prevents flicker when reaching for a chip) |
| Tap on pill (touch) | Toggle |
| Tap outside expanded region | Collapse |
| Keyboard focus on pill | Expand (treat focus like hover) |
| Escape key | Collapse and refocus the pill |

### Selection action

Both chip click and search submit call the same handler:

```ts
function onSelectComparePartner(other: GeoCity) {
  if (other.id === currentCity.id) return // defensive — should never happen
  const { path } = toCompareSlug(currentCity, other)
  window.history.pushState(null, '', path)
  // pushState does NOT fire popstate natively, so useUrlSync needs an
  // explicit nudge — see Open Implementation Question #1 for the resolution.
  triggerUrlSyncResolve()
}
```

The `triggerUrlSyncResolve()` mechanism is unresolved (Open Implementation Question #1 below). Candidate approaches: expose a `useUrlSync.refresh()` callback, dispatch a custom DOM event, or just re-read the URL via a polling effect. Picked during planning.

### Search input

The expanded strip's search input reuses `<CitySearch>` (already in `src/components/CitySearch.tsx`). It already does:
- Typeahead via Open-Meteo geocoding
- Result list with country/admin1 disambiguation
- Keyboard navigation

The only adaptation for `<CompareWithPill>` is overriding the `onSelect` handler — instead of `setCity()` (the single-city navigation), it calls `onSelectComparePartner()` (the comparison navigation).

## Edge cases

| Case | Behavior |
|------|----------|
| Placeholder city (`lat === 0 && lon === 0`) | Pill is hidden entirely; render only when `isResolvedCity()` is true |
| Climate normals not yet loaded | Pill renders with skeleton chips; chips become live once `useClimateNormals` resolves |
| 0 nearby results (isolated cities like Reykjavík) | "nearby" bucket is empty; dedup+backfill pulls extra from climate-similar |
| 0 climate-similar results (extreme outliers in the catalog) | Widen filter to "any climate type, population ≥ 500k"; if still empty, backfill from popular |
| Current city has no `POPULAR_PAIRS` entry (long-tail) | Use `GLOBAL_TOP_PAIRS` for the popular bucket |
| `/api/nearby` request fails | Skip the bucket, log to console, backfill silently from the other two |
| User is currently on `/compare/...` | Pill is not rendered (`<ComparisonPage>` doesn't include it) — no compare-with-this affordance needed from the comparison page itself |
| Suggested city matches current city (dedup didn't catch) | `onSelectComparePartner` no-ops |
| Search returns no match | `<CitySearch>`'s existing no-results state |

## Out of scope for v1

These were discussed and deferred:

- **Reverse-compare affordance on the comparison page itself.** A "compare with another city" mechanic when already on `/compare/...`. Adds nav complexity; add later if usage data shows it.
- **Recently-compared history** in localStorage. Defer until traffic justifies the need.
- **Share-pair button with referral tracking.** No referral conversation is active.
- **Per-variation hero layout adjustments.** The pill should fit naturally into A/B/C as a small inline element. If integration is awkward, that's a sketch problem, not a brainstorm problem.
- **Other entry points** — home-page picker, `/compare` landing, search-bar smart parsing. Roadmap, not v1.

## Testing strategy

### Unit-testable (pure functions)

- `useCompareSuggestions` core logic — given a city + a mock catalog + a mock nearby response, returns the expected 6 city ids.
- Climate-similarity scoring — given two cities, score is deterministic and reproducible.
- Dedup + backfill — given overlapping buckets, the final list is 6 unique ids in the expected order.

### Integration / browser

- Skip dedicated browser tests for v1.
- Existing Playwright check (load `/compare/france/paris/vs/uk/london`) still applies as the end-to-end smoke test.
- Add one Playwright check that:
  1. Visits a single-city page (`/france/paris`)
  2. Clicks/focuses the Compare pill
  3. Verifies 6 chips render
  4. Clicks one chip
  5. Verifies the URL changes to `/compare/france/paris/vs/...` and `<ComparisonPage>` renders

## Open implementation questions — RESOLVED

1. **`history.pushState` doesn't fire `popstate`.** ✅ Resolved with a custom event. `src/lib/route.ts` exports `notifyUrlChange()` which dispatches a `climato:urlchange` event; `useUrlSync` listens for both `popstate` and the custom event. `<CompareWithPill>` calls `notifyUrlChange()` after each `pushState`.
2. **Catalog access from the browser.** ✅ Resolved by scoping climate-similarity to the existing seed-CITIES pool (`src/data/cities.ts`, 18 cities) for v1. The seed pool is global and diverse enough for reasonable matches; catalog-wide similarity is deferred until traffic data suggests it's worth the bundle-size cost.
3. **Where exactly the pill sits in each variation's hero.** ✅ Resolved through iterative visual feedback during implementation:
   - VariationA: top-right of the coords/temp row (flexbox with `justify-content: space-between`), `align="right"`
   - VariationB: inside the absolute-positioned HIGH/LOW overlay on the desktop hero (with `pointerEvents:auto` to re-enable interaction); same in the mobile flex column. `align="right"`
   - VariationC: inside the editorial right column under the `CurrentTempBadge`, default `align="left"`
   - Viewport-aware alignment overrides the explicit `align` prop if the panel would overflow.

## Files we'll touch (preview)

| File | Change |
|------|--------|
| `src/components/CompareWithPill.tsx` | NEW |
| `src/hooks/useCompareSuggestions.ts` | NEW |
| `src/data/popular-compare-pairs.ts` | NEW (matches `src/data/cities.ts` convention for editorial seed data) |
| `src/components/VariationA.tsx` | Add `<CompareWithPill>` to the hero block |
| `src/components/VariationB.tsx` | Add `<CompareWithPill>` to the hero block |
| `src/components/VariationC.tsx` | Add `<CompareWithPill>` to the hero block |
| `src/lib/route.ts` | Possibly expose a `refresh()` for the URL-sync (open question #1) |
| `src/lib/climate-summary.ts` | Possibly extend with `climateSignature()` helper |
| `src/components/CitySearch.tsx` | Add optional `onSelect` override prop (currently hard-wired to weatherStore) |

## Success criteria

- A user on `/france/paris` can see and interact with the Compare pill.
- Tapping/clicking the pill reveals 6 suggestion chips + a search input.
- The chips are populated by the mixed strategy (2 nearby + 2 climate-similar + 2 popular).
- Clicking a chip navigates to the corresponding `/compare/...` page and the existing `<ComparisonPage>` renders.
- The single-city flow (no comparison) continues to work unchanged.
- No regressions in build, type-check, or sitemap generation.
