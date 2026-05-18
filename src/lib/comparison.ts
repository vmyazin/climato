// Pure-functional derivations for the /compare/{a}/vs/{b} page. Takes two
// climate-resolved City objects and returns the differential stats plus the
// "best months for both" overlap.

import type { City } from '../data/cities'
import { MONTHS_LONG } from '../data/cities'
import { annualPrecipMm, monthlySuitability } from './climate-summary'

export interface ComparisonStat {
  label: string                    // 'AVG HIGH' | 'ANNUAL RAIN' | 'SUN / DAY'
  aValue: number                   // formatted to display precision
  bValue: number
  unit: string                     // '°C' | 'mm' | 'h'
  delta: string                    // '+2.0°' | '+4%' | '+16%' — always positive magnitude
  winner: 'a' | 'b' | 'tie'
}

export interface ComparisonResult {
  stats: ComparisonStat[]
  overlapMonths: number[]          // month indices where BOTH cities have suitability 3
  overlapFormatted: string         // 'May–August' / 'Year-round' / 'May, August' / ''
}

function avgHigh(c: City): number {
  return c.high.reduce((s, v) => s + v, 0) / 12
}

function avgSun(c: City): number {
  return c.sun.reduce((s, v) => s + v, 0) / 12
}

function winnerOf(a: number, b: number): 'a' | 'b' | 'tie' {
  if (Math.abs(a - b) < 1e-9) return 'tie'
  return a > b ? 'a' : 'b'
}

// Delta formatters always return a positive magnitude — the winner-arrow on
// the diptych communicates direction. Equal values produce "0..." which the
// UI treats as a tie row.
function fmtTempDelta(a: number, b: number): string {
  const d = Math.abs(a - b)
  return `+${d.toFixed(1)}°`
}

function fmtPctDelta(a: number, b: number): string {
  const lo = Math.min(a, b)
  if (lo === 0) return '∞'
  const pct = Math.round((Math.abs(a - b) / lo) * 100)
  return `+${pct}%`
}

function formatOverlapMonths(months: number[]): string {
  if (months.length === 0) return ''
  if (months.length === 12) return 'Year-round'
  if (months.length === 1) return MONTHS_LONG[months[0]]
  const sorted = [...months].sort((x, y) => x - y)
  const contiguous = sorted.every((m, i) => i === 0 || m - sorted[i - 1] === 1)
  if (contiguous) {
    return `${MONTHS_LONG[sorted[0]]}–${MONTHS_LONG[sorted[sorted.length - 1]]}`
  }
  return sorted.map(i => MONTHS_LONG[i]).join(', ')
}

export function compareCities(a: City, b: City): ComparisonResult {
  const aHigh = avgHigh(a)
  const bHigh = avgHigh(b)
  const aRain = annualPrecipMm(a)
  const bRain = annualPrecipMm(b)
  const aSun = avgSun(a)
  const bSun = avgSun(b)

  const aSuit = monthlySuitability(a)
  const bSuit = monthlySuitability(b)
  const overlapMonths: number[] = []
  for (let i = 0; i < 12; i++) {
    if (aSuit[i] === 3 && bSuit[i] === 3) overlapMonths.push(i)
  }

  return {
    stats: [
      {
        label: 'AVG HIGH',
        aValue: parseFloat(aHigh.toFixed(1)),
        bValue: parseFloat(bHigh.toFixed(1)),
        unit: '°C',
        delta: fmtTempDelta(aHigh, bHigh),
        winner: winnerOf(aHigh, bHigh),
      },
      {
        label: 'ANNUAL RAIN',
        aValue: Math.round(aRain),
        bValue: Math.round(bRain),
        unit: 'mm',
        delta: fmtPctDelta(aRain, bRain),
        winner: winnerOf(aRain, bRain),
      },
      {
        label: 'SUN / DAY',
        aValue: parseFloat(aSun.toFixed(2)),
        bValue: parseFloat(bSun.toFixed(2)),
        unit: 'h',
        delta: fmtPctDelta(aSun, bSun),
        winner: winnerOf(aSun, bSun),
      },
    ],
    overlapMonths,
    overlapFormatted: formatOverlapMonths(overlapMonths),
  }
}
