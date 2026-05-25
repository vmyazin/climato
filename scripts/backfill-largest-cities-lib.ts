// scripts/backfill-largest-cities-lib.ts
import { existsSync, readdirSync, readFileSync } from 'node:fs'

export interface CityRow {
  id: string
  name: string
  country: string
  countryCode: string
  admin1?: string
  lat: number
  lon: number
  population: number
}

export interface IndexEntry {
  fetched_at: string
  name: string
  country: string
  admin1?: string
}

export type NormalsIndex = Record<string, IndexEntry>

// Americas: North, Central, and South America plus the Caribbean.
const AMERICAS_COUNTRY_CODES = new Set([
  'AG', 'AR', 'AW', 'BB', 'BL', 'BM', 'BO', 'BQ', 'BR', 'BS', 'BZ', 'CA', 'CL', 'CO', 'CR', 'CU',
  'CW', 'DM', 'DO', 'EC', 'FK', 'GD', 'GF', 'GL', 'GP', 'GT', 'GY', 'HN', 'HT', 'JM', 'KN', 'KY',
  'LC', 'MF', 'MQ', 'MS', 'MX', 'NI', 'PA', 'PE', 'PM', 'PR', 'PY', 'SR', 'SV', 'SX', 'TC', 'TT',
  'US', 'UY', 'VC', 'VE', 'VG', 'VI',
])

// East and Southeast Asia.
const EAST_SOUTHEAST_ASIA_COUNTRY_CODES = new Set([
  'BN', 'CN', 'HK', 'ID', 'JP', 'KH', 'KR', 'LA', 'MM', 'MO', 'MY', 'PH', 'SG', 'TH', 'TL', 'TW', 'VN',
])

// Europe, including Turkey and Russia for this backfill task.
const EUROPE_COUNTRY_CODES = new Set([
  'AD', 'AL', 'AT', 'AX', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FO',
  'FR', 'GB', 'GG', 'GI', 'GR', 'HR', 'HU', 'IE', 'IM', 'IS', 'IT', 'JE', 'LI', 'LT', 'LU', 'LV', 'MC',
  'MD', 'ME', 'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'RU', 'SE', 'SI', 'SK', 'SM', 'TR', 'UA',
  'VA', 'XK',
])

const PREFERRED_REGION_COUNTRY_CODES = new Set([
  ...AMERICAS_COUNTRY_CODES,
  ...EAST_SOUTHEAST_ASIA_COUNTRY_CODES,
  ...EUROPE_COUNTRY_CODES,
])

export function isPreferredRegionCountry(countryCode: string): boolean {
  return PREFERRED_REGION_COUNTRY_CODES.has(countryCode.toUpperCase())
}

export function parseCitiesTsv(text: string): CityRow[] {
  const lines = text.split('\n')
  const cities: CityRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const cols = line.split('\t')
    if (cols.length < 9 || !cols[0]) continue
    const lat = parseFloat(cols[6] ?? '')
    const lon = parseFloat(cols[7] ?? '')
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const population = parseInt(cols[8] ?? '', 10) || 0
    cities.push({
      id: cols[0],
      name: cols[1] ?? '',
      country: cols[2] ?? '',
      countryCode: (cols[3] ?? '').toUpperCase(),
      ...(cols[4] ? { admin1: cols[4] } : {}),
      lat,
      lon,
      population,
    })
  }
  return cities
}

export function listCachedNormalIds(normalsDir: string): Set<string> {
  if (!existsSync(normalsDir)) return new Set()
  return new Set(
    readdirSync(normalsDir)
      .filter(file => file.endsWith('.json') && file !== '_index.json')
      .map(file => file.replace(/\.json$/, '')),
  )
}

export function selectBackfillCandidates(
  cities: CityRow[],
  cachedIds: Set<string>,
  limit: number,
  isPreferred: (countryCode: string) => boolean = isPreferredRegionCountry,
): CityRow[] {
  const safeLimit = Math.max(0, limit)
  return cities
    .filter(city => !cachedIds.has(city.id) && isPreferred(city.countryCode))
    .sort((a, b) => b.population - a.population)
    .slice(0, safeLimit)
}

export function loadIndex(indexPath: string): NormalsIndex {
  if (!existsSync(indexPath)) return {}
  try {
    return JSON.parse(readFileSync(indexPath, 'utf8')) as NormalsIndex
  } catch (err) {
    throw new Error(`failed to parse normals index ${indexPath}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export interface IndexUpdate {
  id: string
  name: string
  country: string
  admin1?: string
  fetchedAt: string
}

export function buildIndexUpdate(city: CityRow, fetchedAt: string): IndexUpdate {
  const name = city.name.trim()
  const country = city.country.trim()
  if (!name || !country) {
    throw new Error(`index update for ${city.id} missing name or country`)
  }
  return {
    id: city.id,
    name,
    country,
    ...(city.admin1 ? { admin1: city.admin1 } : {}),
    fetchedAt,
  }
}

export function applyIndexUpdates(
  index: NormalsIndex,
  updates: IndexUpdate[],
): NormalsIndex {
  const next: NormalsIndex = { ...index }
  for (const update of updates) {
    if (!update.name || !update.country) {
      throw new Error(`index update for ${update.id} missing name or country`)
    }
    next[update.id] = {
      fetched_at: update.fetchedAt,
      name: update.name,
      country: update.country,
      ...(update.admin1 ? { admin1: update.admin1 } : {}),
    }
  }
  return next
}
