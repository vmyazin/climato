import { useQuery } from '@tanstack/react-query'
import type { GeoCity } from '../data/cities'

export interface CurrentTemp {
  tempC: number
  observedAt: string
}

interface ForecastResponse {
  current?: {
    time?: string
    temperature_2m?: number
  }
}

async function fetchCurrentTemp(geo: GeoCity): Promise<CurrentTemp> {
  const params = new URLSearchParams({
    latitude: String(geo.lat),
    longitude: String(geo.lon),
    current: 'temperature_2m',
    timezone: 'auto',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) throw new Error(`Forecast API error ${res.status}`)
  const json = (await res.json()) as ForecastResponse
  const t = json.current?.temperature_2m
  const time = json.current?.time
  if (typeof t !== 'number' || !time) throw new Error('Forecast API returned no current temperature')
  return { tempC: t, observedAt: time }
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
