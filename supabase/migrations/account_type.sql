-- US 2.4.4: personal / business account type.
-- null = not chosen yet (sign-up is OAuth only, so the choice happens after the first sign-in).
-- Users can't write account_type directly; set_account_type() sets it once.
begin;

alter table public.accounts
  add column if not exists account_type text
  check (account_type is null or account_type in ('personal', 'business'));

-- Existing users: hotel owners are business, everyone else personal
update public.accounts a
set account_type = case
  when exists (select 1 from public.hotels h where h.owner_id = a.id) then 'business'
  else 'personal'
end
where a.account_type is null;

-- Block direct writes to account_type from app users (same pattern as guard_reservation_write)
create or replace function public.guard_account_type()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' and new.account_type is not null then
    raise exception 'Choose your account type after signing in.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.account_type is distinct from old.account_type then
    raise exception 'Account type can''t be changed here.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_guard_account_type on public.accounts;
create trigger accounts_guard_account_type
before insert or update on public.accounts
for each row execute function public.guard_account_type();

-- The only way to set it: once, by the signed-in user, for their own account
create or replace function public.set_account_type(p_type text)
returns text
language plpgsql
security definer
set search_path to ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_type not in ('personal', 'business') then
    raise exception 'Account type must be personal or business.' using errcode = '22023';
  end if;

  update public.accounts
  set account_type = p_type
  where id = auth.uid() and account_type is null;

  if not found then
    if exists (select 1 from public.accounts where id = auth.uid()) then
      raise exception 'Account type is already set.' using errcode = 'P0001';
    end if;
    raise exception 'Account not found.' using errcode = 'P0002';
  end if;

  return p_type;
end;
$$;

-- For RLS policies and other functions: is the caller a business account?
create or replace function public.is_business()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.accounts
    where id = auth.uid() and account_type = 'business'
  );
$$;

revoke execute on function public.set_account_type(text) from public, anon;
revoke execute on function public.is_business() from public, anon;
grant execute on function public.set_account_type(text) to authenticated;
grant execute on function public.is_business() to authenticated;

commit;