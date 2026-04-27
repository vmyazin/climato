import React from 'react'
import { City, MONTHS, cToF, mmToIn } from '../data/cities'
import { MonthlyChart, SmallBars } from './MonthlyChart'
import { TopoMap } from './TopoMap'
import { ChartToggle } from './Toggles'

const fg = '#111'
const bg = '#f0f1ed'
const accent = '#cc3b1f'
const muted = '#85847d'

interface Props {
  city: City
  unit: 'C' | 'F'
  setUnit: (u: 'C' | 'F') => void
  chartVariant: 'bar' | 'line' | 'ring'
  setChartVariant: (v: 'bar' | 'line' | 'ring') => void
}

export function VariationA({ city, unit, chartVariant, setChartVariant }: Props) {
  const avgHi = city.high.reduce((a, b) => a + b, 0) / 12
  const avgLo = city.low.reduce((a, b) => a + b, 0) / 12
  const annualPrecip = city.precip.reduce((a, b) => a + b, 0)
  const peakMonth = city.high.indexOf(Math.max(...city.high))

  const sh = unit === 'C' ? avgHi : cToF(avgHi)
  const sl = unit === 'C' ? avgLo : cToF(avgLo)

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
        gap: 16,
      }}>
        {/* Hero row */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 12, letterSpacing: 2, color: muted, marginBottom: 10 }}>
            {city.lat >= 0 ? '+' : ''}{city.lat.toFixed(4)}°  ·  {city.lon >= 0 ? '+' : ''}{city.lon.toFixed(4)}°  ·  ELEV {city.elev}m
          </div>
          <div style={{ fontSize: 132, fontWeight: 700, lineHeight: 0.95, letterSpacing: -4, color: fg, textTransform: 'uppercase' }}>
            {city.name}
          </div>
          <div style={{ fontSize: 28, fontWeight: 400, letterSpacing: -0.4, color: muted, marginTop: 4 }}>
            {city.country}{city.admin1 ? ` · ${city.admin1}` : ''}
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: `1px solid ${fg}`, borderBottom: `1px solid ${fg}`, marginTop: 4 }}>
          <Stat label="AVG HIGH" value={`${sh.toFixed(1)}°${unit}`} isAccent />
          <Stat label="AVG LOW"  value={`${sl.toFixed(1)}°${unit}`} />
          <Stat label="PEAK MONTH" value={`${MONTHS[peakMonth]} · ${unit === 'C' ? city.high[peakMonth] : Math.round(cToF(city.high[peakMonth]))}°${unit}`} />
          <Stat label="ANNUAL PRECIP" value={unit === 'C' ? `${annualPrecip} mm` : `${mmToIn(annualPrecip)} in`} last />
        </div>

        {/* Chart module */}
        <Module
          title="MONTHLY HIGH / LOW"
          subtitle={`12 MONTHS · °${unit}`}
          action={<ChartToggle chartVariant={chartVariant} setChartVariant={setChartVariant} fg={fg} bg="#fff" />}
        >
          <div style={{ padding: '20px 24px' }}>
            <MonthlyChart city={city} unit={unit} variant={chartVariant} width={1180} height={320} fg={fg} accent={accent} muted={muted} />
          </div>
        </Module>

        {/* Precip + Sun */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Module title="PRECIPITATION" subtitle={unit === 'C' ? 'MM / MONTH' : 'IN / MONTH'}>
            <SmallBars data={unit === 'C' ? city.precip : city.precip.map(mmToIn)} fg={fg} accent="#2b5fae" unit={unit === 'C' ? 'mm' : 'in'} height={160} />
          </Module>
          <Module title="SUNSHINE" subtitle="HOURS / DAY">
            <SmallBars data={city.sun} fg={fg} accent="#c89528" unit="h" height={160} />
          </Module>
        </div>

        {/* Map module */}
        <Module title="LOCATION / TOPOGRAPHY" subtitle={`${city.lat >= 0 ? '+' : ''}${city.lat.toFixed(4)}, ${city.lon >= 0 ? '+' : ''}${city.lon.toFixed(4)}`}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 0 }}>
            <div style={{ borderRight: `1px solid ${fg}20` }}>
              <TopoMap lat={city.lat} lon={city.lon} width={920} height={320} stroke={fg} accent={accent} bg={bg} />
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <MapKV k="LAT"           v={`${city.lat.toFixed(4)}°`} />
              <MapKV k="LON"           v={`${city.lon.toFixed(4)}°`} />
              <MapKV k="ELEV"          v={`${city.elev} m`} />
              <MapKV k="COUNTRY"       v={city.country} />
              <MapKV k="SUNRISE (JUN)" v={city.sunrise[5]} />
              <MapKV k="SUNSET (JUN)"  v={city.sunset[5]} />
              <MapKV k="SUNRISE (DEC)" v={city.sunrise[11]} />
              <MapKV k="SUNSET (DEC)"  v={city.sunset[11]} />
            </div>
          </div>
        </Module>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 10, letterSpacing: 1.5, color: muted,
          borderTop: `1px solid ${fg}`, paddingTop: 10,
        }}>
          <span>© CLIMATE ATLAS 2026</span>
          <span>NORMALS 2014–2023 · OPEN-METEO ERA5</span>
          <span>VIEW A · SWISS GRID</span>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, isAccent = false, last = false }: { label: string; value: string; isAccent?: boolean; last?: boolean }) {
  return (
    <div style={{ padding: '14px 18px', borderRight: last ? 'none' : `1px solid ${fg}20`, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: 1.5, color: muted }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5, color: isAccent ? accent : fg, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

function Module({ title, subtitle, action, children }: { title: string; subtitle: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${fg}`, background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', borderBottom: `1px solid ${fg}`,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 1.5,
      }}>
        <span style={{ color: fg }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {action}
          <span style={{ color: muted }}>{subtitle}</span>
        </div>
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

function MapKV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, borderBottom: `1px solid ${fg}14`, paddingBottom: 6 }}>
      <span style={{ color: muted, letterSpacing: 1.2 }}>{k}</span>
      <span style={{ color: fg }}>{v}</span>
    </div>
  )
}
