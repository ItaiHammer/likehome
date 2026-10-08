-- US 7.2.4: store points balances and redemption records.
-- points_transactions is the ledger (earn / redeem / refund / adjust); a trigger keeps
-- points_balances in sync. Both are read-only to clients via RLS; writes must go through
-- security definer functions or the service role.
create table
    public.points_balances (
        account_id uuid primary key references public.accounts (id) on delete cascade,
        balance integer not null default 0 check (balance >= 0),
        updated_at timestamptz not null default now()
    );

create table
    public.points_transactions (
        id uuid primary key default gen_random_uuid (),
        account_id uuid not null references public.accounts (id) on delete cascade,
        reservation_id uuid references public.reservations (id) on delete set null,
        type text not null check (type in ('earn', 'redeem', 'refund', 'adjust')),
        points integer not null check (points <> 0),
        note text,
        created_at timestamptz not null default now(),
        check (
            (
                type in ('earn', 'refund')
                and points > 0
            )
            or (
                type = 'redeem'
                and points < 0
            )
            or type = 'adjust'
        )
    );

-- a booking can only earn points once
create unique index points_one_earn_per_reservation on public.points_transactions (reservation_id)
where
    type = 'earn';

create index points_transactions_account_idx on public.points_transactions (account_id, created_at desc);

create function public.apply_points_transaction () returns trigger language plpgsql security definer
set
    search_path to '' as $$ begin
    -- ensure the row exists (0 passes the >= 0 check)
insert into
    public.points_balances (account_id)
values
    (new.account_id) on conflict (account_id)
do nothing;

-- the check constraint now applies to the real new balance
update public.points_balances
set
    balance = public.points_balances.balance + new.points,
    updated_at = now()
where
    account_id = new.account_id;

return new;

end;

$$;

create trigger points_transactions_apply after
insert
    on public.points_transactions for each row
execute function public.apply_points_transaction ();

-- users read their own data; no client writes
alter table public.points_balances enable row level security;

alter table public.points_transactions enable row level security;

create policy "Users read own balance" on public.points_balances for
select
    to authenticated using (
        account_id = (
            select
                auth.uid ()
        )
    );

create policy "Users read own points history" on public.points_transactions for
select
    to authenticated using (
        account_id = (
            select
                auth.uid ()
        )
    );