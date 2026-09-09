export function formatKsh(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

export function formatPct(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return value.toLocaleString('en-KE')
}

export function formatCompactVolume(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-KE', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

/** East Africa Time is UTC+3 year-round (no DST). */
export function formatEatTime(iso: string): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
    timeZone: 'Africa/Nairobi',
  }).format(date)
}

export function isMarketOpen(now: Date = new Date()): boolean {
  const eat = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }))
  const day = eat.getDay()
  const minutes = eat.getHours() * 60 + eat.getMinutes()
  return day >= 1 && day <= 5 && minutes >= 9 * 60 && minutes <= 15 * 60 + 30
}
