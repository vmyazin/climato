import { next } from '@vercel/edge'

export const config = {
  matcher: ['/((?!api/|normals/|admin$|.*\\.(?:js|css|png|svg|ico|webp|woff2?|json|txt|xml)$).*)'],
}

const BOT_UA =
  /twitterbot|facebookexternalhit|telegrambot|slackbot|whatsapp|linkedinbot|discordbot|applebot|googlebot|bingbot|duckduckbot|ia_archiver|vkshare|pinterest|tumblr|w3c_validator/i

function slugToTitle(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

interface CityParsed {
  city: string
  country: string
}

function parseCity(pathname: string): CityParsed | null {
  const segs = pathname.split('/').filter(Boolean)
  if (segs.length < 2 || segs.length > 3) return null
  return {
    city: slugToTitle(segs[segs.length - 1]),
    country: slugToTitle(segs[0]),
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
  const ua = request.headers.get('user-agent') ?? ''
  if (!BOT_UA.test(ua)) return next()

  const url = new URL(request.url)
  const parsed = parseCity(url.pathname)
  if (!parsed) return next()

  const { city, country } = parsed
  const ogParams = new URLSearchParams({ city, country })
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
