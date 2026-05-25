import type { City } from '../data/cities'
import { MONTHS, MONTHS_LONG } from '../data/cities'
import { compareCities } from '../lib/comparison'
import { classifyClimate, climateLabel, peakAndTrough } from '../lib/climate-summary'
import { toSlug } from '../lib/slug'
import { CITY_A_COLOR, CITY_B_COLOR } from '../lib/colors'

const fg = '#111'
const bg = '#f0f1ed'
const muted = '#85847d'
const borderHard = '#111'
const borderSoft = 'rgba(17, 17, 17, 0.12)'

interface Props {
  a: City
  b: City
}

export function StaticComparisonSnapshot({ a, b }: Props) {
  const result = compareCities(a, b, 'C')
  const aClimate = classifyClimate(a)
  const bClimate = classifyClimate(b)
  const aPeak = peakAndTrough(a.high)
  const bPeak = peakAndTrough(b.high)
  const sharedClimate = aClimate === bClimate

  const aPath = toSlug(a).path
  const bPath = toSlug(b).path
  const aLocale = a.admin1 ? `${a.country} · ${a.admin1}` : a.country
  const bLocale = b.admin1 ? `${b.country} · ${b.admin1}` : b.country

  return (
    <div style={{ width: '100%', background: bg, color: fg, fontFamily: "'Inter Tight', Inter, system-ui, sans-serif", boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 32px' }}>

        {/* Breadcrumb */}
        <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: '1.5px', color: muted, textTransform: 'uppercase', marginBottom: 16 }}>
          <a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Climato</a>
          {' · '}
          <a href={aPath} style={{ color: CITY_A_COLOR, textDecoration: 'none' }}>{a.name}</a>
          {' vs '}
          <a href={bPath} style={{ color: CITY_B_COLOR, textDecoration: 'none' }}>{b.name}</a>
        </div>

        {/* H1 */}
        <h1 style={{ fontFamily: "'Inter Tight', Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 'clamp(44px, 12vw, 120px)', lineHeight: 0.9, letterSpacing: '-0.045em', textTransform: 'uppercase', wordBreak: 'break-word', margin: '0 0 12px 0' }}>
          <a href={aPath} style={{ color: CITY_A_COLOR, textDecoration: 'none' }}>{a.name}</a>
          {' '}
          <span style={{ color: muted, fontWeight: 400, fontSize: '0.4em', verticalAlign: '0.55em', letterSpacing: 0 }}>vs</span>
          {' '}
          <a href={bPath} style={{ color: CITY_B_COLOR, textDecoration: 'none' }}>{b.name}</a>
        </h1>

        <div style={{ fontSize: 18, color: muted, marginBottom: 24, maxWidth: 720 }}>
          When should you visit each — and when are both ideal?
        </div>

        {/* Peak-overlap hint */}
        {result.overlapFormatted && (
          <div style={{ display: 'inline-block', marginBottom: 28, padding: '10px 16px', background: 'rgba(90, 98, 64, 0.08)', borderLeft: `3px solid ${fg}` }}>
            <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: '1.5px', color: muted, textTransform: 'uppercase' }}>Best for both · </span>
            <strong>{result.overlapFormatted}</strong>
            <span style={{ fontSize: 13, color: muted, marginLeft: 8 }}>comfortable in both cities</span>
          </div>
        )}

        {/* Climate narrative */}
        <div style={{ padding: 24, background: '#fff', border: `1px solid ${borderHard}`, marginBottom: 32, maxWidth: 800 }}>
          <h2 style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: '1.5px', color: muted, textTransform: 'uppercase', margin: '0 0 12px 0' }}>
            Climate Overview
          </h2>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            <a href={aPath} style={{ color: CITY_A_COLOR, fontWeight: 600, textDecoration: 'none' }}>{a.name}</a> ({aLocale}) has a <strong>{climateLabel(aClimate)}</strong> climate
            {sharedClimate
              ? <>; <a href={bPath} style={{ color: CITY_B_COLOR, fontWeight: 600, textDecoration: 'none' }}>{b.name}</a> shares the same classification.</>
              : <>; <a href={bPath} style={{ color: CITY_B_COLOR, fontWeight: 600, textDecoration: 'none' }}>{b.name}</a> ({bLocale}) is classified as <strong>{climateLabel(bClimate)}</strong>.</>
            }
            {' '}
            <a href={aPath} style={{ color: CITY_A_COLOR, fontWeight: 600, textDecoration: 'none' }}>{a.name}</a>'s warmest month is <strong>{MONTHS_LONG[aPeak.peakIdx]}</strong> ({aPeak.peakValue}°C avg high);{' '}
            <a href={bPath} style={{ color: CITY_B_COLOR, fontWeight: 600, textDecoration: 'none' }}>{b.name}</a> peaks in <strong>{MONTHS_LONG[bPeak.peakIdx]}</strong> ({bPeak.peakValue}°C avg high).
          </p>
        </div>

        {/* Monthly breakdown — side-by-side */}
        <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: '1.5px', color: muted, textTransform: 'uppercase', marginBottom: 12 }}>
          Monthly Breakdown
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${borderHard}` }}>
          <CityTable city={a} color={CITY_A_COLOR} aPath={aPath} leftCol />
          <CityTable city={b} color={CITY_B_COLOR} aPath={bPath} />
        </div>

      </div>
    </div>
  )
}

function CityTable({ city, color, aPath, leftCol }: { city: City; color: string; aPath: string; leftCol?: boolean }) {
  return (
    <div style={{
      padding: 24,
      background: '#fff',
      borderLeft: `1px solid ${borderHard}`,
      borderRight: leftCol ? 'none' : `1px solid ${borderHard}`,
      borderTop: `1px solid ${borderHard}`,
      borderBottom: `1px solid ${borderHard}`,
    }}>
      <h2 style={{ fontFamily: "'Inter Tight', Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 42, letterSpacing: '-0.03em', margin: '0 0 4px 0', textTransform: 'uppercase', lineHeight: 0.92, color }}>
        <a href={aPath} style={{ color: 'inherit', textDecoration: 'none' }}>{city.name}</a>
      </h2>
      <div style={{ fontSize: 16, color: muted, marginBottom: 16 }}>
        {city.country}{city.admin1 ? ` · ${city.admin1}` : ''}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
        <thead>
          <tr>
            {['Month', 'High', 'Low', 'Rain', 'Sun'].map((h, i) => (
              <th key={h} style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: '1px', color: muted, textTransform: 'uppercase', borderBottom: `1px solid ${borderSoft}`, padding: '6px 4px', textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MONTHS.map((m, i) => (
            <tr key={m} style={{ background: i % 2 === 1 ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
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
