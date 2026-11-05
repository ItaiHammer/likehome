-- US4.5: internal one-way hotel -> guest messages (one row per recipient)

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  recipient_id uuid not null references public.accounts (id) on delete cascade,
  subject text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_recipient_idx on public.messages (recipient_id, created_at desc);
create index messages_hotel_idx on public.messages (hotel_id, created_at desc);

alter table public.messages enable row level security;

-- Guests read their own messages
create policy "Recipients read own messages" on public.messages
for select to authenticated
using (recipient_id = (select auth.uid()));

-- Owners read what they sent from their hotels
create policy "Owners read hotel messages" on public.messages
for select to authenticated
using (exists (
  select 1 from public.hotels h
  where h.id = messages.hotel_id and h.owner_id = (select auth.uid())
));

-- Is p_account_id a previous customer (any reservation) of a hotel the caller owns?
-- A function because owners can't read other users' reservations under RLS. The owner check
-- is inside, so it can't be used to look up who has stayed at someone else's hotel.
create or replace function public.is_hotel_guest(p_hotel_id uuid, p_account_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.hotels h
    join public.reservations r on r.hotel_id = h.id
    where h.id = p_hotel_id
      and h.owner_id = (select auth.uid())
      and r.account_id = p_account_id
  );
$$;

revoke execute on function public.is_hotel_guest(uuid, uuid) from public, anon;
grant execute on function public.is_hotel_guest(uuid, uuid) to authenticated;

-- Owners send only to guests who have a reservation at their hotel
create policy "Owners send hotel messages" on public.messages
for insert to authenticated
with check (public.is_hotel_guest(hotel_id, recipient_id));

-- Guests mark their own messages read, and nothing else
create policy "Recipients mark own messages read" on public.messages
for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

-- Recipient picker: guests with a reservation at a hotel the caller owns.
-- A function because owners can't read other users' reservations/accounts under RLS.
create or replace function public.get_hotel_recipients(p_hotel_id uuid)
returns table (account_id uuid, email text, full_name text, last_check_in timestamptz, last_status text)
language sql security definer set search_path = '' as $$
  select distinct on (a.id) a.id, a.email, a.full_name, r.check_in, r.status
  from public.hotels h
  join public.rooms rm on rm.hotel_id = h.id
  join public.reservations r on r.room_id = rm.id
  join public.accounts a on a.id = r.account_id
  where h.id = p_hotel_id and h.owner_id = (select auth.uid())
  order by a.id, r.check_in desc;
$$;

revoke execute on function public.get_hotel_recipients(uuid) from public, anon;
grant execute on function public.get_hotel_recipients(uuid) to authenticated;