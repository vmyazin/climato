import { describe, expect, it } from 'vitest'
import type { GeoCity } from '../data/cities'
import { parsedSlugMatchesCity } from './route'

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
