import { useEffect, useState } from 'react'
import { isMarketOpen } from '../lib/format'

export default function MarketStatusBadge() {
  const [open, setOpen] = useState(() => isMarketOpen())

  useEffect(() => {
    const id = setInterval(() => setOpen(isMarketOpen()), 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        open
          ? 'border-gain/30 bg-gain-soft text-gain'
          : 'border-canvas-border bg-canvas-panel text-ink-muted'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${open ? 'bg-gain' : 'bg-ink-faint'}`} />
      {open ? 'Market Open' : 'Market Closed'}
    </span>
  )
}
