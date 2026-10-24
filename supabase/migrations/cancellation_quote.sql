begin;

-- Include points redeemed toward the booking in its funded value.
-- Insurance premiums remain separate and are never refunded.
create or replace function public.get_cancellation_quote(
  p_reservation_id uuid
) returns table (
  has_insurance boolean,
  can_cancel boolean,
  booking_paid numeric,
  insurance_paid numeric,
  refund numeric,
  cancellation_fee numeric,
  refund_points integer
)
language sql stable security invoker
set search_path = ''
as $$
  with r as (
    select *
    from public.reservations
    where id = p_reservation_id
      and account_id = auth.uid()
  ),
  paid as (
    select
      coalesce(sum(t.amount) filter (
        where t.transaction_type = 'charge'
      ), 0)
      - coalesce(sum(t.amount) filter (
        where t.transaction_type = 'credit'
      ), 0) as booking,
      coalesce(sum(t.amount) filter (
        where t.transaction_type = 'insurance'
      ), 0) as insurance
    from public.payments p
    join public.transactions t on t.payment_id = p.id
    where p.reservation_id = p_reservation_id
      and p.account_id = auth.uid()
      and t.status = 'completed'
  ),
  redeemed as (
    -- Redemption entries are negative. Refund entries are already represented
    -- by transaction credits above and must not be subtracted again.
    select -coalesce(sum(pt.points), 0)::numeric / 100 as booking
    from public.points_transactions pt
    where pt.reservation_id = p_reservation_id
      and pt.account_id = auth.uid()
      and pt.type = 'redeem'
  ),
  funded as (
    select
      greatest(paid.booking + redeemed.booking, 0) as booking,
      paid.insurance
    from paid
    cross join redeemed
  ),
  terms as (
    select
      r.has_insurance,
      r.status = 'confirmed' and r.check_in > now() as can_cancel,
      funded.booking,
      funded.insurance,
      case when r.has_insurance then funded.booking else 0 end as refund
    from r
    cross join funded
  )
  select
    has_insurance,
    can_cancel,
    booking,
    insurance,
    refund,
    booking - refund,
    public.dollars_to_points(refund)
  from terms;
$$;

commit;