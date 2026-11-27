begin;

create or replace function public.earn_booking_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid;
  v_reservation_id uuid;
  v_earned integer;
begin
  if new.transaction_type <> 'charge' or new.status <> 'completed' or new.amount <= 0 then
    return new;
  end if;

  select p.account_id, p.reservation_id
    into v_account_id, v_reservation_id
  from public.payments p
  join public.reservations r on r.id = p.reservation_id
  where p.id = new.payment_id
    and p.account_id = r.account_id
    and r.status = 'confirmed';

  if not found then
    return new;
  end if;

  -- A zero-dollar checkout charge (fully funded by points) also counts as the
  -- first charge, preventing a later edit from being mistaken for checkout.
  if exists (
    select 1
    from public.transactions t
    join public.payments p on p.id = t.payment_id
    where p.reservation_id = v_reservation_id
      and t.id <> new.id
      and t.transaction_type = 'charge'
      and t.status = 'completed'
  ) then
    return new;
  end if;

  v_earned := floor(new.amount)::integer;
  if v_earned > 0 then
    insert into public.points_transactions (account_id, reservation_id, type, points, note)
    values (v_account_id, v_reservation_id, 'earn', v_earned, 'Booking payment')
    on conflict (reservation_id) where type = 'earn' do nothing;
  end if;

  return new;
end;
$$;

create trigger transactions_earn_booking_points
after insert on public.transactions
for each row execute function public.earn_booking_points();

commit;
