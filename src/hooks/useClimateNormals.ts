import { useQuery, keepPreviousData } from '@tanstack/react-query'
import type { City, GeoCity, Normals } from '../data/cities'
import { isResolvedCity } from '../lib/slug'

async function fetchNormals(geo: GeoCity): Promise<City> {
  // Cache hit: served directly from CDN (committed in data/normals/, copied
  // to dist/normals/ at build time by the seoFiles vite plugin). The
  // content-type check rejects Vite dev's SPA fallback (200 + text/html for
  // missing static files), which would otherwise look like a cache hit.
  // The static drain is currently Open-Meteo-sourced, so mark accordingly.
  const staticRes = await fetch(`/normals/${geo.id}.json`)
  if (staticRes.ok && staticRes.headers.get('content-type')?.includes('application/json')) {
    const normals = await staticRes.json() as Normals
    return { ...geo, ...normals, source: 'open-meteo' }
  }

  // Cold cache: API route runs the archive orchestrator (Open-Meteo →
  // NASA POWER fallback) and writes the result to KV. The drain workflow
  // promotes KV entries to data/normals/ on a cron. Forward name and
  // country so the function can stash them alongside the normals — the
  // drain reads them out into _index.json for human-readable admin views.
  const params = new URLSearchParams({
    id: geo.id,
    lat: String(geo.lat),
    lon: String(geo.lon),
    name: geo.name,
    country: geo.country,
  })
  if (geo.admin1) params.set('admin1', geo.admin1)
  const apiRes = await fetch(`/api/normals?${params}`)
  if (!apiRes.ok) throw new Error(`Normals API error ${apiRes.status}`)
  const normals = await apiRes.json() as Normals
  const source = apiRes.headers.get('X-Climato-Source') ?? undefined
  return { ...geo, ...normals, source }
}

export function useClimateNormals(geo: GeoCity | undefined) {
  return useQuery({
    queryKey: ['climate', geo?.lat.toFixed(2), geo?.lon.toFixed(2)],
    queryFn: () => fetchNormals(geo!),
    enabled: !!geo?.lat && isResolvedCity(geo),
    staleTime: Infinity,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    retry: 1,
    placeholderData: keepPreviousData,
  })
}
