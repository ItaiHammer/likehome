begin;

create or replace function public.checkout_reservation(
  p_account_id uuid,
  p_room_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests integer,
  p_time_zone text,
  p_has_insurance boolean,
  p_booking_total numeric,
  p_insurance_premium numeric,
  p_card_last4 text,
  p_exp_month integer,
  p_exp_year integer
) returns jsonb
language plpgsql security definer
set search_path = ''
set timezone = 'UTC'
as $$
declare
  v_room public.rooms%rowtype;
  v_reservation public.reservations%rowtype;
  v_payment public.payments%rowtype;
  v_transaction public.transactions%rowtype;
  v_cancel_insurance_amount numeric := 0;
  v_today date;
  v_total numeric;
begin
  if (select auth.uid()) is null then
    raise exception 'You must be logged in to book.' using errcode = 'PT401';
  end if;

  if p_account_id is distinct from (select auth.uid()) then
    raise exception 'You can only create bookings for your own account.' using errcode = 'PT403';
  end if;

  begin
    v_today := (now() at time zone coalesce(nullif(btrim(p_time_zone), ''), 'UTC'))::date;
  exception when invalid_parameter_value then
    v_today := (now() at time zone 'UTC')::date;
  end;
  if p_check_in is null or p_check_out is null
    or not isfinite(p_check_in) or not isfinite(p_check_out)
    or p_check_in < v_today or p_check_out <= p_check_in
    or p_check_out - p_check_in > 30 then
    raise exception 'Choose valid dates for a stay of 1 to 30 nights.' using errcode = 'PT400';
  end if;
  if p_guests is not null and p_guests < 1 then
    raise exception 'guests must be at least 1.' using errcode = 'PT400';
  end if;

  -- Hold the rate and capacity stable until checkout commits.
  select * into v_room from public.rooms where id = p_room_id for share;
  if not found then
    raise exception 'Room not found.' using errcode = 'PT404';
  end if;
  if v_room.capacity is not null and p_guests > v_room.capacity then
    raise exception 'Guest count exceeds the room capacity.' using errcode = 'PT400';
  end if;
  if v_room.price_per_night is null
    or v_room.price_per_night::text in ('NaN', 'Infinity', '-Infinity')
    or v_room.price_per_night::numeric <= 0 then
    raise exception 'The room does not have a valid booking price.' using errcode = 'PT409';
  end if;
  v_total := round((p_check_out - p_check_in) * v_room.price_per_night::numeric, 2);
  if v_total <= 0 or p_booking_total is distinct from v_total then
    raise exception 'The booking price changed. Refresh and try again.' using errcode = 'PT409';
  end if;
  if p_has_insurance is null or p_insurance_premium is null
    or p_insurance_premium::text in ('NaN', 'Infinity', '-Infinity')
    or p_insurance_premium <> round(p_insurance_premium, 2)
    or (p_has_insurance and p_insurance_premium <= 0)
    or (not p_has_insurance and p_insurance_premium <> 0) then
    raise exception 'Invalid insurance premium.' using errcode = 'PT400';
  end if;
  if p_card_last4 is null or p_card_last4 !~ '^[0-9]{4}$'
    or p_exp_month is null or p_exp_month not between 1 and 12
    or p_exp_year is null or p_exp_year not between extract(year from v_today) and 9999 
    or (p_exp_year = extract(year from v_today) and p_exp_month < extract(month from v_today)) then
    raise exception 'Invalid saved card details.' using errcode = 'PT400';
  end if;

  begin
    insert into public.reservations (
      account_id, hotel_id, room_id, check_in, check_out, guests,
      total_price, status, has_insurance
    ) values (
      p_account_id, v_room.hotel_id, p_room_id,
      p_check_in::timestamptz, p_check_out::timestamptz, p_guests,
      v_total, 'confirmed', p_has_insurance
    ) returning * into v_reservation;
  exception when exclusion_violation then
    raise exception 'Room is not available for the selected dates.' using errcode = 'PT409';
  end;

  insert into public.payments (
    reservation_id, account_id, card_number, card_exp_month, card_exp_year
  ) values (
    v_reservation.id, p_account_id, p_card_last4, p_exp_month, p_exp_year
  ) returning * into v_payment;

  insert into public.transactions (payment_id, amount, transaction_type, status)
  values (v_payment.id, v_total, 'charge', 'completed')
  returning * into v_transaction;

  if p_has_insurance then
    insert into public.transactions (payment_id, amount, transaction_type, status)
    values (v_payment.id, p_insurance_premium, 'insurance', 'completed')
    returning amount into v_cancel_insurance_amount;
  end if;

  -- Any insert error rolls back all preceding writes automatically.
  return jsonb_build_object(
    'reservation', to_jsonb(v_reservation),
    'payment', to_jsonb(v_payment),
    'transaction', jsonb_build_object(
      'id', v_transaction.id,
      'amount', v_transaction.amount,
      'status', v_transaction.status
    ),
    'insurance_premium', v_cancel_insurance_amount,
    'total_charged', v_transaction.amount + v_cancel_insurance_amount
  );
end;
$$;

revoke execute on function public.checkout_reservation(
  uuid, uuid, date, date, integer, text, boolean, numeric, numeric, text, integer, integer
) from public, anon;

grant execute on function public.checkout_reservation(
  uuid, uuid, date, date, integer, text, boolean, numeric, numeric, text, integer, integer
) to authenticated;

commit;