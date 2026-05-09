-- Security lockdown migration — addresses the four critical RLS findings:
--   1. Anyone could write org_verified=true, trust_tier=2 on their own events
--   2. Owners could self-approve and self-feature their own events
--   3. pending_merges write-open to every authenticated user
--   4. public_riders view path mismatch + broad profiles SELECT leak
--
-- Apply via: supabase db push  OR paste into SQL Editor.

-- ─────────────────────────────────────────────────────────────
-- 0. Admins allowlist + helper.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.admins (
  user_id    uuid        primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- No public access. Inserts only via service-role.
drop policy if exists "admins_self_check" on public.admins;
create policy "admins_self_check"
  on public.admins for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ─────────────────────────────────────────────────────────────
-- 1+2. Lock down events insert + owner-update so users cannot promote
--      themselves to verified / approved / featured / trust_tier > 0.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "events_insert_authed" on public.events;
create policy "events_insert_authed"
  on public.events for insert
  to authenticated
  with check (
    coalesce(org_user_id, auth.uid()) = auth.uid()
    and status        = 'pending'
    and coalesce(org_verified, false) = false
    and coalesce(featured, false)     = false
    and coalesce(trust_tier, 0)       = 0
  );

drop policy if exists "events_owner_update" on public.events;
create policy "events_owner_update"
  on public.events for update
  to authenticated
  using (auth.uid() = org_user_id)
  with check (
    auth.uid() = org_user_id
    and status        = 'pending'
    and coalesce(org_verified, false) = false
    and coalesce(featured, false)     = false
    and coalesce(trust_tier, 0)       = 0
  );

-- Admins can update anything (status flips, feature toggles, verification).
drop policy if exists "events_admin_update" on public.events;
create policy "events_admin_update"
  on public.events for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- 3. pending_merges admin-only.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "merges_authed_select" on public.pending_merges;
drop policy if exists "merges_authed_update" on public.pending_merges;

create policy "merges_admin_select"
  on public.pending_merges for select
  to authenticated
  using (public.is_admin());

create policy "merges_admin_update"
  on public.pending_merges for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- 4. public_riders view: fix the JSON path AND remove the broad-SELECT
--    policy on profiles that leaked email + private state.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "profiles_public_riders_read" on public.profiles;

drop view if exists public.public_riders;
create view public.public_riders
  with (security_invoker = off, security_barrier = true)
  as
  select
    user_id                                                  as id,
    coalesce(state->'prefs'->>'displayName', 'Rider')        as display_name,
    coalesce(state->'prefs'->'sports', '[]'::jsonb)          as sports,
    coalesce(state->'prefs'->>'skill', 'Intermediate')       as skill,
    coalesce(state->'prefs'->>'city', '')                    as city,
    coalesce(state->'prefs'->'accolades', '[]'::jsonb)       as accolades,
    updated_at                                               as updated_at
  from public.profiles
  where coalesce(state->'prefs'->>'openToRide', 'false')::boolean = true;

revoke all on public.public_riders from anon;
grant select on public.public_riders to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. Bonus: compound index for the hot Discover query.
-- ─────────────────────────────────────────────────────────────
create index if not exists events_status_starts_at_idx
  on public.events (status, starts_at)
  where status = 'approved';

create index if not exists pending_merges_match_event_idx
  on public.pending_merges (match_event_id);

create index if not exists gear_deals_created_at_idx
  on public.gear_deals (created_at desc);
