-- Audit F13: an ordinary signed-in client could create its own refunds and points.
--
-- Before: the INSERT policy on public.transactions only checked that the payment was the
-- caller's, so a user could insert
--   * a completed 'credit' -> credit_to_points (SECURITY DEFINER) awarded refund points, or
--   * an inflated completed 'charge' -> cancel_reservation refunds "booking paid" in points.
-- After: clients can't write transactions at all. Charges go through record_checkout_charge
-- (amount computed here from the room's nightly price), refund credits through
-- cancel_reservation. Both run as SECURITY DEFINER with explicit ownership checks.

begin;

-- 1. Record the checkout charge, priced by the database, once per payment.
create or replace function public.record_checkout_charge(p_payment_id uuid)
returns setof public.transactions
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_amount numeric;
begin
  -- The reservation's stored total_price is client-writable, so price from the room instead
  select round(rm.price_per_night * greatest(round(extract(epoch from (r.check_out - r.check_in)) / 86400), 0), 2)
  into v_amount
  from public.payments p
  join public.reservations r on r.id = p.reservation_id
  join public.rooms rm on rm.id = r.room_id
  where p.id = p_payment_id
    and p.account_id = auth.uid()
    and r.account_id = auth.uid()
    and r.status = 'confirmed'
  for update of p;

  if not found then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'Nothing to charge for this reservation' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.transactions t
    where t.payment_id = p_payment_id and t.transaction_type = 'charge'
  ) then
    raise exception 'This payment has already been charged' using errcode = '23505';
  end if;

  return query
  insert into public.transactions (payment_id, amount, transaction_type, status)
  values (p_payment_id, v_amount, 'charge', 'completed')
  returning *;
end;
$$;

revoke all on function public.record_checkout_charge(uuid) from public, anon;
grant execute on function public.record_checkout_charge(uuid) to authenticated;

-- 2. cancel_reservation inserts the refund credit itself, so it now runs as definer.
--    Same body as before, plus an explicit "is this your booking" check up front.
create or replace function public.cancel_reservation(p_reservation_id uuid)
returns table(refund numeric, cancellation_fee numeric, refund_points integer)
language plpgsql
security definer
set search_path to ''
as $$
declare
  q record;
  v_payment_id uuid;
begin
  -- lock the row so two cancel clicks can't both refund; refuse anyone else's booking
  perform 1 from public.reservations
  where id = p_reservation_id and account_id = auth.uid()
  for update;
  if not found then
    raise exception 'Reservation not found' using errcode = 'P0002';
  end if;

  select * into q from public.get_cancellation_quote(p_reservation_id);
  if not found then
    raise exception 'Reservation not found' using errcode = 'P0002';
  end if;
  if not q.can_cancel then
    raise exception 'This booking can no longer be cancelled' using errcode = 'P0001';
  end if;

  update public.reservations
  set status = 'cancelled', cancelled_at = now(), cancellation_fee = q.cancellation_fee
  where id = p_reservation_id;

  -- uninsured cancels have refund = 0, so no credit and no points
  if q.refund > 0 then
    select id into v_payment_id from public.payments
    where reservation_id = p_reservation_id
    order by created_at desc limit 1;

    insert into public.transactions (payment_id, amount, transaction_type, status)
    values (v_payment_id, q.refund, 'credit', 'completed');
  end if;

  return query select q.refund, q.cancellation_fee, q.refund_points;
end;
$$;

revoke all on function public.cancel_reservation(uuid) from public, anon;
grant execute on function public.cancel_reservation(uuid) to authenticated;

-- 3. No more direct client writes to the money ledger.
drop policy if exists "Users can add transactions to their own payments" on public.transactions;

commit;

-- Users could also set has_insurance, total_price and status on their own bookings directly, which
-- turned an uninsured booking into a full refund on cancel. 20261026_lock_reservation_fields.sql
-- closes that; apply it after this file.
