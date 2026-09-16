import { describe, expect, it } from 'vitest'
import { directoryLinks, groupDirectoryCities, discoveryLinks } from './city-discovery'
const london = { id: '2643743', name: 'London', country: 'United Kingdom', admin1: 'England', lat: 51.5, lon: -0.12, elev: 0 }
const slough = { ...london, id: '2637627', name: 'Slough', lon: -0.59 }
describe('city discovery destinations', () => {
  it('builds routable city and comparison paths with region disambiguation', () => {
    expect(discoveryLinks(london, slough)).toEqual({ city: '/uk/england/slough', compare: '/compare/uk/england/london/vs/uk/england/slough' })
  })
  it('links a region to its section in the country directory', () => {
    expect(directoryLinks(london)).toEqual({ country: '/browse/uk', region: '/browse/uk#region-england' })
  })
  it('does not invent a region for cities without one', () => {
    expect(directoryLinks({ ...london, admin1: undefined }).region).toBeUndefined()
  })
  it('groups countries and regions without dropping cities with missing regions', () => {
    const groups = groupDirectoryCities([slough, london, { ...london, id: 'x', name: 'Other', admin1: undefined }])
    expect(groups[0].regions.map(r => [r.name, r.cities.map(c => c.name)])).toEqual([
      ['England', ['London', 'Slough']], ['Other cities', ['Other']],
    ])
  })
})
