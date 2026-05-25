import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import App from './App'
import { queryPersister, persistOptions } from './lib/queryPersister'
import { parseUrl, parsedSlugMatchesCity, reconstructFromCoords, reconstructFromSlug } from './lib/route'
import { readPrerenderSeed } from './lib/prerender-seed'
import { useWeatherStore } from './store/weatherStore'
import { useComparisonStore } from './store/comparisonStore'
import { climateQueryKey } from './hooks/useClimateNormals'
import { nearbyCitiesQueryKey } from './hooks/useNearbyCities'
import './index.css'

const queryClient = new QueryClient()

// Seed store + React Query caches from the prerendered payload so first render
// shows real content without a flash of the loading shell or a geocoding round-trip.
const parsed = parseUrl(window.location.pathname, window.location.search)
const prerenderSeed = readPrerenderSeed(document)

if (parsed.type === 'compare' && prerenderSeed?.kind === 'comparison') {
  const { a, b } = prerenderSeed
  if (parsedSlugMatchesCity(parsed.a, a) && parsedSlugMatchesCity(parsed.b, b)) {
    useComparisonStore.getState().setPair(a, b)
    queryClient.setQueryData(climateQueryKey(a), a)
    queryClient.setQueryData(climateQueryKey(b), b)
  }
} else if (parsed.type === 'slug') {
  const hasMatchingPrerenderSeed = prerenderSeed?.kind === 'city' && parsedSlugMatchesCity(parsed, prerenderSeed.city)
  const seed = hasMatchingPrerenderSeed
    ? prerenderSeed!.city
    : parsed.ll
      ? reconstructFromCoords(parsed, parsed.ll)
      : reconstructFromSlug(parsed)
  useWeatherStore.getState().setCity(seed)
  if (hasMatchingPrerenderSeed && prerenderSeed?.kind === 'city') {
    queryClient.setQueryData(climateQueryKey(prerenderSeed.city), prerenderSeed.climate)
    queryClient.setQueryData(nearbyCitiesQueryKey(prerenderSeed.city, 5), prerenderSeed.neighbors ?? [])
  }
}

persistQueryClient({
  queryClient,
  persister: queryPersister,
  ...persistOptions,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
