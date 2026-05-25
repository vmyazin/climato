// scripts/backfill-largest-cities.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateCity } from '../api/_lib/catalog.js'
import { fetchArchiveNormals } from '../api/_lib/weather/archive.js'
import {
  applyIndexUpdates,
  buildIndexUpdate,
  listCachedNormalIds,
  loadIndex,
  parseCitiesTsv,
  selectBackfillCandidates,
} from './backfill-largest-cities-lib.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const NORMALS_DIR = resolve(ROOT, 'data/normals')
const INDEX_PATH = resolve(NORMALS_DIR, '_index.json')
const CITIES_PATH = resolve(ROOT, 'data/cities.tsv')

const LIMIT = parseInt(process.env.LIMIT ?? '100', 10)
const DRY_RUN = process.env.DRY_RUN === '1'
const DELAY_MS = parseInt(process.env.DELAY_MS ?? '500', 10)

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const tsv = readFileSync(CITIES_PATH, 'utf8')
  const cities = parseCitiesTsv(tsv)
  const cachedIds = listCachedNormalIds(NORMALS_DIR)
  const candidates = selectBackfillCandidates(cities, cachedIds, LIMIT)

  console.log(
    `backfill-largest: selected ${candidates.length} candidates (limit=${LIMIT}, cached=${cachedIds.size})`,
  )

  if (DRY_RUN) {
    for (const city of candidates) {
      console.log(
        `${city.id}\t${city.name}\t${city.country}\t${city.countryCode}\t${city.population}`,
      )
    }
    return
  }

  if (!existsSync(NORMALS_DIR)) mkdirSync(NORMALS_DIR, { recursive: true })

  let index = loadIndex(INDEX_PATH)
  const fetchedAt = new Date().toISOString()
  let written = 0
  let skipped = 0

  for (const city of candidates) {
    const validation = validateCity(city.id, city.lat, city.lon)
    if (!validation.ok) {
      console.warn(`backfill-largest: skip ${city.id} ${city.name}: ${validation.error}`)
      skipped++
      continue
    }

    try {
      const indexUpdate = buildIndexUpdate(city, fetchedAt)
      const { data, source } = await fetchArchiveNormals(city.lat, city.lon)
      writeFileSync(resolve(NORMALS_DIR, `${city.id}.json`), JSON.stringify(data))
      index = applyIndexUpdates(index, [indexUpdate])
      writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + '\n')
      written++
      console.log(`backfill-largest: wrote ${city.id} ${city.name} (${source})`)
    } catch (err) {
      console.error(`backfill-largest: failed ${city.id} ${city.name}:`, err)
      skipped++
    }

    if (DELAY_MS > 0) await sleep(DELAY_MS)
  }

  console.log(`backfill-largest: wrote ${written} files, skipped ${skipped}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
