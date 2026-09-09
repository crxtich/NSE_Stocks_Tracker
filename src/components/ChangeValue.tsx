import { formatPct } from '../lib/format'

export default function ChangeValue({ value, decimals = 2 }: { value: number | null | undefined; decimals?: number }) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className="text-ink-faint">—</span>
  }
  const positive = value > 0
  const negative = value < 0
  return (
    <span
      className={`tabular font-medium ${positive ? 'text-gain' : negative ? 'text-loss' : 'text-ink-muted'}`}
    >
      {formatPct(value, decimals)}
    </span>
  )
}
