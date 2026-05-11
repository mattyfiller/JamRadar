// stripe-onboard-seller — creates a Stripe Express account for the calling
// user (if they don't have one) and returns a hosted onboarding URL.
//
// Called from Profile → "Set up payouts". User completes Stripe-hosted KYC
// (driver's license + bank). When they finish, Stripe redirects them back
// to ?stripe_onboarding=complete. The webhook handler picks up
// account.updated and flips stripe_account_status to 'verified' once the
// account has charges_enabled + payouts_enabled.
//
// Env vars required:
//   STRIPE_SECRET_KEY       — your Stripe secret key (sk_test_… or sk_live_…)
//   SUPABASE_URL            — auto-provided by Supabase
//   SUPABASE_ANON_KEY       — auto-provided
//   SUPABASE_SERVICE_ROLE_KEY — for the write-back to profiles

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { corsHeaders, jsonOk, jsonError } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return jsonError(503, 'Stripe not configured. Set STRIPE_SECRET_KEY in Edge Function env.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonError(401, 'Missing Authorization header');

    // User-scoped client to identify the caller via their JWT.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return jsonError(401, 'Invalid auth token');

    // Service client for writing back to profiles (bypasses RLS).
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });

    // Look up the user's existing account, if any.
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let accountId = profile?.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers:     { requested: true },
        },
        business_type: 'individual',
        metadata: { user_id: user.id },
      });
      accountId = account.id;
      // Upsert in case the profile row was created via the auth trigger
      // but doesn't yet have the column populated.
      await admin.from('profiles')
        .update({ stripe_account_id: accountId, stripe_account_status: 'pending' })
        .eq('user_id', user.id);
    }

    const origin = req.headers.get('origin') || 'https://jamradar.netlify.app';
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/?stripe_onboarding=refresh`,
      return_url:  `${origin}/?stripe_onboarding=complete`,
      type: 'account_onboarding',
    });

    return jsonOk({ url: accountLink.url, account_id: accountId });
  } catch (e) {
    console.error('[stripe-onboard-seller] error:', e);
    return jsonError(500, e instanceof Error ? e.message : 'Unknown error');
  }
});
