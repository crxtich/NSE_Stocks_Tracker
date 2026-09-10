// Shared CORS headers — this Edge Function is called directly from the
// browser (the site's Subscribe form), so it needs to handle preflight.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}
