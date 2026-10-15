-- Hotels imported from LiteAPI (Nuitee Connect). Owner-created listings leave all of these NULL.
begin;

alter table public.hotels
  add column if not exists liteapi_id text unique,          -- e.g. 'lp1897'; creates constraint hotels_liteapi_id_key (NULLs never collide)
  add column if not exists latitude  double precision,
  add column if not exists longitude double precision;

-- Listings are written with the owner's own session, so an owner could otherwise set liteapi_id, and the
-- import's upsert would then merge a LiteAPI hotel into their row and leave them as its owner.
alter table public.hotels drop constraint if exists hotels_liteapi_unowned;
alter table public.hotels add constraint hotels_liteapi_unowned check (liteapi_id is null or owner_id is null);

-- max_adults / max_children: the room type's own limits. NULL (owner rooms, and LiteAPI rooms listed as 0/0) means
-- only capacity applies.
alter table public.rooms
  add column if not exists liteapi_room_id text,            -- GET /data/hotel rooms[].id (integer, stored as text) = rates mappedRoomId
  add column if not exists max_adults   integer check (max_adults is null or max_adults >= 1),
  add column if not exists max_children integer check (max_children is null or max_children >= 0);

-- One row per LiteAPI room type per hotel, and the upsert target (on_conflict=hotel_id,liteapi_room_id).
-- Owner rooms have NULL here and are unaffected.
create unique index if not exists rooms_hotel_liteapi_room_key
  on public.rooms (hotel_id, liteapi_room_id);

commit;
