-- gear_listings — peer-to-peer used-gear marketplace (rider sells to rider).
--
-- Distinct from gear_deals (which is scraped affiliate inventory from shops).
-- Listings are user-generated, photo-rich, condition-graded, and either local
-- pickup or shipped at the seller's discretion.
--
-- Phase 1: free listings, contact seller out-of-band via the OS share sheet.
-- Phase 2 (when Stripe Connect is wired): in-app Checkout with our fee taken
-- via application_fee_amount; status flips to 'sold' on webhook confirmation.
-- The columns below are forward-compatible with that.

create table if not exists public.gear_listings (
  id              uuid        primary key default gen_random_uuid(),

  seller_user_id  uuid        not null references auth.users(id) on delete cascade,
  seller_name     text,                          -- denormalised for display; pulled from profile at insert time

  title           text        not null,
  description     text,
  brand           text,                          -- "Burton" / "Capita" / "Vans" — free text
  size            text,                          -- "158" / "Large" / "10.5" — free text since varies by category
  condition       text        not null check (condition in ('new', 'like-new', 'used', 'well-loved')),

  sport           text        not null,
  category        text,                          -- 'snowboard' | 'bindings' | 'boots' | 'jacket' | 'helmet' | 'goggles' | 'pants' | 'other'

  price           numeric     not null check (price >= 0),
  currency        text        not null default 'USD',

  photos          text[]      not null default '{}',  -- public URLs from posters bucket
  location        text,                                -- "Vancouver, BC" — for local-pickup buyers
  lat             numeric,
  lon             numeric,

  shipping        text        check (shipping in ('local-only', 'will-ship', 'either')),
  shipping_cost   numeric,                       -- buyer pays this on top of price

  -- Lifecycle.
  status          text        not null default 'active' check (status in ('active', 'sold', 'withdrawn', 'flagged')),
  sold_at         timestamptz,
  sold_to_user_id uuid        references auth.users(id),

  -- Phase 2 hooks (Stripe Connect). NULL until in-app payments ship.
  stripe_payment_intent text,
  fee_pct         numeric,                       -- snapshot of our take rate at sale time
  fee_amount      numeric,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists gear_listings_status_idx       on public.gear_listings (status);
create index if not exists gear_listings_sport_idx        on public.gear_listings (sport);
create index if not exists gear_listings_seller_idx       on public.gear_listings (seller_user_id);
create index if not exists gear_listings_created_at_idx   on public.gear_listings (created_at desc);
create index if not exists gear_listings_active_recent_idx
  on public.gear_listings (created_at desc)
  where status = 'active';

alter table public.gear_listings enable row level security;

-- Anyone (anon or authed) can browse active listings; sellers can additionally
-- see their own withdrawn / sold ones.
drop policy if exists "listings_public_read" on public.gear_listings;
create policy "listings_public_read"
  on public.gear_listings for select
  using (
    status = 'active'
    or auth.uid() = seller_user_id
  );

-- Sellers insert their own listings as 'active'. Cannot self-set sold/sold_to/
-- payment fields — those flip via the marked-sold action (server-side or
-- Stripe webhook).
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
  );

-- Sellers can edit / mark-as-sold-manually / withdraw their own listings.
-- They cannot fake a sale to a specific buyer (sold_to_user_id stays NULL on
-- self-marked sold; only Stripe webhooks can set it).
drop policy if exists "listings_seller_update" on public.gear_listings;
create policy "listings_seller_update"
  on public.gear_listings for update
  to authenticated
  using (auth.uid() = seller_user_id)
  with check (
    auth.uid() = seller_user_id
    and (sold_to_user_id is null)        -- owner-self-marks doesn't claim a buyer
    and stripe_payment_intent is null    -- only the webhook may set this
  );

drop policy if exists "listings_seller_delete" on public.gear_listings;
create policy "listings_seller_delete"
  on public.gear_listings for delete
  to authenticated
  using (auth.uid() = seller_user_id);

-- Admins can flag spam / fraud / withdraw on the seller's behalf.
drop policy if exists "listings_admin_update" on public.gear_listings;
create policy "listings_admin_update"
  on public.gear_listings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- updated_at maintenance.
drop trigger if exists gear_listings_touch_updated_at on public.gear_listings;
create trigger gear_listings_touch_updated_at
  before update on public.gear_listings
  for each row execute function public.touch_updated_at();
