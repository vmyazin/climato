# URL Slugs — Design

**Status:** approved, ready for plan
**Date:** 2026-04-27

## Goal

Give every city a shareable, SEO-friendly URL of the form
`/{country}/{admin1?}/{city}` — e.g. `/usa/massachusetts/beverly`,
`/russia/moscow`, `/brazil/santa-catarina/florianopolis`. Cold loads
must work without a server (Vercel rewrites everything to `index.html`),
must resolve fast when coords are present, and must degrade gracefully
when they aren't.

## Non-goals

- No SSR / static generation — bots see slug structure but not server-rendered city data.
- No JSON-LD or per-city meta-tag injection.
- No localized (Cyrillic/CJK) slugs — everything ASCII.
- No popular-cities sitemap.
- No router library — hand-rolled to keep bundle small.

## URL shape

```
/                                           → falls back to localStorage or default city
/{country}/{city}                           → when admin1 == city name (Moscow rule)
/{country}/{admin1}/{city}                  → general case
…?@{lat},{lon}                              → optional canonical coordinates
```

Examples:

| Resolved city                        | URL                                                |
|--------------------------------------|----------------------------------------------------|
| Beverly, MA, USA                     | `/usa/massachusetts/beverly?@42.55,-70.88`         |
| Moscow, Russia (admin1 == "Moscow")  | `/russia/moscow?@55.76,37.62`                      |
| Florianópolis, Santa Catarina, BR    | `/brazil/santa-catarina/florianopolis?@-27.60,-48.55` |

## Slugify rules

```
slugify(s):
  1. NFD-normalize, strip combining marks (diacritics)
  2. lowercase
  3. replace any [^a-z0-9] run with `-`
  4. trim leading/trailing `-`
```

`Reykjavík` → `reykjavik`, `Florianópolis` → `florianopolis`,
`St. John's` → `st-johns`, `São Paulo` → `sao-paulo`.

## Country aliases

A small reverse-mappable table for countries whose API name is verbose
or awkward as a slug:

```ts
const COUNTRY_ALIASES: Record<string, string> = {
  'United States': 'usa',
  'United Kingdom': 'uk',
  'United Arab Emirates': 'uae',
  'South Korea': 'south-korea',
  'North Korea': 'north-korea',
}
```

Anything not in the map is `slugify(country)`. Reverse direction (slug
→ canonical name) compares the parsed slug against the alias values
first, falls back to slugified API names returned by geocoding.

Admin1 has no alias map — straight slugify.

## Admin1 inclusion rule

Skip admin1 when `slugify(admin1) === slugify(name)`. Otherwise include
it as the middle segment. This produces 2 segments for Moscow / Tokyo
prefecture / Singapore-style entries and 3 segments otherwise.

## Resolution strategy (hybrid)

The slug is canonical for display and SEO; coords are an optimization.

1. **URL has `?@lat,lon`** → reconstruct a `GeoCity` directly from the
   path segments + coords. No network. Title-case slugs back to display
   strings, look up country via reverse alias map.
2. **URL has slug only (bare share / typed / crawled)** → call the
   Open-Meteo geocoding API with `name=<citySlug>`, filter to results
   whose slugified country matches `countrySlug` (and admin1 matches
   when present), pick highest-population winner. On hit, `replaceState`
   the URL to the canonical form including coords.
3. **No match** → render the 404 surface.

## URL ↔ store sync

Source of truth: the Zustand store's `selectedCity`. The URL is a
projection of it.

- **On mount**, `useUrlSync()` reads `location` once. If a parse hits
  case 1 or 2 above, it `setCity`s the result (case 2 may need to await
  geocoding). If the URL is `/`, the store's persisted value wins.
- **On `setCity`**, the store action also calls `history.pushState` with
  the canonical URL (slug + coords).
- **On `popstate`**, the listener re-runs the same parse-and-resolve
  logic but does not push (the entry already exists).

## Conflict rules

- URL wins over localStorage on any non-root path.
- localStorage wins on `/`.
- 404 surface does NOT mutate `selectedCity` — the previously selected
  city is preserved so navigating away from the 404 returns to a real
  view, not a blank one.

## 404 surface

A minimalist component matching the existing loading/error visual
language (`'JetBrains Mono'`, muted color, generous padding). It
contains:

- A single short message ("No city matched that URL.").
- The existing `<CitySearch>` rendered with its input prefilled to
  the de-slugged city segment (e.g. `lost-city` → `lost city`) and
  the text auto-selected on mount so retyping replaces it cleanly.
- The page does not change `document.title` or other globals.

## Vercel rewrite

Add `vercel.json` at the repo root:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

This makes `vercel dev` and production both serve the SPA shell for
deep links.

## Edge cases

| Case                                   | Behavior                                              |
|----------------------------------------|-------------------------------------------------------|
| Diacritics lost on coords-only restore | Display "Sao Paulo" not "São Paulo". Documented inline.|
| Elevation lost on coords-only restore  | Default `elev: 0`; only used in one display field.    |
| Same-slug collisions in same admin1    | `?@lat,lon` disambiguates — it's authoritative.       |
| Geocoding API failure on cold load     | Treat as "not found" → 404 surface.                   |
| Trailing slash / mixed case            | Normalized to lowercase, no trailing slash, via `replaceState`. |
| Empty path segments                    | Treated as parse failure → root behavior.             |

## Files touched

```
NEW  src/lib/route.ts          ← pure parse/build + useUrlSync hook
NEW  src/components/NotFound.tsx
NEW  vercel.json
MOD  src/store/weatherStore.ts ← setCity also pushes URL
MOD  src/App.tsx               ← mounts useUrlSync; renders NotFound when 404
```

## Public API of `lib/route.ts`

```ts
export function toSlug(city: GeoCity): { path: string; query: string }
export function parseUrl(pathname: string, search: string):
  | { type: 'root' }
  | { type: 'slug'; countrySlug: string; admin1Slug?: string; citySlug: string; ll?: [number, number] }
export function reconstructFromCoords(parsed, ll: [number, number]): GeoCity
export async function resolveSlugViaGeocoding(parsed): Promise<GeoCity | null>
export function useUrlSync(): { notFoundSlug: string | null }
```

## Testing

No automated test infrastructure exists. Validation is manual:

1. Visit each example URL cold, with and without `?@…` coords.
2. Pick cities from search; confirm URL updates and back/forward work.
3. Visit a typo URL; confirm 404 surface with prefilled, selected text.
4. Reload after picking a city; confirm climate data persists.
5. Reload at `/`; confirm last persisted city loads.
6. `vercel dev` deep-link test (or `vite preview` with a manual rewrite check).

## Open questions

None. All design decisions resolved during brainstorming.
