-- gear_deals — destination for the scraped Schema.org Product/Offer rows.
-- Surfaced on the rider-side Gear tab in a future patch; for now just
-- gives the gear-deals adapter a real home so no data is lost.

create table if not exists public.gear_deals (
  id            uuid        primary key default gen_random_uuid(),
  external_id   text,
  source        text not null,            -- 'deals:evo:snowboards' | 'deals:backcountry' | …
  shop          text,
  title         text not null,
  sport         text,
  price         numeric not null,
  original      numeric,
  off_pct       int,
  poster        text,
  reg_link      text,
  status        text not null default 'pending',
  raw           jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists gear_deals_status_idx on public.gear_deals (status);
create index if not exists gear_deals_sport_idx  on public.gear_deals (sport);
create index if not exists gear_deals_off_pct_idx on public.gear_deals (off_pct desc) where off_pct is not null;

alter table public.gear_deals enable row level security;

drop policy if exists "gear_deals_public_read" on public.gear_deals;
create policy "gear_deals_public_read"
  on public.gear_deals for select
  using (status = 'approved');

-- Inserts come exclusively from the ingest pipeline via the service-role key,
-- which bypasses RLS. No client-side insert policy needed.

drop trigger if exists gear_deals_touch_updated_at on public.gear_deals;
create trigger gear_deals_touch_updated_at
  before update on public.gear_deals
  for each row execute function public.touch_updated_at();
