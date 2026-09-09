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
//
// Page structure (confirmed against the live site): a single #pricelist
// table with four columns — NAME (ticker, linked), Price, Change (an up/down
// arrow glyph plus a percentage — there is no separate absolute-KES change
// on this page), and Volume (plain numbers, comma-separated, or "1.23M"-style
// abbreviations for large counts). Section header rows ("Banking",
// "Insurance", ...) are <th> rows with no <td class=nm>, so they're filtered
// out naturally. Full company names aren't in the table at all — they live
// in the <select id=stocks> ticker picker elsewhere on the page — so we
// build a ticker -> company name lookup from that instead.

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

function textOf(el: Element | null | undefined): string {
  return (el?.textContent ?? '').trim()
}

// Strips commas/whitespace and parses a plain price/number cell. Returns
// null (rather than throwing) for placeholder cells ("-", "N/A", empty).
function parseNumericCell(raw: string | undefined | null): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/,/g, '').trim()
  if (cleaned === '' || cleaned === '-' || cleaned.toUpperCase() === 'N/A') return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

// Volume cells are either plain comma-separated integers ("290,935"),
// "-" for no trades, or abbreviated as e.g. "2.06M" for large counts.
function parseVolumeCell(raw: string | undefined | null): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/,/g, '').trim()
  if (cleaned === '' || cleaned === '-') return null
  const millions = cleaned.match(/^([\d.]+)\s*M$/i)
  if (millions) {
    const value = Number(millions[1])
    return Number.isFinite(value) ? Math.round(value * 1_000_000) : null
  }
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

// Change cells render as an up/down triangle glyph plus a percentage
// ("▲ 0.51%", "▼ 0.60%"), or "-" when the price hasn't moved. This page
// exposes only the percentage — there is no absolute KES change value.
function parseChangePctCell(raw: string | undefined | null): number | null {
  if (!raw) return null
  const magnitudeMatch = raw.match(/[\d.]+/)
  if (!magnitudeMatch) return 0 // "-" (no movement)
  const magnitude = Number(magnitudeMatch[0])
  if (!Number.isFinite(magnitude)) return null
  const isDown = raw.includes('▼') // ▼ (down-triangle glyph, &#9660;)
  return isDown ? -magnitude : magnitude
}

// Full company names live in the ticker-picker <select>, not in the price
// table itself, so we build a lookup from it. Index/sector-index entries
// (e.g. "^NASI") use percent-encoded option values and are skipped — they
// aren't individual securities and are excluded from the scrape entirely.
function buildTickerNameMap(doc: ReturnType<DOMParser['parseFromString']>): Map<string, string> {
  const map = new Map<string, string>()
  if (!doc) return map
  const options = doc.querySelectorAll('select#stocks option[value]')
  for (const opt of Array.from(options)) {
    const value = (opt as Element).getAttribute('value') ?? ''
    if (!value || value.startsWith('%25')) continue
    const name = textOf(opt as Element)
    if (value && name) map.set(value.toUpperCase(), name)
  }
  return map
}

// Parses the #pricelist table. Deliberately defensive: never lets one
// malformed row abort the rest of the scrape, and skips index rows (ticker
// starting with "^") since those aren't individual tracked securities.
function parsePriceTable(html: string): { rows: ParsedRow[]; failures: RowFailure[] } {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  if (!doc) throw new Error('Failed to parse HTML document')

  const table = doc.querySelector('#pricelist') ?? doc.querySelector('table')
  if (!table) throw new Error('No price table found on page')

  const tickerNameMap = buildTickerNameMap(doc)

  // Only rows with a "name" cell are data rows — this excludes both the
  // column-header row and the bolded section-title rows ("Banking", etc.),
  // which use <th> instead of <td class=nm>.
  const dataRows = Array.from(table.querySelectorAll('tr')).filter((tr) =>
    tr.querySelector('td.nm'),
  )

  const rows: ParsedRow[] = []
  const failures: RowFailure[] = []

  dataRows.forEach((tr, index) => {
    const raw = textOf(tr)
    try {
      const cells = Array.from(tr.querySelectorAll('td'))
      const nameCell = cells[0]
      const tickerRaw = textOf(nameCell?.querySelector('a')) || textOf(nameCell)
      const ticker = tickerRaw.toUpperCase().replace(/[^A-Z0-9.\-]/g, '')

      if (!ticker || ticker.startsWith('^')) return // skip blanks and index rows

      const price = parseNumericCell(textOf(cells[1]))
      if (price === null) {
        failures.push({ index, reason: 'missing or unparseable price', raw })
        return
      }

      rows.push({
        ticker,
        companyName: tickerNameMap.get(ticker) ?? ticker,
        price,
        changeKsh: null, // not provided by this source — percentage change only
        changePct: parseChangePctCell(textOf(cells[2])),
        volume: parseVolumeCell(textOf(cells[3])),
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
