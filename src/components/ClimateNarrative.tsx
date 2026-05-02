import { useState } from 'react'
import { City, MONTHS, MONTHS_LONG, cToF, mmToIn } from '../data/cities'
import { useMediaQuery } from '../hooks/useMediaQuery'
import {
  annualPrecipMm,
  classifyClimate,
  climateLabel,
  peakAndTrough,
  pickBestMonths,
} from '../lib/climate-summary'

const fg = '#111'
const muted = '#85847d'
const accent = '#cc3b1f'
const precipBlue = '#2b5fae'
const cardBg = '#fff'
const sheetBg = '#f0f1ed'

interface Props {
  city: City
  unit: 'C' | 'F'
}

// Auto-generated, scannable English text + a parseable monthly table.
// Renders below the visual variations so Googlebot — and any reader — gets
// real content to index, not just charts. All four sections live under their
// own <h2> for semantic SEO.
//
// Visual approach: Swiss-grid bordered cards (matching VariationA's Module
// pattern) as the chassis, with magazine-editorial moves inside —
// asymmetric two-column lead with a drop cap, a pull-quote callout, a
// featured "best months" range, and a tinted bordered table.
export function ClimateNarrative({ city, unit }: Props) {
  const isMd = useMediaQuery('(min-width: 768px)')
  const pad = isMd ? 32 : 16
  const climate = classifyClimate(city)
  const hi = peakAndTrough(city.high)
  const lo = peakAndTrough(city.low)
  const pr = peakAndTrough(city.precip)
  const annualPrecip = annualPrecipMm(city)
  const best = pickBestMonths(city)

  const t = (c: number) => unit === 'C' ? `${Math.round(c)}°C` : `${Math.round(cToF(c))}°F`
  const tDecimal = (c: number) => unit === 'C' ? `${c.toFixed(1)}°C` : `${cToF(c).toFixed(1)}°F`
  const mm = (v: number) => unit === 'C' ? `${v} mm` : `${mmToIn(v)} in`

  // Pull-quote: lifts the temperature extremes into a stat-as-headline so
  // skimmers get the climatic signature in one glance.
  const pullQuoteValue = t(hi.peakValue)
  const pullQuoteCaption = `${MONTHS_LONG[hi.peakIdx]} · hottest month`

  return (
    <div style={{
      width: '100%',
      background: sheetBg,
      color: fg,
      fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
      boxSizing: 'border-box',
    }}>
      <div className="flex flex-col gap-4" style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: `0 ${pad}px ${pad}px`,
      }}>

        <Module index={1} title="Climate Overview" meta={`${MONTHS_LONG[hi.peakIdx]} → ${MONTHS_LONG[lo.troughIdx]}`} isMd={isMd}>
          <OverviewBody
            city={city}
            climateName={climateLabel(climate)}
            warmestMonth={MONTHS_LONG[hi.peakIdx]}
            warmestTemp={t(hi.peakValue)}
            coolestMonth={MONTHS_LONG[hi.troughIdx]}
            coolestTemp={t(hi.troughValue)}
            pullQuoteValue={pullQuoteValue}
            pullQuoteCaption={pullQuoteCaption}
            isMd={isMd}
          />
        </Module>

        <Module index={2} title="Rainfall by Month" meta={`${mm(annualPrecip)} / year`} isMd={isMd}>
          <RainfallBody
            cityName={city.name}
            precip={city.precip}
            wettestMonth={MONTHS_LONG[pr.peakIdx]}
            wettestValue={mm(pr.peakValue)}
            driestMonth={MONTHS_LONG[pr.troughIdx]}
            driestValue={mm(pr.troughValue)}
            annualValue={mm(annualPrecip)}
            highlightIdx={pr.peakIdx}
            isMd={isMd}
          />
        </Module>

        <Module index={3} title="Best Time to Visit" meta={best ? best.formatted : 'no clear season'} isMd={isMd}>
          <BestTimeBody
            cityName={city.name}
            range={best?.formatted ?? null}
            tempLow={best ? t(best.avgLowRange[0]) : ''}
            tempHigh={best ? t(best.avgHighRange[1]) : ''}
            sun={best?.avgSun ?? null}
            isMd={isMd}
          />
        </Module>

        <Module
          index={4}
          title="Monthly Breakdown"
          meta={`12 months · °${unit} · ${unit === 'C' ? 'mm' : 'in'} · hours`}
          isMd={isMd}
        >
          <MonthlyTable city={city} t={tDecimal} mm={mm} isMd={isMd} />
        </Module>

      </div>
    </div>
  )
}

// ─── 01 · Climate Overview ────────────────────────────────────────────────────
function OverviewBody({
  city, climateName, warmestMonth, warmestTemp, coolestMonth, coolestTemp,
  pullQuoteValue, pullQuoteCaption, isMd,
}: {
  city: City
  climateName: string
  warmestMonth: string
  warmestTemp: string
  coolestMonth: string
  coolestTemp: string
  pullQuoteValue: string
  pullQuoteCaption: string
  isMd: boolean
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMd ? '7fr 5fr' : '1fr',
      gap: isMd ? 32 : 20,
      padding: isMd ? '24px 28px' : '20px 18px',
      alignItems: 'start',
    }}>
      <p style={{
        margin: 0,
        fontSize: isMd ? 18 : 16,
        lineHeight: 1.6,
        color: fg,
      }}>
        {city.name} has a {climateName} climate. The warmest month is{' '}
        <span style={{ color: accent, fontWeight: 600 }}>{warmestMonth}</span>{' '}
        ({warmestTemp} average high) and the coolest is {coolestMonth} ({coolestTemp}).
      </p>
      <PullQuote value={pullQuoteValue} caption={pullQuoteCaption} isMd={isMd} />
    </div>
  )
}

function PullQuote({ value, caption, isMd }: { value: string; caption: string; isMd: boolean }) {
  return (
    <aside style={{
      borderLeft: `3px solid ${accent}`,
      padding: isMd ? '6px 0 6px 18px' : '4px 0 4px 14px',
    }}>
      <div style={{
        fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
        fontSize: isMd ? 56 : 40,
        fontWeight: 700,
        letterSpacing: -1,
        lineHeight: 1,
        color: fg,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      <div style={{
        marginTop: 10,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 11,
        letterSpacing: 1.5,
        color: muted,
        textTransform: 'uppercase',
      }}>
        {caption}
      </div>
    </aside>
  )
}

// ─── 02 · Rainfall by Month ───────────────────────────────────────────────────
function RainfallBody({
  cityName, precip, wettestMonth, wettestValue, driestMonth, driestValue,
  annualValue, highlightIdx, isMd,
}: {
  cityName: string
  precip: number[]
  wettestMonth: string
  wettestValue: string
  driestMonth: string
  driestValue: string
  annualValue: string
  highlightIdx: number
  isMd: boolean
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMd ? '5fr 7fr' : '1fr',
      gap: isMd ? 32 : 20,
      padding: isMd ? '24px 28px' : '20px 18px',
      alignItems: 'start',
    }}>
      <div>
        <p style={{ margin: 0, fontSize: isMd ? 18 : 16, lineHeight: 1.6, color: fg }}>
          {cityName} sees {annualValue} of rain a year. The wettest month is {wettestMonth} ({wettestValue}); the driest is {driestMonth} ({driestValue}).
        </p>
      </div>
      <Sparkline values={precip} highlightIdx={highlightIdx} isMd={isMd} />
    </div>
  )
}

// ─── 03 · Best Time to Visit ──────────────────────────────────────────────────
function BestTimeBody({
  cityName, range, tempLow, tempHigh, sun, isMd,
}: {
  cityName: string
  range: string | null
  tempLow: string
  tempHigh: string
  sun: number | null
  isMd: boolean
}) {
  if (!range || sun === null) {
    return (
      <div style={{ padding: isMd ? '24px 28px' : '20px 18px' }}>
        <p style={{ margin: 0, fontSize: isMd ? 18 : 16, lineHeight: 1.6, color: fg }}>
          {cityName} doesn't have a clearly preferred season — its climate stays fairly consistent year-round.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMd ? '5fr 7fr' : '1fr',
      gap: isMd ? 32 : 20,
      padding: isMd ? '24px 28px' : '20px 18px',
      alignItems: 'start',
    }}>
      <div style={{
        borderLeft: `3px solid ${accent}`,
        padding: isMd ? '6px 0 6px 18px' : '4px 0 4px 14px',
      }}>
        <div style={{
          fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
          fontSize: isMd ? 48 : 36,
          fontWeight: 700,
          letterSpacing: -0.5,
          lineHeight: 1,
          color: fg,
          textTransform: 'uppercase',
        }}>
          {range}
        </div>
        <div style={{
          marginTop: 10,
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 11,
          letterSpacing: 1.5,
          color: muted,
          textTransform: 'uppercase',
        }}>
          {tempLow} – {tempHigh} · {sun.toFixed(1)}h sun
        </div>
      </div>
      <p style={{ margin: 0, fontSize: isMd ? 18 : 16, lineHeight: 1.6, color: fg }}>
        The best time to visit {cityName} is {range}, when temperatures average {tempLow}–{tempHigh} with {sun.toFixed(1)} sunshine hours per day.
      </p>
    </div>
  )
}

// ─── 04 · Monthly Breakdown ───────────────────────────────────────────────────
function Sparkline({ values, highlightIdx, isMd }: { values: number[]; highlightIdx: number; isMd: boolean }) {
  const max = Math.max(...values, 1)
  const barW = isMd ? 22 : 14
  const gap = 6
  const height = isMd ? 72 : 48
  const labelH = 16
  const totalW = values.length * barW + (values.length - 1) * gap

  return (
    <svg
      viewBox={`0 0 ${totalW} ${height + labelH}`}
      width="100%"
      style={{ maxWidth: totalW, display: 'block', overflow: 'visible' }}
      role="img"
      aria-label="Monthly precipitation pattern"
    >
      {values.map((v, i) => {
        const h = Math.max(1, Math.round((v / max) * height))
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={height - h}
            width={barW}
            height={h}
            fill={i === highlightIdx ? precipBlue : `${fg}22`}
          />
        )
      })}
      {MONTHS.map((m, i) => (
        <text
          key={m}
          x={i * (barW + gap) + barW / 2}
          y={height + labelH - 2}
          textAnchor="middle"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontSize={10}
          letterSpacing={1}
          fill={i === highlightIdx ? fg : muted}
        >
          {m[0]}
        </text>
      ))}
    </svg>
  )
}

type SortKey = 'month' | 'high' | 'low' | 'rain' | 'sun' | 'sunrise' | 'sunset'
type SortDir = 'asc' | 'desc'

interface RowData {
  monthIdx: number
  month: string
  high: number
  low: number
  rain: number
  sun: number
  sunrise: string
  sunset: string
}

const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: 'month',   label: 'Month' },
  { key: 'high',    label: 'High' },
  { key: 'low',     label: 'Low' },
  { key: 'rain',    label: 'Rain' },
  { key: 'sun',     label: 'Sun' },
  { key: 'sunrise', label: 'Sunrise' },
  { key: 'sunset',  label: 'Sunset' },
]

function compareRows(a: RowData, b: RowData, key: SortKey, dir: SortDir): number {
  const sign = dir === 'asc' ? 1 : -1
  const av = key === 'month' ? a.monthIdx : a[key]
  const bv = key === 'month' ? b.monthIdx : b[key]
  if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sign
  return String(av).localeCompare(String(bv)) * sign
}

function MonthlyTable({
  city, t, mm, isMd,
}: {
  city: City
  t: (c: number) => string
  mm: (v: number) => string
  isMd: boolean
}) {
  const [sortKey, setSortKey] = useState<SortKey>('month')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const rows: RowData[] = MONTHS_LONG.map((month, i) => ({
    monthIdx: i,
    month,
    high: city.high[i],
    low: city.low[i],
    rain: city.precip[i],
    sun: city.sun[i],
    sunrise: city.sunrise[i],
    sunset: city.sunset[i],
  }))
  const sorted = [...rows].sort((a, b) => compareRows(a, b, sortKey, sortDir))

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      // Numeric columns default to descending (highest first), text to asc.
      setSortDir(key === 'month' || key === 'sunrise' || key === 'sunset' ? 'asc' : 'desc')
    }
  }

  const cellPad = isMd ? '8px 14px' : '6px 8px'
  const headBaseStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 10,
    letterSpacing: 1.5,
    color: muted,
    textTransform: 'uppercase',
    fontWeight: 500,
    textAlign: 'left',
    padding: 0,
    borderBottom: `1px solid ${fg}`,
    whiteSpace: 'nowrap',
    background: '#fafafa',
  }
  const headButtonStyle: React.CSSProperties = {
    appearance: 'none',
    background: 'transparent',
    border: 'none',
    padding: cellPad,
    margin: 0,
    cursor: 'pointer',
    color: 'inherit',
    font: 'inherit',
    letterSpacing: 'inherit',
    textTransform: 'inherit',
    width: '100%',
    textAlign: 'left',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  }
  const cellStyle: React.CSSProperties = {
    fontSize: isMd ? 13 : 11,
    color: fg,
    padding: cellPad,
    borderBottom: `1px solid ${fg}14`,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  }
  const monthCell: React.CSSProperties = {
    ...cellStyle,
    fontWeight: 500,
    color: fg,
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
        <caption style={{
          textAlign: 'left',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 10,
          letterSpacing: 1.5,
          color: muted,
          padding: cellPad,
          captionSide: 'top',
        }}>
          {`Monthly climate normals for ${city.name}, ${city.country} — click a column to sort`}
        </caption>
        <thead>
          <tr>
            {COLUMNS.map(col => {
              const isActive = col.key === sortKey
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  style={{
                    ...headBaseStyle,
                    color: isActive ? fg : muted,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    style={headButtonStyle}
                  >
                    <span>{col.label}</span>
                    <span aria-hidden="true" style={{ color: isActive ? accent : `${muted}66`, fontSize: 9 }}>
                      {isActive ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => (
            <tr key={row.month}>
              <th scope="row" style={monthCell}>{row.month}</th>
              <td style={cellStyle}>{t(row.high)}</td>
              <td style={cellStyle}>{t(row.low)}</td>
              <td style={cellStyle}>{mm(row.rain)}</td>
              <td style={cellStyle}>{row.sun.toFixed(1)} h</td>
              <td style={cellStyle}>{row.sunrise}</td>
              <td style={cellStyle}>{row.sunset}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Module: matches the bordered-card chassis used across VariationA. The
// header bar carries a numbered eyebrow + h2 + right-aligned mono meta.
function Module({
  index, title, meta, children, isMd,
}: {
  index: number
  title: string
  meta?: string
  children: React.ReactNode
  isMd: boolean
}) {
  return (
    <section style={{
      border: `1px solid ${fg}`,
      background: cardBg,
    }}>
      <header className="flex flex-wrap items-baseline justify-between gap-2" style={{
        padding: isMd ? '14px 20px' : '12px 16px',
        borderBottom: `1px solid ${fg}`,
      }}>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 11,
            letterSpacing: 2,
            color: muted,
            textTransform: 'uppercase',
          }}>
            № {String(index).padStart(2, '0')}
          </span>
          <h2 style={{
            margin: 0,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1.5,
            color: fg,
            textTransform: 'uppercase',
          }}>
            {title}
          </h2>
        </div>
        {meta && (
          <span style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 11,
            letterSpacing: 1.5,
            color: muted,
            textTransform: 'uppercase',
          }}>
            {meta}
          </span>
        )}
      </header>
      <div>{children}</div>
    </section>
  )
}
