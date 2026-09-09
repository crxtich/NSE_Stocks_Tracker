import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMarketData } from '../lib/MarketDataContext'
import SignalScoreBadge from '../components/SignalScoreBadge'
import ChangeValue from '../components/ChangeValue'
import Disclaimer from '../components/Disclaimer'
import { formatKsh } from '../lib/format'
import { LoadingState, ErrorState, EmptyState } from '../components/StateViews'

export default function TopPicks() {
  const { loading, error, analyses } = useMarketData()
  const [showMethodology, setShowMethodology] = useState(false)

  const top10 = useMemo(
    () => [...analyses].sort((a, b) => b.signal.score - a.signal.score).slice(0, 10),
    [analyses],
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Top 10 Picks</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          The ten highest-scoring stocks on today's Market Signal Score, a purely quantitative
          ranking built from price and volume data alone.
        </p>
      </div>

      <Disclaimer />

      {loading && analyses.length === 0 && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && top10.length === 0 && (
        <EmptyState
          title="Not enough data yet"
          description="Signal scores need at least a few days of price history to compute. Check back once the scraper has run for a while."
        />
      )}

      {top10.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-canvas-border">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-canvas-border bg-canvas-panel text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-3 py-2.5 text-left font-medium">#</th>
                <th className="px-3 py-2.5 text-left font-medium">Company</th>
                <th className="px-3 py-2.5 text-right font-medium">Price</th>
                <th className="px-3 py-2.5 text-right font-medium">30-Day Return</th>
                <th className="px-3 py-2.5 text-left font-medium">Signal Score</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((a, i) => (
                <tr key={a.ticker} className="border-b border-canvas-border/60 last:border-0 hover:bg-canvas-panel/60">
                  <td className="px-3 py-3 text-ink-faint">{i + 1}</td>
                  <td className="px-3 py-3">
                    <Link to={`/stock/${a.ticker}`} className="hover:opacity-80">
                      <div className="font-mono text-xs font-semibold text-accent">{a.ticker}</div>
                      <div className="text-ink">{a.companyName}</div>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right tabular text-ink">{formatKsh(a.latestPrice)}</td>
                  <td className="px-3 py-3 text-right">
                    <ChangeValue value={a.returns.d30} />
                  </td>
                  <td className="px-3 py-3">
                    <SignalScoreBadge score={a.signal.score} band={a.signal.band} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border border-canvas-border bg-canvas-panel">
        <button
          type="button"
          onClick={() => setShowMethodology((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-ink"
        >
          How this ranking works
          <span className="text-ink-faint">{showMethodology ? '−' : '+'}</span>
        </button>
        {showMethodology && (
          <div className="space-y-3 border-t border-canvas-border px-4 py-4 text-sm leading-relaxed text-ink-muted">
            <p>
              Every stock gets a <span className="text-ink">Market Signal Score</span> from 0 to
              100, built entirely from price and trading-volume history — never from news,
              analyst opinions, or company fundamentals. It blends four ingredients:
            </p>
            <ul className="list-inside list-disc space-y-1.5">
              <li><span className="text-ink">Momentum (30%)</span> — how the stock's return over the last month compares to the average of every tracked stock.</li>
              <li><span className="text-ink">Trend (25%)</span> — whether the price is above or below its 20-day average, and whether that average is climbing or falling.</li>
              <li><span className="text-ink">Volatility-adjusted return (25%)</span> — the monthly return divided by how bumpy the ride was, rewarding steady gains over lucky swings.</li>
              <li><span className="text-ink">Volume confirmation (20%)</span> — whether trading activity supports the direction the price is moving.</li>
            </ul>
            <p>
              Stocks are then grouped into four bands: Strong Signal (75–100), Moderate Signal
              (50–74), Neutral (25–49), and Weak Signal (0–24). A high score means several
              quantitative indicators are pointing the same direction — it is not a prediction,
              and it is not a suggestion to buy or sell.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
