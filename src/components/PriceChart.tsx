import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatKsh } from '../lib/format'

export interface PricePoint {
  date: string
  price: number
  ma20: number | null
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null
  const price = payload.find((p) => p.dataKey === 'price')?.value
  const ma = payload.find((p) => p.dataKey === 'ma20')?.value
  return (
    <div className="rounded-md border border-canvas-border bg-canvas-raised px-3 py-2 text-xs shadow-lg">
      <div className="text-ink-muted">{label}</div>
      <div className="mt-1 font-medium tabular text-ink">{formatKsh(price)}</div>
      {ma !== undefined && ma !== null && (
        <div className="tabular text-ink-faint">MA20: {formatKsh(ma)}</div>
      )}
    </div>
  )
}

export default function PriceChart({ data }: { data: PricePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F0A93A" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#F0A93A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#242A32" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="#565E6B"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          minTickGap={32}
        />
        <YAxis
          stroke="#565E6B"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          domain={['auto', 'auto']}
          width={56}
        />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="price" stroke="none" fill="url(#priceFill)" isAnimationActive={false} />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#F0A93A"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="ma20"
          stroke="#8B93A1"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
