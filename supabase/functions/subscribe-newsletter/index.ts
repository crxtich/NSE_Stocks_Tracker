// supabase/functions/subscribe-newsletter/index.ts
//
// Called directly from the site's Subscribe form (Authorization: Bearer
// <anon key>, same key already public in the frontend bundle). Validates
// the email, stores it unconfirmed, and sends a confirmation email via
// Resend — a real subscription only exists once that link is clicked
// (confirm-subscription), so an address someone mistypes never gets mail.

import { corsHeaders } from './cors.ts'
import { getServiceClient } from './supabase.ts'
import { sendEmail, wrapEmailHtml } from './email.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const FUNCTIONS_BASE = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : ''
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (req.method !== 'POST') {
      return Response.json({ status: 'error', message: 'Method not allowed' }, { status: 405, headers: corsHeaders })
    }

    const body = await req.json().catch(() => ({}))
    const normalized = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!EMAIL_RE.test(normalized)) {
      return Response.json(
        { status: 'error', message: 'Enter a valid email address.' },
        { status: 400, headers: corsHeaders },
      )
    }

    const supabase = getServiceClient()

    const { data: existing, error: lookupError } = await supabase
      .from('newsletter_subscribers')
      .select('id, confirmed')
      .eq('email', normalized)
      .maybeSingle()
    if (lookupError) throw new Error(lookupError.message)

    if (existing?.confirmed) {
      return Response.json(
        { status: 'ok', message: "You're already subscribed — thanks!" },
        { headers: corsHeaders },
      )
    }

    const confirmToken = crypto.randomUUID()

    if (existing) {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .update({ confirm_token: confirmToken })
        .eq('id', existing.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from('newsletter_subscribers').insert({
        email: normalized,
        confirm_token: confirmToken,
        unsubscribe_token: crypto.randomUUID(),
      })
      if (error) throw new Error(error.message)
    }

    const confirmUrl = `${FUNCTIONS_BASE}/confirm-subscription?token=${confirmToken}`
    await sendEmail(
      normalized,
      'Confirm your subscription — NSE Market Intelligence',
      wrapEmailHtml(`
        <p>One more step — confirm you'd like occasional updates on stocks I'm watching, what I've bought this week, and things I've learned building this tracker.</p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${confirmUrl}" style="display:inline-block;background:#F0A93A;color:#0B0D10;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">Confirm subscription</a>
        </p>
        <p style="color:#565E6B;font-size:13px;">Didn't request this? Just ignore this email — you won't be subscribed unless you click the button above.</p>
      `),
    )

    return Response.json(
      { status: 'ok', message: 'Check your inbox to confirm your subscription.' },
      { headers: corsHeaders },
    )
  } catch (err) {
    console.error('subscribe-newsletter failed:', err)
    return Response.json(
      { status: 'error', message: 'Something went wrong — please try again shortly.' },
      { status: 500, headers: corsHeaders },
    )
  }
})
