import { timingSafeEqual } from 'node:crypto'

interface VercelLikeRequest {
  url?: string
  headers?: Record<string, string | string[] | undefined>
}

interface VercelLikeResponse {
  status(code: number): VercelLikeResponse
  setHeader(name: string, value: string): void
  send(body: string): void
}

const REALM = 'Climato Admin'

interface IndexEntry {
  fetched_at: string
}
type Index = Record<string, IndexEntry>

interface PendingEntry {
  id: string
  has_value: boolean
}

function getHeader(req: VercelLikeRequest, name: string): string | undefined {
  const v = req.headers?.[name.toLowerCase()]
  if (Array.isArray(v)) return v[0]
  return v
}

function checkBasicAuth(req: VercelLikeRequest, password: string): boolean {
  const auth = getHeader(req, 'authorization')
  if (!auth?.startsWith('Basic ')) return false
  let decoded: string
  try {
    decoded = Buffer.from(auth.slice('Basic '.length), 'base64').toString('utf8')
  } catch {
    return false
  }
  const colon = decoded.indexOf(':')
  if (colon < 0) return false
  const provided = decoded.slice(colon + 1)
  // Constant-time compare; equal-length is required for timingSafeEqual.
  const a = Buffer.from(provided)
  const b = Buffer.from(password)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function getRedisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return { url, token }
}

async function loadIndex(origin: string): Promise<Index> {
  try {
    const res = await fetch(`${origin}/normals/_index.json`, { cache: 'no-store' })
    if (!res.ok) return {}
    return (await res.json()) as Index
  } catch {
    return {}
  }
}

async function loadPending(): Promise<PendingEntry[]> {
  const env = getRedisEnv()
  if (!env) return []
  try {
    const { Redis } = await import('@upstash/redis')
    const redis = new Redis(env)
    const keys: string[] = []
    let cursor: string = '0'
    do {
      const [next, batch] = await redis.scan(cursor, { match: 'pending:*', count: 200 })
      keys.push(...batch)
      cursor = String(next)
    } while (cursor !== '0')
    return keys.map(k => ({ id: k.slice('pending:'.length), has_value: true }))
  } catch (err) {
    console.error('[admin] KV scan failed:', err)
    return []
  }
}

const NUMERIC_ID = /^\d+$/
const SLUG_ID = /^[a-z0-9-]+-[a-z0-9-]+$/i

function classifyId(id: string): 'geonames' | 'slug' | 'other' {
  if (NUMERIC_ID.test(id)) return 'geonames'
  if (SLUG_ID.test(id)) return 'slug'
  return 'other'
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderHtml(opts: {
  index: Index
  pending: PendingEntry[]
  origin: string
  kvConfigured: boolean
}): string {
  const { index, pending, origin, kvConfigured } = opts
  const cachedIds = Object.keys(index).sort()
  const cachedRows = cachedIds
    .map(id => `      <tr><td>${escapeHtml(id)}</td><td>${escapeHtml(index[id].fetched_at)}</td><td>${classifyId(id)}</td></tr>`)
    .join('\n')

  const pendingIds = [...new Set(pending.map(p => p.id))].sort()
  const pendingRows = pendingIds.length === 0
    ? `      <tr><td colspan="2" class="muted">— no pending entries —</td></tr>`
    : pendingIds
        .map(id => `      <tr><td>${escapeHtml(id)}</td><td>${classifyId(id)}</td></tr>`)
        .join('\n')

  const cachedSlug = cachedIds.filter(id => classifyId(id) === 'slug').length
  const cachedGeo = cachedIds.filter(id => classifyId(id) === 'geonames').length
  const now = new Date().toISOString()

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Climato Admin</title>
<meta name="robots" content="noindex">
<style>
  body { font-family: ui-monospace, "JetBrains Mono", Menlo, monospace; font-size: 13px; color: #ddd; background: #111; margin: 0; padding: 24px; line-height: 1.55; }
  h1, h2 { color: #fff; font-weight: 600; margin: 0 0 8px; letter-spacing: 0.5px; }
  h1 { font-size: 14px; text-transform: uppercase; }
  h2 { font-size: 12px; text-transform: uppercase; margin-top: 32px; color: #888; }
  table { border-collapse: collapse; margin-top: 8px; min-width: 480px; }
  th, td { border-bottom: 1px solid #222; padding: 4px 16px 4px 0; text-align: left; vertical-align: top; }
  th { color: #777; font-weight: 500; text-transform: uppercase; font-size: 11px; }
  .muted { color: #666; font-style: italic; }
  .stat { color: #fff; font-size: 18px; }
  .row { display: flex; gap: 32px; flex-wrap: wrap; margin-top: 8px; }
  .col { display: flex; flex-direction: column; }
  .col-label { color: #777; font-size: 11px; text-transform: uppercase; }
  .warn { color: #f7b731; }
  a { color: #4eb1ff; }
  .meta { color: #555; font-size: 11px; margin-top: 24px; }
</style>
</head>
<body>
<h1>[Climato Admin] · ${escapeHtml(now)}</h1>

<div class="row">
  <div class="col"><span class="col-label">cached</span><span class="stat">${cachedIds.length}</span></div>
  <div class="col"><span class="col-label">geonames-style</span><span class="stat">${cachedGeo}</span></div>
  <div class="col"><span class="col-label">slug-style (dups likely)</span><span class="stat ${cachedSlug ? 'warn' : ''}">${cachedSlug}</span></div>
  <div class="col"><span class="col-label">pending (kv)</span><span class="stat">${pendingIds.length}</span></div>
  <div class="col"><span class="col-label">kv configured</span><span class="stat">${kvConfigured ? 'yes' : 'no'}</span></div>
</div>

<h2>Pending — Upstash <code>pending:*</code></h2>
<table>
  <thead><tr><th>id</th><th>type</th></tr></thead>
  <tbody>
${pendingRows}
  </tbody>
</table>

<h2>Cached — <code>data/normals/</code> (committed)</h2>
<table>
  <thead><tr><th>id</th><th>fetched_at</th><th>type</th></tr></thead>
  <tbody>
${cachedRows || '      <tr><td colspan="3" class="muted">— empty —</td></tr>'}
  </tbody>
</table>

<div class="meta">
  origin: <code>${escapeHtml(origin)}</code> ·
  <a href="javascript:location.reload()">reload</a> ·
  <a href="/normals/_index.json" target="_blank">_index.json</a>
</div>
</body>
</html>`
}

function deriveOrigin(req: VercelLikeRequest): string {
  // Vercel injects x-forwarded-host / x-forwarded-proto; fall back to VERCEL_URL.
  const proto = getHeader(req, 'x-forwarded-proto') ?? 'https'
  const host = getHeader(req, 'x-forwarded-host') ?? getHeader(req, 'host')
  if (host) return `${proto}://${host}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:5188'
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.status(503).send('ADMIN_PASSWORD env var is not set on this deployment.')
    return
  }
  if (!checkBasicAuth(req, password)) {
    res.setHeader('WWW-Authenticate', `Basic realm="${REALM}", charset="UTF-8"`)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.status(401).send('Authentication required.')
    return
  }

  const origin = deriveOrigin(req)
  const [index, pending] = await Promise.all([loadIndex(origin), loadPending()])

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.status(200).send(renderHtml({
    index,
    pending,
    origin,
    kvConfigured: !!getRedisEnv(),
  }))
}
