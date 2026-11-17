-- Local mirror of what get_hotel_booking_history / get_hotel_customer_history read (live columns as in
-- supabase/tests/audit/setup.sql, plus accounts). Never run against the shared Supabase project.
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true),'')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;

create table public.accounts (id uuid primary key, full_name varchar, email varchar not null);
create table public.hotels (id uuid primary key default gen_random_uuid(), owner_id uuid, name text not null);
create table public.rooms (id uuid primary key default gen_random_uuid(), hotel_id uuid not null references public.hotels(id) on delete cascade, room_type text not null);
create table public.reservations (id uuid primary key default gen_random_uuid(), account_id uuid not null, hotel_id uuid not null, room_id uuid not null references public.rooms(id) on delete cascade, check_in timestamptz not null, check_out timestamptz not null, status text not null default 'confirmed', total_price numeric not null, created_at timestamptz not null default now(), guests int not null default 1, children int not null default 0, has_insurance boolean not null default false, cancelled_at timestamptz, cancellation_fee numeric,
  constraint check_out_after_check_in check (check_out > check_in));
create table public.payments (id uuid primary key default gen_random_uuid(), reservation_id uuid not null references public.reservations(id), account_id uuid not null, card_number varchar not null, card_exp_month smallint not null, card_exp_year smallint not null, created_at timestamptz not null default now());
create table public.transactions (id uuid primary key default gen_random_uuid(), payment_id uuid not null references public.payments(id), amount numeric not null, transaction_type text not null, status text not null default 'completed', created_at timestamptz not null default now());
