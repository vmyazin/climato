import React from 'react'
import type { GeoCity, City } from '../data/cities'
import { useCompareSuggestions } from '../hooks/useCompareSuggestions'
import { toCompareSlug, notifyUrlChange } from '../lib/route'
import { isResolvedCity } from '../lib/slug'
import { CitySearch } from './CitySearch'
import { OVERLAP_COLOR } from '../lib/colors'

const COLLAPSE_DELAY_MS = 300

interface Props {
  geo:  GeoCity
  city: City | undefined
  // Optional overrides for callers that want pill chrome to match a
  // specific variation's hero palette. Defaults are tuned for cream bg.
  fg?:    string
  muted?: string
  bg?:    string
  // Which edge the expanded panel anchors against the pill. Use 'right'
  // when the pill itself sits at the right edge of its container so the
  // panel doesn't overflow the viewport. Defaults to 'left'.
  align?: 'left' | 'right'
}

// Approximate panel width including padding/border — used to decide
// whether the panel would overflow the viewport if anchored to the
// caller's preferred edge.
const PANEL_APPROX_WIDTH = 380
const VIEWPORT_PADDING = 16

export function CompareWithPill({ geo, city, fg = '#111', muted = '#85847d', bg = '#ffffff', align = 'left' }: Props) {
  const [expanded, setExpanded] = React.useState(false)
  const [effectiveAlign, setEffectiveAlign] = React.useState<'left' | 'right'>(align)
  const collapseTimer = React.useRef<number | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const suggestions = useCompareSuggestions({ geo, city })

  // Don't show the pill for placeholder cities (lat=0/lon=0 first paint).
  if (!isResolvedCity(geo) || (geo.lat === 0 && geo.lon === 0)) return null

  // Pick the alignment that keeps the panel inside the viewport. The
  // caller's `align` prop is treated as a preference, overridden only
  // when the preferred edge would overflow. Measured against the pill's
  // current bounding rect, so this re-runs whenever the user expands
  // (and naturally handles resize since expansion re-measures).
  const decideAlignment = (): 'left' | 'right' => {
    const container = containerRef.current
    if (!container) return align
    const rect = container.getBoundingClientRect()
    const vw = window.innerWidth
    const fitsLeft = rect.left + PANEL_APPROX_WIDTH + VIEWPORT_PADDING <= vw
    const fitsRight = rect.right - PANEL_APPROX_WIDTH - VIEWPORT_PADDING >= 0
    if (align === 'left') return fitsLeft ? 'left' : (fitsRight ? 'right' : 'left')
    return fitsRight ? 'right' : (fitsLeft ? 'left' : 'right')
  }

  const expand = () => {
    if (collapseTimer.current) {
      window.clearTimeout(collapseTimer.current)
      collapseTimer.current = null
    }
    setEffectiveAlign(decideAlignment())
    setExpanded(true)
  }

  const scheduleCollapse = () => {
    if (collapseTimer.current) window.clearTimeout(collapseTimer.current)
    collapseTimer.current = window.setTimeout(() => setExpanded(false), COLLAPSE_DELAY_MS)
  }

  // Tap outside (mobile) → collapse
  React.useEffect(() => {
    if (!expanded) return
    function onDocPointer(e: PointerEvent) {
      const root = containerRef.current
      if (!root) return
      if (e.target instanceof Node && !root.contains(e.target)) {
        setExpanded(false)
      }
    }
    document.addEventListener('pointerdown', onDocPointer)
    return () => document.removeEventListener('pointerdown', onDocPointer)
  }, [expanded])

  // Escape collapses + refocuses pill
  React.useEffect(() => {
    if (!expanded) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [expanded])

  // Re-evaluate alignment on window resize while the panel is open. Without
  // this, a panel that was right-anchored at expand time might end up
  // overflowing the left edge after the user makes the window narrower.
  React.useEffect(() => {
    if (!expanded) return
    function onResize() {
      setEffectiveAlign(decideAlignment())
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // decideAlignment closes over `align` (a prop) — the effect re-binds
    // whenever align changes, which is exactly what we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, align])

  const navigateToCompare = (other: GeoCity) => {
    if (other.id === geo.id) return
    const { path } = toCompareSlug(geo, other)
    window.history.pushState(null, '', path)
    notifyUrlChange()
    setExpanded(false)
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={expand}
      onMouseLeave={scheduleCollapse}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        position: 'relative',
      }}
    >
      {/* Resting pill */}
      <button
        type="button"
        // Click always opens — never toggles closed (mouseEnter has usually
        // already opened it, so a toggle would immediately close). The
        // expanded panel is dismissed via mouse-leave grace, tap-outside,
        // or the Escape key — not a second click on the pill itself.
        onClick={expand}
        onFocus={expand}
        style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 11,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: fg,
          background: bg,
          border: `1px solid ${fg}`,
          padding: '7px 12px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          transition: 'background 0.15s, color 0.15s',
          minHeight: 32,
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.background = fg
          e.currentTarget.style.color = bg
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.background = bg
          e.currentTarget.style.color = fg
        }}
        aria-expanded={expanded}
        aria-haspopup="dialog"
        aria-controls="compare-with-panel"
        aria-label="Compare this city with another"
      >
        <span aria-hidden="true">↔</span>
        <span>Compare with …</span>
      </button>

      {expanded && (
        <ExpandedPanel
          geo={geo}
          fg={fg}
          muted={muted}
          bg={bg}
          align={effectiveAlign}
          suggestions={suggestions}
          onPick={navigateToCompare}
        />
      )}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────

interface ExpandedPanelProps {
  geo:       GeoCity
  fg:        string
  muted:     string
  bg:        string
  align:     'left' | 'right'
  suggestions: ReturnType<typeof useCompareSuggestions>
  onPick:    (city: GeoCity) => void
}

function ExpandedPanel({ geo, fg, muted, bg, align, suggestions, onPick }: ExpandedPanelProps) {
  const { nearby, climateSimilar, popular, combined, isLoading } = suggestions

  // Source-of-suggestion lookup so chips can carry a tiny mono tag.
  const sourceById = React.useMemo(() => {
    const map = new Map<string, { tag: string; tint: string }>()
    for (const c of nearby) map.set(c.id, { tag: 'NEAR', tint: muted })
    for (const c of climateSimilar) if (!map.has(c.id)) map.set(c.id, { tag: 'LIKE', tint: OVERLAP_COLOR })
    for (const c of popular) if (!map.has(c.id)) map.set(c.id, { tag: 'POP', tint: muted })
    return map
  }, [nearby, climateSimilar, popular, muted])

  return (
    <div
      id="compare-with-panel"
      role="dialog"
      aria-label={`Compare ${geo.name} with another city`}
      style={{
        // Float over the content below the pill instead of pushing it
        // down — keeps the page layout stable when the panel opens/closes.
        position: 'absolute',
        top: 'calc(100% + 6px)',
        ...(align === 'right' ? { right: 0 } : { left: 0 }),
        zIndex: 50,
        minWidth: 340,
        maxWidth: 560,
        padding: 14,
        border: `1px solid ${fg}`,
        background: bg,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 10,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: muted,
        }}
      >
        Compare {geo.name} with …
      </div>

      {combined.length === 0 && !isLoading && (
        <div style={{ fontSize: 13, color: muted }}>
          No suggested comparisons yet — try the search below.
        </div>
      )}

      {(combined.length > 0 || isLoading) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          {isLoading && combined.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <Chip key={`skel-${i}`} fg={fg} muted={muted} bg={bg} loading />
              ))
            : combined.map(c => {
                const src = sourceById.get(c.id)
                return (
                  <Chip
                    key={c.id}
                    label={c.name}
                    sourceTag={src?.tag}
                    sourceTint={src?.tint ?? muted}
                    fg={fg}
                    muted={muted}
                    bg={bg}
                    onClick={() => onPick(c)}
                  />
                )
              })}
        </div>
      )}

      <CitySearch
        value={geo}
        onPick={onPick}
        fg={fg}
        muted={muted}
        bg={bg}
        compact
      />
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────

interface ChipProps {
  label?:       string
  sourceTag?:   string
  sourceTint?:  string
  fg:           string
  muted:        string
  bg:           string
  loading?:     boolean
  onClick?:     () => void
}

function Chip({ label, sourceTag, sourceTint, fg, muted, bg, loading, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        fontFamily: "'Inter Tight', Inter, system-ui, sans-serif",
        fontSize: 13,
        color: fg,
        background: bg,
        border: `1px solid ${fg}`,
        padding: '6px 10px',
        cursor: loading ? 'wait' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        transition: 'background 0.15s, color 0.15s',
        minHeight: 28,
        ...(loading ? { color: muted, borderColor: muted } : {}),
      }}
      onMouseDown={(e) => {
        if (loading) return
        e.currentTarget.style.background = fg
        e.currentTarget.style.color = bg
      }}
      onMouseUp={(e) => {
        if (loading) return
        e.currentTarget.style.background = bg
        e.currentTarget.style.color = fg
      }}
    >
      {loading ? '…' : label}
      {sourceTag && !loading ? (
        <span
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 9,
            letterSpacing: '1px',
            color: sourceTint,
          }}
        >
          {sourceTag}
        </span>
      ) : null}
    </button>
  )
}
