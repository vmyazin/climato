import { fetchOpenMeteoNormals, type Normals } from './_lib/normals.js'
import { validateCity } from './_lib/catalog.js'

interface VercelLikeRequest {
  url?: string
  query?: Record<string, string | string[]>
}

interface VercelLikeResponse {
  status(code: number): VercelLikeResponse
  setHeader(name: string, value: string): void
  json(payload: unknown): void
}

// Wrapper stored in KV. Keeps the climate fields alongside human-readable
// metadata so the drain can promote both into data/normals/_index.json.
// Older entries written before metadata existed are bare Normals — both
// shapes are handled below.
interface PendingValue {
  normals: Normals
  name?: string
  country?: string
  admin1?: string
}

function parseQuery(req: VercelLikeRequest): URLSearchParams {
  if (req.url) return new URL(req.url, 'http://localhost').searchParams
  const out = new URLSearchParams()
  for (const [k, v] of Object.entries(req.query ?? {})) {
    out.set(k, Array.isArray(v) ? v[0] : v)
  }
  return out
}

function bad(res: VercelLikeResponse, code: number, message: string) {
  res.status(code)
  res.setHeader('Content-Type', 'application/json')
  res.json({ error: message })
}

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return { url, token }
}

function unwrap(value: unknown): Normals | null {
  if (!value || typeof value !== 'object') return null
  const obj = value as Record<string, unknown>
  if ('normals' in obj && typeof obj.normals === 'object' && obj.normals) {
    return obj.normals as Normals
  }
  // Legacy: bare Normals shape.
  if (Array.isArray(obj.high) && Array.isArray(obj.low)) {
    return obj as unknown as Normals
  }
  return null
}

async function readKv(id: string): Promise<Normals | null> {
  const env = getRedis()
  if (!env) return null
  try {
    const { Redis } = await import('@upstash/redis')
    const redis = new Redis(env)
    const value = await redis.get(`pending:${id}`)
    return unwrap(value)
  } catch (err) {
    console.error('[normals] KV read failed:', err)
    return null
  }
}

async function writeKv(id: string, value: PendingValue): Promise<void> {
  const env = getRedis()
  if (!env) return
  try {
    const { Redis } = await import('@upstash/redis')
    const redis = new Redis(env)
    // 30-day TTL: more than enough for the drain cron to promote it.
    await redis.set(`pending:${id}`, value, { ex: 60 * 60 * 24 * 30 })
  } catch (err) {
    console.error('[normals] KV write failed:', err)
  }
}

function trimMeta(s: string | null, max: number): string {
  if (!s) return ''
  return s.trim().slice(0, max)
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  const params = parseQuery(req)
  const id = params.get('id')?.trim() ?? ''
  const lat = parseFloat(params.get('lat') ?? '')
  const lon = parseFloat(params.get('lon') ?? '')
  const name = trimMeta(params.get('name'), 200)
  const country = trimMeta(params.get('country'), 100)
  const admin1 = trimMeta(params.get('admin1'), 100)

  if (!id || !ID_RE.test(id)) return bad(res, 400, 'invalid id')
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return bad(res, 400, 'invalid lat')
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return bad(res, 400, 'invalid lon')

  // Reject anything that isn't a known city. Closes the proxy-abuse,
  // KV-pollution, and data-poisoning vectors documented in the audit.
  const validation = validateCity(id, lat, lon)
  if (!validation.ok) return bad(res, 400, validation.error)

  const cached = await readKv(id)
  if (cached) {
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
    res.setHeader('X-Climato-Cache', 'kv')
    res.status(200)
    res.json(cached)
    return
  }

  let normals: Normals
  try {
    normals = await fetchOpenMeteoNormals(lat, lon)
  } catch (err) {
    console.error('[normals] Open-Meteo fetch failed:', err)
    return bad(res, 502, 'upstream fetch failed')
  }

  // Fire-and-forget: don't block the response on KV write.
  const wrapped: PendingValue = { normals }
  if (name) wrapped.name = name
  if (country) wrapped.country = country
  if (admin1) wrapped.admin1 = admin1
  writeKv(id, wrapped).catch(() => { /* logged in writeKv */ })

  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.setHeader('X-Climato-Cache', 'miss')
  res.status(200)
  res.json(normals)
}
