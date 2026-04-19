import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { CITIES, GeoCity } from '../data/cities'
import { useWeatherStore, latLonKey } from '../store/weatherStore'

interface OpenMeteoCity {
  id: number
  name: string
  latitude: number
  longitude: number
  elevation: number
  country: string
  admin1?: string
  admin2?: string
  population?: number
}

// Entries matching these patterns aren't cities a user would pick
const NOISE = /airport|airfield|aerodrome|air base|heliport|prefecture|municipality|district|township|ward|borough|canton|arrondissement/i

const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

// Some entries in the Open-Meteo database use a region/state name as `name`
// while the actual city name lives in `admin2` (e.g. "Santa Catherina" with
// admin2="Florianópolis"). When admin2 matches the query better than name,
// treat admin2 as the effective display name so it deduplicates and sorts
// against the other results that literally have that city name.
function effectiveName(r: OpenMeteoCity, query: string): string {
  if (
    r.admin2 &&
    norm(r.admin2).includes(norm(query)) &&
    !norm(r.name).includes(norm(query))
  ) {
    return r.admin2
  }
  return r.name
}

// For each (effective-name, country) group keep the highest-population entry,
// preserving the original relevance order for the winning representatives.
function deduplicate(raw: OpenMeteoCity[], query: string): GeoCity[] {
  const bestByKey = new Map<string, { r: OpenMeteoCity; displayName: string }>()
  const keyOrder: string[] = []

  for (const r of raw) {
    if (NOISE.test(r.name)) continue
    const displayName = effectiveName(r, query)
    const key = `${norm(displayName)}|${r.country}`
    if (!bestByKey.has(key)) {
      bestByKey.set(key, { r, displayName })
      keyOrder.push(key)
    } else {
      const existing = bestByKey.get(key)!
      if ((r.population ?? 0) > (existing.r.population ?? 0)) {
        bestByKey.set(key, { r, displayName })
      }
    }
  }

  return keyOrder.slice(0, 8).map(key => {
    const { r, displayName } = bestByKey.get(key)!
    return {
      id: String(r.id),
      name: displayName,
      country: r.country,
      ...(r.admin1 ? { admin1: r.admin1 } : {}),
      lat: r.latitude,
      lon: r.longitude,
      elev: Math.round(r.elevation ?? 0),
    }
  })
}

async function geocode(query: string): Promise<GeoCity[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=20&language=en&format=json`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Geocoding failed')
  const data = await res.json()
  return deduplicate(data.results ?? [], query)
}

function buildDefaultCities(recent: GeoCity[]): GeoCity[] {
  const recentKeys = new Set(recent.map(latLonKey))
  const seeds = CITIES
    .filter(c => !recentKeys.has(latLonKey(c)))
    .slice(0, Math.max(0, 8 - recent.length))
    .map(({ id, name, country, lat, lon, elev }) => ({ id, name, country, lat, lon, elev }))
  return [...recent, ...seeds].slice(0, 8)
}

export function useCitySearch(query: string) {
  const recentCities = useWeatherStore(s => s.recentCities)
  const trimmed = query.trim()
  return useQuery({
    queryKey: ['geocode', trimmed.toLowerCase(), recentCities.map(latLonKey).join(',')],
    queryFn: () => (trimmed ? geocode(trimmed) : Promise.resolve(buildDefaultCities(recentCities))),
    staleTime: trimmed ? 5 * 60 * 1000 : Infinity,
    placeholderData: keepPreviousData,
  })
}
