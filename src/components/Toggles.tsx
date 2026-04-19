import * as ToggleGroup from '@radix-ui/react-toggle-group'

interface TogglesProps {
  unit: 'C' | 'F'
  setUnit: (u: 'C' | 'F') => void
  chartVariant: 'bar' | 'line' | 'ring'
  setChartVariant: (v: 'bar' | 'line' | 'ring') => void
  fg?: string
  accent?: string
  muted?: string
  bg?: string
  row?: boolean
}

const btnStyle = (active: boolean, fg: string, bg: string) => ({
  padding: '8px 14px',
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 11,
  letterSpacing: 1.5,
  background: active ? fg : 'transparent',
  color: active ? bg : fg,
  border: `1px solid ${fg}`,
  cursor: 'pointer',
  textTransform: 'uppercase' as const,
  marginLeft: -1,
  outline: 'none',
})

export function Toggles({ unit, setUnit, chartVariant, setChartVariant, fg = '#111', bg = '#fff', row = false }: TogglesProps) {
  return (
    <div style={{ display: 'flex', flexDirection: row ? 'row' : 'column', gap: 10, alignItems: row ? 'center' : 'flex-end' }}>
      <ToggleGroup.Root
        type="single"
        value={unit}
        onValueChange={v => { if (v) setUnit(v as 'C' | 'F') }}
        style={{ display: 'flex' }}
      >
        {(['C', 'F'] as const).map(u => (
          <ToggleGroup.Item
            key={u}
            value={u}
            style={btnStyle(unit === u, fg, bg)}
          >
            °{u}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>

      <ToggleGroup.Root
        type="single"
        value={chartVariant}
        onValueChange={v => { if (v) setChartVariant(v as 'bar' | 'line' | 'ring') }}
        style={{ display: 'flex' }}
      >
        {(['bar', 'line', 'ring'] as const).map(v => (
          <ToggleGroup.Item
            key={v}
            value={v}
            style={btnStyle(chartVariant === v, fg, bg)}
          >
            {v.toUpperCase()}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  )
}

export function UnitToggle({ unit, setUnit, fg = '#111', bg = '#fff' }: Pick<TogglesProps, 'unit' | 'setUnit' | 'fg' | 'bg'>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={unit}
      onValueChange={v => { if (v) setUnit(v as 'C' | 'F') }}
      style={{ display: 'flex', gap: 6 }}
    >
      {(['C', 'F'] as const).map(u => (
        <ToggleGroup.Item
          key={u}
          value={u}
          style={{
            padding: '4px 10px',
            border: `1px solid ${fg}`,
            background: unit === u ? fg : 'transparent',
            color: unit === u ? bg : fg,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 11, letterSpacing: 1.5, cursor: 'pointer',
            outline: 'none',
          }}
        >
          °{u}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}

export function ChartToggle({ chartVariant, setChartVariant, fg = '#111', bg = '#fff' }: Pick<TogglesProps, 'chartVariant' | 'setChartVariant' | 'fg' | 'bg'>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={chartVariant}
      onValueChange={v => { if (v) setChartVariant(v as 'bar' | 'line' | 'ring') }}
      style={{ display: 'flex', gap: 4 }}
    >
      {(['bar', 'line', 'ring'] as const).map(v => (
        <ToggleGroup.Item
          key={v}
          value={v}
          style={{
            padding: '3px 8px',
            border: `1px solid ${fg}`,
            background: chartVariant === v ? fg : 'transparent',
            color: chartVariant === v ? bg : fg,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 10, letterSpacing: 1.5, cursor: 'pointer',
            outline: 'none',
          }}
        >
          {v.toUpperCase()}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
