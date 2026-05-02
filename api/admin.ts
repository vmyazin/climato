import { createHmac, timingSafeEqual } from 'node:crypto'

interface VercelLikeRequest {
  url?: string
  method?: string
  headers?: Record<string, string | string[] | undefined>
  body?: unknown
  rawBody?: string
}

interface VercelLikeResponse {
  status(code: number): VercelLikeResponse
  setHeader(name: string, value: string | string[]): void
  send(body: string): void
}

const COOKIE_NAME = 'climato_admin'
const SESSION_PAYLOAD = 'climato-admin-v1'
// 30 days. Long enough to be set-and-forget, short enough that a stale device
// eventually re-prompts.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30

interface IndexEntry {
  fetched_at: string
  name?: string
  country?: string
  admin1?: string
}
type Index = Record<string, IndexEntry>

interface PendingEntry {
  id: string
  name?: string
  country?: string
}

function getHeader(req: VercelLikeRequest, name: string): string | undefined {
  const v = req.headers?.[name.toLowerCase()]
  if (Array.isArray(v)) return v[0]
  return v
}

function sessionToken(password: string): string {
  return createHmac('sha256', password).update(SESSION_PAYLOAD).digest('hex')
}

function constantTimeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    const k = part.slice(0, eq).trim()
    const v = part.slice(eq + 1).trim()
    if (k) out[k] = decodeURIComponent(v)
  }
  return out
}

function isAuthenticated(req: VercelLikeRequest, password: string): boolean {
  const cookies = parseCookies(getHeader(req, 'cookie'))
  const provided = cookies[COOKIE_NAME]
  if (!provided) return false
  return constantTimeStringEqual(provided, sessionToken(password))
}

function isProduction(req: VercelLikeRequest): boolean {
  // localhost can't accept Secure cookies set over HTTP. Production on Vercel
  // is always HTTPS.
  if (process.env.VERCEL) return true
  const host = getHeader(req, 'host') ?? ''
  return !host.includes('localhost') && !host.startsWith('127.')
}

function buildSetCookie(token: string, secure: boolean): string {
  const flags = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    `Max-Age=${COOKIE_MAX_AGE}`,
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (secure) flags.push('Secure')
  return flags.join('; ')
}

function buildClearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
}

async function readBody(req: VercelLikeRequest): Promise<Record<string, string>> {
  // Vercel's runtime parses application/x-www-form-urlencoded into req.body
  // as Record<string, string>. Dev shim hands us a raw string in rawBody.
  if (typeof req.body === 'object' && req.body !== null) {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(req.body)) {
      if (typeof v === 'string') out[k] = v
    }
    return out
  }
  if (typeof req.rawBody === 'string') {
    return Object.fromEntries(new URLSearchParams(req.rawBody))
  }
  if (typeof req.body === 'string') {
    return Object.fromEntries(new URLSearchParams(req.body))
  }
  return {}
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
    if (keys.length === 0) return []
    // Pull values in one shot so we can surface name/country alongside the id.
    const values = await redis.mget<unknown[]>(...keys)
    return keys.map((k, i) => {
      const id = k.slice('pending:'.length)
      const v = values[i]
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const obj = v as { name?: unknown; country?: unknown }
        return {
          id,
          name: typeof obj.name === 'string' ? obj.name : undefined,
          country: typeof obj.country === 'string' ? obj.country : undefined,
        }
      }
      return { id }
    })
  } catch (err) {
    console.error('[admin] KV scan failed:', err)
    return []
  }
}

const NUMERIC_ID = /^\d+$/
const SLUG_ID = /^[a-z0-9-]+-[a-z0-9-]+$/i

function classifyId(id: string): 'geonames' | 'slug' | 'curated' {
  if (NUMERIC_ID.test(id)) return 'geonames'
  if (SLUG_ID.test(id)) return 'slug'
  return 'curated'
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const STYLE = `
  body { font-family: ui-monospace, "JetBrains Mono", Menlo, monospace; font-size: 13px; color: #ddd; background: #0c0c0c; margin: 0; padding: 24px; line-height: 1.55; }
  h1, h2 { color: #fff; font-weight: 600; margin: 0 0 8px; letter-spacing: 0.5px; }
  h1 { font-size: 14px; text-transform: uppercase; }
  h2 { font-size: 12px; text-transform: uppercase; margin-top: 32px; color: #888; }
  table { border-collapse: collapse; margin-top: 8px; min-width: 480px; }
  th, td { border-bottom: 1px solid #1c1c1c; padding: 4px 16px 4px 0; text-align: left; vertical-align: top; }
  th { color: #777; font-weight: 500; text-transform: uppercase; font-size: 11px; }
  .muted { color: #666; font-style: italic; }
  .dim { color: #666; font-size: 11px; }
  .stat { color: #fff; font-size: 18px; }
  .row { display: flex; gap: 32px; flex-wrap: wrap; margin-top: 8px; }
  .col { display: flex; flex-direction: column; }
  .col-label { color: #777; font-size: 11px; text-transform: uppercase; }
  .warn { color: #f7b731; }
  a { color: #4eb1ff; }
  .meta { color: #555; font-size: 11px; margin-top: 24px; }

  /* Login screen */
  .login-shell { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; }
  .login { width: 100%; max-width: 320px; }
  .login form { display: flex; flex-direction: column; gap: 10px; }
  .login input[type="password"] {
    background: #161616;
    border: 1px solid #262626;
    color: #f1f1f1;
    padding: 11px 14px;
    font: inherit;
    font-size: 14px;
    border-radius: 4px;
    outline: none;
    transition: border-color 120ms ease;
  }
  .login input[type="password"]::placeholder { color: #555; }
  .login input[type="password"]:focus { border-color: #4eb1ff; }
  .login button {
    background: #f1f1f1;
    color: #0c0c0c;
    border: 0;
    padding: 11px 14px;
    font: inherit;
    font-weight: 600;
    font-size: 13px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    border-radius: 4px;
    cursor: pointer;
    transition: background 120ms ease;
  }
  .login button:hover { background: #fff; }
  .login .err { color: #ff6b6b; font-size: 12px; margin-top: -2px; }
`

function renderLogin(opts: { error?: string }): string {
  const { error } = opts
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Climato Admin</title>
<meta name="robots" content="noindex">
<style>${STYLE}</style>
</head>
<body>
<div class="login-shell">
  <div class="login">
    <form method="POST" action="/admin" autocomplete="off">
      <input
        id="password"
        name="password"
        type="password"
        placeholder="password"
        aria-label="password"
        autofocus
        required
        autocomplete="current-password"
      />
      ${error ? `<div class="err">${escapeHtml(error)}</div>` : ''}
      <button type="submit">enter ▸</button>
    </form>
  </div>
</div>
</body>
</html>`
}

function renderAdmin(opts: {
  index: Index
  pending: PendingEntry[]
  origin: string
  kvConfigured: boolean
}): string {
  const { index, pending, origin, kvConfigured } = opts

  // Sort cached entries alphabetically by friendly name when available, with
  // unnamed (legacy / curated) entries falling back to their id. This gives
  // the panel a more scannable order than purely lexicographic-by-id.
  const cachedIds = Object.keys(index).sort((a, b) => {
    const la = index[a].name ?? a
    const lb = index[b].name ?? b
    return la.localeCompare(lb)
  })

  const formatPlace = (e: { name?: string; country?: string; admin1?: string }): string => {
    if (!e.name) return ''
    const parts = [e.name]
    if (e.admin1 && e.admin1 !== e.name) parts.push(e.admin1)
    if (e.country) parts.push(e.country)
    return parts.join(' · ')
  }

  const cachedRows = cachedIds
    .map(id => {
      const e = index[id]
      const place = formatPlace(e) || `<span class="muted">—</span>`
      return `      <tr><td>${place}</td><td class="dim">${escapeHtml(id)}</td><td>${escapeHtml(e.fetched_at)}</td><td>${classifyId(id)}</td></tr>`
    })
    .join('\n')

  // Dedupe pending by id but keep the first metadata seen.
  const pendingById = new Map<string, PendingEntry>()
  for (const p of pending) if (!pendingById.has(p.id)) pendingById.set(p.id, p)
  const pendingSorted = Array.from(pendingById.values()).sort((a, b) => {
    const la = a.name ?? a.id
    const lb = b.name ?? b.id
    return la.localeCompare(lb)
  })
  const pendingRows = pendingSorted.length === 0
    ? `      <tr><td colspan="3" class="muted">— no pending entries —</td></tr>`
    : pendingSorted
        .map(p => {
          const place = formatPlace(p) || `<span class="muted">—</span>`
          return `      <tr><td>${place}</td><td class="dim">${escapeHtml(p.id)}</td><td>${classifyId(p.id)}</td></tr>`
        })
        .join('\n')

  const cachedSlug = cachedIds.filter(id => classifyId(id) === 'slug').length
  const cachedGeo = cachedIds.filter(id => classifyId(id) === 'geonames').length
  const cachedCurated = cachedIds.filter(id => classifyId(id) === 'curated').length
  const now = new Date().toISOString()

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Climato Admin</title>
<meta name="robots" content="noindex">
<style>${STYLE}</style>
</head>
<body>
<h1>[Climato Admin] · ${escapeHtml(now)}</h1>

<div class="row">
  <div class="col"><span class="col-label">cached</span><span class="stat">${cachedIds.length}</span></div>
  <div class="col"><span class="col-label">geonames-style</span><span class="stat">${cachedGeo}</span></div>
  <div class="col"><span class="col-label">slug-style (dups likely)</span><span class="stat ${cachedSlug ? 'warn' : ''}">${cachedSlug}</span></div>
  <div class="col"><span class="col-label">curated</span><span class="stat">${cachedCurated}</span></div>
  <div class="col"><span class="col-label">pending (kv)</span><span class="stat">${pendingSorted.length}</span></div>
  <div class="col"><span class="col-label">kv configured</span><span class="stat">${kvConfigured ? 'yes' : 'no'}</span></div>
</div>

<h2>Pending — Upstash <code>pending:*</code></h2>
<table>
  <thead><tr><th>city</th><th>id</th><th>type</th></tr></thead>
  <tbody>
${pendingRows}
  </tbody>
</table>

<h2>Cached — <code>data/normals/</code> (committed)</h2>
<table>
  <thead><tr><th>city</th><th>id</th><th>fetched_at</th><th>type</th></tr></thead>
  <tbody>
${cachedRows || '      <tr><td colspan="4" class="muted">— empty —</td></tr>'}
  </tbody>
</table>

<div class="meta">
  origin: <code>${escapeHtml(origin)}</code> ·
  <a href="javascript:location.reload()">reload</a> ·
  <a href="/normals/_index.json" target="_blank">_index.json</a> ·
  <a href="/admin?logout=1">log out</a>
</div>
</body>
</html>`
}

function deriveOrigin(req: VercelLikeRequest): string {
  const proto = getHeader(req, 'x-forwarded-proto') ?? 'https'
  const host = getHeader(req, 'x-forwarded-host') ?? getHeader(req, 'host')
  if (host) return `${proto}://${host}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:5188'
}

function htmlResponse(res: VercelLikeResponse, code: number, html: string, extraHeaders: Record<string, string | string[]> = {}) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v)
  res.status(code).send(html)
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store, max-age=0')
    res.status(503).send('ADMIN_PASSWORD env var is not set on this deployment.')
    return
  }

  const method = (req.method ?? 'GET').toUpperCase()
  const url = new URL(req.url ?? '/admin', 'http://localhost')

  // Logout: clear cookie, render login page.
  if (method === 'GET' && url.searchParams.get('logout') === '1') {
    htmlResponse(res, 200, renderLogin({}), { 'Set-Cookie': buildClearCookie() })
    return
  }

  // POST: form submission. Validate password, set cookie, redirect to GET.
  if (method === 'POST') {
    const fields = await readBody(req)
    const provided = (fields.password ?? '').trim()
    if (!provided || !constantTimeStringEqual(provided, password)) {
      htmlResponse(res, 401, renderLogin({ error: 'Invalid password.' }))
      return
    }
    res.setHeader('Set-Cookie', buildSetCookie(sessionToken(password), isProduction(req)))
    res.setHeader('Cache-Control', 'no-store, max-age=0')
    res.setHeader('Location', '/admin')
    res.status(303).send('')
    return
  }

  // GET: cookie-gated admin page, or login form.
  if (!isAuthenticated(req, password)) {
    htmlResponse(res, 200, renderLogin({}))
    return
  }

  const origin = deriveOrigin(req)
  const [index, pending] = await Promise.all([loadIndex(origin), loadPending()])

  htmlResponse(res, 200, renderAdmin({
    index,
    pending,
    origin,
    kvConfigured: !!getRedisEnv(),
  }))
}
