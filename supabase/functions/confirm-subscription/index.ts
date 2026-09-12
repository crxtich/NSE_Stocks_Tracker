// supabase/functions/confirm-subscription/index.ts
//
// The link clicked from the confirmation email. A plain GET navigation from
// the browser — no Authorization header — so this function is deployed with
// verify_jwt disabled and authenticates purely via the single-use token.
//
// Redirects to the site's own /subscription-status page rather than
// rendering HTML directly: Supabase's Edge Function gateway was observed
// overriding an explicitly-set `Content-Type: text/html` down to
// `text/plain`, so a browser hitting this function showed raw markup as
// text instead of a rendered page. A redirect response has no such issue.

import { getServiceClient } from './supabase.ts'
import { sendEmail, wrapEmailHtml, OWNER_EMAIL } from './email.ts'

const SITE_URL = 'https://nse-tracker.crotich.com'

function redirectTo(status: string): Response {
  return Response.redirect(`${SITE_URL}/#/subscription-status?status=${status}`, 302)
}

Deno.serve(async (req) => {
  try {
    const token = new URL(req.url).searchParams.get('token')
    if (!token) return redirectTo('missing-token')

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('id, email, confirmed')
      .eq('confirm_token', token)
      .maybeSingle()
    if (error) throw new Error(error.message)

    if (!data) return redirectTo('invalid-token')

    if (!data.confirmed) {
      const { error: updateError } = await supabase
        .from('newsletter_subscribers')
        .update({ confirmed: true, confirmed_at: new Date().toISOString() })
        .eq('id', data.id)
      if (updateError) throw new Error(updateError.message)

      // Best-effort — the subscriber is already confirmed above, so a
      // delivery failure here must not turn into an error page for someone
      // who just successfully confirmed.
      try {
        await sendEmail(
          data.email,
          "You're subscribed — NSE Market Intelligence",
          wrapEmailHtml(
            "<p>Thanks for confirming! You'll get occasional emails on stocks I'm watching, what I've bought this week, and things I've learned building this tracker — never on a fixed schedule.</p>",
          ),
        )
      } catch (err) {
        console.error('confirm-subscription: welcome email failed:', err)
      }

      try {
        await sendEmail(
          OWNER_EMAIL,
          `New subscriber: ${data.email}`,
          wrapEmailHtml(`<p>${data.email} just confirmed their subscription to NSE Market Intelligence updates.</p>`),
        )
      } catch (err) {
        console.error('confirm-subscription: owner notification failed:', err)
      }
    }

    return redirectTo('confirmed')
  } catch (err) {
    console.error('confirm-subscription failed:', err)
    return redirectTo('error')
  }
})
