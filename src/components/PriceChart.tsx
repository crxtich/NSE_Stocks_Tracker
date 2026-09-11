import { useRef, useState, type MouseEvent } from 'react'
import { formatKsh } from '../lib/format'

export interface PricePoint {
  date: string
  price: number
  ma20: number | null
}

// Hand-rolled SVG chart — a fixed viewBox scaled responsively by CSS, with
// pointer position mapped back into data-space for the hover tooltip. Swaps
// out Recharts (~109kB gzip) for a dependency-free component doing exactly
// what this one chart needs.
const WIDTH = 600
const HEIGHT = 280
const PAD_LEFT = 48
const PAD_RIGHT = 8
const PAD_TOP = 10
const PAD_BOTTOM = 22
const PLOT_W = WIDTH - PAD_LEFT - PAD_RIGHT
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM

function niceTicks(min: number, max: number, count: number): number[] {
  if (min === max) return [min]
  const step = (max - min) / count
  return Array.from({ length: count + 1 }, (_, i) => min + step * i)
}

export default function PriceChart({ data }: { data: PricePoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  if (data.length === 0) return null

  const values = [data.map((d) => d.price), data.map((d) => d.ma20).filter((v): v is number => v !== null)].flat()
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const pad = (maxV - minV) * 0.1 || Math.abs(maxV) * 0.05 || 1
  const yMin = minV - pad
  const yMax = maxV + pad

  const xAt = (i: number) => PAD_LEFT + (data.length === 1 ? PLOT_W / 2 : (i / (data.length - 1)) * PLOT_W)
  const yAt = (v: number) => PAD_TOP + PLOT_H - ((v - yMin) / (yMax - yMin)) * PLOT_H

  const pricePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(d.price)}`).join(' ')
  const areaPath = `${pricePath} L ${xAt(data.length - 1)} ${PAD_TOP + PLOT_H} L ${xAt(0)} ${PAD_TOP + PLOT_H} Z`

  const maSegments: string[] = []
  let current: string[] = []
  data.forEach((d, i) => {
    if (d.ma20 === null) {
      if (current.length > 1) maSegments.push(current.join(' '))
      current = []
      return
    }
    current.push(`${current.length === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(d.ma20)}`)
  })
  if (current.length > 1) maSegments.push(current.join(' '))

  const yTicks = niceTicks(yMin, yMax, 4)
  const xLabelStep = Math.max(1, Math.ceil(data.length / 5))
  const xLabelIdxs = data.map((_, i) => i).filter((i) => i % xLabelStep === 0 || i === data.length - 1)

  function handleMove(e: MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const localX = ((e.clientX - rect.left) / rect.width) * WIDTH
    const ratio = Math.min(1, Math.max(0, (localX - PAD_LEFT) / PLOT_W))
    setHoverIdx(Math.round(ratio * (data.length - 1)))
  }

  const hovered = hoverIdx !== null ? data[hoverIdx] : null

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        style={{ height: HEIGHT }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'rgb(var(--color-accent))' }} stopOpacity={0.25} />
            <stop offset="100%" style={{ stopColor: 'rgb(var(--color-accent))' }} stopOpacity={0} />
          </linearGradient>
        </defs>

        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={yAt(t)} y2={yAt(t)} className="stroke-canvas-border" strokeWidth={1} />
            <text x={PAD_LEFT - 6} y={yAt(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} className="fill-ink-faint">
              {t.toLocaleString('en-KE', { maximumFractionDigits: 0 })}
            </text>
          </g>
        ))}

        {xLabelIdxs.map((i) => (
          <text key={data[i].date} x={xAt(i)} y={HEIGHT - 6} textAnchor="middle" fontSize={10} className="fill-ink-faint">
            {data[i].date}
          </text>
        ))}

        <path d={areaPath} fill="url(#priceFill)" stroke="none" />
        {maSegments.map((seg, i) => (
          <path key={i} d={seg} fill="none" className="stroke-ink-muted" strokeWidth={1.5} strokeDasharray="4 3" />
        ))}
        <path d={pricePath} fill="none" className="stroke-accent" strokeWidth={2} />

        {hoverIdx !== null && (
          <>
            <line
              x1={xAt(hoverIdx)}
              x2={xAt(hoverIdx)}
              y1={PAD_TOP}
              y2={PAD_TOP + PLOT_H}
              className="stroke-ink-muted"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle cx={xAt(hoverIdx)} cy={yAt(data[hoverIdx].price)} r={3.5} className="fill-accent" />
          </>
        )}
      </svg>

      {hovered && hoverIdx !== null && (
        <div
          className="pointer-events-none absolute top-2 rounded-md border border-canvas-border bg-canvas-raised px-3 py-2 text-xs shadow-lg"
          style={{ left: `${Math.min(78, Math.max(0, (xAt(hoverIdx) / WIDTH) * 100))}%` }}
        >
          <div className="text-ink-muted">{hovered.date}</div>
          <div className="mt-1 font-medium tabular text-ink">{formatKsh(hovered.price)}</div>
          {hovered.ma20 !== null && <div className="tabular text-ink-faint">MA20: {formatKsh(hovered.ma20)}</div>}
        </div>
      )}
    </div>
  )
}
