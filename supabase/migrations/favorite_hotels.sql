create table public.favorite_hotels (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (account_id, hotel_id)
);

create index favorite_hotels_account_idx on public.favorite_hotels (account_id, created_at desc);

alter table public.favorite_hotels enable row level security;

create policy "Users manage own favorites" on public.favorite_hotels
for all to authenticated
using (account_id = (select auth.uid()))
with check (account_id = (select auth.uid()));