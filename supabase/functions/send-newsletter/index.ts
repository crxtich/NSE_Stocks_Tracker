// supabase/functions/send-newsletter/index.ts
//
// Manually triggered broadcast to every confirmed subscriber — there's no
// admin UI for this; invoke it directly (see README) with:
//   curl -X POST '<SUPABASE_URL>/functions/v1/send-newsletter' \
//     -H 'x-admin-secret: <NEWSLETTER_ADMIN_SECRET>' \
//     -H 'Content-Type: application/json' \
//     -d '{"subject": "...", "html": "<p>...</p>"}'
//
// Deployed with verify_jwt disabled — authorization is the x-admin-secret
// header instead, checked against a function secret only the site owner
// knows, since this app has no real user/admin auth system.

import { getServiceClient } from './supabase.ts'
import { sendEmail, wrapEmailHtml } from './email.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const FUNCTIONS_BASE = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : ''

// A small delay between sends keeps a full-list broadcast comfortably under
// Resend's free-tier rate limit without needing the batch API. At ~0.55s/send
// this handles up to a couple hundred subscribers within the Edge Function's
// execution time limit — plenty for a personal newsletter.
const SEND_DELAY_MS = 550

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ status: 'error', message: 'Method not allowed' }, { status: 405 })
    }

    const adminSecret = Deno.env.get('NEWSLETTER_ADMIN_SECRET')
    if (!adminSecret || req.headers.get('x-admin-secret') !== adminSecret) {
      return Response.json({ status: 'error', message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { subject, html } = body
    if (!subject || !html) {
      return Response.json({ status: 'error', message: 'subject and html are required' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { data: subscribers, error } = await supabase
      .from('newsletter_subscribers')
      .select('email, unsubscribe_token')
      .eq('confirmed', true)
    if (error) throw new Error(error.message)

    if (!subscribers || subscribers.length === 0) {
      return Response.json({ status: 'ok', message: 'No confirmed subscribers yet.', sent: 0, failed: 0 })
    }

    let sent = 0
    const failures: { email: string; error: string }[] = []

    for (const sub of subscribers) {
      const unsubscribeUrl = `${FUNCTIONS_BASE}/unsubscribe?token=${sub.unsubscribe_token}`
      try {
        await sendEmail(sub.email, subject, wrapEmailHtml(html, unsubscribeUrl))
        sent++
      } catch (err) {
        failures.push({ email: sub.email, error: err instanceof Error ? err.message : String(err) })
      }
      await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS))
    }

    return Response.json({ status: 'ok', sent, failed: failures.length, failures })
  } catch (err) {
    console.error('send-newsletter failed:', err)
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ status: 'error', message }, { status: 500 })
  }
})
