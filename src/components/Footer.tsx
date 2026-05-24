import { LogoMark } from './LogoMark'
import { useMediaQuery } from '../hooks/useMediaQuery'

interface FooterProps {
  sourcesLabel?: string
}

export function Footer({ sourcesLabel }: FooterProps) {
  const isMd = useMediaQuery('(min-width: 768px)')
  if (!isMd) return null
  return (
    <footer className="flex flex-col items-center gap-3 border-t border-[#111]/10 px-6 pb-8 pt-10 font-mono text-[10px] uppercase tracking-[1.5px] text-[#85847d]">
      <span className="text-[#111]">
        <LogoMark size={28} />
      </span>
      <div className="font-tight text-[13px] font-semibold normal-case tracking-[-0.2px] text-[#111]">
        CLIMATO
      </div>
      <div>Data · {sourcesLabel ?? 'Open-Meteo'}</div>
      <div>© Climato 2026</div>
    </footer>
  )
}
