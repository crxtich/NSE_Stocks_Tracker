import { Link } from 'react-router-dom'
import { EmptyState } from '../components/StateViews'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4">
      <EmptyState title="Page not found" description="There's nothing here — the page may have moved or the link is wrong." />
      <Link
        to="/"
        className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90"
      >
        Back to Market Overview
      </Link>
    </div>
  )
}
