// supabase/functions/subscribe-newsletter/index.ts
//
// Called directly from the site's Subscribe form (Authorization: Bearer
// <anon key>, same key already public in the frontend bundle). Validates
// the email and stores it.
//
// TEMPORARILY auto-confirms on signup instead of the usual double opt-in
// (click a link in a confirmation email): Resend's shared sandbox sender
// can only deliver to the account's own verified address until a real
// domain is verified at resend.com/domains, so a confirmation link can't
// reach anyone else yet. Revert to gating on a clicked link (see
// confirm-subscription, still deployed and unchanged) once RESEND_FROM_EMAIL
// points at a verified domain.

import { corsHeaders } from './cors.ts'
import { getServiceClient } from './supabase.ts'
import { sendEmail, wrapEmailHtml, OWNER_EMAIL } from './email.ts'

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

    if (existing) {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .update({ confirmed: true, confirmed_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from('newsletter_subscribers').insert({
        email: normalized,
        confirmed: true,
        confirmed_at: new Date().toISOString(),
        confirm_token: crypto.randomUUID(),
        unsubscribe_token: crypto.randomUUID(),
      })
      if (error) throw new Error(error.message)
    }

    // Best-effort welcome email — the subscriber is already stored and
    // confirmed above, so a delivery failure here (e.g. Resend's sandbox
    // sender rejecting a non-owner recipient) must not surface as a
    // signup failure to the person who just subscribed.
    try {
      await sendEmail(
        normalized,
        "You're subscribed — NSE Market Intelligence",
        wrapEmailHtml(
          "<p>Thanks for subscribing! You'll get occasional emails on stocks I'm watching, what I've bought this week, and things I've learned building this tracker — never on a fixed schedule.</p>",
        ),
      )
    } catch (err) {
      console.error('subscribe-newsletter: welcome email failed (subscriber is still saved):', err)
    }

    // Best-effort notification to the site owner — same non-blocking
    // pattern as the welcome email above, since there's no admin UI to
    // otherwise see new signups as they happen.
    try {
      await sendEmail(
        OWNER_EMAIL,
        `New subscriber: ${normalized}`,
        wrapEmailHtml(`<p>${normalized} just subscribed to NSE Market Intelligence updates.</p>`),
      )
    } catch (err) {
      console.error('subscribe-newsletter: owner notification failed:', err)
    }

    return Response.json({ status: 'ok', message: "You're subscribed — thanks!" }, { headers: corsHeaders })
  } catch (err) {
    console.error('subscribe-newsletter failed:', err)
    return Response.json(
      { status: 'error', message: 'Something went wrong — please try again shortly.' },
      { status: 500, headers: corsHeaders },
    )
  }
})
