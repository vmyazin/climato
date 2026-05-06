import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

// Cached across warm invocations.
let cachedFont: ArrayBuffer | null = null

async function loadFont(): Promise<ArrayBuffer | null> {
  if (cachedFont) return cachedFont
  try {
    // Ask the Google Fonts CSS API for Inter Tight 700.
    // The response contains a url() pointing at the current woff2 binary.
    // Must send a modern UA or Google returns woff instead of woff2.
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@700&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Vercel/og)' } },
    ).then(r => r.text())

    const match = css.match(/src: url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/)
    if (!match) return null

    cachedFont = await fetch(match[1]).then(r => r.arrayBuffer())
    return cachedFont
  } catch {
    return null
  }
}

function sanitise(s: string | null, max: number): string {
  if (!s) return ''
  return s.trim().replace(/[\x00-\x1f\x7f]/g, '').slice(0, max)
}

function numOrNull(s: string | null): number | null {
  if (!s) return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

function fmt(n: number, decimals = 0): string {
  return n.toFixed(decimals)
}

export default async function handler(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)

  const city    = sanitise(searchParams.get('city'), 80) || 'Unknown'
  const country = sanitise(searchParams.get('country'), 60)
  const admin1  = sanitise(searchParams.get('admin1'), 60)
  const hi      = numOrNull(searchParams.get('hi'))
  const lo      = numOrNull(searchParams.get('lo'))
  const rain    = numOrNull(searchParams.get('rain'))
  const sun     = numOrNull(searchParams.get('sun'))

  const hasStats = hi !== null && lo !== null && rain !== null && sun !== null
  const subtitle = admin1 ? `${admin1} · ${country}` : country

  const fontData = await loadFont()
  const nameFontSize = city.length > 14 ? 64 : city.length > 10 ? 76 : 90

  const img = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#111',
          padding: '56px 64px',
          fontFamily: '"Inter Tight", sans-serif',
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: 3, color: '#555' }}>
            CLIMATO
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, color: '#333' }}>
            Monthly Climate Averages
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#222', marginTop: 24, display: 'flex' }} />

        {/* City block — centred vertically */}
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>
          <div
            style={{
              fontSize: nameFontSize,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: -3,
              lineHeight: 1,
              display: 'flex',
            }}
          >
            {city}
          </div>
          {subtitle ? (
            <div
              style={{
                fontSize: 24,
                fontWeight: 400,
                color: '#666',
                marginTop: 16,
                letterSpacing: 0,
                display: 'flex',
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#222', marginBottom: 24, display: 'flex' }} />

        {/* Stats or domain */}
        {hasStats ? (
          <div
            style={{
              display: 'flex',
              gap: 48,
              fontFamily: 'monospace',
              fontSize: 13,
              letterSpacing: 2,
              color: '#555',
            }}
          >
            <span style={{ color: '#999' }}>{fmt(hi!)}° HIGH</span>
            <span>{fmt(lo!)}° LOW</span>
            <span>{fmt(rain!)} mm RAIN</span>
            <span>{fmt(sun!, 1)} h SUN</span>
          </div>
        ) : (
          <div style={{ display: 'flex', fontFamily: 'monospace', fontSize: 12, letterSpacing: 2, color: '#333' }}>
            climato.app
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      ...(fontData
        ? { fonts: [{ name: 'Inter Tight', data: fontData, weight: 700, style: 'normal' }] }
        : {}),
    },
  )

  // Wrap to set Cache-Control explicitly — avoids relying on the
  // ImageResponse options.headers field which varies across versions.
  return new Response(img.body, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, s-maxage=2592000, stale-while-revalidate=86400',
    },
  })
}
