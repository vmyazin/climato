import { useEffect, useRef, useState } from 'react'
import type { GeoCity } from '../data/cities'
import { useWeatherStore } from '../store/weatherStore'

const COUNTRY_TO_SLUG: Record<string, string> = {
  'United States': 'usa',
  'United Kingdom': 'uk',
  'United Arab Emirates': 'uae',
  'South Korea': 'south-korea',
  'North Korea': 'north-korea',
}

const SLUG_TO_COUNTRY: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_TO_SLUG).map(([name, slug]) => [slug, name]),
)

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function countrySlug(country: string): string {
  return COUNTRY_TO_SLUG[country] ?? slugify(country)
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}

export function countryFromSlug(slug: string): string {
  return SLUG_TO_COUNTRY[slug] ?? titleCase(slug.replace(/-/g, ' '))
}

export function nameFromSlug(slug: string): string {
  return titleCase(slug.replace(/-/g, ' '))
}

export interface CityUrl {
  path: string
  query: string
}

export function toSlug(city: GeoCity): CityUrl {
  const cSlug = countrySlug(city.country)
  const citySlug = slugify(city.name)
  const a1Slug = city.admin1 ? slugify(city.admin1) : null
  const segments = a1Slug && a1Slug !== citySlug
    ? [cSlug, a1Slug, citySlug]
    : [cSlug, citySlug]
  return {
    path: '/' + segments.join('/'),
    query: `?@${city.lat.toFixed(2)},${city.lon.toFixed(2)}`,
  }
}

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
    r => countrySlug(r.country) === parsed.countrySlug && matchAdmin1(r) && matchCity(r),
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
  const [notFoundSlug, setNotFoundSlug] = useState<string | null>(null)
  const skipNextPush = useRef(false)

  useEffect(() => {
    let cancelled = false

    const resolve = async () => {
      const parsed = parseUrl(window.location.pathname, window.location.search)
      if (parsed.type === 'root') return

      if (parsed.ll) {
        const city = reconstructFromCoords(parsed, parsed.ll)
        if (cancelled) return
        skipNextPush.current = true
        setCity(city)
        return
      }

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
    setNotFoundSlug(null)
    const { path, query } = toSlug(selectedCity)
    const target = path + query
    if (currentUrl() !== target) {
      window.history.pushState(null, '', target)
    }
  }, [selectedCity])

  return { notFoundSlug }
}
