import { useMarketData } from '../lib/MarketDataContext'
import { SIGNAL_WINDOW_DAYS } from '../lib/analysis'

// Two of the four Market Signal Score components (Trend, Volume Confirmation)
// need SIGNAL_WINDOW_DAYS of price history and fall back to a neutral
// midpoint until then. This banner is entirely data-driven — it reads how
// much history has actually been collected and disappears on its own once
// that catches up, rather than hiding behind a hardcoded launch date.
export default function DataMaturityNotice() {
  const { daysOfHistory } = useMarketData()
  if (daysOfHistory >= SIGNAL_WINDOW_DAYS) return null

  return (
    <div className="rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm leading-relaxed text-ink">
      <span className="font-semibold text-accent">Scores are still stabilizing.</span> Trend and
      Volume Confirmation each need at least {SIGNAL_WINDOW_DAYS} trading days of price history and
      default to a neutral midpoint until then. The tracker has collected{' '}
      <span className="font-medium text-ink">
        {daysOfHistory} trading {daysOfHistory === 1 ? 'day' : 'days'}
      </span>{' '}
      of history so far — this notice disappears automatically once enough has built up.
    </div>
  )
}
