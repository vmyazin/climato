import { CitySearch } from './CitySearch'
import { useWeatherStore } from '../store/weatherStore'
import { nameFromSlug } from '../lib/route'

const fg = '#111'
const muted = '#8a8578'
const bg = '#f5f2ea'

interface NotFoundProps {
  citySlug: string
}

export function NotFound({ citySlug }: NotFoundProps) {
  const { selectedCity, setCity } = useWeatherStore()

  return (
    <div style={{ padding: '120px 32px 80px', textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
      <div
        style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 11,
          letterSpacing: 2.5,
          color: muted,
          marginBottom: 20,
        }}
      >
        404 — NO MATCH
      </div>
      <div
        style={{
          fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: -0.3,
          color: fg,
          marginBottom: 48,
        }}
      >
        No city matched that URL.
      </div>
      <div style={{ textAlign: 'left' }}>
        <CitySearch
          value={selectedCity}
          onPick={setCity}
          fg={fg}
          muted={muted}
          bg={bg}
          initialQuery={nameFromSlug(citySlug)}
          autoFocusSelect
        />
      </div>
    </div>
  )
}
