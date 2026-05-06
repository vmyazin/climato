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
  if (!entry) {
    // Valid GeoNames numeric id not in our catalog — typically a city below
    // the MIN_POP=100k build threshold (e.g. Beverly MA, pop ~43k). The id
    // format is correct and lat/lon already passed range checks; accept it.
    // We can't cross-check coords against the catalog but the request almost
    // certainly originates from our own geocoding path.
    return { ok: true }
  }
  if (Math.abs(lat - entry.lat) > COORD_TOLERANCE_DEG) {
    return { ok: false, error: 'lat does not match id' }
  }
  if (Math.abs(lon - entry.lon) > COORD_TOLERANCE_DEG) {
    return { ok: false, error: 'lon does not match id' }
  }
  return { ok: true, entry }
}

export interface NeighborEntry extends CatalogEntry {
  id: string
  distance_km: number
}

const EARTH_RADIUS_KM = 6371

// Great-circle distance (haversine). Cheap enough to run against the full
// 6k-row catalog per request — measured at well under 10ms on cold cache.
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

// Returns the N nearest catalog cities to the given lat/lon, excluding any
// entry within `minKm` (default 30km skips metro-area subdivisions —
// Madrid districts, Tokyo wards, NYC boroughs — which would otherwise
// dominate the list and read as "neighbourhoods" rather than destinations)
// and any entry beyond `maxKm` (default 600km skips the section entirely
// for genuinely isolated cities like Reykjavík where the nearest city is
// across an ocean).
export function findNearest(
  origin: { lat: number; lon: number },
  n: number,
  excludeId?: string,
  minKm = 30,
  maxKm = 600,
): NeighborEntry[] {
  const cat = getCatalog()
  const candidates: NeighborEntry[] = []
  for (const [id, entry] of cat) {
    if (id === excludeId) continue
    const distance_km = haversineKm(origin.lat, origin.lon, entry.lat, entry.lon)
    if (distance_km < minKm || distance_km > maxKm) continue
    candidates.push({ id, ...entry, distance_km })
  }
  candidates.sort((a, b) => a.distance_km - b.distance_km)
  return candidates.slice(0, Math.max(0, Math.min(n, 50)))
}
