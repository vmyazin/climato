import React from 'react'
import { City, MONTHS_LONG, cToF, mmToIn } from '../data/cities'
import { MonthlyChart } from './MonthlyChart'
import { TopoMap } from './TopoMap'
import { ChartToggle } from './Toggles'

const fg = '#141311'
const bg = '#f3ede1'
const accent = '#cc3b1f'
const muted = '#877f6f'

interface Props {
  city: City
  unit: 'C' | 'F'
  setUnit: (u: 'C' | 'F') => void
  chartVariant: 'bar' | 'line' | 'ring'
  setChartVariant: (v: 'bar' | 'line' | 'ring') => void
}

function FitHeadline({ text, maxFontSize, minFontSize, lineHeight, letterSpacing, color }: {
  text: string; maxFontSize: number; minFontSize: number; lineHeight: number; letterSpacing: number; color: string
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const measureRef = React.useRef<HTMLSpanElement>(null)
  const [size, setSize] = React.useState(maxFontSize)

  React.useLayoutEffect(() => {
    const wrap = wrapRef.current
    const meas = measureRef.current
    if (!wrap || !meas) return
    const avail = wrap.clientWidth
    let s = maxFontSize
    meas.style.fontSize = s + 'px'
    while (meas.scrollWidth > avail && s > minFontSize) {
      s -= 2
      meas.style.fontSize = s + 'px'
    }
    setSize(s)
  }, [text, maxFontSize, minFontSize])

  const common: React.CSSProperties = { fontWeight: 700, lineHeight, letterSpacing, color, whiteSpace: 'nowrap' }

  return (
    <div ref={wrapRef} style={{ width: '100%', overflow: 'hidden' }}>
      <span ref={measureRef} style={{ ...common, fontSize: maxFontSize, position: 'absolute', visibility: 'hidden', pointerEvents: 'none', left: -99999, top: -99999 }}>
        {text}
      </span>
      <div style={{ ...common, fontSize: size }}>{text}</div>
    </div>
  )
}

export function VariationC({ city, unit, chartVariant, setChartVariant }: Props) {
  const avgHi = city.high.reduce((a, b) => a + b, 0) / 12
  const avgLo = city.low.reduce((a, b) => a + b, 0) / 12
  const sh = unit === 'C' ? avgHi.toFixed(1) : cToF(avgHi).toFixed(1)
  const sl = unit === 'C' ? avgLo.toFixed(1) : cToF(avgLo).toFixed(1)

  const hottest = city.high.indexOf(Math.max(...city.high))
  const coldest = city.low.indexOf(Math.min(...city.low))
  const wettest = city.precip.indexOf(Math.max(...city.precip))
  const sunniest = city.sun.indexOf(Math.max(...city.sun))

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
        gap: 18,
      }}>
        {/* Two-column main */}
        <div style={{ display: 'grid', gridTemplateColumns: '520px minmax(0, 1fr)', gap: 24 }}>
          {/* LEFT: map + coord block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ border: `1px solid ${fg}`, background: '#fff', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 14px', borderBottom: `1px solid ${fg}`,
                fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 1.5,
              }}>
                <span>FIG 01 · TOPOGRAPHIC LOCATOR</span>
                <span style={{ color: muted }}>1:50 000</span>
              </div>
              <div>
                <TopoMap lat={city.lat} lon={city.lon} width={520} height={520} stroke={fg} accent={accent} bg={bg} />
              </div>
            </div>

            <div style={{ border: `1px solid ${fg}`, background: '#fff', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <CKV k="LATITUDE"  v={`${city.lat.toFixed(4)}°`} />
              <CKV k="LONGITUDE" v={`${city.lon.toFixed(4)}°`} last />
              <CKV k="ELEVATION" v={`${city.elev} m`} />
              <CKV k="COUNTRY"   v={city.country} last />
            </div>
          </div>

          {/* RIGHT: editorial typography */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 12, letterSpacing: 2, color: muted, marginBottom: 14 }}>
                MONTHLY NORMALS
              </div>
              <FitHeadline text={city.name.toUpperCase()} maxFontSize={160} minFontSize={72} lineHeight={0.88} letterSpacing={-6} color={fg} />
              <div style={{ fontSize: 28, fontWeight: 400, color: muted, marginTop: 8, borderBottom: `1px solid ${fg}`, paddingBottom: 14 }}>
                {city.country}{city.admin1 ? ` · ${city.admin1}` : ''}
              </div>
            </div>

            {/* Pull-quote annual numbers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: `1px solid ${fg}` }}>
              <div style={{ padding: '20px 0', borderRight: `1px solid ${fg}20` }}>
                <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 1.5, color: muted, marginBottom: 6 }}>AVG HIGH / YEAR</div>
                <div style={{ fontSize: 108, fontWeight: 700, letterSpacing: -4, lineHeight: 0.9, color: accent, fontVariantNumeric: 'tabular-nums' }}>
                  {sh}<span style={{ fontSize: 56 }}>°{unit}</span>
                </div>
              </div>
              <div style={{ padding: '20px 0 20px 20px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 1.5, color: muted, marginBottom: 6 }}>AVG LOW / YEAR</div>
                <div style={{ fontSize: 108, fontWeight: 700, letterSpacing: -4, lineHeight: 0.9, color: fg, fontVariantNumeric: 'tabular-nums' }}>
                  {sl}<span style={{ fontSize: 56 }}>°{unit}</span>
                </div>
              </div>
            </div>

            {/* Notes grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0 }}>
              <Note n="01" label="HOTTEST MONTH"  body={`${MONTHS_LONG[hottest].toUpperCase()} — ${unit === 'C' ? city.high[hottest] : Math.round(cToF(city.high[hottest]))}°${unit} AVERAGE HIGH.`} />
              <Note n="02" label="COLDEST MONTH"  body={`${MONTHS_LONG[coldest].toUpperCase()} — ${unit === 'C' ? city.low[coldest] : Math.round(cToF(city.low[coldest]))}°${unit} AVERAGE LOW.`} last />
              <Note n="03" label="WETTEST MONTH"  body={`${MONTHS_LONG[wettest].toUpperCase()} — ${unit === 'C' ? city.precip[wettest] + ' mm' : mmToIn(city.precip[wettest]) + ' in'} PRECIP.`} />
              <Note n="04" label="SUNNIEST MONTH" body={`${MONTHS_LONG[sunniest].toUpperCase()} — ${city.sun[sunniest].toFixed(1)} HRS / DAY.`} last />
            </div>
          </div>
        </div>

        {/* Bottom chart ribbon */}
        <div style={{ border: `1px solid ${fg}`, background: '#fff' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', borderBottom: `1px solid ${fg}`,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 1.5,
          }}>
            <span>FIG 02 · MONTHLY TEMPERATURE PROFILE</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ChartToggle chartVariant={chartVariant} setChartVariant={setChartVariant} fg={fg} bg="#fff" />
              <span style={{ color: muted }}>°{unit} · HIGH / LOW · 12 MONTHS</span>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <MonthlyChart city={city} unit={unit} variant={chartVariant} width={1220} height={220} fg={fg} accent={accent} muted={muted} />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 10, letterSpacing: 1.5, color: muted,
          borderTop: `1px solid ${fg}`, paddingTop: 10,
        }}>
          <span>VIEW C · EDITORIAL</span>
          <span>NORMALS 2014–2023 · OPEN-METEO ERA5</span>
          <span>© CLIMATE ATLAS 2026</span>
        </div>
      </div>
    </div>
  )
}

function CKV({ k, v, last = false }: { k: string; v: string; last?: boolean }) {
  return (
    <div style={{
      padding: '14px 16px',
      borderRight: last ? 'none' : `1px solid ${fg}20`,
      borderBottom: `1px solid ${fg}20`,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: 1.5, color: muted }}>{k}</span>
      <span style={{ fontSize: 18, fontWeight: 500, color: fg }}>{v}</span>
    </div>
  )
}

function Note({ n, label, body, last = false }: { n: string; label: string; body: string; last?: boolean }) {
  return (
    <div style={{
      padding: '16px 0',
      paddingRight: last ? 0 : 20,
      paddingLeft: (n === '02' || n === '04') ? 20 : 0,
      borderRight: last ? 'none' : `1px solid ${fg}20`,
      borderBottom: (n === '01' || n === '02') ? `1px solid ${fg}20` : 'none',
      display: 'flex', gap: 12,
    }}>
      <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, color: accent, letterSpacing: 1.5 }}>{n}</span>
      <div>
        <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: 1.5, color: muted, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 14, lineHeight: 1.4, color: fg }}>{body}</div>
      </div>
    </div>
  )
}
