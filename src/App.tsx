import { AppHeader } from './components/AppHeader'
import { NotFound } from './components/NotFound'
import { VariationA } from './components/VariationA'
import { VariationB } from './components/VariationB'
import { VariationC } from './components/VariationC'
import { useWeatherStore } from './store/weatherStore'
import { useClimateNormals } from './hooks/useClimateNormals'
import { useUrlSync } from './lib/route'
import { useMediaQuery } from './hooks/useMediaQuery'

const bg = '#f0f1ed'
const muted = '#85847d'

export default function App() {
  const { selectedCity, unit, setUnit, chartVariant, setChartVariant, activeView } = useWeatherStore()
  const { notFoundSlug } = useUrlSync()
  const { data: city, isPending, isError } = useClimateNormals(notFoundSlug ? undefined : selectedCity)
  const isMd = useMediaQuery('(min-width: 768px)')

  const sharedProps = city ? { city, unit, setUnit, chartVariant, setChartVariant } : null

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: "'Inter Tight', Inter, system-ui, sans-serif" }}>
      <AppHeader />
      <main style={{ opacity: isPending && !notFoundSlug ? 0.6 : 1, transition: 'opacity 0.25s', paddingBottom: isMd ? 0 : 56 }}>
        {notFoundSlug && <NotFound citySlug={notFoundSlug} />}
        {!notFoundSlug && isError && (
          <div style={{ padding: '80px 32px', textAlign: 'center', color: muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: 1 }}>
            CLIMATE DATA UNAVAILABLE — CHECK NETWORK
          </div>
        )}
        {!notFoundSlug && !isError && !sharedProps && (
          <div style={{ padding: '80px 32px', textAlign: 'center', color: muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: 1 }}>
            LOADING CLIMATE DATA …
          </div>
        )}
        {!notFoundSlug && sharedProps && (
          <>
            {activeView === 'a' && <VariationA {...sharedProps} />}
            {activeView === 'b' && <VariationB {...sharedProps} />}
            {activeView === 'c' && <VariationC {...sharedProps} />}
          </>
        )}
      </main>
    </div>
  )
}
