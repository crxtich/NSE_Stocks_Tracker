import { useState, type FormEvent } from 'react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/subscribe-newsletter`

export default function SubscribeForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ANON_KEY}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok || data.status !== 'ok') throw new Error(data.message || 'Something went wrong.')
      setStatus('done')
      setMessage(data.message)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Something went wrong — please try again.')
    }
  }

  return (
    <div className="rounded-lg border border-canvas-border bg-canvas-panel p-5">
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-lg">📬</span>
        <h2 className="font-display text-base font-semibold text-ink">Get occasional updates</h2>
      </div>
      <p className="mt-1.5 max-w-lg text-sm text-ink-muted">
        Stocks I'm watching, what I've bought this week, and things I've learned building this
        tracker — sent whenever there's something worth sharing, never on a fixed schedule.
      </p>

      {status === 'done' ? (
        <p className="mt-4 text-sm font-medium text-gain">{message}</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:max-w-md sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 rounded-md border border-canvas-border bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-canvas transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'loading' ? 'Sending…' : 'Subscribe'}
          </button>
        </form>
      )}
      {status === 'error' && <p className="mt-2 text-xs text-loss">{message}</p>}
    </div>
  )
}
