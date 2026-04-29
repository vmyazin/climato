interface SmokedGlassOverlayProps {
  active: boolean
}

export function SmokedGlassOverlay({ active }: SmokedGlassOverlayProps) {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        pointerEvents: 'none',
        background: 'rgba(240, 241, 237, 0.55)',
        backdropFilter: 'blur(40px) saturate(120%)',
        WebkitBackdropFilter: 'blur(40px) saturate(120%)',
        maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 25%, black 70%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 25%, black 70%)',
        opacity: active ? 1 : 0,
        transition: 'opacity 2s ease',
      }}
    />
  )
}
