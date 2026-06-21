-- 13_board_write_policies.sql
-- Restores/keeps board creation and owner-only board management policies.
-- Run after 10_board_roles.sql.

drop policy if exists "Users can insert their own boards" on public.boards;
drop policy if exists "Users can update their own boards" on public.boards;
drop policy if exists "Users can delete their own boards" on public.boards;

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
