import { next, rewrite } from '@vercel/edge'

export const config = {
  matcher: ['/((?!api/|normals/|admin$|.*\\.(?:js|css|png|svg|ico|webp|woff2?|json|txt|xml)$).*)'],
}

// Social-share previewers only. These crawlers grab og:* / twitter:* meta
// tags and don't execute JS, so we serve a stripped HTML response with the
// per-city image + title baked in.
//
// Search-engine crawlers (Googlebot, Bingbot, DuckDuckBot, Applebot, ia_archiver,
// w3c_validator) are deliberately NOT in this list — they're capable of
// rendering the SPA and need to see the full climate narrative, monthly
// table, JSON-LD, and internal nearby-city links to rank the page properly.
const BOT_UA =
  /twitterbot|facebookexternalhit|telegrambot|slackbot|whatsapp|linkedinbot|discordbot|vkshare|pinterest|tumblr/i

function slugToTitle(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

interface CityParsed {
  city: string
  country: string
  admin1?: string
}

function parseCity(pathname: string): CityParsed | null {
  const segs = pathname.split('/').filter(Boolean)
  if (segs.length < 2 || segs.length > 3) return null
  return {
    city: slugToTitle(segs[segs.length - 1]),
    country: slugToTitle(segs[0]),
    ...(segs.length === 3 ? { admin1: slugToTitle(segs[1]) } : {}),
  }
}

interface ComparisonParsed {
  a: CityParsed
  b: CityParsed
}

// Parse /compare/{country-a}/[admin1-a/]{city-a}/vs/{country-b}/[admin1-b/]{city-b}
function parseComparison(pathname: string): ComparisonParsed | null {
  const segs = pathname.split('/').filter(Boolean)
  if (segs[0] !== 'compare') return null
  const vsIdx = segs.indexOf('vs')
  if (vsIdx !== 3 && vsIdx !== 4) return null
  const aSegs = segs.slice(1, vsIdx)
  const bSegs = segs.slice(vsIdx + 1)
  if (aSegs.length < 2 || aSegs.length > 3) return null
  if (bSegs.length < 2 || bSegs.length > 3) return null
  const half = (s: string[]): CityParsed => ({
    city: slugToTitle(s[s.length - 1]),
    country: slugToTitle(s[0]),
    ...(s.length === 3 ? { admin1: slugToTitle(s[1]) } : {}),
  })
  return { a: half(aSegs), b: half(bSegs) }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default function middleware(request: Request): Response {
  const url = new URL(request.url)

  // /ogimage preview: strip suffix, redirect directly to the image.
  // Works for any user-agent so devs can paste the URL in a browser tab.
  if (url.pathname.endsWith('/ogimage')) {
    const cityPath = url.pathname.slice(0, -'/ogimage'.length)
    const parsed = parseCity(cityPath)
    if (parsed) {
      const params = new URLSearchParams({ city: parsed.city, country: parsed.country })
      if (parsed.admin1) params.set('admin1', parsed.admin1)
      return Response.redirect(`${url.origin}/api/og?${params}`, 302)
    }
  }

  const ua = request.headers.get('user-agent') ?? ''
  if (!BOT_UA.test(ua)) return rewrite(new URL('/', url))

  // Comparison route — different OG endpoint, different title/description.
  // No climate data in middleware, so the image renders without a tempDelta
  // overlay; the dual-city face-off still tells the story.
  const cmp = parseComparison(url.pathname)
  if (cmp) {
    const ogParams = new URLSearchParams({
      compare: '1',
      aCity: cmp.a.city,
      aCountry: cmp.a.country,
      bCity: cmp.b.city,
      bCountry: cmp.b.country,
    })
    const ogImage = `${url.origin}/api/og?${ogParams}`
    const title   = `${cmp.a.city} vs ${cmp.b.city} — Climate Comparison · Climato`
    const desc    = `Compare monthly temperature, rainfall and sunshine averages for ${cmp.a.city}, ${cmp.a.country} and ${cmp.b.city}, ${cmp.b.country}.`

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Climato">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:image" content="${escapeHtml(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">
<meta name="twitter:image" content="${escapeHtml(ogImage)}">
<meta http-equiv="refresh" content="0;url=${escapeHtml(url.pathname)}">
</head>
<body></body>
</html>`

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  }

  const parsed = parseCity(url.pathname)
  if (!parsed) return next()

  const { city, country } = parsed
  const ogParams = new URLSearchParams({ city, country })
  if (parsed.admin1) ogParams.set('admin1', parsed.admin1)
  const ogImage  = `${url.origin}/api/og?${ogParams}`
  const title    = `${city} Monthly Weather Averages — Climato`
  const desc     = `Monthly temperature highs, lows, rainfall and sunshine hours for ${city}, ${country}.`

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Climato">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:image" content="${escapeHtml(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">
<meta name="twitter:image" content="${escapeHtml(ogImage)}">
<meta http-equiv="refresh" content="0;url=${escapeHtml(url.pathname)}">
</head>
<body></body>
</html>`

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
