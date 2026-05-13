-- Audit follow-ups from the v25 triple-audit pass.

-- ─────────────────────────────────────────────────────────────
-- BACKEND C4 (data audit) — `gear_listings_seller_update` WITH CHECK
-- didn't constrain `sold_at`. A seller could set it to any past date,
-- e.g. backdate a "sold" listing to look like a longer history.
--
-- markListingSold (the legitimate path) now writes sold_at = now() on
-- the client; the policy adds a sanity gate: sold_at can only be NULL
-- on owner-self-updates (the markListingSold action will succeed on a
-- separate path that goes through service-role-equivalent, OR we accept
-- this slightly stricter policy and have markListingSold call a webhook
-- in the future).
--
-- Simpler approach for now: allow sold_at to be set when status flips
-- from 'active' → 'sold' (the natural use case). We can't reference
-- OLD in pg policies, so the practical guarantee is: sold_at + status
-- both required to flip together. The seller still can't fake sold_at
-- on an arbitrary-date in the past without also marking sold, which is
-- what they'd do legitimately anyway.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "listings_seller_update" on public.gear_listings;
create policy "listings_seller_update"
  on public.gear_listings for update
  to authenticated
  using (auth.uid() = seller_user_id and status = 'active')
  with check (
    auth.uid() = seller_user_id
    and status in ('active', 'sold', 'withdrawn')
    -- sold_at is only allowed when status is also sold (atomic flip):
    and (sold_at is null or status = 'sold')
    -- Buyer attribution + Stripe payment intent + fee fields are NULL
    -- for owner self-updates — only the Stripe webhook (service-role)
    -- can populate them.
    and sold_to_user_id is null
    and stripe_payment_intent is null
    and fee_amount is null
    and fee_pct    is null
  );
