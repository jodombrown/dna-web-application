-- Brief 14 Messenger, handoff 41-A, file 7 of 9: transport (ruling 1351). Broadcast from the database
-- on one private inbox topic per member, inbox:{member_id}, and one per thread, thread:{thread_id};
-- a realtime.messages policy that grants a member their own inbox and the threads they are active in;
-- no insert policy, so a client never broadcasts; and no table added to the supabase_realtime
-- publication, which stays empty.
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963, 965), never
-- apply_migration (553, 269). Read live before this file was written: realtime.messages has RLS on
-- and no policy; realtime.broadcast_changes, realtime.send and realtime.topic exist; the publication
-- holds no table.

-- ---------------------------------------------------------------------------------------------------
-- 1. The topic predicate. One function so the policy and the live arm ask the same question; a
--    definer because it reads thread_members outside row security; executable by authenticated
--    because Realtime evaluates the policy as the member.
-- ---------------------------------------------------------------------------------------------------
create function private.messenger_topic_allowed(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_rest text;
begin
  if v_uid is null or p_topic is null then
    return false;
  end if;
  if p_topic = 'inbox:' || v_uid::text then
    return true;
  end if;
  if left(p_topic, 7) = 'thread:' then
    v_rest := substr(p_topic, 8);
    if v_rest !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      return false;
    end if;
    return private.thread_member_in(v_rest::uuid, v_uid, array['active']::public.thread_member_state[]);
  end if;
  return false;
end;
$$;
revoke execute on function private.messenger_topic_allowed(text) from public, anon;
grant execute on function private.messenger_topic_allowed(text) to authenticated, service_role;
comment on function private.messenger_topic_allowed(text) is
  'Whether the caller may read a Messenger broadcast topic (Brief 14, ruling 1351): their own inbox:{member_id}, or thread:{thread_id} for a thread they are active in. The realtime.messages policy and the live arm both ask it.';

create policy messenger_topics_select on realtime.messages
  for select to authenticated
  using (private.messenger_topic_allowed(realtime.topic()));

-- ---------------------------------------------------------------------------------------------------
-- 2. Messages: the row to the thread's topic (minus body and preview once deleted, never the search
--    vector), and one thread_touch per active member to their inbox in one statement.
-- ---------------------------------------------------------------------------------------------------
create function private.messages_broadcast()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_new public.messages := new;
  v_old public.messages;
begin
  v_new.search := null;
  if v_new.deleted_at is not null then
    v_new.body := null;
    v_new.link_preview := null;
  end if;
  if tg_op = 'UPDATE' then
    v_old := old;
    v_old.search := null;
    v_old.body := null;
    v_old.link_preview := null;
  end if;
  perform realtime.broadcast_changes(
    'thread:' || new.thread_id::text,
    'message',
    tg_op,
    tg_table_name,
    tg_table_schema,
    v_new,
    v_old,
    'ROW');
  perform realtime.send(
    jsonb_build_object('thread_id', new.thread_id, 'last_activity_at', new.created_at, 'seq', new.seq),
    'thread_touch',
    'inbox:' || tm.member_id::text,
    true)
  from public.thread_members tm
  where tm.thread_id = new.thread_id and tm.state = 'active';
  return null;
end;
$$;
revoke execute on function private.messages_broadcast() from public, anon, authenticated;
create trigger on_messages_broadcast
  after insert or update on public.messages
  for each row execute function private.messages_broadcast();

-- ---------------------------------------------------------------------------------------------------
-- 3. Cursors: a member's delivered or read cursor to the thread's topic. Clients debounce their own
--    cursor writes to one per two seconds; the when clause keeps a write that moved nothing silent.
-- ---------------------------------------------------------------------------------------------------
create function private.thread_members_cursor_broadcast()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return null;
  end if;
  perform realtime.send(
    jsonb_build_object(
      'thread_id', new.thread_id,
      'member_id', new.member_id,
      'delivered_seq', new.delivered_seq,
      'read_seq', new.read_seq),
    'cursor',
    'thread:' || new.thread_id::text,
    true);
  return null;
end;
$$;
revoke execute on function private.thread_members_cursor_broadcast() from public, anon, authenticated;
create trigger on_thread_members_cursor_broadcast
  after update of delivered_seq, read_seq on public.thread_members
  for each row
  when (old.read_seq is distinct from new.read_seq or old.delivered_seq is distinct from new.delivered_seq)
  execute function private.thread_members_cursor_broadcast();

-- ---------------------------------------------------------------------------------------------------
-- 4. Requests: to both inboxes, state only, never the body.
-- ---------------------------------------------------------------------------------------------------
create function private.message_requests_broadcast()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_payload jsonb := jsonb_build_object(
    'id', new.id,
    'state', new.state,
    'sender_id', new.sender_id,
    'recipient_id', new.recipient_id,
    'thread_id', new.thread_id,
    'created_at', new.created_at,
    'decided_at', new.decided_at);
begin
  perform realtime.send(v_payload, 'request', 'inbox:' || new.recipient_id::text, true);
  perform realtime.send(v_payload, 'request', 'inbox:' || new.sender_id::text, true);
  return null;
end;
$$;
revoke execute on function private.message_requests_broadcast() from public, anon, authenticated;
create trigger on_message_requests_broadcast
  after insert or update on public.message_requests
  for each row execute function private.message_requests_broadcast();

-- ---------------------------------------------------------------------------------------------------
-- 5. Invitations: to the invited member's inbox.
-- ---------------------------------------------------------------------------------------------------
create function private.thread_invitation_broadcast()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform realtime.send(
    jsonb_build_object('thread_id', new.thread_id, 'member_id', new.member_id, 'invited_by', new.invited_by),
    'invitation',
    'inbox:' || new.member_id::text,
    true);
  return null;
end;
$$;
revoke execute on function private.thread_invitation_broadcast() from public, anon, authenticated;
create trigger on_thread_invitation_broadcast
  after insert or update of state on public.thread_members
  for each row
  when (new.state = 'invited')
  execute function private.thread_invitation_broadcast();

-- No table is added to supabase_realtime. The live arm reads pg_publication_tables for that
-- publication and expects 0; nothing here or in any other 41-A file alters a publication.
