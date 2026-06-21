-- 06_account_management.sql
-- Allows an authenticated user to permanently delete their own account.
-- Run after the earlier migrations. This deletes auth.users, which cascades
-- through public.users and any tables with auth-user foreign keys.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.task_assignees
  where user_id = current_user_id;

  delete from public.team_members
  where owner_id = current_user_id
     or member_user_id = current_user_id;

  delete from public.tasks
  where user_id = current_user_id;

  delete from public.boards
  where user_id = current_user_id;

  delete from public.users
  where id = current_user_id;

  delete from auth.users
  where id = current_user_id;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
