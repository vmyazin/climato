// Per-IP sliding-window rate limiter backed by Upstash Redis. Used by the
// public-facing endpoints that either trigger upstream fetches (/api/normals,
// /api/og), are expensive to render (/api/og), or could be brute-forced
// (/api/admin POST). Fails open when Upstash credentials aren't configured
// so local `pnpm dev` stays usable without env setup.

interface ReqLike {
  headers?: Record<string, string | string[] | undefined>
}

export type RateLimitNamespace = 'normals' | 'nearby' | 'og' | 'admin' | 'current'

// Tokens per minute per IP. Tuned for the expected legitimate traffic
// pattern (a single browser session generating a small handful of requests
// per page load) plus headroom for shared NATs.
const LIMITS: Record<RateLimitNamespace, { tokens: number; window: '1 m' }> = {
  normals: { tokens: 30, window: '1 m' },
  nearby:  { tokens: 60, window: '1 m' },
  og:      { tokens: 20, window: '1 m' },
  admin:   { tokens: 5,  window: '1 m' }, // login attempts only
  current: { tokens: 60, window: '1 m' }, // edge-cached, so per-IP misses are low
}

function getEnv(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return { url, token }
}

function getClientIp(req: ReqLike): string {
  // Vercel sets x-forwarded-for to the chain `<client>, <proxy>, ...`; the
  // first entry is the client. We trust the platform to have set this
  // correctly — bypassing it requires spoofing at Vercel's edge.
  const raw = req.headers?.['x-forwarded-for']
  const ip = Array.isArray(raw) ? raw[0] : raw
  if (typeof ip !== 'string' || ip.length === 0) return 'anon'
  return ip.split(',')[0]!.trim() || 'anon'
}

// Cache the Ratelimit instance per cold start so we don't re-import or
// re-instantiate on every request.
const limiters = new Map<RateLimitNamespace, unknown>()

async function getLimiter(namespace: RateLimitNamespace): Promise<unknown | null> {
  if (limiters.has(namespace)) return limiters.get(namespace) ?? null
  const env = getEnv()
  if (!env) return null
  try {
    const { Ratelimit } = await import('@upstash/ratelimit')
    const { Redis } = await import('@upstash/redis')
    const { tokens, window } = LIMITS[namespace]
    const limiter = new Ratelimit({
      redis: new Redis(env),
      limiter: Ratelimit.slidingWindow(tokens, window),
      analytics: false,
      prefix: `rl:${namespace}`,
    })
    limiters.set(namespace, limiter)
    return limiter
  } catch (err) {
    console.error('[ratelimit] init failed:', err)
    return null
  }
}

// Search-engine crawlers fetch far faster than a browser session and from a
// narrow IP range, so the per-IP budget below throttles them into 429s. A
// throttled crawl renders a data-less page, which Search Console files as a
// soft 404. These endpoints are read-only and CDN-cached upstream, so the
// worst a spoofed user-agent buys is data it could have fetched anyway.
const CRAWLER_UA =
  /googlebot|bingbot|duckduckbot|applebot|yandexbot|baiduspider|slurp|petalbot|google-inspectiontool/i

// Only the endpoints a crawl legitimately needs to render a city page.
const CRAWLER_EXEMPT: ReadonlySet<RateLimitNamespace> = new Set(['normals', 'nearby', 'current'])

function isExemptCrawler(req: ReqLike, namespace: RateLimitNamespace): boolean {
  if (!CRAWLER_EXEMPT.has(namespace)) return false
  const raw = req.headers?.['user-agent']
  const ua = Array.isArray(raw) ? raw[0] : raw
  return typeof ua === 'string' && CRAWLER_UA.test(ua)
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  reset: number
}

export async function checkRateLimit(
  req: ReqLike,
  namespace: RateLimitNamespace,
): Promise<RateLimitResult> {
  if (isExemptCrawler(req, namespace)) return { allowed: true, remaining: -1, reset: 0 }

  const limiter = await getLimiter(namespace)
  // Fail open when Upstash isn't configured — local dev shouldn't 429 just
  // because there's no Redis to talk to.
  if (!limiter) return { allowed: true, remaining: -1, reset: 0 }
  try {
    const ip = getClientIp(req)
    const { success, remaining, reset } = await (limiter as {
      limit(key: string): Promise<{ success: boolean; remaining: number; reset: number }>
    }).limit(ip)
    return { allowed: success, remaining, reset }
  } catch (err) {
    console.error('[ratelimit] check failed:', err)
    return { allowed: true, remaining: -1, reset: 0 }
  }
}
