-- Public riders view + RLS policy.
-- Riders who toggle "Open to ride" in their profile become discoverable to
-- other authenticated users via this view, which exposes ONLY safe public
-- fields (display name, sports, skill, accolades, city). Private fields
-- (saves, follows, going, notifications, email) stay locked to the owner.

-- The view reads from profiles.state JSON, picks the public fields, and only
-- returns rows where state.openToRide is true.
create or replace view public.public_riders as
  select
    user_id                                    as id,
    coalesce(state->>'displayName', 'Rider')   as display_name,
    coalesce(state->'sports', '[]'::jsonb)     as sports,
    coalesce(state->>'skill', 'Intermediate')  as skill,
    coalesce(state->>'city', '')               as city,
    coalesce(state->'accolades', '[]'::jsonb)  as accolades,
    updated_at                                 as updated_at
  from public.profiles
  where coalesce(state->>'openToRide', 'false')::boolean = true;

-- The view inherits the underlying table's RLS, but we need an explicit policy
-- that lets ANY authenticated user read opted-in profiles. Without this, the
-- existing "self-only" SELECT policy on profiles blocks the view.
drop policy if exists "profiles_public_riders_read" on public.profiles;
create policy "profiles_public_riders_read"
  on public.profiles for select
  to authenticated
  using (
    coalesce(state->>'openToRide', 'false')::boolean = true
  );

-- Anonymous users cannot read this view (gate is `to authenticated`). That's
-- intentional — only signed-in riders see who else is open to ride.
grant select on public.public_riders to authenticated;
