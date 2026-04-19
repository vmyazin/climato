import { AppHeader } from './components/AppHeader'
import { VariationA } from './components/VariationA'
import { VariationB } from './components/VariationB'
import { VariationC } from './components/VariationC'
import { useWeatherStore } from './store/weatherStore'
import { useClimateNormals } from './hooks/useClimateNormals'

const bg = '#f5f2ea'
const muted = '#8a8578'

export default function App() {
  const { selectedCity, unit, setUnit, chartVariant, setChartVariant, activeView } = useWeatherStore()
  const { data: city, isPending, isError } = useClimateNormals(selectedCity)

  const sharedProps = city ? { city, unit, setUnit, chartVariant, setChartVariant } : null

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: "'Inter Tight', Inter, system-ui, sans-serif" }}>
      <AppHeader />
      <main style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.25s', isolation: 'isolate' }}>
        {isError && (
          <div style={{ padding: '80px 32px', textAlign: 'center', color: muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: 1 }}>
            CLIMATE DATA UNAVAILABLE — CHECK NETWORK
          </div>
        )}
        {!isError && !sharedProps && (
          <div style={{ padding: '80px 32px', textAlign: 'center', color: muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: 1 }}>
            LOADING CLIMATE DATA …
          </div>
        )}
        {sharedProps && (
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
