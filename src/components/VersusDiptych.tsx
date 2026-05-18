import React from 'react'
import type { City } from '../data/cities'
import { compareCities, type ComparisonStat } from '../lib/comparison'
import { CITY_A_COLOR, CITY_B_COLOR } from '../lib/colors'

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

export function VersusDiptych({ a, b }: Props) {
  const result = compareCities(a, b)

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
        leftBlock={
          <>
            <h2 style={{
              ...display,
              fontSize: 'clamp(28px, 6vw, 56px)',
              lineHeight: 0.88,
              letterSpacing: '-0.035em',
              margin: 0,
              textTransform: 'uppercase',
              color: CITY_A_COLOR,
            }}>
              {a.name}
            </h2>
            <div style={{ ...monoLabel, marginTop: 10 }}>
              {a.country}{a.admin1 ? ` · ${a.admin1}` : ''}
            </div>
          </>
        }
        centerBlock={
          <span style={{
            fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
            fontWeight: 400,
            fontSize: 22,
            color: muted,
            letterSpacing: '1px',
          }}>vs</span>
        }
        rightBlock={
          <>
            <h2 style={{
              ...display,
              fontSize: 'clamp(28px, 6vw, 56px)',
              lineHeight: 0.88,
              letterSpacing: '-0.035em',
              margin: 0,
              textTransform: 'uppercase',
              color: CITY_B_COLOR,
              textAlign: 'right',
            }}>
              {b.name}
            </h2>
            <div style={{ ...monoLabel, marginTop: 10, textAlign: 'right' }}>
              {b.country}{b.admin1 ? ` · ${b.admin1}` : ''}
            </div>
          </>
        }
      />

      {/* One row per stat */}
      {result.stats.map((stat, i) => (
        <DuelRow
          key={`stat-${i}`}
          leftBlock={<StatSide stat={stat} side="a" />}
          centerBlock={<CenterCell stat={stat} aName={a.name} bName={b.name} />}
          rightBlock={<StatSide stat={stat} side="b" />}
        />
      ))}

      {/* Note: a PEAK OVERLAP row used to live here, but it duplicated the
          "Peak overlap" card already shown in the sticky-calendar sidebar,
          and both side columns rendered identical text. Removed for clarity. */}
    </div>
  )
}

// ---- Sub-components -----------------------------------------------------

function StatSide({ stat, side }: { stat: ComparisonStat; side: 'a' | 'b' }) {
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
        fontSize: 40,
        lineHeight: 0.95,
        color,
        textAlign: align,
      }}>
        {value}
        <span style={{
          fontSize: 18,
          color: muted,
          fontWeight: 500,
          marginLeft: 2,
        }}>{stat.unit}</span>
      </div>
    </>
  )
}

function CenterCell({ stat, aName, bName }: { stat: ComparisonStat; aName: string; bName: string }) {
  return (
    <>
      <div style={{ ...monoLabel, fontSize: 9 }}>DIFFERENCE</div>
      <div style={{
        ...display,
        fontSize: 18,
        color: '#cc3b1f', // brand red — reserved for verdict-word emphasis
      }}>
        {stat.delta}
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 10,
        letterSpacing: '1px',
        textTransform: 'uppercase',
        color: colorFor(stat.winner),
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
}

function DuelRow({ leftBlock, centerBlock, rightBlock, header, tint }: DuelRowProps) {
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

  const sidePad = header ? '22px 24px' : '18px 24px'

  return (
    <div style={rowStyle}>
      <div style={{
        padding: sidePad,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        {leftBlock}
      </div>
      <div style={{
        padding: header ? '22px 18px' : '12px 18px',
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
        minWidth: 140,
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
      }}>
        {rightBlock}
      </div>
    </div>
  )
}
