import React from 'react'
import { GeoCity } from '../data/cities'
import { useCitySearch } from '../hooks/useCitySearch'

interface CitySearchProps {
  value: GeoCity
  onPick: (city: GeoCity) => void
  fg?: string
  muted?: string
  bg?: string
  compact?: boolean
}

export function CitySearch({ value, onPick, fg = '#111', muted = '#8a8578', bg = '#fff', compact = false }: CitySearchProps) {
  const [q, setQ] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [idx, setIdx] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const boxRef = React.useRef<HTMLDivElement>(null)

  const { data: results = [] } = useCitySearch(q)

  React.useEffect(() => { setIdx(0) }, [q])

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const pick = (c: GeoCity) => {
    onPick(c)
    setQ('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setIdx(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[idx]) pick(results[idx]) }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
  }

  const padV = compact ? 10 : 14
  const fontPx = compact ? 13 : 15

  return (
    <div ref={boxRef} style={{ position: 'relative', width: '100%', zIndex: 20 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        borderTop: `1px solid ${fg}`, borderBottom: `1px solid ${fg}`,
        padding: `${padV}px 14px`, background: bg,
      }}>
        <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: 1.5, color: muted, borderRight: `1px solid ${muted}`, paddingRight: 10 }}>◎</span>
        <input
          ref={inputRef}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={`${value.name.toUpperCase()} — TYPE TO CHANGE`}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
            fontSize: fontPx, fontWeight: 500, letterSpacing: 0.5, color: fg,
            textTransform: q ? 'none' : 'uppercase',
          }}
        />
        <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: 1.5, color: muted }}>↵</span>
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: bg, borderLeft: `1px solid ${fg}`, borderRight: `1px solid ${fg}`,
          borderBottom: `1px solid ${fg}`, zIndex: 50,
          boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
        }}>
          {results.map((c, i) => {
            const active = i === idx
            return (
              <div key={c.id} onMouseEnter={() => setIdx(i)} onMouseDown={e => { e.preventDefault(); pick(c) }}
                style={{
                  display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 12, alignItems: 'center',
                  padding: '12px 14px',
                  background: active ? fg : 'transparent', color: active ? bg : fg,
                  borderTop: i === 0 ? 'none' : `1px solid ${fg}14`, cursor: 'pointer',
                }}
              >
                <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, opacity: 0.7, letterSpacing: 1 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontFamily: "'Inter Tight', Inter, system-ui, sans-serif", fontSize: 15, fontWeight: 500, letterSpacing: -0.1 }}>
                  {c.name}
                  <span style={{ opacity: active ? 0.7 : 0.5, marginLeft: 10, fontWeight: 400 }}>{c.country}</span>
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, opacity: 0.7, letterSpacing: 0.5 }}>
                  {c.lat >= 0 ? '+' : ''}{c.lat.toFixed(2)}, {c.lon >= 0 ? '+' : ''}{c.lon.toFixed(2)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
