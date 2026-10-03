-- Brief 14 Messenger, handoff 41-D, Part A3 (ruling 1387; held item 6): the lead or a co-lead
-- renames a group. Event and Space threads take their anchor's name and are not renamed. The name
-- bound is thread_create_group's, 1 to 80 characters after trimming. 1387's system line is carried
-- to 41-E (1400): no renderer for kind 'system' exists yet, and message_send refuses that kind.
--
-- The rename is not broadcast: the inbox topic carries membership and cursor events only, so other
-- members see the new name on their next list read. Recorded as a working label for Lane A.
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963).

create or replace function private.thread_rename(p_thread uuid, p_name text)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_name text := trim(coalesce(p_name, ''));
  v_kind text;
begin
  select t.kind into v_kind from public.threads t where t.id = p_thread for update;
  if v_kind is null then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  perform private.thread_require_lead(p_thread, v_uid, true);
  if v_kind <> 'community_group' then
    raise exception 'not_renamable' using errcode = 'P0001';
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 80 then
    raise exception 'bad_name' using errcode = '22023';
  end if;
  update public.threads set name = v_name where id = p_thread;
end;
$$;

revoke all on function private.thread_rename(uuid, text) from public;

create or replace function public.messenger_thread_rename(p_thread uuid, p_name text)
returns void
language sql
volatile
security definer
set search_path to ''
as $$ select private.thread_rename(p_thread, p_name); $$;

revoke all on function public.messenger_thread_rename(uuid, text) from public, anon;
grant execute on function public.messenger_thread_rename(uuid, text) to authenticated, service_role;
