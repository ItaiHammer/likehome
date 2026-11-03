-- Audit retest: removing a photo from a listing left its file publicly reachable. Deleting a Storage
-- file through the API needs the owner to be able to SELECT it as well as DELETE it, and the
-- listing-photos policies only allowed insert, update and delete, so deletes silently did nothing.
-- Owners can now see (and so delete) the files in their own folder. Viewing photos is unchanged:
-- the bucket is public, so anyone with a photo's URL could already see it.
-- Apply after 20261026_f3_listing_photos_bucket.sql.

begin;

drop policy if exists "Owners view their listing photos" on storage.objects;
create policy "Owners view their listing photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;
