import React, { useState } from 'react'
import type { City } from '../data/cities'
import { MONTHS_LONG, MONTHS, cToF, mmToIn } from '../data/cities'
import { BestMonthsCalendar } from './BestMonthsCalendar'
import { CityLink } from './CityLink'
import { VersusDiptych } from './VersusDiptych'
import { compareCities, type Unit } from '../lib/comparison'
import { classifyClimate, climateLabel, peakAndTrough } from '../lib/climate-summary'
import { CITY_A_COLOR, CITY_B_COLOR, OVERLAP_COLOR } from '../lib/colors'
import { useWeatherStore } from '../store/weatherStore'
import { useMediaQuery } from '../hooks/useMediaQuery'

const fg = '#111'
const bg = '#f0f1ed'
const muted = '#85847d'
const borderHard = '#111'
const borderSoft = 'rgba(17, 17, 17, 0.12)'

interface Props {
  a: City
  b: City
}

export function ComparisonPage({ a, b }: Props) {
  const unit: Unit = useWeatherStore(s => s.unit)
  const result = compareCities(a, b, unit)
  const isMd = useMediaQuery('(min-width: 768px)')

  return (
    <div style={{
      width: '100%',
      background: bg,
      color: fg,
      fontFamily: "'Inter', system-ui, sans-serif",
      boxSizing: 'border-box',
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: isMd ? 32 : 16,
      }}>
        <Breadcrumb a={a} b={b} />
        <Hero a={a} b={b} isMd={isMd} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMd ? '420px 1fr' : '1fr',
          gap: isMd ? 32 : 24,
          // `alignItems: 'stretch'` (the default) makes the left cell tall
          // enough for the sticky calendar to actually stick — with `start`
          // the cell collapsed to content height and sticky had no track.
        }}>
          {/* Calendar sidebar — sticky on desktop, stacked at top on mobile.
              Sticky offset clears the AppHeader (56px) plus breathing room. */}
          <div style={isMd ? { position: 'sticky', top: 72 } : undefined}>
            <div style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 11,
              letterSpacing: '1.5px',
              color: muted,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              BEST MONTHS
            </div>
            <BestMonthsCalendar a={a} b={b} variant="sidebar" />

            {result.overlapMonths.length > 0 && (
              <PeakOverlapCard formatted={result.overlapFormatted} count={result.overlapMonths.length} />
            )}

            <Legend />
          </div>

          {/* Right column: scrolling content */}
          <div>
            <VersusDiptych a={a} b={b} unit={unit} />
            <Narrative a={a} b={b} unit={unit} />
          </div>
        </div>

        {/* Monthly breakdown — side-by-side on desktop, tabbed on mobile */}
        <MonthlyBreakdown a={a} b={b} unit={unit} isMd={isMd} />
      </div>
    </div>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function Breadcrumb({ a, b }: { a: City; b: City }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: '1.5px',
      color: muted,
      textTransform: 'uppercase',
      marginBottom: 16,
    }}>
COMPARE · {a.name.toUpperCase()} vs {b.name.toUpperCase()}
    </div>
  )
}

function Hero({ a, b, isMd }: { a: City; b: City; isMd: boolean }) {
  return (
    <div style={{ marginBottom: isMd ? 36 : 24 }}>
      <h1 style={{
        fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
        fontWeight: 700,
        fontSize: isMd ? 'clamp(64px, 13vw, 168px)' : 'clamp(44px, 14vw, 64px)',
        lineHeight: 0.9,
        letterSpacing: '-0.045em',
        textTransform: 'uppercase',
        wordBreak: 'break-word',
        margin: 0,
      }}>
        <CityLink city={a} style={{ color: CITY_A_COLOR }}>{a.name}</CityLink>{' '}
        <span style={{
          color: muted,
          fontWeight: 400,
          fontSize: '0.4em',
          verticalAlign: '0.55em',
          letterSpacing: 0,
        }}>vs</span>{' '}
        <CityLink city={b} style={{ color: CITY_B_COLOR }}>{b.name}</CityLink>
      </h1>
      <div style={{
        fontSize: isMd ? 22 : 16,
        color: muted,
        marginTop: isMd ? 16 : 12,
        maxWidth: 720,
      }}>
        When should you visit each — and when are both ideal?
      </div>
    </div>
  )
}

function PeakOverlapCard({ formatted, count }: { formatted: string; count: number }) {
  return (
    <div style={{
      marginTop: 16,
      padding: 14,
      background: 'rgba(90, 98, 64, 0.08)',
      borderLeft: `3px solid ${OVERLAP_COLOR}`,
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 10,
        letterSpacing: '1.5px',
        color: muted,
        textTransform: 'uppercase',
        marginBottom: 6,
      }}>
        PEAK OVERLAP · {count} {count === 1 ? 'MONTH' : 'MONTHS'}
      </div>
      <div style={{
        fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
        fontSize: 22,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        lineHeight: 1.15,
      }}>
        {formatted}
      </div>
      <div style={{
        fontSize: 13,
        color: muted,
        marginTop: 4,
      }}>
        Mild temperatures, lower rainfall, longer days — good for visiting both on one trip.
      </div>
    </div>
  )
}

function Legend() {
  const dot = (bg: string): React.CSSProperties => ({
    display: 'inline-block',
    width: 10,
    height: 10,
    background: bg,
    border: '1px solid rgba(17, 17, 17, 0.12)',
    marginRight: 5,
    verticalAlign: 'middle',
  })

  return (
    <>
      <div style={{
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 10,
        letterSpacing: '1.5px',
        color: muted,
        textTransform: 'uppercase',
        marginTop: 20,
        marginBottom: 8,
      }}>
        LEGEND
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 11,
        letterSpacing: '1px',
        color: muted,
        textTransform: 'uppercase',
      }}>
        <span><span style={dot('rgba(207, 154, 58, 0.12)')} />Cool/wet</span>
        <span><span style={dot('rgba(207, 154, 58, 0.32)')} />Workable</span>
        <span><span style={dot('rgba(74, 124, 58, 0.38)')} />Ideal</span>
        <span><span style={dot(OVERLAP_COLOR)} />Best for both</span>
      </div>
    </>
  )
}

function Narrative({ a, b, unit }: { a: City; b: City; unit: Unit }) {
  const aClimate = classifyClimate(a)
  const bClimate = classifyClimate(b)
  const aPeak = peakAndTrough(a.high)
  const bPeak = peakAndTrough(b.high)
  const sharedClimate = aClimate === bClimate
  const fmtTemp = (c: number) =>
    unit === 'F' ? `${cToF(c).toFixed(1)}°F` : `${c.toFixed(1)}°C`

  return (
    <div style={{
      marginTop: 24,
      padding: 24,
      background: '#fff',
      border: `1px solid ${borderHard}`,
    }}>
      <h3 style={{
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 11,
        letterSpacing: '1.5px',
        color: muted,
        textTransform: 'uppercase',
        margin: '0 0 12px 0',
      }}>
        CLIMATE OVERVIEW
      </h3>
      <p style={{ margin: '0 0 10px 0', lineHeight: 1.55 }}>
        <CityLink city={a} style={{ color: CITY_A_COLOR, fontWeight: 600 }}>{a.name}</CityLink> has a <strong>{climateLabel(aClimate)}</strong> climate;{' '}
        {sharedClimate ? (
          <>
            <CityLink city={b} style={{ color: CITY_B_COLOR, fontWeight: 600 }}>{b.name}</CityLink> shares the same classification.
          </>
        ) : (
          <>
            <CityLink city={b} style={{ color: CITY_B_COLOR, fontWeight: 600 }}>{b.name}</CityLink> is classified as {climateLabel(bClimate)}.
          </>
        )}
        {' '}
        <CityLink city={a} style={{ color: CITY_A_COLOR, fontWeight: 600 }}>{a.name}</CityLink>'s warmest month is <strong>{MONTHS_LONG[aPeak.peakIdx]}</strong> at{' '}
        <strong>{fmtTemp(aPeak.peakValue)}</strong>;{' '}
        <CityLink city={b} style={{ color: CITY_B_COLOR, fontWeight: 600 }}>{b.name}</CityLink> peaks in <strong>{MONTHS_LONG[bPeak.peakIdx]}</strong> at{' '}
        <strong>{fmtTemp(bPeak.peakValue)}</strong>.
      </p>
    </div>
  )
}

interface CityTableColProps {
  city: City
  color: string
  unit: Unit
  leftCol?: boolean
  isMd: boolean
  // When the city name lives in a tab above the table (mobile-tabbed view),
  // drop the in-table h2 to avoid duplication. The country/admin1 line stays
  // because it carries info the tab doesn't.
  hideHeading?: boolean
  // When the table sits below tabs, the active tab provides the top border.
  // Skip the table's top border here so they merge into a single rectangle.
  borderlessTop?: boolean
}

function CityTableCol({ city, color, unit, leftCol, isMd, hideHeading, borderlessTop }: CityTableColProps) {
  const showTemp = (c: number) => unit === 'F' ? Math.round(cToF(c)) : c
  const showRain = (mm: number) => unit === 'F' ? mmToIn(mm) : mm
  const rainSuffix = unit === 'F' ? 'in' : 'mm'
  return (
    <div style={{
      padding: isMd ? 24 : 16,
      background: '#fff',
      // Per-side borders (not shorthand + override) so toggling `isMd` at
      // runtime doesn't trip React's shorthand/non-shorthand conflict warning.
      borderLeft: `1px solid ${borderHard}`,
      // On desktop the two columns sit side-by-side, so the left column drops
      // its right border to share the divider. On mobile they stack, so both
      // keep their right border for a clean grid.
      borderRight: (isMd && leftCol) ? 'none' : `1px solid ${borderHard}`,
      borderTop: borderlessTop ? 'none' : `1px solid ${borderHard}`,
      borderBottom: `1px solid ${borderHard}`,
    }}>
      {!hideHeading && (
        <>
          <h2 style={{
            fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
            fontWeight: 700,
            fontSize: isMd ? 56 : 36,
            letterSpacing: '-0.03em',
            margin: '0 0 4px 0',
            textTransform: 'uppercase',
            lineHeight: 0.92,
            color,
          }}>
            <CityLink city={city}>{city.name}</CityLink>
          </h2>
          <div style={{
            fontSize: isMd ? 18 : 14,
            color: muted,
            marginBottom: isMd ? 16 : 12,
          }}>
            {city.country}{city.admin1 ? ` · ${city.admin1}` : ''}
          </div>
        </>
      )}

      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontVariantNumeric: 'tabular-nums',
      }}>
        <thead>
          <tr>
            {['Month', 'High', 'Low', 'Rain', 'Sun'].map((h, i) => (
              <th key={h} style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 10,
                letterSpacing: '1px',
                color: muted,
                textTransform: 'uppercase',
                borderBottom: `1px solid ${borderSoft}`,
                padding: '6px 4px',
                textAlign: i === 0 ? 'left' : 'right',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MONTHS.map((m, i) => (
            <tr key={m} style={{
              background: i % 2 === 1 ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
            }}>
              <td style={{ padding: '6px 4px', fontSize: 13, textAlign: 'left' }}>{m}</td>
              <td style={{ padding: '6px 4px', fontSize: 13, textAlign: 'right' }}>{showTemp(city.high[i])}°</td>
              <td style={{ padding: '6px 4px', fontSize: 13, textAlign: 'right' }}>{showTemp(city.low[i])}°</td>
              <td style={{ padding: '6px 4px', fontSize: 13, textAlign: 'right' }}>{showRain(city.precip[i])}{rainSuffix}</td>
              <td style={{ padding: '6px 4px', fontSize: 13, textAlign: 'right' }}>{city.sun[i].toFixed(1)}h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Monthly Breakdown ──────────────────────────────────────────────────────
//
// Desktop: render both city tables side-by-side, just like before.
// Mobile:  render a 2-button tab row; only the active city's table is shown.
//          Tabs use each city's identity color so the active selection has
//          obvious, branded recognition.

function MonthlyBreakdown({ a, b, unit, isMd }: { a: City; b: City; unit: Unit; isMd: boolean }) {
  const [tab, setTab] = useState<'a' | 'b'>('a')

  return (
    <div style={{ marginTop: isMd ? 48 : 32 }}>
      <div style={{
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 11,
        letterSpacing: '1.5px',
        color: muted,
        textTransform: 'uppercase',
        marginBottom: 12,
      }}>
        MONTHLY BREAKDOWN{isMd ? ' — SIDE BY SIDE' : ''}
      </div>

      {isMd ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderTop: `1px solid ${borderHard}`,
        }}>
          <CityTableCol city={a} color={CITY_A_COLOR} unit={unit} leftCol isMd={isMd} />
          <CityTableCol city={b} color={CITY_B_COLOR} unit={unit} isMd={isMd} />
        </div>
      ) : (
        <>
          <MonthlyTabs a={a} b={b} active={tab} onChange={setTab} />
          <CityTableCol
            // The key remounts the table on tab change so any future row
            // animations or transitions trigger naturally per tab.
            key={tab}
            city={tab === 'a' ? a : b}
            color={tab === 'a' ? CITY_A_COLOR : CITY_B_COLOR}
            unit={unit}
            isMd={isMd}
            hideHeading
            borderlessTop
          />
        </>
      )}
    </div>
  )
}

function MonthlyTabs({ a, b, active, onChange }: {
  a: City
  b: City
  active: 'a' | 'b'
  onChange: (next: 'a' | 'b') => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Monthly breakdown city"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
      }}
    >
      <TabButton
        city={a}
        color={CITY_A_COLOR}
        active={active === 'a'}
        onClick={() => onChange('a')}
        position="left"
      />
      <TabButton
        city={b}
        color={CITY_B_COLOR}
        active={active === 'b'}
        onClick={() => onChange('b')}
        position="right"
      />
    </div>
  )
}

function TabButton({ city, color, active, onClick, position }: {
  city: City
  color: string
  active: boolean
  onClick: () => void
  position: 'left' | 'right'
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        // Touch-friendly height; matches AGENTS/skill guidance for 48px+ targets.
        minHeight: 56,
        padding: '10px 14px',
        background: active ? '#fff' : 'rgba(17, 17, 17, 0.04)',
        color: active ? color : muted,
        // Border choreography: the active tab carries a 3px city-color accent
        // on top and drops its bottom border so it merges with the table below.
        // The inactive tab keeps the full black frame.
        borderTop: active ? `3px solid ${color}` : `3px solid ${borderHard}`,
        borderBottom: active ? 'none' : `1px solid ${borderHard}`,
        borderLeft: position === 'left' ? `1px solid ${borderHard}` : 'none',
        borderRight: `1px solid ${borderHard}`,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
        fontWeight: active ? 700 : 500,
        fontSize: 20,
        textTransform: 'uppercase',
        letterSpacing: '-0.02em',
        lineHeight: 1.05,
        transition: 'background 0.15s ease, color 0.15s ease',
      }}
    >
      {city.name}
      <span style={{
        display: 'block',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 9,
        letterSpacing: '1.5px',
        color: muted,
        textTransform: 'uppercase',
        marginTop: 4,
        fontWeight: 400,
      }}>
        {city.country}{city.admin1 ? ` · ${city.admin1}` : ''}
      </span>
    </button>
  )
}

