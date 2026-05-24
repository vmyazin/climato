import { fetchCurrentTemp } from './_lib/weather/forecast.js'
import { validateCity } from './_lib/catalog.js'
import { checkRateLimit } from './_lib/ratelimit.js'

interface VercelLikeRequest {
  url?: string
  query?: Record<string, string | string[]>
  headers?: Record<string, string | string[] | undefined>
}

interface VercelLikeResponse {
  status(code: number): VercelLikeResponse
  setHeader(name: string, value: string): void
  json(payload: unknown): void
}

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/

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

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  const rl = await checkRateLimit(req, 'current')
  if (!rl.allowed) {
    res.setHeader('Retry-After', '60')
    return bad(res, 429, 'rate limited')
  }

  const params = parseQuery(req)
  const id  = params.get('id')?.trim() ?? ''
  const lat = parseFloat(params.get('lat') ?? '')
  const lon = parseFloat(params.get('lon') ?? '')

  if (!id || !ID_RE.test(id)) return bad(res, 400, 'invalid id')
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return bad(res, 400, 'invalid lat')
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return bad(res, 400, 'invalid lon')

  const validation = validateCity(id, lat, lon)
  if (!validation.ok) return bad(res, 400, validation.error)

  try {
    const { data, source } = await fetchCurrentTemp(lat, lon)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800')
    res.setHeader('X-Climato-Source', source)
    res.status(200)
    res.json(data)
  } catch (err) {
    console.error('[current] all forecast providers failed:', err)
    return bad(res, 502, 'upstream fetch failed')
  }
}
