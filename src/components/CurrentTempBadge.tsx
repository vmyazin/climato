import { cToF } from '../data/cities'

interface Props {
  tempC: number | undefined
  unit: 'C' | 'F'
  fg: string
  muted: string
  accent: string
  variant?: 'inline' | 'block' | 'editorial'
}

function format(tempC: number, unit: 'C' | 'F'): string {
  const v = unit === 'C' ? tempC : cToF(tempC)
  return `${(Math.round(v * 10) / 10).toFixed(1)}°${unit}`
}

function LiveDot({ accent }: { accent: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: accent,
        boxShadow: `0 0 0 0 ${accent}66`,
        animation: 'climato-livedot 1.6s ease-out infinite',
        flexShrink: 0,
      }}
    />
  )
}

const liveDotKeyframes = `
@keyframes climato-livedot {
  0% { box-shadow: 0 0 0 0 rgba(204, 59, 31, 0.55); }
  70% { box-shadow: 0 0 0 8px rgba(204, 59, 31, 0); }
  100% { box-shadow: 0 0 0 0 rgba(204, 59, 31, 0); }
}
`

export function CurrentTempBadge({ tempC, unit, fg, muted, accent, variant = 'block' }: Props) {
  if (tempC === undefined) return null
  const value = format(tempC, unit)

  if (variant === 'inline') {
    return (
      <>
        <style>{liveDotKeyframes}</style>
        <div
          className="flex items-center gap-2.5 mt-3 w-fit"
          style={{
            border: `1px solid ${fg}`,
            padding: '6px 12px',
            background: '#fff',
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          }}
        >
          <LiveDot accent={accent} />
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: muted }}>NOW</span>
          <span
            style={{
              fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: -1,
              color: accent,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}
          >
            {value}
          </span>
        </div>
      </>
    )
  }

  if (variant === 'editorial') {
    return (
      <>
        <style>{liveDotKeyframes}</style>
        <div className="flex items-baseline gap-3.5 mt-3.5 pb-1">
          <span
            className="inline-flex items-center gap-2"
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 11,
              letterSpacing: 2,
              color: muted,
            }}
          >
            <LiveDot accent={accent} />
            RIGHT NOW
          </span>
          <span
            style={{
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: -1.5,
              color: accent,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}
          >
            {value}
          </span>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{liveDotKeyframes}</style>
      <div
        className="inline-flex items-center gap-3 whitespace-nowrap"
        style={{
          border: `1px solid ${fg}`,
          padding: '8px 14px',
          background: '#fff',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        }}
      >
        <LiveDot accent={accent} />
        <span style={{ fontSize: 10, letterSpacing: 1.5, color: muted }}>NOW</span>
        <span
          style={{
            fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: -1.2,
            color: accent,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}
        >
          {value}
        </span>
      </div>
    </>
  )
}
