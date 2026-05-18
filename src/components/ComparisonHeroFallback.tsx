import type { GeoCity } from '../data/cities'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { CITY_A_COLOR, CITY_B_COLOR } from '../lib/colors'

const fg = '#111'
const muted = '#85847d'

interface Props {
  a: GeoCity
  b: GeoCity
  isError?: boolean
}

// First-paint placeholder shown before either city's climate data loads on
// /compare/{a}/vs/{b}. Mirrors <CityHeroFallback> but renders the dual-city
// hero so Googlebot's render snapshot has both city names + comparison
// keywords even if neither fetch has resolved.
export function ComparisonHeroFallback({ a, b, isError = false }: Props) {
  const isMd = useMediaQuery('(min-width: 768px)')
  const pad = isMd ? 32 : 16

  return (
    <div style={{
      width: '100%',
      color: fg,
      fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
      boxSizing: 'border-box',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: pad }}>
        <div style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: isMd ? 11 : 10,
          letterSpacing: '1.5px',
          color: muted,
          textTransform: 'uppercase',
          marginBottom: 16,
        }}>
          COMPARE · {a.name.toUpperCase()} vs {b.name.toUpperCase()}
        </div>

        <h1 style={{
          fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
          fontWeight: 700,
          fontSize: isMd ? 'clamp(64px, 13vw, 168px)' : 'clamp(48px, 14vw, 96px)',
          lineHeight: 0.9,
          letterSpacing: '-0.045em',
          textTransform: 'uppercase',
          wordBreak: 'break-word',
          margin: 0,
        }}>
          <span style={{ color: CITY_A_COLOR }}>{a.name}</span>{' '}
          <span style={{
            color: muted,
            fontWeight: 400,
            fontSize: '0.4em',
            verticalAlign: '0.55em',
            letterSpacing: 0,
          }}>vs</span>{' '}
          <span style={{ color: CITY_B_COLOR }}>{b.name}</span>
        </h1>

        <div style={{
          fontSize: isMd ? 22 : 18,
          color: muted,
          marginTop: 16,
          maxWidth: 720,
        }}>
          When should you visit each — and when are both ideal?
        </div>

        <p style={{
          fontSize: isMd ? 18 : 16,
          lineHeight: 1.5,
          color: fg,
          marginTop: isMd ? 40 : 28,
          marginBottom: 0,
          maxWidth: 680,
        }}>
          Compare monthly weather averages for {a.name}, {a.country} and{' '}
          {b.name}, {b.country} — temperature highs and lows, rainfall, sunshine
          hours by month, and the best time to visit each.
        </p>

        {!isError && (
          <div style={{
            marginTop: 28,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 11,
            letterSpacing: 1.5,
            color: muted,
          }}>
            LOADING CLIMATE DATA …
          </div>
        )}
      </div>
    </div>
  )
}
