import type { GeoCity } from '../data/cities'

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

function citySegments(city: GeoCity): string[] {
  const cSlug = countrySlug(city.country)
  const citySlug = slugify(city.name)
  const a1Slug = city.admin1 ? slugify(city.admin1) : null
  return a1Slug && a1Slug !== citySlug
    ? [cSlug, a1Slug, citySlug]
    : [cSlug, citySlug]
}

export function toSlug(city: GeoCity): CityUrl {
  return {
    path: '/' + citySegments(city).join('/'),
    query: `?@${city.lat.toFixed(2)},${city.lon.toFixed(2)}`,
  }
}

// Build the canonical comparison URL for a pair of cities. No coord query —
// both halves are resolved by slug, so the lat/lon hint that single-city
// URLs carry would be redundant.
export function toCompareSlug(a: GeoCity, b: GeoCity): CityUrl {
  const aSegs = citySegments(a)
  const bSegs = citySegments(b)
  return {
    path: '/compare/' + aSegs.join('/') + '/vs/' + bSegs.join('/'),
    query: '',
  }
}

// The same allowlist enforced server-side in api/_lib/catalog.ts. Kept
// duplicated rather than imported because the api/ tree is bundled
// separately by Vercel and we want this to ship in the SPA bundle too.
const CURATED_IDS = new Set<string>([
  'reykjavik', 'tokyo', 'cairo', 'buenosaires', 'london', 'sydney', 'nyc',
  'mumbai', 'paris', 'capetown', 'marrakech', 'singapore', 'moscow', 'mexico',
  'dubai', 'stockholm', 'florianopolis',
])

const NUMERIC_ID = /^\d+$/

// Whether a GeoCity has a stable, server-acceptable id — i.e., one that
// either matches a curated city or looks like a GeoNames numeric id. The
// URL handler synthesises placeholder ids (e.g., "spain-madrid",
// "placeholder:...") for first-paint that the API rejects; hooks should
// stay disabled until geocoding upgrades the city to a resolved one.
export function isResolvedCity(city: { id: string } | undefined | null): boolean {
  if (!city) return false
  return CURATED_IDS.has(city.id) || NUMERIC_ID.test(city.id)
}
