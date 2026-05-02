import { useQuery, keepPreviousData } from '@tanstack/react-query'
import type { City, GeoCity } from '../data/cities'
import type { Normals } from '../lib/normals'

async function fetchNormals(geo: GeoCity): Promise<City> {
  // Cache hit: served directly from CDN (committed in data/normals/, copied
  // to dist/normals/ at build time by the seoFiles vite plugin). The
  // content-type check rejects Vite dev's SPA fallback (200 + text/html for
  // missing static files), which would otherwise look like a cache hit.
  const staticRes = await fetch(`/normals/${geo.id}.json`)
  if (staticRes.ok && staticRes.headers.get('content-type')?.includes('application/json')) {
    const normals = await staticRes.json() as Normals
    return { ...geo, ...normals }
  }

  // Cold cache: API route fetches Open-Meteo and writes to KV. The drain
  // workflow promotes KV entries to data/normals/ on a cron.
  const apiRes = await fetch(
    `/api/normals?id=${encodeURIComponent(geo.id)}&lat=${geo.lat}&lon=${geo.lon}`,
  )
  if (!apiRes.ok) throw new Error(`Normals API error ${apiRes.status}`)
  const normals = await apiRes.json() as Normals
  return { ...geo, ...normals }
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
