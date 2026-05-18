import React from 'react'
import type { City } from '../data/cities'
import { MONTHS_LONG, MONTHS } from '../data/cities'
import { BestMonthsCalendar } from './BestMonthsCalendar'
import { VersusDiptych } from './VersusDiptych'
import { compareCities } from '../lib/comparison'
import { classifyClimate, climateLabel, peakAndTrough } from '../lib/climate-summary'
import { CITY_A_COLOR, CITY_B_COLOR, OVERLAP_COLOR } from '../lib/colors'

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
  const result = compareCities(a, b)

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
        padding: 32,
      }}>
        <Breadcrumb a={a} b={b} />
        <Hero a={a} b={b} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: '420px 1fr',
          gap: 32,
          alignItems: 'start',
        }}>
          {/* Sticky calendar sidebar */}
          <div style={{ position: 'sticky', top: 24 }}>
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
            <VersusDiptych a={a} b={b} />
            <Narrative a={a} b={b} />
          </div>
        </div>

        {/* Full-width side-by-side monthly tables */}
        <div style={{ marginTop: 48 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 11,
            letterSpacing: '1.5px',
            color: muted,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            MONTHLY BREAKDOWN — SIDE BY SIDE
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            borderTop: `1px solid ${borderHard}`,
          }}>
            <CityTableCol city={a} color={CITY_A_COLOR} leftCol />
            <CityTableCol city={b} color={CITY_B_COLOR} />
          </div>
        </div>

        <Footer />
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
      <a href="/" style={{ color: muted, textDecoration: 'none' }}>CLIMATO</a> · COMPARE · {a.name.toUpperCase()} vs {b.name.toUpperCase()}
    </div>
  )
}

function Hero({ a, b }: { a: City; b: City }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h1 style={{
        fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
        fontWeight: 700,
        fontSize: 'clamp(64px, 13vw, 168px)',
        lineHeight: 0.9,
        letterSpacing: '-0.045em',
        textTransform: 'uppercase',
        wordBreak: 'break-word',
        margin: 0,
      }}>
        <span style={{ color: CITY_A_COLOR }}>{a.name}</span>{' '}
        <span style={{
          color: muted,
          fontWeight: 400,
          fontSize: '0.4em',
          verticalAlign: '0.55em',
          letterSpacing: 0,
        }}>vs</span>{' '}
        <span style={{ color: CITY_B_COLOR }}>{b.name}</span>
      </h1>
      <div style={{
        fontSize: 22,
        color: muted,
        marginTop: 16,
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

function Narrative({ a, b }: { a: City; b: City }) {
  const aClimate = classifyClimate(a)
  const bClimate = classifyClimate(b)
  const aPeak = peakAndTrough(a.high)
  const bPeak = peakAndTrough(b.high)
  const sharedClimate = aClimate === bClimate

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
        {a.name} has a <strong>{climateLabel(aClimate)}</strong> climate;{' '}
        {sharedClimate
          ? `${b.name} shares the same classification.`
          : `${b.name} is classified as ${climateLabel(bClimate)}.`}
        {' '}
        {a.name}'s warmest month is <strong>{MONTHS_LONG[aPeak.peakIdx]}</strong> at{' '}
        <strong>{aPeak.peakValue}°C</strong>;{' '}
        {b.name} peaks in <strong>{MONTHS_LONG[bPeak.peakIdx]}</strong> at{' '}
        <strong>{bPeak.peakValue}°C</strong>.
      </p>
    </div>
  )
}

function CityTableCol({ city, color, leftCol }: { city: City; color: string; leftCol?: boolean }) {
  return (
    <div style={{
      padding: 24,
      background: '#fff',
      border: `1px solid ${borderHard}`,
      borderTop: 'none',
      ...(leftCol ? { borderRight: 'none' } : {}),
    }}>
      <h2 style={{
        fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
        fontWeight: 700,
        fontSize: 56,
        letterSpacing: '-0.03em',
        margin: '0 0 4px 0',
        textTransform: 'uppercase',
        lineHeight: 0.92,
        color,
      }}>
        {city.name}
      </h2>
      <div style={{
        fontSize: 18,
        color: muted,
        marginBottom: 16,
      }}>
        {city.country}{city.admin1 ? ` · ${city.admin1}` : ''}
      </div>

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
              <td style={{ padding: '6px 4px', fontSize: 13, textAlign: 'right' }}>{city.high[i]}°</td>
              <td style={{ padding: '6px 4px', fontSize: 13, textAlign: 'right' }}>{city.low[i]}°</td>
              <td style={{ padding: '6px 4px', fontSize: 13, textAlign: 'right' }}>{city.precip[i]}mm</td>
              <td style={{ padding: '6px 4px', fontSize: 13, textAlign: 'right' }}>{city.sun[i].toFixed(1)}h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Footer() {
  return (
    <div style={{
      marginTop: 56,
      paddingTop: 24,
      borderTop: `1px solid ${borderSoft}`,
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: '1.5px',
      color: muted,
      textTransform: 'uppercase',
      display: 'flex',
      justifyContent: 'space-between',
    }}>
      <span>SOURCE · OPEN-METEO · 30-YR NORMALS</span>
      <span>CLIMATO</span>
    </div>
  )
}
