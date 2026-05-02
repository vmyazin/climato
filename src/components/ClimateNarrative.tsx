import { City, MONTHS_LONG, cToF, mmToIn } from '../data/cities'
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
const bg = '#fff'

interface Props {
  city: City
  unit: 'C' | 'F'
}

// Auto-generated, scannable English text + a parseable monthly table.
// Renders below the visual variations so Googlebot — and any reader — gets
// real content to index, not just charts. All four sections live under their
// own <h2> for semantic SEO.
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
      <div className="flex flex-col gap-4" style={{ maxWidth: 1280, margin: '0 auto', padding: pad, paddingTop: 0 }}>

        <Section title="Climate Overview" subtitle={`${MONTHS_LONG[hi.peakIdx]} → ${MONTHS_LONG[lo.troughIdx]}`}>
          <Para>{overview}</Para>
        </Section>

        <Section title="Rainfall by Month" subtitle={`${mm(annualPrecip)} / year`}>
          <Para>{rainfall}</Para>
        </Section>

        <Section title="Best Time to Visit" subtitle={best ? best.formatted : 'no clear season'}>
          <Para>{bestTimeText}</Para>
        </Section>

        <Section title="Monthly Breakdown" subtitle={`12 months · °${unit} · ${unit === 'C' ? 'mm' : 'in'} · hours`}>
          <MonthlyTable city={city} t={tDecimal} mm={mm} isMd={isMd} />
        </Section>

      </div>
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
            <tr key={month}>
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
  title, subtitle, children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section style={{ border: `1px solid ${fg}`, background: bg }}>
      <header className="flex flex-wrap items-baseline justify-between gap-2" style={{
        padding: '10px 14px',
        borderBottom: `1px solid ${fg}`,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 11,
        letterSpacing: 1.5,
      }}>
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
        {subtitle && <span style={{ color: muted }}>{subtitle}</span>}
      </header>
      <div style={{ padding: '16px 18px' }}>
        {children}
      </div>
    </section>
  )
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: 0,
      fontSize: 15,
      lineHeight: 1.55,
      color: fg,
      maxWidth: 760,
    }}>
      {children}
    </p>
  )
}
