import { createClient } from 'jsr:@supabase/supabase-js@2'

export function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set as function secrets')
  }
  return createClient(url, serviceKey)
}
