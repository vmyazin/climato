import { useEffect } from 'react'
import type { City, GeoCity } from '../data/cities'
import { nameFromSlug, toCompareSlug, toSlug } from '../lib/route'
import { compareCities } from '../lib/comparison'
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  JSONLD_ID,
  buildCityJsonLd,
  buildCityOgImageUrl,
  buildCitySeoMeta,
  buildComparisonJsonLd,
  buildComparisonOgImageUrl,
} from '../lib/seo'

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

      // Per-comparison OG image — only when both halves are climate-resolved
      // (otherwise we can't compute a meaningful differential to embed).
      if (haveBothClimate) {
        setOgImage(buildComparisonOgImageUrl(a, b, cityA, cityB))
      } else {
        setOgImage(DEFAULT_OG_IMAGE)
      }

      const hasRealCoordsA = a.lat !== 0 || a.lon !== 0
      const hasRealCoordsB = b.lat !== 0 || b.lon !== 0
      if (hasRealCoordsA && hasRealCoordsB) {
        setJsonLd(buildComparisonJsonLd(a, b, cityA, cityB, window.location.origin))
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

    const haveFreshClimate = !!city && !isPlaceholderData
    if (haveFreshClimate) {
      const { path } = toSlug(selectedCity)
      const meta = buildCitySeoMeta(selectedCity, city, window.location.origin, path)
      document.title = meta.title
      setMeta('description', meta.description)
      setOgImage(buildCityOgImageUrl(selectedCity, city))
      setJsonLd(meta.jsonLd)
      setCanonical(meta.canonicalUrl)
      return
    } else {
      document.title = `${name} Monthly Weather Averages — Climato`
      setMeta(
        'description',
        `Monthly temperature highs, lows, rainfall and sunshine hours for ${name}, ${country}.`,
      )
    }

    // OG / Twitter image — full mode (with stats) when climate is fresh,
    // lite mode (city + country only) otherwise.
    setOgImage(DEFAULT_OG_IMAGE)

    // Only emit JSON-LD once we have real coordinates — placeholders
    // (lat=0,lon=0 from reconstructFromSlug) would publish bogus geo data.
    // The payload now contains both a Dataset node (climate normals) and a
    // BreadcrumbList node (Climato › City, Country) so Google can show the
    // breadcrumb path in SERP rich results.
    const hasRealCoords = selectedCity.lat !== 0 || selectedCity.lon !== 0
    if (hasRealCoords) {
      setJsonLd(buildCityJsonLd(selectedCity, undefined, window.location.origin))
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
