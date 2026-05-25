import { describe, expect, it } from 'vitest'
import { CITIES } from '../data/cities'
import { buildPrerenderSeedScript, parsePrerenderSeedJson } from './prerender-seed'

const tokyo = CITIES.find(c => c.id === 'tokyo')!
const london = CITIES.find(c => c.id === 'london')!

describe('prerender seed — city kind', () => {
  it('serializes a resolved city and climate payload for client hydration', () => {
    const script = buildPrerenderSeedScript({
      kind: 'city',
      city: tokyo,
      climate: tokyo,
      neighbors: [{ id: 'yokohama', name: 'Yokohama', country: 'Japan', lat: 35.4333, lon: 139.65, distance_km: 28 }],
    })
    expect(script).toContain('id="climato-prerender-seed"')
    expect(script).toContain('type="application/json"')
    expect(script).toContain('"id":"tokyo"')
    expect(script).toContain('"high"')
    expect(script).toContain('"distance_km":28')
  })

  it('parses a city seed and rejects malformed payloads', () => {
    const parsed = parsePrerenderSeedJson(JSON.stringify({
      kind: 'city',
      city: tokyo,
      climate: tokyo,
      neighbors: [{ id: 'yokohama', name: 'Yokohama', country: 'Japan', lat: 35.4333, lon: 139.65, distance_km: 28 }],
    }))
    expect(parsed?.kind).toBe('city')
    if (parsed?.kind !== 'city') return
    expect(parsed.city.id).toBe('tokyo')
    expect(parsed.climate.high).toHaveLength(12)
    expect(parsed.neighbors?.[0].name).toBe('Yokohama')
  })

  it('parses legacy seed (no kind field) as city', () => {
    const parsed = parsePrerenderSeedJson(JSON.stringify({ city: tokyo, climate: tokyo }))
    expect(parsed?.kind).toBe('city')
  })

  it('rejects malformed city seeds', () => {
    expect(parsePrerenderSeedJson('{bad json')).toBeNull()
    expect(parsePrerenderSeedJson(JSON.stringify({ kind: 'city', city: tokyo }))).toBeNull()
    expect(parsePrerenderSeedJson(JSON.stringify({ kind: 'city', city: tokyo, climate: tokyo, neighbors: [{ id: 'bad' }] }))).toBeNull()
  })
})

describe('prerender seed — comparison kind', () => {
  it('serializes and round-trips a comparison seed', () => {
    const script = buildPrerenderSeedScript({ kind: 'comparison', a: tokyo, b: london, climateA: tokyo, climateB: london })
    const parsed = parsePrerenderSeedJson(script.match(/type="application\/json">(.+)<\/script>/)?.[1] ?? '{}')
    expect(parsed?.kind).toBe('comparison')
    if (parsed?.kind !== 'comparison') return
    expect(parsed.a.id).toBe('tokyo')
    expect(parsed.b.id).toBe('london')
    expect(parsed.climateA.high).toHaveLength(12)
    expect(parsed.climateB.low).toHaveLength(12)
  })

  it('rejects comparison seeds with missing climate', () => {
    expect(parsePrerenderSeedJson(JSON.stringify({ kind: 'comparison', a: tokyo, b: london, climateA: tokyo }))).toBeNull()
  })
})
