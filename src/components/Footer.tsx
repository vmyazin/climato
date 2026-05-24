import { LogoMark } from './LogoMark'
import { useMediaQuery } from '../hooks/useMediaQuery'

const fg = '#111'
const muted = '#85847d'

interface FooterProps {
  sourcesLabel?: string
}

export function Footer({ sourcesLabel }: FooterProps) {
  const isMd = useMediaQuery('(min-width: 768px)')
  if (!isMd) return null
  return (
    <footer
      className="flex flex-col items-center gap-3"
      style={{
        padding: '40px 24px 32px',
        borderTop: `1px solid ${fg}1a`,
        color: muted,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 10,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
      }}
    >
      <LogoMark size={28} style={{ color: fg }} />
      <div style={{ color: fg, fontFamily: "'Inter Tight', Inter, system-ui, sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: -0.2, textTransform: 'none' }}>
        CLIMATO
      </div>
      <div>Data · {sourcesLabel ?? 'Open-Meteo'}</div>
      <div>© Climato 2026</div>
    </footer>
  )
}
