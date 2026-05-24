import { useQuery } from '@tanstack/react-query'
import type { GeoCity } from '../data/cities'

export interface CurrentTemp {
  tempC: number
  observedAt: string
  source?: string  // X-Climato-Source slug: 'open-meteo' | 'met-no'
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
  const source = res.headers.get('X-Climato-Source') ?? undefined
  return { tempC: json.tempC, observedAt: json.observedAt, source }
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
