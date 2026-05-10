-- Audit-fix migration. Three parallel audits surfaced these. Each block is
-- documented with the finding it closes.

-- ─────────────────────────────────────────────────────────────
-- BACKEND C1 — Shop can demote/re-spam own approved or rejected deals
-- via upsert. The original `gear_deals_shop_update` only WITH-CHECKed the
-- new status='pending'; it didn't constrain WHICH rows can be updated.
-- A shop could PATCH its already-approved row back to pending, taking it
-- off Discover, or re-submit a rejected one back into the queue.
--
-- Fix: USING clause now requires status = 'pending'. Once admin has
-- approved/rejected it, the row is locked from the seller side — only
-- admins can touch it (events_admin_update equivalent already exists).
-- ─────────────────────────────────────────────────────────────
drop policy if exists "gear_deals_shop_update" on public.gear_deals;
create policy "gear_deals_shop_update"
  on public.gear_deals for update
  to authenticated
  using (
    auth.uid() = shop_user_id
    and status = 'pending'                       -- only pending rows are seller-editable
  )
  with check (
    auth.uid() = shop_user_id
    and status = 'pending'
    and coalesce(sponsored, false) = false
    and coalesce(trust_tier, 0)    = 0
    and featured_until is null
  );

-- ─────────────────────────────────────────────────────────────
-- BACKEND M4 — gear_deals_shop_insert used coalesce(shop_user_id, auth.uid())
-- which let a client pass shop_user_id=null. The row would insert but the
-- update policy's `auth.uid() = shop_user_id` (no coalesce) never matched,
-- creating orphan rows the shop couldn't edit later.
-- Fix: require shop_user_id = auth.uid() exactly at insert time.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "gear_deals_shop_insert" on public.gear_deals;
create policy "gear_deals_shop_insert"
  on public.gear_deals for insert
  to authenticated
  with check (
    shop_user_id = auth.uid()
    and status = 'pending'
    and coalesce(sponsored, false) = false
    and coalesce(trust_tier, 0)    = 0
    and featured_until is null
  );

-- ─────────────────────────────────────────────────────────────
-- BACKEND C2 — gear_listings policies didn't constrain fee_amount,
-- fee_pct, sold_at on insert/update. A seller could pre-write fake
-- payout values that would race the Stripe webhook in Phase 2.
-- BACKEND M3 — Seller could flip a sold/withdrawn listing back to
-- 'active' on update; no status transition guard.
--
-- Fix: tighter `with check` blocks both Phase-2 financial fields and
-- prohibits status downgrades (sold → active, withdrawn → active).
-- The action `markListingSold` updates `status='sold'` which still
-- passes (USING is checked against the OLD row).
-- ─────────────────────────────────────────────────────────────
drop policy if exists "listings_seller_insert" on public.gear_listings;
create policy "listings_seller_insert"
  on public.gear_listings for insert
  to authenticated
  with check (
    auth.uid() = seller_user_id
    and status = 'active'
    and sold_at is null
    and sold_to_user_id is null
    and stripe_payment_intent is null
    and fee_amount is null
    and fee_pct    is null
  );

drop policy if exists "listings_seller_update" on public.gear_listings;
create policy "listings_seller_update"
  on public.gear_listings for update
  to authenticated
  using (auth.uid() = seller_user_id and status = 'active')
  with check (
    auth.uid() = seller_user_id
    -- Allowed transitions for self-updates:
    --   active  → active   (edit price, photos, description)
    --   active  → sold     (markListingSold)
    --   active  → withdrawn (withdrawListing)
    -- Sold/withdrawn rows are locked: USING above already restricts to
    -- status='active'. Once status changes, seller can't update again.
    and status in ('active', 'sold', 'withdrawn')
    -- Phase-2 financial / buyer-attribution fields stay NULL — only the
    -- Stripe webhook (running with service-role) is allowed to set them.
    and sold_to_user_id is null
    and stripe_payment_intent is null
    and fee_amount is null
    and fee_pct    is null
  );

-- ─────────────────────────────────────────────────────────────
-- BACKEND M2 — No admin INSERT/DELETE on gear_listings. Admins could flag
-- rows by updating, but couldn't hard-delete spam.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "listings_admin_delete" on public.gear_listings;
create policy "listings_admin_delete"
  on public.gear_listings for delete
  to authenticated
  using (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- BACKEND C3 — Posters bucket had no size limit + no MIME whitelist.
-- Anyone signed-in could abuse it as free CDN (videos, executables).
-- Lock to image MIME types; cap at 5 MB per file (plenty for product
-- photos; keeps storage bills predictable).
-- ─────────────────────────────────────────────────────────────
update storage.buckets
  set file_size_limit = 5242880,                 -- 5 MB
      allowed_mime_types = array[
        'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'
      ]
  where id = 'posters';

-- ─────────────────────────────────────────────────────────────
-- BACKEND M5 — Index drift. The partial index covers the only hot query
-- (status='active' ORDER BY created_at DESC). The non-partial duplicates
-- are write-amplification with no read benefit.
-- ─────────────────────────────────────────────────────────────
drop index if exists public.gear_listings_created_at_idx;
drop index if exists public.gear_listings_status_idx;

-- ─────────────────────────────────────────────────────────────
-- FRONTEND C3 — Contact-seller has no actual contact info. Add a
-- contact_info column so sellers must specify HOW buyers reach them
-- (Instagram handle / email / phone / etc.). Free-text; the front-end
-- displays it on the listing detail page once the buyer authenticates.
-- ─────────────────────────────────────────────────────────────
alter table public.gear_listings
  add column if not exists contact_info text;
