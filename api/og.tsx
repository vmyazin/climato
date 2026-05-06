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

function parseNums(s: string | null): number[] | null {
  if (!s) return null
  const parts = s.split(',').map(v => parseFloat(v.trim()))
  if (parts.length !== 12 || parts.some(v => !Number.isFinite(v))) return null
  return parts
}

const MONTHS_3 = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

const BG     = '#f5f2ea'
const FG     = '#111111'
const MUTED  = '#8a8578'
const RED    = '#d64040'
const BORDER = `1px solid rgba(17,17,17,0.12)`

function BarChart({ highs, lows }: { highs: number[]; lows: number[] }) {
  const allVals = [...highs, ...lows]
  const rawMin  = Math.min(...allVals)
  const rawMax  = Math.max(...allVals)
  const yMin    = Math.floor(rawMin / 10) * 10
  const yMax    = Math.ceil(rawMax  / 10) * 10
  const range   = yMax - yMin || 1

  // Bar heights as percentages of the 180px chart area
  const pct = (v: number) => `${(((v - yMin) / range) * 100).toFixed(1)}%`

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
        border: BORDER,
        padding: '14px 14px 10px',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 1, color: '#555' }}>
          MONTHLY HIGH / LOW
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 1, color: '#aaa' }}>
          12 MONTHS · °C
        </span>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{ width: 8, height: 8, background: RED, display: 'flex' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#888' }}>HIGH</span>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{ width: 8, height: 8, background: 'white', border: '1px solid #ccc', display: 'flex' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#888' }}>LOW</span>
        </div>
      </div>

      {/* Bars */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'flex-end',
          gap: 3,
          borderBottom: '1px solid #e8e5de',
        }}
      >
        {highs.map((hi, i) => {
          const lo = lows[i]
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flex: 1,
                height: '100%',
                alignItems: 'flex-end',
                gap: 1,
              }}
            >
              <div style={{ flex: 1, height: pct(hi), background: RED, display: 'flex' }} />
              <div
                style={{
                  flex: 1,
                  height: pct(lo),
                  background: 'white',
                  border: '1px solid #d0cdc6',
                  display: 'flex',
                }}
              />
            </div>
          )
        })}
      </div>

      {/* Month labels */}
      <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
        {MONTHS_3.map((m, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              textAlign: 'center',
              fontFamily: 'monospace',
              fontSize: 8,
              color: '#aaa',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            {m}
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function handler(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)

  const city    = sanitise(searchParams.get('city'), 80) || 'Unknown'
  const country = sanitise(searchParams.get('country'), 60)
  const admin1  = sanitise(searchParams.get('admin1'), 60)
  const hi      = numOrNull(searchParams.get('hi'))
  const lo      = numOrNull(searchParams.get('lo'))
  const rain    = numOrNull(searchParams.get('rain'))
  const peak    = sanitise(searchParams.get('peak'), 3).toUpperCase()
  const highs   = parseNums(searchParams.get('highs'))
  const lows    = parseNums(searchParams.get('lows'))

  const hasStats = hi !== null && lo !== null && rain !== null
  const hasChart = highs !== null && lows !== null

  const subtitle = admin1
    ? `${admin1} · ${country}`
    : country

  const cityUpper   = city.toUpperCase()
  const cityFontSize = cityUpper.length > 14 ? 72 : cityUpper.length > 10 ? 88 : 110

  const fontData = await loadFont()

  const img = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: BG,
          fontFamily: '"Inter Tight", sans-serif',
        }}
      >
        {/* Header strip */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 44px',
            borderBottom: BORDER,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'monospace',
              fontSize: 10,
              letterSpacing: 2,
              color: MUTED,
            }}
          >
            <span>◎</span>
            <span>CLIMATO · MONTHLY CLIMATE NORMALS</span>
          </div>
          <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: MUTED }}>
            2014–2023 · OPEN-METEO ERA5
          </span>
        </div>

        {/* Main content — explicit row with fixed column widths */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flex: 1,
            padding: '36px 44px 40px',
            gap: 36,
          }}
        >
          {/* Left column: 520px */}
          <div style={{ display: 'flex', flexDirection: 'column', width: 520 }}>
            {/* City name */}
            <div
              style={{
                fontSize: cityFontSize,
                fontWeight: 700,
                color: FG,
                letterSpacing: -2,
                lineHeight: 1,
                display: 'flex',
              }}
            >
              {cityUpper}
            </div>

            {/* Subtitle */}
            <div
              style={{
                fontSize: 17,
                color: MUTED,
                marginTop: 10,
                lineHeight: 1.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
              }}
            >
              <span>Monthly weather averages</span>
              <span>
                for {city}{subtitle ? `, ${subtitle}` : ''}.
              </span>
            </div>

            {/* Stats grid */}
            {hasStats && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                  marginTop: 24,
                }}
              >
                <div style={{ display: 'flex', gap: 40 }}>
                  {/* AVG HIGH */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span
                      style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, color: MUTED }}
                    >
                      AVG HIGH
                    </span>
                    <span
                      style={{ fontSize: 34, fontWeight: 700, color: RED, letterSpacing: -1, display: 'flex' }}
                    >
                      {hi!.toFixed(1)}°C
                    </span>
                  </div>
                  {/* AVG LOW */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span
                      style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, color: MUTED }}
                    >
                      AVG LOW
                    </span>
                    <span
                      style={{ fontSize: 34, fontWeight: 700, color: FG, letterSpacing: -1, display: 'flex' }}
                    >
                      {lo!.toFixed(1)}°C
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 40 }}>
                  {/* PEAK MONTH */}
                  {peak && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span
                        style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, color: MUTED }}
                      >
                        PEAK MONTH
                      </span>
                      <span
                        style={{ fontSize: 34, fontWeight: 700, color: FG, letterSpacing: -1, display: 'flex' }}
                      >
                        {peak} · {hi!.toFixed(1)}°
                      </span>
                    </div>
                  )}
                  {/* ANNUAL PRECIP */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span
                      style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, color: MUTED }}
                    >
                      ANNUAL PRECIP
                    </span>
                    <span
                      style={{ fontSize: 34, fontWeight: 700, color: FG, letterSpacing: -1, display: 'flex' }}
                    >
                      {Math.round(rain!)} mm
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right column: 556px (1200 - 44*2 - 36 gap - 520 left) */}
          {hasChart && (
            <div style={{ display: 'flex', width: 556, alignSelf: 'stretch' }}>
              <BarChart highs={highs!} lows={lows!} />
            </div>
          )}
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
