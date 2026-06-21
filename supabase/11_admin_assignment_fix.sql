-- 11_admin_assignment_fix.sql
-- Keeps assignments board-scoped while allowing board admins to save them.
-- Run after 10_board_roles.sql.

drop policy if exists "Board managers can insert task assignees" on public.task_assignees;
drop policy if exists "Board managers can update task assignees" on public.task_assignees;
drop policy if exists "Board managers can delete task assignees" on public.task_assignees;

create policy "Board managers can insert task assignees"
on public.task_assignees
for insert
to authenticated
with check (
  exists (
    select 1
    from public.tasks t
    where t.id = task_assignees.task_id
      and public.can_manage_board(t.board_id)
      and task_assignees.user_id = t.user_id
      and exists (
        select 1
        from public.team_members tm
        where tm.id = task_assignees.team_member_id
          and tm.status = 'active'
          and tm.board_id = t.board_id
      )
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
    where t.id = task_assignees.task_id
      and public.can_manage_board(t.board_id)
      and task_assignees.user_id = t.user_id
      and exists (
        select 1
        from public.team_members tm
        where tm.id = task_assignees.team_member_id
          and tm.status = 'active'
          and tm.board_id = t.board_id
      )
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
