import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface CatalogEntry {
  lat: number
  lon: number
  name: string
  country: string
  admin1?: string
}

// Trusted seed cities defined inline in src/data/cities.ts. These id strings
// don't appear in data/cities.tsv (which keys by GeoNames numeric id), so
// they need to bypass the catalog check. Coordinate validation is skipped
// for them — we trust the curated source. When CITIES is eventually
// migrated to use GeoNames ids, this allowlist disappears.
const CURATED_IDS = new Set<string>([
  'reykjavik', 'tokyo', 'cairo', 'buenosaires', 'london', 'sydney', 'nyc',
  'mumbai', 'paris', 'capetown', 'marrakech', 'singapore', 'moscow', 'mexico',
  'dubai', 'stockholm', 'florianopolis',
])

const NUMERIC_ID = /^\d+$/

let catalog: Map<string, CatalogEntry> | null = null

function loadCatalog(): Map<string, CatalogEntry> {
  // Vercel runs functions with cwd at /var/task; the bundled cities.tsv
  // sits at /var/task/data/cities.tsv (per vercel.json includeFiles).
  // Locally, tsx runs from the repo root, so the same relative path works.
  const tsvPath = resolve(process.cwd(), 'data/cities.tsv')
  const text = readFileSync(tsvPath, 'utf8')
  const lines = text.split('\n')
  const map = new Map<string, CatalogEntry>()
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t')
    if (cols.length < 8 || !cols[0]) continue
    const lat = parseFloat(cols[6])
    const lon = parseFloat(cols[7])
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    map.set(cols[0], {
      lat,
      lon,
      name: cols[1],
      country: cols[2],
      ...(cols[4] ? { admin1: cols[4] } : {}),
    })
  }
  return map
}

function getCatalog(): Map<string, CatalogEntry> {
  if (!catalog) catalog = loadCatalog()
  return catalog
}

// How far the supplied lat/lon may drift from the catalog entry before we
// consider it spoofed. 0.5° is ~55km — generous enough for rounding (the
// browser sends floats, the catalog stores 4dp) and to absorb the slight
// difference between the geocoder's pin and the city centroid. Tighter
// would catch a few more attacks; looser would let "tokyo + Antarctica
// coords" slip through.
const COORD_TOLERANCE_DEG = 0.5

export type ValidationResult =
  | { ok: true; entry?: CatalogEntry }
  | { ok: false; error: string }

export function validateCity(id: string, lat: number, lon: number): ValidationResult {
  if (CURATED_IDS.has(id)) return { ok: true }
  if (!NUMERIC_ID.test(id)) return { ok: false, error: 'unknown id format' }
  const entry = getCatalog().get(id)
  if (!entry) return { ok: false, error: 'unknown id' }
  if (Math.abs(lat - entry.lat) > COORD_TOLERANCE_DEG) {
    return { ok: false, error: 'lat does not match id' }
  }
  if (Math.abs(lon - entry.lon) > COORD_TOLERANCE_DEG) {
    return { ok: false, error: 'lon does not match id' }
  }
  return { ok: true, entry }
}
