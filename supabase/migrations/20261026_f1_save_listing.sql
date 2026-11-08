-- Audit F1 / R3: saving a listing deleted all of its rooms and inserted new ones. reservations.room_id
-- is ON DELETE CASCADE, so every save silently deleted every booking at the property. The hotel
-- details were also written in a separate call first, so a failed room save left a half-saved listing.
--
-- save_listing saves the hotel details and the editor's room changes in ONE transaction: either
-- everything is saved or nothing is.
--   * p_hotel_id null creates the hotel (owned by the caller) and returns its id; otherwise the
--     caller must own it,
--   * update: existing rooms keep their ids (and bookings); only the editor's fields change,
--     so tags and adult/child limits set elsewhere are kept,
--   * remove: removes `count` of the given rooms, picking ones that have never been booked.
--     A room with any booking (past, upcoming or cancelled) is never deleted; if there aren't
--     enough unbooked rooms the whole save fails with a message,
--   * insert: new rooms.
-- The room plan is built in lib/listing-rooms.ts (planRoomChanges). SECURITY DEFINER because the
-- owner can't read other guests' reservations; it checks who the caller is first.

begin;

create or replace function public.save_listing(p_hotel_id uuid, p_hotel jsonb, p_changes jsonb)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_hotel_id uuid := p_hotel_id;
  v_item jsonb;
  v_ids uuid[];
  v_count integer;
  v_free uuid[];
  v_booked integer;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.' using errcode = '42501';
  end if;

  -- 1. The hotel's own details
  if v_hotel_id is null then
    insert into public.hotels (owner_id, name, description, address, city, region, country,
                               property_type, postal_code, tags, photo_urls)
    values (
      auth.uid(),
      p_hotel ->> 'name',
      p_hotel ->> 'description',
      p_hotel ->> 'address',
      p_hotel ->> 'city',
      p_hotel ->> 'region',
      p_hotel ->> 'country',
      coalesce(p_hotel ->> 'property_type', 'hotel'),
      p_hotel ->> 'postal_code',
      coalesce(array(select jsonb_array_elements_text(p_hotel -> 'tags')), '{}'),
      coalesce(array(select jsonb_array_elements_text(p_hotel -> 'photo_urls')), '{}')
    )
    returning id into v_hotel_id;
  else
    perform 1 from public.hotels
    where id = v_hotel_id and owner_id = auth.uid()
    for update;
    if not found then
      raise exception 'Listing not found' using errcode = 'P0002';
    end if;

    update public.hotels
    set name = p_hotel ->> 'name',
        description = p_hotel ->> 'description',
        address = p_hotel ->> 'address',
        city = p_hotel ->> 'city',
        region = p_hotel ->> 'region',
        country = p_hotel ->> 'country',
        property_type = coalesce(p_hotel ->> 'property_type', 'hotel'),
        postal_code = p_hotel ->> 'postal_code',
        tags = coalesce(array(select jsonb_array_elements_text(p_hotel -> 'tags')), '{}'),
        photo_urls = coalesce(array(select jsonb_array_elements_text(p_hotel -> 'photo_urls')), '{}')
    where id = v_hotel_id;
  end if;

  -- 2. Room removals, only ever of rooms without bookings
  for v_item in select * from jsonb_array_elements(coalesce(p_changes -> 'remove', '[]'::jsonb)) loop
    select coalesce(array_agg(x::uuid), '{}') into v_ids
    from jsonb_array_elements_text(v_item -> 'ids') as x;
    v_count := (v_item ->> 'count')::integer;
    if v_count is null or v_count < 1 then
      continue;
    end if;

    -- Lock the rooms so a booking can't land on one between the check and the delete
    perform 1 from public.rooms
    where hotel_id = v_hotel_id and id = any(v_ids)
    for update;

    select coalesce(array_agg(id), '{}') into v_free
    from (
      select rm.id
      from public.rooms rm
      where rm.hotel_id = v_hotel_id
        and rm.id = any(v_ids)
        and not exists (select 1 from public.reservations r where r.room_id = rm.id)
      order by rm.created_at desc, rm.id
      limit v_count
    ) unbooked;

    if cardinality(v_free) < v_count then
      select count(*) into v_booked
      from public.rooms rm
      where rm.hotel_id = v_hotel_id
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

  -- 3. Room updates, in place
  for v_item in select * from jsonb_array_elements(coalesce(p_changes -> 'update', '[]'::jsonb)) loop
    select coalesce(array_agg(x::uuid), '{}') into v_ids
    from jsonb_array_elements_text(v_item -> 'ids') as x;

    update public.rooms
    set room_type = v_item ->> 'room_type',
        price_per_night = (v_item ->> 'price_per_night')::numeric,
        capacity = (v_item ->> 'capacity')::bigint,
        num_beds = (v_item ->> 'num_beds')::integer,
        bed_size = nullif(v_item ->> 'bed_size', '')
    where hotel_id = v_hotel_id
      and id = any(v_ids);
  end loop;

  -- 4. New rooms
  insert into public.rooms (hotel_id, room_type, price_per_night, capacity, num_beds, bed_size, tags)
  select v_hotel_id,
         item ->> 'room_type',
         (item ->> 'price_per_night')::numeric,
         (item ->> 'capacity')::bigint,
         (item ->> 'num_beds')::integer,
         nullif(item ->> 'bed_size', ''),
         '{}'
  from jsonb_array_elements(coalesce(p_changes -> 'insert', '[]'::jsonb)) as item;

  return v_hotel_id;
end;
$$;

revoke execute on function public.save_listing(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_listing(uuid, jsonb, jsonb) to authenticated;

commit;
