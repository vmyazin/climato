import { ImageResponse } from '@vercel/og'
import { checkRateLimit } from './_lib/ratelimit.js'

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
const BG    = '#f0f1ed'
const CITY_A_COLOR = '#1d5a52'
const CITY_B_COLOR = '#b08229'

export default async function handler(req: Request): Promise<Response> {
  // Adapter: checkRateLimit expects a Node-style req.headers record,
  // Edge runtime gives us a Headers object. Build the minimal shape.
  const ip = req.headers.get('x-forwarded-for') ?? undefined
  const rl = await checkRateLimit({ headers: { 'x-forwarded-for': ip } }, 'og')
  if (!rl.allowed) {
    return new Response('rate limited', {
      status: 429,
      headers: { 'Retry-After': '60', 'Content-Type': 'text/plain' },
    })
  }

  const { searchParams, origin } = new URL(req.url)

  // Comparison-page OG: /api/og?compare=1&aCity=Paris&aCountry=France&bCity=London&bCountry=UK&tempDelta=2.0&warmer=a&overlap=May-August
  if (searchParams.get('compare') === '1') {
    return renderCompareOg(searchParams)
  }

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

async function renderCompareOg(searchParams: URLSearchParams): Promise<Response> {
  const aCity    = sanitise(searchParams.get('aCity'), 60) || 'City A'
  const aCountry = sanitise(searchParams.get('aCountry'), 60)
  const bCity    = sanitise(searchParams.get('bCity'), 60) || 'City B'
  const bCountry = sanitise(searchParams.get('bCountry'), 60)
  const tempDelta = numOrNull(searchParams.get('tempDelta'))
  const warmer   = sanitise(searchParams.get('warmer'), 3).toLowerCase()
  const overlap  = sanitise(searchParams.get('overlap'), 40)

  // Pick a font size so both names fit comfortably side-by-side.
  const longest = Math.max(aCity.length, bCity.length)
  const nameFontSize = longest > 16 ? 56
                     : longest > 12 ? 72
                     : longest > 9  ? 92
                     :                108

  const warmerName = warmer === 'a' ? aCity : warmer === 'b' ? bCity : null
  const tempLine = tempDelta !== null && warmerName
    ? `${warmerName.toUpperCase()} +${tempDelta.toFixed(1)}°C WARMER`
    : null

  const fontData = await loadFont()

  const img = new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          background: BG,
          fontFamily: '"Inter Tight", sans-serif',
          padding: '60px 64px',
          position: 'relative',
        }}
      >
        {/* Top mono label */}
        <div
          style={{
            display: 'flex',
            fontFamily: 'monospace',
            fontSize: 16,
            letterSpacing: 3,
            color: MUTED,
            textTransform: 'uppercase',
          }}
        >
          CLIMATO · CLIMATE COMPARISON
        </div>

        {/* City face-off — fills the middle */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 24,
            marginBottom: 24,
            gap: 24,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{
              fontSize: nameFontSize,
              fontWeight: 700,
              color: CITY_A_COLOR,
              letterSpacing: -3,
              lineHeight: 0.95,
              textTransform: 'uppercase',
              display: 'flex',
            }}>
              {aCity}
            </span>
            {aCountry ? (
              <span style={{
                fontSize: 22,
                color: MUTED,
                marginTop: 14,
                display: 'flex',
              }}>
                {aCountry}
              </span>
            ) : null}
          </div>

          <div style={{
            display: 'flex',
            fontSize: 56,
            fontWeight: 400,
            color: MUTED,
            letterSpacing: 2,
            flexShrink: 0,
          }}>
            vs
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'flex-end' }}>
            <span style={{
              fontSize: nameFontSize,
              fontWeight: 700,
              color: CITY_B_COLOR,
              letterSpacing: -3,
              lineHeight: 0.95,
              textTransform: 'uppercase',
              textAlign: 'right',
              display: 'flex',
            }}>
              {bCity}
            </span>
            {bCountry ? (
              <span style={{
                fontSize: 22,
                color: MUTED,
                marginTop: 14,
                textAlign: 'right',
                display: 'flex',
              }}>
                {bCountry}
              </span>
            ) : null}
          </div>
        </div>

        {/* Footer differential band */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: `1px solid ${FG}`,
            paddingTop: 22,
            fontFamily: 'monospace',
            fontSize: 18,
            letterSpacing: 2,
            color: FG,
            textTransform: 'uppercase',
            gap: 24,
          }}
        >
          {tempLine ? (
            <span style={{ display: 'flex', color: RED }}>{tempLine}</span>
          ) : (
            <span style={{ display: 'flex', color: MUTED }}>MONTHLY CLIMATE NORMALS</span>
          )}
          {overlap ? (
            <span style={{ display: 'flex' }}>BOTH IDEAL · {overlap.toUpperCase()}</span>
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
