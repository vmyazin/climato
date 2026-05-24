# Climato

Monthly climate averages for any city in the world, in three distinct display styles.

## What This Does

A weather data app that fetches real ERA5 climate normals (2014–2023) for any city you search. It shows monthly high/low temperatures, precipitation, sunshine hours, sunrise/sunset times, and a topographic map of the location. Three layout variations — Swiss grid, oversized numeric hero, and editorial asymmetric — let you view the same data in different ways.

Data comes from Open-Meteo by default, with **NASA POWER as an automatic archive fallback** and **MET Norway as a current-temperature fallback** when Open-Meteo is unreachable or overloaded. The footer reflects which providers actually served your page.

Built as a design+data exploration: I wanted to see how far you could push data visualisation aesthetics with plain React + SVG, no charting library.

## Demo

> _Later I'll add a screenshot here_

## Tech Stack

- **Framework**: Vite + React 19 + TypeScript
- **Data**: [Open-Meteo](https://open-meteo.com/) (primary) — geocoding + 10-year ERA5 climate archive + current temperature. With server-side fallbacks to [NASA POWER](https://power.larc.nasa.gov/) (archive) and [MET Norway](https://api.met.no/) (current temp) when Open-Meteo is down. All providers are free, no API key required.
- **Maps**: Leaflet + OpenTopoMap tiles (real SRTM contour data)
- **State**: Zustand (persisted) + React Query (cached API calls)
- **UI**: Tailwind CSS + Radix UI (ToggleGroup for view/unit/chart toggles, Popover for city search)
- **Charts**: Custom SVG — bar, line, and radial ring variants, all hand-rolled

## Getting Started

```bash
git clone <repo>
cd climato
pnpm install
pnpm dev
```

Opens at `http://localhost:5173`. No environment variables or API keys needed.

## How It Works

**City search** calls the Open-Meteo geocoding API (`/v1/search`) with deduplication: results are grouped by normalised name (diacritics stripped) + country, and the highest-population entry wins per group. This avoids the problem where a common city name returns dozens of tiny same-named towns before the well-known city.

**Climate data** is fetched server-side through a small orchestrator at `/api/normals` that tries Open-Meteo's archive first and falls through to NASA POWER on any failure (5xx, 4 s timeout, malformed response). Either way the response is ~3,600 daily records aggregated into 12-month normals: temperatures averaged, precipitation summed per month then averaged across years, sunshine converted from seconds/day to hours/day. NASA POWER doesn't ship a `sunshine_duration` field, so the fallback path approximates it from the ratio of all-sky to clear-sky shortwave radiation × computed day length. Sunrise/sunset times are computed locally from the NOAA solar equation + `tz-lookup` (no upstream dependency), so they're correct even when both providers are out. Current temperature flows through a parallel `/api/current` route with Open-Meteo → MET Norway fallback, edge-cached for 5 min via Vercel. React Query caches results client-side; an `X-Climato-Source` response header drives the footer's dynamic attribution.

**Three views** share one city, one unit toggle (°C/°F), and one chart-type toggle (bar/line/ring). State persists to localStorage via Zustand.

## Future Ideas

- [ ] Real Leaflet marker with popup showing coordinates + elevation
- [ ] Compare two cities side by side
- [ ] Share a city via URL (hash routing)
- [ ] Precipitation unit toggle (mm / in) independent of temperature
- [ ] More cities in the default search suggestions

## License

Free to fork and adapt. Attribution required.
