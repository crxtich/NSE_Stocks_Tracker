import { Link } from 'react-router-dom'
import { formatPct } from '../lib/format'
import type { PriceRow } from './PriceTable'

export default function MoversList({
  title,
  rows,
  maxAbsChange,
}: {
  title: string
  rows: PriceRow[]
  /** Largest |% change| across both the up and down lists, so bar lengths are comparable between the two cards. */
  maxAbsChange: number
}) {
  return (
    <div className="rounded-lg border border-canvas-border bg-canvas-panel p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</h3>
      <ul className="mt-3 divide-y divide-canvas-border/60">
        {rows.length === 0 && <li className="py-3 text-sm text-ink-faint">No data yet.</li>}
        {rows.map((row) => {
          const pct = row.changePct ?? 0
          const positive = pct >= 0
          const widthPct = maxAbsChange > 0 ? Math.min(100, (Math.abs(pct) / maxAbsChange) * 100) : 0
          return (
            <li key={row.ticker}>
              <Link to={`/stock/${row.ticker}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                <div className="w-28 shrink-0 sm:w-36">
                  <div className="font-mono text-xs font-semibold text-accent">{row.ticker}</div>
                  <div className="truncate text-xs text-ink-muted">{row.companyName}</div>
                </div>
                <div className="flex h-5 flex-1 items-center">
                  <div
                    className={`h-3.5 rounded-sm ${positive ? 'bg-gain' : 'bg-loss'}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span
                  className={`w-16 shrink-0 text-right text-sm font-semibold tabular ${positive ? 'text-gain' : 'text-loss'}`}
                >
                  {formatPct(row.changePct)}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
