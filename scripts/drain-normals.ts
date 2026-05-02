// Drain pending climate normals from Upstash Redis into data/normals/{id}.json.
// Invoked hourly by .github/workflows/drain-normals.yml. The function at
// api/normals.ts writes to keys like `pending:{id}`; we SCAN for those, write
// each value to disk, then DEL the key so it doesn't get re-promoted next run.

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Redis } from '@upstash/redis'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const NORMALS_DIR = resolve(ROOT, 'data/normals')
const INDEX_PATH = resolve(NORMALS_DIR, '_index.json')

interface IndexEntry {
  fetched_at: string
}
type Index = Record<string, IndexEntry>

function loadIndex(): Index {
  if (!existsSync(INDEX_PATH)) return {}
  try {
    return JSON.parse(readFileSync(INDEX_PATH, 'utf8')) as Index
  } catch {
    return {}
  }
}

async function main() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    console.error('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN must be set')
    process.exit(1)
  }
  const redis = new Redis({ url, token })

  if (!existsSync(NORMALS_DIR)) mkdirSync(NORMALS_DIR, { recursive: true })

  const keys: string[] = []
  let cursor: string = '0'
  do {
    const [next, batch] = await redis.scan(cursor, { match: 'pending:*', count: 200 })
    keys.push(...batch)
    cursor = String(next)
  } while (cursor !== '0')

  if (keys.length === 0) {
    console.log('drain: 0 pending entries')
    return
  }

  const index = loadIndex()
  let written = 0
  const now = new Date().toISOString()

  for (const key of keys) {
    const id = key.slice('pending:'.length)
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
      console.warn(`drain: skipping invalid key ${key}`)
      continue
    }
    const value = await redis.get(key)
    if (!value) continue
    writeFileSync(resolve(NORMALS_DIR, `${id}.json`), JSON.stringify(value))
    index[id] = { fetched_at: now }
    written++
    await redis.del(key)
  }

  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + '\n')
  console.log(`drain: wrote ${written} files`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
