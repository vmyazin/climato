import { City, MONTHS, cToF } from '../data/cities'

interface ChartProps {
  city: City
  unit: 'C' | 'F'
  variant?: 'bar' | 'line' | 'ring'
  width?: number
  height?: number
  fg?: string
  accent?: string
  muted?: string
  bg?: string
}

interface InnerProps {
  highs: number[]
  lows: number[]
  yMin: number
  yMax: number
  width: number
  height: number
  fg: string
  accent: string
  muted: string
  suffix: string
}

export function MonthlyChart({
  city, unit, variant = 'bar',
  width = 720, height = 220,
  fg = '#111', accent = '#cc3b1f', muted = '#8a8578', bg = '#fff',
}: ChartProps) {
  const highs = unit === 'C' ? city.high : city.high.map(cToF)
  const lows  = unit === 'C' ? city.low  : city.low.map(cToF)

  const allVals = [...highs, ...lows]
  const dataMin = Math.min(...allVals)
  const dataMax = Math.max(...allVals)
  const step = unit === 'C' ? 10 : 20
  const yMin = Math.floor(dataMin / step) * step
  const yMax = Math.ceil(dataMax / step) * step
  const suffix = '°'

  const props: InnerProps = { highs, lows, yMin, yMax, width, height, fg, accent, muted, suffix }

  if (variant === 'bar')  return <BarChart {...props} />
  if (variant === 'line') return <LineChart {...props} />
  return <RingChart {...props} bg={bg} />
}

function BarChart({ highs, lows, yMin, yMax, width, height, fg, accent, muted: _muted, suffix }: InnerProps) {
  const padL = 44, padR = 16, padT = 20, padB = 36
  const w = width - padL - padR
  const h = height - padT - padB
  const colW = w / 12
  const barW = Math.min(18, colW * 0.36)
  const y = (v: number) => padT + h - ((v - yMin) / (yMax - yMin)) * h

  const step = (yMax - yMin) <= 40 ? 10 : 20
  const ticks: number[] = []
  for (let t = yMin; t <= yMax; t += step) ticks.push(t)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block' }}>
      {ticks.map(t => (
        <g key={t}>
          <line x1={padL} y1={y(t)} x2={width - padR} y2={y(t)} stroke={fg} strokeOpacity={t === 0 ? 0.5 : 0.1} strokeWidth={t === 0 ? 1 : 0.5} />
          <text x={padL - 8} y={y(t) + 3} textAnchor="end" fontFamily="'JetBrains Mono', ui-monospace, monospace" fontSize="10" fill={fg} fillOpacity="0.6">{t}{suffix}</text>
        </g>
      ))}
      <line x1={padL} y1={padT} x2={padL} y2={padT + h} stroke={fg} strokeWidth="1" />
      <line x1={padL} y1={padT + h} x2={width - padR} y2={padT + h} stroke={fg} strokeWidth="1" />

      {highs.map((hi, i) => {
        const lo = lows[i]
        const cx = padL + colW * i + colW / 2
        const yHi = y(hi), yLo = y(lo)
        const yBase = padT + h  // always the bottom axis
        return (
          <g key={i}>
            <rect x={cx - barW} y={yLo} width={barW} height={yBase - yLo} fill="none" stroke={fg} strokeWidth="1" />
            <rect x={cx} y={yHi} width={barW} height={yBase - yHi} fill={accent} />
            <text x={cx} y={padT + h + 16} textAnchor="middle" fontFamily="'JetBrains Mono', ui-monospace, monospace" fontSize="10" fill={fg} fillOpacity="0.8" letterSpacing="1">{MONTHS[i]}</text>
            <text x={cx - barW + barW/2} y={yLo - 4} textAnchor="middle" fontFamily="'JetBrains Mono', ui-monospace, monospace" fontSize="9" fill={fg} fillOpacity="0.6">{Math.round(lo)}</text>
            <text x={cx + barW/2} y={yHi - 4} textAnchor="middle" fontFamily="'JetBrains Mono', ui-monospace, monospace" fontSize="9" fill={accent}>{Math.round(hi)}</text>
          </g>
        )
      })}

      <g transform={`translate(${width - padR - 150}, ${padT - 8})`}>
        <rect x="0" y="-8" width="10" height="10" fill={accent} />
        <text x="14" y="1" fontFamily="'JetBrains Mono', ui-monospace, monospace" fontSize="10" fill={fg}>HIGH</text>
        <rect x="56" y="-8" width="10" height="10" fill="none" stroke={fg} />
        <text x="70" y="1" fontFamily="'JetBrains Mono', ui-monospace, monospace" fontSize="10" fill={fg}>LOW</text>
      </g>
    </svg>
  )
}

function LineChart({ highs, lows, yMin, yMax, width, height, fg, accent, suffix }: InnerProps) {
  const padL = 44, padR = 16, padT = 20, padB = 36
  const w = width - padL - padR
  const h = height - padT - padB
  const colW = w / 12
  const y = (v: number) => padT + h - ((v - yMin) / (yMax - yMin)) * h
  const x = (i: number) => padL + colW * i + colW / 2

  const toPath = (arr: number[]) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const band = `${toPath(highs)} ${lows.slice().reverse().map((v, j) => `L ${x(11 - j).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')} Z`

  const step = (yMax - yMin) <= 40 ? 10 : 20
  const ticks: number[] = []
  for (let t = yMin; t <= yMax; t += step) ticks.push(t)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block' }}>
      {ticks.map(t => (
        <g key={t}>
          <line x1={padL} y1={y(t)} x2={width - padR} y2={y(t)} stroke={fg} strokeOpacity={t === 0 ? 0.5 : 0.1} strokeWidth={t === 0 ? 1 : 0.5} />
          <text x={padL - 8} y={y(t) + 3} textAnchor="end" fontFamily="'JetBrains Mono', ui-monospace, monospace" fontSize="10" fill={fg} fillOpacity="0.6">{t}{suffix}</text>
        </g>
      ))}
      <line x1={padL} y1={padT} x2={padL} y2={padT + h} stroke={fg} />
      <line x1={padL} y1={padT + h} x2={width - padR} y2={padT + h} stroke={fg} />
      <path d={band} fill={accent} fillOpacity="0.12" />
      <path d={toPath(highs)} fill="none" stroke={accent} strokeWidth="1.5" />
      <path d={toPath(lows)} fill="none" stroke={fg} strokeWidth="1" strokeDasharray="3 3" />
      {highs.map((hi, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(hi)} r="3" fill={accent} />
          <circle cx={x(i)} cy={y(lows[i])} r="2.5" fill={fg} />
          <text x={x(i)} y={padT + h + 16} textAnchor="middle" fontFamily="'JetBrains Mono', ui-monospace, monospace" fontSize="10" fill={fg} fillOpacity="0.8" letterSpacing="1">{MONTHS[i]}</text>
        </g>
      ))}
    </svg>
  )
}

function RingChart({ highs, lows, yMin, yMax, width, height, fg, accent, suffix, bg: _bg = '#fff' }: InnerProps & { bg?: string }) {
  const size = Math.min(width, height)
  const cx = width / 2, cy = height / 2
  const rMax = size / 2 - 30
  const rMin = size / 2 * 0.28
  const val = (v: number) => rMin + ((v - yMin) / (yMax - yMin)) * (rMax - rMin)
  const angle = (i: number) => (i / 12) * Math.PI * 2 - Math.PI / 2
  const polar = (r: number, a: number): [number, number] => [cx + Math.cos(a) * r, cy + Math.sin(a) * r]

  const toClosedPath = (arr: number[]) => {
    let d = ''
    arr.forEach((v, i) => {
      const [px, py] = polar(val(v), angle(i))
      d += `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)} `
    })
    return d + 'Z'
  }

  const step = (yMax - yMin) <= 40 ? 10 : 20
  const refs: number[] = []
  for (let t = yMin; t <= yMax; t += step) refs.push(t)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block' }}>
      {refs.map(t => (
        <g key={t}>
          <circle cx={cx} cy={cy} r={val(t)} fill="none" stroke={fg} strokeOpacity={t === 0 ? 0.4 : 0.1} strokeWidth={t === 0 ? 1 : 0.5} />
          <text x={cx + 4} y={cy - val(t)} fontFamily="'JetBrains Mono', ui-monospace, monospace" fontSize="9" fill={fg} fillOpacity="0.5">{t}{suffix}</text>
        </g>
      ))}
      {Array.from({ length: 12 }).map((_, i) => {
        const [xo, yo] = polar(rMin, angle(i))
        const [xi, yi] = polar(rMax + 10, angle(i))
        return <line key={i} x1={xo} y1={yo} x2={xi} y2={yi} stroke={fg} strokeOpacity="0.12" strokeWidth="0.5" />
      })}
      <path d={toClosedPath(lows)} fill={fg} fillOpacity="0.06" stroke={fg} strokeWidth="1" strokeDasharray="3 3" />
      <path d={toClosedPath(highs)} fill={accent} fillOpacity="0.12" stroke={accent} strokeWidth="1.5" />
      {highs.map((hi, i) => {
        const [px, py] = polar(val(hi), angle(i))
        return <circle key={i} cx={px} cy={py} r="3" fill={accent} />
      })}
      {lows.map((lo, i) => {
        const [px, py] = polar(val(lo), angle(i))
        return <circle key={i} cx={px} cy={py} r="2.5" fill={fg} />
      })}
      {Array.from({ length: 12 }).map((_, i) => {
        const [lx, ly] = polar(rMax + 22, angle(i))
        return (
          <text key={i} x={lx} y={ly + 3} textAnchor="middle" fontFamily="'JetBrains Mono', ui-monospace, monospace" fontSize="10" fill={fg} fillOpacity="0.8" letterSpacing="1">
            {MONTHS[i]}
          </text>
        )
      })}
    </svg>
  )
}

export function SmallBars({ data, fg, accent, unit, height }: {
  data: number[]; fg: string; accent: string; unit: string; height: number
}) {
  const max = Math.max(...data)
  const padL = 40, padR = 16, padT = 20, padB = 28
  const width = 580
  const h = height - padT - padB
  const w = width - padL - padR
  const colW = w / 12
  const barW = Math.min(18, colW * 0.42)
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block' }}>
      <line x1={padL} y1={padT + h} x2={width - padR} y2={padT + h} stroke={fg} />
      <text x={padL - 8} y={padT + 8} textAnchor="end" fontFamily="'JetBrains Mono', ui-monospace, monospace" fontSize="10" fill={fg} fillOpacity="0.6">{max.toFixed(max < 10 ? 1 : 0)}{unit}</text>
      <text x={padL - 8} y={padT + h + 2} textAnchor="end" fontFamily="'JetBrains Mono', ui-monospace, monospace" fontSize="10" fill={fg} fillOpacity="0.6">0</text>
      {data.map((v, i) => {
        const bh = (v / max) * h
        const cx = padL + colW * i + colW / 2
        return (
          <g key={i}>
            <rect x={cx - barW/2} y={padT + h - bh} width={barW} height={bh} fill={accent} />
            <text x={cx} y={padT + h + 16} textAnchor="middle" fontFamily="'JetBrains Mono', ui-monospace, monospace" fontSize="10" fill={fg} fillOpacity="0.8" letterSpacing="1">{MONTHS[i]}</text>
          </g>
        )
      })}
    </svg>
  )
}
