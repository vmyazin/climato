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

  return routes
}

function pickRepresentative(group: SeoCityInput[]): SeoCityInput {
  return group.find(item => item.isCurated)
    ?? [...group].sort((a, b) => b.population - a.population)[0]
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
