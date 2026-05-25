import { describe, expect, it } from 'vitest'
import type { GeoCity } from '../data/cities'
import { comparisonSeedMatchesUrl, parsedSlugMatchesCity } from './route'

describe('parsedSlugMatchesCity', () => {
  it('recognizes that a resolved seeded city already matches the current slug route', () => {
    const tokyo: GeoCity = {
      id: 'tokyo',
      name: 'Tokyo',
      country: 'Japan',
      lat: 35.6762,
      lon: 139.6503,
      elev: 40,
    }

    expect(parsedSlugMatchesCity({ countrySlug: 'japan', citySlug: 'tokyo' }, tokyo)).toBe(true)
  })

  it('accepts a short canonical route for an unambiguous city that has admin metadata', () => {
    const florianopolis: GeoCity = {
      id: '3463237',
      name: 'Florianópolis',
      country: 'Brazil',
      admin1: 'Santa Catarina',
      lat: -27.5967,
      lon: -48.5492,
      elev: 0,
    }

    expect(parsedSlugMatchesCity(
      { countrySlug: 'brazil', citySlug: 'florianopolis' },
      florianopolis,
    )).toBe(true)
  })

  it('rejects matching names when the admin segment differs', () => {
    const springfield: GeoCity = {
      id: '4250542',
      name: 'Springfield',
      country: 'United States',
      admin1: 'Illinois',
      lat: 39.8017,
      lon: -89.6436,
      elev: 182,
    }

    expect(parsedSlugMatchesCity(
      { countrySlug: 'usa', admin1Slug: 'missouri', citySlug: 'springfield' },
      springfield,
    )).toBe(false)
  })
})

describe('comparisonSeedMatchesUrl', () => {
  const tokyo: GeoCity = { id: 'tokyo', name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503, elev: 40 }
  const london: GeoCity = { id: '2643743', name: 'London', country: 'United Kingdom', admin1: 'England', lat: 51.5085, lon: -0.1257, elev: 0 }

  const parsed = {
    a: { countrySlug: 'japan', citySlug: 'tokyo' },
    b: { countrySlug: 'uk', admin1Slug: 'england', citySlug: 'london' },
  }

  it('returns true when both store cities match the URL slugs — geocoding should be skipped', () => {
    expect(comparisonSeedMatchesUrl(parsed, { cityA: tokyo, cityB: london })).toBe(true)
  })

  it('returns false when cityA does not match — geocoding must run', () => {
    const berlin: GeoCity = { id: '2950159', name: 'Berlin', country: 'Germany', lat: 52.5244, lon: 13.4105, elev: 34 }
    expect(comparisonSeedMatchesUrl(parsed, { cityA: berlin, cityB: london })).toBe(false)
  })

  it('returns false when cityB does not match — geocoding must run', () => {
    const paris: GeoCity = { id: '2988507', name: 'Paris', country: 'France', admin1: 'Île-de-France', lat: 48.8534, lon: 2.3488, elev: 42 }
    expect(comparisonSeedMatchesUrl(parsed, { cityA: tokyo, cityB: paris })).toBe(false)
  })

  it('returns false when store is empty (page loaded without a prerender seed) — geocoding must run', () => {
    expect(comparisonSeedMatchesUrl(parsed, { cityA: null, cityB: null })).toBe(false)
  })
})
