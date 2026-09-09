import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ChangeValue from './ChangeValue'
import { formatCompactVolume, formatKsh } from '../lib/format'

export interface PriceRow {
  ticker: string
  companyName: string
  price: number
  changeKsh: number | null
  changePct: number | null
  volume: number | null
}

type SortKey = 'companyName' | 'price' | 'changeKsh' | 'changePct' | 'volume'

export default function PriceTable({ rows }: { rows: PriceRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('changePct')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const navigate = useNavigate()

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1
      if (typeof av === 'string' || typeof bv === 'string') {
        return String(av).localeCompare(String(bv)) * (sortDir === 'asc' ? 1 : -1)
      }
      return ((av as number) - (bv as number)) * (sortDir === 'asc' ? 1 : -1)
    })
    return copy
  }, [rows, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const headers: { key: SortKey; label: string; align?: 'right' }[] = [
    { key: 'companyName', label: 'Company' },
    { key: 'price', label: 'Price', align: 'right' },
    { key: 'changeKsh', label: 'Change', align: 'right' },
    { key: 'changePct', label: '% Change', align: 'right' },
    { key: 'volume', label: 'Volume', align: 'right' },
  ]

  return (
    <div className="overflow-x-auto rounded-lg border border-canvas-border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-canvas-border bg-canvas-panel text-xs uppercase tracking-wide text-ink-muted">
            <th className="w-10 px-3 py-2.5 text-left font-medium">Ticker</th>
            {headers.map((h) => (
              <th
                key={h.key}
                className={`cursor-pointer select-none px-3 py-2.5 font-medium hover:text-ink ${h.align === 'right' ? 'text-right' : 'text-left'}`}
                onClick={() => toggleSort(h.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {h.label}
                  {sortKey === h.key && <span className="text-accent">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.ticker}
              onClick={() => navigate(`/stock/${row.ticker}`)}
              className="cursor-pointer border-b border-canvas-border/60 last:border-0 hover:bg-canvas-panel/60"
            >
              <td className="px-3 py-2.5 font-mono text-xs font-semibold text-accent">{row.ticker}</td>
              <td className="max-w-[220px] truncate px-3 py-2.5 text-ink" title={row.companyName}>
                {row.companyName}
              </td>
              <td className="px-3 py-2.5 text-right tabular text-ink">{formatKsh(row.price)}</td>
              <td className="px-3 py-2.5 text-right">
                <ChangeValue value={row.changeKsh} />
              </td>
              <td className="px-3 py-2.5 text-right">
                <ChangeValue value={row.changePct} />
              </td>
              <td className="px-3 py-2.5 text-right tabular text-ink-muted">{formatCompactVolume(row.volume)}</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-10 text-center text-ink-muted">
                No price data available yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
