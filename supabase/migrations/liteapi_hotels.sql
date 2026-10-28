-- Hotels imported from LiteAPI. Owner listings leave these columns NULL.
begin;

alter table public.hotels
  add column if not exists liteapi_id text unique,
  add column if not exists latitude  double precision,
  add column if not exists longitude double precision,
  add column if not exists liteapi_deleted_at timestamptz,
  add column if not exists liteapi_synced_at  timestamptz;

-- Otherwise an owner could set liteapi_id and the import would merge a LiteAPI hotel into their listing.
alter table public.hotels drop constraint if exists hotels_liteapi_unowned;
alter table public.hotels add constraint hotels_liteapi_unowned check (liteapi_id is null or owner_id is null);

-- NULL max_adults / max_children means no per-room limit (only capacity applies).
alter table public.rooms
  add column if not exists liteapi_room_id text,
  add column if not exists max_adults   integer check (max_adults is null or max_adults >= 1),
  add column if not exists max_children integer check (max_children is null or max_children >= 0);

create unique index if not exists rooms_hotel_liteapi_room_key
  on public.rooms (hotel_id, liteapi_room_id);

commit;
