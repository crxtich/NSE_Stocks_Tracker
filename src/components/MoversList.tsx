import { Link } from 'react-router-dom'
import ChangeValue from './ChangeValue'
import { formatKsh } from '../lib/format'
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
    <div className="rounded-lg border border-canvas-border bg-canvas-raised p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</h3>
      <ul className="mt-3 divide-y divide-canvas-border/60">
        {rows.length === 0 && <li className="py-3 text-sm text-ink-faint">No data yet.</li>}
        {rows.map((row) => {
          const pct = row.changePct ?? 0
          const positive = pct >= 0
          const widthPct = maxAbsChange > 0 ? Math.min(100, (Math.abs(pct) / maxAbsChange) * 100) : 0
          return (
            <li key={row.ticker}>
              <Link
                to={`/stock/${row.ticker}`}
                className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-canvas"
              >
                <div className="w-28 shrink-0 sm:w-36">
                  <div className="font-mono text-xs font-semibold text-accent">{row.ticker}</div>
                  <div className="truncate text-xs text-ink-muted">{row.companyName}</div>
                </div>
                <div className="hidden flex-1 sm:block">
                  <div className="h-2 overflow-hidden rounded-full bg-canvas-border/60">
                    <div
                      className={`h-full rounded-full ${positive ? 'bg-gain/80' : 'bg-loss/80'}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
                <span className="ml-auto shrink-0 text-right text-xs text-ink-muted tabular sm:ml-0 sm:w-20">
                  {formatKsh(row.price)}
                </span>
                <span className="w-20 shrink-0 text-right text-sm">
                  <ChangeValue value={row.changePct} />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
