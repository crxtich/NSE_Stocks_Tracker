import { useMemo } from 'react'
import { useMarketData } from '../lib/MarketDataContext'
import { usePageTitle } from '../hooks/usePageTitle'
import PriceTable, { type PriceRow } from '../components/PriceTable'
import MoversList from '../components/MoversList'
import UpdateCountdown from '../components/UpdateCountdown'
import SubscribeForm from '../components/SubscribeForm'
import { LoadingState, ErrorState, EmptyState } from '../components/StateViews'
import ChangeValue from '../components/ChangeValue'
import { formatCompactVolume } from '../lib/format'

export default function MarketOverview() {
  usePageTitle('Market Overview')
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

  const { gainers, losers, maxAbsChange } = useMemo(() => {
    const withChange = rows.filter((r) => r.changePct !== null)
    const sorted = [...withChange].sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))
    const gainers = sorted.slice(0, 5)
    const losers = sorted.slice(-5).reverse()
    const maxAbsChange = Math.max(0, ...[...gainers, ...losers].map((r) => Math.abs(r.changePct ?? 0)))
    return { gainers, losers, maxAbsChange }
  }, [rows])

  const breadth = useMemo(() => {
    const changes = rows.map((r) => r.changePct).filter((v): v is number => v !== null)
    const up = changes.filter((v) => v > 0).length
    const down = changes.filter((v) => v < 0).length
    const flat = changes.length - up - down
    const avg = changes.length ? changes.reduce((a, b) => a + b, 0) / changes.length : null
    const volume = rows.reduce((a, r) => a + (r.volume ?? 0), 0)
    return { up, down, flat, avg, volume, total: changes.length }
  }, [rows])

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Market Overview</h1>
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
          <section aria-label="Market summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="col-span-2 min-w-0 rounded-xl bg-navy p-5 text-white shadow-card">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">Market breadth</div>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-2xl font-bold">
                <span className="text-emerald-300">▲ {breadth.up}</span>
                <span className="text-red-300">▼ {breadth.down}</span>
                {breadth.flat > 0 && <span className="text-white/60">= {breadth.flat}</span>}
              </div>
              <div
                className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-white/15"
                role="img"
                aria-label={`${breadth.up} stocks up, ${breadth.down} down, ${breadth.flat} unchanged`}
              >
                <div className="bg-emerald-400" style={{ width: `${breadth.total ? (breadth.up / breadth.total) * 100 : 0}%` }} />
                <div className="bg-white/35" style={{ width: `${breadth.total ? (breadth.flat / breadth.total) * 100 : 0}%` }} />
                <div className="bg-red-400" style={{ width: `${breadth.total ? (breadth.down / breadth.total) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="card min-w-0 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Average move</div>
              <div className="kpi-value mt-1.5 text-2xl font-bold">
                <ChangeValue value={breadth.avg} />
              </div>
              <div className="mt-1 text-xs text-ink-faint">across {breadth.total} stocks</div>
            </div>
            <div className="card min-w-0 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Shares traded</div>
              <div className="kpi-value mt-1.5 text-2xl font-bold tabular text-ink" title={breadth.volume.toLocaleString()}>{formatCompactVolume(breadth.volume)}</div>
              <div className="mt-1 text-xs text-ink-faint">latest session</div>
            </div>
          </section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MoversList title="Biggest gainers" rows={gainers} maxAbsChange={maxAbsChange} />
            <MoversList title="Biggest losers" rows={losers} maxAbsChange={maxAbsChange} />
          </div>
          <PriceTable rows={rows} />
        </>
      )}

      <SubscribeForm />
    </div>
  )
}
