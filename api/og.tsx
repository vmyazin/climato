import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

// Cache the font across warm invocations.
let interTightBold: ArrayBuffer | null = null

async function loadFont(): Promise<ArrayBuffer> {
  if (interTightBold) return interTightBold
  // Inter Tight 700 subset (latin). Falls back to regular Inter on error.
  const urls = [
    'https://fonts.gstatic.com/s/intertight/v7/NGS6v5_NC0k9P_v6ZUCbLRAHxK1EkSysd0mm_00.woff2',
    'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2',
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        interTightBold = await res.arrayBuffer()
        return interTightBold
      }
    } catch { /* try next */ }
  }
  // Should not happen — return empty buffer, Satori will use its fallback.
  return new ArrayBuffer(0)
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

  // City name font size: shrink for long names
  const nameFontSize = city.length > 14 ? 64 : city.length > 10 ? 76 : 90

  return new ImageResponse(
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              letterSpacing: 3,
              color: '#555',
              textTransform: 'uppercase',
            }}
          >
            CLIMATO
          </span>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 11,
              letterSpacing: 2,
              color: '#333',
            }}
          >
            Monthly Climate Averages
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#222', marginTop: 24 }} />

        {/* City name — main focus */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: nameFontSize,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: -3,
              lineHeight: 1,
            }}
          >
            {city}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 24,
                fontWeight: 400,
                color: '#666',
                marginTop: 16,
                letterSpacing: 0,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#222', marginBottom: 24 }} />

        {/* Stats row — only when climate data is supplied */}
        {hasStats && (
          <div
            style={{
              display: 'flex',
              gap: 48,
              fontFamily: 'monospace',
              fontSize: 13,
              letterSpacing: 2,
              color: '#555',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ color: '#999' }}>{fmt(hi!)}° HIGH</span>
            <span>{fmt(lo!)}° LOW</span>
            <span>{fmt(rain!)} mm RAIN</span>
            <span>{fmt(sun!, 1)} h SUN</span>
          </div>
        )}
        {!hasStats && (
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              letterSpacing: 2,
              color: '#333',
            }}
          >
            climato.app
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter Tight',
          data: fontData,
          weight: 700,
          style: 'normal',
        },
      ],
      headers: {
        'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=86400',
      },
    }
  )
}
