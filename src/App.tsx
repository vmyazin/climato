import { AppHeader } from './components/AppHeader'
import { CityHeroFallback } from './components/CityHeroFallback'
import { ClimateNarrative } from './components/ClimateNarrative'
import { ComparisonHeroFallback } from './components/ComparisonHeroFallback'
import { ComparisonPage } from './components/ComparisonPage'
import { Footer } from './components/Footer'
import { NearbyCitiesSection } from './components/NearbyCitiesSection'
import { NotFound } from './components/NotFound'
import { SmokedGlassOverlay } from './components/SmokedGlassOverlay'
import { VariationA } from './components/VariationA'
import { VariationB } from './components/VariationB'
import { VariationC } from './components/VariationC'
import { useWeatherStore } from './store/weatherStore'
import { useComparisonStore } from './store/comparisonStore'
import { useClimateNormals } from './hooks/useClimateNormals'
import { useCurrentTemp } from './hooks/useCurrentTemp'
import { useUrlSync } from './lib/route'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useDocumentMeta } from './hooks/useDocumentMeta'
import { dataSourceLabel } from './lib/dataSources'

const bg = '#f0f1ed'
const muted = '#85847d'

export default function App() {
  const { selectedCity, unit, setUnit, chartVariant, setChartVariant, activeView } = useWeatherStore()
  const { notFoundSlug } = useUrlSync()
  const comparisonA = useComparisonStore(s => s.cityA)
  const comparisonB = useComparisonStore(s => s.cityB)
  const isComparison = !!(comparisonA && comparisonB)

  // Single-city climate (no-op when the user is on a comparison route)
  const climate = useClimateNormals(notFoundSlug || isComparison ? undefined : selectedCity)
  const current = useCurrentTemp(notFoundSlug || isComparison ? undefined : selectedCity)
  const { data: city, isPending, isError, isFetching: isClimateFetching, isPlaceholderData } = climate
  const { data: currentTemp } = current

  // Comparison-page climate (no-op when not on a comparison route)
  const climateA = useClimateNormals(isComparison ? comparisonA : undefined)
  const climateB = useClimateNormals(isComparison ? comparisonB : undefined)
  const isMd = useMediaQuery('(min-width: 768px)')

  useDocumentMeta({
    selectedCity,
    city,
    isPlaceholderData,
    notFoundSlug,
    comparison: isComparison && comparisonA && comparisonB
      ? { a: comparisonA, b: comparisonB, cityA: climateA.data, cityB: climateB.data }
      : undefined,
  })

  const sharedProps = city ? { city, unit, setUnit, chartVariant, setChartVariant, currentTemp } : null

  // Union of all data-source slugs that have answered queries on this page,
  // for footer attribution. Deduplicated and rendered as comma-joined labels.
  const sourcesLabel = dataSourceLabel([
    city?.source,
    climateA.data?.source,
    climateB.data?.source,
    currentTemp?.source,
  ])

  const handleRetry = () => {
    climate.refetch()
    current.refetch()
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: "'Inter Tight', Inter, system-ui, sans-serif" }}>
      <AppHeader />
      <main style={{ opacity: isPending && !notFoundSlug && !isComparison ? 0.6 : 1, transition: 'opacity 0.25s', paddingBottom: isMd ? 0 : 56 }}>
        {/* Comparison mode — render <ComparisonPage> once both halves have climate data */}
        {isComparison && climateA.data && climateB.data && (
          <ComparisonPage a={climateA.data} b={climateB.data} />
        )}
        {isComparison && (!climateA.data || !climateB.data) && (
          <ComparisonHeroFallback a={comparisonA} b={comparisonB} isError={climateA.isError || climateB.isError} />
        )}

        {/* Single-city mode — existing flow */}
        {!isComparison && notFoundSlug && <NotFound citySlug={notFoundSlug} />}
        {!isComparison && !notFoundSlug && !sharedProps && (
          <CityHeroFallback city={selectedCity} isError={isError} />
        )}
        {!isComparison && !notFoundSlug && (isError || (isClimateFetching && !sharedProps)) && (
          <div className="flex flex-col items-center gap-5" style={{ padding: '32px 32px 48px', textAlign: 'center', color: muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: 1 }}>
            {!isClimateFetching && <div>CLIMATE DATA UNAVAILABLE — CHECK NETWORK</div>}
            <button
              onClick={handleRetry}
              disabled={isClimateFetching}
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 12,
                letterSpacing: 1.5,
                color: isClimateFetching ? '#fff' : '#111',
                background: isClimateFetching ? '#111' : '#fff',
                border: '1px solid #111',
                padding: '10px 20px',
                cursor: isClimateFetching ? 'wait' : 'pointer',
                minHeight: 44,
                transition: 'background 150ms ease, color 150ms ease',
              }}
            >
              {isClimateFetching ? 'FETCHING …' : 'TRY AGAIN'}
            </button>
          </div>
        )}
        {!isComparison && !notFoundSlug && sharedProps && (
          <>
            {activeView === 'a' && <VariationA {...sharedProps} />}
            {activeView === 'b' && <VariationB {...sharedProps} />}
            {activeView === 'c' && <VariationC {...sharedProps} />}
            <ClimateNarrative city={sharedProps.city} unit={sharedProps.unit} />
            <NearbyCitiesSection city={sharedProps.city} />
          </>
        )}
        <Footer sourcesLabel={sourcesLabel} />
      </main>
      <SmokedGlassOverlay active={isPlaceholderData && !notFoundSlug && !isComparison} />
    </div>
  )
}
