# Climato — Monetisation Strategy

> **Status legend:** ✅ done · 🟡 partial · ⬜ not started
>
> Last audit: 2026-05-25 (post preferred-region normals backfill)

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
- Derive automatically from climate data: best months = sunshine hours, rainfall, and comfortable temperatures; warm leisure destinations need genuinely warm monthly highs before a month is treated as peak season.
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

**Generate static pages** — 🟡 one URL per city in the sitemap; cached-normal city pages now pre-render at build time.

```
/japan/tokyo
/brazil/florianopolis
/south-africa/cape-town
/iceland/reykjavik
```

Route format: ✅ implemented as `/{country}/{city}` (and `/{country}/{admin1}/{city}` for ambiguous duplicates). See [src/lib/route.ts](src/lib/route.ts) and [src/lib/slug.ts](src/lib/slug.ts) — the doc's earlier `/city/[slug]` shape was superseded.

**Implementation**: 🟡 custom URL sync via `useUrlSync` ([src/lib/route.ts](src/lib/route.ts)) instead of React Router. The app still hydrates as a SPA, but [scripts/prerender-cities.ts](scripts/prerender-cities.ts) now writes static HTML snapshots for canonical routes whose normals are committed in [data/normals/](data/normals/) after `vite build`. Routes without committed normals still fall back to SPA rendering and lazy-fill.

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

✅ **Structured data** (JSON-LD): emitted at runtime by [src/hooks/useDocumentMeta.ts](src/hooks/useDocumentMeta.ts) once geocoding resolves. Includes two schema nodes: a `Dataset` with `temporalCoverage`, `spatialCoverage` (Place + GeoCoordinates), `variableMeasured`, license, and Open-Meteo attribution; plus a `BreadcrumbList` (Climato › City, Country) for SERP breadcrumb rich results. Skipped on the not-found path and for placeholder cities (lat=0/lon=0).
```json
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "Monthly Climate Normals — {City}",
  "description": "Monthly average temperature, precipitation and sunshine data for {City}",
  "spatialCoverage": { "@type": "Place", "name": "{City}, {Country}" }
},
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Climato", "item": "https://climato.smoxu.com/" },
    { "@type": "ListItem", "position": 2, "name": "{City}, {Country}", "item": "https://climato.smoxu.com/{country}/{city}" }
  ]
}
```

- ✅ **H1**: every city variation emits a semantic `<h1>` with the city name — [VariationA.tsx](src/components/VariationA.tsx) directly, [VariationB.tsx](src/components/VariationB.tsx) and [VariationC.tsx](src/components/VariationC.tsx) via the `as="h1"` prop on `FitHeadline`. [CityHeroFallback.tsx](src/components/CityHeroFallback.tsx) also emits one during the loading state.
- ✅ **H2s**: Climate Overview · Rainfall by Month · Best Time to Visit · Monthly Breakdown — emitted by [src/components/ClimateNarrative.tsx](src/components/ClimateNarrative.tsx) under each city page. (The doc's earlier list — Monthly Temperatures · Rainfall · Best Time · Sunrise & Sunset — was renamed to better match the actual content; sunrise/sunset folded into the Monthly Breakdown table.)

### Content to auto-generate from data (no manual writing) — ✅ done

All four sections are derived purely from the `City` shape — no extra fetches, no manual writing — by [src/lib/climate-summary.ts](src/lib/climate-summary.ts) and rendered by [src/components/ClimateNarrative.tsx](src/components/ClimateNarrative.tsx) under each city page.

1. ✅ **Overview** — *"{City} has a [climate type] climate. The warmest month is [month] ({temp}°C average high) and the coolest is [month] ({temp}°C)."* — climate type via a coarse Köppen-ish classifier (tropical / arid / mediterranean / temperate / continental / subarctic / polar).
2. ✅ **Rainfall** — *"Annual rainfall totals [X]mm. The wettest month is [month] ([X]mm) and the driest is [month] ([X]mm)."*
3. ✅ **Best time to visit** — *"The best time to visit {City} is [month range], when temperatures average [X]–[X]°C with [X] sunshine hours per day."* — picks the longest contiguous run of "good" months (temperature, rain, sun), with wraparound handling for Southern Hemisphere cities and a warmer peak-season floor for subtropical/leisure destinations.
4. ✅ **Monthly breakdown table** — semantic `<table>` with caption + thead + 12 rows (month / high / low / rain / sun / sunrise / sunset). Numeric cells use tabular-nums for clean column alignment. Google can feature-snippet directly from this.

### Scale

- ✅ Seed: 18 existing cities (immediate — zero extra API cost) — [src/data/cities.ts](src/data/cities.ts)
- 🟡 Phase 2: Top 200 most-searched cities — catalog ingestion built ([scripts/build-cities.sh](scripts/build-cities.sh) → `data/cities.tsv`, default `MIN_POP=100000` ≈ 6k cities) **and** lazy-fill is live: the first visit to any catalog city triggers an Open-Meteo fetch via [api/normals.ts](api/normals.ts), the result lands in Upstash Redis, and the hourly drain cron ([.github/workflows/drain-normals.yml](.github/workflows/drain-normals.yml)) commits it to [data/normals/](data/normals/). Bulk backfill for the 100 largest uncached preferred-region cities is available via `pnpm normals:backfill-largest` ([scripts/backfill-largest-cities.ts](scripts/backfill-largest-cities.ts)); 144 normals committed as of 2026-05-25, but search-volume-ranked top-200 coverage is not complete yet.
- 🟡 Phase 3: All GeoNames cities with population > 50k — same pipeline supports it (lower `MIN_POP` and re-run [scripts/build-cities.sh](scripts/build-cities.sh)). Pre-rendering now covers all committed normals at build time; remaining catalog cities still SPA-render until cached.

**Cost to serve**: ✅ static shell + CDN serves the SPA. Open-Meteo archive calls now happen **once per city, ever** (not per-visitor) — first visit goes through [api/normals.ts](api/normals.ts) → [api/_lib/catalog.ts](api/_lib/catalog.ts) catalog-validates the request → fetches Open-Meteo → caches in Upstash. Subsequent visits hit the cached `/normals/{id}.json` static asset. Steady-state Open-Meteo dependency for climate normals tends to zero as the long-tail fills in.

**Operational visibility**: ✅ a password-protected debug panel at [/admin](https://climato.smoxu.com/admin) (auth via `ADMIN_PASSWORD` env var, HMAC-derived session cookie) lists pending Upstash entries and committed cached cities, classified by id type (geonames / curated / slug-dup).

### Technical SEO checklist

- [x] ✅ `sitemap.xml` generated at build time listing all city URLs with per-city `lastmod` derived from the `fetched_at` timestamp in the normals cache (falls back to build date for unvisited cities) — [vite.config.ts](vite.config.ts), output at [dist/sitemap.xml](dist/sitemap.xml)
- [x] ✅ `robots.txt` allowing full crawl — generated by the same Vite plugin, output at [dist/robots.txt](dist/robots.txt)
- [x] 🟡 Static city HTML — [scripts/prerender-cities.ts](scripts/prerender-cities.ts) pre-renders cached-normal city pages after build, emitting both `/{country}/{city}/index.html` and clean-url `.html` companions. Verified by `pnpm build` on 2026-05-25: 139 cached city pages rendered from 144 committed normal IDs (100 added via [scripts/backfill-largest-cities.ts](scripts/backfill-largest-cities.ts)); full sitemap coverage remains pending until more normals are committed.
- [x] ✅ Canonical URLs — sitemap-side canonicalisation in [vite.config.ts:56-88](vite.config.ts#L56-L88) **plus** a `<link rel="canonical">` tag emitted at runtime by [src/hooks/useDocumentMeta.ts](src/hooks/useDocumentMeta.ts) that drops the optional `?@lat,lon` query so Google collapses the two URL forms into one canonical entry per city
- [x] ✅ `og:image` auto-generated per city — [api/og.tsx](api/og.tsx) renders a 1200×630 image via `@vercel/og` with city + country + peak-month + hi/lo/rain stats baked in. [src/hooks/useDocumentMeta.ts](src/hooks/useDocumentMeta.ts) sets the per-city URL on the client; [middleware.ts](middleware.ts) injects the same meta tags into a minimal HTML response for social-share bots (Twitter, Facebook, Slack, etc.) so the previews work without JS execution. Bonus: appending `/ogimage` to any city URL redirects to the live image for sharing/debugging.
- [ ] ⬜ Core Web Vitals: static pages should score 95+ on Lighthouse — not measured
- [x] ✅ Internal linking: each city page links to 5 nearby cities — `№ 05 Nearby Cities` Module under each city page, fed by `/api/nearby` ([api/nearby.ts](api/nearby.ts) + `findNearest` in [api/_lib/catalog.ts](api/_lib/catalog.ts)). Each link uses `toSlug()` so it points to the same canonical URL as the sitemap. Section auto-hides for genuinely isolated cities (Reykjavík etc) where the nearest catalog city is past the 600 km ceiling.

### Distribution timeline

| Month | Action | Status |
|-------|--------|--------|
| 1 | Publish 18 seed city pages, submit sitemap to Google Search Console | 🟡 18 pages live + sitemap built; GSC submission is a manual step (status unknown) |
| 2 | Add affiliate CTAs, monitor which cities get impressions | ⬜ |
| 3 | Expand to top 200 cities based on search volume data | 🟡 catalog ingestion ready, expansion pending search-volume data |
| 6 | Evaluate traffic — if >5k/month, apply for Mediavine display ads | ⬜ |
| 12 | 10k+ cities, consider Booking.com preferred partner status | ⬜ |

---

## 3. Traffic Acquisition — ⬜ not started

### Why this matters
Sections 1 and 2 both depend on the prerequisite this section addresses: people actually visiting the site. With zero traffic the affiliate placements have nothing to convert and Google has no engagement signals (clicks from SERP, dwell time, backlinks) to rank pages from. The job for the first 90 days isn't revenue — it's getting indexed, earning backlinks, and identifying which channels and keyword clusters convert.

### Channel matrix

| Channel | Effort | Time-to-traffic | Compounds? | Notes |
|---------|--------|----------------|------------|-------|
| Pinterest | Low | Days–weeks | Yes | Per-city OG images are pin-ready; travel is a native Pinterest niche |
| Show HN | Low | Hours | No | One-shot — brings backlinks even if traffic spike doesn't last |
| Reddit | Low | Hours | No | r/dataisbeautiful, r/digitalnomad, r/solotravel, country subs |
| Embed widget | Medium | Months | Yes | Pure backlink play; scales with the catalog |
| Comparison pages | Medium | Months | Yes | "Paris vs London" — high search volume, low competition, auto-generatable |
| Seasonal landing pages | Medium | Months | Yes | "Best places to visit in March" — refreshed monthly |
| Wikipedia citations | High | Weeks | Yes | Strong backlinks; strict editorial rules |
| Awesome lists | Low | Weeks | Yes | One-time submissions |
| Blogger outreach | High | Weeks | Yes | Manual; pitch as a data source for "best time to visit" posts |

### Quick wins — first 4 weeks

**Pinterest** ⬜
- Create a business account branded as Climato
- Pin every per-city OG image (start with the 18 seed cities, expand as the catalog fills). Title format: *"[City] weather averages — [hottest month] hits [X]°C"*
- Keyword-rich descriptions: "best time to visit", "monthly rainfall", "travel weather guide"
- Group cities into boards by climate type (Tropical, Mediterranean, Continental, etc.) for browse-driven traffic
- Automation: pull `city × image-url × description` rows from the catalog → bulk-pin via the Pinterest API or a scheduler like Tailwind

**Show HN** ⬜
- Title format: *"Show HN: Climato — monthly weather averages for any city, free"*
- Post Tuesday or Wednesday 9–11am ET (peak engagement window)
- Lead with angles that resonate on HN: open data attribution (Open-Meteo), the lazy-fill + drain ingestion pipeline, zero per-visit API cost
- Pre-warm at least 12 demo cities so the SPA feels instant

**Reddit** ⬜
- r/dataisbeautiful: post a striking single-city chart (e.g. Mumbai monsoon rainfall) with the link in the OP comment, not the title
- r/digitalnomad, r/solotravel, r/expats: comment helpfully on "where should I go in [month]?" threads — link only when contextually relevant
- Country subs (r/Brazil, r/japanlife, r/IWantOut): share when a question matches
- Risk: spam-ban — always lead with value, treat the link as secondary

**Niche communities** ⬜
- Nomad List forum, Slow Travel forum, Numbeo discussion areas
- Digital-nomad / expat Facebook groups (declining but still trafficked)

### Compounding moats — month 1–6

**Embed widget** ⬜
- Provide a one-line `<script>` snippet that travel blogs can drop into "best time to visit X" posts
- Renders a compact city climate card (mini chart + best months) with a "powered by Climato" backlink
- Example install: `<script src="https://climato.smoxu.com/embed.js" data-city="tokyo"></script>`
- Promote via a dedicated `/embed` landing page and the blogger-outreach motion below
- Each embed = one durable backlink; aim for 50–100 placements in 6 months

**Comparison pages** ⬜
- Route: `/compare/{city-a}/vs/{city-b}` (e.g. `/compare/paris/vs/london`)
- High volume, low competition: "paris vs london weather" ~5k/mo, "lisbon vs barcelona weather" ~3k/mo
- Auto-generated from the existing `City` shape — side-by-side bar chart for temp and rainfall, "which is hotter/wetter/sunnier" summary derived from [src/lib/climate-summary.ts](src/lib/climate-summary.ts)
- Pre-generate the top 200–500 likely city pairs (capital × capital, popular tourism pairs)
- List in `sitemap.xml` with their own canonical URLs
- Risk: thin-content penalty — each page needs ≥200 words of derived analysis (rainfall delta, best month for each, climate-type comparison)

**Seasonal landing pages** ⬜
- Route: `/best-places-to-visit-in-{month}` — refreshed monthly with calendar context
- Lists 15–20 cities with ideal conditions for that month (warm but not too hot, low rain, sunny), filtered by hemisphere
- Reuses the existing scoring logic in [src/lib/climate-summary.ts](src/lib/climate-summary.ts)
- Search volume: "best places to visit in march" ~30–100k/mo globally
- Format: intro paragraph, ranked list with mini climate cards linking to full city pages
- Bonus: internal links drive crawl-budget into the long tail of city pages

### Outreach — slower, manual

**Wikipedia citations** ⬜
- Find city Wikipedia articles with thin or unsourced climate sections; cite Climato as an external link or a source for derived stats
- Read [WP:RS](https://en.wikipedia.org/wiki/WP:RS) and [WP:EL](https://en.wikipedia.org/wiki/WP:EL) first — Climato is a tertiary source, Open-Meteo is primary; some editors prefer citing Open-Meteo directly
- Risk: editors aggressively revert anything perceived as promotional — move slowly, build a real editor account first, skip if it feels spammy

**Awesome lists & directories** ⬜
- [awesome-public-datasets](https://github.com/awesomedata/awesome-public-datasets)
- [awesome-data-visualization](https://github.com/javierluraschi/awesome-data-visualization)
- Niche travel directories (Visit-A-City, Travel Awaits, etc.)

**Blogger outreach** ⬜
- Use Ahrefs / Ubersuggest / plain Google to find blogs ranking for "best time to visit X" terms
- Pitch the embed widget as a value-add for their existing post in exchange for attribution
- Target cadence: 10 outreach emails / week → 1–2 placements / month at typical conversion rates

### Tracking infrastructure ⬜
- Install Plausible or Umami (privacy-friendly, lightweight) — required to know which channels actually convert
- Per-channel UTM tags on every external link Climato controls (Pinterest descriptions, Reddit comments, embed-widget backlinks)
- Weekly review: top referrers, top landing pages, top search queries from GSC
- Kill channels showing <5% of total referrals after 90 days; double down on the rest

### 90-day timeline

| Week | Focus | Expected outcome |
|------|-------|-----------------|
| 1 | Submit sitemap to GSC. Install Plausible. Pinterest account live, first 18 cities pinned. | Tracking baseline, first impressions in GSC |
| 2 | Show HN launch. Submit to 3 awesome lists. | One-shot traffic spike + first wave of backlinks |
| 3–4 | Reddit posts in 5 targeted subs. Reach out to 5 niche forums. | First 500–2,000 referral visits |
| 5–8 | Build embed widget + `/embed` landing page. Auto-generate top 50 comparison pages. | Compounding distribution infrastructure live |
| 9–12 | Launch seasonal landing pages. Start blogger outreach (10/wk). Cautious Wikipedia edits. | First consistent GSC impressions on city pages |

### Gate to start Section 1 (affiliates)
The affiliate work in Section 1 only becomes worth the build effort once these are true:
- 5k+ monthly visitors from organic + referral combined
- 50+ backlinks from referring domains
- At least one channel showing consistent week-over-week growth

Until then, every hour spent on affiliate UI is an hour not spent earning the traffic those CTAs need to convert.

---

## Combined revenue projection

| Monthly visitors | Affiliate rev | Display ads (CPM $3) | Total |
|----------------|--------------|---------------------|-------|
| 10k | ~$100 | ~$30 | ~$130 |
| 50k | ~$500 | ~$150 | ~$650 |
| 200k | ~$2,000 | ~$600 | ~$2,600 |
| 500k | ~$5,000 | ~$1,500 | ~$6,500 |

Display ads only activate once you hit a network's traffic threshold (Mediavine: 50k sessions). Affiliate income starts from day one.
