-- Paste before the code that saves children deploys: checkout and booking changes write this column.
-- How many of a booking's guests are children. LiteAPI prices children apart from adults, so a change has
-- to be quoted for the same party as the booking. Bookings made before this count every guest as an adult.
begin;

alter table public.reservations
  add column if not exists children integer not null default 0 check (children >= 0);

commit;
notify pgrst, 'reload schema';
