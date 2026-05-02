import { useEffect, useRef } from 'react'
import type { GeoCity } from '../data/cities'
import { useWeatherStore } from '../store/weatherStore'
import { countryFromSlug, countrySlug, nameFromSlug, slugify, toSlug } from './slug'

export { countryFromSlug, countrySlug, nameFromSlug, slugify, toSlug }
export type { CityUrl } from './slug'

export type ParsedUrl =
  | { type: 'root' }
  | {
      type: 'slug'
      countrySlug: string
      admin1Slug?: string
      citySlug: string
      ll?: [number, number]
    }

function parseLatLon(search: string): [number, number] | undefined {
  const m = search.match(/^\?@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/)
  if (!m) return undefined
  const lat = parseFloat(m[1])
  const lon = parseFloat(m[2])
  if (Number.isNaN(lat) || Number.isNaN(lon)) return undefined
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return undefined
  return [lat, lon]
}

export function parseUrl(pathname: string, search: string): ParsedUrl {
  const segs = pathname.split('/').filter(Boolean).map(s => s.toLowerCase())
  if (segs.length === 0) return { type: 'root' }
  if (segs.length < 2 || segs.length > 3) return { type: 'root' }
  const ll = parseLatLon(search)
  if (segs.length === 2) {
    return { type: 'slug', countrySlug: segs[0], citySlug: segs[1], ll }
  }
  return {
    type: 'slug',
    countrySlug: segs[0],
    admin1Slug: segs[1],
    citySlug: segs[2],
    ll,
  }
}

export function reconstructFromCoords(
  parsed: { countrySlug: string; admin1Slug?: string; citySlug: string },
  ll: [number, number],
): GeoCity {
  const country = countryFromSlug(parsed.countrySlug)
  const admin1 = parsed.admin1Slug ? nameFromSlug(parsed.admin1Slug) : undefined
  const name = nameFromSlug(parsed.citySlug)
  return {
    id: `${parsed.countrySlug}-${parsed.citySlug}`,
    name,
    country,
    ...(admin1 ? { admin1 } : {}),
    lat: ll[0],
    lon: ll[1],
    elev: 0,
  }
}

// lat=0 keeps useClimateNormals disabled until the real geocoding response replaces this.
export function reconstructFromSlug(parsed: {
  countrySlug: string
  admin1Slug?: string
  citySlug: string
}): GeoCity {
  const country = countryFromSlug(parsed.countrySlug)
  const admin1 = parsed.admin1Slug ? nameFromSlug(parsed.admin1Slug) : undefined
  const name = nameFromSlug(parsed.citySlug)
  return {
    id: `placeholder:${parsed.countrySlug}-${parsed.citySlug}`,
    name,
    country,
    ...(admin1 ? { admin1 } : {}),
    lat: 0,
    lon: 0,
    elev: 0,
  }
}

interface OpenMeteoCity {
  id: number
  name: string
  latitude: number
  longitude: number
  elevation?: number
  country: string
  admin1?: string
  admin2?: string
  population?: number
}

export async function resolveSlugViaGeocoding(parsed: {
  countrySlug: string
  admin1Slug?: string
  citySlug: string
}): Promise<GeoCity | null> {
  const cityQuery = parsed.citySlug.replace(/-/g, ' ')
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=20&language=en&format=json`

  let data: { results?: OpenMeteoCity[] }
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    data = await res.json()
  } catch {
    return null
  }

  const results = data.results ?? []

  const matchAdmin1 = (r: OpenMeteoCity): boolean => {
    if (!parsed.admin1Slug) return true
    return !!r.admin1 && slugify(r.admin1) === parsed.admin1Slug
  }

  const matchCity = (r: OpenMeteoCity): boolean => {
    if (slugify(r.name) === parsed.citySlug) return true
    if (r.admin2 && slugify(r.admin2) === parsed.citySlug) return true
    return false
  }

  const matches = results.filter(
    r => !!r.country && countrySlug(r.country) === parsed.countrySlug && matchAdmin1(r) && matchCity(r),
  )
  if (matches.length === 0) return null

  matches.sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
  const r = matches[0]

  return {
    id: String(r.id),
    name: r.name,
    country: r.country,
    ...(r.admin1 ? { admin1: r.admin1 } : {}),
    lat: r.latitude,
    lon: r.longitude,
    elev: Math.round(r.elevation ?? 0),
  }
}

export interface UrlSyncResult {
  notFoundSlug: string | null
}

function currentUrl(): string {
  return window.location.pathname + window.location.search
}

export function useUrlSync(): UrlSyncResult {
  const selectedCity = useWeatherStore(s => s.selectedCity)
  const setCity = useWeatherStore(s => s.setCity)
  const setNotFoundSlug = useWeatherStore(s => s.setNotFoundSlug)
  const notFoundSlug = useWeatherStore(s => s.notFoundSlug)
  const skipNextPush = useRef(false)

  useEffect(() => {
    let cancelled = false

    const resolve = async () => {
      const parsed = parseUrl(window.location.pathname, window.location.search)
      if (parsed.type === 'root') return

      // Synchronous placeholder for first paint — uses the URL coords if
      // present, otherwise lat=0/lon=0 (which keeps useClimateNormals and
      // /api/* hooks disabled). Both kinds of placeholder use a synthetic
      // string id ("spain-madrid", "placeholder:..."); the API rejects
      // these, so the climate fetch waits for geocoding to upgrade the
      // city to a real GeoNames id below.
      const placeholder = parsed.ll
        ? reconstructFromCoords(parsed, parsed.ll)
        : reconstructFromSlug(parsed)
      skipNextPush.current = true
      setCity(placeholder)

      const city = await resolveSlugViaGeocoding(parsed)
      if (cancelled) return
      if (city) {
        skipNextPush.current = true
        setCity(city)
        const { path, query } = toSlug(city)
        window.history.replaceState(null, '', path + query)
      } else {
        setNotFoundSlug(parsed.citySlug)
      }
    }

    resolve()

    const onPop = () => {
      setNotFoundSlug(null)
      resolve()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      cancelled = true
      window.removeEventListener('popstate', onPop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (skipNextPush.current) {
      skipNextPush.current = false
      return
    }
    // Placeholder cities (lat=0,lon=0) shouldn't drive URL changes — they
    // exist only as a first-paint stand-in until real geocoding resolves.
    if (selectedCity.lat === 0 && selectedCity.lon === 0) return
    const { path, query } = toSlug(selectedCity)
    const target = path + query
    if (currentUrl() !== target) {
      window.history.pushState(null, '', target)
    }
  }, [selectedCity])

  return { notFoundSlug }
}
