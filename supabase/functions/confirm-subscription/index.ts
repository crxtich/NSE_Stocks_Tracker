// supabase/functions/confirm-subscription/index.ts
//
// The link clicked from the confirmation email. A plain GET navigation from
// the browser — no Authorization header — so this function is deployed with
// verify_jwt disabled and authenticates purely via the single-use token.

import { getServiceClient } from './supabase.ts'
import { brandedPage } from './page.ts'

Deno.serve(async (req) => {
  try {
    const token = new URL(req.url).searchParams.get('token')
    if (!token) return brandedPage('Missing token', 'This confirmation link is incomplete.', true)

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('id, confirmed')
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
