import React from 'react'
import { City, MONTHS_LONG, cToF, mmToIn } from '../data/cities'
import { MonthlyChart } from './MonthlyChart'
import { TopoMap } from './TopoMap'
import { ChartToggle } from './Toggles'
import { CurrentTempBadge } from './CurrentTempBadge'
import { useMediaQuery } from '../hooks/useMediaQuery'
import type { CurrentTemp } from '../hooks/useCurrentTemp'

const fg = '#141311'
const bg = '#eeece4'
const accent = '#cc3b1f'
const muted = '#827e74'

interface Props {
  city: City
  unit: 'C' | 'F'
  setUnit: (u: 'C' | 'F') => void
  chartVariant: 'bar' | 'line' | 'ring'
  setChartVariant: (v: 'bar' | 'line' | 'ring') => void
  currentTemp?: CurrentTemp
}

export function FitHeadline({ text, maxFontSize, minFontSize, lineHeight, letterSpacing, color }: {
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

export function VariationC({ city, unit, chartVariant, setChartVariant, currentTemp }: Props) {
  const isMd = useMediaQuery('(min-width: 768px)')
  const avgHi = city.high.reduce((a, b) => a + b, 0) / 12
  const avgLo = city.low.reduce((a, b) => a + b, 0) / 12
  const sh = unit === 'C' ? avgHi.toFixed(1) : cToF(avgHi).toFixed(1)
  const sl = unit === 'C' ? avgLo.toFixed(1) : cToF(avgLo).toFixed(1)

  const hottest = city.high.indexOf(Math.max(...city.high))
  const coldest = city.low.indexOf(Math.min(...city.low))
  const wettest = city.precip.indexOf(Math.max(...city.precip))
  const sunniest = city.sun.indexOf(Math.max(...city.sun))

  const pad = isMd ? 32 : 16

  return (
    <div style={{
      width: '100%',
      background: bg,
      color: fg,
      fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
      boxSizing: 'border-box',
    }}>
      <div className="flex flex-col" style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: pad,
        gap: 18,
      }}>
        {/* Two-column main — stacks on mobile */}
        <div className="grid gap-6" style={{ gridTemplateColumns: isMd ? '520px minmax(0, 1fr)' : '1fr' }}>
          {/* LEFT: map + coord block */}
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col" style={{ border: `1px solid ${fg}`, background: '#fff' }}>
              <div className="flex flex-wrap items-center justify-between gap-2" style={{
                padding: '10px 14px', borderBottom: `1px solid ${fg}`,
                fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 1.5,
              }}>
                <span>FIG 01 · TOPOGRAPHIC LOCATOR</span>
                <span style={{ color: muted }}>1:50 000</span>
              </div>
              <div>
                <TopoMap lat={city.lat} lon={city.lon} width={520} height={isMd ? 520 : 280} stroke={fg} accent={accent} bg={bg} />
              </div>
            </div>

            <div className="grid grid-cols-2" style={{ border: `1px solid ${fg}`, background: '#fff' }}>
              <CKV k="LATITUDE"  v={`${city.lat.toFixed(4)}°`} />
              <CKV k="LONGITUDE" v={`${city.lon.toFixed(4)}°`} last />
              <CKV k="ELEVATION" v={`${city.elev} m`} />
              <CKV k="COUNTRY"   v={city.country} last />
            </div>
          </div>

          {/* RIGHT: editorial typography */}
          <div className="flex flex-col gap-5 justify-start md:gap-0 md:justify-between">
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: isMd ? 12 : 10, letterSpacing: 2, color: muted, marginBottom: isMd ? 14 : 10 }}>
                MONTHLY NORMALS
              </div>
              {isMd ? (
                <FitHeadline text={city.name.toUpperCase()} maxFontSize={160} minFontSize={72} lineHeight={0.88} letterSpacing={-6} color={fg} />
              ) : (
                <div style={{
                  fontWeight: 700,
                  fontSize: 'clamp(44px, 14vw, 96px)',
                  lineHeight: 0.92,
                  letterSpacing: -2,
                  color: fg,
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  hyphens: 'auto',
                }}>
                  {city.name.toUpperCase()}
                </div>
              )}
              <div style={{ fontSize: isMd ? 28 : 18, fontWeight: 400, color: muted, marginTop: 8 }}>
                {city.country}{city.admin1 ? ` · ${city.admin1}` : ''}
              </div>
              <div style={{ borderBottom: `1px solid ${fg}`, paddingBottom: 14 }}>
                <CurrentTempBadge tempC={currentTemp?.tempC} unit={unit} fg={fg} muted={muted} accent={accent} variant="editorial" />
              </div>
            </div>

            {/* Pull-quote annual numbers */}
            <div className="grid grid-cols-2" style={{ borderBottom: `1px solid ${fg}` }}>
              <div style={{ padding: isMd ? '20px 0' : '14px 0', borderRight: `1px solid ${fg}20` }}>
                <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: isMd ? 11 : 10, letterSpacing: 1.5, color: muted, marginBottom: 6 }}>AVG HIGH / YEAR</div>
                <div style={{ fontSize: isMd ? 108 : 'clamp(44px, 13vw, 72px)', fontWeight: 700, letterSpacing: isMd ? -4 : -1.5, lineHeight: 0.9, color: accent, fontVariantNumeric: 'tabular-nums' }}>
                  {sh}<span style={{ fontSize: isMd ? 56 : 'clamp(20px, 6vw, 36px)' }}>°{unit}</span>
                </div>
              </div>
              <div style={{ padding: isMd ? '20px 0 20px 20px' : '14px 0 14px 14px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: isMd ? 11 : 10, letterSpacing: 1.5, color: muted, marginBottom: 6 }}>AVG LOW / YEAR</div>
                <div style={{ fontSize: isMd ? 108 : 'clamp(44px, 13vw, 72px)', fontWeight: 700, letterSpacing: isMd ? -4 : -1.5, lineHeight: 0.9, color: fg, fontVariantNumeric: 'tabular-nums' }}>
                  {sl}<span style={{ fontSize: isMd ? 56 : 'clamp(20px, 6vw, 36px)' }}>°{unit}</span>
                </div>
              </div>
            </div>

            {/* Notes grid */}
            <div className="grid grid-cols-1 md:grid-cols-2">
              <Note n="01" label="HOTTEST MONTH"  body={`${MONTHS_LONG[hottest].toUpperCase()} — ${unit === 'C' ? city.high[hottest] : Math.round(cToF(city.high[hottest]))}°${unit} AVERAGE HIGH.`} isMd={isMd} />
              <Note n="02" label="COLDEST MONTH"  body={`${MONTHS_LONG[coldest].toUpperCase()} — ${unit === 'C' ? city.low[coldest] : Math.round(cToF(city.low[coldest]))}°${unit} AVERAGE LOW.`} last isMd={isMd} />
              <Note n="03" label="WETTEST MONTH"  body={`${MONTHS_LONG[wettest].toUpperCase()} — ${unit === 'C' ? city.precip[wettest] + ' mm' : mmToIn(city.precip[wettest]) + ' in'} PRECIP.`} isMd={isMd} />
              <Note n="04" label="SUNNIEST MONTH" body={`${MONTHS_LONG[sunniest].toUpperCase()} — ${city.sun[sunniest].toFixed(1)} HRS / DAY.`} last isMd={isMd} />
            </div>
          </div>
        </div>

        {/* Bottom chart ribbon */}
        <div style={{ border: `1px solid ${fg}`, background: '#fff' }}>
          <div className="flex flex-wrap items-center justify-between gap-2" style={{
            padding: '10px 14px', borderBottom: `1px solid ${fg}`,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 1.5,
          }}>
            <span>FIG 02 · MONTHLY TEMPERATURE PROFILE</span>
            <div className="flex flex-wrap items-center gap-4">
              <ChartToggle chartVariant={chartVariant} setChartVariant={setChartVariant} fg={fg} bg="#fff" />
              <span style={{ color: muted }}>°{unit} · HIGH / LOW · 12 MONTHS</span>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <MonthlyChart city={city} unit={unit} variant={chartVariant} height={isMd ? 220 : 180} fg={fg} accent={accent} muted={muted} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap justify-between gap-1" style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 10, letterSpacing: 1.5, color: muted,
          borderTop: `1px solid ${fg}`, paddingTop: 10,
        }}>
          <span>VIEW C · EDITORIAL</span>
          <span>© CLIMATO 2026</span>
        </div>
      </div>
    </div>
  )
}

function CKV({ k, v, last = false }: { k: string; v: string; last?: boolean }) {
  return (
    <div className="flex flex-col gap-1" style={{
      padding: '14px 16px',
      borderRight: last ? 'none' : `1px solid ${fg}20`,
      borderBottom: `1px solid ${fg}20`,
    }}>
      <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: 1.5, color: muted }}>{k}</span>
      <span style={{ fontSize: 18, fontWeight: 500, color: fg }}>{v}</span>
    </div>
  )
}

function Note({ n, label, body, last = false, isMd = true }: { n: string; label: string; body: string; last?: boolean; isMd?: boolean }) {
  const isLastRow = n === '03' || n === '04'
  return (
    <div className="flex gap-3" style={{
      padding: '16px 0',
      paddingRight: isMd ? (last ? 0 : 20) : 0,
      paddingLeft: isMd && (n === '02' || n === '04') ? 20 : 0,
      borderRight: isMd ? (last ? 'none' : `1px solid ${fg}20`) : 'none',
      borderBottom: isMd
        ? ((n === '01' || n === '02') ? `1px solid ${fg}20` : 'none')
        : (isLastRow ? 'none' : `1px solid ${fg}20`),
    }}>
      <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, color: accent, letterSpacing: 1.5 }}>{n}</span>
      <div>
        <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: 1.5, color: muted, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 14, lineHeight: 1.4, color: fg }}>{body}</div>
      </div>
    </div>
  )
}
