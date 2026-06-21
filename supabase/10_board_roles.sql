-- 10_board_roles.sql
-- Enforces board roles:
-- - owners and admins can manage board tasks and board members
-- - regular members can view the board and tasks
-- Run after 09_board_member_access.sql.

create or replace function public.is_board_owner(target_board_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.boards b
    where b.id = target_board_id
      and b.user_id = auth.uid()
  );
$$;

create or replace function public.is_board_admin(target_board_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.board_id = target_board_id
      and tm.member_user_id = auth.uid()
      and tm.status = 'active'
      and tm.role = 'admin'
  );
$$;

create or replace function public.is_board_member(target_board_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_board_owner(target_board_id)
    or exists (
      select 1
      from public.team_members tm
      where tm.board_id = target_board_id
        and tm.member_user_id = auth.uid()
        and tm.status = 'active'
    );
$$;

create or replace function public.can_manage_board(target_board_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_board_owner(target_board_id)
    or public.is_board_admin(target_board_id);
$$;

revoke all on function public.is_board_owner(uuid) from public;
revoke all on function public.is_board_admin(uuid) from public;
revoke all on function public.is_board_member(uuid) from public;
revoke all on function public.can_manage_board(uuid) from public;

grant execute on function public.is_board_owner(uuid) to authenticated;
grant execute on function public.is_board_admin(uuid) to authenticated;
grant execute on function public.is_board_member(uuid) to authenticated;
grant execute on function public.can_manage_board(uuid) to authenticated;

drop policy if exists "Owners and board members can view boards" on public.boards;

create policy "Owners and board members can view boards"
on public.boards
for select
to authenticated
using (public.is_board_member(id));

drop policy if exists "Workspace owners and members can view team" on public.team_members;
drop policy if exists "Workspace owners can invite registered members" on public.team_members;
drop policy if exists "Workspace owners can update members" on public.team_members;
drop policy if exists "Workspace owners can remove members" on public.team_members;
drop policy if exists "Board members can view team" on public.team_members;
drop policy if exists "Board managers can invite registered members" on public.team_members;
drop policy if exists "Board managers can update members" on public.team_members;
drop policy if exists "Board managers can remove members" on public.team_members;

create policy "Board members can view team"
on public.team_members
for select
to authenticated
using (
  public.is_board_member(board_id)
  or auth.uid() = owner_id
  or auth.uid() = member_user_id
);

create policy "Board managers can invite registered members"
on public.team_members
for insert
to authenticated
with check (
  public.can_manage_board(board_id)
  and owner_id = (
    select b.user_id
    from public.boards b
    where b.id = team_members.board_id
  )
  and exists (
    select 1
    from public.users u
    where u.id = member_user_id
      and lower(u.email) = lower(team_members.email)
  )
);

create policy "Board managers can update members"
on public.team_members
for update
to authenticated
using (public.can_manage_board(board_id))
with check (
  public.can_manage_board(board_id)
  and owner_id = (
    select b.user_id
    from public.boards b
    where b.id = team_members.board_id
  )
);

create policy "Board managers can remove members"
on public.team_members
for delete
to authenticated
using (public.can_manage_board(board_id));

drop policy if exists "Owners and assignees can view tasks" on public.tasks;
drop policy if exists "Task owners can insert tasks" on public.tasks;
drop policy if exists "Task owners can update tasks" on public.tasks;
drop policy if exists "Task owners can delete tasks" on public.tasks;
drop policy if exists "Board members can view tasks" on public.tasks;
drop policy if exists "Board managers can insert tasks" on public.tasks;
drop policy if exists "Board managers can update tasks" on public.tasks;
drop policy if exists "Board managers can delete tasks" on public.tasks;

create policy "Board members can view tasks"
on public.tasks
for select
to authenticated
using (
  public.is_board_member(board_id)
  or auth.uid() = user_id
);

create policy "Board managers can insert tasks"
on public.tasks
for insert
to authenticated
with check (
  public.can_manage_board(board_id)
  and user_id = (
    select b.user_id
    from public.boards b
    where b.id = tasks.board_id
  )
);

create policy "Board managers can update tasks"
on public.tasks
for update
to authenticated
using (public.can_manage_board(board_id))
with check (
  public.can_manage_board(board_id)
  and user_id = (
    select b.user_id
    from public.boards b
    where b.id = tasks.board_id
  )
);

create policy "Board managers can delete tasks"
on public.tasks
for delete
to authenticated
using (public.can_manage_board(board_id));

drop policy if exists "Owners and assigned members can view task assignees" on public.task_assignees;
drop policy if exists "Task owners can insert task assignees" on public.task_assignees;
drop policy if exists "Task owners can update task assignees" on public.task_assignees;
drop policy if exists "Task owners can delete task assignees" on public.task_assignees;
drop policy if exists "Board members can view task assignees" on public.task_assignees;
drop policy if exists "Board managers can insert task assignees" on public.task_assignees;
drop policy if exists "Board managers can update task assignees" on public.task_assignees;
drop policy if exists "Board managers can delete task assignees" on public.task_assignees;

create policy "Board members can view task assignees"
on public.task_assignees
for select
to authenticated
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_assignees.task_id
      and public.is_board_member(t.board_id)
  )
);

create policy "Board managers can insert task assignees"
on public.task_assignees
for insert
to authenticated
with check (
  exists (
    select 1
    from public.tasks t
    join public.team_members tm on tm.id = task_assignees.team_member_id
    where t.id = task_assignees.task_id
      and public.can_manage_board(t.board_id)
      and tm.status = 'active'
      and tm.board_id = t.board_id
      and task_assignees.user_id = t.user_id
  )
);

create policy "Board managers can update task assignees"
on public.task_assignees
for update
to authenticated
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_assignees.task_id
      and public.can_manage_board(t.board_id)
  )
)
with check (
  exists (
    select 1
    from public.tasks t
    join public.team_members tm on tm.id = task_assignees.team_member_id
    where t.id = task_assignees.task_id
      and public.can_manage_board(t.board_id)
      and tm.status = 'active'
      and tm.board_id = t.board_id
      and task_assignees.user_id = t.user_id
  )
);

create policy "Board managers can delete task assignees"
on public.task_assignees
for delete
to authenticated
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_assignees.task_id
      and public.can_manage_board(t.board_id)
  )
);
