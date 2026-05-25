import { describe, expect, it } from 'vitest'
import { CITIES } from '../data/cities'
import { buildPrerenderSeedScript, parsePrerenderSeedJson } from './prerender-seed'

describe('prerender seed', () => {
  it('serializes a resolved city and climate payload for client hydration', () => {
    const tokyo = CITIES.find(city => city.id === 'tokyo')
    expect(tokyo).toBeDefined()

    const script = buildPrerenderSeedScript({
      city: tokyo!,
      climate: tokyo!,
      neighbors: [{
        id: 'yokohama',
        name: 'Yokohama',
        country: 'Japan',
        lat: 35.4333,
        lon: 139.65,
        distance_km: 28,
      }],
    })

    expect(script).toContain('id="climato-prerender-seed"')
    expect(script).toContain('type="application/json"')
    expect(script).toContain('"id":"tokyo"')
    expect(script).toContain('"high"')
    expect(script).toContain('"distance_km":28')
  })

  it('parses valid seed JSON with nearby links and rejects malformed payloads', () => {
    const tokyo = CITIES.find(city => city.id === 'tokyo')
    expect(tokyo).toBeDefined()

    const parsed = parsePrerenderSeedJson(JSON.stringify({
      city: tokyo,
      climate: tokyo,
      neighbors: [{
        id: 'yokohama',
        name: 'Yokohama',
        country: 'Japan',
        lat: 35.4333,
        lon: 139.65,
        distance_km: 28,
      }],
    }))

    expect(parsed?.city.id).toBe('tokyo')
    expect(parsed?.climate.high).toHaveLength(12)
    expect(parsed?.neighbors?.[0].name).toBe('Yokohama')
    expect(parsePrerenderSeedJson('{bad json')).toBeNull()
    expect(parsePrerenderSeedJson(JSON.stringify({ city: tokyo }))).toBeNull()
    expect(parsePrerenderSeedJson(JSON.stringify({ city: tokyo, climate: tokyo, neighbors: [{ id: 'bad' }] }))).toBeNull()
  })
})
