import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import MarketStatusBadge from './MarketStatusBadge'

const NAV_ITEMS = [
  { to: '/', label: 'Market Overview', end: true },
  { to: '/top-picks', label: 'Top 10 Picks', end: false },
  { to: '/watchlist', label: 'Watchlist', end: false },
]

export default function Layout({ children }: { children: ReactNode }) {
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
          <div className="shrink-0">
            <MarketStatusBadge />
          </div>
        </div>
        <nav className="border-t border-canvas-border/60">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
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
        </div>
      </footer>
    </div>
  )
}
