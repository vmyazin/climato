import type { GeoCity } from '../data/cities'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useNearbyCities, type NearbyCity } from '../hooks/useNearbyCities'
import { toSlug } from '../lib/route'

const fg = '#111'
const muted = '#85847d'
const accent = '#cc3b1f'
const cardBg = '#fff'

interface Props {
  city: GeoCity
}

// Internal-linking section: shows the 5 nearest catalogued cities as
// real <a> links so Googlebot has a graph to crawl after it's done with
// the climate narrative above. Mirrors the bordered Module chassis used
// by the rest of the page so it reads as a continuation, not an
// afterthought.
export function NearbyCitiesSection({ city }: Props) {
  const isMd = useMediaQuery('(min-width: 768px)')
  const { data: neighbors, isPending, isError } = useNearbyCities(city, 5)

  // Stay quiet on failure, loading, and empty results — isolated cities
  // (Reykjavík etc.) get no neighbours within the maxKm window, and a
  // bordered "no results" panel would just look broken.
  if (isError) return null
  if (!isPending && (!neighbors || neighbors.length === 0)) return null

  return (
    <div style={{
      width: '100%',
      background: '#f0f1ed',
      color: fg,
      fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
      boxSizing: 'border-box',
    }}>
      <div className="flex flex-col gap-4" style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: `0 ${isMd ? 32 : 16}px ${isMd ? 32 : 16}px`,
      }}>
        <Module
          index={5}
          title="Nearby Cities"
          meta={neighbors && neighbors.length > 0 ? `${neighbors.length} within ${Math.round(neighbors[neighbors.length - 1].distance_km)} km` : ''}
          isMd={isMd}
        >
          {isPending && <PendingRow isMd={isMd} />}
          {neighbors && neighbors.length > 0 && (
            <ul style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
            }}>
              {neighbors.map((neighbor, i) => (
                <NeighborRow
                  key={neighbor.id}
                  neighbor={neighbor}
                  isLast={i === neighbors.length - 1}
                  isMd={isMd}
                />
              ))}
            </ul>
          )}
        </Module>
      </div>
    </div>
  )
}

function NeighborRow({ neighbor, isLast, isMd }: { neighbor: NearbyCity; isLast: boolean; isMd: boolean }) {
  // Build the canonical URL via the same toSlug used by the router so
  // these links match the sitemap and the runtime canonical tag.
  const { path } = toSlug({
    id: neighbor.id,
    name: neighbor.name,
    country: neighbor.country,
    ...(neighbor.admin1 ? { admin1: neighbor.admin1 } : {}),
    lat: neighbor.lat,
    lon: neighbor.lon,
    elev: 0,
  })

  const distance = neighbor.distance_km < 100
    ? `${Math.round(neighbor.distance_km)} km`
    : `${Math.round(neighbor.distance_km / 10) * 10} km`

  return (
    <li style={{ borderBottom: isLast ? 'none' : `1px solid ${fg}14` }}>
      <a
        href={path}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 16,
          padding: isMd ? '14px 28px' : '12px 18px',
          color: fg,
          textDecoration: 'none',
          transition: 'background 120ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#0000000a')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
          minWidth: 0,
          flex: 1,
        }}>
          <span style={{
            color: accent,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 14,
            flex: 'none',
          }}>
            →
          </span>
          <span style={{
            fontSize: isMd ? 18 : 16,
            fontWeight: 500,
            letterSpacing: -0.2,
            color: fg,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {neighbor.name}
          </span>
          <span style={{
            fontSize: isMd ? 14 : 12,
            color: muted,
            fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
          }}>
            {neighbor.country}
          </span>
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: isMd ? 13 : 11,
          color: muted,
          letterSpacing: 1,
          textTransform: 'uppercase',
          fontVariantNumeric: 'tabular-nums',
          flex: 'none',
        }}>
          {distance}
        </span>
      </a>
    </li>
  )
}

function PendingRow({ isMd }: { isMd: boolean }) {
  return (
    <div style={{
      padding: isMd ? '20px 28px' : '16px 18px',
      color: muted,
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    }}>
      Loading nearby cities …
    </div>
  )
}

function Module({
  index, title, meta, children, isMd,
}: {
  index: number
  title: string
  meta?: string
  children: React.ReactNode
  isMd: boolean
}) {
  return (
    <section style={{
      border: `1px solid ${fg}`,
      background: cardBg,
    }}>
      <header className="flex flex-wrap items-baseline justify-between gap-2" style={{
        padding: isMd ? '14px 20px' : '12px 16px',
        borderBottom: `1px solid ${fg}`,
      }}>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 11,
            letterSpacing: 2,
            color: muted,
            textTransform: 'uppercase',
          }}>
            № {String(index).padStart(2, '0')}
          </span>
          <h2 style={{
            margin: 0,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1.5,
            color: fg,
            textTransform: 'uppercase',
          }}>
            {title}
          </h2>
        </div>
        {meta && (
          <span style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 11,
            letterSpacing: 1.5,
            color: muted,
            textTransform: 'uppercase',
          }}>
            {meta}
          </span>
        )}
      </header>
      <div>{children}</div>
    </section>
  )
}
