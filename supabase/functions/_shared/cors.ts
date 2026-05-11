// Shared CORS headers for every JamRadar Edge Function. The frontend at
// jamradar.netlify.app POSTs from a different origin than the
// supabase.co Edge Function endpoint, so every response needs these.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',                         // tighten once we know the canonical origin
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function jsonOk(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    status: init.status || 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
