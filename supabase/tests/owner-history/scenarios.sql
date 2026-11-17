-- Owner booking & customer history checks; today is 2026-11-05. Each check is an assert, so the run stops at the
-- first failure. Everything rolls back at the end, so it can be re-run.
begin;

-- One booking plus its completed transactions (none at all = checkout's undo left it unpaid)
create function pg_temp.book(p_guest uuid, p_hotel uuid, p_in date, p_out date, p_status text default 'confirmed',
  p_charge numeric default 0, p_insurance numeric default 0, p_credit numeric default 0, p_fee numeric default null)
returns void language plpgsql as $$
declare v_res uuid; v_pay uuid;
begin
  insert into public.reservations (account_id, hotel_id, room_id, check_in, check_out, status, total_price,
                                   has_insurance, cancellation_fee, cancelled_at)
  select p_guest, p_hotel, rm.id, (p_in + time '15:00') at time zone 'UTC', (p_out + time '11:00') at time zone 'UTC',
         p_status, p_charge, p_insurance > 0, p_fee, case when p_status = 'cancelled' then now() end
  from public.rooms rm where rm.hotel_id = p_hotel
  returning id into v_res;
  if p_charge + p_insurance + p_credit = 0 then return; end if;
  insert into public.payments (reservation_id, account_id, card_number, card_exp_month, card_exp_year)
  values (v_res, p_guest, '4242', 12, 2030) returning id into v_pay;
  insert into public.transactions (payment_id, amount, transaction_type)
  select v_pay, amount, kind from (values (p_charge, 'charge'), (p_insurance, 'insurance'), (p_credit, 'credit')) t(amount, kind)
  where amount > 0;
end $$;

create function pg_temp.stage(p_guest text, p_check_in date, p_today date) returns text language sql as $$
  select stage from public.get_hotel_booking_history(null, p_today) where guest_name = p_guest and check_in = p_check_in
$$;

-- Owner A (1111…) has Harbor House (aaaa…01) and Cliff Inn (aaaa…02); owner B (2222…) has Other Place (bbbb…01)
insert into public.accounts (id, full_name, email) values
  ('11111111-1111-4111-8111-111111111111', 'Owner A', 'owner-a@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'Owner B', 'owner-b@example.com'),
  ('cccccccc-0000-4000-8000-000000000001', 'Ana Ruiz', 'ana@example.com'),
  ('cccccccc-0000-4000-8000-000000000002', 'Ben Ko', 'ben@example.com'),
  ('cccccccc-0000-4000-8000-000000000003', 'Cy Park', 'cy@example.com'),
  ('cccccccc-0000-4000-8000-000000000004', 'Dee Moss', 'dee@example.com'),
  ('cccccccc-0000-4000-8000-000000000005', 'Eve Lund', 'eve@example.com'),
  ('cccccccc-0000-4000-8000-000000000006', 'Fay Hart', 'fay@example.com'),
  ('cccccccc-0000-4000-8000-000000000007', 'Gus Bell', 'gus@example.com');
insert into public.hotels (id, owner_id, name) values
  ('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Harbor House'),
  ('aaaaaaaa-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Cliff Inn'),
  ('bbbbbbbb-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Other Place');
insert into public.rooms (hotel_id, room_type) select id, 'Double' from public.hotels;

do $$ begin
  -- Ana: past stay, uninsured cancel (the whole booking is the fee), upcoming stay
  perform pg_temp.book('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', '2026-09-01', '2026-09-04', p_charge => 300);
  perform pg_temp.book('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', '2026-10-10', '2026-10-12', 'cancelled', p_charge => 200, p_fee => 200);
  perform pg_temp.book('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', '2026-12-01', '2026-12-04', p_charge => 420);
  -- Ben: staying now at Harbor House, insured cancel at Cliff Inn (premium kept, booking refunded as points)
  perform pg_temp.book('cccccccc-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', '2026-11-03', '2026-11-07', p_charge => 500);
  perform pg_temp.book('cccccccc-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000002', '2026-12-20', '2026-12-22', 'cancelled', p_charge => 240, p_insurance => 20, p_credit => 240, p_fee => 0);
  -- Cy: only a future booking
  perform pg_temp.book('cccccccc-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000002', '2027-01-10', '2027-01-12', p_charge => 260);
  -- Dee: failed checkout (cancelled by checkout's undo: no fee, nothing paid)
  perform pg_temp.book('cccccccc-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', '2026-11-20', '2026-11-22', 'cancelled');
  -- Eve: owner B's guest
  perform pg_temp.book('cccccccc-0000-4000-8000-000000000005', 'bbbbbbbb-0000-4000-8000-000000000001', '2026-11-10', '2026-11-12', p_charge => 150);
  -- Fay: marked completed while the dates say in-stay; Gus: confirmed with nothing paid
  perform pg_temp.book('cccccccc-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000002', '2026-11-04', '2026-11-06', 'completed', p_charge => 180);
  perform pg_temp.book('cccccccc-0000-4000-8000-000000000007', 'aaaaaaaa-0000-4000-8000-000000000002', '2026-11-15', '2026-11-16');
end $$;

set role authenticated;
set test.uid = '11111111-1111-4111-8111-111111111111';

-- Money
do $$ begin
  assert (select amount_paid from public.get_hotel_booking_history() where guest_name = 'Ben Ko' and status = 'cancelled') = 240,
    'insured cancel: amount_paid leaves out the 20 premium';
  assert (select amount_refunded from public.get_hotel_booking_history() where guest_name = 'Ben Ko' and status = 'cancelled') = 240,
    'insured cancel: the refund comes back in amount_refunded';
  assert (select (amount_paid, amount_refunded) from public.get_hotel_booking_history()
          where guest_name = 'Ana Ruiz' and status = 'cancelled') = (200::numeric, 0::numeric),
    'uninsured cancel: paid in full, nothing refunded';
end $$;

-- Stages and hidden failed checkouts
do $$ begin
  assert pg_temp.stage('Ana Ruiz', '2026-09-01', '2026-11-05') = 'past', 'a stay that ended is past';
  assert pg_temp.stage('Ana Ruiz', '2026-12-01', '2026-11-05') = 'upcoming', 'a future stay is upcoming';
  assert pg_temp.stage('Ben Ko', '2026-11-03', '2026-11-05') = 'in-stay', 'a stay around today is in-stay';
  assert pg_temp.stage('Ben Ko', '2026-11-03', '2026-11-03') = 'in-stay', 'check-in day is in-stay';
  assert pg_temp.stage('Ben Ko', '2026-11-03', '2026-11-07') = 'past', 'check-out day is past';
  assert pg_temp.stage('Ben Ko', '2026-11-03', '2026-11-02') = 'upcoming', 'the day before check-in is upcoming';
  assert pg_temp.stage('Fay Hart', '2026-11-04', '2026-11-05') = 'past', 'completed is past whatever the dates';
  assert pg_temp.stage('Ana Ruiz', '2026-10-10', '2026-10-01') = 'cancelled', 'cancelled wins over the dates';
  assert pg_temp.stage('Ben Ko', '2026-11-03', null) is not null, 'no p_today still works (UTC today)';

  assert not exists (select 1 from public.get_hotel_booking_history(null, '2026-11-05') where guest_name = 'Dee Moss'),
    'a failed checkout (cancelled, no fee, nothing paid) is hidden';
  assert exists (select 1 from public.get_hotel_booking_history(null, '2026-11-05') where guest_name = 'Ben Ko' and stage = 'cancelled'),
    'an insured cancel with a 0 fee is kept';
  assert exists (select 1 from public.get_hotel_booking_history(null, '2026-11-05') where guest_name = 'Gus Bell'),
    'a confirmed booking with nothing paid is kept';
end $$;

-- Who sees what
do $$ begin
  assert (select count(*) from public.get_hotel_booking_history(null, '2026-11-05')) = 8,
    'owner A sees the 8 bookings at their two hotels (not Dee''s failed checkout, not owner B''s)';
  assert (select array_agg(distinct hotel_name) from public.get_hotel_booking_history('aaaaaaaa-0000-4000-8000-000000000002', '2026-11-05'))
         = array['Cliff Inn'], 'p_hotel_id scopes to that listing';
end $$;
do $$ begin
  perform public.get_hotel_booking_history('bbbbbbbb-0000-4000-8000-000000000001', '2026-11-05');
  assert false, 'owner B''s listing must be refused';
exception when insufficient_privilege then null;
end $$;
set test.uid = '';
do $$ begin
  perform public.get_hotel_booking_history(null, '2026-11-05');
  assert false, 'signed out must be refused';
exception when insufficient_privilege then null;
end $$;
reset role;
set role anon;
do $$ begin
  perform public.get_hotel_booking_history(null, '2026-11-05');
  assert false, 'anon can''t call it';
exception when insufficient_privilege then null;
end $$;
reset role;
set role authenticated;
set test.uid = '11111111-1111-4111-8111-111111111111';

-- Customers (one row per guest)
do $$
declare c record;
begin
  assert (select array_agg(guest_name) from public.get_hotel_customer_history(null, '2026-11-05'))
         = array['Cy Park', 'Ben Ko', 'Ana Ruiz', 'Gus Bell', 'Fay Hart'],
    'one row per guest, latest check-in first; no row for Dee''s failed checkout or owner B''s guest';

  select * into c from public.get_hotel_customer_history(null, '2026-11-05') where guest_name = 'Ana Ruiz';
  assert (c.total_bookings, c.cancelled_bookings, c.upcoming_bookings) = (3::bigint, 1::bigint, 1::bigint), 'Ana: counts';
  assert c.nights_stayed = 3, 'Ana: only the past stay''s nights, not the upcoming or cancelled ones';
  assert c.total_paid = 920, 'Ana: 300 + 200 (uninsured cancel kept in full) + 420';
  assert (c.first_stay, c.last_stay, c.next_stay) = ('2026-09-01'::date, '2026-09-01'::date, '2026-12-01'::date),
    'Ana: first and last stay are the stay that started; next is the upcoming one';
  assert c.is_repeat, 'Ana: two bookings that weren''t cancelled make a repeat guest';

  select * into c from public.get_hotel_customer_history(null, '2026-11-05') where guest_name = 'Ben Ko';
  assert c.total_paid = 500, 'Ben: 500 + 240 charged - 240 refunded, no 20 premium';
  assert c.nights_stayed = 4, 'Ben: an in-stay stay counts its nights';
  assert (c.first_stay, c.last_stay) = ('2026-11-03'::date, '2026-11-03'::date) and c.next_stay is null, 'Ben: dates';
  assert not c.is_repeat, 'Ben: a cancelled booking doesn''t make a repeat guest';
  assert c.hotel_names = array['Cliff Inn', 'Harbor House'], 'Ben: both listings, by name';

  select * into c from public.get_hotel_customer_history(null, '2026-11-05') where guest_name = 'Cy Park';
  assert c.first_stay is null and c.last_stay is null, 'Cy: no first or last stay before the first one starts';
  assert c.next_stay = '2027-01-10' and c.upcoming_bookings = 1 and c.nights_stayed = 0, 'Cy: only the upcoming booking';

  select * into c from public.get_hotel_customer_history(null, '2026-11-05') where guest_name = 'Fay Hart';
  assert c.nights_stayed = 2 and c.last_stay = '2026-11-04', 'Fay: completed counts as stayed';

  select * into c from public.get_hotel_customer_history('aaaaaaaa-0000-4000-8000-000000000001', '2026-11-05')
  where guest_name = 'Ben Ko';
  assert c.total_bookings = 1 and c.hotel_names = array['Harbor House'], 'p_hotel_id scopes the totals to that listing';

  select * into c from public.get_hotel_customer_history(null, '2026-11-04') where guest_name = 'Fay Hart';
  assert c.last_stay = '2026-11-04', 'p_today reaches the booking rules';
  select * into c from public.get_hotel_customer_history(null, '2026-11-02') where guest_name = 'Ben Ko';
  assert c.first_stay is null and c.next_stay = '2026-11-03', 'Ben, the day before check-in: not stayed yet';
end $$;
do $$ begin
  perform public.get_hotel_customer_history('bbbbbbbb-0000-4000-8000-000000000001', '2026-11-05');
  assert false, 'customers at owner B''s listing must be refused';
exception when insufficient_privilege then null;
end $$;
reset role;
set role anon;
do $$ begin
  perform public.get_hotel_customer_history(null, '2026-11-05');
  assert false, 'anon can''t call the customer RPC';
exception when insufficient_privilege then null;
end $$;
reset role;

do $$ begin raise notice 'all owner history checks passed'; end $$;
rollback;
