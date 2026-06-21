-- 02_team_members.sql
-- Upgrade your existing local team_members table into registered-user invites.
-- Run after 01_users.sql.

alter table public.team_members
  add column if not exists owner_id uuid,
  add column if not exists member_user_id uuid,
  add column if not exists email text,
  add column if not exists role text not null default 'member',
  add column if not exists status text not null default 'active',
  add column if not exists invited_at timestamptz not null default now();

alter table public.team_members
  alter column name drop not null;

update public.team_members tm
set
  owner_id = coalesce(tm.owner_id, tm.user_id),
  member_user_id = coalesce(tm.member_user_id, tm.user_id),
  email = coalesce(tm.email, u.email, tm.id::text || '@legacy.local'),
  name = coalesce(tm.name, u.full_name, u.email),
  role = coalesce(tm.role, 'member'),
  status = coalesce(tm.status, 'active')
from public.users u
where u.id = coalesce(tm.member_user_id, tm.user_id);

update public.team_members tm
set
  owner_id = coalesce(tm.owner_id, tm.user_id),
  member_user_id = coalesce(tm.member_user_id, tm.user_id),
  email = coalesce(tm.email, tm.id::text || '@legacy.local'),
  role = coalesce(tm.role, 'member'),
  status = coalesce(tm.status, 'active')
where tm.owner_id is null
   or tm.member_user_id is null
   or tm.email is null;

alter table public.team_members
  alter column owner_id set not null,
  alter column member_user_id set not null,
  alter column email set not null;

alter table public.team_members
  drop constraint if exists team_members_role_check,
  add constraint team_members_role_check check (role in ('admin', 'member'));

alter table public.team_members
  drop constraint if exists team_members_status_check,
  add constraint team_members_status_check check (status in ('active', 'invited'));

alter table public.team_members
  drop constraint if exists team_members_member_user_id_fkey,
  add constraint team_members_member_user_id_fkey
    foreign key (member_user_id) references public.users(id) on delete cascade;

with duplicate_members as (
  select
    id,
    row_number() over (
      partition by owner_id, member_user_id
      order by created_at asc, id asc
    ) as duplicate_rank
  from public.team_members
)
delete from public.team_members tm
using duplicate_members dm
where tm.id = dm.id
  and dm.duplicate_rank > 1;

create unique index if not exists team_members_owner_member_unique
on public.team_members(owner_id, member_user_id);

drop policy if exists "Users can view their own team members" on public.team_members;
drop policy if exists "Users can insert their own team members" on public.team_members;
drop policy if exists "Users can update their own team members" on public.team_members;
drop policy if exists "Users can delete their own team members" on public.team_members;
drop policy if exists "Workspace owners and members can view team" on public.team_members;
drop policy if exists "Workspace owners can invite registered members" on public.team_members;
drop policy if exists "Workspace owners can update members" on public.team_members;
drop policy if exists "Workspace owners can remove members" on public.team_members;

create policy "Workspace owners and members can view team"
on public.team_members
for select
to authenticated
using (auth.uid() = owner_id or auth.uid() = member_user_id);

create policy "Workspace owners can invite registered members"
on public.team_members
for insert
to authenticated
with check (
  auth.uid() = owner_id
  and exists (
    select 1
    from public.users u
    where u.id = member_user_id
      and lower(u.email) = lower(team_members.email)
  )
);

create policy "Workspace owners can update members"
on public.team_members
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Workspace owners can remove members"
on public.team_members
for delete
to authenticated
using (auth.uid() = owner_id);
