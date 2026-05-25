import type { City, GeoCity } from '../data/cities'
import { MONTHS, MONTHS_LONG } from '../data/cities'
import { compareCities } from './comparison'
import { toCompareSlug, toSlug } from './slug'

export const DEFAULT_TITLE = 'Climato — Monthly Averages'
export const DEFAULT_DESCRIPTION =
  "What's the weather really like in any city? See monthly averages — temperature, rainfall and sunshine hours — and the best time to visit."
export const DEFAULT_OG_IMAGE = '/og-image.png'
export const JSONLD_ID = 'climato-jsonld'

const CLIMATE_PERIOD = '2014-01-01/2023-12-31'

export interface CitySeoMeta {
  title: string
  description: string
  canonicalUrl: string
  ogImageUrl: string
  jsonLd: object
}

export function absoluteUrl(siteUrl: string, pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl
  const base = siteUrl.replace(/\/$/, '')
  return `${base}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`
}

export function buildCityOgImageUrl(selectedCity: GeoCity, city: City): string {
  const hi = Math.max(...city.high)
  const lo = Math.min(...city.low)
  const rain = Math.round(city.precip.reduce((a, b) => a + b, 0))
  const peakIdx = city.high.indexOf(hi)
  const peak = MONTHS[peakIdx]
  const r1 = (v: number) => Math.round(v * 10) / 10
  const params = new URLSearchParams({
    city: selectedCity.name,
    country: selectedCity.country,
    hi: String(hi),
    lo: String(lo),
    rain: String(rain),
    peak,
    highs: city.high.map(r1).join(','),
    lows: city.low.map(r1).join(','),
  })
  if (selectedCity.admin1) params.set('admin1', selectedCity.admin1)
  return `/api/og?${params}`
}

export function buildComparisonOgImageUrl(a: GeoCity, b: GeoCity, cityA: City, cityB: City): string {
  const result = compareCities(cityA, cityB)
  const tempStat = result.stats[0]
  const params = new URLSearchParams({
    compare: '1',
    aCity: a.name,
    aCountry: a.country,
    bCity: b.name,
    bCountry: b.country,
    warmer: tempStat.winner,
    tempDelta: tempStat.delta.replace(/[^0-9.]/g, ''),
  })
  if (result.overlapFormatted) params.set('overlap', result.overlapFormatted)
  return `/api/og?${params}`
}

export function buildDatasetNode(selectedCity: GeoCity, city: City | undefined): Record<string, unknown> {
  const includeAdmin1 = selectedCity.admin1 && selectedCity.admin1 !== selectedCity.name
  const placeName = includeAdmin1
    ? `${selectedCity.name}, ${selectedCity.admin1}, ${selectedCity.country}`
    : `${selectedCity.name}, ${selectedCity.country}`

  const place: Record<string, unknown> = {
    '@type': 'Place',
    name: placeName,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: selectedCity.lat,
      longitude: selectedCity.lon,
    },
  }

  const dataset: Record<string, unknown> = {
    '@type': 'Dataset',
    name: `Monthly Climate Normals — ${selectedCity.name}`,
    description: `Monthly average temperature, precipitation and sunshine data for ${selectedCity.name}, ${selectedCity.country}.`,
    spatialCoverage: place,
    temporalCoverage: CLIMATE_PERIOD,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    creator: { '@type': 'Organization', name: 'Climato' },
    sourceOrganization: {
      '@type': 'Organization',
      name: 'Open-Meteo',
      url: 'https://open-meteo.com/',
    },
  }

  if (city) {
    dataset.variableMeasured = [
      { '@type': 'PropertyValue', name: 'Average daily high temperature', unitCode: 'CEL' },
      { '@type': 'PropertyValue', name: 'Average daily low temperature', unitCode: 'CEL' },
      { '@type': 'PropertyValue', name: 'Monthly precipitation', unitCode: 'MMT' },
      { '@type': 'PropertyValue', name: 'Daily sunshine hours', unitCode: 'HUR' },
    ]
  }

  return dataset
}

export function buildBreadcrumbNode(selectedCity: GeoCity, origin: string, path = toSlug(selectedCity).path): Record<string, unknown> {
  const includeAdmin1 = selectedCity.admin1 && selectedCity.admin1 !== selectedCity.name
  const cityLabel = includeAdmin1
    ? `${selectedCity.name}, ${selectedCity.admin1}, ${selectedCity.country}`
    : `${selectedCity.name}, ${selectedCity.country}`
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Climato', item: `${origin}/` },
      { '@type': 'ListItem', position: 2, name: cityLabel, item: `${origin}${path}` },
    ],
  }
}

export function buildCityJsonLd(selectedCity: GeoCity, city: City | undefined, origin: string, path?: string): object {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildDatasetNode(selectedCity, city),
      buildBreadcrumbNode(selectedCity, origin, path),
    ],
  }
}

export function buildComparisonJsonLd(
  a: GeoCity,
  b: GeoCity,
  cityA: City | undefined,
  cityB: City | undefined,
  origin: string,
): object {
  const compareUrl = `${origin}${toCompareSlug(a, b).path}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildDatasetNode(a, cityA),
      buildDatasetNode(b, cityB),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Climato', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: 'Compare', item: `${origin}/compare` },
          { '@type': 'ListItem', position: 3, name: `${a.name} vs ${b.name}`, item: compareUrl },
        ],
      },
    ],
  }
}

export function buildComparisonSeoMeta(
  a: GeoCity,
  b: GeoCity,
  cityA: City,
  cityB: City,
  siteUrl: string,
): CitySeoMeta {
  const origin = siteUrl.replace(/\/$/, '')
  const { path } = toCompareSlug(a, b)
  const canonicalUrl = `${origin}${path}`
  const result = compareCities(cityA, cityB)
  const tempStat = result.stats[0]
  const warmerName = tempStat.winner === 'a' ? a.name : b.name
  const coolerName = tempStat.winner === 'a' ? b.name : a.name
  const overlapHint = result.overlapFormatted
    ? ` Both are ideal in ${result.overlapFormatted}.`
    : ''
  return {
    title: `${a.name} vs ${b.name} — Climate Comparison · Climato`,
    description: `${warmerName} is warmer than ${coolerName} by ${tempStat.delta}. Monthly temperature, rainfall and sunshine comparison.${overlapHint}`,
    canonicalUrl,
    ogImageUrl: absoluteUrl(siteUrl, buildComparisonOgImageUrl(a, b, cityA, cityB)),
    jsonLd: buildComparisonJsonLd(a, b, cityA, cityB, origin),
  }
}

export function buildCitySeoMeta(selectedCity: GeoCity, city: City, siteUrl: string, path?: string): CitySeoMeta {
  const peakIdx = city.high.indexOf(Math.max(...city.high))
  const peakMonth = MONTHS_LONG[peakIdx]
  const peakTemp = city.high[peakIdx]
  const canonicalPath = path ?? toSlug(selectedCity).path
  const canonicalUrl = absoluteUrl(siteUrl, canonicalPath)
  return {
    title: `${selectedCity.name} Monthly Weather Averages — Climato`,
    description: `Monthly temperature highs, lows, rainfall and sunshine hours for ${selectedCity.name}, ${selectedCity.country}. Average high in ${peakMonth}: ${peakTemp}°C.`,
    canonicalUrl,
    ogImageUrl: absoluteUrl(siteUrl, buildCityOgImageUrl(selectedCity, city)),
    jsonLd: buildCityJsonLd(selectedCity, city, siteUrl.replace(/\/$/, ''), canonicalPath),
  }
}
