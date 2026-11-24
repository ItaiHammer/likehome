-- Two confirmed bookings can't hold the same room on the same night. checkout_reservation and
-- edit_reservation rely on this constraint for availability, but no migration created it (it was
-- only in supabase/tests/audit/setup.sql). Skipped where it already exists.
--
-- Fails if confirmed bookings already overlap. Find them first with:
--   select a.id, b.id, a.room_id from public.reservations a join public.reservations b
--     on a.room_id = b.room_id and a.id < b.id and a.status = 'confirmed' and b.status = 'confirmed'
--     and tstzrange(a.check_in, a.check_out) && tstzrange(b.check_in, b.check_out);

create extension if not exists btree_gist with schema extensions;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.reservations'::regclass
      and c.contype = 'x'
      and pg_get_constraintdef(c.oid) ilike '%room_id with =%'
  ) then
    alter table public.reservations
      add constraint no_overlapping_bookings
      exclude using gist (
        room_id with =,
        tstzrange(check_in, check_out) with &&
      ) where (status = 'confirmed');
  end if;
end $$;
