-- hotels: star rating + property-level tags (property amenities, traveler types)
alter table public.hotels
  add column if not exists rating numeric(2,1)
    check (rating is null or rating between 0 and 5),
  add column if not exists tags text[] not null default '{}';

-- rooms: beds + room-level tags (room amenities)
alter table public.rooms
  add column if not exists num_beds integer not null default 1
    check (num_beds >= 1),
  add column if not exists bed_size text
    check (bed_size is null or bed_size in ('Twin', 'Twin XL', 'Double', 'Queen', 'King')),
  add column if not exists tags text[] not null default '{}';