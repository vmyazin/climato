# Climato

Monthly climate averages for any city in the world, in three distinct display styles.

## What This Does

A weather data app that fetches real ERA5 climate normals (2014–2023) from the Open-Meteo archive API for any city you search. It shows monthly high/low temperatures, precipitation, sunshine hours, sunrise/sunset times, and a topographic map of the location. Three layout variations — Swiss grid, oversized numeric hero, and editorial asymmetric — let you view the same data in different ways.

Built as a design+data exploration: I wanted to see how far you could push data visualisation aesthetics with plain React + SVG, no charting library.

## Demo

> _Later I'll add a screenshot here_

## Tech Stack

- **Framework**: Vite + React 19 + TypeScript
- **Data**: [Open-Meteo](https://open-meteo.com/) — geocoding + 10-year ERA5 climate archive (no API key required)
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

**Climate data** is fetched from the Open-Meteo archive API (`/v1/archive`, 2014–2023). The response is ~3,600 daily records aggregated client-side into 12-month normals: temperatures averaged, precipitation summed per month then averaged across years, sunshine converted from seconds/day to hours/day. Sunrise/sunset times are taken from the 15th of each month in 2023 as a representative sample. React Query caches results indefinitely so repeat visits are instant.

**Three views** share one city, one unit toggle (°C/°F), and one chart-type toggle (bar/line/ring). State persists to localStorage via Zustand.

## Future Ideas

- [ ] Real Leaflet marker with popup showing coordinates + elevation
- [ ] Compare two cities side by side
- [ ] Share a city via URL (hash routing)
- [ ] Precipitation unit toggle (mm / in) independent of temperature
- [ ] More cities in the default search suggestions

## License

Free to fork and adapt. Attribution required.
