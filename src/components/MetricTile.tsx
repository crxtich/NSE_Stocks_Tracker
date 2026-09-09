import type { ReactNode } from 'react'
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
          <svg viewBox="0 0 16 16" className="h-3 w-3 text-ink-faint" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 7.2v3.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="8" cy="5.1" r="0.9" fill="currentColor" />
          </svg>
        </button>
      </Tooltip>
      <div className="mt-1.5 text-lg font-semibold tabular text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-muted">{sub}</div>}
    </div>
  )
}
