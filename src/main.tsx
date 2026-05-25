import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import App from './App'
import { queryPersister, persistOptions } from './lib/queryPersister'
import { parseUrl, parsedSlugMatchesCity, reconstructFromCoords, reconstructFromSlug } from './lib/route'
import { readPrerenderSeed } from './lib/prerender-seed'
import { useWeatherStore } from './store/weatherStore'
import { climateQueryKey } from './hooks/useClimateNormals'
import { nearbyCitiesQueryKey } from './hooks/useNearbyCities'
import './index.css'

const queryClient = new QueryClient()

// Seed selectedCity from the URL synchronously so the first render shows the
// correct city in the SEO fallback hero — avoids a flash of the persisted
// default city (Reykjavík) when landing on e.g. /china/shanghai.
const parsed = parseUrl(window.location.pathname, window.location.search)
if (parsed.type === 'slug') {
  const prerenderSeed = readPrerenderSeed(document)
  const hasMatchingPrerenderSeed = !!prerenderSeed && parsedSlugMatchesCity(parsed, prerenderSeed.city)
  const seed = hasMatchingPrerenderSeed
    ? prerenderSeed.city
    : parsed.ll
      ? reconstructFromCoords(parsed, parsed.ll)
      : reconstructFromSlug(parsed)
  useWeatherStore.getState().setCity(seed)
  if (hasMatchingPrerenderSeed) {
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
