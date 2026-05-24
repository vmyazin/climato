import type { City } from '../data/cities'
import { ClimateNarrative } from './ClimateNarrative'
import { StaticNearbyCitiesSection, type StaticNearbyCity } from './StaticNearbyCitiesSection'

const fg = '#111'
const muted = '#85847d'

interface Props {
  city: City
  neighbors: StaticNearbyCity[]
}

export function StaticCitySnapshot({ city, neighbors }: Props) {
  const locale = city.admin1 ? `${city.country} · ${city.admin1}` : city.country

  return (
    <main style={{
      minHeight: '100vh',
      background: '#f0f1ed',
      color: fg,
      fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
      paddingBottom: 32,
    }}>
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: 16 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 10,
          letterSpacing: 2,
          color: muted,
          marginBottom: 10,
        }}>
          {city.lat >= 0 ? '+' : ''}{city.lat.toFixed(4)}° · {city.lon >= 0 ? '+' : ''}{city.lon.toFixed(4)}° · ELEV {city.elev}m
        </div>
        <h1 style={{
          margin: 0,
          fontSize: 'clamp(48px, 15vw, 100px)',
          fontWeight: 700,
          lineHeight: 0.95,
          letterSpacing: -2,
          color: fg,
          textTransform: 'uppercase',
          wordBreak: 'break-word',
        }}>
          {city.name}
        </h1>
        <div style={{
          fontSize: 18,
          fontWeight: 400,
          letterSpacing: -0.4,
          color: muted,
          marginTop: 4,
        }}>
          {locale}
        </div>
        <p style={{
          fontSize: 16,
          lineHeight: 1.5,
          color: fg,
          marginTop: 28,
          marginBottom: 0,
          maxWidth: 680,
        }}>
          Monthly weather averages for {city.name}, {city.country} — temperature highs and lows,
          rainfall, sunshine hours by month, and the best time to visit.
        </p>
      </section>
      <ClimateNarrative city={city} unit="C" />
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <StaticNearbyCitiesSection neighbors={neighbors} />
      </div>
    </main>
  )
}
