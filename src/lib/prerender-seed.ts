import type { City, GeoCity } from '../data/cities'

export const PRERENDER_SEED_ID = 'climato-prerender-seed'

export interface PrerenderSeed {
  city: GeoCity
  climate: City
  neighbors?: PrerenderNeighbor[]
}

export interface PrerenderNeighbor {
  id: string
  name: string
  country: string
  admin1?: string
  lat: number
  lon: number
  distance_km: number
}

export function buildPrerenderSeedScript(seed: PrerenderSeed): string {
  return `<script id="${PRERENDER_SEED_ID}" type="application/json">${escapeScriptJson(seed)}</script>`
}

export function readPrerenderSeed(doc: Pick<Document, 'getElementById'>): PrerenderSeed | null {
  const el = doc.getElementById(PRERENDER_SEED_ID)
  return parsePrerenderSeedJson(el?.textContent ?? '')
}

export function parsePrerenderSeedJson(json: string): PrerenderSeed | null {
  try {
    const value = JSON.parse(json) as Partial<PrerenderSeed>
    if (!isGeoCity(value.city) || !isCity(value.climate)) return null
    if (value.neighbors !== undefined && !isNeighborArray(value.neighbors)) return null
    return {
      city: value.city,
      climate: value.climate,
      ...(value.neighbors ? { neighbors: value.neighbors } : {}),
    }
  } catch {
    return null
  }
}

function isGeoCity(value: unknown): value is GeoCity {
  if (!value || typeof value !== 'object') return false
  const city = value as Partial<GeoCity>
  return typeof city.id === 'string'
    && typeof city.name === 'string'
    && typeof city.country === 'string'
    && typeof city.lat === 'number'
    && typeof city.lon === 'number'
    && typeof city.elev === 'number'
}

function isCity(value: unknown): value is City {
  if (!isGeoCity(value)) return false
  const city = value as Partial<City>
  return isMonthlyNumberArray(city.high)
    && isMonthlyNumberArray(city.low)
    && isMonthlyNumberArray(city.precip)
    && isMonthlyNumberArray(city.sun)
    && isMonthlyStringArray(city.sunrise)
    && isMonthlyStringArray(city.sunset)
}

function isMonthlyNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 12 && value.every(item => typeof item === 'number')
}

function isMonthlyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length === 12 && value.every(item => typeof item === 'string')
}

function isNeighborArray(value: unknown): value is PrerenderNeighbor[] {
  return Array.isArray(value) && value.every(isNeighbor)
}

function isNeighbor(value: unknown): value is PrerenderNeighbor {
  if (!value || typeof value !== 'object') return false
  const neighbor = value as Partial<PrerenderNeighbor>
  return typeof neighbor.id === 'string'
    && typeof neighbor.name === 'string'
    && typeof neighbor.country === 'string'
    && (neighbor.admin1 === undefined || typeof neighbor.admin1 === 'string')
    && typeof neighbor.lat === 'number'
    && typeof neighbor.lon === 'number'
    && typeof neighbor.distance_km === 'number'
}

function escapeScriptJson(value: object): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
