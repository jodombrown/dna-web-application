-- Fix PR 10, item 8 (handoff 59-FIX-10 addendum 1; rulings 1623, 1636, 1637, under 1319, 1325 and
-- 1335): the group invitation signal, migration A.
--
-- 1636. A community group thread's notifications resolve to Connect. private.notification_c_for is
-- replaced from the body 20261008120300 defined (its only definer; Chat reads the live body at
-- apply): the thread branch alone changes, answering connect for a thread whose kind is
-- community_group and its anchor's C otherwise, as before. Every other branch is carried unchanged.
--
-- 1623. thread_invitation renders in the bell with the destination "Opens the group". The row's
-- other columns (c null, c_from_object true, groups false, settles false, position 9) are untouched;
-- the row's C comes from its object through notification_c_for, which now answers for a group.
--
-- 1637. Each member picked at group creation is notified as a later invite is: private.notify
-- (member, 'thread_invitation', 'member', creator, 'thread', thread), guarded by the same
-- notification_c_for test thread_invite makes. private.thread_create_group is replaced from the body
-- 20261008150400 defined (applied by Chat through execute_sql with the recorded statement's md5
-- equal to the file): the notify loop after the invited rows is the only addition. The row is
-- settled by thread_invite_accept and retracted by thread_invite_decline and thread_remove, which
-- key on (recipient, kind, 'thread', thread) whoever wrote the row (20261008120300 lines 867, 888
-- and 917), so an invitation written here clears the same way.
--
-- Nothing destructive. Committed before it is applied (225); applied by Chat through execute_sql
-- (963), with its supabase_migrations.schema_migrations row in the same transaction.

create or replace function private.notification_c_for(p_object_kind public.anchor_kind, p_object_id uuid)
returns public.c_category
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_kind text;
  v_anchor_kind public.anchor_kind;
  v_anchor_id uuid;
begin
  if p_object_kind is null or p_object_id is null then
    return null;
  end if;
  case p_object_kind::text
    when 'event' then
      return 'convene';
    when 'space' then
      return 'collaborate';
    when 'thread' then
      select t.kind, t.anchor_kind, t.anchor_id into v_kind, v_anchor_kind, v_anchor_id
      from public.threads t where t.id = p_object_id;
      -- 1636: a community group is Connect's.
      if v_kind = 'community_group' then
        return 'connect';
      end if;
      if v_anchor_kind is null or v_anchor_kind::text = 'thread' then
        return null;
      end if;
      return private.notification_c_for(v_anchor_kind, v_anchor_id);
    else
      return null;
  end case;
end;
$$;

revoke all on function private.notification_c_for(public.anchor_kind, uuid) from public, anon, authenticated;

comment on function private.notification_c_for(public.anchor_kind, uuid) is
  'The C a context-derived notification kind takes from its object (1325): an event is Convene, a Space is Collaborate, a community group thread is Connect (1636), any other thread is its anchor''s. Null where the context names no C, which private.notify refuses.';

update public.notification_kinds
set renders = true, destination = 'Opens the group'
where kind = 'thread_invitation';

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
  -- 1637: each member picked is notified exactly as thread_invite notifies a later invite, inside
  -- this transaction (1319), guarded by the same test.
  if private.notification_c_for('thread', v_thread) is not null then
    for v_member in select distinct x from unnest(p_member_ids) as x loop
      perform private.notify(v_member, 'thread_invitation', 'member', v_uid, 'thread', v_thread);
    end loop;
  end if;
  return v_thread;
end;
$$;

revoke all on function private.thread_create_group(text, uuid[]) from public;
