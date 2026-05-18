// Pure-functional summarisers that derive scannable English text from a
// City's climate normals. All functions are side-effect-free and only use
// data already in scope on the city page — no extra fetches, no extra deps.
//
// Used by src/components/ClimateNarrative.tsx and (potentially) by the JSON-LD
// helper. Heuristics deliberately stay coarse: the goal is "good enough to
// read at a glance and to feed Google", not a meteorology textbook.

import type { City } from '../data/cities'
import { MONTHS_LONG } from '../data/cities'

function indexOfMin(arr: readonly number[]): number {
  let idx = 0
  for (let i = 1; i < arr.length; i++) if (arr[i] < arr[idx]) idx = i
  return idx
}

function indexOfMax(arr: readonly number[]): number {
  let idx = 0
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[idx]) idx = i
  return idx
}

export interface PeakAndTrough {
  peakIdx: number
  peakValue: number
  troughIdx: number
  troughValue: number
}

export function peakAndTrough(values: readonly number[]): PeakAndTrough {
  const peakIdx = indexOfMax(values)
  const troughIdx = indexOfMin(values)
  return {
    peakIdx,
    peakValue: values[peakIdx],
    troughIdx,
    troughValue: values[troughIdx],
  }
}

export type ClimateType =
  | 'tropical'
  | 'arid'
  | 'mediterranean'
  | 'temperate'
  | 'continental'
  | 'subarctic'
  | 'polar'

// Coarse Köppen-ish classifier. Picks the first matching label so order
// matters — start with the strongest signals and back off.
export function classifyClimate(city: City): ClimateType {
  const { high, low, precip, lat } = city
  const absLat = Math.abs(lat)
  const annualPrecip = precip.reduce((a, b) => a + b, 0)
  const minHigh = Math.min(...high)
  const maxHigh = Math.max(...high)
  const minLow = Math.min(...low)
  const annualRange = maxHigh - minHigh

  if (maxHigh < 10) return 'polar'
  if (annualPrecip < 250) return 'arid'
  if (minLow > 18 && absLat < 25) return 'tropical'
  if (minHigh < -3 && annualRange > 25) return 'subarctic'
  if (annualRange > 25) return 'continental'
  if (absLat >= 30 && absLat <= 45 && annualPrecip < 700) return 'mediterranean'
  return 'temperate'
}

const CLIMATE_BLURB: Record<ClimateType, string> = {
  tropical: 'tropical',
  arid: 'arid',
  mediterranean: 'Mediterranean',
  temperate: 'temperate',
  continental: 'continental',
  subarctic: 'subarctic',
  polar: 'polar',
}

export function climateLabel(t: ClimateType): string {
  return CLIMATE_BLURB[t]
}

export interface BestMonthsResult {
  // Inclusive month indices, possibly wrapping (Nov–Mar = [10, 0, 1, 2]).
  months: number[]
  formatted: string
  avgHighRange: [number, number]
  avgLowRange: [number, number]
  avgSun: number
  // If the primary pick is a warm/wet season, this is a cooler alternative
  // run with decent scores (≥0.7) and meaningfully lower average high (≥5°C).
  coolerAlt?: string
}

// Score each month for "good time to visit". 1 = great, 0 = avoid.
//
// Precipitation tolerance scales with temperature. Warm months (hi ≥ 25°C) at
// beach/subtropical destinations typically see rain as short afternoon
// thunderstorms rather than persistent overcast — visitors tolerate it because
// the rest of the day is sunny and warm. The same rainfall in a cool month
// means grey days, so the threshold stays tighter.
//
// The upper temperature ceiling is raised to 31°C (was 28°C) to stop Southern
// Hemisphere summer highs from being scored out of the "perfect" band —
// 29–31°C is exactly the beach weather that draws most visitors to cities like
// Florianópolis or Rio in December–February.
function scoreMonth(city: City, i: number): number {
  const hi = city.high[i]
  const lo = city.low[i]
  const pr = city.precip[i]
  const su = city.sun[i]
  if (hi < 12 || hi > 35) return 0
  if (lo < 2) return 0.3
  if (su < 4) return 0.5
  // Warm months allow more rainfall before being penalised.
  const precipLimit = hi >= 25 ? 180 : 100
  if (hi >= 18 && hi <= 31 && pr < precipLimit && su >= 6) return 1
  if (pr > 200) return 0.3
  if (pr > 160) return 0.4
  return 0.7
}

// Find the longest contiguous run of "good" months, allowing wraparound
// (so a Southern Hemisphere city can return e.g. Nov–Mar).
function longestRun(scores: number[], threshold: number): number[] {
  // Doubled trick to handle wraparound without index gymnastics.
  const doubled = [...scores, ...scores]
  let bestStart = 0
  let bestLen = 0
  let curStart = 0
  let curLen = 0
  for (let i = 0; i < doubled.length; i++) {
    if (doubled[i] >= threshold) {
      if (curLen === 0) curStart = i
      curLen++
      if (curLen > bestLen) {
        bestLen = curLen
        bestStart = curStart
      }
    } else {
      curLen = 0
    }
  }
  // Cap at 12 months — past that we're double-counting.
  bestLen = Math.min(bestLen, 12)
  const out: number[] = []
  for (let i = 0; i < bestLen; i++) out.push((bestStart + i) % 12)
  return out
}

function formatMonthRange(months: number[]): string {
  if (months.length === 0) return ''
  if (months.length === 12) return 'year-round'
  if (months.length === 1) return MONTHS_LONG[months[0]]
  return `${MONTHS_LONG[months[0]]}–${MONTHS_LONG[months[months.length - 1]]}`
}

// Maximum window length to report. Anything longer becomes "visit any time
// except X" which is not actionable. For destinations that score well almost
// year-round (e.g. a subtropical city where only one month is marginal), we
// narrow to the warmest contiguous sub-window so the recommendation is the
// peak season visitors actually target.
const MAX_BEST_WINDOW = 6

export function pickBestMonths(city: City): BestMonthsResult | null {
  const scores = Array.from({ length: 12 }, (_, i) => scoreMonth(city, i))
  let months = longestRun(scores, 1)
  // No "perfect" run? Fall back to "decent" months.
  if (months.length === 0) months = longestRun(scores, 0.7)
  if (months.length === 0) return null

  // If the run is very broad, narrow it to the warmest sub-window so the
  // pick reflects the peak season rather than "almost year-round".
  if (months.length > MAX_BEST_WINDOW) {
    let best = months.slice(0, MAX_BEST_WINDOW)
    let bestAvg = best.reduce((s, i) => s + city.high[i], 0) / MAX_BEST_WINDOW
    for (let start = 1; start <= months.length - MAX_BEST_WINDOW; start++) {
      const w = months.slice(start, start + MAX_BEST_WINDOW)
      const avg = w.reduce((s, i) => s + city.high[i], 0) / MAX_BEST_WINDOW
      if (avg > bestAvg) { bestAvg = avg; best = w }
    }
    months = best
  }

  const highs = months.map(i => city.high[i])
  const lows = months.map(i => city.low[i])
  const suns = months.map(i => city.sun[i])
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  const primaryAvgHigh = avg(highs)

  // Derive a cooler alternative: the longest decent run (≥0.7) outside the
  // primary selection whose average high is ≥5°C lower. This surfaces for
  // warm beach destinations where the "best" pick is the hot summer — some
  // visitors legitimately prefer the quieter, cooler shoulder season.
  const primarySet = new Set(months)
  const altScores = scores.map((s, i) => (primarySet.has(i) ? 0 : s))
  const altMonths = longestRun(altScores, 0.7)
  const altAvgHigh = altMonths.length
    ? avg(altMonths.map(i => city.high[i]))
    : Infinity
  const coolerAlt =
    altMonths.length >= 1 && primaryAvgHigh - altAvgHigh >= 5
      ? formatMonthRange(altMonths)
      : undefined

  return {
    months,
    formatted: formatMonthRange(months),
    avgHighRange: [Math.min(...highs), Math.max(...highs)],
    avgLowRange: [Math.min(...lows), Math.max(...lows)],
    avgSun: avg(suns),
    ...(coolerAlt ? { coolerAlt } : {}),
  }
}

export function annualPrecipMm(city: City): number {
  return city.precip.reduce((a, b) => a + b, 0)
}

// Map the internal 0..1 suitability score from scoreMonth into the four
// discrete buckets the comparison-page calendar visualisation expects:
//   3 = ideal (mild temp, low rain, decent sun)
//   2 = workable
//   1 = poor (cool/wet)
//   0 = bad (too cold, too hot, or too dark)
// The thresholds align with scoreMonth's return values: 1, 0.7, 0.5/0.4/0.3, 0.
export type SuitabilityClass = 0 | 1 | 2 | 3

export function suitabilityClass(score: number): SuitabilityClass {
  if (score >= 1) return 3
  if (score >= 0.7) return 2
  if (score >= 0.3) return 1
  return 0
}

// Return the 12-month suitability classes for a city. Consumed by
// <BestMonthsCalendar> in the comparison page.
export function monthlySuitability(city: City): SuitabilityClass[] {
  return Array.from({ length: 12 }, (_, i) => suitabilityClass(scoreMonth(city, i)))
}
