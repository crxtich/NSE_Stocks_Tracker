export default function Privacy() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 text-sm leading-relaxed text-ink-muted">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Privacy Policy</h1>
        <p className="mt-1 text-xs text-ink-faint">Last updated 13 September 2026</p>
      </div>

      <p>
        NSE Market Intelligence is a personal, non-commercial project. This page explains what
        information the site collects and how it's used — in plain terms, because there isn't much
        of it.
      </p>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink">What we collect</h2>
        <p className="mt-2">
          Browsing the site itself — viewing prices, signal scores, or the watchlist — collects
          nothing about you. There's no login and no user accounts.
        </p>
        <p className="mt-2">
          If you subscribe to email updates, we store the email address you provide, along with the
          time you subscribed and confirmed. That's the only personal data this site collects, and
          it's only collected if you choose to give it.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink">How it's used</h2>
        <p className="mt-2">
          Your email is used solely to send the occasional update you signed up for — stocks being
          watched, notes on the tracker itself — and never sold, shared, or used for anything else.
          Every email includes an unsubscribe link that removes your address immediately and
          permanently.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink">Third parties involved</h2>
        <ul className="mt-2 list-inside list-disc space-y-1.5">
          <li>
            <span className="text-ink">Supabase</span> — hosts the database, including the
            subscriber list, and the backend functions that process signups.
          </li>
          <li>
            <span className="text-ink">Resend</span> — delivers the confirmation and update emails.
          </li>
          <li>
            <span className="text-ink">Cloudflare</span> — provides DNS and anonymous, cookie-free
            traffic analytics for this domain (page views and referrers — no personal identifiers).
          </li>
          <li>
            <span className="text-ink">GitHub Pages</span> — hosts the static site itself.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink">Cookies</h2>
        <p className="mt-2">
          This site doesn't set cookies. Your light/dark theme preference is saved in your browser's
          local storage, which stays on your device and is never sent to a server.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink">Your data, your choice</h2>
        <p className="mt-2">
          Unsubscribe any time via the link in any email, or reach out directly (below) to have your
          email address removed or to ask what's stored about you.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink">Contact</h2>
        <p className="mt-2">
          Questions about this policy:{' '}
          <a href="mailto:rotich.collins96@gmail.com" className="text-accent hover:underline">
            rotich.collins96@gmail.com
          </a>
        </p>
      </section>
    </div>
  )
}
