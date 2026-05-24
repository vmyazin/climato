# Weather Provider Fallback — Design Spec

**Date:** 2026-05-23
**Topic:** Add a secondary weather-data provider behind Open-Meteo for both historical archive (server) and current temperature (moved to server), so that Open-Meteo outages and overload events stop user-visible failures.
**Status:** Spec — not yet implemented.

## Context

Climato currently depends on Open-Meteo for three things:

| Endpoint | Caller | When it fires | User impact when down |
|---|---|---|---|
| Archive (historical normals) | `api/_lib/normals.ts:85` (server) | Once per new city, then KV-cached → drain → static JSON | 502 on first analysis of a city. Already-cached cities unaffected. |
| Forecast (current temp) | `src/hooks/useCurrentTemp.ts:23` (browser) | Every page load (React Query, 5 min stale) | "Current" indicator missing on every comparison page |
| Geocoding (city search) | `src/hooks/useCitySearch.ts:75` (browser) | Every search keystroke | Search broken → can't find cities |

Open-Meteo has had repeated overload events. Geocoding is **out of scope** for this spec — provider-specific IDs and population fields make a swap intrusive. This spec covers archive and forecast only.

## Goal

When Open-Meteo fails (5xx, timeout, malformed response), Climato falls through to a secondary provider and returns successfully. Failures only surface to the user when **all** providers fail.

## Architectural decisions

1. **Move forecast to a server-side route** (`/api/current`). Unlocks Vercel edge caching (popular cities served without touching any upstream), keeps the fallback logic in one language and one place, hides any future API keys.
2. **One fallback per endpoint, not a chain.** Open-Meteo 95% × secondary 95% (independent) → 99.75% combined. A third provider is marginal cost vs. complexity; easy to add later.
3. **No circuit breaker.** Simple try-primary-then-secondary on each request. Stateless, no health tracking, no warmup.
4. **Local sunrise/sunset.** NOAA sunrise equation, ~30 LOC, no dependencies. Removes a fragile field from the Open-Meteo response (currently keyed off `2023-XX-15`) and means the calculation is provider-independent.

## Provider choices

- **Archive primary:** Open-Meteo Archive API (existing).
- **Archive secondary:** NASA POWER. Free, no API key, global gridded, daily resolution back to 1981.
- **Forecast primary:** Open-Meteo Forecast API (existing).
- **Forecast secondary:** MET Norway Locationforecast. Free, no API key (User-Agent header only), global coverage.

## File layout

```
api/
  current.ts                  # NEW route — replaces direct browser fetch
  normals.ts                  # MODIFIED — one-line change to call orchestrator
  _lib/
    normals.ts                # MODIFIED — aggregate() gains (lat, lon) params, drops upstream sunrise/sunset fields from ArchiveDaily
    weather/
      archive.ts              # NEW orchestrator: tryProviders([om, nasa])
      forecast.ts             # NEW orchestrator: tryProviders([om, metno])
      sun.ts                  # NEW — local NOAA sunrise/sunset
      providers/
        open-meteo-archive.ts   # NEW — extracted from current _lib/normals.ts
        nasa-power-archive.ts   # NEW
        open-meteo-forecast.ts  # NEW — server version of current browser hook
        met-no-forecast.ts      # NEW

src/hooks/
  useCurrentTemp.ts           # MODIFIED — URL change only, no shape change
```

The existing `aggregate()` function in `api/_lib/normals.ts` is kept and lightly modified: its new signature is `aggregate(daily: ArchiveDaily, lat: number, lon: number): Normals`, and the `sunrise`/`sunset` fields are dropped from `ArchiveDaily` since both providers stop requesting them — `aggregate()` computes them locally via `sun.ts`. Both archive providers still normalize their upstream shapes to the (now slightly smaller) `ArchiveDaily`. The drain → `data/normals/_index.json` pipeline is untouched (the `Normals` output shape is unchanged).

## Orchestrator contract

```ts
type Provider<T> = (lat: number, lon: number) => Promise<T>

async function tryProviders<T>(
  providers: { name: string; fn: Provider<T> }[],
  lat: number,
  lon: number,
): Promise<{ data: T; source: string }>
```

- Tries providers in order with a 4-second timeout per call (`AbortController`).
- On any failure (timeout, non-2xx, JSON parse error, missing required field), logs to `console.error` with the provider name and reason, then tries the next.
- If all fail, throws — caller decides the status code (`/api/normals` → 502, `/api/current` → 502).
- Returns the data plus the source name so callers can emit `X-Climato-Source`.

## Data normalization

### Archive

NASA POWER returns objects keyed by `YYYYMMDD`:

```json
{
  "properties": {
    "parameter": {
      "T2M_MAX":      { "20140101": 5.2, "20140102": 6.1, ... },
      "T2M_MIN":      { "20140101": -1.3, ... },
      "PRECTOTCORR":  { "20140101": 0.0, ... },
      "ALLSKY_SFC_SW_DWN": { "20140101": 1.45, ... },
      "CLRSKY_SFC_SW_DWN": { "20140101": 4.20, ... }
    }
  }
}
```

The `nasa-power-archive.ts` adapter:
1. Fetches the same date range as Open-Meteo (`ARCHIVE_START` … `ARCHIVE_END`).
2. Rebuilds parallel arrays in the existing `ArchiveDaily` shape.
3. **Sunshine duration approximation:** `sunshine_seconds = (ALLSKY / CLRSKY) × day_length_seconds`. The ratio of all-sky to clear-sky shortwave radiation is a reasonable proxy for "fraction of day that was sunny," scaled by computed day length. Expected accuracy vs. Open-Meteo's `sunshine_duration`: within roughly 10–20%. Acceptable for a fallback; the response advertises `X-Climato-Source: nasa-power` so the lower fidelity is visible.
4. **Sunrise/sunset:** not requested from NASA POWER. Removed from both providers' fetches entirely. `aggregate()` gains a `lat: number, lon: number` parameter and calls `sun.ts` to compute the monthly representative sunrise/sunset values directly. This makes the field provider-independent and removes the fragile dependency on `2023-XX-15` rows being present in upstream data.

### Forecast

MET Norway response:

```json
{
  "properties": {
    "timeseries": [
      { "time": "2026-05-23T14:00:00Z",
        "data": { "instant": { "details": { "air_temperature": 18.2, ... } } } },
      ...
    ]
  }
}
```

The `met-no-forecast.ts` adapter reads `properties.timeseries[0]` and extracts `time` + `data.instant.details.air_temperature`. Returns `{ tempC, observedAt }`. Sends `User-Agent: climato/<version> <contact-email>` per MET Norway's terms.

## Failure detection rules

For every provider call:
- 4-second timeout via `AbortController` (Open-Meteo's overload mode is slow hangs, not 5xx — without a timeout, the function sits until Vercel's 300s limit).
- Non-2xx response → throw.
- JSON parse failure → throw.
- Missing required fields after parsing → throw.

The orchestrator catches `throw`s, logs, moves on. No retry-with-backoff inside a provider; if it fails once, we move on.

## Caching

- `/api/current`: `Cache-Control: public, s-maxage=300, stale-while-revalidate=1800` (5 min fresh, 30 min stale-OK). For popular cities, the vast majority of requests hit Vercel's edge cache and never touch any upstream — this is probably a bigger reliability gain than the fallback chain itself.
- `/api/normals`: unchanged (`s-maxage=3600, stale-while-revalidate=86400` on cache miss; `s-maxage=86400, stale-while-revalidate=604800` on KV hit). KV layer unchanged. Drain promotion unchanged.

## Security

`/api/current` is a new public route. It must apply the same `validateCity(id, lat, lon)` check that `/api/normals` does (see `api/_lib/catalog.js`), so the route can't be used as an open proxy or SSRF vector. The request shape becomes `/api/current?id=<city-id>&lat=<n>&lon=<n>`, matching `/api/normals` exactly. Rate-limited via `checkRateLimit(req, 'current')` — new bucket so it doesn't share the normals limit.

## Observability

- Every fallback logs `console.error('[weather] <endpoint> primary failed, trying <secondary>: <reason>')`.
- Response header `X-Climato-Source: open-meteo | nasa-power | met-no` indicates which provider answered.
- No new metrics infrastructure — Vercel logs are searchable for the `[weather]` prefix.

## Out of scope

- Geocoding fallback. `useCitySearch` continues to call Open-Meteo directly.
- API-key providers (OpenWeatherMap, Visual Crossing, Meteostat-via-RapidAPI).
- Circuit breakers, health checks, smart routing.
- Multi-provider averaging.
- Backfill of historical data into `data/normals/_index.json` from NASA POWER (the static dataset stays Open-Meteo-sourced; NASA POWER only fires when Open-Meteo fails for a not-yet-cached city).

## Acceptance criteria

1. With Open-Meteo unreachable (or returning 5xx), `GET /api/normals?id=…&lat=…&lon=…` for an uncached city returns `200` with a body matching the `Normals` shape and `X-Climato-Source: nasa-power`.
2. With Open-Meteo unreachable, `GET /api/current?id=…&lat=…&lon=…` returns `200` with `{ tempC, observedAt }` and `X-Climato-Source: met-no`.
3. With both providers unreachable, both endpoints return `502 upstream fetch failed`.
4. With Open-Meteo healthy, behavior is unchanged: same data, same shape, `X-Climato-Source: open-meteo`.
5. `useCurrentTemp` queries `/api/current` (no more direct calls to `api.open-meteo.com` from the browser).
6. The 4-second timeout fires on a hanging provider — verified manually by pointing at a slow endpoint.
7. `npm run build` and `npm run lint` (or project equivalents) pass.
