create extension if not exists pgcrypto;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true),'')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;

create table public.rooms (id uuid primary key default gen_random_uuid(), hotel_id uuid not null, room_type text not null, price_per_night numeric not null, capacity bigint not null);
create table public.reservations (id uuid primary key default gen_random_uuid(), account_id uuid not null, hotel_id uuid not null, room_id uuid not null references public.rooms(id) on delete cascade, check_in timestamptz not null, check_out timestamptz not null, status text not null default 'confirmed', total_price numeric not null, created_at timestamptz not null default now(), guests int not null default 1, children int not null default 0, has_insurance boolean not null default false, cancelled_at timestamptz, cancellation_fee numeric);
create table public.payments (id uuid primary key default gen_random_uuid(), reservation_id uuid not null references public.reservations(id), account_id uuid not null, card_number varchar not null, card_exp_month smallint not null, card_exp_year smallint not null, created_at timestamptz not null default now());
create table public.transactions (id uuid primary key default gen_random_uuid(), payment_id uuid not null references public.payments(id), amount numeric not null, transaction_type text not null, status text not null default 'completed', created_at timestamptz not null default now());
create table public.points_transactions (id uuid primary key default gen_random_uuid(), account_id uuid not null, reservation_id uuid, type text not null, points int not null, note text, created_at timestamptz not null default now());
create table public.points_balances (account_id uuid primary key, balance int not null default 0, updated_at timestamptz not null default now());
grant select, insert, update, delete on all tables in schema public to authenticated;

alter table public.rooms enable row level security; alter table public.reservations enable row level security;
alter table public.payments enable row level security; alter table public.transactions enable row level security;
alter table public.points_transactions enable row level security; alter table public.points_balances enable row level security;
create policy "Anyone can view rooms" on public.rooms for select using (true);
create policy "ins res" on public.reservations for insert with check (auth.uid() = account_id);
create policy "upd res" on public.reservations for update using (auth.uid() = account_id);
create policy "sel res" on public.reservations for select using (auth.uid() = account_id);
create policy "Users can create payments for their own reservations" on public.payments for insert to authenticated with check ((account_id = (select auth.uid())) and exists (select 1 from public.reservations r where r.id = payments.reservation_id and r.account_id = (select auth.uid())));
create policy "Users can view their own payments" on public.payments for select to authenticated using (account_id = (select auth.uid()));
create policy "Users can add transactions to their own payments" on public.transactions for insert to authenticated with check (exists (select 1 from public.payments p where p.id = transactions.payment_id and p.account_id = (select auth.uid())));
create policy "Users can view their own transactions" on public.transactions for select to authenticated using (exists (select 1 from public.payments p where p.id = transactions.payment_id and p.account_id = (select auth.uid())));
create policy "Users read own balance" on public.points_balances for select to authenticated using (account_id = (select auth.uid()));
create policy "Users read own points history" on public.points_transactions for select to authenticated using (account_id = (select auth.uid()));

create function public.dollars_to_points(p_amount numeric) returns integer language sql immutable set search_path to '' as $$ select cast(round(p_amount * 100) as integer); $$;
create function public.apply_points_transaction() returns trigger language plpgsql security definer set search_path to '' as $$ begin
  insert into public.points_balances (account_id, balance) values (new.account_id, new.points)
  on conflict (account_id) do update set balance = public.points_balances.balance + excluded.balance; return new; end; $$;
create trigger points_transactions_apply after insert on public.points_transactions for each row execute function public.apply_points_transaction();
create function public.credit_to_points() returns trigger language plpgsql security definer set search_path to '' as $$ begin if new.transaction_type = 'credit' and new.status = 'completed' then
  insert into public.points_transactions (account_id, reservation_id, type, points, note) select p.account_id, p.reservation_id, 'refund', public.dollars_to_points(new.amount), 'Refund' from public.payments p where p.id = new.payment_id; end if; return new; end; $$;
create trigger transactions_credit_to_points after insert on public.transactions for each row execute function public.credit_to_points();
CREATE OR REPLACE FUNCTION public.get_cancellation_quote(p_reservation_id uuid)
 RETURNS TABLE(has_insurance boolean, can_cancel boolean, booking_paid numeric, insurance_paid numeric, refund numeric, cancellation_fee numeric, refund_points integer)
 LANGUAGE sql STABLE SET search_path TO '' AS $function$
  with r as (select * from public.reservations where id = p_reservation_id and account_id = auth.uid()),
  paid as (select coalesce(sum(t.amount) filter (where t.transaction_type = 'charge'), 0) - coalesce(sum(t.amount) filter (where t.transaction_type = 'credit'), 0) as booking,
      coalesce(sum(t.amount) filter (where t.transaction_type = 'insurance'), 0) as insurance
    from public.payments p join public.transactions t on t.payment_id = p.id
    where p.reservation_id = p_reservation_id and p.account_id = auth.uid() and t.status = 'completed'),
  redeemed as (select -coalesce(sum(pt.points), 0)::numeric / 100 as booking from public.points_transactions pt where pt.reservation_id = p_reservation_id and pt.account_id = auth.uid() and pt.type = 'redeem'),
  funded as (select greatest(paid.booking + redeemed.booking, 0) as booking, paid.insurance from paid cross join redeemed),
  terms as (select r.has_insurance, r.status = 'confirmed' and r.check_in > now() as can_cancel, funded.booking, funded.insurance, case when r.has_insurance then funded.booking else 0 end as refund from r cross join funded)
  select has_insurance, can_cancel, booking, insurance, refund, booking - refund, public.dollars_to_points(refund) from terms;
$function$;
CREATE OR REPLACE FUNCTION public.cancel_reservation(p_reservation_id uuid)
 RETURNS TABLE(refund numeric, cancellation_fee numeric, refund_points integer)
 LANGUAGE plpgsql SET search_path TO '' AS $function$
declare q record; v_payment_id uuid;
begin
  perform 1 from public.reservations where id = p_reservation_id and account_id = auth.uid() for update;
  select * into q from public.get_cancellation_quote(p_reservation_id);
  if not found then raise exception 'Reservation not found' using errcode = 'P0002'; end if;
  if not q.can_cancel then raise exception 'This booking can no longer be cancelled' using errcode = 'P0001'; end if;
  update public.reservations set status = 'cancelled', cancelled_at = now(), cancellation_fee = q.cancellation_fee where id = p_reservation_id;
  if q.refund > 0 then
    select id into v_payment_id from public.payments where reservation_id = p_reservation_id order by created_at desc limit 1;
    insert into public.transactions (payment_id, amount, transaction_type, status) values (v_payment_id, q.refund, 'credit', 'completed');
  end if;
  return query select q.refund, q.cancellation_fee, q.refund_points;
end; $function$;
grant execute on all functions in schema public to authenticated;
