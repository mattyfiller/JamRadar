// Shared CORS headers for every JamRadar Edge Function. The frontend at
// jamradar.netlify.app POSTs from a different origin than the
// supabase.co Edge Function endpoint, so every response needs these.

// Origins we accept for credentialed Edge Function calls. Wildcard '*' is
// not safe here because we forward the user's Supabase JWT via the
// Authorization header — a malicious page would otherwise be able to act
// on the user's behalf via XSS-acquired tokens. Stripe webhooks don't
// carry the Authorization header and CORS doesn't apply to them server-
// to-server, so this list only governs browser calls.
const ALLOWED_ORIGINS = new Set([
  'https://jamradar.netlify.app',
  'http://localhost:3000',
  'http://localhost:5173',
]);

function originFor(req: Request) {
  const o = req.headers.get('origin') || '';
  return ALLOWED_ORIGINS.has(o) ? o : 'https://jamradar.netlify.app';
}

export function buildCorsHeaders(req: Request) {
  return {
    'Access-Control-Allow-Origin': originFor(req),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  } as Record<string, string>;
}

// Legacy import for callers that don't yet pass req. Falls back to the canonical
// origin. New callers should use buildCorsHeaders(req).
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://jamradar.netlify.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Vary': 'Origin',
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
