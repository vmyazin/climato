import { describe, expect, it } from 'vitest'
import type { GeoCity } from '../data/cities'
import { buildSeoCityRoutes, pickComparisonCities } from './seo-routes'

describe('buildSeoCityRoutes', () => {
  it('uses the same canonical short path rules as the sitemap for singleton city slugs', () => {
    const routes = buildSeoCityRoutes([
      city('1', 'Tokyo', 'Japan', 'Tokyo', 10_000_000),
      city('2', 'Springfield', 'United States', 'Illinois', 100_000),
      city('3', 'Springfield', 'United States', 'Missouri', 200_000),
      city('4', 'York', 'United Kingdom', 'England', 150_000),
    ])

    expect(routes.map(route => route.path)).toEqual([
      '/japan/tokyo',
      '/usa/illinois/springfield',
      '/usa/missouri/springfield',
      '/uk/york',
    ])
  })

  it('marks only routes with committed normals as pre-render eligible', () => {
    const routes = buildSeoCityRoutes(
      [
        city('tokyo', 'Tokyo', 'Japan', 'Tokyo', 0, true),
        city('2988507', 'Paris', 'France', 'Île-de-France Region', 2_000_000),
      ],
      new Set(['2988507']),
    )

    expect(routes.find(route => route.city.id === 'tokyo')?.hasCachedNormals).toBe(false)
    expect(routes.find(route => route.city.id === '2988507')?.hasCachedNormals).toBe(true)
  })

  it('collapses a "<name> City" variant onto the plain name when they are the same place', () => {
    const routes = buildSeoCityRoutes(
      [
        city('nyc', 'New York', 'United States', undefined, 0, true, [40.71, -74.01]),
        city('5128581', 'New York City', 'United States', 'New York', 8_000_000, false, [40.71, -74.01]),
      ],
      new Set(['5128581']),
    )

    expect(routes.map(route => route.path)).toEqual(['/usa/new-york'])
    // The surviving route keeps the cached-normals side's data so the merged
    // URL is still prerenderable.
    expect(routes[0]?.hasCachedNormals).toBe(true)
    expect(routes[0]?.cachedNormalsId).toBe('5128581')
  })

  it('keeps same-named places apart when they are genuinely different cities', () => {
    const routes = buildSeoCityRoutes([
      // Quezon (Bukidnon) and Quezon City (Metro Manila) are ~800 km apart.
      city('1', 'Quezon', 'Philippines', 'Bukidnon', 20_000, false, [7.73, 125.1]),
      city('2', 'Quezon City', 'Philippines', 'Metro Manila', 2_900_000, false, [14.65, 121.05]),
      // Minato is in Osaka; Minato City is a Tokyo ward.
      city('3', 'Minato', 'Japan', 'Osaka', 80_000, false, [34.22, 135.15]),
      city('4', 'Minato City', 'Japan', 'Tokyo', 260_000, false, [35.66, 139.75]),
    ])

    expect(routes.map(route => route.path).sort()).toEqual([
      '/japan/minato',
      '/japan/minato-city',
      '/philippines/quezon',
      '/philippines/quezon-city',
    ])
  })

  it('never emits the same path twice after merging', () => {
    const routes = buildSeoCityRoutes([
      city('1', 'Springfield', 'United States', 'Illinois', 100_000, false, [39.8, -89.6]),
      city('2', 'Springfield', 'United States', 'Missouri', 200_000, false, [37.2, -93.3]),
      city('3', 'Springfield City', 'United States', 'Illinois', 5_000, false, [39.8, -89.6]),
    ])

    const paths = routes.map(route => route.path)
    expect(new Set(paths).size).toBe(paths.length)
  })
})

describe('pickComparisonCities', () => {
  it('only offers pairs that have committed normals on both sides', () => {
    const routes = buildSeoCityRoutes(
      [
        city('tokyo', 'Tokyo', 'Japan', 'Tokyo', 0, true, [35.68, 139.69]),
        city('2988507', 'Paris', 'France', 'Île-de-France', 2_000_000, false, [48.86, 2.35]),
        city('3117735', 'Madrid', 'Spain', 'Madrid', 3_000_000, false, [40.42, -3.7]),
      ],
      new Set(['2988507', '3117735']),
    )

    expect(pickComparisonCities(routes).map(route => route.path)).toEqual([
      '/spain/madrid',
      '/france/paris',
    ])
  })

  it('orders curated first, then by population, so the selection is stable', () => {
    const routes = buildSeoCityRoutes(
      [
        city('tokyo', 'Tokyo', 'Japan', 'Tokyo', 0, true, [35.68, 139.69]),
        city('2988507', 'Paris', 'France', 'Île-de-France', 2_000_000, false, [48.86, 2.35]),
        city('3117735', 'Madrid', 'Spain', 'Madrid', 3_000_000, false, [40.42, -3.7]),
      ],
      new Set(['tokyo', '2988507', '3117735']),
    )

    expect(pickComparisonCities(routes).map(route => route.path)).toEqual([
      '/japan/tokyo',
      '/spain/madrid',
      '/france/paris',
    ])
    expect(pickComparisonCities(routes, 2)).toHaveLength(2)
  })
})

function city(
  id: string,
  name: string,
  country: string,
  admin1: string | undefined,
  population: number,
  isCurated = false,
  coords: [number, number] = [1, 1],
): { city: GeoCity; population: number; isCurated: boolean } {
  return {
    city: {
      id,
      name,
      country,
      ...(admin1 ? { admin1 } : {}),
      lat: coords[0],
      lon: coords[1],
      elev: 0,
    },
    population,
    isCurated,
  }
}
