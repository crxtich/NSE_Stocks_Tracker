export default function Terms() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 text-sm leading-relaxed text-ink-muted">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Terms of Use</h1>
        <p className="mt-1 text-xs text-ink-faint">Last updated 13 September 2026</p>
      </div>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink">Not financial advice</h2>
        <p className="mt-2">
          Everything on this site — prices, Market Signal Scores, trend indicators — is calculated
          purely from historical price and trading-volume data. None of it is financial advice, a
          recommendation to buy or sell any security, or a substitute for your own research or a
          licensed advisor. Trading and investing carry risk, including loss of principal.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink">No warranty on data</h2>
        <p className="mt-2">
          Price data is scraped automatically from public sources on a schedule and provided "as
          is." It may be delayed, incomplete, or occasionally wrong due to source outages, scraping
          failures, or upstream errors. Don't rely on this site as your sole source for time-sensitive
          decisions.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink">Availability</h2>
        <p className="mt-2">
          This is a personal project run on a best-effort basis, with no uptime guarantee. It may be
          changed, paused, or taken down at any time without notice.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink">External links</h2>
        <p className="mt-2">
          Links to LinkedIn or other external sites are provided for convenience. We aren't
          responsible for the content or practices of sites we don't control.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink">Changes</h2>
        <p className="mt-2">
          These terms may be updated occasionally as the site evolves. Continued use after a change
          means you accept the updated terms.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink">Contact</h2>
        <p className="mt-2">
          Questions:{' '}
          <a href="mailto:rotich.collins96@gmail.com" className="text-accent hover:underline">
            rotich.collins96@gmail.com
          </a>
        </p>
      </section>
    </div>
  )
}
