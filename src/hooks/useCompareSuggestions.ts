import { useMemo } from 'react'
import { CITIES, type City, type GeoCity } from '../data/cities'
import { useNearbyCities, type NearbyCity } from './useNearbyCities'
import { classifyClimate, annualPrecipMm, peakAndTrough } from '../lib/climate-summary'
import { popularPartnersFor } from '../data/popular-compare-pairs'

export interface CompareSuggestions {
  nearby:         GeoCity[]
  climateSimilar: GeoCity[]
  popular:        GeoCity[]
  // Combined, deduped, ordered (nearby → climate-similar → popular), capped at 6.
  combined:       GeoCity[]
  isLoading:      boolean
}

const TARGET_TOTAL = 6
const NEARBY_FETCH_COUNT = 6        // ask for more than we need so dedup has headroom
const NEARBY_MIN_KM = 50             // exclude same-metro suggestions (Versailles for Paris)
const CLIMATE_FAR_MIN_KM = 1500      // exclude candidates that overlap the nearby bucket

// Great-circle (haversine) distance in km between two lat/lon points.
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function nearbyToGeoCity(n: NearbyCity): GeoCity {
  return {
    id: n.id,
    name: n.name,
    country: n.country,
    ...(n.admin1 ? { admin1: n.admin1 } : {}),
    lat: n.lat,
    lon: n.lon,
    elev: 0,
  }
}

interface ClimateSignature {
  peakHigh: number
  precip: number
  sun: number
}

function signatureOf(city: City): ClimateSignature {
  const { peakValue } = peakAndTrough(city.high)
  return {
    peakHigh: peakValue,
    precip: annualPrecipMm(city),
    sun: city.sun.reduce((s, v) => s + v, 0) / 12,
  }
}

// Normalized Euclidean distance in climate-signature space. Each axis is
// rescaled so a unit step is comparable: temperature in 5°C steps, precip
// in 200mm steps, sunshine in 1.5h steps. Tuned so the three signals
// contribute roughly equally to the final score.
function signatureDistance(a: ClimateSignature, b: ClimateSignature): number {
  const dT = (a.peakHigh - b.peakHigh) / 5
  const dP = (a.precip - b.precip) / 200
  const dS = (a.sun - b.sun) / 1.5
  return Math.sqrt(dT * dT + dP * dP + dS * dS)
}

// Returns the seed-CITIES entry whose name matches the current city, if any.
// Used to bridge the gap between runtime geocoded ids (numeric, from
// Open-Meteo) and seed ids (slug-like tokens, e.g. 'paris'). The two don't
// match — both refer to the same place — so all comparison-bucket logic
// needs name-based equivalence.
function seedMatchOf(currentName: string): City | undefined {
  const lc = currentName.toLowerCase()
  return CITIES.find(c => c.name.toLowerCase() === lc)
}

function pickClimateSimilar(currentCity: City, alreadyExcluded: Set<string>, currentNameLc: string): GeoCity[] {
  const currentSig = signatureOf(currentCity)
  const currentType = classifyClimate(currentCity)

  // Score each seed city in the same climate type, far enough away to not
  // overlap the nearby bucket. Fall back to "any climate type" if the
  // strict filter returns fewer than 2 candidates.
  type Scored = { city: City; score: number; sameType: boolean }
  const scored: Scored[] = []
  for (const candidate of CITIES) {
    if (candidate.id === currentCity.id) continue
    if (candidate.name.toLowerCase() === currentNameLc) continue  // name-equiv guard
    if (alreadyExcluded.has(candidate.id)) continue
    const distKm = haversineKm(currentCity.lat, currentCity.lon, candidate.lat, candidate.lon)
    if (distKm < CLIMATE_FAR_MIN_KM) continue
    const sameType = classifyClimate(candidate) === currentType
    scored.push({
      city: candidate,
      score: signatureDistance(currentSig, signatureOf(candidate)),
      sameType,
    })
  }

  // Prefer same-climate-type candidates first; within each group sort by score.
  scored.sort((a, b) => {
    if (a.sameType !== b.sameType) return a.sameType ? -1 : 1
    return a.score - b.score
  })

  return scored.slice(0, 2).map(s => s.city)
}

function pickPopular(lookupKey: string, currentNameLc: string, alreadyExcluded: Set<string>): GeoCity[] {
  const partnerIds = popularPartnersFor(lookupKey)
  const out: GeoCity[] = []
  for (const id of partnerIds) {
    if (alreadyExcluded.has(id)) continue
    const seed = CITIES.find(c => c.id === id)
    if (!seed) continue
    if (seed.name.toLowerCase() === currentNameLc) continue  // name-equiv guard
    out.push(seed)
    if (out.length >= 2) break
  }
  return out
}

// Dedup + backfill. Concatenates nearby + climate-similar + popular in
// priority order, drops cities already seen by id, and stops once we reach
// TARGET_TOTAL (6). Returns fewer than 6 only in degenerate cases.
function combineSuggestions(
  nearby: GeoCity[],
  climateSimilar: GeoCity[],
  popular: GeoCity[],
  currentCityId: string,
): GeoCity[] {
  const seen = new Set<string>([currentCityId])
  const out: GeoCity[] = []
  for (const bucket of [nearby, climateSimilar, popular]) {
    for (const c of bucket) {
      if (seen.has(c.id)) continue
      seen.add(c.id)
      out.push(c)
      if (out.length >= TARGET_TOTAL) return out
    }
  }
  return out
}

interface Args {
  // GeoCity is enough for nearby + popular; climate-similar requires the
  // climate-resolved City. If only GeoCity is supplied, climateSimilar is
  // empty until normals load.
  geo:  GeoCity | undefined
  city: City | undefined
}

export function useCompareSuggestions({ geo, city }: Args): CompareSuggestions {
  const nearbyQ = useNearbyCities(geo, NEARBY_FETCH_COUNT)

  return useMemo<CompareSuggestions>(() => {
    if (!geo) {
      return { nearby: [], climateSimilar: [], popular: [], combined: [], isLoading: false }
    }

    // Bridge runtime-geocoded id to seed-CITIES id by name. If the current
    // city matches a seed (Paris/Tokyo/etc.), prefer the seed id for the
    // POPULAR_PAIRS lookup so we hit the curated entry instead of falling
    // back to GLOBAL_TOP_PAIRS.
    const currentNameLc = geo.name.toLowerCase()
    const seedMatch = seedMatchOf(geo.name)
    const popularLookupKey = seedMatch?.id ?? geo.id

    // Source A — nearby (top 2 with distance >= NEARBY_MIN_KM)
    const nearbyAll = nearbyQ.data ?? []
    const nearby = nearbyAll
      .filter(n => n.distance_km >= NEARBY_MIN_KM)
      .slice(0, 2)
      .map(nearbyToGeoCity)

    const excluded = new Set<string>([geo.id, ...nearby.map(c => c.id)])
    if (seedMatch) excluded.add(seedMatch.id)

    // Source B — climate-similar (only when climate is loaded)
    const climateSimilar = city ? pickClimateSimilar(city, excluded, currentNameLc) : []
    for (const c of climateSimilar) excluded.add(c.id)

    // Source C — popular
    const popular = pickPopular(popularLookupKey, currentNameLc, excluded)

    const combined = combineSuggestions(nearby, climateSimilar, popular, geo.id)

    return {
      nearby,
      climateSimilar,
      popular,
      combined,
      isLoading: nearbyQ.isPending && !!nearbyQ.fetchStatus && nearbyQ.fetchStatus !== 'idle',
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo?.id, city?.id, city?.high, nearbyQ.data, nearbyQ.isPending, nearbyQ.fetchStatus])
}
