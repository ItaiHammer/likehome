\set ON_ERROR_STOP off
\pset footer off
-- Run after setup.sql and the migrations (see README.md). Each step says what should happen.
reset role;
truncate public.points_transactions, public.points_balances, public.transactions, public.payments, public.reservations, public.rooms, public.hotels cascade;
insert into public.hotels (id, owner_id, name, description, address, city) values
  ('00000000-0000-0000-0000-0000000000a1', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Owner hotel', 'Original', '1 Main', 'San Jose');
insert into public.rooms (id, hotel_id, room_type, price_per_night, capacity, num_beds, bed_size, created_at) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Coastal king', 100, 2, 1, 'King', now() - interval '3 min'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Coastal king', 100, 2, 1, 'King', now() - interval '2 min'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a1', 'Coastal king', 100, 2, 1, 'King', now() - interval '1 min'),
  ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-0000000000a1', 'Twin', 80, 2, 2, 'Twin', now());

-- A stand-in for a SECURITY DEFINER checkout (like checkout_reservation): may sell insurance
create function public.test_definer_checkout(p_room uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid; begin
  insert into public.reservations (account_id, hotel_id, room_id, check_in, check_out, total_price, has_insurance)
  values (auth.uid(), '00000000-0000-0000-0000-0000000000a1', p_room, '2099-02-01', '2099-02-03', 200, true) returning id into v;
  return v; end; $$;
grant execute on function public.test_definer_checkout(uuid) to authenticated;

set test.uid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set role authenticated;

\echo '=== Reservation fields (insurance loophole)'
\echo '--- 1. guest books room 1 for 2 nights, sending total_price 1 and a wrong hotel: saved at 200.00 and the room''s hotel'
insert into public.reservations (id, account_id, hotel_id, room_id, check_in, check_out, total_price)
  values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '2099-01-10', '2099-01-12', 1);
select total_price, hotel_id = '00000000-0000-0000-0000-0000000000a1' as right_hotel from public.reservations where id = '22222222-2222-2222-2222-222222222222';
\echo '--- 2. insert with has_insurance = true: REFUSED'
insert into public.reservations (account_id, hotel_id, room_id, check_in, check_out, total_price, has_insurance)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', gen_random_uuid(), '00000000-0000-0000-0000-000000000002', '2099-03-10', '2099-03-12', 200, true);
\echo '--- 3. insert already cancelled: REFUSED'
insert into public.reservations (account_id, hotel_id, room_id, check_in, check_out, total_price, status)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', gen_random_uuid(), '00000000-0000-0000-0000-000000000002', '2099-03-10', '2099-03-12', 200, 'cancelled');
\echo '--- 4. flip has_insurance on own booking: REFUSED'
update public.reservations set has_insurance = true where id = '22222222-2222-2222-2222-222222222222';
\echo '--- 5. set total_price only: ignored, stays 200.00'
update public.reservations set total_price = 5 where id = '22222222-2222-2222-2222-222222222222';
select total_price from public.reservations where id = '22222222-2222-2222-2222-222222222222';
\echo '--- 6. change dates to 3 nights (and send total_price 1): repriced to 300.00'
update public.reservations set check_out = '2099-01-13', total_price = 1 where id = '22222222-2222-2222-2222-222222222222';
select total_price from public.reservations where id = '22222222-2222-2222-2222-222222222222';
\echo '--- 7. set status to something else: REFUSED'
update public.reservations set status = 'completed' where id = '22222222-2222-2222-2222-222222222222';
\echo '--- 8. cancel and change dates in one write: REFUSED'
update public.reservations set status = 'cancelled', check_out = '2099-01-11' where id = '22222222-2222-2222-2222-222222222222';
\echo '--- 9. plain cancel (checkout''s undo): allowed, cancelled_at set'
update public.reservations set status = 'cancelled' where id = '22222222-2222-2222-2222-222222222222';
select status, cancelled_at is not null as has_cancelled_at from public.reservations where id = '22222222-2222-2222-2222-222222222222';
\echo '--- 10. back to confirmed after cancelling: REFUSED'
update public.reservations set status = 'confirmed' where id = '22222222-2222-2222-2222-222222222222';
\echo '--- 11. SECURITY DEFINER checkout may still sell insurance: allowed'
select public.test_definer_checkout('00000000-0000-0000-0000-000000000003') is not null as booked;
select has_insurance, status from public.reservations where room_id = '00000000-0000-0000-0000-000000000003';
\echo '--- 12. insured cancel through cancel_reservation (SECURITY DEFINER): allowed, fee 0'
insert into public.payments (id, reservation_id, account_id, card_number, card_exp_month, card_exp_year)
  select '33333333-3333-3333-3333-333333333333', id, account_id, '4242', 12, 2030 from public.reservations where has_insurance;
select amount from public.record_checkout_charge('33333333-3333-3333-3333-333333333333');
select refund, cancellation_fee from public.cancel_reservation((select id from public.reservations where has_insurance));
select status, cancellation_fee from public.reservations where has_insurance;

\echo '=== F9 booked nights'
reset role;
insert into public.reservations (account_id, hotel_id, room_id, check_in, check_out, total_price) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000001', '2099-05-01', '2099-05-03', 200);
set role anon;
\echo '--- 13. signed-out visitor sees room 1 booked May 1 and 2 (not the 3rd, check-out day); cancelled stays not listed'
select room_id, night from public.get_booked_nights('00000000-0000-0000-0000-0000000000a1', '2099-04-30', '2099-05-10');
\echo '--- 14. range clipped to the window asked for'
select room_id, night from public.get_booked_nights('00000000-0000-0000-0000-0000000000a1', '2099-05-02', '2099-05-10');
\echo '--- 15. more than 400 days: no rows'
select count(*) from public.get_booked_nights('00000000-0000-0000-0000-0000000000a1', '2099-01-01', '2100-06-01');
\echo '--- 16. returns only room ids and nights'
select proargnames from pg_proc where proname = 'get_booked_nights';

\echo '=== F1 / R3 save_listing'
set role authenticated;
set test.uid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
\echo '--- 17. not the owner: REFUSED'
select public.save_listing('00000000-0000-0000-0000-0000000000a1', '{"name":"Owner hotel","description":"Original","address":"1 Main","city":"San Jose","tags":[],"photo_urls":[]}', '{"remove":[{"ids":["00000000-0000-0000-0000-000000000009"],"count":1,"room_type":"Twin"}]}');
set test.uid = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
\echo '--- 18. owner reprices the 3 kings in place: same ids, bookings kept'
select public.save_listing('00000000-0000-0000-0000-0000000000a1', '{"name":"Owner hotel","description":"Original","address":"1 Main","city":"San Jose","tags":[],"photo_urls":[]}', '{"update":[{"ids":["00000000-0000-0000-0000-000000000001","00000000-0000-0000-0000-000000000002","00000000-0000-0000-0000-000000000003"],"room_type":"Ocean king","price_per_night":120,"capacity":2,"num_beds":1,"bed_size":"King"}]}');
reset role;
select id, room_type, price_per_night from public.rooms order by id;
select count(*) as reservations_kept from public.reservations;
set role authenticated;
\echo '--- 19. owner goes from 3 kings to 1: rooms 1 and 3 are booked, so REFUSED with a message'
select public.save_listing('00000000-0000-0000-0000-0000000000a1', '{"name":"Owner hotel","description":"Original","address":"1 Main","city":"San Jose","tags":[],"photo_urls":[]}', '{"remove":[{"ids":["00000000-0000-0000-0000-000000000001","00000000-0000-0000-0000-000000000002","00000000-0000-0000-0000-000000000003"],"count":2,"room_type":"Ocean king"}]}');
\echo '--- 20. 3 kings to 2: removes the unbooked room 2 only'
select public.save_listing('00000000-0000-0000-0000-0000000000a1', '{"name":"Owner hotel","description":"Original","address":"1 Main","city":"San Jose","tags":[],"photo_urls":[]}', '{"remove":[{"ids":["00000000-0000-0000-0000-000000000001","00000000-0000-0000-0000-000000000002","00000000-0000-0000-0000-000000000003"],"count":1,"room_type":"Ocean king"}]}');
reset role;
select id from public.rooms order by id;
set role authenticated;
\echo '--- 21. remove the unbooked Twin type and add 2 suites'
select public.save_listing('00000000-0000-0000-0000-0000000000a1', '{"name":"Owner hotel","description":"Original","address":"1 Main","city":"San Jose","tags":[],"photo_urls":[]}', '{"remove":[{"ids":["00000000-0000-0000-0000-000000000009"],"count":1,"room_type":"Twin"}],"insert":[{"room_type":"Suite","price_per_night":300,"capacity":4,"num_beds":2,"bed_size":"Queen"},{"room_type":"Suite","price_per_night":300,"capacity":4,"num_beds":2,"bed_size":"Queen"}]}');
reset role;
select room_type, count(*) from public.rooms group by 1 order by 1;
select count(*) as reservations_kept from public.reservations;

\echo '--- 22. R3: description change + removing a booked room in one save: REFUSED, and the description is NOT saved'
set role authenticated;
select public.save_listing('00000000-0000-0000-0000-0000000000a1', '{"name":"Owner hotel","description":"Changed","address":"1 Main","city":"San Jose","tags":[],"photo_urls":[]}', '{"remove":[{"ids":["00000000-0000-0000-0000-000000000001"],"count":1,"room_type":"Ocean king"}]}');
reset role;
select description from public.hotels where id = '00000000-0000-0000-0000-0000000000a1';
\echo '--- 22b. R3: creating a listing with a bad room (0 beds): REFUSED, and no hotel is left behind'
set role authenticated;
select public.save_listing(null, '{"name":"Half hotel","address":"2 Main","city":"San Jose"}', '{"insert":[{"room_type":"Bad","price_per_night":50,"capacity":2,"num_beds":0,"bed_size":"King"}]}');
reset role;
select count(*) as half_hotels from public.hotels where name = 'Half hotel';
\echo '--- 22c. creating a listing with a room: the caller owns it'
set role authenticated;
select public.save_listing(null, '{"name":"New hotel","address":"3 Main","city":"San Jose","property_type":"apartment","postal_code":"95112"}', '{"insert":[{"room_type":"Studio","price_per_night":90,"capacity":2,"num_beds":1,"bed_size":"Queen"}]}') is not null as created;
reset role;
select owner_id, property_type, postal_code, (select count(*) from public.rooms r where r.hotel_id = h.id) as rooms from public.hotels h where name = 'New hotel';

\echo '=== F3 listing-photos bucket'
select id, public, file_size_limit, allowed_mime_types from storage.buckets;
set role authenticated;
set test.uid = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
\echo '--- 23. upload into own folder: allowed'
insert into storage.objects (bucket_id, name) values ('listing-photos', 'cccccccc-cccc-cccc-cccc-cccccccccccc/a.jpg');
\echo '--- 24. upload into someone else''s folder: REFUSED'
insert into storage.objects (bucket_id, name) values ('listing-photos', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/a.jpg');
\echo '--- 25. upload at the bucket root: REFUSED'
insert into storage.objects (bucket_id, name) values ('listing-photos', 'a.jpg');
reset role;
