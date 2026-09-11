// supabase/functions/confirm-subscription/index.ts
//
// The link clicked from the confirmation email. A plain GET navigation from
// the browser — no Authorization header — so this function is deployed with
// verify_jwt disabled and authenticates purely via the single-use token.

import { getServiceClient } from './supabase.ts'
import { brandedPage } from './page.ts'
import { sendEmail, wrapEmailHtml, OWNER_EMAIL } from './email.ts'

Deno.serve(async (req) => {
  try {
    const token = new URL(req.url).searchParams.get('token')
    if (!token) return brandedPage('Missing token', 'This confirmation link is incomplete.', true)

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('id, email, confirmed')
      .eq('confirm_token', token)
      .maybeSingle()
    if (error) throw new Error(error.message)

    if (!data) {
      return brandedPage('Link not found', 'This confirmation link is invalid — it may have already been used.', true)
    }

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

    return brandedPage(
      "You're subscribed!",
      "You'll get occasional emails on stocks I'm watching, what I've bought, and things I've learned — never more than there's something worth sharing.",
    )
  } catch (err) {
    console.error('confirm-subscription failed:', err)
    return brandedPage('Something went wrong', 'Please try again shortly.', true)
  }
})
