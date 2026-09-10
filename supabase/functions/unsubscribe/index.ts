// supabase/functions/unsubscribe/index.ts
//
// The unsubscribe link included in every update email. Deployed with
// verify_jwt disabled for the same reason as confirm-subscription — it's a
// plain link click, authenticated by its single-use token.

import { getServiceClient } from './supabase.ts'
import { brandedPage } from './page.ts'

Deno.serve(async (req) => {
  try {
    const token = new URL(req.url).searchParams.get('token')
    if (!token) return brandedPage('Missing token', 'This unsubscribe link is incomplete.', true)

    const supabase = getServiceClient()
    const { error, count } = await supabase
      .from('newsletter_subscribers')
      .delete({ count: 'exact' })
      .eq('unsubscribe_token', token)
    if (error) throw new Error(error.message)

    if (!count) {
      return brandedPage('Already unsubscribed', "This link has already been used, or wasn't found.", true)
    }

    return brandedPage("You're unsubscribed", "You won't get any more emails from NSE Market Intelligence. Sorry to see you go.")
  } catch (err) {
    console.error('unsubscribe failed:', err)
    return brandedPage('Something went wrong', 'Please try again shortly.', true)
  }
})
