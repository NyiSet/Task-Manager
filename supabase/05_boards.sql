-- 05_boards.sql
-- Adds multiple boards and connects tasks to a selected board.
-- Run after 04_tasks.sql.

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.boards enable row level security;

drop policy if exists "Users can view their own boards" on public.boards;
drop policy if exists "Users can insert their own boards" on public.boards;
drop policy if exists "Users can update their own boards" on public.boards;
drop policy if exists "Users can delete their own boards" on public.boards;

create policy "Users can view their own boards"
on public.boards
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own boards"
on public.boards
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own boards"
on public.boards
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own boards"
on public.boards
for delete
to authenticated
using (auth.uid() = user_id);

alter table public.tasks
  add column if not exists board_id uuid;

insert into public.boards (name, description, user_id)
select 'Main board', 'Default board for existing tasks.', t.user_id
from public.tasks t
where t.board_id is null
group by t.user_id
on conflict do nothing;

update public.tasks t
set board_id = b.id
from public.boards b
where t.board_id is null
  and b.user_id = t.user_id
  and b.name = 'Main board';

alter table public.tasks
  drop constraint if exists tasks_board_id_fkey,
  add constraint tasks_board_id_fkey
    foreign key (board_id) references public.boards(id) on delete cascade;

create index if not exists tasks_board_id_idx on public.tasks(board_id);

drop policy if exists "Task owners can insert tasks" on public.tasks;
drop policy if exists "Task owners can update tasks" on public.tasks;

create policy "Task owners can insert tasks"
on public.tasks
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.boards b
    where b.id = tasks.board_id
      and b.user_id = auth.uid()
  )
);

create policy "Task owners can update tasks"
on public.tasks
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    tasks.board_id is null
    or exists (
      select 1
      from public.boards b
      where b.id = tasks.board_id
        and b.user_id = auth.uid()
    )
  )
);
