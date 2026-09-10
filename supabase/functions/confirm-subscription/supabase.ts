import { createClient } from 'jsr:@supabase/supabase-js@2'

// Service role key bypasses RLS — used only inside Edge Functions, never
// sent to the frontend. newsletter_subscribers has no RLS policies at all,
// so this is the only way anything can read or write it.
export function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set as function secrets')
  }
  return createClient(url, serviceKey)
}
