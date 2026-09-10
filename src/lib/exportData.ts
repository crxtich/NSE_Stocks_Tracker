import type { PriceSnapshot } from './supabase'
import { formatEatTime } from './format'

export type ExportRangeMode = 'fixed' | 'custom' | 'all'

export interface ExportRange {
  mode: ExportRangeMode
  fixedDays?: number
  customFrom?: string // yyyy-mm-dd, from a <input type="date">
  customTo?: string // yyyy-mm-dd
}

const SITE_URL = 'https://nse-tracker.is-a.dev/'
const AUTHOR_URL = 'https://www.linkedin.com/in/crotich/'

const BRAND_LINES = [
  'NSE Market Intelligence',
  `Live Nairobi Securities Exchange data - ${SITE_URL}`,
  `Built by Collins Rotich - ${AUTHOR_URL}`,
]

// Same palette as the site's Tailwind tokens (tailwind.config.ts), so the
// spreadsheet reads as a companion piece rather than a generic data dump.
const BRAND_COLORS = {
  accent: 'FFF0A93A',
  accentDark: 'FFB5791E',
  canvas: 'FF0B0D10',
  gain: 'FF2FBF71',
  loss: 'FFE4574C',
  linkedin: 'FF0A66C2',
  white: 'FFFFFFFF',
  ink: 'FF1A1D22',
  rowStripe: 'FFF7F3EC',
  border: 'FFE2DDCF',
}

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

/** A plain-text stand-in for real cell color in CSV, which has no styling of its own. */
function trendGlyph(changePct: number | null): string {
  if (changePct === null) return '⚪'
  if (changePct > 0) return '🟢'
  if (changePct < 0) return '🔴'
  return '⚪'
}

export function buildCsv(snapshots: PriceSnapshot[], rangeLabel: string): string {
  const rows = toExportRows(snapshots)
  const lines = [
    ...BRAND_LINES,
    `Range: ${rangeLabel} | Exported: ${new Date().toISOString()} | Rows: ${rows.length}`,
    '',
    [...COLUMNS, 'Trend'].join(','),
    ...rows.map((r) =>
      [
        csvCell(r.ticker),
        csvCell(r.company),
        csvCell(r.price),
        csvCell(r.changePct),
        csvCell(r.volume),
        csvCell(r.time),
        trendGlyph(r.changePct),
      ].join(','),
    ),
  ]
  return lines.join('\r\n')
}

// Loaded only when someone actually exports to Excel, so the styling engine
// never touches the main bundle every visitor downloads.
export async function buildXlsxBlob(snapshots: PriceSnapshot[], rangeLabel: string): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs')
  const rows = toExportRows(snapshots)
  const colCount = COLUMNS.length

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'NSE Market Intelligence'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('NSE Price History', {
    views: [{ state: 'frozen', ySplit: 6 }],
  })
  sheet.columns = [
    { width: 10 },
    { width: 30 },
    { width: 13 },
    { width: 13 },
    { width: 13 },
    { width: 20 },
  ]

  // Row 1 — title banner, dark canvas background with amber brand text.
  sheet.mergeCells(1, 1, 1, colCount)
  const titleCell = sheet.getCell('A1')
  titleCell.value = BRAND_LINES[0]
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: BRAND_COLORS.accent } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_COLORS.canvas } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  sheet.getRow(1).height = 26

  // Row 2 — link back to the live site, same dark banner, real hyperlink.
  sheet.mergeCells(2, 1, 2, colCount)
  const siteCell = sheet.getCell('A2')
  siteCell.value = { text: `🔗  Live data: ${SITE_URL}`, hyperlink: SITE_URL }
  siteCell.font = { size: 11, color: { argb: BRAND_COLORS.white }, underline: true }
  siteCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_COLORS.canvas } }
  siteCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

  // Row 3 — a little LinkedIn "badge" cell (blue fill, bold white "in") next
  // to a real hyperlink, since embedding an actual logo image needs a paid
  // Excel library — this reads the same at a glance and needs no asset file.
  const badgeCell = sheet.getCell('A3')
  badgeCell.value = 'in'
  badgeCell.font = { size: 11, bold: true, color: { argb: BRAND_COLORS.white } }
  badgeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_COLORS.linkedin } }
  badgeCell.alignment = { vertical: 'middle', horizontal: 'center' }

  sheet.mergeCells(3, 2, 3, colCount)
  const authorCell = sheet.getCell('B3')
  authorCell.value = { text: 'Built by Collins Rotich — connect on LinkedIn', hyperlink: AUTHOR_URL }
  authorCell.font = { size: 11, color: { argb: BRAND_COLORS.white }, underline: true }
  authorCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_COLORS.canvas } }
  authorCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  sheet.getRow(3).height = 20

  // Row 4 — export metadata, muted italic text on the same dark banner.
  sheet.mergeCells(4, 1, 4, colCount)
  const metaCell = sheet.getCell('A4')
  metaCell.value = `Range: ${rangeLabel}   ·   Exported: ${new Date().toISOString()}   ·   Rows: ${rows.length}`
  metaCell.font = { size: 9, italic: true, color: { argb: 'FFB8BEC7' } }
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_COLORS.canvas } }
  metaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

  // Row 5 — spacer.
  sheet.getRow(5).height = 6

  // Row 6 — column headers, amber fill matching the site's accent color.
  const headerRow = sheet.getRow(6);
  COLUMNS.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = label
    cell.font = { bold: true, color: { argb: BRAND_COLORS.canvas } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_COLORS.accent } }
    cell.alignment = { vertical: 'middle', horizontal: i === 1 ? 'left' : 'center' }
    cell.border = { bottom: { style: 'medium', color: { argb: BRAND_COLORS.accentDark } } }
  })
  headerRow.height = 20
  sheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: colCount } }

  // Data rows — striped banding, color-coded Change (%) exactly like the
  // green/red used across the live site for gains and losses.
  rows.forEach((r, i) => {
    const row = sheet.getRow(7 + i)
    row.getCell(1).value = r.ticker
    row.getCell(2).value = r.company
    row.getCell(3).value = r.price
    row.getCell(4).value = r.changePct
    row.getCell(5).value = r.volume
    row.getCell(6).value = r.time

    row.getCell(1).font = { bold: true, color: { argb: BRAND_COLORS.accentDark } }
    row.getCell(3).numFmt = '#,##0.00'
    row.getCell(3).alignment = { horizontal: 'right' }
    row.getCell(4).numFmt = '+0.00"%";-0.00"%"'
    row.getCell(4).alignment = { horizontal: 'right' }
    row.getCell(5).numFmt = '#,##0'
    row.getCell(5).alignment = { horizontal: 'right' }

    if (r.changePct !== null) {
      const color = r.changePct > 0 ? BRAND_COLORS.gain : r.changePct < 0 ? BRAND_COLORS.loss : BRAND_COLORS.ink
      row.getCell(4).font = { bold: true, color: { argb: color } }
    }

    const stripe = i % 2 === 1
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c)
      if (stripe) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_COLORS.rowStripe } }
      cell.border = { bottom: { style: 'hair', color: { argb: BRAND_COLORS.border } } }
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
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
