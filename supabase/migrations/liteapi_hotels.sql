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

alter table public.rooms
  add column if not exists liteapi_room_id text;            -- GET /data/hotel rooms[].id (integer, stored as text) = rates mappedRoomId

-- One row per LiteAPI room type per hotel, and the upsert target (on_conflict=hotel_id,liteapi_room_id).
-- Owner rooms have NULL here and are unaffected.
create unique index if not exists rooms_hotel_liteapi_room_key
  on public.rooms (hotel_id, liteapi_room_id);

commit;
