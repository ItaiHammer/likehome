-- US 5.3.3: insurance flag, insurance transaction type, cancellation quote + cancel.
-- Requires credit_to_points.sql (#93): the credit written on cancel becomes points via that trigger.
-- Rules: insured = full refund any time before check-in;
-- uninsured = can still cancel, no refund. The insurance premium is never refunded.
alter table public.reservations
add column if not exists has_insurance boolean not null default false,
add column if not exists cancelled_at timestamptz,
add column if not exists cancellation_fee numeric check (
  cancellation_fee is null
  or cancellation_fee >= 0
);

-- charge = booking, insurance = premium, credit = refund (paid out as points)
alter table public.transactions
drop constraint transactions_type_valid,
add constraint transactions_type_valid check (
  transaction_type in ('charge', 'insurance', 'credit')
);

-- What cancelling would cost right now. Read-only, so the UI can show it before the guest confirms.
create or replace function public.get_cancellation_quote (p_reservation_id uuid) returns table (
  has_insurance boolean,
  can_cancel boolean,
  booking_paid numeric,
  insurance_paid numeric,
  refund numeric,
  cancellation_fee numeric,
  refund_points integer
) language sql stable security invoker
set
  search_path to '' as $$
  with r as (
    select * from public.reservations
    where id = p_reservation_id and account_id = auth.uid()
  ),
  paid as (
    select coalesce(sum(t.amount) filter (where t.transaction_type = 'charge'), 0)
         - coalesce(sum(t.amount) filter (where t.transaction_type = 'credit'), 0) as booking,
           coalesce(sum(t.amount) filter (where t.transaction_type = 'insurance'), 0) as
    from public.payments p
    join public.transactions t on t.payment_id = p.id
    where p.reservation_id = p_reservation_id and t.status = 'completed'
  ),
  terms as (
    select r.has_insurance,
           r.status = 'confirmed' and r.check_in > now() as can_cancel,
           paid.booking, paid.insurance,
           -- no insurance = no refund (the whole booking becomes the fee)
           case when r.has_insurance then paid.booking else 0 end as refund
    from r, paid
  )
  select has_insurance, can_cancel, booking, insurance,
         refund, booking - refund, public.dollars_to_points(refund)
  from terms;
$$;

-- Cancels in one database transaction: status, fee, credit (-> points via trigger) all l
create or replace function public.cancel_reservation (p_reservation_id uuid) returns table (
  refund numeric,
  cancellation_fee numeric,
  refund_points integer
) language plpgsql security invoker
set
  search_path to '' as $$
declare
  q record;
  v_payment_id uuid;
begin
  -- lock the row so two cancel clicks can't both refund
  perform 1 from public.reservations
  where id = p_reservation_id and account_id = auth.uid()
  for update;

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