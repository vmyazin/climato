import { useState } from 'react'
import { City, MONTHS, MONTHS_LONG, cToF, mmToIn } from '../data/cities'
import { MonthlyChart } from './MonthlyChart'
import { TopoMap } from './TopoMap'
import { ChartToggle } from './Toggles'
import { FitHeadline } from './VariationC'

const fg = '#0e0e0e'
const bg = '#e6e5df'
const accent = '#cc3b1f'
const muted = '#75736d'

interface Props {
  city: City
  unit: 'C' | 'F'
  setUnit: (u: 'C' | 'F') => void
  chartVariant: 'bar' | 'line' | 'ring'
  setChartVariant: (v: 'bar' | 'line' | 'ring') => void
}

export function VariationB({ city, unit, chartVariant, setChartVariant }: Props) {
  const [m, setM] = useState(new Date().getMonth())

  const hi = unit === 'C' ? city.high[m] : Math.round(cToF(city.high[m]))
  const lo = unit === 'C' ? city.low[m]  : Math.round(cToF(city.low[m]))
  const mean = Math.round((hi + lo) / 2)

  return (
    <div style={{
      width: '100%',
      background: bg,
      color: fg,
      fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
      boxSizing: 'border-box',
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        {/* Month picker strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', border: `1px solid ${fg}` }}>
          {MONTHS.map((mo, i) => (
            <button key={mo} onClick={() => setM(i)} style={{
              padding: '10px 0',
              background: i === m ? fg : 'transparent',
              color: i === m ? bg : fg,
              border: 'none', borderRight: i < 11 ? `1px solid ${fg}` : 'none',
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 11, letterSpacing: 1.5, cursor: 'pointer',
            }}>{mo}</button>
          ))}
        </div>

        {/* HERO */}
        <div style={{ position: 'relative', paddingTop: 40, paddingBottom: 32, pointerEvents: 'none' }}>
          <div style={{ paddingRight: 240 }}>
            <FitHeadline text={city.name.toUpperCase()} maxFontSize={180} minFontSize={28} lineHeight={0.88} letterSpacing={-6} color={fg} />
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 14, letterSpacing: 2, color: muted, marginTop: 14, marginBottom: -20 }}>
            {MONTHS_LONG[m].toUpperCase()} · AVG MEAN
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', lineHeight: 0.82 }}>
            <span style={{ fontSize: 'min(520px, 40vw)', fontWeight: 700, letterSpacing: -24, color: fg, fontVariantNumeric: 'tabular-nums' }}>
              {mean}
            </span>
            <span style={{ fontSize: 'min(140px, 10vw)', fontWeight: 500, letterSpacing: -4, color: accent, marginTop: 36 }}>
              °{unit}
            </span>
          </div>

          {/* Hi / Lo overlay */}
          <div style={{ position: 'absolute', right: 8, top: 60, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 1.5, color: muted }}>HIGH</div>
              <div style={{ fontSize: 72, fontWeight: 600, letterSpacing: -2, color: accent, lineHeight: 1 }}>{hi}°</div>
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 1.5, color: muted }}>LOW</div>
              <div style={{ fontSize: 72, fontWeight: 600, letterSpacing: -2, color: fg, lineHeight: 1 }}>{lo}°</div>
            </div>
          </div>

          {/* Sun info row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: `1px solid ${fg}`, borderBottom: `1px solid ${fg}`, marginTop: 32 }}>
            <BStat label="SUNRISE" value={city.sunrise[m]} />
            <BStat label="SUNSET" value={city.sunset[m]} />
            <BStat label="SUN HRS/DAY" value={city.sun[m].toFixed(1)} />
            <BStat label="PRECIP" value={unit === 'C' ? `${city.precip[m]} mm` : `${mmToIn(city.precip[m])} in`} last />
          </div>
        </div>

        {/* Secondary: chart + map */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
          <div style={{ border: `1px solid ${fg}`, background: '#fff', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', borderBottom: `1px solid ${fg}`,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 1.5,
            }}>
              <span>12-MONTH PROFILE / °{unit}</span>
              <ChartToggle chartVariant={chartVariant} setChartVariant={setChartVariant} fg={fg} bg="#fff" />
            </div>
            <div style={{ flex: 1, padding: 12 }}>
              <MonthlyChart city={city} unit={unit} variant={chartVariant} width={720} height={300} fg={fg} accent={accent} muted={muted} />
            </div>
          </div>

          <div style={{ border: `1px solid ${fg}`, background: '#fff', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '10px 14px', borderBottom: `1px solid ${fg}`,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 1.5,
            }}>
              <span>LOCATION</span>
              <span style={{ color: muted }}>{city.lat.toFixed(2)}, {city.lon.toFixed(2)}</span>
            </div>
            <div style={{ flex: 1 }}>
              <TopoMap lat={city.lat} lon={city.lon} width={420} height={300} stroke={fg} accent={accent} bg={bg} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 10, letterSpacing: 1.5, color: muted,
          borderTop: `1px solid ${fg}`, paddingTop: 10,
        }}>
          <span>VIEW B · HERO NUMERIC</span>
          <span>SELECTED MONTH / {MONTHS[m]}</span>
          <span>© CLIMATO 2026</span>
        </div>
      </div>
    </div>
  )
}

function BStat({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ padding: '12px 16px', borderRight: last ? 'none' : `1px solid ${fg}20`, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: 1.5, color: muted }}>{label}</span>
      <span style={{ fontSize: 24, fontWeight: 500, color: fg, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 }}>{value}</span>
    </div>
  )
}
