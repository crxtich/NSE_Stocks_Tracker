import { formatPct } from '../lib/format'

function formatSignedKsh(value: number, decimals: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toLocaleString('en-KE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

export default function ChangeValue({
  value,
  decimals = 2,
  unit = 'pct',
  arrow = true,
}: {
  value: number | null | undefined
  decimals?: number
  unit?: 'pct' | 'ksh'
  arrow?: boolean
}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className="text-ink-faint">—</span>
  }
  const positive = value > 0
  const negative = value < 0
  const text = unit === 'ksh' ? formatSignedKsh(value, decimals) : formatPct(value, decimals).replace('-', '−')
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap font-mono text-[0.92em] font-medium tabular ${
        positive ? 'text-gain' : negative ? 'text-loss' : 'text-ink-muted'
      }`}
    >
      {arrow && (positive || negative) && (
        <span aria-hidden="true" className="text-[0.7em]">
          {positive ? '▲' : '▼'}
        </span>
      )}
      {text}
    </span>
  )
}
