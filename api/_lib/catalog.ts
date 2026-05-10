import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface CatalogEntry {
  lat: number
  lon: number
  name: string
  country: string
  admin1?: string
  population: number
}

// Population threshold above which a catalog city is treated as an SEO
// ranking target. Smaller cities still get pages but they rarely surface
// in search; tracking coverage against them produces a misleadingly low
// headline metric (e.g. "0.6% covered") that doesn't reflect actual reach.
export const BIG_CITY_MIN_POP = 250_000

// Trusted seed cities defined inline in src/data/cities.ts. These id strings
// don't appear in data/cities.tsv (which keys by GeoNames numeric id), so
// they need their own coordinate table for the same lat/lon cross-check we
// run against the catalog. Without this table we accept arbitrary lat/lon
// for any curated id, which lets an attacker poison the cache for popular
// cities (Tokyo, NYC, London …). Coords mirror the CITIES array.
const CURATED_COORDS: Record<string, { lat: number; lon: number }> = {
  reykjavik:     { lat:  64.1466, lon: -21.9426 },
  tokyo:         { lat:  35.6762, lon: 139.6503 },
  cairo:         { lat:  30.0626, lon:  31.2497 },
  buenosaires:   { lat: -34.6037, lon: -58.3816 },
  london:        { lat:  51.5074, lon:  -0.1278 },
  sydney:        { lat: -33.8688, lon: 151.2093 },
  nyc:           { lat:  40.7128, lon: -74.0060 },
  mumbai:        { lat:  19.0760, lon:  72.8777 },
  paris:         { lat:  48.8566, lon:   2.3522 },
  capetown:      { lat: -33.9249, lon:  18.4241 },
  marrakech:     { lat:  31.6295, lon:  -7.9811 },
  singapore:     { lat:   1.3521, lon: 103.8198 },
  moscow:        { lat:  55.7558, lon:  37.6173 },
  mexico:        { lat:  19.4326, lon: -99.1332 },
  dubai:         { lat:  25.2048, lon:  55.2708 },
  stockholm:     { lat:  59.3293, lon:  18.0686 },
  florianopolis: { lat: -27.5954, lon: -48.5480 },
}

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
    const population = parseInt(cols[8] ?? '', 10) || 0
    map.set(cols[0], {
      lat,
      lon,
      name: cols[1],
      country: cols[2],
      ...(cols[4] ? { admin1: cols[4] } : {}),
      population,
    })
  }
  return map
}

function getCatalog(): Map<string, CatalogEntry> {
  if (!catalog) catalog = loadCatalog()
  return catalog
}

export interface CatalogStats {
  total: number
  bigCities: number
}

// Aggregate stats for the admin Schema Status panel.
export function catalogStats(): CatalogStats {
  const cat = getCatalog()
  let bigCities = 0
  for (const entry of cat.values()) {
    if (entry.population >= BIG_CITY_MIN_POP) bigCities++
  }
  return { total: cat.size, bigCities }
}

// Whether a given GeoNames id belongs to a city that exceeds the SEO
// ranking-target threshold. Used by the admin page to decide whether a
// cached entry "counts" toward Coverage.
export function isBigCity(id: string): boolean {
  const entry = getCatalog().get(id)
  return !!entry && entry.population >= BIG_CITY_MIN_POP
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

function coordsMatch(supplied: { lat: number; lon: number }, canonical: { lat: number; lon: number }): boolean {
  return Math.abs(supplied.lat - canonical.lat) <= COORD_TOLERANCE_DEG
      && Math.abs(supplied.lon - canonical.lon) <= COORD_TOLERANCE_DEG
}

export function validateCity(id: string, lat: number, lon: number): ValidationResult {
  // Curated id path: cross-check supplied lat/lon against the hardcoded
  // canonical coords for that curated city so an attacker can't seed
  // /api/normals with arbitrary climate data for high-traffic ids
  // (Tokyo, NYC, London, …).
  const curated = CURATED_COORDS[id]
  if (curated) {
    if (!coordsMatch({ lat, lon }, curated)) {
      return { ok: false, error: 'coords do not match curated id' }
    }
    return { ok: true }
  }

  // Anything that isn't a curated id must be a GeoNames numeric id that
  // exists in the data/cities.tsv catalog. Previously we accepted unknown
  // numeric ids (sub-100k-pop cities below the build threshold) without
  // coord checks — that let an unauthenticated caller pollute KV / the
  // drained dataset for any numeric id and burn upstream Open-Meteo and
  // function quota at will. Strict reject now; expand the catalog
  // (lower MIN_POP in scripts/build-cities.sh) if smaller cities need
  // first-class support.
  if (!NUMERIC_ID.test(id)) return { ok: false, error: 'unknown id format' }
  const entry = getCatalog().get(id)
  if (!entry) return { ok: false, error: 'unknown city id' }
  if (!coordsMatch({ lat, lon }, entry)) {
    return { ok: false, error: 'coords do not match id' }
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
