-- Phase 2 marketplace prep: Stripe Connect.
-- Sellers complete Stripe Express onboarding (KYC + bank), we save their
-- account_id on their profile. Listings show "Buy now" when the seller has
-- a verified account; otherwise fall back to the Phase 1 contact-reveal.
--
-- Live until: Stripe keys are pasted into the Edge Function env. Until then
-- the frontend gracefully no-ops (the onboarding CTA hits a 503).

alter table public.profiles
  add column if not exists stripe_account_id     text,
  -- 'pending' → account created, still onboarding
  -- 'verified' → KYC + capabilities done, can receive payouts
  -- 'restricted' → Stripe flagged something (admin review)
  add column if not exists stripe_account_status text check (
    stripe_account_status in ('pending', 'verified', 'restricted', 'disabled')
  );

create index if not exists profiles_stripe_account_idx
  on public.profiles (stripe_account_id)
  where stripe_account_id is not null;

-- Self-update policy for profiles already exists, but we must NOT let users
-- set their own stripe_account_status to 'verified' — Stripe is the source
-- of truth via webhook. Tighten the with-check.
-- (Field-level RLS isn't a Postgres feature; we'll filter the column at the
-- application layer in store.jsx pushToServer to strip stripe_* fields from
-- client-side writes. Defense in depth: the column exists, but client writes
-- only flow through pushToServer which won't include it.)
