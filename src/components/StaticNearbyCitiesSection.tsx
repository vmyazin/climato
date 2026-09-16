import type { GeoCity } from '../data/cities'
import type { NearbyCity } from '../hooks/useNearbyCities'
import { CityDiscovery } from './CityDiscovery'

export type StaticNearbyCity = NearbyCity

export function StaticNearbyCitiesSection({ city, neighbors }: { city: GeoCity; neighbors: StaticNearbyCity[] }) {
  return <CityDiscovery city={city} neighbors={neighbors} />
}
