// supabase/functions/scrape-nse/index.ts
//
// Scheduled Edge Function that scrapes the NSE price list from
// https://live.mystocks.co.ke/m/pricelist and writes a snapshot of every
// row into `price_snapshots`. Intended to run on a Supabase cron schedule
// every 30 minutes, Mon–Fri, 09:00–15:30 EAT (see README for the exact
// `supabase functions schedule` / Dashboard cron setup).
//
// Also serves a lightweight health check:
//   GET /scrape-nse?health=true  ->  { status: "ok", last_scrape: <timestamp> }

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { DOMParser, type Element } from 'jsr:@b-fuze/deno-dom'

const SOURCE_URL = 'https://live.mystocks.co.ke/m/pricelist'

// NSE trading hours, Mon–Fri, in East Africa Time (UTC+3, no DST).
const TRADING_DAYS = new Set([1, 2, 3, 4, 5]) // Mon–Fri
const TRADING_OPEN_MINUTES = 9 * 60 // 09:00
const TRADING_CLOSE_MINUTES = 15 * 60 + 30 // 15:30

interface ParsedRow {
  ticker: string
  companyName: string
  price: number
  changeKsh: number | null
  changePct: number | null
  volume: number | null
}

interface RowFailure {
  index: number
  reason: string
  raw: string
}

function isMarketOpenNow(): boolean {
  const nowEat = new Date(Date.now() + 3 * 60 * 60 * 1000) // shift UTC -> EAT
  const day = nowEat.getUTCDay()
  const minutes = nowEat.getUTCHours() * 60 + nowEat.getUTCMinutes()
  return (
    TRADING_DAYS.has(day) &&
    minutes >= TRADING_OPEN_MINUTES &&
    minutes <= TRADING_CLOSE_MINUTES
  )
}

// Strips "Ksh", commas, "%", "+" and stray whitespace, then parses a number.
// Returns null (rather than throwing) when the cleaned string has no digits,
// so callers can treat missing/placeholder cells ("-", "N/A") as absent.
function parseNumericCell(raw: string | undefined | null): number | null {
  if (!raw) return null
  const cleaned = raw
    .replace(/ksh/gi, '')
    .replace(/[,+%\s]/g, '')
    .trim()
  if (cleaned === '' || cleaned === '-' || cleaned === 'N/A') return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

function textOf(el: Element | null | undefined): string {
  return (el?.textContent ?? '').trim()
}

// Parses the first data table on the price list page. The site's markup is
// out of our control, so this is deliberately defensive: it looks up cells
// by column header name where possible, falls back to positional indices,
// and never lets one malformed row abort the rest of the scrape.
function parsePriceTable(html: string): { rows: ParsedRow[]; failures: RowFailure[] } {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  if (!doc) throw new Error('Failed to parse HTML document')

  const table = doc.querySelector('table')
  if (!table) throw new Error('No <table> found on page')

  const headerCells = Array.from(table.querySelectorAll('thead th, tr:first-child th'))
    .map((th) => textOf(th).toLowerCase())

  const colIndex = (...names: string[]) =>
    headerCells.findIndex((h) => names.some((n) => h.includes(n)))

  // Fall back to the documented column order if header detection fails:
  // | # | Company | Ticker | Price | Change | % Change | Volume | ...
  const idx = {
    company: colIndex('company', 'name') >= 0 ? colIndex('company', 'name') : 1,
    ticker: colIndex('ticker', 'symbol', 'code') >= 0 ? colIndex('ticker', 'symbol', 'code') : 2,
    price: colIndex('price', 'last') >= 0 ? colIndex('price', 'last') : 3,
    change: colIndex('change') >= 0 && colIndex('%') < 0 ? colIndex('change') : 4,
    changePct: headerCells.findIndex((h) => h.includes('%')) >= 0
      ? headerCells.findIndex((h) => h.includes('%'))
      : 5,
    volume: colIndex('volume', 'vol') >= 0 ? colIndex('volume', 'vol') : 6,
  }

  const bodyRows = Array.from(table.querySelectorAll('tbody tr'))
  const dataRows = bodyRows.length > 0 ? bodyRows : Array.from(table.querySelectorAll('tr')).slice(1)

  const rows: ParsedRow[] = []
  const failures: RowFailure[] = []

  dataRows.forEach((tr, index) => {
    const raw = textOf(tr)
    try {
      const cells = Array.from(tr.querySelectorAll('td'))
      if (cells.length === 0) return // skip stray header/spacer rows

      const tickerRaw = textOf(cells[idx.ticker])
      const companyRaw = textOf(cells[idx.company])
      const priceRaw = textOf(cells[idx.price])

      const ticker = tickerRaw.toUpperCase().replace(/[^A-Z0-9.]/g, '')
      const companyName = companyRaw
      const price = parseNumericCell(priceRaw)

      if (!ticker || !companyName || price === null) {
        failures.push({ index, reason: 'missing ticker, company name, or price', raw })
        return
      }

      rows.push({
        ticker,
        companyName,
        price,
        changeKsh: parseNumericCell(textOf(cells[idx.change])),
        changePct: parseNumericCell(textOf(cells[idx.changePct])),
        volume: parseNumericCell(textOf(cells[idx.volume])),
      })
    } catch (err) {
      failures.push({ index, reason: err instanceof Error ? err.message : String(err), raw })
    }
  })

  return { rows, failures }
}

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set as function secrets')
  }
  // Service role key bypasses RLS — used only here, server-side, never sent to the frontend.
  return createClient(url, serviceKey)
}

async function handleHealthCheck(): Promise<Response> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('price_snapshots')
    .select('scraped_at')
    .order('scraped_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return Response.json({ status: 'error', message: error.message }, { status: 500 })
  }

  return Response.json({ status: 'ok', last_scrape: data?.scraped_at ?? null })
}

async function handleScrape(): Promise<Response> {
  const marketOpen = isMarketOpenNow()
  const supabase = getServiceClient()

  const response = await fetch(SOURCE_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NSEMarketIntelligenceBot/1.0)' },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: HTTP ${response.status}`)
  }
  const html = await response.text()

  const { rows, failures } = parsePriceTable(html)

  if (rows.length === 0) {
    return Response.json(
      { status: 'error', message: 'No rows parsed from price table', failures },
      { status: 500 },
    )
  }

  const scrapedAt = new Date().toISOString()
  const records = rows.map((row) => ({
    ticker: row.ticker,
    company_name: row.companyName,
    price: row.price,
    change_ksh: row.changeKsh,
    change_pct: row.changePct,
    volume: row.volume,
    scraped_at: scrapedAt,
  }))

  const { error: insertError } = await supabase.from('price_snapshots').insert(records)
  if (insertError) {
    throw new Error(`Insert failed: ${insertError.message}`)
  }

  return Response.json({
    status: 'ok',
    market_open: marketOpen,
    note: marketOpen
      ? undefined
      : 'Market is closed — prices are expected to be flat until the next session.',
    scraped_at: scrapedAt,
    rows_inserted: records.length,
    rows_failed: failures.length,
    failures: failures.slice(0, 20), // cap payload size; full detail is in the function logs
  })
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url)
    if (url.searchParams.get('health') === 'true') {
      return await handleHealthCheck()
    }
    return await handleScrape()
  } catch (err) {
    console.error('scrape-nse failed:', err)
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ status: 'error', message }, { status: 500 })
  }
})
