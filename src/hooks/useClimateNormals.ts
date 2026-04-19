import { useQuery, keepPreviousData } from '@tanstack/react-query'
import type { City, GeoCity } from '../data/cities'

interface ArchiveDaily {
  time: string[]
  temperature_2m_max: (number | null)[]
  temperature_2m_min: (number | null)[]
  precipitation_sum: (number | null)[]
  sunshine_duration: (number | null)[]
  sunrise: (string | null)[]
  sunset: (string | null)[]
}

async function fetchNormals(geo: GeoCity): Promise<City> {
  const params = new URLSearchParams({
    latitude: String(geo.lat),
    longitude: String(geo.lon),
    start_date: '2014-01-01',
    end_date: '2023-12-31',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration,sunrise,sunset',
    timezone: 'auto',
  })
  const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`)
  if (!res.ok) throw new Error(`Archive API error ${res.status}`)
  const json = await res.json()
  return aggregate(json.daily as ArchiveDaily, geo)
}

function aggregate(daily: ArchiveDaily, geo: GeoCity): City {
  const hiSum = new Array(12).fill(0), hiCnt = new Array(12).fill(0)
  const loSum = new Array(12).fill(0), loCnt = new Array(12).fill(0)
  const sunSum = new Array(12).fill(0), sunCnt = new Array(12).fill(0)
  const precipMonthly: Record<string, number> = {}
  const sunrise = new Array(12).fill('06:00')
  const sunset  = new Array(12).fill('18:00')
  const n = daily.time.length

  for (let i = 0; i < n; i++) {
    const date = daily.time[i]
    const m    = parseInt(date.slice(5, 7)) - 1
    const ym   = date.slice(0, 7)
    const day  = date.slice(8, 10)

    const hi  = daily.temperature_2m_max[i]
    const lo  = daily.temperature_2m_min[i]
    const pr  = daily.precipitation_sum[i]
    const sun = daily.sunshine_duration[i]

    if (hi != null) { hiSum[m] += hi; hiCnt[m]++ }
    if (lo != null) { loSum[m] += lo; loCnt[m]++ }
    if (sun != null) { sunSum[m] += sun / 3600; sunCnt[m]++ }
    if (pr != null) precipMonthly[ym] = (precipMonthly[ym] ?? 0) + pr

    // Sunrise/sunset: representative from 2023-XX-15
    if (date.startsWith('2023') && day === '15') {
      const sr = daily.sunrise[i]
      const ss = daily.sunset[i]
      if (sr) sunrise[m] = sr.slice(11, 16)
      if (ss) sunset[m]  = ss.slice(11, 16)
    }
  }

  // Average monthly precipitation across years
  const precipByMonth: number[][] = Array.from({ length: 12 }, () => [])
  for (const [ym, total] of Object.entries(precipMonthly)) {
    precipByMonth[parseInt(ym.slice(5, 7)) - 1].push(total)
  }

  const r1 = (s: number, c: number) => Math.round((s / (c || 1)) * 10) / 10
  const ri = (arr: number[]) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0

  return {
    ...geo,
    high:   hiSum.map((s, i) => r1(s, hiCnt[i])),
    low:    loSum.map((s, i) => r1(s, loCnt[i])),
    precip: precipByMonth.map(ri),
    sun:    sunSum.map((s, i) => r1(s, sunCnt[i])),
    sunrise,
    sunset,
  }
}

export function useClimateNormals(geo: GeoCity | undefined) {
  return useQuery({
    queryKey: ['climate', geo?.lat.toFixed(2), geo?.lon.toFixed(2)],
    queryFn: () => fetchNormals(geo!),
    enabled: !!geo?.lat,
    staleTime: Infinity,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
}
