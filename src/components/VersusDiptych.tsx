import React from 'react'
import type { City } from '../data/cities'
import { compareCities, type ComparisonStat, type Unit } from '../lib/comparison'
import { CITY_A_COLOR, CITY_B_COLOR } from '../lib/colors'
import { CityLink } from './CityLink'
import { useMediaQuery } from '../hooks/useMediaQuery'

const borderHard = '#111'
const borderSoft = 'rgba(17, 17, 17, 0.12)'
const muted = '#85847d'

const monoLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 10,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: muted,
}

const display: React.CSSProperties = {
  fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
  fontWeight: 700,
  letterSpacing: '-0.02em',
  fontVariantNumeric: 'tabular-nums',
}

interface Props {
  a: City
  b: City
  unit?: Unit
}

function colorFor(winner: ComparisonStat['winner']): string {
  if (winner === 'a') return CITY_A_COLOR
  if (winner === 'b') return CITY_B_COLOR
  return muted
}

function winnerArrow(winner: ComparisonStat['winner'], aName: string, bName: string): string {
  if (winner === 'a') return `◀ ${aName.toUpperCase()}`
  if (winner === 'b') return `${bName.toUpperCase()} ▶`
  return 'TIE'
}

export function VersusDiptych({ a, b, unit = 'C' }: Props) {
  const result = compareCities(a, b, unit)
  const isMd = useMediaQuery('(min-width: 768px)')

  return (
    <div style={{
      border: `1px solid ${borderHard}`,
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* City header row */}
      <DuelRow
        header
        isMd={isMd}
        leftBlock={
          <>
            <h2 style={{
              ...display,
              fontSize: isMd ? 'clamp(28px, 6vw, 56px)' : 'clamp(22px, 8vw, 30px)',
              lineHeight: 0.88,
              letterSpacing: '-0.035em',
              margin: 0,
              textTransform: 'uppercase',
              color: CITY_A_COLOR,
            }}>
              <CityLink city={a}>{a.name}</CityLink>
            </h2>
            <div style={{ ...monoLabel, marginTop: isMd ? 10 : 6, fontSize: isMd ? 10 : 9 }}>
              {a.country}{a.admin1 ? ` · ${a.admin1}` : ''}
            </div>
          </>
        }
        centerBlock={
          <span style={{
            fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
            fontWeight: 400,
            fontSize: isMd ? 22 : 14,
            color: muted,
            letterSpacing: '1px',
          }}>vs</span>
        }
        rightBlock={
          <>
            <h2 style={{
              ...display,
              fontSize: isMd ? 'clamp(28px, 6vw, 56px)' : 'clamp(22px, 8vw, 30px)',
              lineHeight: 0.88,
              letterSpacing: '-0.035em',
              margin: 0,
              textTransform: 'uppercase',
              color: CITY_B_COLOR,
              textAlign: 'right',
            }}>
              <CityLink city={b}>{b.name}</CityLink>
            </h2>
            <div style={{ ...monoLabel, marginTop: isMd ? 10 : 6, fontSize: isMd ? 10 : 9, textAlign: 'right' }}>
              {b.country}{b.admin1 ? ` · ${b.admin1}` : ''}
            </div>
          </>
        }
      />

      {/* One row per stat */}
      {result.stats.map((stat, i) => (
        <DuelRow
          key={`stat-${i}`}
          isMd={isMd}
          leftBlock={<StatSide stat={stat} side="a" isMd={isMd} />}
          centerBlock={<CenterCell stat={stat} aName={a.name} bName={b.name} isMd={isMd} />}
          rightBlock={<StatSide stat={stat} side="b" isMd={isMd} />}
        />
      ))}

      {/* Note: a PEAK OVERLAP row used to live here, but it duplicated the
          "Peak overlap" card already shown in the sticky-calendar sidebar,
          and both side columns rendered identical text. Removed for clarity. */}
    </div>
  )
}

// ---- Sub-components -----------------------------------------------------

function StatSide({ stat, side, isMd }: { stat: ComparisonStat; side: 'a' | 'b'; isMd: boolean }) {
  const value = side === 'a' ? stat.aValue : stat.bValue
  const color = side === 'a' ? CITY_A_COLOR : CITY_B_COLOR
  const align = side === 'b' ? 'right' : 'left'

  return (
    <>
      <div style={{
        ...monoLabel,
        fontSize: 9,
        color,
        marginBottom: 4,
        textAlign: align,
      }}>
        {stat.label}
      </div>
      <div style={{
        ...display,
        fontSize: isMd ? 40 : 22,
        lineHeight: 0.95,
        color,
        textAlign: align,
      }}>
        {value}
        <span style={{
          fontSize: isMd ? 18 : 12,
          color: muted,
          fontWeight: 500,
          marginLeft: 2,
        }}>{stat.unit}</span>
      </div>
    </>
  )
}

function CenterCell({ stat, aName, bName, isMd }: { stat: ComparisonStat; aName: string; bName: string; isMd: boolean }) {
  return (
    <>
      <div style={{ ...monoLabel, fontSize: 9 }}>{isMd ? 'DIFFERENCE' : 'Δ'}</div>
      <div style={{
        ...display,
        fontSize: isMd ? 18 : 13,
        color: '#cc3b1f', // brand red — reserved for verdict-word emphasis
      }}>
        {stat.delta}
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: isMd ? 10 : 8,
        letterSpacing: isMd ? '1px' : '0.5px',
        textTransform: 'uppercase',
        color: colorFor(stat.winner),
        textAlign: 'center',
      }}>
        {winnerArrow(stat.winner, aName, bName)}
      </div>
    </>
  )
}

interface DuelRowProps {
  leftBlock: React.ReactNode
  centerBlock: React.ReactNode
  rightBlock: React.ReactNode
  header?: boolean
  tint?: boolean
  isMd: boolean
}

function DuelRow({ leftBlock, centerBlock, rightBlock, header, tint, isMd }: DuelRowProps) {
  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'stretch',
    ...(header ? {
      borderBottom: `2px solid ${borderHard}`,
      background: 'rgba(0, 0, 0, 0.02)',
    } : {
      borderBottom: `1px solid ${borderSoft}`,
    }),
    ...(tint ? { background: 'rgba(90, 98, 64, 0.04)' } : {}),
  }

  const sidePad = isMd
    ? (header ? '22px 24px' : '18px 24px')
    : (header ? '14px 12px' : '12px 10px')
  const centerPad = isMd
    ? (header ? '22px 18px' : '12px 18px')
    : (header ? '14px 8px' : '10px 6px')

  return (
    <div style={rowStyle}>
      <div style={{
        padding: sidePad,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minWidth: 0,
      }}>
        {leftBlock}
      </div>
      <div style={{
        padding: centerPad,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        ...(header ? {
          background: 'transparent',
        } : {
          borderLeft: `1px solid ${borderSoft}`,
          borderRight: `1px solid ${borderSoft}`,
          background: 'rgba(17, 17, 17, 0.02)',
        }),
        minWidth: isMd ? 140 : 64,
      }}>
        {centerBlock}
      </div>
      <div style={{
        padding: sidePad,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-end',
        textAlign: 'right',
        minWidth: 0,
      }}>
        {rightBlock}
      </div>
    </div>
  )
}
