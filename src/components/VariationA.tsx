import React from 'react'
import { City, MONTHS, cToF, mmToIn } from '../data/cities'
import { MonthlyChart, SmallBars } from './MonthlyChart'
import { TopoMap } from './TopoMap'
import { ChartToggle } from './Toggles'
import { CurrentTempBadge } from './CurrentTempBadge'
import { useMediaQuery } from '../hooks/useMediaQuery'
import type { CurrentTemp } from '../hooks/useCurrentTemp'

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
  currentTemp?: CurrentTemp
}

export function VariationA({ city, unit, chartVariant, setChartVariant, currentTemp }: Props) {
  const isMd = useMediaQuery('(min-width: 768px)')
  const avgHi = city.high.reduce((a, b) => a + b, 0) / 12
  const avgLo = city.low.reduce((a, b) => a + b, 0) / 12
  const annualPrecip = city.precip.reduce((a, b) => a + b, 0)
  const peakMonth = city.high.indexOf(Math.max(...city.high))

  const sh = unit === 'C' ? avgHi : cToF(avgHi)
  const sl = unit === 'C' ? avgLo : cToF(avgLo)

  const pad = isMd ? 32 : 16

  return (
    <div style={{
      width: '100%',
      background: bg,
      color: fg,
      fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
      boxSizing: 'border-box',
    }}>
      <div className="flex flex-col gap-4" style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: pad,
      }}>
        {/* Hero row */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: isMd ? 12 : 10, letterSpacing: 2, color: muted, marginBottom: 10 }}>
            {city.lat >= 0 ? '+' : ''}{city.lat.toFixed(4)}°  ·  {city.lon >= 0 ? '+' : ''}{city.lon.toFixed(4)}°  ·  ELEV {city.elev}m
            <CurrentTempBadge tempC={currentTemp?.tempC} unit={unit} fg={fg} muted={muted} accent={accent} variant="inline" />
          </div>
          <div style={{ fontSize: isMd ? 132 : 'clamp(48px, 15vw, 100px)', fontWeight: 700, lineHeight: 0.95, letterSpacing: isMd ? -4 : -2, color: fg, textTransform: 'uppercase', wordBreak: 'break-word' }}>
            {city.name}
          </div>
          <div style={{ fontSize: isMd ? 28 : 18, fontWeight: 400, letterSpacing: -0.4, color: muted, marginTop: 4 }}>
            {city.country}{city.admin1 ? ` · ${city.admin1}` : ''}
          </div>
        </div>

        {/* Stats strip — 2-col on mobile, 4-col on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4" style={{
          borderTop: `1px solid ${fg}`,
          borderLeft: `1px solid ${fg}`,
        }}>
          <Stat label="AVG HIGH" value={`${sh.toFixed(1)}°${unit}`} isAccent isMd={isMd} />
          <Stat label="AVG LOW"  value={`${sl.toFixed(1)}°${unit}`} isMd={isMd} />
          <Stat label="PEAK MONTH" value={`${MONTHS[peakMonth]} · ${unit === 'C' ? city.high[peakMonth] : Math.round(cToF(city.high[peakMonth]))}°${unit}`} isMd={isMd} />
          <Stat label="ANNUAL PRECIP" value={unit === 'C' ? `${annualPrecip} mm` : `${mmToIn(annualPrecip)} in`} isMd={isMd} />
        </div>

        {/* Chart module */}
        <Module
          title="MONTHLY HIGH / LOW"
          subtitle={`12 MONTHS · °${unit}`}
          action={<ChartToggle chartVariant={chartVariant} setChartVariant={setChartVariant} fg={fg} bg="#fff" />}
        >
          <div style={{ padding: isMd ? '20px 24px' : '12px 8px' }}>
            <MonthlyChart city={city} unit={unit} variant={chartVariant} height={isMd ? 320 : 220} fg={fg} accent={accent} muted={muted} />
          </div>
        </Module>

        {/* Precip + Sun — stack on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Module title="PRECIPITATION" subtitle={unit === 'C' ? 'MM / MONTH' : 'IN / MONTH'}>
            <SmallBars data={unit === 'C' ? city.precip : city.precip.map(mmToIn)} fg={fg} accent="#2b5fae" unit={unit === 'C' ? 'mm' : 'in'} height={160} />
          </Module>
          <Module title="SUNSHINE" subtitle="HOURS / DAY">
            <SmallBars data={city.sun} fg={fg} accent="#c89528" unit="h" height={160} />
          </Module>
        </div>

        {/* Map module — stack on mobile */}
        <Module title="LOCATION / TOPOGRAPHY" subtitle={`${city.lat >= 0 ? '+' : ''}${city.lat.toFixed(4)}, ${city.lon >= 0 ? '+' : ''}${city.lon.toFixed(4)}`}>
          <div className="grid" style={{ gridTemplateColumns: isMd ? '1fr 220px' : '1fr' }}>
            <div style={{ borderRight: isMd ? `1px solid ${fg}20` : 'none', borderBottom: isMd ? 'none' : `1px solid ${fg}20` }}>
              <TopoMap lat={city.lat} lon={city.lon} width={920} height={isMd ? 320 : 240} stroke={fg} accent={accent} bg={bg} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5" style={{ padding: '16px 20px' }}>
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

      </div>
    </div>
  )
}

function Stat({ label, value, isAccent = false, isMd = true }: { label: string; value: string; isAccent?: boolean; isMd?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5" style={{ padding: isMd ? '14px 18px' : '12px 14px', borderRight: `1px solid ${fg}20`, borderBottom: `1px solid ${fg}`, borderTop: 'none' }}>
      <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: 1.5, color: muted }}>{label}</span>
      <span style={{ fontSize: isMd ? 28 : 20, fontWeight: 600, letterSpacing: -0.5, color: isAccent ? accent : fg, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

function Module({ title, subtitle, action, children }: { title: string; subtitle: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col" style={{ border: `1px solid ${fg}`, background: '#fff' }}>
      <div className="flex flex-wrap items-center justify-between gap-2" style={{
        padding: '10px 14px', borderBottom: `1px solid ${fg}`,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 1.5,
      }}>
        <span style={{ color: fg }}>{title}</span>
        <div className="flex flex-wrap items-center gap-4">
          {action}
          <span style={{ color: muted }}>{subtitle}</span>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function MapKV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between" style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, borderBottom: `1px solid ${fg}14`, paddingBottom: 6 }}>
      <span style={{ color: muted, letterSpacing: 1.2 }}>{k}</span>
      <span style={{ color: fg }}>{v}</span>
    </div>
  )
}
