# Climato — Monetisation Strategy

> **Status legend:** ✅ done · 🟡 partial · ⬜ not started
>
> Last audit: 2026-05-03 (post climate narrative)

## 1. Affiliate Link Strategy — ⬜ not started

### Principle
Every city page already answers "what is the weather like there?" — the natural follow-on is "should I visit, and when?" That intent is extremely high-value for travel affiliates.

### Programs to join (in priority order)

| Program | Commission | Cookie | Notes |
|---------|-----------|--------|-------|
| **Booking.com Affiliate** | 4–6% of booking value | 30 days | Highest hotel inventory, easiest approval |
| **Skyscanner Affiliate** | CPC ~£0.15–0.30 per click | Session | No booking required — clicks pay |
| **GetYourGuide** | 8% on activities | 31 days | "Things to do in [city]" placement |
| **Airbnb** | $75–150 per new host referral | 30 days | Only useful if you build host-facing features |
| **Expedia / Hotels.com** | 3–6% | 7 days | Fallback if Booking.com rejects |

### Placement in the app

**Placement 1 — "Best months to visit" card** ⬜ (add to Variation A below the stats strip)
- Derive automatically from climate data: best months = highest sunshine hours, lowest precip, comfortable temperature range (15–28°C)
- Example: *"Best time to visit Florianópolis: November–March (warm, sunny). Avoid June–August (cool, higher rain)."*
- CTA button: **"Find flights →"** (Skyscanner deeplink) + **"Browse hotels →"** (Booking.com deeplink)

**Placement 2 — Contextual footer on each city** ⬜
- 3 icon-link buttons: ✈ Flights · 🏨 Hotels · 🎟 Activities
- Small, tasteful, below the NORMALS footer line
- Only shown when a real geocoded city is selected (not on default/seed cities without confirmed coordinates)

**Placement 3 — "Visit in [month]" prompt in Variation B** ⬜
- When a user selects a month, show: *"Thinking of visiting [city] in [month]? [month] averages [X]°C with [Y]mm rain."*
- CTA: **"Check hotel prices for [month] →"**

### Deep-link format

```
Booking.com:
https://www.booking.com/searchresults.html?ss=[city_name]&aid=[YOUR_AID]

Skyscanner:
https://www.skyscanner.net/transport/flights/anywhere/[IATA]/?adults=1&affiliateId=[YOUR_ID]

GetYourGuide:
https://www.getyourguide.com/[city-slug]-l[location_id]/activities/?partner_id=[YOUR_ID]
```

### Revenue estimate (rough)
- 10k monthly visitors × 3% CTR on Booking.com → 300 clicks × 5% booking rate × avg €120 booking × 5% commission = **~€90/month at 10k visitors**
- Scales linearly. At 100k visitors: ~€900/month passively.

### Implementation notes
- ⬜ Store affiliate IDs in `.env` (`VITE_BOOKING_AID`, `VITE_SKYSCANNER_ID`, etc.)
- ⬜ Use `rel="noopener noreferrer sponsored"` on all affiliate links
- 🟡 Only activate links for cities returned by the geocoding API (have real lat/lon) — placeholder vs geocoded distinction already exists in [src/lib/route.ts](src/lib/route.ts) (lat=0/lon=0 sentinel)
- ⬜ A/B test placement 1 vs placement 3 using a simple localStorage flag
- ✅ `booking_dest_id` and `iata` columns reserved in [data/cities.tsv](data/cities.tsv) catalog schema (currently unfilled — see [scripts/build-cities.sh](scripts/build-cities.sh))

---

## 2. SEO Strategy — 🟡 partial

### Opportunity
Queries like *"average temperature Tokyo March"*, *"weather averages Florianópolis by month"*, *"best time to visit Cape Town"* get tens of thousands of monthly searches globally. Current ranking pages are mostly ugly weather-data dumps. A well-designed, fast static page wins.

### Technical approach

**Generate static pages** — 🟡 one URL per city; routing live, pre-render at build time still pending.

```
/japan/tokyo
/brazil/florianopolis
/south-africa/cape-town
/iceland/reykjavik
```

Route format: ✅ implemented as `/{country}/{city}` (and `/{country}/{admin1}/{city}` for ambiguous duplicates). See [src/lib/route.ts](src/lib/route.ts) and [src/lib/slug.ts](src/lib/slug.ts) — the doc's earlier `/city/[slug]` shape was superseded.

**Implementation**: 🟡 custom URL sync via `useUrlSync` ([src/lib/route.ts](src/lib/route.ts)) instead of React Router; SPA-only render, no per-city HTML pre-rendering yet. Open-Meteo data is fetched per-visit, not baked into the build.

### Target keyword clusters

| Cluster | Example query | Monthly volume (est.) |
|---------|--------------|----------------------|
| Monthly averages | "tokyo weather averages by month" | 8k–40k |
| Best time to visit | "best time to visit florianopolis" | 1k–10k |
| Specific month | "cape town weather in july" | 5k–20k |
| Rainy season | "when is rainy season in mumbai" | 10k–50k |
| Temperature comparison | "paris vs london temperature" | 1k–5k |

### On-page SEO per city page

- ✅ **Title tag**: `{City} Monthly Weather Averages — Climato` — implemented in [src/hooks/useDocumentMeta.ts](src/hooks/useDocumentMeta.ts)
- ✅ **Meta description**: `Monthly temperature highs, lows, rainfall and sunshine hours for {City}, {Country}. Average high in {hottest_month}: {hottest_temp}°C.` — implemented in [src/hooks/useDocumentMeta.ts](src/hooks/useDocumentMeta.ts) (uses peak-month + peak-temp template once climate data resolves; falls back to a no-stat variant during loading)

✅ **Structured data** (JSON-LD): emitted at runtime by [src/hooks/useDocumentMeta.ts](src/hooks/useDocumentMeta.ts) once geocoding resolves, with `temporalCoverage`, `spatialCoverage` (Place + GeoCoordinates), `variableMeasured`, license, source attribution to Open-Meteo, and an admin1/name dedup. Skipped on the not-found path and for placeholder cities (lat=0/lon=0).
```json
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "Monthly Climate Normals — {City}",
  "description": "Monthly average temperature, precipitation and sunshine data for {City}",
  "spatialCoverage": { "@type": "Place", "name": "{City}, {Country}" }
}
```

- 🟡 **H1**: a semantic `<h1>` exists in [src/components/CityHeroFallback.tsx](src/components/CityHeroFallback.tsx) for the SEO first-paint fallback (renders the city name only, not the full doc spec); main variations don't yet emit an `<h1>`
- ✅ **H2s**: Climate Overview · Rainfall by Month · Best Time to Visit · Monthly Breakdown — emitted by [src/components/ClimateNarrative.tsx](src/components/ClimateNarrative.tsx) under each city page. (The doc's earlier list — Monthly Temperatures · Rainfall · Best Time · Sunrise & Sunset — was renamed to better match the actual content; sunrise/sunset folded into the Monthly Breakdown table.)

### Content to auto-generate from data (no manual writing) — ✅ done

All four sections are derived purely from the `City` shape — no extra fetches, no manual writing — by [src/lib/climate-summary.ts](src/lib/climate-summary.ts) and rendered by [src/components/ClimateNarrative.tsx](src/components/ClimateNarrative.tsx) under each city page.

1. ✅ **Overview** — *"{City} has a [climate type] climate. The warmest month is [month] ({temp}°C average high) and the coolest is [month] ({temp}°C)."* — climate type via a coarse Köppen-ish classifier (tropical / arid / mediterranean / temperate / continental / subarctic / polar).
2. ✅ **Rainfall** — *"Annual rainfall totals [X]mm. The wettest month is [month] ([X]mm) and the driest is [month] ([X]mm)."*
3. ✅ **Best time to visit** — *"The best time to visit {City} is [month range], when temperatures average [X]–[X]°C with [X] sunshine hours per day."* — picks the longest contiguous run of "good" months (mild temp, low rain, decent sun), with wraparound handling for Southern Hemisphere cities.
4. ✅ **Monthly breakdown table** — semantic `<table>` with caption + thead + 12 rows (month / high / low / rain / sun / sunrise / sunset). Numeric cells use tabular-nums for clean column alignment. Google can feature-snippet directly from this.

### Scale

- ✅ Seed: 18 existing cities (immediate — zero extra API cost) — [src/data/cities.ts](src/data/cities.ts)
- ✅ Phase 2: Top 200 most-searched cities — catalog ingestion built ([scripts/build-cities.sh](scripts/build-cities.sh) → `data/cities.tsv`, default `MIN_POP=100000` ≈ 6k cities) **and** lazy-fill is live: the first visit to any catalog city triggers an Open-Meteo fetch via [api/normals.ts](api/normals.ts), the result lands in Upstash Redis, and the hourly drain cron ([.github/workflows/drain-normals.yml](.github/workflows/drain-normals.yml)) commits it to [data/normals/](data/normals/). Future visits + future builds serve straight from CDN. The dataset grows organically with traffic, no bulk ingest needed.
- 🟡 Phase 3: All GeoNames cities with population > 50k — same pipeline supports it (lower `MIN_POP` and re-run [scripts/build-cities.sh](scripts/build-cities.sh)). Still SPA-rendered (no per-city pre-rendering yet).

**Cost to serve**: ✅ static shell + CDN serves the SPA. Open-Meteo archive calls now happen **once per city, ever** (not per-visitor) — first visit goes through [api/normals.ts](api/normals.ts) → [api/_lib/catalog.ts](api/_lib/catalog.ts) catalog-validates the request → fetches Open-Meteo → caches in Upstash. Subsequent visits hit the cached `/normals/{id}.json` static asset. Steady-state Open-Meteo dependency for climate normals tends to zero as the long-tail fills in.

**Operational visibility**: ✅ a password-protected debug panel at [/admin](https://climato.smoxu.com/admin) (auth via `ADMIN_PASSWORD` env var, HMAC-derived session cookie) lists pending Upstash entries and committed cached cities, classified by id type (geonames / curated / slug-dup).

### Technical SEO checklist

- [x] ✅ `sitemap.xml` generated at build time listing all city URLs — [vite.config.ts:90-146](vite.config.ts#L90-L146), output at [dist/sitemap.xml](dist/sitemap.xml)
- [x] ✅ `robots.txt` allowing full crawl — generated by the same Vite plugin, output at [dist/robots.txt](dist/robots.txt)
- [x] ✅ Canonical URLs — sitemap-side canonicalisation in [vite.config.ts:56-88](vite.config.ts#L56-L88) **plus** a `<link rel="canonical">` tag emitted at runtime by [src/hooks/useDocumentMeta.ts](src/hooks/useDocumentMeta.ts) that drops the optional `?@lat,lon` query so Google collapses the two URL forms into one canonical entry per city
- [ ] ⬜ `og:image` auto-generated per city — only a single global [public/og-image.png](public/og-image.png) ships ([index.html:14](index.html#L14)); no per-city variant
- [ ] ⬜ Core Web Vitals: static pages should score 95+ on Lighthouse — not measured
- [ ] ⬜ Internal linking: each city page links to 5 nearby cities — no nearby-city links in any view

### Distribution timeline

| Month | Action | Status |
|-------|--------|--------|
| 1 | Publish 18 seed city pages, submit sitemap to Google Search Console | 🟡 18 pages live + sitemap built; GSC submission is a manual step (status unknown) |
| 2 | Add affiliate CTAs, monitor which cities get impressions | ⬜ |
| 3 | Expand to top 200 cities based on search volume data | 🟡 catalog ingestion ready, expansion pending search-volume data |
| 6 | Evaluate traffic — if >5k/month, apply for Mediavine display ads | ⬜ |
| 12 | 10k+ cities, consider Booking.com preferred partner status | ⬜ |

---

## Combined revenue projection

| Monthly visitors | Affiliate rev | Display ads (CPM $3) | Total |
|----------------|--------------|---------------------|-------|
| 10k | ~$100 | ~$30 | ~$130 |
| 50k | ~$500 | ~$150 | ~$650 |
| 200k | ~$2,000 | ~$600 | ~$2,600 |
| 500k | ~$5,000 | ~$1,500 | ~$6,500 |

Display ads only activate once you hit a network's traffic threshold (Mediavine: 50k sessions). Affiliate income starts from day one.
