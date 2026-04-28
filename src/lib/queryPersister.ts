import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import type { Query } from '@tanstack/react-query'
import { useWeatherStore } from '../store/weatherStore'

const CACHE_DEPTH = 3
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export const queryPersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'climato-rq-v1',
  throttleTime: 1000,
})

export const persistOptions = {
  maxAge: SEVEN_DAYS_MS,
  buster: 'climate-v1',
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Query) => {
      if (!Array.isArray(query.queryKey) || query.queryKey[0] !== 'climate') return false
      if (query.state.status !== 'success') return false

      const { selectedCity, recentCities } = useWeatherStore.getState()
      const top = [selectedCity, ...recentCities].slice(0, CACHE_DEPTH)
      const allowedKeys = new Set(top.map(c => `${c.lat.toFixed(2)},${c.lon.toFixed(2)}`))

      const lat = query.queryKey[1]
      const lon = query.queryKey[2]
      return allowedKeys.has(`${lat},${lon}`)
    },
  },
} as const
