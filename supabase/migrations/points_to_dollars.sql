-- Redemption rate: 100 points = $1, so a refund gives back the same value in points
create or replace function public.points_to_dollars(p_points integer) returns numeric
language sql immutable
set search_path = ''
as $$
  select round(p_points::numeric / 100.0, 2);
$$;