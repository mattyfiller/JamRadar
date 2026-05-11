// stripe-webhook — receives Stripe events, updates Supabase.
//
// Configure in Stripe Dashboard → Developers → Webhooks → Add endpoint:
//   URL:     https://rgxbhyhzulimznkphnrd.supabase.co/functions/v1/stripe-webhook
//   Events:  account.updated
//            checkout.session.completed
//            payment_intent.succeeded
//            charge.refunded
//            charge.dispute.created
//
// Stripe gives you a webhook signing secret (whsec_...) — paste into
// STRIPE_WEBHOOK_SECRET in the Edge Function env.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

Deno.serve(async (req: Request) => {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const whSecret  = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!stripeKey || !whSecret) {
    return new Response('Stripe webhook not configured', { status: 503 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing stripe-signature header', { status: 400 });

  const body = await req.text();
  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, whSecret);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err);
    return new Response(`Webhook signature failed: ${err instanceof Error ? err.message : 'unknown'}`, { status: 400 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    switch (event.type) {
      // ─── Seller onboarded ──────────────────────────────────────
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const isReady = account.charges_enabled && account.payouts_enabled
          && account.details_submitted;
        const status = isReady ? 'verified'
          : account.disabled_reason ? 'restricted'
          : 'pending';
        await admin.from('profiles')
          .update({ stripe_account_status: status })
          .eq('stripe_account_id', account.id);
        break;
      }

      // ─── Buyer completed checkout ─────────────────────────────
      // We listen on payment_intent.succeeded (more reliable than
      // checkout.session.completed for async payments + dispute flow).
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const meta = pi.metadata || {};
        if (!meta.listing_id) break;

        const feePct    = Number(meta.fee_pct) || 0;
        const feeCents  = pi.application_fee_amount ?? 0;
        const feeAmount = feeCents / 100;

        const { error } = await admin.from('gear_listings').update({
          status: 'sold',
          sold_at: new Date().toISOString(),
          sold_to_user_id: meta.buyer_user_id,
          stripe_payment_intent: pi.id,
          fee_pct: feePct,
          fee_amount: feeAmount,
        }).eq('id', meta.listing_id);
        if (error) console.error('[stripe-webhook] listing update failed:', error.message);
        break;
      }

      // ─── Refund — flip back to active or mark refunded ────────
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
        if (!piId) break;
        await admin.from('gear_listings').update({
          status: 'withdrawn',          // refunded → withdrawn so it doesn't auto-relist
        }).eq('stripe_payment_intent', piId);
        break;
      }

      // ─── Dispute — flag for admin review ──────────────────────
      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        const piId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id;
        if (!piId) break;
        await admin.from('gear_listings').update({
          status: 'flagged',
        }).eq('stripe_payment_intent', piId);
        // TODO: ping admin via real notification when that channel exists
        break;
      }

      default:
        // Stripe sends a lot of events we don't care about. ACK them all.
        break;
    }
  } catch (e) {
    console.error('[stripe-webhook] handler error:', e);
    // Return 200 so Stripe doesn't retry on our handler bugs (we still log).
  }

  return new Response('ok', { status: 200 });
});
