import type { PriceSnapshot } from './supabase'
import { formatEatTime } from './format'

export type ExportRangeMode = 'fixed' | 'custom' | 'all'

export interface ExportRange {
  mode: ExportRangeMode
  fixedDays?: number
  customFrom?: string // yyyy-mm-dd, from a <input type="date">
  customTo?: string // yyyy-mm-dd
}

const SITE_URL = 'https://crxtich.github.io/NSE_Stocks_Tracker/'
const AUTHOR_URL = 'https://www.linkedin.com/in/crotich/'

const BRAND_LINES = [
  'NSE Market Intelligence',
  `Live Nairobi Securities Exchange data - ${SITE_URL}`,
  `Built by Collins Rotich - ${AUTHOR_URL}`,
]

const COLUMNS = ['Ticker', 'Company', 'Price (KSH)', 'Change (%)', 'Volume', 'Time (EAT)']

interface ExportRow {
  ticker: string
  company: string
  price: number
  changePct: number | null
  volume: number | null
  time: string
}

// Resolves a range selection into concrete ISO bounds plus a human label
// used both in the UI and stamped into the exported file itself.
export function rangeToIso(range: ExportRange): { fromIso: string | null; toIso: string | null; label: string } {
  if (range.mode === 'all') return { fromIso: null, toIso: null, label: 'All available data' }

  if (range.mode === 'fixed') {
    const days = range.fixedDays ?? 30
    const fromIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    return { fromIso, toIso: null, label: `Last ${days} days` }
  }

  const fromIso = range.customFrom ? new Date(`${range.customFrom}T00:00:00`).toISOString() : null
  const toIso = range.customTo ? new Date(`${range.customTo}T23:59:59.999`).toISOString() : null
  const label = `${range.customFrom || 'earliest'} to ${range.customTo || 'latest'}`
  return { fromIso, toIso, label }
}

function toExportRows(snapshots: PriceSnapshot[]): ExportRow[] {
  return snapshots.map((s) => ({
    ticker: s.ticker,
    company: s.company_name,
    price: s.price,
    changePct: s.change_pct === null ? null : Math.round(s.change_pct * 100) / 100,
    volume: s.volume,
    time: formatEatTime(s.scraped_at),
  }))
}

function csvCell(value: string | number | null): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildCsv(snapshots: PriceSnapshot[], rangeLabel: string): string {
  const rows = toExportRows(snapshots)
  const lines = [
    ...BRAND_LINES,
    `Range: ${rangeLabel} | Exported: ${new Date().toISOString()} | Rows: ${rows.length}`,
    '',
    COLUMNS.join(','),
    ...rows.map((r) =>
      [csvCell(r.ticker), csvCell(r.company), csvCell(r.price), csvCell(r.changePct), csvCell(r.volume), csvCell(r.time)].join(','),
    ),
  ]
  return lines.join('\r\n')
}

// Loaded only when someone actually exports to Excel, so the ~300kB xlsx
// library never touches the main bundle every visitor downloads.
export async function buildXlsxBlob(snapshots: PriceSnapshot[], rangeLabel: string): Promise<Blob> {
  const XLSX = await import('xlsx')
  const rows = toExportRows(snapshots)

  const sheetData: (string | number | null)[][] = [
    [BRAND_LINES[0]],
    [BRAND_LINES[1]],
    [BRAND_LINES[2]],
    [`Range: ${rangeLabel}`, `Exported: ${new Date().toISOString()}`, `Rows: ${rows.length}`],
    [],
    COLUMNS,
    ...rows.map((r) => [r.ticker, r.company, r.price, r.changePct, r.volume, r.time]),
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
  worksheet['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 }]
  if (worksheet.A2) worksheet.A2.l = { Target: SITE_URL }
  if (worksheet.A3) worksheet.A3.l = { Target: AUTHOR_URL }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'NSE Price History')

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function buildFilename(rangeLabel: string, ext: 'csv' | 'xlsx'): string {
  const slug = rangeLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '')
  const date = new Date().toISOString().slice(0, 10)
  return `nse-market-intelligence_${slug}_${date}.${ext}`
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
