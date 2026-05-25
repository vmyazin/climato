import { useQuery } from '@tanstack/react-query'
import type { GeoCity } from '../data/cities'
import { isResolvedCity } from '../lib/slug'

export interface NearbyCity {
  id: string
  name: string
  country: string
  admin1?: string
  lat: number
  lon: number
  distance_km: number
}

interface NearbyResponse {
  neighbors: NearbyCity[]
}

async function fetchNearby(geo: GeoCity, n: number): Promise<NearbyCity[]> {
  const params = new URLSearchParams({
    id: geo.id,
    lat: String(geo.lat),
    lon: String(geo.lon),
    n: String(n),
  })
  const res = await fetch(`/api/nearby?${params}`)
  if (!res.ok) throw new Error(`Nearby API error ${res.status}`)
  const data = (await res.json()) as NearbyResponse
  return data.neighbors
}

export function useNearbyCities(geo: GeoCity | undefined, n: number = 5) {
  return useQuery({
    queryKey: nearbyCitiesQueryKey(geo, n),
    queryFn: () => fetchNearby(geo!, n),
    enabled: !!geo?.lat && isResolvedCity(geo),
    staleTime: Infinity,
    gcTime: 7 * 24 * 60 * 60 * 1000,
  })
}

export function nearbyCitiesQueryKey(geo: GeoCity | undefined, n: number = 5): readonly unknown[] {
  return ['nearby', geo?.lat.toFixed(2), geo?.lon.toFixed(2), n]
}
