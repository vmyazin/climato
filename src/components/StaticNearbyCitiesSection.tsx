import { toSlug } from '../lib/slug'

const fg = '#111'
const muted = '#85847d'
const accent = '#cc3b1f'

interface Props {
  neighbors: StaticNearbyCity[]
}

export interface StaticNearbyCity {
  id: string
  name: string
  country: string
  admin1?: string
  lat: number
  lon: number
  distance_km: number
}

export function StaticNearbyCitiesSection({ neighbors }: Props) {
  if (neighbors.length === 0) return null
  const farthest = neighbors[neighbors.length - 1]

  return (
    <section style={{ border: `1px solid ${fg}`, background: '#fff', margin: '0 16px 16px' }}>
      <header style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${fg}`,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <h2 style={{
          margin: 0,
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}>
          Nearby Cities
        </h2>
        <span style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 11,
          letterSpacing: 1.5,
          color: muted,
          textTransform: 'uppercase',
        }}>
          {neighbors.length} within {Math.round(farthest.distance_km)} km
        </span>
      </header>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {neighbors.map((neighbor, i) => (
          <li key={neighbor.id} style={{ borderBottom: i === neighbors.length - 1 ? 'none' : `1px solid ${fg}14` }}>
            <a href={neighborPath(neighbor)} style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 16,
              padding: '12px 18px',
              color: fg,
              textDecoration: 'none',
            }}>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 14, minWidth: 0 }}>
                <span style={{ color: accent, fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 14 }}>→</span>
                <span style={{ fontSize: 16, fontWeight: 500 }}>{neighbor.name}</span>
                <span style={{ fontSize: 12, color: muted }}>{neighbor.country}</span>
              </span>
              <span style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 11,
                color: muted,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}>
                {formatDistance(neighbor.distance_km)}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

function neighborPath(neighbor: StaticNearbyCity): string {
  return toSlug({
    id: neighbor.id,
    name: neighbor.name,
    country: neighbor.country,
    ...(neighbor.admin1 ? { admin1: neighbor.admin1 } : {}),
    lat: neighbor.lat,
    lon: neighbor.lon,
    elev: 0,
  }).path
}

function formatDistance(distanceKm: number): string {
  return distanceKm < 100
    ? `${Math.round(distanceKm)} km`
    : `${Math.round(distanceKm / 10) * 10} km`
}
