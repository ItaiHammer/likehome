-- US 5.2.3: saved travelers and payment methods for saved checkout.
-- Cards are dummy data but stored like real ones: never the full number or the CVC.

create table public.saved_travelers (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  first_name text not null check (length(trim(first_name)) > 0),
  last_name text not null check (length(trim(last_name)) > 0),
  email text not null check (email ~ '^\S+@\S+\.\S+$'),
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.saved_payment_methods (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  brand text not null check (brand in ('visa', 'mastercard', 'amex', 'discover')),
  last4 text not null check (last4 ~ '^\d{4}$'),
  exp_month smallint not null check (exp_month between 1 and 12),
  exp_year smallint not null check (exp_year >= 2000),
  name_on_card text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  -- the same card can't be saved twice
  unique (account_id, brand, last4, exp_month, exp_year)
);

-- at most one default of each per account
create unique index saved_travelers_one_default on public.saved_travelers (account_id) where is_default;
create unique index saved_payment_methods_one_default on public.saved_payment_methods (account_id) where is_default;
create index saved_travelers_account_idx on public.saved_travelers (account_id);

-- which saved card paid (null = card typed in at checkout)
alter table public.payments
add column saved_payment_method_id uuid references public.saved_payment_methods (id) on delete set null;

-- users manage only their own saved info
alter table public.saved_travelers enable row level security;
alter table public.saved_payment_methods enable row level security;

create policy "Users manage own saved travelers" on public.saved_travelers
for all to authenticated
using (account_id = (select auth.uid()))
with check (account_id = (select auth.uid()));

create policy "Users manage own saved payment methods" on public.saved_payment_methods
for all to authenticated
using (account_id = (select auth.uid()))
with check (account_id = (select auth.uid()));

-- Switching the default takes two updates (the unique index would refuse two defaults at once),
-- so each lives in a function: both land or neither does.
create or replace function public.set_default_saved_traveler (p_id uuid) returns void
language plpgsql security invoker
set search_path to '' as $$
begin
  update public.saved_travelers set is_default = false
  where account_id = auth.uid() and is_default and id <> p_id;

  update public.saved_travelers set is_default = true
  where account_id = auth.uid() and id = p_id;
  if not found then
    raise exception 'Saved traveler not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.set_default_saved_payment_method (p_id uuid) returns void
language plpgsql security invoker
set search_path to '' as $$
begin
  update public.saved_payment_methods set is_default = false
  where account_id = auth.uid() and is_default and id <> p_id;

  update public.saved_payment_methods set is_default = true
  where account_id = auth.uid() and id = p_id;
  if not found then
    raise exception 'Saved card not found' using errcode = 'P0002';
  end if;
end;
$$;