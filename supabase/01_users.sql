-- 01_users.sql
-- App-facing user profiles for registered Supabase Auth users.
-- Supabase Auth still owns passwords/sessions in auth.users.

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "Authenticated users can find registered users" on public.users;
create policy "Authenticated users can find registered users"
on public.users
for select
to authenticated
using (true);

drop policy if exists "Users can update their own user record" on public.users;
create policy "Users can update their own user record"
on public.users
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@anonymous.local'),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.users.full_name, excluded.full_name),
    avatar_url = coalesce(public.users.avatar_url, excluded.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.users (id, email, full_name, avatar_url)
select
  id,
  coalesce(email, id::text || '@anonymous.local'),
  nullif(raw_user_meta_data ->> 'full_name', ''),
  nullif(raw_user_meta_data ->> 'avatar_url', '')
from auth.users
on conflict (id) do update
set
  email = excluded.email,
  full_name = coalesce(public.users.full_name, excluded.full_name),
  avatar_url = coalesce(public.users.avatar_url, excluded.avatar_url),
  updated_at = now();
