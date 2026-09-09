import { useMemo } from 'react'
import { useMarketData } from '../lib/MarketDataContext'
import PriceTable, { type PriceRow } from '../components/PriceTable'
import MoversList from '../components/MoversList'
import UpdateCountdown from '../components/UpdateCountdown'
import { LoadingState, ErrorState, EmptyState } from '../components/StateViews'

export default function MarketOverview() {
  const { loading, error, latestByTicker, lastUpdated } = useMarketData()

  const rows: PriceRow[] = useMemo(
    () =>
      Array.from(latestByTicker.values()).map((s) => ({
        ticker: s.ticker,
        companyName: s.company_name,
        price: s.price,
        changeKsh: s.change_ksh,
        changePct: s.change_pct,
        volume: s.volume,
      })),
    [latestByTicker],
  )

  const { gainers, losers } = useMemo(() => {
    const withChange = rows.filter((r) => r.changePct !== null)
    const sorted = [...withChange].sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))
    return { gainers: sorted.slice(0, 5), losers: sorted.slice(-5).reverse() }
  }, [rows])

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Market Overview</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Live prices for every stock tracked on the Nairobi Securities Exchange.
          </p>
        </div>
        <UpdateCountdown lastUpdated={lastUpdated} />
      </div>

      {loading && rows.length === 0 && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          title="No price data yet"
          description="Once the scraper runs its first cycle, live prices will appear here automatically."
        />
      )}

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MoversList title="Top 5 Movers — Up" rows={gainers} />
            <MoversList title="Top 5 Movers — Down" rows={losers} />
          </div>
          <PriceTable rows={rows} />
        </>
      )}
    </div>
  )
}
