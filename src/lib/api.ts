// Talks to the self-hosted api-server (Express + Postgres, api-server/) over
// a relative `/api/` path — nginx proxies that to the Node process on
// 127.0.0.1:3015 in production, and vite.config.ts proxies it the same way
// in local dev. No client library, no API key: this box has no public write
// path for these routes, so there's nothing to authenticate for reads.
async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api/${path}`)
  if (!res.ok) throw new Error(`API request failed (${res.status}): ${path}`)
  return res.json() as Promise<T>
}

export interface PriceSnapshot {
  id: number
  ticker: string
  company_name: string
  price: number
  change_ksh: number | null
  change_pct: number | null
  volume: number | null
  scraped_at: string
}

export interface WatchlistEntry {
  ticker: string
  company_name: string
  added_at: string
}

export async function fetchSubscriberCount(): Promise<number> {
  const { count } = await apiGet<{ count: number }>('subscriber-count')
  return count
}

export async function fetchWatchlist(): Promise<WatchlistEntry[]> {
  return apiGet<WatchlistEntry[]>('watchlist')
}

// Fetches every snapshot within the last `days` days, across all tickers,
// ordered oldest -> newest so downstream analysis can walk it chronologically.
export async function fetchHistory(days: number): Promise<PriceSnapshot[]> {
  return apiGet<PriceSnapshot[]>(`history?days=${days}`)
}

// Fetches every snapshot between two optional bounds (either end omitted
// means unbounded), across every tracked ticker. The API caps this at
// 100,000 rows server-side, well above what the tracker will realistically
// accumulate for a long while.
export async function fetchSnapshotsInRange(
  fromIso: string | null,
  toIso: string | null,
): Promise<PriceSnapshot[]> {
  const params = new URLSearchParams()
  if (fromIso) params.set('from', fromIso)
  if (toIso) params.set('to', toIso)
  return apiGet<PriceSnapshot[]>(`snapshots?${params.toString()}`)
}
