-- #93: a completed credit (refund) on transactions adds a matching 'refund' row to points_transactions.
-- The existing points_transactions_apply trigger then updates points_balances, so no balance logic here.
-- Redemption rate: 100 points = $1, so a refund gives back the same value in points
create or replace function public.dollars_to_points (p_amount numeric) returns integer language sql immutable
set
  search_path to '' as $$
select
    cast(round(p_amount * 100) as integer);

$$;

-- security definer: users can't insert ledger rows themselves once the temp policy below is gone
create or replace function public.credit_to_points () returns trigger language plpgsql security definer
set
  search_path to '' as $$ begin if new.transaction_type = 'credit'
    and new.status = 'completed' then
insert into
    public.points_transactions (account_id, reservation_id, type, points, note)
select
    p.account_id,
    p.reservation_id,
    'refund',
    public.dollars_to_points (new.amount),
    'Refund'
from
    public.payments p
where
    p.id = new.payment_id;

end if;

return new;

end;

$$;

create trigger transactions_credit_to_points
after insert on public.transactions for each row
execute function public.credit_to_points ();

-- Points now only come from database triggers, so the demo policy from points_storage.sql can go
drop policy if exists "Users insert own points transactions" on public.points_transactions;