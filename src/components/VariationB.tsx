import { useState } from 'react'
import { City, MONTHS, MONTHS_LONG, cToF, mmToIn } from '../data/cities'
import { MonthlyChart } from './MonthlyChart'
import { TopoMap } from './TopoMap'
import { ChartToggle } from './Toggles'
import { CurrentTempBadge } from './CurrentTempBadge'
import { FitHeadline } from './VariationC'
import { useMediaQuery } from '../hooks/useMediaQuery'
import type { CurrentTemp } from '../hooks/useCurrentTemp'

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
  currentTemp?: CurrentTemp
}

export function VariationB({ city, unit, chartVariant, setChartVariant, currentTemp }: Props) {
  const [m, setM] = useState(new Date().getMonth())
  const isMd = useMediaQuery('(min-width: 768px)')

  const hi = unit === 'C' ? city.high[m] : Math.round(cToF(city.high[m]))
  const lo = unit === 'C' ? city.low[m]  : Math.round(cToF(city.low[m]))
  const mean = Math.round((hi + lo) / 2)

  const pad = isMd ? 32 : 16

  return (
    <div style={{
      width: '100%',
      background: bg,
      color: fg,
      fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
      boxSizing: 'border-box',
    }}>
      <div className="flex flex-col gap-5" style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: pad,
      }}>
        {/* Month picker strip */}
        {isMd ? (
          // Desktop: all 12 months in one row
          <div className="grid grid-cols-12" style={{ border: `1px solid ${fg}` }}>
            {MONTHS.map((mo, i) => (
              <button key={mo} onClick={() => setM(i)} style={{
                padding: '10px 0',
                background: i === m ? fg : 'transparent',
                color: i === m ? bg : fg,
                border: 'none', borderRight: i < 11 ? `1px solid ${fg}` : 'none',
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 11, letterSpacing: 1.5, cursor: 'pointer',
                minHeight: 44,
              }}>{mo}</button>
            ))}
          </div>
        ) : (
          // Mobile: 2 rows of 6 (no horizontal scroll, just wrap)
          <div className="grid grid-cols-6" style={{ border: `1px solid ${fg}` }}>
            {MONTHS.map((mo, i) => (
              <button key={mo} onClick={() => setM(i)} style={{
                padding: '10px 0',
                background: i === m ? fg : 'transparent',
                color: i === m ? bg : fg,
                border: 'none',
                borderRight: (i % 6 < 5) ? `1px solid ${fg}` : 'none',
                borderBottom: i < 6 ? `1px solid ${fg}` : 'none',
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 11, letterSpacing: 1, cursor: 'pointer',
                minHeight: 44,
              }}>{mo}</button>
            ))}
          </div>
        )}

        {/* HERO */}
        <div style={{ position: 'relative', paddingTop: isMd ? 40 : 24, paddingBottom: isMd ? 32 : 16, pointerEvents: 'none' }}>
          {isMd ? (
            <>
              <div style={{ paddingRight: 240 }}>
                <FitHeadline text={city.name.toUpperCase()} maxFontSize={180} minFontSize={28} lineHeight={0.88} letterSpacing={-6} color={fg} />
              </div>
              <div style={{ position: 'absolute', top: 8, right: 8 }}>
                <CurrentTempBadge tempC={currentTemp?.tempC} unit={unit} fg={fg} muted={muted} accent={accent} variant="block" />
              </div>
            </>
          ) : (
            <div>
              <FitHeadline text={city.name.toUpperCase()} maxFontSize={80} minFontSize={28} lineHeight={0.88} letterSpacing={-3} color={fg} />
              <div style={{ marginTop: 10 }}>
                <CurrentTempBadge tempC={currentTemp?.tempC} unit={unit} fg={fg} muted={muted} accent={accent} variant="block" />
              </div>
            </div>
          )}

          <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: isMd ? 14 : 11, letterSpacing: 2, color: muted, marginTop: 14, marginBottom: isMd ? -20 : -12 }}>
            {MONTHS_LONG[m].toUpperCase()} · AVG MEAN
          </div>

          {/* On mobile: show mean + hi/lo side by side in a grid instead of overlapping */}
          {isMd ? (
            <>
              <div className="flex items-start" style={{ lineHeight: 0.82 }}>
                <span style={{ fontSize: 'min(520px, 40vw)', fontWeight: 700, letterSpacing: -24, color: fg, fontVariantNumeric: 'tabular-nums' }}>
                  {mean}
                </span>
                <span style={{ fontSize: 'min(140px, 10vw)', fontWeight: 500, letterSpacing: -4, color: accent, marginTop: 36 }}>
                  °{unit}
                </span>
              </div>
              {/* Hi / Lo overlay */}
              <div className="flex flex-col gap-3.5" style={{ position: 'absolute', right: 8, top: 60, textAlign: 'right' }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 1.5, color: muted }}>HIGH</div>
                  <div style={{ fontSize: 72, fontWeight: 600, letterSpacing: -2, color: accent, lineHeight: 1 }}>{hi}°</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 1.5, color: muted }}>LOW</div>
                  <div style={{ fontSize: 72, fontWeight: 600, letterSpacing: -2, color: fg, lineHeight: 1 }}>{lo}°</div>
                </div>
              </div>
            </>
          ) : (
            // Mobile hero: big number left, hi/lo stacked right
            <div className="flex items-end gap-4 mt-2">
              <div className="flex items-start" style={{ lineHeight: 0.82 }}>
                <span style={{ fontSize: 'clamp(80px, 25vw, 160px)', fontWeight: 700, letterSpacing: -8, color: fg, fontVariantNumeric: 'tabular-nums' }}>
                  {mean}
                </span>
                <span style={{ fontSize: 'clamp(28px, 8vw, 56px)', fontWeight: 500, letterSpacing: -2, color: accent, marginTop: 8 }}>
                  °{unit}
                </span>
              </div>
              <div className="flex flex-col gap-2.5 mb-2" style={{ textAlign: 'right' }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: 1.5, color: muted }}>HIGH</div>
                  <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: -1.5, color: accent, lineHeight: 1 }}>{hi}°</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: 1.5, color: muted }}>LOW</div>
                  <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: -1.5, color: fg, lineHeight: 1 }}>{lo}°</div>
                </div>
              </div>
            </div>
          )}

          {/* Sun info row — 2 cols on mobile */}
          <div className="grid grid-cols-2 md:grid-cols-4 mt-8" style={{ borderTop: `1px solid ${fg}`, borderLeft: `1px solid ${fg}20` }}>
            <BStat label="SUNRISE" value={city.sunrise[m]} isMd={isMd} />
            <BStat label="SUNSET" value={city.sunset[m]} isMd={isMd} />
            <BStat label="SUN HRS/DAY" value={city.sun[m].toFixed(1)} isMd={isMd} />
            <BStat label="PRECIP" value={unit === 'C' ? `${city.precip[m]} mm` : `${mmToIn(city.precip[m])} in`} last isMd={isMd} />
          </div>
        </div>

        {/* Secondary: chart + map — stack on mobile */}
        <div className="grid gap-4" style={{ gridTemplateColumns: isMd ? '1.5fr 1fr' : '1fr' }}>
          <div className="flex flex-col" style={{ border: `1px solid ${fg}`, background: '#fff' }}>
            <div className="flex flex-wrap items-center justify-between gap-2" style={{
              padding: '10px 14px', borderBottom: `1px solid ${fg}`,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 1.5,
            }}>
              <span>12-MONTH PROFILE / °{unit}</span>
              <ChartToggle chartVariant={chartVariant} setChartVariant={setChartVariant} fg={fg} bg="#fff" />
            </div>
            <div className="flex-1" style={{ padding: 12 }}>
              <MonthlyChart city={city} unit={unit} variant={chartVariant} height={isMd ? 300 : 200} fg={fg} accent={accent} muted={muted} />
            </div>
          </div>

          <div className="flex flex-col" style={{ border: `1px solid ${fg}`, background: '#fff' }}>
            <div className="flex justify-between" style={{
              padding: '10px 14px', borderBottom: `1px solid ${fg}`,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 1.5,
            }}>
              <span>LOCATION</span>
              <span style={{ color: muted }}>{city.lat.toFixed(2)}, {city.lon.toFixed(2)}</span>
            </div>
            <div className="flex-1">
              <TopoMap lat={city.lat} lon={city.lon} width={420} height={isMd ? 300 : 200} stroke={fg} accent={accent} bg={bg} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function BStat({ label, value, last = false, isMd = true }: { label: string; value: string; last?: boolean; isMd?: boolean }) {
  return (
    <div className="flex flex-col gap-1" style={{ padding: isMd ? '12px 16px' : '10px 12px', borderRight: last ? 'none' : `1px solid ${fg}20`, borderBottom: `1px solid ${fg}` }}>
      <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: 1.5, color: muted }}>{label}</span>
      <span style={{ fontSize: isMd ? 24 : 18, fontWeight: 500, color: fg, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 }}>{value}</span>
    </div>
  )
}
