-- 04_tasks.sql
-- Task policies. Owners can manage tasks; assigned registered members can read them.
-- Run after 03_task_assignees.sql.

alter table public.tasks enable row level security;

alter table public.tasks
  drop constraint if exists fk_assignee;

alter table public.tasks
  add constraint fk_assignee
  foreign key (assignee_id)
  references public.team_members(id)
  on delete set null;

drop policy if exists "Users can view their own tasks" on public.tasks;
drop policy if exists "Users can insert their own tasks" on public.tasks;
drop policy if exists "Users can update their own tasks" on public.tasks;
drop policy if exists "Users can delete their own tasks" on public.tasks;
drop policy if exists "Owners and assignees can view tasks" on public.tasks;
drop policy if exists "Task owners can insert tasks" on public.tasks;
drop policy if exists "Task owners can update tasks" on public.tasks;
drop policy if exists "Task owners can delete tasks" on public.tasks;

create policy "Owners and assignees can view tasks"
on public.tasks
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.task_assignees ta
    join public.team_members tm on tm.id = ta.team_member_id
    where ta.task_id = tasks.id
      and tm.member_user_id = auth.uid()
  )
);

create policy "Task owners can insert tasks"
on public.tasks
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Task owners can update tasks"
on public.tasks
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Task owners can delete tasks"
on public.tasks
for delete
to authenticated
using (auth.uid() = user_id);
