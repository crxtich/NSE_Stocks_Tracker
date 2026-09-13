'use strict'
// Port of the former Supabase edge function `scrape-nse` to plain Node.
// Run from cron; writes straight to Postgres over loopback.
const cheerio = require('cheerio')
const { pool, query } = require('./db')

const SOURCE_URL = 'https://live.mystocks.co.ke/m/pricelist'
const USER_AGENT = 'Mozilla/5.0 (compatible; NSEMarketIntelligenceBot/1.0)'
const FETCH_TIMEOUT_MS = 30_000
const TRADING_DAYS = new Set([1, 2, 3, 4, 5])
const OPEN_MIN = 9 * 60
const CLOSE_MIN = 15 * 60 + 30

function isMarketOpenNow() {
  const eat = new Date(Date.now() + 3 * 60 * 60 * 1000) // UTC -> EAT
  const minutes = eat.getUTCHours() * 60 + eat.getUTCMinutes()
  return TRADING_DAYS.has(eat.getUTCDay()) && minutes >= OPEN_MIN && minutes <= CLOSE_MIN
}

function parseNumericCell(raw) {
  if (!raw) return null
  const cleaned = raw.replace(/,/g, '').trim()
  if (cleaned === '' || cleaned === '-' || cleaned.toUpperCase() === 'N/A') return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

function parseVolumeCell(raw) {
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

function parseChangePctCell(raw) {
  if (!raw) return null
  const magnitude = raw.match(/[\d.]+/)
  if (!magnitude) return 0 // "-" means no movement
  const value = Number(magnitude[0])
  if (!Number.isFinite(value)) return null
  return raw.includes('▼') ? -value : value // ▼ = down
}

function parsePriceTable(html) {
  const $ = cheerio.load(html)
  const nameByTicker = new Map()
  $('select#stocks option[value]').each((_i, el) => {
    const value = ($(el).attr('value') || '').toUpperCase()
    const name = $(el).text().trim()
    if (value && name && !value.startsWith('%25')) nameByTicker.set(value, name)
  })

  const table = $('#pricelist').length ? $('#pricelist') : $('table').first()
  if (!table.length) throw new Error('No price table found on page')

  const rows = []
  const failures = []
  table.find('tr').each((index, tr) => {
    const $tr = $(tr)
    if (!$tr.find('td.nm').length) return
    try {
      const cells = $tr.find('td')
      const nameCell = cells.eq(0)
      const tickerRaw = nameCell.find('a').text().trim() || nameCell.text().trim()
      const ticker = tickerRaw.toUpperCase().replace(/[^A-Z0-9.\-]/g, '')
      if (!ticker || ticker.startsWith('^')) return // blanks and index rows
      const price = parseNumericCell(cells.eq(1).text().trim())
      if (price === null) {
        failures.push({ index, reason: 'missing or unparseable price' })
        return
      }
      rows.push({
        ticker,
        companyName: nameByTicker.get(ticker) ?? ticker,
        price,
        changeKsh: null, // source gives percentage change only
        changePct: parseChangePctCell(cells.eq(2).text().trim()),
        volume: parseVolumeCell(cells.eq(3).text().trim()),
      })
    } catch (err) {
      failures.push({ index, reason: err.message })
    }
  })
  return { rows, failures }
}

async function fetchPriceList() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(SOURCE_URL, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Failed to fetch ${SOURCE_URL}: HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

async function insertSnapshots(rows) {
  const scrapedAt = new Date().toISOString()
  // One multi-row INSERT rather than a round trip per ticker.
  const values = []
  const params = []
  rows.forEach((row, i) => {
    const b = i * 7
    values.push(`($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7})`)
    params.push(row.ticker, row.companyName, row.price, row.changeKsh, row.changePct, row.volume, scrapedAt)
  })
  await query(
    `INSERT INTO price_snapshots
       (ticker, company_name, price, change_ksh, change_pct, volume, scraped_at)
     VALUES ${values.join(',')}`,
    params,
  )
  return scrapedAt
}

async function main() {
  const marketOpen = isMarketOpenNow()
  const html = await fetchPriceList()
  const { rows, failures } = parsePriceTable(html)
  if (rows.length === 0) {
    console.error('[nse-scrape] no rows parsed from price table', failures.slice(0, 5))
    process.exitCode = 1
    return
  }
  const scrapedAt = await insertSnapshots(rows)
  console.log(
    `[nse-scrape] ${scrapedAt} inserted=${rows.length} failed=${failures.length} ` +
      `market_open=${marketOpen}`,
  )
}

main()
  .catch((err) => {
    console.error('[nse-scrape] failed:', err.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())
