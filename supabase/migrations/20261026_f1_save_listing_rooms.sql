-- Audit F1: saving a listing deleted all of its rooms and inserted new ones. reservations.room_id
-- is ON DELETE CASCADE, so every save silently deleted every booking at the property.
--
-- save_listing_rooms applies the editor's changes in place, in one transaction:
--   * update: existing rooms keep their ids (and bookings); only the editor's fields change,
--     so tags and adult/child limits set elsewhere are kept,
--   * remove: removes `count` of the given rooms, picking ones that have never been booked.
--     A room with any booking (past, upcoming or cancelled) is never deleted; if there aren't
--     enough unbooked rooms the whole save fails with a message,
--   * insert: new rooms.
-- The plan is built in lib/listing-rooms.ts (planRoomChanges). SECURITY DEFINER because the owner
-- can't read other guests' reservations; it checks the caller owns the hotel first.

begin;

create or replace function public.save_listing_rooms(p_hotel_id uuid, p_changes jsonb)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_item jsonb;
  v_ids uuid[];
  v_count integer;
  v_free uuid[];
  v_booked integer;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.' using errcode = '42501';
  end if;

  perform 1 from public.hotels
  where id = p_hotel_id and owner_id = auth.uid()
  for update;
  if not found then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;

  -- 1. Removals, only ever of rooms without bookings
  for v_item in select * from jsonb_array_elements(coalesce(p_changes -> 'remove', '[]'::jsonb)) loop
    select coalesce(array_agg(x::uuid), '{}') into v_ids
    from jsonb_array_elements_text(v_item -> 'ids') as x;
    v_count := (v_item ->> 'count')::integer;
    if v_count is null or v_count < 1 then
      continue;
    end if;

    -- Lock the rooms so a booking can't land on one between the check and the delete
    perform 1 from public.rooms
    where hotel_id = p_hotel_id and id = any(v_ids)
    for update;

    select coalesce(array_agg(id), '{}') into v_free
    from (
      select rm.id
      from public.rooms rm
      where rm.hotel_id = p_hotel_id
        and rm.id = any(v_ids)
        and not exists (select 1 from public.reservations r where r.room_id = rm.id)
      order by rm.created_at desc, rm.id
      limit v_count
    ) unbooked;

    if cardinality(v_free) < v_count then
      select count(*) into v_booked
      from public.rooms rm
      where rm.hotel_id = p_hotel_id
        and rm.id = any(v_ids)
        and exists (select 1 from public.reservations r where r.room_id = rm.id);
      raise exception '% "%" room% booked, so keep at least %.',
        v_booked, coalesce(v_item ->> 'room_type', 'These'),
        case when v_booked = 1 then ' is' else 's are' end,
        v_booked
        using errcode = 'P0001';
    end if;

    delete from public.rooms where id = any(v_free);
  end loop;

  -- 2. Updates, in place
  for v_item in select * from jsonb_array_elements(coalesce(p_changes -> 'update', '[]'::jsonb)) loop
    select coalesce(array_agg(x::uuid), '{}') into v_ids
    from jsonb_array_elements_text(v_item -> 'ids') as x;

    update public.rooms
    set room_type = v_item ->> 'room_type',
        price_per_night = (v_item ->> 'price_per_night')::numeric,
        capacity = (v_item ->> 'capacity')::bigint,
        num_beds = (v_item ->> 'num_beds')::integer,
        bed_size = nullif(v_item ->> 'bed_size', '')
    where hotel_id = p_hotel_id
      and id = any(v_ids);
  end loop;

  -- 3. New rooms
  insert into public.rooms (hotel_id, room_type, price_per_night, capacity, num_beds, bed_size, tags)
  select p_hotel_id,
         item ->> 'room_type',
         (item ->> 'price_per_night')::numeric,
         (item ->> 'capacity')::bigint,
         (item ->> 'num_beds')::integer,
         nullif(item ->> 'bed_size', ''),
         '{}'
  from jsonb_array_elements(coalesce(p_changes -> 'insert', '[]'::jsonb)) as item;
end;
$$;

revoke execute on function public.save_listing_rooms(uuid, jsonb) from public, anon;
grant execute on function public.save_listing_rooms(uuid, jsonb) to authenticated;

commit;
