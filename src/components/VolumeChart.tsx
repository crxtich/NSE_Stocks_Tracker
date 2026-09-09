import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCompactVolume } from '../lib/format'

export interface VolumePoint {
  date: string
  volume: number | null
}

function VolumeTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-md border border-canvas-border bg-canvas-raised px-3 py-2 text-xs shadow-lg">
      <div className="text-ink-muted">{label}</div>
      <div className="mt-1 font-medium tabular text-ink">{formatCompactVolume(payload[0].value)} shares</div>
    </div>
  )
}

export default function VolumeChart({ data }: { data: VolumePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#242A32" vertical={false} />
        <XAxis dataKey="date" stroke="#565E6B" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={32} />
        <YAxis
          stroke="#565E6B"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v: number) => formatCompactVolume(v)}
        />
        <Tooltip content={<VolumeTooltip />} cursor={{ fill: '#242A32', opacity: 0.4 }} />
        <Bar dataKey="volume" fill="#8B93A1" radius={[2, 2, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
