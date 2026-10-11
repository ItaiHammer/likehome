create extension if not exists btree_gist with schema extensions;

create or replace function public.get_account_overlapping_bookings(
  p_hotel_id  uuid,
  p_check_in  timestamptz,
  p_check_out timestamptz,
  p_exclude_reservation_id uuid default null
)
returns table(id uuid, hotel_id uuid, check_in timestamptz, check_out timestamptz)
language sql
stable security invoker
set search_path to ''
as $$
  select r.id, r.hotel_id, r.check_in, r.check_out
  from public.reservations r
  where r.account_id = auth.uid()
    and r.status = 'confirmed'
    and r.hotel_id <> p_hotel_id
    and r.check_in  < p_check_out
    and r.check_out > p_check_in
    and (p_exclude_reservation_id is null or r.id <> p_exclude_reservation_id);
$$;

alter table public.reservations
  add constraint reservations_no_account_overlap
  exclude using gist (
    account_id with =,
    hotel_id   with <>,
    tstzrange(check_in, check_out, '[)') with &&
  ) where (status = 'confirmed');