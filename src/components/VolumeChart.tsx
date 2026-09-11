import { useRef, useState, type MouseEvent } from 'react'
import { formatCompactVolume } from '../lib/format'

export interface VolumePoint {
  date: string
  volume: number | null
}

const WIDTH = 600
const HEIGHT = 120
const PAD_LEFT = 48
const PAD_RIGHT = 8
const PAD_TOP = 4
const PAD_BOTTOM = 4
const PLOT_W = WIDTH - PAD_LEFT - PAD_RIGHT
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM

export default function VolumeChart({ data }: { data: VolumePoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  if (data.length === 0) return null

  const maxV = Math.max(1, ...data.map((d) => d.volume ?? 0))
  const n = data.length
  const slot = PLOT_W / n
  const barW = Math.max(1, slot * 0.6)
  const xAt = (i: number) => PAD_LEFT + i * slot + (slot - barW) / 2
  const heightAt = (v: number) => (v / maxV) * PLOT_H

  function handleMove(e: MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const localX = ((e.clientX - rect.left) / rect.width) * WIDTH
    const ratio = Math.min(1, Math.max(0, (localX - PAD_LEFT) / PLOT_W))
    setHoverIdx(Math.min(n - 1, Math.floor(ratio * n)))
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
        <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={PAD_TOP + PLOT_H} y2={PAD_TOP + PLOT_H} className="stroke-canvas-border" strokeWidth={1} />
        <text x={PAD_LEFT - 6} y={PAD_TOP + PLOT_H} textAnchor="end" dominantBaseline="middle" fontSize={10} className="fill-ink-faint">
          0
        </text>
        <text x={PAD_LEFT - 6} y={PAD_TOP + 4} textAnchor="end" dominantBaseline="middle" fontSize={10} className="fill-ink-faint">
          {formatCompactVolume(maxV)}
        </text>

        {data.map((d, i) => (
          <rect
            key={d.date}
            x={xAt(i)}
            y={PAD_TOP + PLOT_H - heightAt(d.volume ?? 0)}
            width={barW}
            height={Math.max(0, heightAt(d.volume ?? 0))}
            rx={1.5}
            className={hoverIdx === i ? 'fill-accent' : 'fill-ink-muted'}
          />
        ))}
      </svg>

      {hovered && hoverIdx !== null && (
        <div
          className="pointer-events-none absolute top-0 rounded-md border border-canvas-border bg-canvas-raised px-3 py-2 text-xs shadow-lg"
          style={{ left: `${Math.min(78, Math.max(0, (xAt(hoverIdx) / WIDTH) * 100))}%` }}
        >
          <div className="text-ink-muted">{hovered.date}</div>
          <div className="mt-1 font-medium tabular text-ink">{formatCompactVolume(hovered.volume)} shares</div>
        </div>
      )}
    </div>
  )
}
