-- Brief 14 Messenger, handoff 56-41E, item 1.6 (rulings 1580, 1581).
-- Start a group from the member's connections only. The checks, in this order: bad_name, no_members
-- and group_full as before; for each member, null, self, absent or blocked either way raises
-- bad_member; a member who is not a connection raises not_your_connection. The messenger_reachable
-- check goes with it, so not_reachable is no longer raised here. The picked members are still
-- written as invited and nobody has joined (1580).
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963).

create or replace function private.thread_create_group(p_name text, p_member_ids uuid[])
returns uuid
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_name text := trim(coalesce(p_name, ''));
  v_thread uuid;
  v_member uuid;
begin
  if char_length(v_name) < 1 or char_length(v_name) > 80 then
    raise exception 'bad_name' using errcode = '22023';
  end if;
  if p_member_ids is null or array_length(p_member_ids, 1) is null then
    raise exception 'no_members' using errcode = '22023';
  end if;
  if array_length(p_member_ids, 1) > 255 then
    raise exception 'group_full' using errcode = 'P0001';
  end if;
  foreach v_member in array p_member_ids loop
    if v_member is null
       or v_member = v_uid
       or not exists (select 1 from public.members m where m.id = v_member)
       or private.is_blocked(v_uid, v_member) then
      raise exception 'bad_member' using errcode = '22023';
    end if;
    if not private.is_connected(v_uid, v_member) then
      raise exception 'not_your_connection' using errcode = '42501';
    end if;
  end loop;
  insert into public.threads (kind, name, created_by)
  values ('community_group', v_name, v_uid)
  returning id into v_thread;
  insert into public.thread_members (thread_id, member_id, role, state, joined_at)
  values (v_thread, v_uid, 'lead', 'active', now());
  insert into public.thread_members (thread_id, member_id, state, invited_by)
  select distinct v_thread, x, 'invited'::public.thread_member_state, v_uid from unnest(p_member_ids) as x
  on conflict (thread_id, member_id) do nothing;
  return v_thread;
end;
$$;

revoke all on function private.thread_create_group(text, uuid[]) from public;
