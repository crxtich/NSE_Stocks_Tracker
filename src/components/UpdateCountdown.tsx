import { useEffect, useState } from 'react'
import { formatEatTime, isMarketOpen } from '../lib/format'

const UPDATE_INTERVAL_MS = 30 * 60 * 1000

export default function UpdateCountdown({ lastUpdated }: { lastUpdated: string | null }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!lastUpdated) {
    return <span className="text-xs text-ink-faint">No data yet</span>
  }

  const lastMs = new Date(lastUpdated).getTime()
  const nextMs = lastMs + UPDATE_INTERVAL_MS
  const remainingMs = Math.max(0, nextMs - now)
  const minutes = Math.floor(remainingMs / 60_000)
  const seconds = Math.floor((remainingMs % 60_000) / 1000)

  return (
    <div className="flex flex-col items-start gap-0.5 text-xs text-ink-muted sm:items-end">
      <span>Last updated {formatEatTime(lastUpdated)} EAT</span>
      {isMarketOpen() && (
        <span className="tabular text-ink-faint">
          Next update in {minutes}m {seconds.toString().padStart(2, '0')}s
        </span>
      )}
    </div>
  )
}
