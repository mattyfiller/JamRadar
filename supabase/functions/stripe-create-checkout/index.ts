// stripe-create-checkout — creates a Stripe Checkout Session for a listing.
// Called from ListingDetail "Buy now" button. Returns the hosted URL; the
// frontend redirects the buyer there.
//
// Destination-charge flow: payment goes through the platform, application_fee
// is automatically deducted, the rest is transferred to the seller's Stripe
// Express account. Stripe handles payout scheduling + 1099-K reporting.
//
// Env vars:
//   STRIPE_SECRET_KEY
//   MARKETPLACE_FEE_PCT   — integer percent, defaults to 8
//   SUPABASE_URL / ANON / SERVICE_ROLE

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { corsHeaders, jsonOk, jsonError } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return jsonError(503, 'Stripe not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonError(401, 'Sign in to buy');

    const body = await req.json().catch(() => ({}));
    const listingId = body.listing_id;
    if (!listingId) return jsonError(400, 'listing_id required');

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonError(401, 'Invalid auth');

    // Service client to read listing + seller regardless of RLS state.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: listing, error: listingErr } = await admin
      .from('gear_listings')
      .select('id, title, price, currency, seller_user_id, status, photos, shipping')
      .eq('id', listingId)
      .maybeSingle();
    if (listingErr || !listing) return jsonError(404, 'Listing not found');
    if (listing.status !== 'active') return jsonError(409, 'Listing not available');
    if (listing.seller_user_id === user.id) return jsonError(400, "Can't buy your own listing");

    const { data: seller } = await admin
      .from('profiles')
      .select('stripe_account_id, stripe_account_status')
      .eq('user_id', listing.seller_user_id)
      .maybeSingle();
    if (!seller?.stripe_account_id || seller.stripe_account_status !== 'verified') {
      return jsonError(409, "Seller hasn't completed payment setup");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });

    // Fee. Local-pickup gets 5%, shipped gets 10% — encourages shipped sales
    // where we provide more value (no flake risk). Configurable via env.
    const localPct   = Number(Deno.env.get('MARKETPLACE_FEE_LOCAL_PCT'))   || 5;
    const shippedPct = Number(Deno.env.get('MARKETPLACE_FEE_SHIPPED_PCT')) || 10;
    const feePct = listing.shipping === 'local-only' ? localPct : shippedPct;

    const priceCents = Math.round(Number(listing.price) * 100);
    const feeCents   = Math.round(priceCents * feePct / 100);

    const origin = req.headers.get('origin') || 'https://jamradar.netlify.app';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: (listing.currency || 'usd').toLowerCase(),
          unit_amount: priceCents,
          product_data: {
            name: listing.title,
            images: (listing.photos || []).slice(0, 1),
          },
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: feeCents,
        transfer_data: { destination: seller.stripe_account_id },
        metadata: {
          listing_id: listing.id,
          buyer_user_id: user.id,
          seller_user_id: listing.seller_user_id,
          fee_pct: String(feePct),
        },
      },
      // Stripe also needs metadata on the session for our webhook.
      metadata: {
        listing_id: listing.id,
        buyer_user_id: user.id,
        seller_user_id: listing.seller_user_id,
      },
      customer_email: user.email,
      success_url: `${origin}/?sale=success&listing=${listing.id}`,
      cancel_url:  `${origin}/?listing=${listing.id}`,
    });

    return jsonOk({ url: session.url, session_id: session.id });
  } catch (e) {
    console.error('[stripe-create-checkout] error:', e);
    return jsonError(500, e instanceof Error ? e.message : 'Unknown error');
  }
});
