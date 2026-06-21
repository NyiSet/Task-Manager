-- 03_task_assignees.sql
-- Assignment join table policies for owner-managed task assignments.
-- Run after 02_team_members.sql.

alter table public.task_assignees enable row level security;

drop policy if exists "Users can view their own task assignees" on public.task_assignees;
drop policy if exists "Users can insert their own task assignees" on public.task_assignees;
drop policy if exists "Users can update their own task assignees" on public.task_assignees;
drop policy if exists "Users can delete their own task assignees" on public.task_assignees;
drop policy if exists "Owners and assigned members can view task assignees" on public.task_assignees;
drop policy if exists "Task owners can insert task assignees" on public.task_assignees;
drop policy if exists "Task owners can update task assignees" on public.task_assignees;
drop policy if exists "Task owners can delete task assignees" on public.task_assignees;

create policy "Owners and assigned members can view task assignees"
on public.task_assignees
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.team_members tm
    where tm.id = task_assignees.team_member_id
      and tm.member_user_id = auth.uid()
  )
);

create policy "Task owners can insert task assignees"
on public.task_assignees
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.tasks t
    where t.id = task_assignees.task_id
      and t.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.team_members tm
    where tm.id = task_assignees.team_member_id
      and tm.owner_id = auth.uid()
  )
);

create policy "Task owners can update task assignees"
on public.task_assignees
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Task owners can delete task assignees"
on public.task_assignees
for delete
to authenticated
using (auth.uid() = user_id);
