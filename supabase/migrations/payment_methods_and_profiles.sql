-- 1. Create Profiles Table (for phone number and billing address)
create table if not exists public.profiles (
                                               id uuid references auth.users on delete cascade primary key,
                                               phone text,
                                               street text,
                                               city text,
                                               state text,
                                               zip text,
                                               updated_at timestamp with time zone default timezone('utc'::text, now())
    );

-- Enable RLS for profiles
alter table public.profiles enable row level security;

-- Profiles RLS Policies
create policy "Users can view their own profile"
  on public.profiles for select
                                    to authenticated
                                    using (auth.uid() = id);

create policy "Users can insert/update their own profile"
  on public.profiles for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2. Create Payment Methods Table
create table if not exists public.payment_methods (
                                                      id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users on delete cascade not null,
    brand text not null,
    last4 text not null,
    exp_month text not null,
    exp_year text not null,
    is_default boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now())
    );

-- Enable RLS for payment methods
alter table public.payment_methods enable row level security;

-- Payment Methods RLS Policies
create policy "Users can view their own payment methods"
  on public.payment_methods for select
                                           to authenticated
                                           using (auth.uid() = user_id);

create policy "Users can insert their own payment methods"
  on public.payment_methods for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own payment methods"
  on public.payment_methods for update
                                                  to authenticated
                                                  using (auth.uid() = user_id)
                                with check (auth.uid() = user_id);

create policy "Users can delete their own payment methods"
  on public.payment_methods for delete
to authenticated
  using (auth.uid() = user_id);