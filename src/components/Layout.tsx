import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import MarketStatusBadge from './MarketStatusBadge'
import ExportModal from './ExportModal'

const NAV_ITEMS = [
  { to: '/', label: 'Market Overview', end: true },
  { to: '/top-picks', label: 'Top 10 Picks', end: false },
  { to: '/watchlist', label: 'My Watchlist', end: false },
]

export default function Layout({ children }: { children: ReactNode }) {
  const [exportOpen, setExportOpen] = useState(false)

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-canvas-border bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <NavLink to="/" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-accent">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                  <path d="M4 16 L9 10 L13 13.5 L20 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="font-display text-[15px] font-semibold tracking-tight text-ink sm:text-base">
                NSE Market Intelligence
              </span>
            </NavLink>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <a
              href="https://www.linkedin.com/in/crotich/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-accent"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="currentColor">
                <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.15 1.45-2.15 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.59 0 4.25 2.37 4.25 5.44v6.3zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.11 20.45H3.56V9h3.55v11.45z" />
              </svg>
              <span className="hidden sm:inline">Built by Collins Rotich</span>
            </a>
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              title="Export data"
              aria-label="Export data"
              className="flex items-center gap-1.5 rounded-md border border-canvas-border px-2 py-1 text-xs text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12m0 0-4-4m4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="hidden sm:inline">Export</span>
            </button>
            <MarketStatusBadge />
          </div>
        </div>
        <nav className="border-t border-canvas-border/60">
          <div className="mx-auto flex max-w-7xl overflow-x-auto px-4 sm:gap-1 sm:px-6">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap border-b-2 px-2 py-2.5 text-[13px] font-medium transition-colors sm:px-3 sm:text-sm ${
                    isActive
                      ? 'border-accent text-ink'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      <footer className="mt-16 border-t border-canvas-border">
        <div className="mx-auto max-w-7xl px-4 py-8 text-xs leading-relaxed text-ink-faint sm:px-6">
          <p className="max-w-3xl">
            NSE Market Intelligence tracks publicly listed prices on the Nairobi Securities
            Exchange and derives every metric on this site purely from historical price and
            trading-volume data. This project is for informational purposes only. Nothing on
            this site constitutes financial advice, and nothing here should be taken as a
            recommendation to buy or sell any security.
          </p>
          <a
            href="https://www.linkedin.com/in/crotich/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-ink-muted transition-colors hover:text-accent"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.15 1.45-2.15 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.59 0 4.25 2.37 4.25 5.44v6.3zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.11 20.45H3.56V9h3.55v11.45z" />
            </svg>
            Built by Collins Rotich
          </a>
        </div>
      </footer>

      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} />}
    </div>
  )
}
