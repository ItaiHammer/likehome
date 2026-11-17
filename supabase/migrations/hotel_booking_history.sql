-- US 4.7.3: booking and customer history for a hotel owner's own listings.
-- Guests can only read their own reservations (RLS), so this runs as SECURITY DEFINER and only
-- returns bookings at hotels where owner_id = auth.uid(). p_hotel_id = one listing, null = all of them.
-- Card numbers never leave the database.
begin;

create index if not exists reservations_hotel_check_in_idx
  on public.reservations (hotel_id, check_in desc);

-- earlier version without p_today; a new signature can't replace it
drop function if exists public.get_hotel_booking_history(uuid);

-- p_today = the viewer's date (their time zone); null = today in UTC
create or replace function public.get_hotel_booking_history(p_hotel_id uuid default null, p_today date default null)
returns table (
  reservation_id uuid,
  hotel_id uuid,
  hotel_name text,
  room_id uuid,
  room_type text,
  guest_id uuid,
  guest_name text,
  guest_email text,
  check_in date,
  check_out date,
  nights integer,
  guests integer,
  children integer,
  status text,
  stage text,
  total_price numeric,
  has_insurance boolean,
  cancelled_at timestamptz,
  cancellation_fee numeric,
  amount_paid numeric,
  amount_refunded numeric,
  booked_at timestamptz
)
language plpgsql stable security definer
set search_path to '' as $$
#variable_conflict use_column
declare
  v_today date := coalesce(p_today, (now() at time zone 'UTC')::date);
begin
  if auth.uid() is null then
    raise exception 'Sign in to view booking history' using errcode = '42501';
  end if;
  -- asking for a listing you don't own is an error, not an empty list
  if p_hotel_id is not null and not exists (
    select 1 from public.hotels h where h.id = p_hotel_id and h.owner_id = auth.uid()
  ) then
    raise exception 'You do not own this listing' using errcode = '42501';
  end if;

  return query
  select r.id, h.id, h.name, rm.id, rm.room_type,
         r.account_id, a.full_name::text, a.email::text,
         (r.check_in  at time zone 'UTC')::date,
         (r.check_out at time zone 'UTC')::date,
         (r.check_out at time zone 'UTC')::date - (r.check_in at time zone 'UTC')::date,
         r.guests, r.children, r.status,
         -- same rules as groupBookings in lib/bookings.ts: check-in day is in-stay, check-out day is past
         case
           when r.status = 'cancelled' then 'cancelled'
           when r.status = 'completed' or (r.check_out at time zone 'UTC')::date <= v_today then 'past'
           when (r.check_in at time zone 'UTC')::date <= v_today then 'in-stay'
           else 'upcoming'
         end,
         r.total_price, r.has_insurance,
         r.cancelled_at, r.cancellation_fee,
         -- room charges only: the insurance premium is never refunded and isn't the hotel's money
         coalesce(m.charged, 0), coalesce(m.refunded, 0), r.created_at
  from public.reservations r
  join public.hotels h on h.id = r.hotel_id
  left join public.rooms rm on rm.id = r.room_id
  left join public.accounts a on a.id = r.account_id
  -- only completed transactions count (same rule as get_booking_history)
  left join lateral (
    select sum(t.amount) filter (where t.transaction_type = 'charge')    as charged,
           sum(t.amount) filter (where t.transaction_type = 'insurance') as insurance,
           sum(t.amount) filter (where t.transaction_type = 'credit')    as refunded
    from public.payments pay
    join public.transactions t on t.payment_id = pay.id
    where pay.reservation_id = r.id and t.status = 'completed'
  ) m on true
  where h.owner_id = auth.uid()
    and (p_hotel_id is null or h.id = p_hotel_id)
    -- checkout's undo cancels an unpaid booking without a fee (a real cancel always sets one): not a booking
    and not (r.status = 'cancelled' and r.cancellation_fee is null
             and coalesce(m.charged, 0) + coalesce(m.insurance, 0) = 0)
  order by r.check_in desc, r.id;
end;
$$;

-- One row per guest. Reuses the function above, so the owner check lives in one place.
create or replace function public.get_hotel_customer_history(p_hotel_id uuid default null)
returns table (
  guest_id uuid,
  guest_name text,
  guest_email text,
  total_bookings bigint,
  cancelled_bookings bigint,
  total_nights bigint,
  total_paid numeric,
  first_check_in date,
  last_check_in date
)
language sql stable security invoker
set search_path to '' as $$
  select b.guest_id, max(b.guest_name), max(b.guest_email),
         count(*),
         count(*) filter (where b.status = 'cancelled'),
         coalesce(sum(b.nights) filter (where b.status = 'confirmed'), 0),
         coalesce(sum(b.amount_paid - b.amount_refunded), 0),
         min(b.check_in), max(b.check_in)
  from public.get_hotel_booking_history(p_hotel_id) b
  group by b.guest_id
  order by max(b.check_in) desc;
$$;

revoke execute on function public.get_hotel_booking_history(uuid, date) from public, anon;
revoke execute on function public.get_hotel_customer_history(uuid)      from public, anon;
grant  execute on function public.get_hotel_booking_history(uuid, date) to authenticated;
grant  execute on function public.get_hotel_customer_history(uuid)      to authenticated;

commit;
notify pgrst, 'reload schema';