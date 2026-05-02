import { AppHeader } from './components/AppHeader'
import { CityHeroFallback } from './components/CityHeroFallback'
import { ClimateNarrative } from './components/ClimateNarrative'
import { Footer } from './components/Footer'
import { NearbyCitiesSection } from './components/NearbyCitiesSection'
import { NotFound } from './components/NotFound'
import { SmokedGlassOverlay } from './components/SmokedGlassOverlay'
import { VariationA } from './components/VariationA'
import { VariationB } from './components/VariationB'
import { VariationC } from './components/VariationC'
import { useWeatherStore } from './store/weatherStore'
import { useClimateNormals } from './hooks/useClimateNormals'
import { useCurrentTemp } from './hooks/useCurrentTemp'
import { useUrlSync } from './lib/route'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useDocumentMeta } from './hooks/useDocumentMeta'

const bg = '#f0f1ed'
const muted = '#85847d'

export default function App() {
  const { selectedCity, unit, setUnit, chartVariant, setChartVariant, activeView } = useWeatherStore()
  const { notFoundSlug } = useUrlSync()
  const climate = useClimateNormals(notFoundSlug ? undefined : selectedCity)
  const current = useCurrentTemp(notFoundSlug ? undefined : selectedCity)
  const { data: city, isPending, isError, isFetching: isClimateFetching, isPlaceholderData } = climate
  const { data: currentTemp } = current
  const isMd = useMediaQuery('(min-width: 768px)')

  useDocumentMeta({ selectedCity, city, isPlaceholderData, notFoundSlug })

  const sharedProps = city ? { city, unit, setUnit, chartVariant, setChartVariant, currentTemp } : null

  const handleRetry = () => {
    climate.refetch()
    current.refetch()
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: "'Inter Tight', Inter, system-ui, sans-serif" }}>
      <AppHeader />
      <main style={{ opacity: isPending && !notFoundSlug ? 0.6 : 1, transition: 'opacity 0.25s', paddingBottom: isMd ? 0 : 56 }}>
        {notFoundSlug && <NotFound citySlug={notFoundSlug} />}
        {!notFoundSlug && isError && (
          <div className="flex flex-col items-center gap-5" style={{ padding: '80px 32px', textAlign: 'center', color: muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: 1 }}>
            <div>CLIMATE DATA UNAVAILABLE — CHECK NETWORK</div>
            <button
              onClick={handleRetry}
              disabled={isClimateFetching}
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 12,
                letterSpacing: 1.5,
                color: '#111',
                background: '#fff',
                border: '1px solid #111',
                padding: '10px 20px',
                cursor: isClimateFetching ? 'progress' : 'pointer',
                opacity: isClimateFetching ? 0.5 : 1,
                minHeight: 44,
              }}
            >
              {isClimateFetching ? 'RETRYING …' : 'TRY AGAIN'}
            </button>
          </div>
        )}
        {!notFoundSlug && !isError && !sharedProps && (
          <CityHeroFallback city={selectedCity} />
        )}
        {!notFoundSlug && sharedProps && (
          <>
            {activeView === 'a' && <VariationA {...sharedProps} />}
            {activeView === 'b' && <VariationB {...sharedProps} />}
            {activeView === 'c' && <VariationC {...sharedProps} />}
            <ClimateNarrative city={sharedProps.city} unit={sharedProps.unit} />
            <NearbyCitiesSection city={sharedProps.city} />
          </>
        )}
        <Footer />
      </main>
      <SmokedGlassOverlay active={isPlaceholderData && !notFoundSlug} />
    </div>
  )
}
