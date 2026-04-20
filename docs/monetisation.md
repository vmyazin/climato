# Climato — Monetisation Strategy

## 1. Affiliate Link Strategy

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

**Placement 1 — "Best months to visit" card** (add to Variation A below the stats strip)
- Derive automatically from climate data: best months = highest sunshine hours, lowest precip, comfortable temperature range (15–28°C)
- Example: *"Best time to visit Florianópolis: November–March (warm, sunny). Avoid June–August (cool, higher rain)."*
- CTA button: **"Find flights →"** (Skyscanner deeplink) + **"Browse hotels →"** (Booking.com deeplink)

**Placement 2 — Contextual footer on each city**
- 3 icon-link buttons: ✈ Flights · 🏨 Hotels · 🎟 Activities
- Small, tasteful, below the NORMALS footer line
- Only shown when a real geocoded city is selected (not on default/seed cities without confirmed coordinates)

**Placement 3 — "Visit in [month]" prompt in Variation B**
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
- Store affiliate IDs in `.env` (`VITE_BOOKING_AID`, `VITE_SKYSCANNER_ID`, etc.)
- Use `rel="noopener noreferrer sponsored"` on all affiliate links
- Only activate links for cities returned by the geocoding API (have real lat/lon)
- A/B test placement 1 vs placement 3 using a simple localStorage flag

---

## 2. SEO Strategy

### Opportunity
Queries like *"average temperature Tokyo March"*, *"weather averages Florianópolis by month"*, *"best time to visit Cape Town"* get tens of thousands of monthly searches globally. Current ranking pages are mostly ugly weather-data dumps. A well-designed, fast static page wins.

### Technical approach

**Generate static pages** — one URL per city, pre-rendered at build time.

```
/city/tokyo-japan
/city/florianopolis-brazil
/city/cape-town-south-africa
/city/reykjavik-iceland
```

Route format: `/city/[slug]` where slug = `{name-lowercased-no-accents}-{country-lowercased}`.

**Implementation**: Add React Router (or switch to a meta-framework). For pure static, generate HTML files per city at build time using the Open-Meteo archive API — fetch once, bake into the build output.

### Target keyword clusters

| Cluster | Example query | Monthly volume (est.) |
|---------|--------------|----------------------|
| Monthly averages | "tokyo weather averages by month" | 8k–40k |
| Best time to visit | "best time to visit florianopolis" | 1k–10k |
| Specific month | "cape town weather in july" | 5k–20k |
| Rainy season | "when is rainy season in mumbai" | 10k–50k |
| Temperature comparison | "paris vs london temperature" | 1k–5k |

### On-page SEO per city page

**Title tag**: `{City} Monthly Weather Averages — Climate Atlas`
**Meta description**: `Monthly temperature highs, lows, rainfall and sunshine hours for {City}, {Country}. Average high in {hottest_month}: {hottest_temp}°C.`

**Structured data** (JSON-LD):
```json
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "Monthly Climate Normals — {City}",
  "description": "Monthly average temperature, precipitation and sunshine data for {City}",
  "spatialCoverage": { "@type": "Place", "name": "{City}, {Country}" }
}
```

**H1**: `{City} Monthly Weather & Climate Averages`
**H2s**: Monthly Temperatures · Rainfall by Month · Best Time to Visit · Sunrise & Sunset

### Content to auto-generate from data (no manual writing)

Each city page should include these auto-generated paragraphs:

1. **Overview** — *"{City} has a [climate type] climate. The warmest month is [month] ({temp}°C average high) and the coolest is [month] ({temp}°C)."*
2. **Rainfall** — *"Annual rainfall totals [X]mm. The wettest month is [month] ([X]mm) and the driest is [month] ([X]mm)."*
3. **Best time to visit** — *"The best time to visit {City} is [month range], when temperatures average [X]–[X]°C with [X] sunshine hours per day."*
4. **Monthly breakdown table** — the 12-row data table that Google can parse and feature-snippet

### Scale

- Seed: 18 existing cities (immediate — zero extra API cost)
- Phase 2: Top 200 most-searched cities (build-time fetch from Open-Meteo)
- Phase 3: All GeoNames cities with population > 50k (~10,000 cities)

**Cost to serve**: static HTML + CDN = near zero. Open-Meteo archive calls at build time only (not per-visitor).

### Technical SEO checklist

- [ ] `sitemap.xml` generated at build time listing all city URLs
- [ ] `robots.txt` allowing full crawl
- [ ] Canonical URLs (avoid duplicate content between `/city/tokyo-japan` and the SPA root)
- [ ] `og:image` auto-generated per city (screenshot of the chart, or a text-based card)
- [ ] Core Web Vitals: static pages should score 95+ on Lighthouse
- [ ] Internal linking: each city page links to 5 nearby cities (drives crawl depth)

### Distribution timeline

| Month | Action |
|-------|--------|
| 1 | Publish 18 seed city pages, submit sitemap to Google Search Console |
| 2 | Add affiliate CTAs, monitor which cities get impressions |
| 3 | Expand to top 200 cities based on search volume data |
| 6 | Evaluate traffic — if >5k/month, apply for Mediavine display ads |
| 12 | 10k+ cities, consider Booking.com preferred partner status |

---

## Combined revenue projection

| Monthly visitors | Affiliate rev | Display ads (CPM $3) | Total |
|----------------|--------------|---------------------|-------|
| 10k | ~$100 | ~$30 | ~$130 |
| 50k | ~$500 | ~$150 | ~$650 |
| 200k | ~$2,000 | ~$600 | ~$2,600 |
| 500k | ~$5,000 | ~$1,500 | ~$6,500 |

Display ads only activate once you hit a network's traffic threshold (Mediavine: 50k sessions). Affiliate income starts from day one.
