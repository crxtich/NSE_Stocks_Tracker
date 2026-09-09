import { Link } from 'react-router-dom'
import ChangeValue from './ChangeValue'
import { formatKsh } from '../lib/format'
import type { PriceRow } from './PriceTable'

export default function MoversList({ title, rows }: { title: string; rows: PriceRow[] }) {
  return (
    <div className="rounded-lg border border-canvas-border bg-canvas-panel p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</h3>
      <ul className="mt-3 divide-y divide-canvas-border/60">
        {rows.length === 0 && <li className="py-3 text-sm text-ink-faint">No data yet.</li>}
        {rows.map((row) => (
          <li key={row.ticker}>
            <Link
              to={`/stock/${row.ticker}`}
              className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80"
            >
              <div className="min-w-0">
                <div className="font-mono text-xs font-semibold text-accent">{row.ticker}</div>
                <div className="truncate text-xs text-ink-muted">{row.companyName}</div>
              </div>
              <div className="flex shrink-0 flex-col items-end">
                <span className="tabular text-sm text-ink">{formatKsh(row.price)}</span>
                <ChangeValue value={row.changePct} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
