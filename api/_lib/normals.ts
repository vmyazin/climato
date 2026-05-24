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
