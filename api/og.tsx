import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

let cachedFont: ArrayBuffer | null = null

async function loadFont(): Promise<ArrayBuffer | null> {
  if (cachedFont) return cachedFont
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@700&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Vercel/og)' } },
    ).then(r => r.text())
    const match = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/)
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

const MUTED = '#8a8578'
const FG    = '#111111'
const RED   = '#d64040'

export default async function handler(req: Request): Promise<Response> {
  const { searchParams, origin } = new URL(req.url)

  const city    = sanitise(searchParams.get('city'), 80) || 'Unknown'
  const country = sanitise(searchParams.get('country'), 60)
  const admin1  = sanitise(searchParams.get('admin1'), 60)
  const hi      = numOrNull(searchParams.get('hi'))
  const lo      = numOrNull(searchParams.get('lo'))
  const rain    = numOrNull(searchParams.get('rain'))
  const peak    = sanitise(searchParams.get('peak'), 3).toUpperCase()

  const hasStats = hi !== null && lo !== null && rain !== null

  const subtitle     = admin1 ? `${admin1} · ${country}` : country
  const cityUpper    = city.toUpperCase()
  const nameFontSize = cityUpper.length > 13 ? 72
                     : cityUpper.length > 9  ? 90
                     : cityUpper.length > 6  ? 108
                     :                         128

  const fontData = await loadFont()

  // Icon in the base image occupies roughly x:40-175, y:62-275.
  // City text starts just right of it.
  const TEXT_LEFT = 195
  const TEXT_TOP  = 68

  const img = new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          backgroundImage: `url(${origin}/og-image-loc-base.png)`,
          backgroundSize: '1200px 630px',
          backgroundRepeat: 'no-repeat',
          position: 'relative',
          fontFamily: '"Inter Tight", sans-serif',
        }}
      >
        {/* City name */}
        <div
          style={{
            position: 'absolute',
            top: TEXT_TOP,
            left: TEXT_LEFT,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span
            style={{
              fontSize: nameFontSize,
              fontWeight: 700,
              color: FG,
              letterSpacing: -2,
              lineHeight: 1,
            }}
          >
            {cityUpper}
          </span>

          {subtitle ? (
            <span
              style={{
                fontSize: 19,
                color: MUTED,
                marginTop: 10,
                letterSpacing: 0,
              }}
            >
              {subtitle}
            </span>
          ) : null}

          {/* Stats row — only when climate data was supplied */}
          {hasStats ? (
            <div
              style={{
                display: 'flex',
                gap: 36,
                marginTop: 22,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 1.5, color: MUTED }}>AVG HIGH</span>
                <span style={{ fontSize: 30, fontWeight: 700, color: RED, letterSpacing: -1, display: 'flex' }}>
                  {hi!.toFixed(1)}°C
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 1.5, color: MUTED }}>AVG LOW</span>
                <span style={{ fontSize: 30, fontWeight: 700, color: FG, letterSpacing: -1, display: 'flex' }}>
                  {lo!.toFixed(1)}°C
                </span>
              </div>
              {peak ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 1.5, color: MUTED }}>PEAK MONTH</span>
                  <span style={{ fontSize: 30, fontWeight: 700, color: FG, letterSpacing: -1, display: 'flex' }}>
                    {peak} · {hi!.toFixed(1)}°
                  </span>
                </div>
              ) : null}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 1.5, color: MUTED }}>ANNUAL PRECIP</span>
                <span style={{ fontSize: 30, fontWeight: 700, color: FG, letterSpacing: -1, display: 'flex' }}>
                  {Math.round(rain!)} mm
                </span>
              </div>
            </div>
          ) : null}
        </div>
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

  return new Response(img.body, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, s-maxage=2592000, stale-while-revalidate=86400',
    },
  })
}
