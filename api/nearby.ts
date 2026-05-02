import { findNearest, validateCity } from './_lib/catalog.js'

interface VercelLikeRequest {
  url?: string
  query?: Record<string, string | string[]>
}

interface VercelLikeResponse {
  status(code: number): VercelLikeResponse
  setHeader(name: string, value: string): void
  json(payload: unknown): void
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

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  const params = parseQuery(req)
  const id = params.get('id')?.trim() ?? ''
  const lat = parseFloat(params.get('lat') ?? '')
  const lon = parseFloat(params.get('lon') ?? '')
  const n = Math.max(1, Math.min(20, parseInt(params.get('n') ?? '5', 10) || 5))

  if (!id || !ID_RE.test(id)) return bad(res, 400, 'invalid id')
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return bad(res, 400, 'invalid lat')
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return bad(res, 400, 'invalid lon')

  // Reuse the same catalog gate that protects /api/normals — only known
  // cities (geonames or curated) can ask for neighbors.
  const validation = validateCity(id, lat, lon)
  if (!validation.ok) return bad(res, 400, validation.error)

  const neighbors = findNearest({ lat, lon }, n, id)

  // The catalog is static and the query is deterministic, so cache hard.
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
  res.status(200)
  res.json({ neighbors })
}
