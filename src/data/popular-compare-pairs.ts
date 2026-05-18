// Editorial-curated comparison pairings. Maps an anchor city id (matching
// CITIES seed ids in src/data/cities.ts) to the city ids most often
// compared against it. Surfaces popular SEO pairings ("paris vs london")
// in the <CompareWithPill> suggestion strip.
//
// Long-tail cities not listed here fall back to GLOBAL_TOP_PAIRS below.

export const POPULAR_PAIRS: Record<string, string[]> = {
  paris:         ['london', 'reykjavik', 'tokyo', 'nyc'],
  london:        ['paris', 'stockholm', 'reykjavik', 'nyc'],
  tokyo:         ['singapore', 'paris', 'mumbai', 'nyc'],
  nyc:           ['london', 'paris', 'tokyo', 'mexico'],
  reykjavik:     ['stockholm', 'london', 'moscow', 'paris'],
  stockholm:     ['reykjavik', 'moscow', 'london', 'paris'],
  moscow:        ['stockholm', 'london', 'paris', 'nyc'],
  cairo:         ['marrakech', 'dubai', 'mumbai', 'capetown'],
  marrakech:     ['cairo', 'capetown', 'paris', 'dubai'],
  dubai:         ['singapore', 'cairo', 'mumbai', 'marrakech'],
  singapore:     ['tokyo', 'mumbai', 'dubai', 'sydney'],
  mumbai:        ['singapore', 'dubai', 'tokyo', 'cairo'],
  sydney:        ['singapore', 'capetown', 'tokyo', 'buenosaires'],
  capetown:      ['marrakech', 'sydney', 'buenosaires', 'cairo'],
  buenosaires:   ['florianopolis', 'sydney', 'capetown', 'mexico'],
  florianopolis: ['buenosaires', 'capetown', 'sydney', 'singapore'],
  mexico:        ['nyc', 'buenosaires', 'cairo', 'marrakech'],
}

// Fallback for long-tail / non-anchor cities. Surfaced when the current
// city has no POPULAR_PAIRS entry.
export const GLOBAL_TOP_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['paris', 'london'],
  ['tokyo', 'singapore'],
  ['nyc', 'london'],
  ['reykjavik', 'stockholm'],
  ['cairo', 'marrakech'],
  ['singapore', 'dubai'],
  ['sydney', 'capetown'],
  ['buenosaires', 'florianopolis'],
]

// Resolve the popular partners for a city by id. If the city is an anchor
// (in POPULAR_PAIRS), return its curated partners. Otherwise return a
// flattened set of city ids from GLOBAL_TOP_PAIRS, excluding the current
// city's own id.
export function popularPartnersFor(cityId: string): string[] {
  const direct = POPULAR_PAIRS[cityId]
  if (direct && direct.length) return direct

  // Long-tail fallback: surface the global top pairs as candidates,
  // dropping any duplicate ids and the current city's own id.
  const seen = new Set<string>()
  const out: string[] = []
  for (const [a, b] of GLOBAL_TOP_PAIRS) {
    for (const id of [a, b]) {
      if (id === cityId) continue
      if (seen.has(id)) continue
      seen.add(id)
      out.push(id)
    }
  }
  return out
}
