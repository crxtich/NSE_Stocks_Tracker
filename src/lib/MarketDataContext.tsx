import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  fetchHistory,
  fetchWatchlist,
  type PriceSnapshot,
  type WatchlistEntry,
} from './supabase'
import {
  analyzeTicker,
  buildMarketDailyReturns,
  distinctTradingDayCount,
  toDailyCloses,
  type TickerAnalysis,
} from './analysis'

const HISTORY_WINDOW_DAYS = 120

interface MarketDataState {
  loading: boolean
  error: string | null
  lastUpdated: string | null
  watchlist: WatchlistEntry[]
  /** Every ticker seen in the scraped data, analysed — includes tickers outside the watchlist too. */
  analyses: TickerAnalysis[]
  /** Most recent snapshot per ticker — current price, session change, volume. */
  latestByTicker: Map<string, PriceSnapshot>
  getAnalysis: (ticker: string) => TickerAnalysis | undefined
  /** Distinct calendar days of price history collected so far, across every tracked ticker. */
  daysOfHistory: number
}

const MarketDataContext = createContext<MarketDataState | null>(null)

export function MarketDataProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<PriceSnapshot[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([fetchHistory(HISTORY_WINDOW_DAYS), fetchWatchlist()])
      .then(([historyRows, watchlistRows]) => {
        if (cancelled) return
        setHistory(historyRows)
        setWatchlist(watchlistRows)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load market data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const { analyses, lastUpdated } = useMemo(() => {
    const nameByTicker = new Map<string, string>()
    for (const row of history) nameByTicker.set(row.ticker, row.company_name)
    for (const w of watchlist) nameByTicker.set(w.ticker, w.company_name)

    const byTicker = new Map<string, PriceSnapshot[]>()
    for (const row of history) {
      const list = byTicker.get(row.ticker)
      if (list) list.push(row)
      else byTicker.set(row.ticker, [row])
    }

    const dailyByTicker = new Map<string, ReturnType<typeof toDailyCloses>>()
    for (const [ticker, rows] of byTicker) dailyByTicker.set(ticker, toDailyCloses(rows))

    const marketDailyReturns = buildMarketDailyReturns(dailyByTicker)

    const results: TickerAnalysis[] = []
    for (const [ticker, rows] of byTicker) {
      const analysis = analyzeTicker(ticker, nameByTicker.get(ticker) ?? ticker, rows, marketDailyReturns)
      if (analysis) results.push(analysis)
    }

    const latest = history.reduce<string | null>((max, row) => {
      if (!max || row.scraped_at > max) return row.scraped_at
      return max
    }, null)

    return { analyses: results, lastUpdated: latest }
  }, [history, watchlist])

  const analysisByTicker = useMemo(() => {
    const map = new Map<string, TickerAnalysis>()
    for (const a of analyses) map.set(a.ticker, a)
    return map
  }, [analyses])

  const latestByTicker = useMemo(() => {
    const map = new Map<string, PriceSnapshot>()
    for (const row of history) {
      const existing = map.get(row.ticker)
      if (!existing || row.scraped_at > existing.scraped_at) map.set(row.ticker, row)
    }
    return map
  }, [history])

  const daysOfHistory = useMemo(() => distinctTradingDayCount(history), [history])

  const value: MarketDataState = {
    loading,
    error,
    lastUpdated,
    watchlist,
    analyses,
    latestByTicker,
    getAnalysis: (ticker: string) => analysisByTicker.get(ticker),
    daysOfHistory,
  }

  return <MarketDataContext.Provider value={value}>{children}</MarketDataContext.Provider>
}

export function useMarketData(): MarketDataState {
  const ctx = useContext(MarketDataContext)
  if (!ctx) throw new Error('useMarketData must be used within a MarketDataProvider')
  return ctx
}
