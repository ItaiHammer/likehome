-- Audit follow-up to F13: users could rewrite their own reservations directly (Supabase REST API
-- with their own session), because the reservations INSERT/UPDATE policies only check
-- account_id. That let anyone:
--   * set has_insurance = true on an uninsured booking, then cancel for a full refund (as points),
--   * set a cancelled booking back to 'confirmed' after being refunded (keeps the room for free),
--   * write any total_price or hotel_id.
--
-- After: a trigger checks every direct write made by a signed-in (or anonymous) user.
--   * hotel_id and total_price always come from the room (nights x nightly price),
--   * new bookings start 'confirmed', uninsured and not cancelled,
--   * has_insurance, account_id, cancelled_at and cancellation_fee can't be changed,
--   * the only status change allowed is confirmed -> cancelled (no refund on that path;
--     refunds only go through cancel_reservation),
--   * cancelled bookings can't be changed at all.
-- SECURITY DEFINER functions (cancel_reservation from the F13 migration, and checkout_reservation /
-- edit_reservation if they're merged) run as their owner, not as 'authenticated', so they're
-- unaffected and stay the place where insurance and refunds are decided.
--
-- Apply after 20261025_f13_lock_down_transactions.sql: before it, cancel_reservation runs as the
-- user and would be stopped by this trigger.

begin;

create or replace function public.guard_reservation_write()
returns trigger
language plpgsql
set search_path to ''
as $$
declare
  v_room record;
begin
  -- Only direct writes from app users are restricted
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'confirmed' then
      raise exception 'New bookings start as confirmed.' using errcode = '42501';
    end if;
    if new.has_insurance then
      raise exception 'Cancellation insurance can only be added at checkout.' using errcode = '42501';
    end if;
    if new.cancelled_at is not null or new.cancellation_fee is not null then
      raise exception 'New bookings can''t be cancelled.' using errcode = '42501';
    end if;
  else
    if old.status is distinct from 'confirmed' then
      raise exception 'Only confirmed reservations can be changed.' using errcode = '42501';
    end if;
    if new.account_id is distinct from old.account_id
       or new.has_insurance is distinct from old.has_insurance
       or new.created_at is distinct from old.created_at
       or new.cancelled_at is distinct from old.cancelled_at
       or new.cancellation_fee is distinct from old.cancellation_fee then
      raise exception 'Those booking details can''t be changed.' using errcode = '42501';
    end if;

    if new.status is distinct from old.status then
      if new.status is distinct from 'cancelled' then
        raise exception 'A booking can only be changed to cancelled.' using errcode = '42501';
      end if;
      -- Cancelling directly (checkout's undo for an unpaid booking) changes nothing else
      if (new.room_id, new.hotel_id, new.check_in, new.check_out, new.guests, new.children, new.total_price)
         is distinct from (old.room_id, old.hotel_id, old.check_in, old.check_out, old.guests, old.children, old.total_price) then
        raise exception 'Cancel a booking without changing it.' using errcode = '42501';
      end if;
      new.cancelled_at := now();
      return new;
    end if;

    -- Same room and dates: the price stays what was paid
    if new.room_id is not distinct from old.room_id
       and new.check_in is not distinct from old.check_in
       and new.check_out is not distinct from old.check_out then
      new.hotel_id := old.hotel_id;
      new.total_price := old.total_price;
      return new;
    end if;
  end if;

  -- Price and hotel come from the room, never from the client
  select rm.hotel_id, rm.price_per_night into v_room
  from public.rooms rm
  where rm.id = new.room_id;
  if not found then
    raise exception 'Room not found' using errcode = 'P0002';
  end if;

  new.hotel_id := v_room.hotel_id;
  new.total_price := round(
    v_room.price_per_night
      * ((new.check_out at time zone 'UTC')::date - (new.check_in at time zone 'UTC')::date),
    2
  );
  return new;
end;
$$;

drop trigger if exists reservations_guard_write on public.reservations;
create trigger reservations_guard_write
before insert or update on public.reservations
for each row execute function public.guard_reservation_write();

commit;
