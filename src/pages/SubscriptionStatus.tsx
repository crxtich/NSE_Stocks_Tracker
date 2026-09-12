import { Link, useSearchParams } from 'react-router-dom'

// The confirm-subscription and unsubscribe Edge Functions redirect here
// instead of rendering their own HTML: Supabase's Edge Function gateway
// (Sb-Gateway-Version: 1) was observed overriding an explicitly-set
// `Content-Type: text/html` down to `text/plain`, so a browser hitting
// those functions directly showed raw markup as text instead of a
// rendered page. A redirect has no such problem, and reusing the site's
// own page here means one real stylesheet instead of a hand-rolled HTML
// string duplicated inside two separate Edge Functions.
const MESSAGES: Record<string, { title: string; message: string; isError?: boolean }> = {
  confirmed: {
    title: "You're subscribed!",
    message:
      "You'll get occasional emails on stocks I'm watching, what I've bought, and things I've learned — never more than there's something worth sharing.",
  },
  'invalid-token': {
    title: 'Link not found',
    message: 'This confirmation link is invalid — it may have already been used.',
    isError: true,
  },
  'missing-token': {
    title: 'Missing token',
    message: 'This confirmation link is incomplete.',
    isError: true,
  },
  unsubscribed: {
    title: "You're unsubscribed",
    message: "You won't get any more emails from NSE Market Intelligence. Sorry to see you go.",
  },
  'already-unsubscribed': {
    title: 'Already unsubscribed',
    message: "This link has already been used, or wasn't found.",
    isError: true,
  },
  'missing-unsub-token': {
    title: 'Missing token',
    message: 'This unsubscribe link is incomplete.',
    isError: true,
  },
  error: {
    title: 'Something went wrong',
    message: 'Please try again shortly.',
    isError: true,
  },
}

export default function SubscriptionStatus() {
  const [params] = useSearchParams()
  const { title, message, isError } = MESSAGES[params.get('status') ?? ''] ?? MESSAGES.error

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <h1 className={`font-display text-2xl font-semibold ${isError ? 'text-loss' : 'text-accent'}`}>{title}</h1>
      <p className="text-sm leading-relaxed text-ink-muted">{message}</p>
      <Link
        to="/"
        className="mt-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90"
      >
        Back to the site
      </Link>
    </div>
  )
}
