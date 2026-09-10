import { useEffect, useState } from 'react'
import { fetchSnapshotsInRange } from '../lib/supabase'
import {
  buildCsv,
  buildFilename,
  buildXlsxBlob,
  downloadBlob,
  rangeToIso,
  type ExportRange,
  type ExportRangeMode,
} from '../lib/exportData'

const FIXED_PRESETS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
]

const MODE_LABELS: Record<ExportRangeMode, string> = { fixed: 'Preset', custom: 'Custom', all: 'All data' }

const today = new Date().toISOString().slice(0, 10)

export default function ExportModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<ExportRangeMode>('fixed')
  const [fixedDays, setFixedDays] = useState(30)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const canExport = mode !== 'custom' || (customFrom !== '' && customTo !== '')

  async function handleExport() {
    setStatus('loading')
    setErrorMsg('')
    try {
      const range: ExportRange = { mode, fixedDays, customFrom, customTo }
      const { fromIso, toIso, label } = rangeToIso(range)
      const rows = await fetchSnapshotsInRange(fromIso, toIso)

      if (rows.length === 0) {
        setStatus('error')
        setErrorMsg('No data found for that range — try a wider one.')
        return
      }

      const filename = buildFilename(label, format)
      if (format === 'csv') {
        const csv = buildCsv(rows, label)
        downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), filename)
      } else {
        const blob = await buildXlsxBlob(rows, label)
        downloadBlob(blob, filename)
      }
      onClose()
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Export failed — please try again.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Export data"
    >
      <div
        className="w-full max-w-md rounded-lg border border-canvas-border bg-canvas-panel p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Export data</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-faint transition-colors hover:text-ink">
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          Download raw price history for every tracked stock as a spreadsheet.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">Date range</div>
            <div className="mt-2 flex gap-2">
              {(Object.keys(MODE_LABELS) as ExportRangeMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                    mode === m ? 'border-accent bg-accent-soft text-accent' : 'border-canvas-border text-ink-muted hover:text-ink'
                  }`}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {mode === 'fixed' && (
            <div className="flex flex-wrap gap-2">
              {FIXED_PRESETS.map((p) => (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => setFixedDays(p.days)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    fixedDays === p.days
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-canvas-border text-ink-muted hover:text-ink'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {mode === 'custom' && (
            <div className="flex gap-3">
              <label className="flex-1 text-xs text-ink-muted">
                From
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || today}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="mt-1 w-full rounded-md border border-canvas-border bg-canvas px-2 py-1.5 text-sm text-ink [color-scheme:dark]"
                />
              </label>
              <label className="flex-1 text-xs text-ink-muted">
                To
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  max={today}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="mt-1 w-full rounded-md border border-canvas-border bg-canvas px-2 py-1.5 text-sm text-ink [color-scheme:dark]"
                />
              </label>
            </div>
          )}

          {mode === 'all' && (
            <p className="text-xs text-ink-faint">Exports every snapshot recorded since the tracker went live.</p>
          )}

          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">Format</div>
            <div className="mt-2 flex gap-2">
              {(['csv', 'xlsx'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                    format === f ? 'border-accent bg-accent-soft text-accent' : 'border-canvas-border text-ink-muted hover:text-ink'
                  }`}
                >
                  {f === 'csv' ? 'CSV' : 'Excel (.xlsx)'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {status === 'error' && <p className="mt-3 text-xs text-loss">{errorMsg}</p>}

        <button
          type="button"
          disabled={!canExport || status === 'loading'}
          onClick={handleExport}
          className="mt-5 w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-canvas transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'loading' ? 'Preparing export…' : 'Export'}
        </button>
      </div>
    </div>
  )
}
