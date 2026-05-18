import { useEffect } from 'react'
import type { City, GeoCity } from '../data/cities'
import { MONTHS, MONTHS_LONG } from '../data/cities'
import { nameFromSlug, toCompareSlug, toSlug } from '../lib/route'
import { compareCities } from '../lib/comparison'

const DEFAULT_TITLE = 'Climato — Monthly Averages'
const DEFAULT_DESCRIPTION =
  "What's the weather really like in any city? See monthly averages — temperature, rainfall and sunshine hours — and the best time to visit."

const JSONLD_ID = 'climato-jsonld'

// Matches the archive-API window in useClimateNormals — keep in sync.
const CLIMATE_PERIOD = '2014-01-01/2023-12-31'

function setMeta(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setPropMeta(property: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

const DEFAULT_OG_IMAGE = '/og-image.png'

function buildOgImageUrl(selectedCity: GeoCity, city: City): string {
  const hi      = Math.max(...city.high)
  const lo      = Math.min(...city.low)
  const rain    = Math.round(city.precip.reduce((a, b) => a + b, 0))
  const peakIdx = city.high.indexOf(hi)
  const peak    = MONTHS[peakIdx]
  const r1      = (v: number) => Math.round(v * 10) / 10
  const params  = new URLSearchParams({
    city:    selectedCity.name,
    country: selectedCity.country,
    hi:      String(hi),
    lo:      String(lo),
    rain:    String(rain),
    peak,
    highs:   city.high.map(r1).join(','),
    lows:    city.low.map(r1).join(','),
  })
  if (selectedCity.admin1) params.set('admin1', selectedCity.admin1)
  return `/api/og?${params}`
}

function setOgImage(url: string) {
  setPropMeta('og:image', url)
  setPropMeta('og:image:width', '1200')
  setPropMeta('og:image:height', '630')
  setPropMeta('og:image:type', 'image/png')
  setMeta('twitter:image', url)
}

function setCanonical(href: string | null) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!href) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  if (el.getAttribute('href') !== href) el.setAttribute('href', href)
}

function setJsonLd(payload: object | null) {
  const existing = document.getElementById(JSONLD_ID)
  if (!payload) {
    existing?.remove()
    return
  }
  const json = JSON.stringify(payload)
  if (existing) {
    if (existing.textContent !== json) existing.textContent = json
    return
  }
  const el = document.createElement('script')
  el.id = JSONLD_ID
  el.type = 'application/ld+json'
  el.textContent = json
  document.head.appendChild(el)
}

function buildDatasetNode(selectedCity: GeoCity, city: City | undefined): Record<string, unknown> {
  // Skip admin1 when it duplicates the city name — common for city-states
  // like Tokyo where admin1 ("Tokyo") collapses with name ("Tokyo").
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

// Schema.org BreadcrumbList: lets Google show the path (Climato › Madrid,
// Spain) in SERP rich results. Two levels for now — once country index
// pages ship we can add the country layer as an intermediate ListItem.
function buildBreadcrumbNode(selectedCity: GeoCity): Record<string, unknown> {
  const origin = window.location.origin
  const { path } = toSlug(selectedCity)
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

function buildJsonLd(selectedCity: GeoCity, city: City | undefined): object {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildDatasetNode(selectedCity, city),
      buildBreadcrumbNode(selectedCity),
    ],
  }
}

// Build comparison-page meta: title, description, canonical, and a JSON-LD
// graph with two Dataset nodes (one per city) plus a BreadcrumbList
// (Climato › Compare › A vs B).
function buildComparisonJsonLd(a: GeoCity, b: GeoCity, cityA: City | undefined, cityB: City | undefined): object {
  const origin = window.location.origin
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

interface ComparisonMeta {
  a: GeoCity
  b: GeoCity
  cityA?: City   // climate-resolved (with high/low/precip/sun arrays)
  cityB?: City
}

interface Args {
  selectedCity: GeoCity
  city: City | undefined
  isPlaceholderData: boolean
  notFoundSlug: string | null
  // When set, comparison mode takes precedence over single-city mode.
  comparison?: ComparisonMeta
}

export function useDocumentMeta({ selectedCity, city, isPlaceholderData, notFoundSlug, comparison }: Args) {
  useEffect(() => {
    // ─── Comparison mode ────────────────────────────────────────────────
    if (comparison) {
      const { a, b, cityA, cityB } = comparison
      document.title = `${a.name} vs ${b.name} — Climate Comparison · Climato`

      const haveBothClimate = !!cityA && !!cityB
      if (haveBothClimate) {
        const result = compareCities(cityA, cityB)
        const tempStat = result.stats[0]
        const warmerName = tempStat.winner === 'a' ? a.name : tempStat.winner === 'b' ? b.name : null
        const tempPhrase = warmerName
          ? `${warmerName} is ${tempStat.delta.replace('+', '')} warmer on average.`
          : `Both cities share the same average temperature.`
        const overlapPhrase = result.overlapMonths.length
          ? ` Best months for both: ${result.overlapFormatted}.`
          : ''
        setMeta(
          'description',
          `Compare monthly weather averages for ${a.name} and ${b.name}. ${tempPhrase}${overlapPhrase}`,
        )
      } else {
        setMeta(
          'description',
          `Compare monthly temperature, rainfall and sunshine averages for ${a.name}, ${a.country} and ${b.name}, ${b.country}.`,
        )
      }

      // Per-comparison OG image (Task 3.4) is deferred; fall back to default.
      setOgImage(DEFAULT_OG_IMAGE)

      const hasRealCoordsA = a.lat !== 0 || a.lon !== 0
      const hasRealCoordsB = b.lat !== 0 || b.lon !== 0
      if (hasRealCoordsA && hasRealCoordsB) {
        setJsonLd(buildComparisonJsonLd(a, b, cityA, cityB))
        const compareUrl = `${window.location.origin}${toCompareSlug(a, b).path}`
        setCanonical(compareUrl)
      } else {
        setJsonLd(null)
        setCanonical(null)
      }
      return
    }

    if (notFoundSlug) {
      const label = nameFromSlug(notFoundSlug)
      document.title = `${label} — not found · Climato`
      setMeta('description', DEFAULT_DESCRIPTION)
      setOgImage(DEFAULT_OG_IMAGE)
      setJsonLd(null)
      setCanonical(null)
      return
    }

    const name = selectedCity.name
    const country = selectedCity.country
    document.title = `${name} Monthly Weather Averages — Climato`

    const haveFreshClimate = !!city && !isPlaceholderData
    if (haveFreshClimate) {
      const peakIdx = city.high.indexOf(Math.max(...city.high))
      const peakMonth = MONTHS_LONG[peakIdx]
      const peakTemp = city.high[peakIdx]
      setMeta(
        'description',
        `Monthly temperature highs, lows, rainfall and sunshine hours for ${name}, ${country}. Average high in ${peakMonth}: ${peakTemp}°C.`,
      )
    } else {
      setMeta(
        'description',
        `Monthly temperature highs, lows, rainfall and sunshine hours for ${name}, ${country}.`,
      )
    }

    // OG / Twitter image — full mode (with stats) when climate is fresh,
    // lite mode (city + country only) otherwise.
    if (haveFreshClimate) {
      setOgImage(buildOgImageUrl(selectedCity, city))
    } else {
      setOgImage(DEFAULT_OG_IMAGE)
    }

    // Only emit JSON-LD once we have real coordinates — placeholders
    // (lat=0,lon=0 from reconstructFromSlug) would publish bogus geo data.
    // The payload now contains both a Dataset node (climate normals) and a
    // BreadcrumbList node (Climato › City, Country) so Google can show the
    // breadcrumb path in SERP rich results.
    const hasRealCoords = selectedCity.lat !== 0 || selectedCity.lon !== 0
    if (hasRealCoords) {
      setJsonLd(buildJsonLd(selectedCity, haveFreshClimate ? city : undefined))
      // Canonical URL: drops the optional ?@lat,lon query string so Google
      // collapses /spain/madrid and /spain/madrid?@40.42,-3.70 into one
      // canonical entry. Resolved via the same toSlug used by the router.
      const { path } = toSlug(selectedCity)
      setCanonical(`${window.location.origin}${path}`)
    } else {
      setJsonLd(null)
      setCanonical(null)
    }
  }, [selectedCity, city, isPlaceholderData, notFoundSlug, comparison])

  useEffect(() => {
    return () => {
      document.title = DEFAULT_TITLE
      setMeta('description', DEFAULT_DESCRIPTION)
      setOgImage(DEFAULT_OG_IMAGE)
      setJsonLd(null)
      setCanonical(null)
    }
  }, [])
}
