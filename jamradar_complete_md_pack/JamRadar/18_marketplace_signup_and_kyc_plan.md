# 18 - Marketplace Signup, Auth, and KYC Plan

How users sign up to **sell** used gear on JamRadar. Sister doc to [07_gear_deals_and_marketplace.md](07_gear_deals_and_marketplace.md), which covers the marketplace concept; this one covers identity, verification, money, and risk.

> **TL;DR:** Anonymous browsing → email signup to save/follow → phone-verified to message → identity-verified to sell paid → bank-linked to receive payouts. Each tier adds friction only when it earns trust. Don't ship the full stack on day one.

---

## 1. Why this matters

The marketplace is the most legally and operationally heavy feature in the entire app. Get it wrong and you get:

- **Stolen-gear lawsuits** — skis and boards are commonly stolen. Selling stolen goods, even unknowingly, is a problem for the platform.
- **Tax / reporting obligations** — IRS Form 1099-K (US) and T4A (Canada) trigger above thresholds. Missing this is a real liability.
- **Chargebacks and fraud** — buyers claim "didn't arrive," sellers claim "buyer destroyed it." Without escrow and dispute tooling, JamRadar absorbs the cost.
- **Safety incidents** — meeting strangers for local pickup. There's been a long, ugly history of this on Craigslist.

The spec already defers the full marketplace to Phase 2/3. This doc plans the auth + verification ramp so we don't paint ourselves into a corner when we get there.

---

## 2. Tiered auth model

Different actions need different levels of trust. Five tiers, each adding a verification step:

| Tier | What you can do | What you've given us |
|---|---|---|
| **0. Anonymous** | Browse events, browse map, browse gear deals | Nothing. No signup. |
| **1. Registered** | Save events, follow orgs, customize prefs, get notifications | Email + password (or Apple/Google sign-in) |
| **2. Verified** | Message sellers, post events as a non-org user | Verified email + verified phone (SMS code) |
| **3. Seller** | List used gear for sale, accept local-pickup-only sales | Tier 2 + real name + listing-quality photos |
| **4. Paid Seller** | List used gear with in-app payment, receive payouts | Tier 3 + bank account / Stripe Connect onboarding (KYC) |

Most riders only ever reach Tier 1. Sellers self-select into Tier 3+.

---

## 3. Why a tiered model (and not "sign up to use anything")

Three reasons:

1. **Conversion.** Forced signup walls kill discovery. Riders who can't see what events are nearby won't bother signing up.
2. **Risk-proportionate friction.** A teenager browsing rail jams shouldn't have to upload a driver's license. A 35-year-old selling a $1,200 splitboard reasonably should.
3. **Compliance scope.** Tier 0–2 don't trigger any KYC or money-transmission rules. Only Tier 4 does. Drawing the line clearly keeps legal complexity contained.

---

## 4. Auth implementation

### Provider

**Supabase Auth** (recommended per [12_technical_roadmap.md](12_technical_roadmap.md) and [17_data_ingest_plan.md](17_data_ingest_plan.md)). Reasons:

- Email + password
- OAuth: Google, Apple (required for iOS App Store), GitHub (rare but useful for organizers)
- Phone-OTP (SMS) — needed for Tier 2
- Free tier: 50,000 monthly active users. Enough until we have real scale.
- Row-level security (RLS) plays nicely with Postgres

Alternatives considered:
- **Firebase Auth** — works, but locks you into Google's stack. Migration is harder later.
- **Auth0** — overkill and paid.
- **Roll your own** — never. JWT bugs are nightmares.

### Apple sign-in is not optional

If JamRadar ships in the App Store and offers any third-party sign-in (Google, etc.), Apple's review guidelines require **Sign in with Apple** as an option. Build it from day one.

### Magic-link option

Add **passwordless email magic links** alongside password sign-up. Many riders won't want yet another password. Supabase supports this natively.

### Account recovery

- Email reset link (standard)
- Backup contact email at signup (optional but nice)
- Phone number recovery (only after phone is verified)

---

## 5. Listing flow (Tier 3 — selling)

What happens when a registered user (Tier 1 or 2) taps "Sell my gear":

1. **Phone verification check.** If not at Tier 2, prompt for SMS code.
2. **Real-name modal.** "What name should we put on your listings?" — first name + last initial. Stored, not displayed publicly until first sale.
3. **Listing form:**
   - **Photos** — minimum 3, max 8. Take new ones in-app preferred (lights up freshness signal); upload from camera roll allowed.
   - **Category** — skis / snowboard / boots / bindings / poles / outerwear / helmets / goggles / skate deck / trucks / wheels / bearings / pads / other
   - **Sport** — auto-derived from category, editable
   - **Brand + model** — autocomplete from a maintained dictionary (top 200 brands per sport)
   - **Size** — pulled from category-specific units (skis: cm; boots: Mondopoint + US size; outerwear: S/M/L/XL/XXL)
   - **Condition** — 1–5 stars with required short note ("Edges retuned last season, no core shots")
   - **Price** — required. Show "Fair price range" hint based on brand/model/condition (Phase 3: ML model; Phase 2: simple lookup table).
   - **Pickup mode** — Local pickup only / Local + ship at buyer cost / In-app paid + ship (Tier 4 only)
   - **Postal code** — for radius search; not shown to buyers until messaging
   - **Description** — free text, 500 char max
4. **Listing review.** Auto-publish if seller has prior successful sales; **pending admin** for first 3 listings of a new seller (anti-fraud).
5. **Confirmation + share link.**

### Stolen-gear check

Before publish, run two cheap checks:

- **Serial number lookup** — for skis/snowboards, ask for the serial (laser-etched on the topsheet near the binding). Cross-reference an internal database of reported-stolen serials.
- **Photo reverse-search** (Phase 3) — flag listings whose photos appear on Reddit's stolen-gear threads or insurance-company databases.

These won't catch everything, but they raise the cost of fencing stolen goods on the platform and create a paper trail if law enforcement asks.

---

## 6. Buying flow

Two modes:

### Mode A — Local pickup (Phases 2 and 3)

1. Buyer browses listings, filters by sport / size / radius / price.
2. Taps a listing → sees photos, description, seller's verified-since date and rating count.
3. Taps **Message seller** → triggers Tier 2 verification (phone) if not already verified.
4. In-app messaging (Supabase realtime). No email or phone exchanged unless both opt in.
5. They arrange pickup off-platform (or via the in-app "Suggest meeting place" with public-place suggestions).
6. After pickup, both rate each other (1–5 stars + optional review).

JamRadar takes no money in this flow. Listing is free. Boosted listings are paid (Tier 3 → Tier 4 not required for boosting).

### Mode B — In-app paid (Phase 3, Tier 4 only)

1. Buyer taps **Buy now** → in-app checkout with Apple Pay / Google Pay / card.
2. Funds held in escrow.
3. Seller ships within 3 days, uploads tracking number.
4. Funds release to seller when buyer marks "received in good condition" OR after 7 days post-delivery confirmation, whichever is first.
5. Disputes handled by admin within 48 hours.

JamRadar takes 5–10% per transaction (per spec).

---

## 7. KYC and money — the Tier 4 hurdle

To accept Mode B sales, sellers must complete KYC. We outsource this entirely:

### Stripe Connect Express

- Stripe handles ID verification, bank account linking, 1099-K issuance (US), T4A reporting (Canada).
- Sellers complete a one-time onboarding flow inside JamRadar (embedded Stripe-hosted UI).
- JamRadar holds zero financial data. We never touch raw bank/card info.

### Required for Tier 4
- Legal name
- Date of birth
- Government ID (driver's license, passport)
- Bank account or debit card for payouts
- Tax ID (SSN/EIN in US, SIN in Canada)
- Address verification

### What JamRadar stores
- Stripe `account_id` (a string)
- Verification status (verified / pending / rejected)
- Payout schedule preference

That's it. Stripe holds the sensitive data on their PCI/AML-compliant infrastructure.

### Costs
- Stripe Connect: ~2.9% + $0.30 per transaction (US/Canada)
- JamRadar's take-rate (5–10%) sits on top of that
- Stripe handles chargebacks; JamRadar's marketplace policy decides who absorbs losses (usually the seller for "didn't ship" disputes)

---

## 8. Trust & safety scoreboard

Each user accumulates a trust score from:

| Signal | Weight |
|---|---|
| Account age | + |
| Phone verified | + |
| Successful sales | ++ |
| Successful purchases | + |
| Avg rating from counterparties | +++ |
| Listings flagged for review | − |
| Disputes opened | −− |
| Fraud strikes | −−−− |

Visible to other users as a star rating + "Selling since [date]" — not the raw score.

### Reports

Every user can:
- Report a listing (counterfeit, stolen, mispriced, NSFW)
- Report a user (harassment, scam attempt)
- Block a user

Reports flow into the admin moderation queue (we already have the UI). High-severity reports (stolen claim, fraud) get instant listing pause pending review.

### Safety messaging

Public-meeting suggestions for local pickup (well-lit parking lots, police-station parking lots, city-designated "safe exchange zones" — most North American police departments now publish these).

---

## 9. Phased rollout

### Phase A — Marketplace OFF (current)
- Anonymous browsing (Tier 0)
- Email signup (Tier 1) for save/follow only
- Gear deals from shops only — no peer-to-peer

### Phase B — Auth groundwork (concurrent with Tier 2 backend work)
- Build Supabase Auth integration: email/password + Apple + Google + magic link
- Phone OTP (Tier 2) for organizers posting events directly
- Migrate the existing localStorage prefs to per-user records on signup
- Estimate: 2 weeks engineering

### Phase C — Free local-pickup marketplace (Phase 2 in spec)
- Tier 3 selling, Tier 1+ buying, in-app messaging
- No money handling — JamRadar is just the venue
- Listings + photos + ratings
- Admin moderation queue for first listings + reports
- Estimate: 4–6 weeks engineering

### Phase D — Paid in-app marketplace (Phase 3 in spec)
- Stripe Connect onboarding
- Tier 4 verification flow
- In-app checkout + escrow
- Dispute resolution UI for admin
- Tax form generation (delegated to Stripe)
- Estimate: 6–8 weeks engineering, plus legal review

### Phase E — Trust automation (Phase 3+)
- Serial-number stolen-gear database
- Photo reverse-search
- Fair-price ML model
- Buyer/seller fraud scoring

---

## 10. What to NOT build first

These are tempting but trap-laden — defer all of them past Phase D:

- **Auctions** — UX complexity + payment timing edge cases not worth it.
- **Group/bulk listings** ("selling my whole quiver") — solve once normal listings hit volume.
- **Trade-in / barter** — accounting nightmare.
- **Equipment rental** — different liability profile entirely. Could be its own product later.
- **Gear authentication / certification** — partner with brands, don't build it ourselves.

---

## 11. Concrete next implementation step

When Tier 2 backend work begins (after Phase A user growth justifies it):

1. **Pick auth provider** → Supabase Auth (decided here)
2. **Build the auth screens** — sign in, sign up, magic link, OAuth, phone OTP
3. **Migrate the existing local-only prefs** to a `profiles` table keyed by `auth.uid`
4. **Add the tier check helper** — central function that takes a user and required tier, gates the UI
5. **Connect existing CreateEvent → require Tier 2** before publishing

That alone takes the app from "demo on one device" to "real multi-user app" — without yet building the marketplace. The marketplace is then a feature on top of an already-real auth surface.

---

## TL;DR

- 5 auth tiers from anonymous → KYC'd seller. Friction only where trust is needed.
- **Supabase Auth** for tiers 0–2. **Stripe Connect** for tier 4 KYC + payouts.
- Marketplace ships in two phases: free local-pickup first, paid in-app later.
- We never store payment data ourselves.
- Apple sign-in is mandatory if we ever ship to App Store.
- Stolen-gear screening + serial-number tracking are non-negotiable for credibility.
- Phase A (now) → Phase B (auth groundwork, ~2 weeks) → Phase C (free marketplace, ~6 weeks) → Phase D (paid marketplace, ~8 weeks + legal).
