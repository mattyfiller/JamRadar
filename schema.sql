-- JamRadar — Supabase schema
-- Paste this into Supabase Dashboard → SQL Editor → run.
--
-- Two tables for now:
--   profiles  — per-user prefs/saves/follows (mirrors localStorage state)
--   events    — the event database itself, write-shared between scrapers,
--               admins, and verified organizers; read-public to all riders.
--
-- Both are protected by Row-Level Security so users can only mutate their own
-- rows or rows they own.

-- ─────────────────────────────────────────────────────────────
-- 1. profiles  (multi-device sync of per-user state)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id     uuid        primary key references auth.users(id) on delete cascade,
  email       text,
  state       jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);

alter table public.profiles enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- 2. events  (the shared event database)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.events (
  id            uuid        primary key default gen_random_uuid(),

  -- Source identity (Layer 1 dedupe — deterministic).
  -- A re-run of the same scraper finds (source, external_id) and updates
  -- in place rather than inserting a duplicate.
  external_id   text,
  source        text not null default 'user',     -- 'user:<uid>' | 'admin' | 'eventbrite' | 'scraper:<name>'
  trust_tier    int  not null default 0,          -- 0=user, 1=admin, 2=verified-org, 3=scraped-validated

  -- Display fields
  title         text not null,
  description   text,
  poster        text,                              -- data URL or hosted URL

  org_name      text,
  org_user_id   uuid references auth.users(id),    -- the JamRadar account that posted (if any)
  org_verified  boolean default false,

  sport         text,                              -- 'snowboard' | 'ski' | 'skate' | 'indoor' | …
  type          text,                              -- 'Rail jam' | 'Park event' | …
  skill_level   text,

  -- Time
  starts_at     timestamptz,                       -- canonical timestamp
  when_text     text,                              -- "Sat · Nov 14 · 7:00 PM" style for display

  -- Place
  location      text,
  coords        text,
  lat           numeric,
  lon           numeric,
  distance_km   numeric,                           -- legacy: distance from default city

  -- Money
  cost          text,
  prize         text,
  reg_link      text,

  -- Social
  going_count   int default 0,
  featured      boolean default false,
  live          boolean default false,

  -- Lifecycle
  status        text not null default 'pending',   -- 'pending' | 'approved' | 'rejected' | 'archived'
  rejected_reason text,

  -- Rich
  color         int,                               -- gradient hue
  sponsors      text[],
  results       jsonb,                             -- [{ place, rider, note, prize }]
  updates       jsonb,                             -- [{ time, text }]
  raw           jsonb,                             -- original scraped payload, for debugging

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Same source posting the same external event twice → upsert, not duplicate.
  unique (source, external_id)
);

create index if not exists events_status_idx       on public.events (status);
create index if not exists events_starts_at_idx    on public.events (starts_at);
create index if not exists events_sport_idx        on public.events (sport);
create index if not exists events_type_idx         on public.events (type);
create index if not exists events_org_user_idx     on public.events (org_user_id);
create index if not exists events_featured_idx     on public.events (featured) where featured = true;

alter table public.events enable row level security;

-- READ — everyone (signed-in or anonymous) can read approved + featured events.
-- Owners can additionally see their own pending/rejected.
drop policy if exists "events_public_read" on public.events;
create policy "events_public_read"
  on public.events for select
  using (
    status in ('approved', 'archived')
    or auth.uid() = org_user_id
  );

-- INSERT — any authenticated user can post; their post starts as pending.
-- Admins can post directly approved (we check the user's email against an
-- allow-list in a later phase; for now, all inserts go pending).
drop policy if exists "events_insert_authed" on public.events;
create policy "events_insert_authed"
  on public.events for insert
  to authenticated
  with check (
    coalesce(org_user_id, auth.uid()) = auth.uid()
    and status = 'pending'
  );

-- UPDATE — owners can update their own events. (Admin moderation will use a
-- service-role key from a future Edge Function — see AUTH-SETUP.md.)
drop policy if exists "events_owner_update" on public.events;
create policy "events_owner_update"
  on public.events for update
  to authenticated
  using (auth.uid() = org_user_id)
  with check (auth.uid() = org_user_id);


-- ─────────────────────────────────────────────────────────────
-- 3. pending_merges  (medium-confidence dedupe candidates awaiting admin)
-- ─────────────────────────────────────────────────────────────
-- When the ingest pipeline finds a candidate event with a 0.5–0.85 similarity
-- score against an existing event, it queues it here instead of inserting.
-- Admin reviews on the "Pending Merges" tab and decides:
--   merge_into  → patch existing event with candidate's missing fields, drop candidate
--   keep_split  → insert candidate as a new event
--   discard     → drop candidate entirely
create table if not exists public.pending_merges (
  id            uuid        primary key default gen_random_uuid(),

  candidate     jsonb       not null,    -- the new event payload as it would have been inserted
  candidate_source text     not null,    -- 'eventbrite' | 'ical:tremblant' | etc.
  match_event_id uuid       references public.events(id) on delete cascade,
  score         numeric     not null,    -- 0.0–1.0 similarity score

  status        text        not null default 'pending',  -- 'pending' | 'merged' | 'split' | 'discarded'
  decided_by    uuid        references auth.users(id),
  decided_at    timestamptz,

  created_at    timestamptz not null default now()
);

create index if not exists pending_merges_status_idx on public.pending_merges (status);
create index if not exists pending_merges_created_idx on public.pending_merges (created_at desc);

alter table public.pending_merges enable row level security;

-- For now, any authenticated user can see pending merges. In a real deploy we'd
-- restrict to an `admins` table; the prototype trusts mode-switching via the UI.
drop policy if exists "merges_authed_select" on public.pending_merges;
create policy "merges_authed_select"
  on public.pending_merges for select
  to authenticated
  using (true);

drop policy if exists "merges_authed_update" on public.pending_merges;
create policy "merges_authed_update"
  on public.pending_merges for update
  to authenticated
  using (true)
  with check (true);

-- Inserts into pending_merges happen via the service-role key from the ingest
-- pipeline (bypasses RLS). No client-side insert policy needed.


-- ─────────────────────────────────────────────────────────────
-- 4. Auto-create a profile on sign-up
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- 5. updated_at maintenance (both tables)
-- ─────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();
