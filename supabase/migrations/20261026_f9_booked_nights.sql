-- Audit F9: the stay page couldn't see which rooms were already booked (guests can only read their
-- own reservations), so it offered every room for every date and a booked room failed at checkout.
--
-- get_booked_nights returns, for one hotel, which room is booked on which night between p_from
-- (inclusive) and p_to (exclusive). Only room ids and dates: no guest, price or booking details.
-- Runs as SECURITY DEFINER so it can see every guest's confirmed bookings; open to signed-out
-- visitors too, since the stay page works without an account.

begin;

create or replace function public.get_booked_nights(p_hotel_id uuid, p_from date, p_to date)
returns table (room_id uuid, night date)
language sql
stable
security definer
set search_path to ''
as $$
  select r.room_id, n::date as night
  from public.reservations r
  join public.rooms rm on rm.id = r.room_id
  cross join lateral generate_series(
    greatest((r.check_in at time zone 'UTC')::date, p_from),
    least((r.check_out at time zone 'UTC')::date, p_to) - 1,
    interval '1 day'
  ) as n
  where rm.hotel_id = p_hotel_id
    and r.status = 'confirmed'
    and p_to - p_from between 1 and 400
    and (r.check_in at time zone 'UTC')::date < p_to
    and (r.check_out at time zone 'UTC')::date > p_from
  order by 2, 1;
$$;

revoke execute on function public.get_booked_nights(uuid, date, date) from public;
grant execute on function public.get_booked_nights(uuid, date, date) to anon, authenticated;

commit;
