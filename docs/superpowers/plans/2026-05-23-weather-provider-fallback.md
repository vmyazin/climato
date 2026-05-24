# Weather Provider Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secondary weather provider (NASA POWER for archive, MET Norway for forecast) behind Open-Meteo so outages stop reaching users; move the current-temp fetch server-side to enable Vercel edge caching.

**Architecture:** Two server-side orchestrators (`weather/archive.ts`, `weather/forecast.ts`) try providers in order with a 4 s timeout per call. New `/api/current` route replaces direct browser calls to Open-Meteo's forecast API. Sunrise/sunset computed locally with NOAA equation + `tz-lookup`, removing a fragile upstream dependency.

**Tech Stack:** TypeScript, Vercel serverless functions, vitest (new), `tz-lookup` (new), `@upstash/redis` (existing), `@upstash/ratelimit` (existing).

**TDD scope (per user preference):** Pure functions and orchestrator logic only. No UI tests. HTTP route is smoke-tested manually, not unit-tested.

**Spec:** `docs/superpowers/specs/2026-05-23-weather-provider-fallback-design.md`

---

## Task 0: Set up vitest infrastructure

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `api/_lib/weather/__tests__/.gitkeep` (placeholder so the dir exists)

- [ ] **Step 1: Install vitest as a dev dependency**

```bash
npm install --save-dev vitest
```

Expected: vitest added to `devDependencies`, lockfile updated.

- [ ] **Step 2: Add `test` and `test:run` scripts to `package.json`**

Modify the `"scripts"` block:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -p tsconfig.json && tsc -p tsconfig.node.json && vite build",
  "preview": "vite preview",
  "cities:build": "scripts/build-cities.sh",
  "test": "vitest",
  "test:run": "vitest run"
}
```

- [ ] **Step 3: Create `vitest.config.ts` at the repo root**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['api/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
})
```

- [ ] **Step 4: Sanity-check the runner with a throwaway test**

Create `api/_lib/weather/__tests__/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('vitest sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `npm run test:run`
Expected: 1 test passes.

- [ ] **Step 5: Delete the sanity test and commit**

```bash
rm api/_lib/weather/__tests__/sanity.test.ts
# Ensure the dir still exists for upcoming tests
mkdir -p api/_lib/weather/__tests__ && touch api/_lib/weather/__tests__/.gitkeep
git add package.json package-lock.json vitest.config.ts api/_lib/weather/__tests__/.gitkeep
git commit -m "chore: add vitest for backend unit tests"
```

---

## Task 1: Implement `sun.ts` — local sunrise/sunset (TDD)

**Files:**
- Create: `api/_lib/weather/sun.ts`
- Create: `api/_lib/weather/__tests__/sun.test.ts`
- Modify: `package.json` (add `tz-lookup`)

- [ ] **Step 1: Install `tz-lookup`**

```bash
npm install tz-lookup
npm install --save-dev @types/tz-lookup
```

If `@types/tz-lookup` does not exist on npm (it's a tiny package), skip the types install — add a one-line module declaration in step 3 instead.

- [ ] **Step 2: Write the failing test**

Create `api/_lib/weather/__tests__/sun.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { monthlySunriseSunset } from '../sun.js'

describe('monthlySunriseSunset', () => {
  it('returns 12 HH:MM entries each for sunrise and sunset', () => {
    const { sunrise, sunset } = monthlySunriseSunset(35.6762, 139.6503)
    expect(sunrise).toHaveLength(12)
    expect(sunset).toHaveLength(12)
    for (const s of [...sunrise, ...sunset]) {
      expect(s).toMatch(/^\d{2}:\d{2}$/)
    }
  })

  it('produces Tokyo-local times (sunrise mid-Jun around 04:25 JST)', () => {
    const { sunrise } = monthlySunriseSunset(35.6762, 139.6503)
    // June is index 5; tolerate ±10 minutes for equation/rounding
    const [hh, mm] = sunrise[5]!.split(':').map(Number)
    const minutes = hh! * 60 + mm!
    expect(minutes).toBeGreaterThan(4 * 60 + 15)
    expect(minutes).toBeLessThan(4 * 60 + 35)
  })

  it('handles polar twilight (Reykjavik in December sunrise after 11:00)', () => {
    const { sunrise } = monthlySunriseSunset(64.1466, -21.9426)
    const [hh] = sunrise[11]!.split(':').map(Number)
    expect(hh).toBeGreaterThanOrEqual(11)
  })

  it('handles a southern-hemisphere city (Buenos Aires Jan sunrise before 07:00 local)', () => {
    const { sunrise } = monthlySunriseSunset(-34.6037, -58.3816)
    const [hh] = sunrise[0]!.split(':').map(Number)
    expect(hh).toBeLessThan(7)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:run -- sun.test.ts`
Expected: FAIL — `monthlySunriseSunset` not exported.

- [ ] **Step 4: Implement `sun.ts`**

Create `api/_lib/weather/sun.ts`:

```ts
// @ts-ignore — tz-lookup ships no types
import tzlookup from 'tz-lookup'

// NOAA Solar Calculator algorithm. Returns UT (UTC) Date for sunrise/sunset.
// References: https://gml.noaa.gov/grad/solcalc/
// Returns null when the sun does not rise / set on that date at that latitude.
function solarEvent(date: Date, lat: number, lon: number, rising: boolean): Date | null {
  const rad = Math.PI / 180
  const deg = 180 / Math.PI

  // Days since J2000.0
  const J2000 = Date.UTC(2000, 0, 1, 12) // 2000-01-01T12:00Z
  const n = (date.getTime() - J2000) / 86400000

  // Mean solar noon (in fractional days, west longitude positive in NOAA but we
  // use the standard convention: east positive, so subtract lon/360)
  const Jstar = n - lon / 360

  // Solar mean anomaly
  const M = (357.5291 + 0.98560028 * Jstar) % 360
  const Mr = M * rad

  // Equation of the center
  const C =
    1.9148 * Math.sin(Mr) +
    0.02 * Math.sin(2 * Mr) +
    0.0003 * Math.sin(3 * Mr)

  // Ecliptic longitude
  const lambda = (M + C + 180 + 102.9372) % 360
  const lambdaR = lambda * rad

  // Solar transit (Julian date of solar noon)
  const Jtransit = Jstar + 0.0053 * Math.sin(Mr) - 0.0069 * Math.sin(2 * lambdaR)

  // Declination of the sun
  const sinDelta = Math.sin(lambdaR) * Math.sin(23.4397 * rad)
  const delta = Math.asin(sinDelta)

  // Hour angle for sunrise/sunset (geometric, no atmospheric refraction correction
  // beyond the standard -0.833° altitude)
  const phi = lat * rad
  const cosH =
    (Math.sin(-0.833 * rad) - Math.sin(phi) * sinDelta) /
    (Math.cos(phi) * Math.cos(delta))
  if (cosH > 1 || cosH < -1) return null // polar day/night

  const H = Math.acos(cosH) * deg
  const Jevent = Jtransit + (rising ? -H : H) / 360

  // Convert J back to a Date
  return new Date(J2000 + Jevent * 86400000)
}

function formatLocal(date: Date, timeZone: string): string {
  // en-GB gives 24-hour HH:MM.
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export interface SunMonths {
  sunrise: string[] // 12 entries, HH:MM in city's local time
  sunset: string[]
}

// Computes the 15th-of-month sunrise/sunset for the city, rendered as HH:MM
// in the city's IANA timezone. Falls back to '06:00' / '18:00' on polar days.
export function monthlySunriseSunset(lat: number, lon: number): SunMonths {
  const tz = tzlookup(lat, lon)
  const year = new Date().getUTCFullYear()
  const sunrise: string[] = []
  const sunset: string[] = []
  for (let m = 0; m < 12; m++) {
    const day = new Date(Date.UTC(year, m, 15, 12))
    const sr = solarEvent(day, lat, lon, true)
    const ss = solarEvent(day, lat, lon, false)
    sunrise.push(sr ? formatLocal(sr, tz) : '06:00')
    sunset.push(ss ? formatLocal(ss, tz) : '18:00')
  }
  return { sunrise, sunset }
}
```

If TypeScript complains about `tz-lookup` and there are no `@types/tz-lookup`, add a declaration file at the same time:

Create `api/_lib/weather/tz-lookup.d.ts`:

```ts
declare module 'tz-lookup' {
  function tzlookup(lat: number, lon: number): string
  export default tzlookup
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:run -- sun.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add api/_lib/weather/sun.ts api/_lib/weather/tz-lookup.d.ts api/_lib/weather/__tests__/sun.test.ts package.json package-lock.json
git commit -m "feat(weather): local sunrise/sunset via NOAA equation + tz-lookup"
```

---

## Task 2: Update `aggregate()` to use local sunrise/sunset (TDD on the new signature)

**Files:**
- Modify: `api/_lib/normals.ts`
- Create: `api/_lib/__tests__/normals.aggregate.test.ts`

- [ ] **Step 1: Write a failing test for the new signature**

Create `api/_lib/__tests__/normals.aggregate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { aggregate } from '../normals.js'

const blankDaily = {
  time: ['2023-01-15', '2023-07-15'],
  temperature_2m_max: [5, 30],
  temperature_2m_min: [-2, 22],
  precipitation_sum: [3, 1],
  sunshine_duration: [3600, 36000], // 1h, 10h
}

describe('aggregate', () => {
  it('returns 12 monthly entries for every field', () => {
    const out = aggregate(blankDaily, 35.6762, 139.6503)
    expect(out.high).toHaveLength(12)
    expect(out.low).toHaveLength(12)
    expect(out.precip).toHaveLength(12)
    expect(out.sun).toHaveLength(12)
    expect(out.sunrise).toHaveLength(12)
    expect(out.sunset).toHaveLength(12)
  })

  it('uses local sunrise/sunset (Tokyo June sunrise around 04:25 JST)', () => {
    const out = aggregate(blankDaily, 35.6762, 139.6503)
    const [hh, mm] = out.sunrise[5]!.split(':').map(Number)
    const minutes = hh! * 60 + mm!
    expect(minutes).toBeGreaterThan(4 * 60 + 15)
    expect(minutes).toBeLessThan(4 * 60 + 35)
  })

  it('produces correct January high for Tokyo data', () => {
    const out = aggregate(blankDaily, 35.6762, 139.6503)
    expect(out.high[0]).toBe(5)
    expect(out.high[6]).toBe(30)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- normals.aggregate.test.ts`
Expected: FAIL — current `aggregate()` takes one arg and `ArchiveDaily` still has `sunrise`/`sunset` fields.

- [ ] **Step 3: Modify `api/_lib/normals.ts`**

Replace the `ArchiveDaily` interface and `aggregate` function with this version (keep `Normals`, `ARCHIVE_START`, `ARCHIVE_END` unchanged; remove `fetchOpenMeteoNormals` — it will move in Task 3):

```ts
import { monthlySunriseSunset } from './weather/sun.js'

export interface Normals {
  high: number[]
  low: number[]
  precip: number[]
  sun: number[]
  sunrise: string[]
  sunset: string[]
}

export const ARCHIVE_START = '2014-01-01'
export const ARCHIVE_END = '2023-12-31'

export interface ArchiveDaily {
  time: string[]
  temperature_2m_max: (number | null)[]
  temperature_2m_min: (number | null)[]
  precipitation_sum: (number | null)[]
  sunshine_duration: (number | null)[]
}

export function aggregate(daily: ArchiveDaily, lat: number, lon: number): Normals {
  const hiSum = new Array(12).fill(0), hiCnt = new Array(12).fill(0)
  const loSum = new Array(12).fill(0), loCnt = new Array(12).fill(0)
  const sunSum = new Array(12).fill(0), sunCnt = new Array(12).fill(0)
  const precipMonthly: Record<string, number> = {}
  const n = daily.time.length

  for (let i = 0; i < n; i++) {
    const date = daily.time[i]!
    const m  = parseInt(date.slice(5, 7)) - 1
    const ym = date.slice(0, 7)

    const hi  = daily.temperature_2m_max[i]
    const lo  = daily.temperature_2m_min[i]
    const pr  = daily.precipitation_sum[i]
    const sun = daily.sunshine_duration[i]

    if (hi != null) { hiSum[m] += hi; hiCnt[m]++ }
    if (lo != null) { loSum[m] += lo; loCnt[m]++ }
    if (sun != null) { sunSum[m] += sun / 3600; sunCnt[m]++ }
    if (pr != null) precipMonthly[ym] = (precipMonthly[ym] ?? 0) + pr
  }

  const precipByMonth: number[][] = Array.from({ length: 12 }, () => [])
  for (const [ym, total] of Object.entries(precipMonthly)) {
    precipByMonth[parseInt(ym.slice(5, 7)) - 1]!.push(total)
  }

  const r1 = (s: number, c: number) => Math.round((s / (c || 1)) * 10) / 10
  const ri = (arr: number[]) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0

  const { sunrise, sunset } = monthlySunriseSunset(lat, lon)

  return {
    high:   hiSum.map((s, i) => r1(s, hiCnt[i])),
    low:    loSum.map((s, i) => r1(s, loCnt[i])),
    precip: precipByMonth.map(ri),
    sun:    sunSum.map((s, i) => r1(s, sunCnt[i])),
    sunrise,
    sunset,
  }
}
```

The existing `fetchOpenMeteoNormals` export is intentionally **removed** here. The next task re-creates it under the new providers directory; in the same task the orchestrator wires it back into `/api/normals.ts`. The repo is briefly in a non-building state between these tasks — that's fine if the tasks are committed sequentially.

- [ ] **Step 4: Run aggregate tests to verify they pass**

Run: `npm run test:run -- normals.aggregate.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

The build will not compile yet (the `/api/normals.ts` import of `fetchOpenMeteoNormals` is broken). Tasks 3–6 fix it. Use a commit message that flags this explicitly:

```bash
git add api/_lib/normals.ts api/_lib/__tests__/normals.aggregate.test.ts
git commit -m "refactor(normals): aggregate() takes lat/lon, sunrise/sunset computed locally

Removes fetchOpenMeteoNormals — re-added under api/_lib/weather/providers/
in the next commit. Build is broken between this commit and the orchestrator
wiring; do not branch from this commit alone."
```

---

## Task 3: Extract Open-Meteo archive provider

**Files:**
- Create: `api/_lib/weather/providers/open-meteo-archive.ts`

- [ ] **Step 1: Create the provider file**

```ts
import { ARCHIVE_START, ARCHIVE_END, type ArchiveDaily } from '../../normals.js'

export async function fetchOpenMeteoArchive(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<ArchiveDaily> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: ARCHIVE_START,
    end_date: ARCHIVE_END,
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration',
    timezone: 'auto',
  })
  const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`, { signal })
  if (!res.ok) throw new Error(`open-meteo archive HTTP ${res.status}`)
  const json = (await res.json()) as { daily?: Partial<ArchiveDaily> }
  const d = json.daily
  if (
    !d ||
    !Array.isArray(d.time) ||
    !Array.isArray(d.temperature_2m_max) ||
    !Array.isArray(d.temperature_2m_min)
  ) {
    throw new Error('open-meteo archive: missing daily fields')
  }
  return d as ArchiveDaily
}
```

Notes:
- Sunrise/sunset are no longer requested.
- Accepts an `AbortSignal` so the orchestrator can enforce its 4 s timeout.
- Validates the response shape; missing fields throw and trigger fallback.

- [ ] **Step 2: Commit**

```bash
git add api/_lib/weather/providers/open-meteo-archive.ts
git commit -m "feat(weather): extract Open-Meteo archive provider"
```

---

## Task 4: Implement NASA POWER archive provider (TDD normalizer)

**Files:**
- Create: `api/_lib/weather/providers/nasa-power-archive.ts`
- Create: `api/_lib/weather/__tests__/nasa-power-archive.test.ts`
- Create: `api/_lib/weather/__tests__/fixtures/nasa-power-sample.json` (small response fixture)

- [ ] **Step 1: Create a small NASA POWER fixture**

Create `api/_lib/weather/__tests__/fixtures/nasa-power-sample.json`:

```json
{
  "properties": {
    "parameter": {
      "T2M_MAX": { "20230101": 5.2, "20230102": 6.1, "20230715": 30.4 },
      "T2M_MIN": { "20230101": -1.3, "20230102": -0.8, "20230715": 22.1 },
      "PRECTOTCORR": { "20230101": 0.0, "20230102": 4.5, "20230715": 1.1 },
      "ALLSKY_SFC_SW_DWN": { "20230101": 1.45, "20230102": 0.40, "20230715": 5.20 },
      "CLRSKY_SFC_SW_DWN": { "20230101": 4.20, "20230102": 4.10, "20230715": 6.50 }
    }
  }
}
```

NASA POWER values: `T2M_*` in °C, `PRECTOTCORR` in mm/day, `ALLSKY_*`/`CLRSKY_*` in kWh/m²/day.

- [ ] **Step 2: Write the failing test**

Create `api/_lib/weather/__tests__/nasa-power-archive.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeNasaPower } from '../providers/nasa-power-archive.js'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(resolve(here, 'fixtures/nasa-power-sample.json'), 'utf8'),
)

describe('normalizeNasaPower', () => {
  it('produces parallel arrays in ISO date order', () => {
    const out = normalizeNasaPower(fixture, 35.6762)
    expect(out.time).toEqual(['2023-01-01', '2023-01-02', '2023-07-15'])
    expect(out.temperature_2m_max).toEqual([5.2, 6.1, 30.4])
    expect(out.temperature_2m_min).toEqual([-1.3, -0.8, 22.1])
    expect(out.precipitation_sum).toEqual([0.0, 4.5, 1.1])
  })

  it('derives sunshine_duration from radiation ratio × day length, in seconds', () => {
    const out = normalizeNasaPower(fixture, 35.6762)
    // Day 1: ratio = 1.45/4.20 ≈ 0.345. Tokyo Jan 1 day length ~ 9h36m = 34560s.
    // Expected sunshine ≈ 0.345 × 34560 ≈ 11923s. Allow ±25% slack for day-length approx.
    expect(out.sunshine_duration[0]).toBeGreaterThan(8000)
    expect(out.sunshine_duration[0]).toBeLessThan(16000)
    // Day 2 (overcast): ratio ≈ 0.40/4.10 = 0.098 → small sunshine number.
    expect(out.sunshine_duration[1]).toBeLessThan(out.sunshine_duration[0]!)
  })

  it('clamps the ratio to [0, 1] when the upstream returns weird data', () => {
    const fx = {
      properties: {
        parameter: {
          T2M_MAX: { '20230101': 0 },
          T2M_MIN: { '20230101': 0 },
          PRECTOTCORR: { '20230101': 0 },
          ALLSKY_SFC_SW_DWN: { '20230101': 10 },
          CLRSKY_SFC_SW_DWN: { '20230101': 5 }, // ratio = 2.0
        },
      },
    }
    const out = normalizeNasaPower(fx, 35.6762)
    expect(out.sunshine_duration[0]).toBeLessThanOrEqual(15 * 3600)
  })

  it('handles missing fields by emitting null', () => {
    const fx = {
      properties: {
        parameter: {
          T2M_MAX: { '20230101': 5.0 },
          T2M_MIN: { '20230101': -1 },
          PRECTOTCORR: {},
          ALLSKY_SFC_SW_DWN: {},
          CLRSKY_SFC_SW_DWN: {},
        },
      },
    }
    const out = normalizeNasaPower(fx, 35.6762)
    expect(out.precipitation_sum[0]).toBeNull()
    expect(out.sunshine_duration[0]).toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:run -- nasa-power-archive.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the provider**

Create `api/_lib/weather/providers/nasa-power-archive.ts`:

```ts
import { ARCHIVE_START, ARCHIVE_END, type ArchiveDaily } from '../../normals.js'

interface NasaPowerResponse {
  properties?: {
    parameter?: {
      T2M_MAX?: Record<string, number>
      T2M_MIN?: Record<string, number>
      PRECTOTCORR?: Record<string, number>
      ALLSKY_SFC_SW_DWN?: Record<string, number>
      CLRSKY_SFC_SW_DWN?: Record<string, number>
    }
  }
}

// Day length in seconds for a given latitude and day of year. Closed-form
// approximation using solar declination; accurate to within a few minutes.
function dayLengthSeconds(lat: number, dayOfYear: number): number {
  const phi = (lat * Math.PI) / 180
  // Solar declination (Cooper's formula)
  const delta = (23.45 * Math.PI / 180) * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365)
  const cosH = -Math.tan(phi) * Math.tan(delta)
  if (cosH >= 1) return 0          // polar night
  if (cosH <= -1) return 24 * 3600 // polar day
  const H = Math.acos(cosH) // hour angle in radians
  return (2 * H * 12 * 3600) / Math.PI
}

function isoDate(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

function dayOfYear(yyyymmdd: string): number {
  const y = +yyyymmdd.slice(0, 4)
  const m = +yyyymmdd.slice(4, 6) - 1
  const d = +yyyymmdd.slice(6, 8)
  const start = Date.UTC(y, 0, 1)
  return Math.floor((Date.UTC(y, m, d) - start) / 86400000) + 1
}

// NASA POWER uses -999 as its sentinel for missing values. Treat as null.
function val(map: Record<string, number> | undefined, key: string): number | null {
  if (!map) return null
  const v = map[key]
  if (v === undefined || v === -999) return null
  return v
}

export function normalizeNasaPower(json: NasaPowerResponse, lat: number): ArchiveDaily {
  const p = json.properties?.parameter
  if (!p?.T2M_MAX || !p.T2M_MIN) {
    throw new Error('nasa-power: missing core temperature fields')
  }

  const keys = Object.keys(p.T2M_MAX).sort() // sortable: YYYYMMDD lexicographic = chronological

  const time: string[] = []
  const tmax: (number | null)[] = []
  const tmin: (number | null)[] = []
  const prcp: (number | null)[] = []
  const sun: (number | null)[] = []

  for (const k of keys) {
    time.push(isoDate(k))
    tmax.push(val(p.T2M_MAX, k))
    tmin.push(val(p.T2M_MIN, k))
    prcp.push(val(p.PRECTOTCORR, k))

    const all = val(p.ALLSKY_SFC_SW_DWN, k)
    const clr = val(p.CLRSKY_SFC_SW_DWN, k)
    if (all == null || clr == null || clr <= 0) {
      sun.push(null)
    } else {
      const ratio = Math.max(0, Math.min(1, all / clr))
      const dl = dayLengthSeconds(lat, dayOfYear(k))
      sun.push(Math.round(ratio * dl))
    }
  }

  return {
    time,
    temperature_2m_max: tmax,
    temperature_2m_min: tmin,
    precipitation_sum: prcp,
    sunshine_duration: sun,
  }
}

export async function fetchNasaPowerArchive(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<ArchiveDaily> {
  const start = ARCHIVE_START.replaceAll('-', '')
  const end = ARCHIVE_END.replaceAll('-', '')
  const params = new URLSearchParams({
    parameters: 'T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN,CLRSKY_SFC_SW_DWN',
    community: 'AG',
    latitude: String(lat),
    longitude: String(lon),
    start,
    end,
    format: 'JSON',
  })
  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?${params}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`nasa-power HTTP ${res.status}`)
  const json = (await res.json()) as NasaPowerResponse
  return normalizeNasaPower(json, lat)
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:run -- nasa-power-archive.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add api/_lib/weather/providers/nasa-power-archive.ts api/_lib/weather/__tests__/nasa-power-archive.test.ts api/_lib/weather/__tests__/fixtures/nasa-power-sample.json
git commit -m "feat(weather): NASA POWER archive provider with sunshine approximation"
```

---

## Task 5: Implement `tryProviders` + archive orchestrator (TDD)

**Files:**
- Create: `api/_lib/weather/try-providers.ts`
- Create: `api/_lib/weather/archive.ts`
- Create: `api/_lib/weather/__tests__/try-providers.test.ts`
- Create: `api/_lib/weather/__tests__/archive.test.ts`

- [ ] **Step 1: Write failing tests for `tryProviders`**

Create `api/_lib/weather/__tests__/try-providers.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tryProviders } from '../try-providers.js'

describe('tryProviders', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('returns the first provider result on success', async () => {
    const out = await tryProviders([
      { name: 'p1', fn: async () => 'a' },
      { name: 'p2', fn: async () => 'b' },
    ], 4000)
    expect(out).toEqual({ data: 'a', source: 'p1' })
  })

  it('falls through to the next provider when the first throws', async () => {
    const out = await tryProviders([
      { name: 'p1', fn: async () => { throw new Error('boom') } },
      { name: 'p2', fn: async () => 'b' },
    ], 4000)
    expect(out).toEqual({ data: 'b', source: 'p2' })
  })

  it('throws when all providers fail', async () => {
    await expect(tryProviders([
      { name: 'p1', fn: async () => { throw new Error('one') } },
      { name: 'p2', fn: async () => { throw new Error('two') } },
    ], 4000)).rejects.toThrow(/all providers failed/i)
  })

  it('aborts a provider that exceeds the timeout', async () => {
    const slow = { name: 'slow', fn: (_signal: AbortSignal) =>
      new Promise<string>((_, reject) => {
        _signal.addEventListener('abort', () => reject(new Error('aborted')))
      })
    }
    const fast = { name: 'fast', fn: async () => 'fast-result' }

    const promise = tryProviders([slow, fast], 4000)
    await vi.advanceTimersByTimeAsync(4001)
    await expect(promise).resolves.toEqual({ data: 'fast-result', source: 'fast' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- try-providers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `try-providers.ts`**

```ts
export interface ProviderEntry<T> {
  name: string
  fn: (signal: AbortSignal) => Promise<T>
}

export interface ProviderResult<T> {
  data: T
  source: string
}

// Tries each provider in order. Each call gets its own AbortController with the
// given timeout. On error or timeout, logs to console.error and moves to the
// next provider. Throws if all fail.
export async function tryProviders<T>(
  providers: ProviderEntry<T>[],
  timeoutMs: number,
): Promise<ProviderResult<T>> {
  const errors: string[] = []
  for (const { name, fn } of providers) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs)
    try {
      const data = await fn(controller.signal)
      return { data, source: name }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      console.error(`[weather] provider "${name}" failed: ${reason}`)
      errors.push(`${name}: ${reason}`)
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error(`all providers failed: ${errors.join(' | ')}`)
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test:run -- try-providers.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Write failing test for `archive.ts` orchestrator**

Create `api/_lib/weather/__tests__/archive.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'

// Mock both providers before importing the orchestrator.
vi.mock('../providers/open-meteo-archive.js', () => ({
  fetchOpenMeteoArchive: vi.fn(),
}))
vi.mock('../providers/nasa-power-archive.js', () => ({
  fetchNasaPowerArchive: vi.fn(),
}))

import { fetchArchiveNormals } from '../archive.js'
import { fetchOpenMeteoArchive } from '../providers/open-meteo-archive.js'
import { fetchNasaPowerArchive } from '../providers/nasa-power-archive.js'

const fakeDaily = {
  time: ['2023-01-15'],
  temperature_2m_max: [5],
  temperature_2m_min: [-2],
  precipitation_sum: [3],
  sunshine_duration: [3600],
}

describe('fetchArchiveNormals', () => {
  it('uses Open-Meteo when it succeeds', async () => {
    vi.mocked(fetchOpenMeteoArchive).mockResolvedValueOnce(fakeDaily)
    const out = await fetchArchiveNormals(35.6762, 139.6503)
    expect(out.source).toBe('open-meteo')
    expect(out.data.high).toHaveLength(12)
    expect(fetchNasaPowerArchive).not.toHaveBeenCalled()
  })

  it('falls back to NASA POWER on Open-Meteo failure', async () => {
    vi.mocked(fetchOpenMeteoArchive).mockRejectedValueOnce(new Error('500'))
    vi.mocked(fetchNasaPowerArchive).mockResolvedValueOnce(fakeDaily)
    const out = await fetchArchiveNormals(35.6762, 139.6503)
    expect(out.source).toBe('nasa-power')
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm run test:run -- archive.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement `archive.ts`**

```ts
import { aggregate, type Normals } from '../normals.js'
import { fetchOpenMeteoArchive } from './providers/open-meteo-archive.js'
import { fetchNasaPowerArchive } from './providers/nasa-power-archive.js'
import { tryProviders } from './try-providers.js'

const TIMEOUT_MS = 4000

export async function fetchArchiveNormals(
  lat: number,
  lon: number,
): Promise<{ data: Normals; source: string }> {
  const { data, source } = await tryProviders(
    [
      { name: 'open-meteo', fn: (signal) => fetchOpenMeteoArchive(lat, lon, signal) },
      { name: 'nasa-power', fn: (signal) => fetchNasaPowerArchive(lat, lon, signal) },
    ],
    TIMEOUT_MS,
  )
  return { data: aggregate(data, lat, lon), source }
}
```

- [ ] **Step 8: Run all tests to verify pass**

Run: `npm run test:run`
Expected: all tests PASS (sun, aggregate, nasa-power, try-providers, archive).

- [ ] **Step 9: Commit**

```bash
git add api/_lib/weather/try-providers.ts api/_lib/weather/archive.ts api/_lib/weather/__tests__/try-providers.test.ts api/_lib/weather/__tests__/archive.test.ts
git commit -m "feat(weather): archive orchestrator with try-providers fallback chain"
```

---

## Task 6: Wire archive orchestrator into `/api/normals.ts`

**Files:**
- Modify: `api/normals.ts`

- [ ] **Step 1: Replace the Open-Meteo call with the orchestrator**

In `api/normals.ts`, change the import on line 1 and the fetch call around line 134.

Replace:

```ts
import { fetchOpenMeteoNormals, type Normals } from './_lib/normals.js'
```

with:

```ts
import { type Normals } from './_lib/normals.js'
import { fetchArchiveNormals } from './_lib/weather/archive.js'
```

Then replace the `fetchOpenMeteoNormals` call:

```ts
  let normals: Normals
  try {
    normals = await fetchOpenMeteoNormals(lat, lon)
  } catch (err) {
    console.error('[normals] Open-Meteo fetch failed:', err)
    return bad(res, 502, 'upstream fetch failed')
  }
```

with:

```ts
  let normals: Normals
  let source: string
  try {
    const result = await fetchArchiveNormals(lat, lon)
    normals = result.data
    source = result.source
  } catch (err) {
    console.error('[normals] all archive providers failed:', err)
    return bad(res, 502, 'upstream fetch failed')
  }
```

Then in the success path (just before `res.json(normals)` at the end), add the header:

```ts
  res.setHeader('X-Climato-Source', source)
```

(Place it next to the existing `X-Climato-Cache: miss` header.)

- [ ] **Step 2: Run typecheck**

```bash
npx tsc -p tsconfig.node.json --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
npm run test:run
```

Expected: all PASS.

- [ ] **Step 4: Manual smoke test against the dev server**

```bash
npm run dev &
# Wait a few seconds for vite + vercel dev to be ready
curl -sD - 'http://localhost:5173/api/normals?id=tokyo&lat=35.6762&lon=139.6503' | head -30
```

Expected: `200 OK`, JSON with `high`/`low`/`precip`/`sun`/`sunrise`/`sunset` arrays, `X-Climato-Source: open-meteo` header. Kill the dev server when done.

If `/api/normals` isn't routed by `vite` directly, the project uses `vercel dev` for the API layer — check `vite.config.ts` or the existing dev workflow doc. Adjust the URL/port to match.

- [ ] **Step 5: Commit**

```bash
git add api/normals.ts
git commit -m "feat(api/normals): use archive orchestrator with NASA POWER fallback"
```

---

## Task 7: Open-Meteo forecast provider

**Files:**
- Create: `api/_lib/weather/providers/open-meteo-forecast.ts`

No unit test for this one — per the TDD scope above, HTTP-glue providers (raw `fetch` + status-check) get manual smoke-tested via the orchestrator and route tests. The data-shape normalization in `normalizeMetNo` (Task 8) is where parsing logic that warrants testing actually lives.

- [ ] **Step 1: Create the provider**

```ts
export interface CurrentTemp {
  tempC: number
  observedAt: string
}

interface ForecastResponse {
  current?: { time?: string; temperature_2m?: number }
}

export async function fetchOpenMeteoForecast(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<CurrentTemp> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m',
    timezone: 'auto',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal })
  if (!res.ok) throw new Error(`open-meteo forecast HTTP ${res.status}`)
  const json = (await res.json()) as ForecastResponse
  const t = json.current?.temperature_2m
  const time = json.current?.time
  if (typeof t !== 'number' || !time) throw new Error('open-meteo forecast: missing current fields')
  return { tempC: t, observedAt: time }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/_lib/weather/providers/open-meteo-forecast.ts
git commit -m "feat(weather): Open-Meteo forecast provider (server side)"
```

---

## Task 8: MET Norway forecast provider (TDD normalizer)

**Files:**
- Create: `api/_lib/weather/providers/met-no-forecast.ts`
- Create: `api/_lib/weather/__tests__/met-no-forecast.test.ts`
- Create: `api/_lib/weather/__tests__/fixtures/met-no-sample.json`

- [ ] **Step 1: Create fixture**

Save a trimmed MET Norway response at `api/_lib/weather/__tests__/fixtures/met-no-sample.json`:

```json
{
  "properties": {
    "timeseries": [
      {
        "time": "2026-05-24T14:00:00Z",
        "data": {
          "instant": { "details": { "air_temperature": 18.2, "wind_speed": 3.4 } }
        }
      },
      {
        "time": "2026-05-24T15:00:00Z",
        "data": {
          "instant": { "details": { "air_temperature": 17.9 } }
        }
      }
    ]
  }
}
```

- [ ] **Step 2: Write failing test**

Create `api/_lib/weather/__tests__/met-no-forecast.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeMetNo } from '../providers/met-no-forecast.js'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(resolve(here, 'fixtures/met-no-sample.json'), 'utf8'),
)

describe('normalizeMetNo', () => {
  it('extracts air_temperature and time from first timeseries entry', () => {
    expect(normalizeMetNo(fixture)).toEqual({
      tempC: 18.2,
      observedAt: '2026-05-24T14:00:00Z',
    })
  })

  it('throws when timeseries is empty', () => {
    expect(() => normalizeMetNo({ properties: { timeseries: [] } })).toThrow(
      /missing|empty/i,
    )
  })

  it('throws when air_temperature is missing', () => {
    expect(() => normalizeMetNo({
      properties: {
        timeseries: [{ time: 'now', data: { instant: { details: {} } } }],
      },
    })).toThrow(/missing/i)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:run -- met-no-forecast.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement provider**

Create `api/_lib/weather/providers/met-no-forecast.ts`:

```ts
import type { CurrentTemp } from './open-meteo-forecast.js'

// MET Norway requires identification. Includes a contact URL so they can
// reach us if our usage causes issues. Bump the version when the user-agent
// string changes meaningfully.
const USER_AGENT = 'climato/1.0 (+https://climato.app/contact)'

interface MetNoResponse {
  properties?: {
    timeseries?: Array<{
      time?: string
      data?: { instant?: { details?: { air_temperature?: number } } }
    }>
  }
}

export function normalizeMetNo(json: MetNoResponse): CurrentTemp {
  const ts = json.properties?.timeseries
  if (!ts || ts.length === 0) throw new Error('met-no: missing or empty timeseries')
  const first = ts[0]!
  const t = first.data?.instant?.details?.air_temperature
  const time = first.time
  if (typeof t !== 'number' || !time) throw new Error('met-no: missing air_temperature or time')
  return { tempC: t, observedAt: time }
}

export async function fetchMetNoForecast(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<CurrentTemp> {
  // MET Norway recommends ≤4 decimal places (privacy + cache).
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`
  const res = await fetch(url, {
    signal,
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`met-no HTTP ${res.status}`)
  const json = (await res.json()) as MetNoResponse
  return normalizeMetNo(json)
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm run test:run -- met-no-forecast.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add api/_lib/weather/providers/met-no-forecast.ts api/_lib/weather/__tests__/met-no-forecast.test.ts api/_lib/weather/__tests__/fixtures/met-no-sample.json
git commit -m "feat(weather): MET Norway forecast provider"
```

---

## Task 9: Forecast orchestrator (TDD)

**Files:**
- Create: `api/_lib/weather/forecast.ts`
- Create: `api/_lib/weather/__tests__/forecast.test.ts`

- [ ] **Step 1: Write failing test**

Create `api/_lib/weather/__tests__/forecast.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('../providers/open-meteo-forecast.js', () => ({
  fetchOpenMeteoForecast: vi.fn(),
}))
vi.mock('../providers/met-no-forecast.js', () => ({
  fetchMetNoForecast: vi.fn(),
}))

import { fetchCurrentTemp } from '../forecast.js'
import { fetchOpenMeteoForecast } from '../providers/open-meteo-forecast.js'
import { fetchMetNoForecast } from '../providers/met-no-forecast.js'

const sample = { tempC: 18.2, observedAt: '2026-05-24T14:00:00Z' }

describe('fetchCurrentTemp', () => {
  it('uses Open-Meteo when it succeeds', async () => {
    vi.mocked(fetchOpenMeteoForecast).mockResolvedValueOnce(sample)
    const out = await fetchCurrentTemp(35.6762, 139.6503)
    expect(out).toEqual({ data: sample, source: 'open-meteo' })
    expect(fetchMetNoForecast).not.toHaveBeenCalled()
  })

  it('falls back to MET Norway when Open-Meteo fails', async () => {
    vi.mocked(fetchOpenMeteoForecast).mockRejectedValueOnce(new Error('500'))
    vi.mocked(fetchMetNoForecast).mockResolvedValueOnce(sample)
    const out = await fetchCurrentTemp(35.6762, 139.6503)
    expect(out.source).toBe('met-no')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- forecast.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `forecast.ts`**

```ts
import type { CurrentTemp } from './providers/open-meteo-forecast.js'
import { fetchOpenMeteoForecast } from './providers/open-meteo-forecast.js'
import { fetchMetNoForecast } from './providers/met-no-forecast.js'
import { tryProviders } from './try-providers.js'

const TIMEOUT_MS = 4000

export async function fetchCurrentTemp(
  lat: number,
  lon: number,
): Promise<{ data: CurrentTemp; source: string }> {
  return tryProviders(
    [
      { name: 'open-meteo', fn: (signal) => fetchOpenMeteoForecast(lat, lon, signal) },
      { name: 'met-no',     fn: (signal) => fetchMetNoForecast(lat, lon, signal) },
    ],
    TIMEOUT_MS,
  )
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test:run`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/weather/forecast.ts api/_lib/weather/__tests__/forecast.test.ts
git commit -m "feat(weather): forecast orchestrator with MET Norway fallback"
```

---

## Task 10: Create `/api/current` route

**Files:**
- Create: `api/current.ts`
- Modify: `api/_lib/ratelimit.ts` (add `'current'` bucket)

- [ ] **Step 1: Add `'current'` bucket to the rate limiter**

In `api/_lib/ratelimit.ts`, update the namespace union and limits:

```ts
export type RateLimitNamespace = 'normals' | 'nearby' | 'og' | 'admin' | 'current'

const LIMITS: Record<RateLimitNamespace, { tokens: number; window: '1 m' }> = {
  normals: { tokens: 30, window: '1 m' },
  nearby:  { tokens: 60, window: '1 m' },
  og:      { tokens: 20, window: '1 m' },
  admin:   { tokens: 5,  window: '1 m' },
  current: { tokens: 60, window: '1 m' }, // edge-cached, so per-IP misses are low
}
```

- [ ] **Step 2: Create the route**

Create `api/current.ts`:

```ts
import { fetchCurrentTemp } from './_lib/weather/forecast.js'
import { validateCity } from './_lib/catalog.js'
import { checkRateLimit } from './_lib/ratelimit.js'

interface VercelLikeRequest {
  url?: string
  query?: Record<string, string | string[]>
  headers?: Record<string, string | string[] | undefined>
}

interface VercelLikeResponse {
  status(code: number): VercelLikeResponse
  setHeader(name: string, value: string): void
  json(payload: unknown): void
}

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/

function parseQuery(req: VercelLikeRequest): URLSearchParams {
  if (req.url) return new URL(req.url, 'http://localhost').searchParams
  const out = new URLSearchParams()
  for (const [k, v] of Object.entries(req.query ?? {})) {
    out.set(k, Array.isArray(v) ? v[0] : v)
  }
  return out
}

function bad(res: VercelLikeResponse, code: number, message: string) {
  res.status(code)
  res.setHeader('Content-Type', 'application/json')
  res.json({ error: message })
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  const rl = await checkRateLimit(req, 'current')
  if (!rl.allowed) {
    res.setHeader('Retry-After', '60')
    return bad(res, 429, 'rate limited')
  }

  const params = parseQuery(req)
  const id  = params.get('id')?.trim() ?? ''
  const lat = parseFloat(params.get('lat') ?? '')
  const lon = parseFloat(params.get('lon') ?? '')

  if (!id || !ID_RE.test(id)) return bad(res, 400, 'invalid id')
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return bad(res, 400, 'invalid lat')
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return bad(res, 400, 'invalid lon')

  const validation = validateCity(id, lat, lon)
  if (!validation.ok) return bad(res, 400, validation.error)

  try {
    const { data, source } = await fetchCurrentTemp(lat, lon)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800')
    res.setHeader('X-Climato-Source', source)
    res.status(200)
    res.json(data)
  } catch (err) {
    console.error('[current] all forecast providers failed:', err)
    return bad(res, 502, 'upstream fetch failed')
  }
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc -p tsconfig.node.json --noEmit
```

Expected: no errors.

- [ ] **Step 4: Smoke test**

```bash
npm run dev &
# Wait, then:
curl -sD - 'http://localhost:5173/api/current?id=tokyo&lat=35.6762&lon=139.6503' | head -20
```

Expected: `200 OK`, body `{"tempC": <number>, "observedAt": "..."}`, `X-Climato-Source: open-meteo`.

Test the validation: `curl -i 'http://localhost:5173/api/current?id=tokyo&lat=0&lon=0'` should return `400 invalid coordinates` (or whatever `validateCity` returns for mismatched lat/lon).

Kill the dev server.

- [ ] **Step 5: Commit**

```bash
git add api/current.ts api/_lib/ratelimit.ts
git commit -m "feat(api): add /api/current edge-cached endpoint with provider fallback"
```

---

## Task 11: Switch `useCurrentTemp` to `/api/current`

**Files:**
- Modify: `src/hooks/useCurrentTemp.ts`

- [ ] **Step 1: Replace the upstream URL with the internal route**

Replace the body of `useCurrentTemp.ts` with:

```ts
import { useQuery } from '@tanstack/react-query'
import type { GeoCity } from '../data/cities'

export interface CurrentTemp {
  tempC: number
  observedAt: string
}

async function fetchCurrentTemp(geo: GeoCity): Promise<CurrentTemp> {
  const params = new URLSearchParams({
    id: geo.id,
    lat: String(geo.lat),
    lon: String(geo.lon),
  })
  const res = await fetch(`/api/current?${params}`)
  if (!res.ok) throw new Error(`Current-temp request failed: ${res.status}`)
  const json = (await res.json()) as Partial<CurrentTemp>
  if (typeof json.tempC !== 'number' || !json.observedAt) {
    throw new Error('Current-temp response missing fields')
  }
  return { tempC: json.tempC, observedAt: json.observedAt }
}

export function useCurrentTemp(geo: GeoCity | undefined) {
  return useQuery({
    queryKey: ['current-temp', geo?.lat.toFixed(2), geo?.lon.toFixed(2)],
    queryFn: () => fetchCurrentTemp(geo!),
    enabled: !!geo?.lat,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}
```

- [ ] **Step 2: Run frontend typecheck + build**

```bash
npm run build
```

Expected: build succeeds (both tsc projects + vite).

- [ ] **Step 3: Manual smoke**

Start dev server and load a city page in the browser. Confirm:
- Network tab shows `GET /api/current?id=…&lat=…&lon=…` (no direct call to `api.open-meteo.com/v1/forecast`).
- Page shows a current temperature.
- Response has `X-Climato-Source` header.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useCurrentTemp.ts
git commit -m "feat(client): route current-temp through /api/current"
```

---

## Task 12: Final verification

**Files:** none modified

- [ ] **Step 1: Full test suite**

```bash
npm run test:run
```

Expected: every test passes. Counts roughly: sun (4) + aggregate (3) + nasa-power (4) + try-providers (4) + archive (2) + met-no (3) + forecast (2) = 22.

- [ ] **Step 2: Full build**

```bash
npm run build
```

Expected: clean exit, no type errors.

- [ ] **Step 3: Simulate Open-Meteo down — archive path**

Temporarily edit `api/_lib/weather/providers/open-meteo-archive.ts`, change the URL to `https://archive-api.open-meteo.invalid/v1/archive`. Pick a catalog city whose normals are not yet in KV (easiest: flush a known key first via Upstash CLI or the dashboard — e.g. delete `pending:tokyo` — or pick a less-popular city from `src/data/cities.ts` whose `pending:<id>` key likely doesn't exist locally). Hit the dev server:

```bash
curl -sD - 'http://localhost:5173/api/normals?id=tokyo&lat=35.6762&lon=139.6503' | head -20
```

Expected: `200 OK` with `X-Climato-Source: nasa-power`. Console logs show `[weather] provider "open-meteo" failed: …`. If you see `X-Climato-Cache: kv` instead, the city was served from cache and the test didn't exercise the orchestrator — flush the key and retry.

Revert the URL edit.

- [ ] **Step 4: Simulate Open-Meteo down — forecast path**

Same trick on `open-meteo-forecast.ts`:

```bash
curl -sD - 'http://localhost:5173/api/current?id=tokyo&lat=35.6762&lon=139.6503' | head -20
```

Expected: `200 OK` with `X-Climato-Source: met-no`.

Revert.

- [ ] **Step 5: Clean up any Playwright/screenshot artifacts**

Per `CLAUDE.md`:

```bash
rm -rf .playwright-mcp compare-*.png *-mobile-*.png *-desktop-*.png 2>/dev/null || true
git status
```

Expected: nothing dirty.

- [ ] **Step 6: Final commit if anything dangling, then we're done**

If `git status` is clean, skip. Otherwise commit any leftover formatting fixes with a brief message.
