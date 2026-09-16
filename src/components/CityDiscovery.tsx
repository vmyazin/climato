import type { GeoCity } from '../data/cities'
import type { NearbyCity } from '../hooks/useNearbyCities'
import { directoryLinks, discoveryLinks } from '../lib/city-discovery'
import { isResolvedCity } from '../lib/slug'

interface Props {
  city: GeoCity
  neighbors: NearbyCity[]
  status?: 'ready' | 'loading' | 'error'
  onRetry?: () => void
}

export function CityDiscovery({ city, neighbors, status = 'ready', onRetry }: Props) {
  const directories = directoryLinks(city)
  return (
    <section className="city-discovery" aria-label={`Nearby cities for ${city.name}`}>
      <div className="city-discovery-inner">
        <h2>Nearby cities</h2>
        <p className="city-discovery-intro">View monthly climate averages for nearby cities or compare them with {city.name}.</p>
        <div className="city-discovery-list">
          <div className="city-discovery-label" aria-hidden="true"><span>Nearby cities · compare with {city.name}</span><span>Distance</span></div>
          {status === 'loading' && <p className="city-discovery-state" role="status">Loading nearby cities…</p>}
          {status === 'error' && <div className="city-discovery-state" role="status">Nearby cities are unavailable right now. {onRetry && <button onClick={onRetry}>Try again</button>}</div>}
          {status === 'ready' && neighbors.length === 0 && <p className="city-discovery-state">No nearby cities found within 600 km. Browse {city.country} below to explore further.</p>}
          {status === 'ready' && <ul>{neighbors.map(neighbor => {
            const links = discoveryLinks(city, { ...neighbor, elev: 0 })
            const distance = neighbor.distance_km < 100 ? Math.round(neighbor.distance_km) : Math.round(neighbor.distance_km / 10) * 10
            return <li className="city-discovery-row" key={neighbor.id}>
              <div className="city-discovery-actions">
                <a className="city-discovery-city" href={links.city}>{neighbor.name} <span aria-hidden="true">→</span></a>
                {isResolvedCity(city) && <a className="city-discovery-compare" href={links.compare} aria-label={`Compare ${city.name} with ${neighbor.name}`}><span aria-hidden="true">↔</span> Compare</a>}
              </div>
              <span className="city-discovery-distance" aria-label={`${distance} kilometres from ${city.name}`}>{distance} km</span>
            </li>
          })}</ul>}
        </div>
        <p className="city-discovery-note">Temperature, rainfall and sunshine, month by month.</p>
        <nav className="city-discovery-footer" aria-label="Browse cities by region">
          {directories.region && <a href={directories.region}>Browse {city.admin1} →</a>}
          <a href={directories.country}>All {city.country} cities →</a>
        </nav>
      </div>
    </section>
  )
}
