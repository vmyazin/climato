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
const precipBlue = '#2b5fae'
const hairline = '#11111114'

interface Props {
  city: City
  unit: 'C' | 'F'
}

// Auto-generated, scannable English text + a parseable monthly table.
// Renders below the visual variations so Googlebot — and any reader — gets
// real content to index, not just charts. All four sections live under their
// own <h2> for semantic SEO.
//
// Visual approach: minimal chrome — no bordered card containers. Numbered
// eyebrow labels + large h2s + body type doing the work, hairlines between
// sections. The rainfall section borrows a small inline sparkline from the
// "Dashboard density" design exploration so the seasonal pattern lands
// without requiring a trip to the table below.
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

  const overview = `${city.name} has a ${climateLabel(climate)} climate. The warmest month is ${MONTHS_LONG[hi.peakIdx]} (${t(hi.peakValue)} average high) and the coolest is ${MONTHS_LONG[hi.troughIdx]} (${t(hi.troughValue)}).`
  const rainfall = `Annual rainfall totals ${mm(annualPrecip)}. The wettest month is ${MONTHS_LONG[pr.peakIdx]} (${mm(pr.peakValue)}) and the driest is ${MONTHS_LONG[pr.troughIdx]} (${mm(pr.troughValue)}).`
  const bestTimeText = best
    ? `The best time to visit ${city.name} is ${best.formatted}, when temperatures average ${t(best.avgLowRange[0])}–${t(best.avgHighRange[1])} with ${best.avgSun.toFixed(1)} sunshine hours per day.`
    : `${city.name} doesn't have a clearly preferred season — its climate stays fairly consistent year-round.`

  return (
    <div style={{
      width: '100%',
      background: '#f0f1ed',
      color: fg,
      fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
      boxSizing: 'border-box',
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: `0 ${pad}px ${pad}px`,
      }}>

        <Section index={1} title="Climate Overview" meta={`${MONTHS_LONG[hi.peakIdx]} → ${MONTHS_LONG[lo.troughIdx]}`} isMd={isMd}>
          <Para isMd={isMd}>{overview}</Para>
        </Section>

        <Section index={2} title="Rainfall by Month" meta={`${mm(annualPrecip)} / year`} isMd={isMd}>
          <Para isMd={isMd}>{rainfall}</Para>
          <Sparkline values={city.precip} highlightIdx={pr.peakIdx} isMd={isMd} />
        </Section>

        <Section index={3} title="Best Time to Visit" meta={best ? best.formatted : 'no clear season'} isMd={isMd}>
          <Para isMd={isMd}>{bestTimeText}</Para>
        </Section>

        <Section
          index={4}
          title="Monthly Breakdown"
          meta={`12 months · °${unit} · ${unit === 'C' ? 'mm' : 'in'} · hours`}
          isMd={isMd}
        >
          <MonthlyTable city={city} t={tDecimal} mm={mm} isMd={isMd} />
        </Section>

      </div>
    </div>
  )
}

// 12-bar inline sparkline of monthly precipitation. The peak month gets the
// accent colour so the eye lands on the visual claim made in the prose.
function Sparkline({ values, highlightIdx, isMd }: { values: number[]; highlightIdx: number; isMd: boolean }) {
  const max = Math.max(...values, 1)
  const barW = isMd ? 14 : 10
  const gap = 4
  const height = 36
  const labelH = 14
  const totalW = values.length * barW + (values.length - 1) * gap

  return (
    <div style={{ marginTop: 18 }}>
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
              fill={i === highlightIdx ? precipBlue : `${fg}33`}
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
            fontSize={9}
            letterSpacing={1}
            fill={i === highlightIdx ? fg : muted}
          >
            {m[0]}
          </text>
        ))}
      </svg>
    </div>
  )
}

function MonthlyTable({
  city, t, mm, isMd,
}: {
  city: City
  t: (c: number) => string
  mm: (v: number) => string
  isMd: boolean
}) {
  const cellPad = isMd ? '8px 14px' : '6px 8px'
  const headStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 10,
    letterSpacing: 1.5,
    color: muted,
    textTransform: 'uppercase',
    fontWeight: 500,
    textAlign: 'left',
    padding: cellPad,
    borderBottom: `1px solid ${fg}`,
    whiteSpace: 'nowrap',
  }
  const cellStyle: React.CSSProperties = {
    fontSize: isMd ? 13 : 11,
    color: fg,
    padding: cellPad,
    borderBottom: `1px solid ${hairline}`,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  }
  const monthCell: React.CSSProperties = {
    ...cellStyle,
    fontWeight: 500,
    color: fg,
  }

  return (
    <div style={{ overflowX: 'auto', marginTop: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
        <caption style={{
          textAlign: 'left',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 10,
          letterSpacing: 1.5,
          color: muted,
          padding: `0 ${isMd ? 14 : 8}px 8px`,
          captionSide: 'top',
        }}>
          {`Monthly climate normals for ${city.name}, ${city.country}`}
        </caption>
        <thead>
          <tr>
            <th scope="col" style={headStyle}>Month</th>
            <th scope="col" style={headStyle}>High</th>
            <th scope="col" style={headStyle}>Low</th>
            <th scope="col" style={headStyle}>Rain</th>
            <th scope="col" style={headStyle}>Sun</th>
            <th scope="col" style={headStyle}>Sunrise</th>
            <th scope="col" style={headStyle}>Sunset</th>
          </tr>
        </thead>
        <tbody>
          {MONTHS_LONG.map((month, i) => (
            <tr
              key={month}
              style={{ background: i % 2 === 1 ? '#0000000a' : 'transparent' }}
            >
              <th scope="row" style={monthCell}>{month}</th>
              <td style={cellStyle}>{t(city.high[i])}</td>
              <td style={cellStyle}>{t(city.low[i])}</td>
              <td style={cellStyle}>{mm(city.precip[i])}</td>
              <td style={cellStyle}>{city.sun[i].toFixed(1)} h</td>
              <td style={cellStyle}>{city.sunrise[i]}</td>
              <td style={cellStyle}>{city.sunset[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Section({
  index, title, meta, children, isMd,
}: {
  index: number
  title: string
  meta?: string
  children: React.ReactNode
  isMd: boolean
}) {
  const sectionPad = isMd ? '40px 0 0' : '28px 0 0'
  const innerPad = isMd ? '0' : '0'

  return (
    <section style={{
      padding: sectionPad,
      borderTop: index === 1 ? 'none' : `1px solid ${hairline}`,
      marginTop: index === 1 ? 0 : (isMd ? 40 : 28),
    }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2" style={{
        padding: innerPad,
        marginBottom: 6,
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 11,
          letterSpacing: 2,
          color: muted,
          textTransform: 'uppercase',
        }}>
          {String(index).padStart(2, '0')} / {title}
        </span>
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
      </div>
      <h2 style={{
        margin: '0 0 14px',
        fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
        fontSize: isMd ? 36 : 26,
        fontWeight: 600,
        letterSpacing: -0.5,
        lineHeight: 1.1,
        color: fg,
      }}>
        {title}
      </h2>
      <div style={{ padding: innerPad }}>
        {children}
      </div>
    </section>
  )
}

function Para({ children, isMd }: { children: React.ReactNode; isMd: boolean }) {
  return (
    <p style={{
      margin: 0,
      fontSize: isMd ? 18 : 16,
      lineHeight: 1.6,
      color: fg,
      maxWidth: 720,
    }}>
      {children}
    </p>
  )
}
