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
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${
        open
          ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-200'
          : 'border-white/20 bg-white/10 text-white/80'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${open ? 'bg-emerald-300' : 'bg-white/50'}`} />
      <span className="hidden sm:inline">Market </span>
      {open ? 'Open' : 'Closed'}
    </span>
  )
}
