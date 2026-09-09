import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly in dev/build rather than silently returning empty data.
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your project values.',
  )
}

// Read-only from the frontend's perspective: the anon key can only SELECT,
// per the Row Level Security policies in supabase/migrations/001_initial_schema.sql.
// Falls back to a syntactically valid placeholder URL when env vars are missing
// so the app can still render its error/empty states instead of crashing outright.
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder')

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
  const { data, error } = await supabase.from('watchlist').select('*').order('ticker')
  if (error) throw error
  return data ?? []
}

// Fetches every snapshot within the last `days` days, across all tickers,
// ordered oldest -> newest so downstream analysis can walk it chronologically.
export async function fetchHistory(days: number): Promise<PriceSnapshot[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('price_snapshots')
    .select('*')
    .gte('scraped_at', since)
    .order('scraped_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function fetchTickerHistory(ticker: string, days: number): Promise<PriceSnapshot[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('price_snapshots')
    .select('*')
    .eq('ticker', ticker)
    .gte('scraped_at', since)
    .order('scraped_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

// The most recent snapshot per ticker — used for "current" price, change, volume.
export async function fetchLatestByTicker(): Promise<Map<string, PriceSnapshot>> {
  const { data, error } = await supabase
    .from('price_snapshots')
    .select('*')
    .order('scraped_at', { ascending: false })
    .limit(2000)
  if (error) throw error

  const latest = new Map<string, PriceSnapshot>()
  for (const row of data ?? []) {
    if (!latest.has(row.ticker)) latest.set(row.ticker, row)
  }
  return latest
}
