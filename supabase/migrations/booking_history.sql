-- US 6.1.4: booking and transaction history for the MyBookings dashboard.
-- Read-only and security invoker, so RLS on the underlying tables still decides what a user sees.
-- Dates come back as date (YYYY-MM-DD), which is what the app already works with.
create or replace function public.get_booking_history () returns table (
  reservation_id uuid,
  check_in date,
  check_out date,
  guests integer,
  status text,
  total_price numeric,
  has_insurance boolean,
  cancelled_at timestamptz,
  cancellation_fee numeric,
  hotel_id uuid,
  hotel_name text,
  city text,
  photo_url text,
  room_type text,
  amount_charged numeric,
  amount_insurance numeric,
  amount_credited numeric,
  points_earned integer,
  points_refunded integer
) language sql stable security invoker
set
  search_path to '' as $$
  select
    r.id, r.check_in::date, r.check_out::date, r.guests, coalesce(r.status, 'confirmed'),
    r.total_price, r.has_insurance, r.cancelled_at, r.cancellation_fee,
    h.id, h.name, h.city, h.photo_urls[1], rm.room_type,
    coalesce(m.charged, 0), coalesce(m.insurance, 0), coalesce(m.credited, 0),
    coalesce(p.earned, 0)::integer, coalesce(p.refunded, 0)::integer
  from public.reservations r
  left join public.hotels h on h.id = r.hotel_id
  left join public.rooms rm on rm.id = r.room_id
  -- money per booking: only completed transactions count
  left join lateral (
    select
      sum(t.amount) filter (where t.transaction_type = 'charge') as charged,
      sum(t.amount) filter (where t.transaction_type = 'insurance') as insurance,
      sum(t.amount) filter (where t.transaction_type = 'credit') as credited
    from public.payments pay
    join public.transactions t on t.payment_id = pay.id
    where pay.reservation_id = r.id and t.status = 'completed'
  ) m on true
  left join lateral (
    select
      sum(pt.points) filter (where pt.type = 'earn') as earned,
      sum(pt.points) filter (where pt.type = 'refund') as refunded
    from public.points_transactions pt
    where pt.reservation_id = r.id
  ) p on true
  where r.account_id = auth.uid()
  order by r.check_in desc;
$$;

-- Every money movement on the account, newest first. Only the card's last 4 leaves the database.
create or replace function public.get_transaction_history () returns table (
  transaction_id uuid,
  created_at timestamptz,
  transaction_type text,
  amount numeric,
  status text,
  reservation_id uuid,
  hotel_name text,
  card_last4 text
) language sql stable security invoker
set
  search_path to '' as $$
  select t.id, t.created_at, t.transaction_type, t.amount, t.status,
         pay.reservation_id, h.name, right(pay.card_number, 4)
  from public.transactions t
  join public.payments pay on pay.id = t.payment_id
  left join public.reservations r on r.id = pay.reservation_id
  left join public.hotels h on h.id = r.hotel_id
  where pay.account_id = auth.uid()
  order by t.created_at desc;
$$;