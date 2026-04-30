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
