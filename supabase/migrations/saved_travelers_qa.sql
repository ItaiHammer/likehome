alter table public.saved_travelers
  add column if not exists street text,
  add column if not exists city   text,
  add column if not exists state  text,
  add column if not exists zip    text;

alter table public.saved_travelers
  add constraint saved_travelers_street_len check (street is null or length(trim(street)) between 5 and 60),
  add constraint saved_travelers_city_not_blank check (city is null or length(trim(city)) > 0),
  add constraint saved_travelers_state_format check (state is null or state ~ '^[A-Z]{2}$'),
  add constraint saved_travelers_zip_format check (zip is null or zip ~ '^\d{5}$');