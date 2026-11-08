-- Audit F3: listing photo "uploads" were mocked: a photo from the computer became a blob: URL that
-- only worked in the owner's own browser tab, so guests (and the owner after a reload) saw nothing.
--
-- Photos now go to a public Storage bucket. Anyone can view them (they're listing photos); a
-- signed-in user can only add, replace or delete files in their own folder (<user id>/...).
-- Images only, up to 5 MB each (utils/photo-upload.ts checks the same before uploading).

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners upload listing photos to their folder" on storage.objects;
create policy "Owners upload listing photos to their folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Owners update their listing photos" on storage.objects;
create policy "Owners update their listing photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Owners delete their listing photos" on storage.objects;
create policy "Owners delete their listing photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;
