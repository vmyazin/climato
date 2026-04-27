import { CSSProperties } from 'react'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { CitySearch } from './CitySearch'
import { useWeatherStore } from '../store/weatherStore'

const fg = '#111'
const bg = '#f0f1ed'
const muted = '#85847d'

const VIEWS = [
  { id: 'a', label: 'A · CLASSIC' },
  { id: 'b', label: 'B · HERO' },
  { id: 'c', label: 'C · EDITORIAL' },
] as const

export function AppHeader() {
  const { selectedCity, setCity, unit, setUnit, activeView, setActiveView } = useWeatherStore()

  const btnBase: CSSProperties = {
    padding: '5px 11px',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 10,
    letterSpacing: 1.5,
    border: `1px solid ${fg}`,
    cursor: 'pointer',
    outline: 'none',
    marginLeft: -1,
    whiteSpace: 'nowrap',
  }
  const btn = (active: boolean): CSSProperties => ({
    ...btnBase,
    background: active ? fg : 'transparent',
    color: active ? bg : fg,
  })

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: bg, borderBottom: `1px solid ${fg}`,
      display: 'grid', gridTemplateColumns: 'auto 1fr auto',
      alignItems: 'center', gap: 24, padding: '0 32px', height: 56,
    }}>
      <div style={{ fontFamily: "'Inter Tight', Inter, system-ui, sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: -0.5, color: fg, whiteSpace: 'nowrap' }}>
        CLIMATE / ATLAS
      </div>

      <div style={{ minWidth: 0 }}>
        <CitySearch value={selectedCity} onPick={setCity} fg={fg} muted={muted} bg={bg} compact />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <ToggleGroup.Root type="single" value={activeView} onValueChange={v => { if (v) setActiveView(v as 'a' | 'b' | 'c') }} style={{ display: 'flex' }}>
          {VIEWS.map(v => (
            <ToggleGroup.Item key={v.id} value={v.id} style={btn(activeView === v.id)}>{v.label}</ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>

        <div style={{ width: 1, height: 20, background: `${fg}30` }} />

        <ToggleGroup.Root type="single" value={unit} onValueChange={v => { if (v) setUnit(v as 'C' | 'F') }} style={{ display: 'flex' }}>
          {(['C', 'F'] as const).map(u => (
            <ToggleGroup.Item key={u} value={u} style={btn(unit === u)}>°{u}</ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>

      </div>
    </header>
  )
}
