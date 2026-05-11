# Stripe Connect setup (Phase 2 marketplace monetization)

End-to-end checklist for turning on in-app payments + the platform fee.
Everything in the code is already prepared; this doc is the operational
steps that have to happen in your Stripe + Supabase dashboards.

## Prerequisite: code already shipped

These exist in the repo waiting for keys:

- Migration `supabase/migrations/20260510140000_stripe_connect.sql`
  (already applied to the live DB)
- Edge Functions in `supabase/functions/`:
  - `stripe-onboard-seller`
  - `stripe-create-checkout`
  - `stripe-webhook`
- Frontend: Profile → "Set up payouts" card; ListingDetail Buy-now button
  with graceful fallback to contact-reveal when payments aren't ready.

## 1. Stripe account (~5 min)

1. Sign up at https://dashboard.stripe.com/register
2. Stripe asks if you're a platform or marketplace — pick **Yes, I run a
   marketplace** so Connect is provisioned.
3. Activate **Stripe Connect**: Dashboard → Connect → click **Get started**.
   Settings → Connect → enable **Express accounts**.
4. Top-right toggle → **Test mode** (do everything below in test mode first).

## 2. Get your keys (~30 sec)

In Test mode, go to Developers → API keys:

- **Publishable key** (`pk_test_…`) — not needed; we only use the secret on the server.
- **Secret key** (`sk_test_…`) — copy this.

## 3. Set Edge Function secrets in Supabase (~2 min)

In your Supabase project Dashboard → Project Settings → Edge Functions →
Add the following secrets:

| Name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` from step 2 |
| `MARKETPLACE_FEE_LOCAL_PCT` | `5` (local pickup commission) |
| `MARKETPLACE_FEE_SHIPPED_PCT` | `10` (shipped commission) |
| `STRIPE_WEBHOOK_SECRET` | (we get this in step 5) |

## 4. Deploy the Edge Functions

Via Supabase CLI on your Mac/local machine:

```bash
# One-time CLI install
brew install supabase/tap/supabase

# Inside the JamRadar repo
supabase login
supabase link --project-ref rgxbhyhzulimznkphnrd

# Deploy all three
supabase functions deploy stripe-onboard-seller
supabase functions deploy stripe-create-checkout
supabase functions deploy stripe-webhook --no-verify-jwt
# (--no-verify-jwt on the webhook because Stripe calls it without an auth header)
```

The functions will be live at:
- `https://rgxbhyhzulimznkphnrd.supabase.co/functions/v1/stripe-onboard-seller`
- `https://rgxbhyhzulimznkphnrd.supabase.co/functions/v1/stripe-create-checkout`
- `https://rgxbhyhzulimznkphnrd.supabase.co/functions/v1/stripe-webhook`

If you don't have CLI access, ping me — I can deploy via the Supabase
Management API instead.

## 5. Configure the webhook (~2 min)

In Stripe Dashboard → Developers → Webhooks → **Add endpoint**:

- **URL**: `https://rgxbhyhzulimznkphnrd.supabase.co/functions/v1/stripe-webhook`
- **Events to listen to**: select these five:
  - `account.updated`
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `charge.refunded`
  - `charge.dispute.created`
- Click **Add endpoint**.
- On the endpoint detail page, copy the **Signing secret** (`whsec_…`).
- Add it to Supabase Edge Function secrets as `STRIPE_WEBHOOK_SECRET`.

## 6. Test end-to-end

1. Open the live app, sign in.
2. Profile → tap **Set up payouts**. Stripe-hosted onboarding opens.
3. Use Stripe's test data:
   - Phone: any valid format
   - DOB: any date 18+
   - SSN: `000-00-0000`
   - Bank: routing `110000000`, account `000123456789`
   - Address: any
4. Finish → redirects back to the app. Toast: "Payouts set up."
5. Post a gear listing.
6. From another browser/incognito (or another account), sign in, open
   that listing, tap **Buy now**.
7. Stripe Checkout opens. Use test card `4242 4242 4242 4242`, any
   future expiry, any CVC, any zip.
8. After payment, you're redirected to the app with a success toast.
9. The listing flips to `status='sold'` in Supabase.
10. The fee shows up in your Stripe Dashboard → Payments → look for the
    new payment intent; under "Application fees" you'll see the cut.

## 7. Go live

When the test run works end-to-end:

1. Stripe Dashboard → top-right toggle → **Live mode**.
2. Repeat steps 2–5 with live keys (`sk_live_…`, new `whsec_…` for the
   live webhook endpoint). The Express accounts and onboarding links
   are mode-scoped, so live sellers re-onboard on first payout.
3. Update the Supabase secrets to the live values.

## Fee model (current defaults)

- Local pickup: **5%** of sale price
- Shipped: **10%** of sale price

Configured per environment via `MARKETPLACE_FEE_LOCAL_PCT` and
`MARKETPLACE_FEE_SHIPPED_PCT` Edge Function secrets. Stripe also
takes their cut (2.9% + 30¢) from the seller's portion.

## Compliance handled by Stripe

- KYC verification (driver's license, SSN, etc.) — Stripe Express flow.
- 1099-K reporting for US sellers with > $600/year volume.
- Sales tax in 45+ states via Stripe Tax (turn it on per-account if you want).
- ACH bank payouts to sellers (typically 2-day rolling).
- Dispute / chargeback handling.

## What we handle in-app

- Listing creation + photo upload
- Marking listings sold (auto-flipped by webhook on payment_intent.succeeded)
- Buyer-seller contact fallback when seller hasn't onboarded
- Admin moderation of listings (flag/withdraw via existing admin queue)

## Failure modes + fallbacks

| Scenario | Behavior |
|---|---|
| `STRIPE_SECRET_KEY` not set in Edge Function env | Buy-now returns 503 → frontend toasts + reveals contact info |
| Seller hasn't completed onboarding | Buy-now returns 409 → frontend toasts + reveals contact info |
| Webhook signing secret wrong | Webhook returns 400 → Stripe retries, will surface in their dashboard |
| Stripe Connect not enabled | Onboard-seller call fails with clear error |

All paths degrade gracefully back to the Phase 1 contact-reveal flow,
so the marketplace keeps working even if Stripe is misconfigured.
