export function LoadingState({ label = 'Loading market data…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-lg border border-canvas-border bg-canvas-panel py-16 text-sm text-ink-muted">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-faint border-t-accent" />
      {label}
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-loss/30 bg-loss/10 px-5 py-6 text-sm text-loss">
      <p className="font-medium">Couldn't load market data</p>
      <p className="mt-1 text-loss/80">{message}</p>
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-canvas-border px-5 py-12 text-center">
      <p className="font-medium text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{description}</p>
    </div>
  )
}
