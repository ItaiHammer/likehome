\set ON_ERROR_STOP off
-- fixtures as admin
reset role;
truncate public.points_transactions, public.points_balances, public.transactions, public.payments, public.reservations, public.rooms cascade;
insert into public.rooms (id, hotel_id, room_type, price_per_night, capacity) values ('11111111-1111-1111-1111-111111111111', gen_random_uuid(), 'Queen', 101, 2);
set test.uid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set role authenticated;
-- user books 2 nights (as checkout does: reservation + payment via user client)
insert into public.reservations (id, account_id, hotel_id, room_id, check_in, check_out, total_price, has_insurance)
  values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', now() + interval '30 days', now() + interval '32 days', 202, false);
insert into public.payments (id, reservation_id, account_id, card_number, card_exp_month, card_exp_year)
  values ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '4242', 12, 2030);
\echo '--- A. user inserts a completed CREDIT on own payment (the F13 exploit)'
insert into public.transactions (payment_id, amount, transaction_type, status) values ('33333333-3333-3333-3333-333333333333', 0.01, 'credit', 'completed');
\echo '--- B. user inserts an inflated completed CHARGE'
insert into public.transactions (payment_id, amount, transaction_type, status) values ('33333333-3333-3333-3333-333333333333', 1000, 'charge', 'completed');
\echo '--- C. checkout charge via the new function (only exists after migration)'
select amount, transaction_type, status from public.record_checkout_charge('33333333-3333-3333-3333-333333333333');
\echo '--- D. second charge on same payment'
select amount from public.record_checkout_charge('33333333-3333-3333-3333-333333333333');
\echo '--- E. points balance now'
select coalesce((select balance from public.points_balances where account_id = auth.uid()), 0) as balance;
\echo '--- F. other user tries to charge / cancel this booking'
set test.uid = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
select amount from public.record_checkout_charge('33333333-3333-3333-3333-333333333333');
select * from public.cancel_reservation('22222222-2222-2222-2222-222222222222');
set test.uid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
\echo '--- G. owner sets has_insurance (still possible: open follow-up), cancels -> refund via function'
update public.reservations set has_insurance = true where id = '22222222-2222-2222-2222-222222222222';
select * from public.cancel_reservation('22222222-2222-2222-2222-222222222222');
\echo '--- H. final points balance and ledger'
select coalesce((select balance from public.points_balances where account_id = auth.uid()), 0) as balance;
select transaction_type, amount from public.transactions order by created_at;
