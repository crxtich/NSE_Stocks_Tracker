import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useMarketData } from '../lib/MarketDataContext'
import SignalScoreBadge from '../components/SignalScoreBadge'
import ChangeValue from '../components/ChangeValue'
import Disclaimer from '../components/Disclaimer'
import { formatKsh } from '../lib/format'
import { LoadingState, ErrorState, EmptyState } from '../components/StateViews'

export default function Watchlist() {
  const { loading, error, watchlist, getAnalysis } = useMarketData()

  const rows = useMemo(
    () =>
      watchlist
        .map((entry) => ({ entry, analysis: getAnalysis(entry.ticker) }))
        .sort((a, b) => (b.analysis?.signal.score ?? -1) - (a.analysis?.signal.score ?? -1)),
    [watchlist, getAnalysis],
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">My Watchlist</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          {watchlist.length} tracked {watchlist.length === 1 ? 'company' : 'companies'}, with the
          same quantitative analysis applied to every stock on the exchange.
        </p>
      </div>

      <Disclaimer variant="compact" />

      {loading && rows.length === 0 && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && rows.length === 0 && (
        <EmptyState title="Watchlist unavailable" description="Couldn't load the watchlist table." />
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-canvas-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-canvas-border bg-canvas-panel text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-3 py-2.5 text-left font-medium">Company</th>
                <th className="px-3 py-2.5 text-right font-medium">
                  Price <span className="hidden sm:inline">/ 30D Return</span>
                </th>
                <th className="px-3 py-2.5 text-left font-medium">Signal Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ entry, analysis }) => (
                <tr key={entry.ticker} className="border-b border-canvas-border/60 last:border-0 hover:bg-canvas-panel/60">
                  <td className="px-3 py-3">
                    <Link to={`/stock/${entry.ticker}`} className="hover:opacity-80">
                      <div className="font-mono text-xs font-semibold text-accent">{entry.ticker}</div>
                      <div className="max-w-[130px] truncate text-ink sm:max-w-none">{entry.company_name}</div>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="tabular text-ink">
                      {analysis ? formatKsh(analysis.latestPrice) : <span className="text-ink-faint">—</span>}
                    </div>
                    <div className="mt-0.5 text-xs">
                      <ChangeValue value={analysis?.returns.d30 ?? null} />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {analysis ? (
                      <SignalScoreBadge score={analysis.signal.score} band={analysis.signal.band} size="sm" animate={false} />
                    ) : (
                      <span className="text-xs text-ink-faint">No data yet</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
