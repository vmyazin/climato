import { useEffect, useRef } from 'react'
import type { GeoCity } from '../data/cities'
import { useWeatherStore } from '../store/weatherStore'
import { useComparisonStore } from '../store/comparisonStore'
import { countryFromSlug, countrySlug, isResolvedCity, nameFromSlug, slugify, toCompareSlug, toSlug } from './slug'

export { countryFromSlug, countrySlug, nameFromSlug, slugify, toCompareSlug, toSlug }
export type { CityUrl } from './slug'

export interface ParsedSlug {
  countrySlug: string
  admin1Slug?: string
  citySlug: string
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
  | { type: 'compare'; a: ParsedSlug; b: ParsedSlug }

function parseLatLon(search: string): [number, number] | undefined {
  const m = search.match(/^\?@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/)
  if (!m) return undefined
  const lat = parseFloat(m[1])
  const lon = parseFloat(m[2])
  if (Number.isNaN(lat) || Number.isNaN(lon)) return undefined
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return undefined
  return [lat, lon]
}

function parseCompareHalf(s: string[]): ParsedSlug | null {
  if (s.length === 2) return { countrySlug: s[0], citySlug: s[1] }
  if (s.length === 3) return { countrySlug: s[0], admin1Slug: s[1], citySlug: s[2] }
  return null
}

export function parseUrl(pathname: string, search: string): ParsedUrl {
  const segs = pathname.split('/').filter(Boolean).map(s => s.toLowerCase())
  if (segs.length === 0) return { type: 'root' }
  // Exclude server-side paths — in Vite dev these fall through to the SPA.
  if (segs[0] === 'api' || segs[0] === 'normals') return { type: 'root' }

  // Comparison routes: /compare/{cc-a}/[a1-a/]{city-a}/vs/{cc-b}/[a1-b/]{city-b}
  // 'vs' acts as a structural separator between the two city halves.
  if (segs[0] === 'compare') {
    const vsIdx = segs.indexOf('vs')
    // vs must appear at index 3 (2-seg a) or 4 (3-seg a)
    if (vsIdx !== 3 && vsIdx !== 4) return { type: 'root' }
    const a = parseCompareHalf(segs.slice(1, vsIdx))
    const b = parseCompareHalf(segs.slice(vsIdx + 1))
    if (!a || !b) return { type: 'root' }
    return { type: 'compare', a, b }
  }

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

export function parsedSlugMatchesCity(parsed: ParsedSlug, city: GeoCity): boolean {
  if (!isResolvedCity(city)) return false
  if (countrySlug(city.country) !== parsed.countrySlug) return false
  if (slugify(city.name) !== parsed.citySlug) return false
  if (parsed.admin1Slug) return !!city.admin1 && slugify(city.admin1) === parsed.admin1Slug
  return true
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

// Custom event used by programmatic URL pushers (e.g. <CompareWithPill>)
// to nudge useUrlSync's resolve effect — pushState() does NOT fire popstate.
const URL_CHANGE_EVENT = 'climato:urlchange'

export function notifyUrlChange(): void {
  window.dispatchEvent(new Event(URL_CHANGE_EVENT))
}

function currentUrl(): string {
  return window.location.pathname + window.location.search
}

export function useUrlSync(): UrlSyncResult {
  const selectedCity = useWeatherStore(s => s.selectedCity)
  const setCity = useWeatherStore(s => s.setCity)
  const setNotFoundSlug = useWeatherStore(s => s.setNotFoundSlug)
  const notFoundSlug = useWeatherStore(s => s.notFoundSlug)
  const setComparisonPair = useComparisonStore(s => s.setPair)
  const setComparisonHalf = useComparisonStore(s => s.setHalf)
  const setComparisonNotFound = useComparisonStore(s => s.setNotFound)
  const clearComparison = useComparisonStore(s => s.clear)
  const skipNextPush = useRef(false)

  useEffect(() => {
    let cancelled = false

    const resolve = async () => {
      const pathname = window.location.pathname

      // /ogimage suffix: redirect to the OG image endpoint.
      // In production the middleware handles this before the SPA loads;
      // this branch covers the Vite dev server where middleware doesn't run.
      if (pathname.endsWith('/ogimage')) {
        const cityPath = pathname.slice(0, -'/ogimage'.length)
        const inner = parseUrl(cityPath, '')
        if (inner.type === 'slug') {
          const p = new URLSearchParams({
            city: nameFromSlug(inner.citySlug),
            country: countryFromSlug(inner.countrySlug),
          })
          if (inner.admin1Slug) p.set('admin1', nameFromSlug(inner.admin1Slug))
          window.location.replace(`/api/og?${p}`)
        }
        return
      }

      const parsed = parseUrl(pathname, window.location.search)
      if (parsed.type === 'root') {
        clearComparison()
        return
      }

      // Comparison: resolve both halves in parallel via geocoding. Set
      // placeholders synchronously so first-paint can render the diptych
      // skeleton; replace with real cities as geocoding lands.
      if (parsed.type === 'compare') {
        const placeholderA = reconstructFromSlug(parsed.a)
        const placeholderB = reconstructFromSlug(parsed.b)
        setComparisonPair(placeholderA, placeholderB)

        const [resolvedA, resolvedB] = await Promise.all([
          resolveSlugViaGeocoding(parsed.a),
          resolveSlugViaGeocoding(parsed.b),
        ])
        if (cancelled) return

        if (resolvedA) setComparisonHalf('a', resolvedA)
        else setComparisonNotFound('a')

        if (resolvedB) setComparisonHalf('b', resolvedB)
        else setComparisonNotFound('b')
        return
      }

      // Single-city slug — clear any prior comparison state and run the
      // existing flow.
      clearComparison()

      // Prerendered pages can seed a fully resolved city before React mounts.
      // If that seed already matches the URL, keep it and skip the remote
      // geocoder so hydration doesn't downgrade static HTML to a loading shell.
      if (parsedSlugMatchesCity(parsed, useWeatherStore.getState().selectedCity)) {
        skipNextPush.current = true
        return
      }

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
    // pushState() does NOT fire popstate. Components that programmatically
    // change the URL (e.g. <CompareWithPill> jumping to /compare/...) must
    // dispatch the custom event below after their pushState call so
    // useUrlSync picks up the change.
    window.addEventListener(URL_CHANGE_EVENT, onPop)
    return () => {
      cancelled = true
      window.removeEventListener('popstate', onPop)
      window.removeEventListener(URL_CHANGE_EVENT, onPop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Track the last city we observed so we only push when selectedCity
  // actually changes. Comparing references (rather than a one-shot "mounted"
  // flag) keeps this correct under React StrictMode's double-invocation.
  const prevSelectedCity = useRef(selectedCity)

  useEffect(() => {
    if (skipNextPush.current) {
      skipNextPush.current = false
      prevSelectedCity.current = selectedCity
      return
    }
    if (prevSelectedCity.current === selectedCity) return
    // Placeholder cities (lat=0,lon=0) shouldn't drive URL changes — they
    // exist only as a first-paint stand-in until real geocoding resolves.
    if (selectedCity.lat === 0 && selectedCity.lon === 0) {
      prevSelectedCity.current = selectedCity
      return
    }
    // If we're on /compare/, the user just picked a city from the header
    // search while viewing the comparison page. Clear the comparison pair
    // so the single-city flow renders once the URL update lands.
    if (window.location.pathname.startsWith('/compare/')) {
      clearComparison()
    }
    const { path, query } = toSlug(selectedCity)
    const target = path + query
    if (currentUrl() !== target) {
      window.history.pushState(null, '', target)
    }
    prevSelectedCity.current = selectedCity
  }, [selectedCity])

  return { notFoundSlug }
}
