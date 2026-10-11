DROP FUNCTION IF EXISTS public.search_hotels(text, text, text, date, date, integer, numeric, numeric, text, integer, integer);

CREATE OR REPLACE FUNCTION public.search_hotels(p_query text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_region text DEFAULT NULL::text, p_country text DEFAULT NULL::text, p_check_in date DEFAULT NULL::date, p_check_out date DEFAULT NULL::date, p_guests integer DEFAULT NULL::integer, p_min_price numeric DEFAULT NULL::numeric, p_max_price numeric DEFAULT NULL::numeric, p_min_rating numeric DEFAULT NULL::numeric, p_num_beds integer DEFAULT NULL::integer, p_bed_size text DEFAULT NULL::text, p_tags text[] DEFAULT NULL::text[], p_sort text DEFAULT 'recommended'::text, p_limit integer DEFAULT 21, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, description text, address text, city text, region text, country text, photo_urls text[], min_price numeric, max_capacity bigint, available_rooms bigint, total_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with matching_rooms as (
    select rm.hotel_id, rm.price_per_night, rm.capacity
    from public.rooms rm
    join public.hotels h on h.id = rm.hotel_id
    where (p_guests is null    or rm.capacity >= p_guests)
      and (p_min_price is null or rm.price_per_night >= p_min_price)
      and (p_max_price is null or rm.price_per_night <= p_max_price)
      and (p_num_beds is null  or rm.num_beds >= p_num_beds)
      and (p_bed_size is null  or rm.bed_size = p_bed_size)
      -- every requested tag must be on the hotel or on the room
      and (p_tags is null or p_tags <@ (h.tags || rm.tags))
      and (p_check_in is null or p_check_out is null or not exists (
            select 1 from public.reservations res
            where res.room_id = rm.id
              and res.status = 'confirmed'
              and res.check_in  < p_check_out
              and res.check_out > p_check_in))
  ),
  per_hotel as (
    select hotel_id,
           min(price_per_night) as min_price,
           max(capacity)        as max_capacity,
           count(*)             as available_rooms
    from matching_rooms
    group by hotel_id
  )
  select h.id, h.name, h.description, h.address, h.city, h.region, h.country,
         h.photo_urls, ph.min_price, ph.max_capacity, ph.available_rooms,
         count(*) over () as total_count
  from public.hotels h
  join per_hotel ph on ph.hotel_id = h.id
  where (p_query is null
         or h.name        ilike '%' || p_query || '%'
         or h.city        ilike '%' || p_query || '%'
         or h.region      ilike '%' || p_query || '%'
         or h.description ilike '%' || p_query || '%')
    and (p_city is null       or h.city    ilike p_city)
    and (p_region is null     or h.region  ilike p_region)
    and (p_country is null    or h.country ilike p_country)
    and (p_min_rating is null or h.rating >= p_min_rating)
  order by
    case when p_sort = 'price-low'  then ph.min_price end asc,
    case when p_sort = 'price-high' then ph.min_price end desc,
    h.created_at desc
  limit least(p_limit, 100) offset p_offset;
$function$
