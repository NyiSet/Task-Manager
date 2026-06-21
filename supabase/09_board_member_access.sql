-- 09_board_member_access.sql
-- Lets accepted board members see boards they were invited to.
-- Run after 08_board_scoped_members.sql.

drop policy if exists "Users can view their own boards" on public.boards;
drop policy if exists "Owners and board members can view boards" on public.boards;

create policy "Owners and board members can view boards"
on public.boards
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.team_members tm
    where tm.board_id = boards.id
      and tm.member_user_id = auth.uid()
      and tm.status = 'active'
  )
);
