-- Storage bucket for event posters.
--
-- Without this, the frontend ships images as base64 data-URLs inside the
-- events row's `poster` column. A 200KB image becomes 270KB of base64 inside
-- a JSONB row, bloats Realtime payloads, and inflates the Discover query.
--
-- This migration:
--   1. Creates a public-read 'posters' bucket
--   2. RLS-restricts uploads to authenticated users on a per-folder convention
--      (posters/<auth.uid()>/<filename>)
--   3. Allows the owner to update/delete their own files
--
-- The frontend (CreateEvent) is updated to upload to this bucket and store
-- the public URL in events.poster instead of the base64 string.

-- 1. Bucket — created as public so anon riders can fetch the image without
--    a signed URL. Storage objects don't carry PII so this is appropriate.
insert into storage.buckets (id, name, public)
  values ('posters', 'posters', true)
  on conflict (id) do nothing;

-- 2. RLS on storage.objects — Supabase enables RLS on storage.objects by
--    default; we add bucket-scoped policies. Folder convention: the first
--    path segment is the user_id, so each user has their own subdir.

-- Anyone can read poster images.
drop policy if exists "posters_public_read" on storage.objects;
create policy "posters_public_read"
  on storage.objects for select
  using (bucket_id = 'posters');

-- Authed users can upload into their own folder (posters/<uid>/...).
drop policy if exists "posters_owner_insert" on storage.objects;
create policy "posters_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'posters'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- And update / delete only their own files.
drop policy if exists "posters_owner_update" on storage.objects;
create policy "posters_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'posters'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "posters_owner_delete" on storage.objects;
create policy "posters_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'posters'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
