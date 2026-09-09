export default function Disclaimer({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <p className="text-xs text-ink-faint">
        These are mathematical signals derived from price and volume data — not financial advice.
      </p>
    )
  }
  return (
    <div className="rounded-lg border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-ink-muted">
      <span className="font-medium text-accent">Not financial advice.</span> These scores are
      mathematical signals derived entirely from historical price and trading-volume data — not
      company news, management quality, or macroeconomic outlook. They are not a recommendation
      to buy or sell any security.
    </div>
  )
}
