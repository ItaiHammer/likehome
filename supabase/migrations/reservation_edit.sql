begin;

-- The reservation and its financial adjustment commit or roll back together.
-- SECURITY DEFINER is needed because clients cannot insert points ledger rows.
-- Ownership, eligibility and pricing are checked here as well as in the API,
-- because an authenticated client can call an exposed RPC directly.
create or replace function public.edit_reservation(
  p_reservation_id uuid,
  p_room_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests integer,
  p_payment_method text,
  p_time_zone text,
  p_expected jsonb
) returns setof public.reservations
language plpgsql security definer
set search_path = ''
set timezone = 'UTC'
as $$
declare
  v_user_id uuid := auth.uid();
  v_reservation public.reservations%rowtype;
  v_room public.rooms%rowtype;
  v_today date;
  v_guests integer;
  v_total numeric;
  v_difference numeric;
  v_paid numeric;
  v_payment_id uuid;
  v_points integer;
  v_balance integer;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to change a reservation.'
      using errcode = 'PT401';
  end if;

  -- cancel_reservation() locks this same row.
  -- validate reservation exists
  select r.* into v_reservation
  from public.reservations r
  where r.id = p_reservation_id
    and r.account_id = v_user_id
  for update;

  if not found then
    raise exception 'Reservation not found.'
      using errcode = 'PT404';
  end if;

  -- validate confirmed reservation
  if v_reservation.status is distinct from 'confirmed' then
    raise exception 'Only confirmed reservations can be changed.'
      using errcode = 'PT422';
  end if;

  -- validate reservation in the future, including guest time zone with UTC fallback
  begin
    v_today := (
      clock_timestamp() at time zone
      coalesce(nullif(btrim(p_time_zone), ''), 'UTC')
    )::date;
  exception when invalid_parameter_value then
    v_today := (clock_timestamp() at time zone 'UTC')::date;
  end;

  if (v_reservation.check_in at time zone 'UTC')::date <= v_today then
    raise exception 'Reservation for past dates cannot be changed.'
      using errcode = 'PT422';
  end if;

  -- Reject a concurrent edit made after the API loaded the reservation.
  -- Dates use the same UTC date normalization as utils/reservations.ts.
  if p_expected is distinct from jsonb_build_object(
    'room_id', v_reservation.room_id,
    'check_in', to_char(
      v_reservation.check_in at time zone 'UTC', 'YYYY-MM-DD'
    ),
    'check_out', to_char(
      v_reservation.check_out at time zone 'UTC', 'YYYY-MM-DD'
    ),
    'guests', v_reservation.guests,
    'total_price', v_reservation.total_price
  ) then
    raise exception 'This booking changed. Reload it before saving again.'
      using errcode = 'PT409';
  end if;

  -- validate payment method
  if p_payment_method is null
    or p_payment_method not in ('card', 'points') then
    raise exception 'payment_method must be card or points.'
      using errcode = 'PT400';
  end if;

  -- validate check in/out
  if p_check_in is null or p_check_out is null
    or not isfinite(p_check_in) or not isfinite(p_check_out) then
    raise exception 'Valid check-in and check-out dates are required.'
      using errcode = 'PT400';
  end if;

  if p_check_in < v_today
    or p_check_out <= p_check_in
    or p_check_out - p_check_in > 30 then
    raise exception 'Choose valid dates for a stay of 1 to 30 nights.'
      using errcode = 'PT400';
  end if;

  -- validate guests
  v_guests := coalesce(p_guests, v_reservation.guests);
  if v_guests is not null and v_guests < 1 then
    raise exception 'guests must be a whole number of at least 1.'
      using errcode = 'PT400';
  end if;

  -- Keep the rate and capacity stable until this edit commits.
  -- validate existing room
  select rm.* into v_room
  from public.rooms rm
  where rm.id = p_room_id
  for share;

  if not found then
    raise exception 'Room not found.'
      using errcode = 'PT404';
  end if;

  -- validate capacity
  if v_room.capacity is not null and v_guests > v_room.capacity then
    raise exception 'Guest count exceeds the room capacity.'
      using errcode = 'PT400';
  end if;

  -- validate nightly price
  if v_room.price_per_night is null
    or v_room.price_per_night::text in ('NaN', 'Infinity', '-Infinity')
    or v_room.price_per_night::numeric <= 0 then
    raise exception 'The room does not have a valid booking price.'
      using errcode = 'PT409';
  end if;

  v_total := round(
    (p_check_out - p_check_in) * v_room.price_per_night::numeric, 2
  );
  if v_total <= 0 then
    raise exception 'The room does not have a valid booking price.'
      using errcode = 'PT409';
  end if;

  -- Checkout creates one payment. Select the original funded payment
  -- deterministically if historical data contains more than one.
  select p.id into v_payment_id
  from public.payments p
  where p.reservation_id = p_reservation_id
    and p.account_id = v_user_id
    and exists (
      select 1
      from public.transactions t
      where t.payment_id = p.id
        and t.transaction_type = 'charge'
        and t.status = 'completed'
    )
  order by p.created_at, p.id
  limit 1
  for share of p;

  if not found then
    raise exception 'This booking has no completed original payment.'
      using errcode = 'PT409';
  end if;

  -- Do not silently settle a legacy booking whose price was previously
  -- changed without recording the corresponding payment adjustment.
  select q.booking_paid into v_paid
  from public.get_cancellation_quote(p_reservation_id) q;

  if v_paid is distinct from v_reservation.total_price
    or v_reservation.total_price <= 0
    or v_reservation.total_price <> round(v_reservation.total_price, 2) then
    raise exception 'Payment records do not match this booking. Reconcile them before editing.'
      using errcode = 'PT409';
  end if;

  v_difference := v_total - v_reservation.total_price;

  -- Existing exclusion constraints remain responsible for availability.
  update public.reservations
  set room_id = v_room.id,
      hotel_id = v_room.hotel_id,
      check_in = p_check_in::timestamptz,
      check_out = p_check_out::timestamptz,
      guests = v_guests,
      total_price = v_total
  where id = p_reservation_id
    and account_id = v_user_id
  returning * into v_reservation;

  -- Price Adjustments
  -- Edit increases price
  if v_difference > 0 then
    -- User pays price increase with points
    if p_payment_method = 'points' then
      v_points := public.dollars_to_points(v_difference);

      insert into public.points_balances (account_id)
      values (v_user_id)
      on conflict (account_id) do nothing;

      -- Serializes redemptions across different bookings on this account.
      select pb.balance into v_balance
      from public.points_balances pb
      where pb.account_id = v_user_id
      for update;

      if v_balance < v_points then
        raise exception 'Insufficient points for this price increase.'
          using errcode = 'PT402';
      end if;

      insert into public.points_transactions (
        account_id, reservation_id, type, points, note
      )
      values (
        v_user_id, p_reservation_id, 'redeem', -v_points,
        'Reservation price increase'
      );
      -- The existing ledger trigger updates the balance.
    else
      -- Record a mock charge against the existing payment
      insert into public.transactions (
        payment_id, amount, transaction_type, status
      )
      values (
        v_payment_id, v_difference, 'charge', 'completed'
      );
    end if;
  -- Edit decreases price
  elsif v_difference < 0 then
    insert into public.transactions (
      payment_id, amount, transaction_type, status
    )
    values (
      v_payment_id, -v_difference, 'credit', 'completed'
    );
    -- Existing triggers issue refund points and update the balance.
  end if;
  -- An unchanged total produces no transaction or points entry.

  return next v_reservation;
  return;
end;
$$;

revoke execute on function public.edit_reservation(
  uuid, uuid, date, date, integer, text, text, jsonb
) from public, anon;

grant execute on function public.edit_reservation(
  uuid, uuid, date, date, integer, text, text, jsonb
) to authenticated;

commit;