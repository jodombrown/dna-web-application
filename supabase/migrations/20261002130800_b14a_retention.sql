-- Brief 14 Messenger, handoff 41-A, file 9 of 9: retention (ruling 1352). The tree keeps no tombstone
-- member row and no account-deletion function: public.members is deleted by the auth.users cascade,
-- and that cascade is the whole path. So a before-delete trigger on public.members stamps
-- author_deleted_at on the member's messages before the key sets author_id null, the projections
-- read "a former member" where it is set (file 6), and a daily pg_cron job purges those messages 30
-- days on, their reactions, mentions and reports by cascade and their media rows marked for the
-- route that removes the R2 object (41-B).
--
-- The stamp is a trigger because no write path exists to carry it (1002 governs a derived row its
-- source's write path can write; here the source is deleted by a foreign-key cascade from auth.users
-- that no function in the tree owns). Committed before it is applied (225); applied by Chat through
-- execute_sql (963, 965), never apply_migration (553, 269).

create function private.messages_mark_former_member()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  update public.messages
  set author_deleted_at = now()
  where author_id = old.id and author_deleted_at is null;
  return old;
end;
$$;
revoke execute on function private.messages_mark_former_member() from public, anon, authenticated;
create trigger on_member_delete_mark_messages
  before delete on public.members
  for each row execute function private.messages_mark_former_member();
comment on function private.messages_mark_former_member() is
  'Stamps author_deleted_at on a deleted member''s messages before the cascade reaches them (Brief 14, ruling 1352), so the projections render "a former member" and the daily purge finds them.';

-- The purge: messages of former members past 30 days, their media rows marked first.
create function private.messenger_purge_former_members()
returns integer
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_n integer;
begin
  update public.media md
  set delete_requested_at = now()
  from public.messages m
  where m.media_id = md.id
    and md.delete_requested_at is null
    and m.author_deleted_at is not null
    and m.author_deleted_at < now() - interval '30 days';
  with gone as (
    delete from public.messages m
    where m.author_deleted_at is not null
      and m.author_deleted_at < now() - interval '30 days'
    returning m.id
  )
  select count(*) into v_n from gone;
  return v_n;
end;
$$;
revoke execute on function private.messenger_purge_former_members() from public, anon, authenticated;
comment on function private.messenger_purge_former_members() is
  'Deletes a former member''s messages 30 days after their account went (Brief 14, ruling 1352), reactions, mentions and reports by cascade, media rows marked for the R2 removal route (41-B). Run daily by dna_messenger_former_member_purge_daily; returns the number removed.';

-- The job (1352). Unscheduled by name first so the file can be re-run on a reset without doubling
-- it; nothing is swallowed, because a schedule that silently failed to land is a purge that silently
-- never runs (the 20261002120000 pattern).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.unschedule(jobid) from cron.job
    where jobname = 'dna_messenger_former_member_purge_daily';
    perform cron.schedule(
      'dna_messenger_former_member_purge_daily',
      '50 3 * * *',
      'select private.messenger_purge_former_members()');
  end if;
end;
$$;
