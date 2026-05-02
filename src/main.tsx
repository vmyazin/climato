import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import App from './App'
import { queryPersister, persistOptions } from './lib/queryPersister'
import { parseUrl, reconstructFromCoords, reconstructFromSlug } from './lib/route'
import { useWeatherStore } from './store/weatherStore'
import './index.css'

// Seed selectedCity from the URL synchronously so the first render shows the
// correct city in the SEO fallback hero — avoids a flash of the persisted
// default city (Reykjavík) when landing on e.g. /china/shanghai.
const parsed = parseUrl(window.location.pathname, window.location.search)
if (parsed.type === 'slug') {
  const seed = parsed.ll
    ? reconstructFromCoords(parsed, parsed.ll)
    : reconstructFromSlug(parsed)
  useWeatherStore.getState().setCity(seed)
}

const queryClient = new QueryClient()

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
