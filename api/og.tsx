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

  // Stacked layout — each name gets the full canvas width, so the only
  // constraint is fitting on one line at the chosen size. Bias toward
  // headline-scale typography; only shrink for very long names.
  const longest = Math.max(aCity.length, bCity.length)
  const nameFontSize = longest > 18 ? 96
                     : longest > 14 ? 120
                     : longest > 10 ? 140
                     :                160

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
        {/* Top brand row — logo mark + wordmark + section label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1080 1080"
            width={28}
            height={28}
            fill={FG}
          >
            <path d="M583.81,986.69c-36.4,49.14-52.68,44.52-88.2,1.45-40.6-41.53-309.3-352.87-309.3-570.1,0-468.4,716.56-464.62,707,16-4.3,216.33-166.57,398.25-309.5,552.66ZM545.15,972.63c124.66-134.78,308.15-330.66,309.53-549.02,1.06-166.96-147.45-313.94-314.26-314.94-202.86-1.21-318.82,134.58-314.33,328.63,2.19,94.49,116.83,318.52,236.85,455.8,10.2,11.66,72.66,92.93,82.22,79.51Z" />
            <path d="M601.87,815.39c-146.22,70.7-271.46-119.86-152.92-226.39,10.07-6.44.67-339.07,3.76-354.29,9.74-113.44,182.41-98.12,175.77,16.46,4.84,17.41-11.24,338.66,8.58,342.73,66.33,60.01,48.52,185.35-35.2,221.49ZM598.31,771.14c53.96-41.28,48.83-126.21-5.9-164.22-10.78-.4-4.74-337.08-5.05-349.4-1.79-70.52-85.95-84.99-96.31-16.5,0,0,.2,357.84.2,357.84-1.49,11.94-30.7,29.95-37.2,46.68-51.9,87.31,64.11,188.81,144.25,125.58Z" />
            <path d="M586.82,743.26c-32.5,27.71-69.53,20.46-92.74-1.45-25.66-24.22-29.2-70.99-1.57-98.98,12.09-12.25,26.01-13.12,25.96-23.24l-.1-268.18c-3.4-26.27,38.88-33.52,40.44-6.21,3.94,28.72-.65,251.17-1.33,280.78,54.16,19.8,61.6,83.59,29.35,117.29Z" />
          </svg>
          <span
            style={{
              display: 'flex',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 1.5,
              color: FG,
              textTransform: 'uppercase',
            }}
          >
            Climato
          </span>
          <span
            style={{
              display: 'flex',
              fontFamily: 'monospace',
              fontSize: 14,
              letterSpacing: 2.5,
              color: MUTED,
              textTransform: 'uppercase',
              marginLeft: 6,
            }}
          >
            · Climate Comparison
          </span>
        </div>

        {/* Stacked face-off — each name owns its own row so long names
            (e.g. "Vladivostok") never collide with the "vs" separator. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            marginTop: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontSize: nameFontSize,
              fontWeight: 700,
              color: CITY_A_COLOR,
              letterSpacing: -4,
              lineHeight: 0.92,
              textTransform: 'uppercase',
              display: 'flex',
            }}>
              {aCity}
            </span>
            {aCountry ? (
              <span style={{
                fontSize: 22,
                color: MUTED,
                marginTop: 6,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                display: 'flex',
              }}>
                {aCountry}
              </span>
            ) : null}
          </div>

          <div style={{
            display: 'flex',
            fontFamily: 'monospace',
            fontSize: 18,
            letterSpacing: 3,
            color: MUTED,
            textTransform: 'uppercase',
            margin: '14px 0',
          }}>
            vs
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontSize: nameFontSize,
              fontWeight: 700,
              color: CITY_B_COLOR,
              letterSpacing: -4,
              lineHeight: 0.92,
              textTransform: 'uppercase',
              display: 'flex',
            }}>
              {bCity}
            </span>
            {bCountry ? (
              <span style={{
                fontSize: 22,
                color: MUTED,
                marginTop: 6,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
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
