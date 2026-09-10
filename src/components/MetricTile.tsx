import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import Tooltip from './Tooltip'

export default function MetricTile({
  label,
  technical,
  help,
  value,
  sub,
}: {
  label: string
  technical: string
  help: string
  value: ReactNode
  sub?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-canvas-border bg-canvas-panel px-4 py-3.5">
      <Tooltip text={`${technical} — ${help}`}>
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-ink-muted"
        >
          {label}
          <Info className="h-3 w-3 text-ink-faint" strokeWidth={1.75} />
        </button>
      </Tooltip>
      <div className="mt-1.5 text-lg font-semibold tabular text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-muted">{sub}</div>}
    </div>
  )
}
