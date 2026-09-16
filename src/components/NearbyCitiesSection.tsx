import type { GeoCity } from '../data/cities'
import { useNearbyCities } from '../hooks/useNearbyCities'
import { CityDiscovery } from './CityDiscovery'

export function NearbyCitiesSection({ city }: { city: GeoCity }) {
  const { data, isPending, isError, refetch } = useNearbyCities(city, 5)
  return <CityDiscovery city={city} neighbors={data ?? []} status={isError ? 'error' : isPending ? 'loading' : 'ready'} onRetry={() => { void refetch() }} />
}
