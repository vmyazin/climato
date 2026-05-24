import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { CitySearch } from './CitySearch'
import { LogoMark } from './LogoMark'
import { useWeatherStore } from '../store/weatherStore'
import { useMediaQuery } from '../hooks/useMediaQuery'

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
  const isMd = useMediaQuery('(min-width: 768px)')

  const btnBase = 'cursor-pointer whitespace-nowrap border border-[#111] font-mono tracking-[1.5px] -ml-px outline-none'
  const btnColor = (active: boolean) => active ? 'bg-[#111] text-[#f0f1ed]' : 'bg-transparent text-[#111]'
  const desktopBtn = (active: boolean) => `${btnBase} px-[11px] py-[5px] text-[10px] ${btnColor(active)}`
  const mobileUnitBtn = (active: boolean) => `${btnBase} min-h-9 min-w-11 px-3 py-1.5 text-[11px] ${btnColor(active)}`

  // Mobile bottom bar button (larger touch target)
  const mobileBtn = (active: boolean) =>
    `min-h-12 flex-1 cursor-pointer whitespace-nowrap border-0 border-t-2 bg-transparent px-1 py-2.5 font-mono text-[10px] tracking-[1.2px] outline-none ${
      active ? 'border-t-[#111] text-[#111]' : 'border-t-transparent text-[#85847d]'
    }`

  if (isMd) {
    // Desktop: original 3-column sticky header
    return (
      <header className="sticky top-0 z-[100] grid h-14 grid-cols-[auto_1fr_auto] items-center gap-6 border-b border-[#111] bg-[#f0f1ed] px-8">
        <div className="flex items-center gap-2.5 whitespace-nowrap font-tight text-lg font-bold tracking-[-0.5px] text-[#111]">
          <LogoMark size={36} />
          CLIMATO
        </div>

        <div className="min-w-0">
          <CitySearch value={selectedCity} onPick={setCity} fg={fg} muted={muted} bg={bg} compact />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <ToggleGroup.Root type="single" value={activeView} onValueChange={v => { if (v) setActiveView(v as 'a' | 'b' | 'c') }} className="flex">
            {VIEWS.map(v => (
              <ToggleGroup.Item key={v.id} value={v.id} className={desktopBtn(activeView === v.id)}>{v.label}</ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>

          <div className="h-5 w-px bg-[#111]/30" />

          <ToggleGroup.Root type="single" value={unit} onValueChange={v => { if (v) setUnit(v as 'C' | 'F') }} className="flex">
            {(['C', 'F'] as const).map(u => (
              <ToggleGroup.Item key={u} value={u} className={desktopBtn(unit === u)}>°{u}</ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </div>
      </header>
    )
  }

  // Mobile: two-row header + bottom bar for view switching
  return (
    <>
      {/* Sticky top bar: logo + unit toggle + search */}
      <header className="sticky top-0 z-[100] border-b border-[#111] bg-[#f0f1ed]">
        {/* Row 1: brand + unit */}
        <div className="flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-tight text-[17px] font-bold tracking-[-0.5px] text-[#111]">
            <LogoMark size={30} />
            CLIMATO
          </div>
          <ToggleGroup.Root type="single" value={unit} onValueChange={v => { if (v) setUnit(v as 'C' | 'F') }} className="flex">
            {(['C', 'F'] as const).map(u => (
              <ToggleGroup.Item key={u} value={u} className={mobileUnitBtn(unit === u)}>°{u}</ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </div>
        {/* Row 2: search full-width */}
        <div>
          <CitySearch value={selectedCity} onPick={setCity} fg={fg} muted={muted} bg={bg} compact />
        </div>
      </header>

      {/* Fixed bottom bar: view switcher */}
      <div className="fixed inset-x-0 bottom-0 z-[100] flex border-t border-[#111] bg-[#f0f1ed] pb-[max(0px,env(safe-area-inset-bottom))]">
        <ToggleGroup.Root
          type="single"
          value={activeView}
          onValueChange={v => { if (v) setActiveView(v as 'a' | 'b' | 'c') }}
          className="flex w-full"
        >
          {VIEWS.map(v => (
            <ToggleGroup.Item key={v.id} value={v.id} className={mobileBtn(activeView === v.id)}>
              {v.label}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      </div>
    </>
  )
}
