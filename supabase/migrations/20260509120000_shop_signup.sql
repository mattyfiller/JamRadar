-- Shop self-signup: shops can now post gear deals directly through the app.
--
-- Mirrors the events flow: shop_user_id links a deal to its owner, RLS
-- enforces that owners can post deals as 'pending' but cannot self-approve
-- or self-feature. Admins (via is_admin()) can flip status, sponsored, and
-- featured_until on any deal.

alter table public.gear_deals
  add column if not exists shop_user_id  uuid references auth.users(id) on delete set null,
  add column if not exists sponsored     boolean not null default false,
  add column if not exists featured_until timestamptz,
  add column if not exists trust_tier    int not null default 0;

create index if not exists gear_deals_shop_user_idx
  on public.gear_deals (shop_user_id);

create index if not exists gear_deals_featured_until_idx
  on public.gear_deals (featured_until)
  where featured_until is not null;

-- Owners can read their own pending deals; everyone reads approved.
drop policy if exists "gear_deals_public_read" on public.gear_deals;
create policy "gear_deals_public_read"
  on public.gear_deals for select
  using (
    status = 'approved'
    or auth.uid() = shop_user_id
  );

-- Shops can insert their own deals as 'pending' only. Cannot self-approve,
-- self-feature, or set sponsored. RLS enforces this even if the client
-- tries; defense in depth alongside the front-end's status='pending' write.
drop policy if exists "gear_deals_shop_insert" on public.gear_deals;
create policy "gear_deals_shop_insert"
  on public.gear_deals for insert
  to authenticated
  with check (
    coalesce(shop_user_id, auth.uid()) = auth.uid()
    and status = 'pending'
    and coalesce(sponsored, false) = false
    and coalesce(trust_tier, 0)    = 0
    and featured_until is null
  );

-- Owners can edit their own deals (price drops, typo fixes) but cannot
-- promote them to approved/sponsored/featured.
drop policy if exists "gear_deals_shop_update" on public.gear_deals;
create policy "gear_deals_shop_update"
  on public.gear_deals for update
  to authenticated
  using (auth.uid() = shop_user_id)
  with check (
    auth.uid() = shop_user_id
    and status = 'pending'
    and coalesce(sponsored, false) = false
    and coalesce(trust_tier, 0)    = 0
    and featured_until is null
  );

-- Admins can update anything — moderation, feature flips, sponsored toggles.
drop policy if exists "gear_deals_admin_update" on public.gear_deals;
create policy "gear_deals_admin_update"
  on public.gear_deals for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Owners can delete their own deals (mistakes, sold-out items).
drop policy if exists "gear_deals_shop_delete" on public.gear_deals;
create policy "gear_deals_shop_delete"
  on public.gear_deals for delete
  to authenticated
  using (auth.uid() = shop_user_id);
