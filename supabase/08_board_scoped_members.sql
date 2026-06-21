-- 08_board_scoped_members.sql
-- Makes team membership board-specific instead of workspace-wide.
-- Run after 07_invitations.sql.

alter table public.team_members
  add column if not exists board_id uuid;

alter table public.team_members
  drop constraint if exists team_members_board_id_fkey,
  add constraint team_members_board_id_fkey
    foreign key (board_id) references public.boards(id) on delete cascade;

update public.team_members tm
set board_id = (
  select b.id
  from public.boards b
  where b.user_id = tm.owner_id
  order by b.created_at asc
  limit 1
)
where tm.board_id is null
  and exists (
    select 1
    from public.boards b
    where b.user_id = tm.owner_id
  );

drop index if exists public.team_members_owner_member_unique;

create unique index if not exists team_members_owner_board_member_unique
on public.team_members(owner_id, board_id, member_user_id)
where board_id is not null;

create index if not exists team_members_board_id_idx
on public.team_members(board_id);

drop policy if exists "Workspace owners can invite registered members" on public.team_members;
drop policy if exists "Workspace owners can update members" on public.team_members;
drop policy if exists "Workspace owners can remove members" on public.team_members;

create policy "Workspace owners can invite registered members"
on public.team_members
for insert
to authenticated
with check (
  auth.uid() = owner_id
  and board_id is not null
  and exists (
    select 1
    from public.boards b
    where b.id = team_members.board_id
      and b.user_id = auth.uid()
  )
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
with check (
  auth.uid() = owner_id
  and (
    board_id is null
    or exists (
      select 1
      from public.boards b
      where b.id = team_members.board_id
        and b.user_id = auth.uid()
    )
  )
);

create policy "Workspace owners can remove members"
on public.team_members
for delete
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Task owners can insert task assignees" on public.task_assignees;

create policy "Task owners can insert task assignees"
on public.task_assignees
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.tasks t
    join public.team_members tm on tm.id = task_assignees.team_member_id
    where t.id = task_assignees.task_id
      and t.user_id = auth.uid()
      and tm.owner_id = auth.uid()
      and tm.status = 'active'
      and tm.board_id = t.board_id
  )
);
