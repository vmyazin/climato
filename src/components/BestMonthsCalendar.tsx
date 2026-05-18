import React from 'react'
import type { City } from '../data/cities'
import { monthlySuitability, type SuitabilityClass } from '../lib/climate-summary'
import { CITY_A_COLOR, CITY_B_COLOR, OVERLAP_COLOR, SUITABILITY } from '../lib/colors'

// Single-letter month labels — used in the sidebar variant where horizontal
// space is constrained. Duplicate letters (J/J/M/M) are fine since React
// keys come from array indices, not from the letter content.
const MONTH_LETTERS = ['J','F','M','A','M','J','J','A','S','O','N','D'] as const
const MONTH_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'] as const

const borderHard = '#111'
const borderSoft = 'rgba(17, 17, 17, 0.12)'
const muted = '#85847d'
const headerBg = '#fafaf7'

interface Props {
  a: City
  b: City
  // 'sidebar' — narrow 420px column with single-letter month labels
  // 'wide'    — full-width / mobile-stack with 3-letter month labels
  variant?: 'sidebar' | 'wide'
}

function suitBg(score: SuitabilityClass): string {
  if (score === 0) return SUITABILITY.s0
  if (score === 1) return SUITABILITY.s1
  if (score === 2) return SUITABILITY.s2
  return SUITABILITY.s3
}

// Derive a compact row label from a city name. Falls back to the first three
// letters of the first word — good enough for most cases (Paris → PAR, London
// → LON, Reykjavík → REY). Long names with diacritics get ASCII-folded first.
function rowAbbrev(name: string): string {
  const first = name.split(/\s+/)[0] ?? ''
  return first
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .slice(0, 3)
    .toUpperCase()
}

export function BestMonthsCalendar({ a, b, variant = 'sidebar' }: Props) {
  const aScores = monthlySuitability(a)
  const bScores = monthlySuitability(b)
  const overlap: boolean[] = aScores.map((s, i) => s === 3 && bScores[i] === 3)

  const wide = variant === 'wide'
  const labels = wide ? MONTH_SHORT : MONTH_LETTERS
  const labelColPx = wide ? 70 : 44
  const cellHeightPx = wide ? 44 : 34
  const aLabel = rowAbbrev(a.name)
  const bLabel = rowAbbrev(b.name)

  const monoBase: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    letterSpacing: '1px',
    textTransform: 'uppercase',
  }

  const monthHead: React.CSSProperties = {
    ...monoBase,
    fontSize: wide ? 11 : 9,
    color: muted,
    padding: wide ? '10px 0' : '7px 0',
    textAlign: 'center',
    borderRight: `1px solid ${borderSoft}`,
    borderBottom: `1px solid ${borderHard}`,
    background: headerBg,
  }

  const baseRowLabel: React.CSSProperties = {
    ...monoBase,
    fontSize: wide ? 11 : 10,
    letterSpacing: '1.5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: muted,
    borderRight: `1px solid ${borderHard}`,
    background: headerBg,
  }

  const cellBase: React.CSSProperties = {
    height: cellHeightPx,
    borderRight: `1px solid ${borderSoft}`,
    borderBottom: `1px solid ${borderSoft}`,
    transition: 'filter 0.15s',
    cursor: 'pointer',
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `${labelColPx}px repeat(12, 1fr)`,
      border: `1px solid ${borderHard}`,
      background: headerBg,
    }}>
      {/* Top-left empty corner */}
      <div style={{ ...baseRowLabel, borderBottom: `1px solid ${borderHard}` }} />
      {/* Month headers */}
      {labels.map((label, i) => (
        <div
          key={`mh-${i}`}
          style={{
            ...monthHead,
            // The last month head has no right border so the grid edge is clean
            ...(i === 11 ? { borderRight: 'none' } : {}),
          }}
        >
          {label}
        </div>
      ))}

      {/* City A row */}
      <div style={{ ...baseRowLabel, color: CITY_A_COLOR, fontWeight: 600 }}>{aLabel}</div>
      {aScores.map((score, i) => (
        <div
          key={`a-${i}`}
          style={{
            ...cellBase,
            background: suitBg(score),
            ...(i === 11 ? { borderRight: 'none' } : {}),
          }}
          title={`${a.name} — score ${score}/3`}
        />
      ))}

      {/* City B row */}
      <div style={{ ...baseRowLabel, color: CITY_B_COLOR, fontWeight: 600 }}>{bLabel}</div>
      {bScores.map((score, i) => (
        <div
          key={`b-${i}`}
          style={{
            ...cellBase,
            background: suitBg(score),
            ...(i === 11 ? { borderRight: 'none' } : {}),
          }}
          title={`${b.name} — score ${score}/3`}
        />
      ))}

      {/* Both-ideal row */}
      <div style={{
        ...baseRowLabel,
        color: OVERLAP_COLOR,
        fontWeight: 600,
        background: 'rgba(90, 98, 64, 0.08)',
      }}>
        ★
      </div>
      {overlap.map((isBoth, i) => (
        <div
          key={`o-${i}`}
          style={{
            ...cellBase,
            background: isBoth ? OVERLAP_COLOR : SUITABILITY.s0,
            ...(i === 11 ? { borderRight: 'none' } : {}),
          }}
          title={isBoth ? 'Both ideal' : 'Not both ideal'}
        />
      ))}
    </div>
  )
}
