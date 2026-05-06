import type { GeoCity } from '../data/cities'
import { useMediaQuery } from '../hooks/useMediaQuery'

const fg = '#111'
const muted = '#85847d'

interface Props {
  city: GeoCity
  isError?: boolean
}

// First-paint placeholder shown before climate data loads.
// Renders semantic <h1> + a keyword-rich paragraph so Googlebot's render
// snapshot has the city's name and surface keywords even if the climate
// fetch hasn't resolved.
export function CityHeroFallback({ city, isError = false }: Props) {
  const isMd = useMediaQuery('(min-width: 768px)')
  const pad = isMd ? 32 : 16
  const hasCoords = city.lat !== 0 || city.lon !== 0
  const locale = city.admin1 ? `${city.country} · ${city.admin1}` : city.country

  return (
    <div style={{
      width: '100%',
      color: fg,
      fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
      boxSizing: 'border-box',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: pad }}>
        {hasCoords && (
          <div style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: isMd ? 12 : 10,
            letterSpacing: 2,
            color: muted,
            marginBottom: 10,
          }}>
            {city.lat >= 0 ? '+' : ''}{city.lat.toFixed(4)}°  ·  {city.lon >= 0 ? '+' : ''}{city.lon.toFixed(4)}°{city.elev ? `  ·  ELEV ${city.elev}m` : ''}
          </div>
        )}
        <h1 style={{
          margin: 0,
          fontSize: isMd ? 132 : 'clamp(48px, 15vw, 100px)',
          fontWeight: 700,
          lineHeight: 0.95,
          letterSpacing: isMd ? -4 : -2,
          color: fg,
          textTransform: 'uppercase',
          wordBreak: 'break-word',
        }}>
          {city.name}
        </h1>
        <div style={{
          fontSize: isMd ? 28 : 18,
          fontWeight: 400,
          letterSpacing: -0.4,
          color: muted,
          marginTop: 4,
        }}>
          {locale}
        </div>

        <p style={{
          fontSize: isMd ? 18 : 16,
          lineHeight: 1.5,
          color: fg,
          marginTop: isMd ? 40 : 28,
          marginBottom: 0,
          maxWidth: 680,
        }}>
          Monthly weather averages for {city.name}, {city.country} —
          temperature highs and lows, rainfall, sunshine hours by month,
          and the best time to visit.
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
