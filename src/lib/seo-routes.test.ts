import { describe, expect, it } from 'vitest'
import type { GeoCity } from '../data/cities'
import { buildSeoCityRoutes } from './seo-routes'

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
})

function city(
  id: string,
  name: string,
  country: string,
  admin1: string | undefined,
  population: number,
  isCurated = false,
): { city: GeoCity; population: number; isCurated: boolean } {
  return {
    city: {
      id,
      name,
      country,
      ...(admin1 ? { admin1 } : {}),
      lat: 1,
      lon: 1,
      elev: 0,
    },
    population,
    isCurated,
  }
}
