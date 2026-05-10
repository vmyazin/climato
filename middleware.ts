import { next } from '@vercel/edge'

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
  if (!BOT_UA.test(ua)) return next()

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
