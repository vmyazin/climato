import type { GeoCity } from '../data/cities'
import { countrySlug, slugify, toCompareSlug, toSlug } from './slug'

export function discoveryLinks(origin: GeoCity, neighbor: GeoCity) {
  return { city: toSlug(neighbor).path, compare: toCompareSlug(origin, neighbor).path }
}

export function directoryLinks(city: Pick<GeoCity, 'country' | 'admin1'>) {
  const country = `/browse/${countrySlug(city.country)}`
  return { country, region: city.admin1 ? `${country}#region-${slugify(city.admin1)}` : undefined }
}

export function groupDirectoryCities(cities: GeoCity[]) {
  const countries = new Map<string, Map<string, GeoCity[]>>()
  for (const city of cities) {
    if (!countries.has(city.country)) countries.set(city.country, new Map())
    const regions = countries.get(city.country)!
    const region = city.admin1 || 'Other cities'
    if (!regions.has(region)) regions.set(region, [])
    regions.get(region)!.push(city)
  }
  return [...countries].sort(([a], [b]) => a.localeCompare(b)).map(([name, regions]) => ({
    name, path: directoryLinks({ country: name }).country,
    regions: [...regions].sort(([a], [b]) => a.localeCompare(b)).map(([name, cities]) => ({
      name, anchor: `region-${slugify(name)}`,
      cities: cities.sort((a, b) => a.name.localeCompare(b.name)),
    })),
  }))
}
