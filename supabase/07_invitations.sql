-- 07_invitations.sql
-- Allows invited registered users to accept or decline workspace invitations.
-- Run after 02_team_members.sql.

drop policy if exists "Invited members can accept invitations" on public.team_members;
drop policy if exists "Invited members can decline invitations" on public.team_members;

create policy "Invited members can accept invitations"
on public.team_members
for update
to authenticated
using (auth.uid() = member_user_id and status = 'invited')
with check (auth.uid() = member_user_id and status = 'active');

create policy "Invited members can decline invitations"
on public.team_members
for delete
to authenticated
using (auth.uid() = member_user_id and status = 'invited');
