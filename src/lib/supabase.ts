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

// Reads from a view that exposes only the aggregate count, never individual
// rows — newsletter_subscribers itself has no RLS policies granting the
// anon key any access at all (see supabase/migrations/004_newsletter_subscriber_count.sql).
export async function fetchSubscriberCount(): Promise<number> {
  const rows = await restGet<{ count: number }[]>('newsletter_subscriber_count?select=count')
  return rows[0]?.count ?? 0
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

const EXPORT_PAGE_SIZE = 1000
// Safety cap so a runaway "all data" export can't page forever — well above
// what the tracker will realistically accumulate for a long while.
const EXPORT_MAX_ROWS = 100_000

// Fetches every snapshot between two optional bounds (either end omitted
// means unbounded), across every tracked ticker, paginating past PostgREST's
// default row cap so a full-history export isn't silently truncated.
export async function fetchSnapshotsInRange(
  fromIso: string | null,
  toIso: string | null,
): Promise<PriceSnapshot[]> {
  const filters: string[] = []
  if (fromIso) filters.push(`scraped_at=gte.${encodeURIComponent(fromIso)}`)
  if (toIso) filters.push(`scraped_at=lte.${encodeURIComponent(toIso)}`)
  const filterQuery = filters.map((f) => `&${f}`).join('')

  const rows: PriceSnapshot[] = []
  let offset = 0
  while (rows.length < EXPORT_MAX_ROWS) {
    const page = await restGet<PriceSnapshot[]>(
      `price_snapshots?select=*${filterQuery}&order=scraped_at.asc&limit=${EXPORT_PAGE_SIZE}&offset=${offset}`,
    )
    rows.push(...page)
    if (page.length < EXPORT_PAGE_SIZE) break
    offset += EXPORT_PAGE_SIZE
  }
  return rows
}
