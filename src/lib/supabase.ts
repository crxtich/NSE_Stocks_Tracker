// Talks to Supabase's auto-generated PostgREST API directly over `fetch` —
// no @supabase/supabase-js client. The frontend only ever does simple,
// read-only GET queries against two tables, so the ~59kB gzip client
// library (built for auth flows, realtime, storage, etc. this app never
// uses) isn't worth shipping to every visitor.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fails loudly in dev/build rather than silently returning empty data.
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your project values.',
  )
}

// Read-only from the frontend's perspective: the anon key can only SELECT,
// per the Row Level Security policies in supabase/migrations/001_initial_schema.sql.
async function restGet<T>(path: string): Promise<T> {
  const url = `${SUPABASE_URL}/rest/v1/${path}`
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  })
  if (!res.ok) throw new Error(`Supabase request failed (${res.status}): ${path}`)
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

export async function fetchWatchlist(): Promise<WatchlistEntry[]> {
  return restGet<WatchlistEntry[]>('watchlist?select=*&order=ticker')
}

// Fetches every snapshot within the last `days` days, across all tickers,
// ordered oldest -> newest so downstream analysis can walk it chronologically.
export async function fetchHistory(days: number): Promise<PriceSnapshot[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  return restGet<PriceSnapshot[]>(
    `price_snapshots?select=*&scraped_at=gte.${encodeURIComponent(since)}&order=scraped_at.asc`,
  )
}
