// supabase/functions/unsubscribe/index.ts
//
// The unsubscribe link included in every update email. Deployed with
// verify_jwt disabled for the same reason as confirm-subscription — it's a
// plain link click, authenticated by its single-use token.
//
// Redirects to the site's own /subscription-status page rather than
// rendering HTML directly — see confirm-subscription/index.ts for why
// (Supabase's Edge Function gateway overriding Content-Type: text/html).

import { getServiceClient } from './supabase.ts'

const SITE_URL = 'https://nse-tracker.crotich.com'

function redirectTo(status: string): Response {
  return Response.redirect(`${SITE_URL}/#/subscription-status?status=${status}`, 302)
}

Deno.serve(async (req) => {
  try {
    const token = new URL(req.url).searchParams.get('token')
    if (!token) return redirectTo('missing-unsub-token')

    const supabase = getServiceClient()
    const { error, count } = await supabase
      .from('newsletter_subscribers')
      .delete({ count: 'exact' })
      .eq('unsubscribe_token', token)
    if (error) throw new Error(error.message)

    if (!count) return redirectTo('already-unsubscribed')

    return redirectTo('unsubscribed')
  } catch (err) {
    console.error('unsubscribe failed:', err)
    return redirectTo('error')
  }
})
