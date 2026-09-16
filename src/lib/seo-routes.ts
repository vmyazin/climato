import type { GeoCity } from '../data/cities'
import { countrySlug, slugify } from './slug'

export interface SeoCityInput {
  city: GeoCity
  population: number
  isCurated: boolean
}

export interface SeoCityRoute extends SeoCityInput {
  path: string
  hasCachedNormals: boolean
  cachedNormalsId?: string
}

// How many cities feed the comparison grid. The sitemap and the comparison
// prerenderer must agree on this, or the sitemap advertises pairs that were
// never rendered (Google reports those as soft 404s).
export const COMPARISON_TOP_N = 50

export function priorityFor(population: number, isCurated: boolean): string {
  if (isCurated) return '0.9'
  if (population >= 1_000_000) return '0.9'
  if (population >= 250_000) return '0.7'
  return '0.5'
}

export function buildSeoCityRoutes(
  items: SeoCityInput[],
  cachedNormalIds: ReadonlySet<string> = new Set(),
): SeoCityRoute[] {
  const groups = new Map<string, SeoCityInput[]>()
  for (const item of items) {
    const key = `${countrySlug(item.city.country)}|${slugify(item.city.name)}`
    groups.set(key, [...(groups.get(key) ?? []), item])
  }

  const routes: SeoCityRoute[] = []
  for (const [, group] of groups) {
    const distinctAdmin1s = new Set(
      group.map(item => (item.city.admin1 ? slugify(item.city.admin1) : '')).filter(Boolean),
    )
    const ambiguous = distinctAdmin1s.size > 1

    if (!ambiguous) {
      const representative = pickRepresentative(group)
      const cached = group.find(item => cachedNormalIds.has(item.city.id))
      const contentItem = cached ?? representative
      routes.push({
        ...contentItem,
        path: shortCityPath(representative.city),
        hasCachedNormals: !!cached,
        ...(cached ? { cachedNormalsId: cached.city.id } : {}),
      })
      continue
    }

    for (const item of group) {
      const hasCachedNormals = cachedNormalIds.has(item.city.id)
      routes.push({
        ...item,
        path: disambiguatedCityPath(item.city),
        hasCachedNormals,
        ...(hasCachedNormals ? { cachedNormalsId: item.city.id } : {}),
      })
    }
  }

  return mergeNameVariants(routes)
}

// "New York" (curated) and "New York City" (catalog) are the same place under
// two names, so they produced two self-canonical URLs that Google reported as
// duplicates. Name alone can't decide this: Quezon and Quezon City are 800 km
// apart, Minato is in Osaka while Minato City is in Tokyo. Coordinates can.
const NAME_SUFFIX = /-(?:city|town)$/

// Climate normals don't vary meaningfully across this distance, so two
// same-named entries inside it describe one page's worth of data. It also
// clears the genuine homonyms by two orders of magnitude.
const MERGE_RADIUS_KM = 25

function mergeNameVariants(routes: SeoCityRoute[]): SeoCityRoute[] {
  const buckets = new Map<string, SeoCityRoute[]>()
  for (const route of routes) {
    const key = `${countrySlug(route.city.country)}|${slugify(route.city.name).replace(NAME_SUFFIX, '')}`
    buckets.set(key, [...(buckets.get(key) ?? []), route])
  }

  const merged: SeoCityRoute[] = []
  for (const [, bucket] of buckets) {
    // Only a suffixed name can be folded away, and only into a plain one.
    // Two routes sharing a slug are here because buildSeoCityRoutes split
    // them by admin1 — Springfield, Illinois and Springfield, Missouri are
    // different cities and must keep their own URLs.
    const plain = bucket.filter(route => !NAME_SUFFIX.test(slugify(route.city.name)))
    const suffixed = bucket.filter(route => NAME_SUFFIX.test(slugify(route.city.name)))
    if (!plain.length || !suffixed.length) {
      merged.push(...bucket)
      continue
    }

    const absorbed = new Map<SeoCityRoute, SeoCityRoute[]>()
    for (const variant of suffixed) {
      const host = nearest(plain, variant)
      if (!host) {
        merged.push(variant)
        continue
      }
      absorbed.set(host, [...(absorbed.get(host) ?? []), variant])
    }

    for (const host of plain) {
      const group = [host, ...(absorbed.get(host) ?? [])]
      // Keep the plain path, but carry the content of whichever member
      // actually has committed normals so the merged URL stays prerenderable.
      const cached = group.find(route => route.hasCachedNormals)
      merged.push({
        ...(cached ?? host),
        path: host.path,
        hasCachedNormals: !!cached,
        ...(cached?.cachedNormalsId ? { cachedNormalsId: cached.cachedNormalsId } : {}),
      })
    }
  }
  return merged
}

function nearest(candidates: SeoCityRoute[], target: SeoCityRoute): SeoCityRoute | null {
  let best: SeoCityRoute | null = null
  let bestKm = MERGE_RADIUS_KM
  for (const candidate of candidates) {
    const km = distanceKm(candidate.city, target.city)
    if (km <= bestKm) {
      best = candidate
      bestKm = km
    }
  }
  return best
}

function distanceKm(a: GeoCity, b: GeoCity): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

// The cities that get a prerendered comparison page, in a stable order.
// Only cached-normals routes qualify — a pair needs real data on both sides.
export function pickComparisonCities(routes: SeoCityRoute[], topN = COMPARISON_TOP_N): SeoCityRoute[] {
  return routes
    .filter(route => route.hasCachedNormals && route.cachedNormalsId)
    .sort((a, b) =>
      (b.isCurated ? 1 : 0) - (a.isCurated ? 1 : 0)
      || b.population - a.population
      || a.path.localeCompare(b.path)
    )
    .slice(0, topN)
}

function pickRepresentative<T extends SeoCityInput>(group: T[]): T {
  return group.find(item => item.isCurated)
    ?? [...group].sort((a, b) => b.population - a.population)[0]!
}

function shortCityPath(city: GeoCity): string {
  return `/${countrySlug(city.country)}/${slugify(city.name)}`
}

function disambiguatedCityPath(city: GeoCity): string {
  const cSlug = countrySlug(city.country)
  const citySlug = slugify(city.name)
  const admin1Slug = city.admin1 ? slugify(city.admin1) : ''
  return admin1Slug && admin1Slug !== citySlug
    ? `/${cSlug}/${admin1Slug}/${citySlug}`
    : `/${cSlug}/${citySlug}`
}
