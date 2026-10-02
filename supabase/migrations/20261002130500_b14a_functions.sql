-- Brief 14 Messenger, handoff 41-A, file 6 of 9: the write paths, the read projections, search, the
-- digest line and the DIA signals. Every function is security definer with an empty search_path and
-- schema-qualified references; the private functions hold no client grant, and each is reached through
-- a public.messenger_* wrapper granted to authenticated only where a client calls it. Each refusal is a
-- short word with an errcode, the way media-upload answers, for the client to turn into its alert:
-- 42501 for who may not, 22023 for what is malformed, P0001 for what is refused for now.
--
-- Rulings: 1330 (connections open, others request), 1332 and 1342 (groups, invitations, history),
-- 1335 (three pins), 1336 and 1351 (cursors, seq, idempotency), 1338 and 1347 (search), 1339
-- (archive, digest), 1341 (requests), 1343 (edit, delete, previews), 1344 (mark unread), 1345
-- (receipts), 1346 (media), 1348 (mute), 1349 (reports, blocked authors), 1350 (staff, DIA), 1353
-- (rate limits), 1370 (reactions), 1371 (one pin per thread), 1373 (DIA dismissals persist here),
-- 1316 (no notification for a reaction), 1317 (names up to three then others). Committed before it
-- is applied (225); applied by Chat through execute_sql (963, 965), never apply_migration (553, 269).
--
-- Findings against the handoff, named in the closing report and carried as stated assumptions here:
--   - member_blocks has no private writer in the tree; Connect's block control is a plain insert under
--     member_blocks_owner_insert with the ruling 198 trigger carrying the consequences, so
--     private.message_request_block inserts the row the same way and the triggers fire.
--   - no function in the tree sets a Space role active; space_roles is written by publish_post for the
--     lead and by direct updates under its own policies. private.space_thread_sync is built as named
--     and reached by the Space page through public.messenger_space_thread_sync, not from an approval
--     path that does not exist (1002 refuses a trigger).
--   - the idempotent return sits before the rate limit, not after it: a retry of a send that already
--     landed is the one call the ceiling must not count.
--   - message_send takes p_link_preview, because a preview the client supplied has to arrive somehow.

-- ===================================================================================================
-- A. Helpers the projections and policies read.
-- ===================================================================================================

-- Whether a member's receipts are on (1345). A definer because the settings row is the member's
-- own; executable by authenticated because the message projection evaluates it as the viewer, and it
-- answers one boolean about a member who shares a thread with the viewer.
create function private.receipts_on(p_member uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce((select s.receipts_enabled from public.member_messaging_settings s where s.member_id = p_member), false);
$$;
revoke execute on function private.receipts_on(uuid) from public, anon;
grant execute on function private.receipts_on(uuid) to authenticated, service_role;

-- Whether the caller blocks a member (1349): the blocker sees the placeholder, the blocked member
-- sees nothing different, so the question is one-directional here.
create function private.viewer_blocks(p_member uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is not null and p_member is not null and exists (
    select 1 from public.member_blocks b where b.blocker_id = auth.uid() and b.blocked_id = p_member
  );
$$;
revoke execute on function private.viewer_blocks(uuid) from public, anon;
grant execute on function private.viewer_blocks(uuid) to authenticated, service_role;

-- The name, handle, headline, avatar and stance label of a member the caller may name in Messenger:
-- themselves, a member they share a thread with in any state, or a member on either side of a
-- request with them. Anyone else answers null. A thread or a request is the member's own consent to
-- be named inside it (139 to 141); nothing here reaches a signed-out surface.
create function private.messenger_member_core(p_member uuid)
returns jsonb
language sql
stable
security definer
set search_path to ''
as $$
  select case
    when p_member is null or auth.uid() is null then null
    when p_member <> auth.uid()
      and not exists (
        select 1 from public.thread_members a
        join public.thread_members b on b.thread_id = a.thread_id
        where a.member_id = auth.uid() and b.member_id = p_member
      )
      and not exists (
        select 1 from public.message_requests r
        where (r.sender_id = auth.uid() and r.recipient_id = p_member)
           or (r.sender_id = p_member and r.recipient_id = auth.uid())
      )
    then null
    else (
      select jsonb_build_object(
        'name', m.name,
        'handle', m.handle,
        'headline', m.headline,
        'avatar_path', m.avatar_path,
        'stance', m.stance,
        'stance_label', s.label)
      from public.members m
      left join public.member_stances s on s.stance = m.stance
      where m.id = p_member)
  end;
$$;
revoke execute on function private.messenger_member_core(uuid) from public, anon;
grant execute on function private.messenger_member_core(uuid) to authenticated, service_role;
comment on function private.messenger_member_core(uuid) is
  'A member''s name, handle, headline, avatar and stance label for Messenger (Brief 14; rulings 139 to 141, 187): answered to the member themselves, to a member they share a thread with in any state, and to a member on either side of a request with them; null to anyone else.';

-- Names up to three and whether there are others (1317), from a set of member ids, in the order
-- given. Each name passes through messenger_member_core, so a member the caller may not name is
-- left out rather than shown.
create function private.messenger_names(p_members uuid[])
returns jsonb
language sql
stable
security definer
set search_path to ''
as $$
  with named as (
    select private.messenger_member_core(m.id) ->> 'name' as name, m.ord
    from unnest(coalesce(p_members, '{}'::uuid[])) with ordinality as m (id, ord)
  ), kept as (
    select name, ord from named where name is not null
  )
  select jsonb_build_object(
    'names', coalesce((select jsonb_agg(k.name order by k.ord) from (select name, ord from kept order by ord limit 3) k), '[]'::jsonb),
    'others', (select count(*) from kept) > 3);
$$;
revoke execute on function private.messenger_names(uuid[]) from public, anon;
grant execute on function private.messenger_names(uuid[]) to authenticated, service_role;

-- Mutual connections of the caller and another member, as names up to three then others (1341).
create function private.messenger_mutuals(p_other uuid)
returns jsonb
language sql
stable
security definer
set search_path to ''
as $$
  with mutual as (
    select m.id, m.name
    from public.member_connections a
    join public.member_connections b on b.member_id = p_other and b.other_id = a.other_id
    join public.members m on m.id = a.other_id
    where a.member_id = auth.uid()
    order by m.name
  )
  select jsonb_build_object(
    'names', coalesce((select jsonb_agg(x.name) from (select name from mutual limit 3) x), '[]'::jsonb),
    'others', (select count(*) from mutual) > 3);
$$;
revoke execute on function private.messenger_mutuals(uuid) from public, anon;
grant execute on function private.messenger_mutuals(uuid) to authenticated, service_role;

-- Spaces the caller and another member both hold an active role in, as names up to three (1341).
create function private.messenger_shared_spaces(p_other uuid)
returns jsonb
language sql
stable
security definer
set search_path to ''
as $$
  with shared as (
    select s.id, s.title
    from public.space_roles a
    join public.space_roles b on b.space_id = a.space_id and b.member_id = p_other and b.status = 'active'
    join public.spaces s on s.id = a.space_id
    where a.member_id = auth.uid() and a.status = 'active'
    order by s.title
  )
  select jsonb_build_object(
    'names', coalesce((select jsonb_agg(x.title) from (select title from shared limit 3) x), '[]'::jsonb),
    'others', (select count(*) from shared) > 3);
$$;
revoke execute on function private.messenger_shared_spaces(uuid) from public, anon;
grant execute on function private.messenger_shared_spaces(uuid) to authenticated, service_role;

-- The reachability test (450, 1330, 1342): a connection is always reachable; otherwise the target's
-- own setting decides, and a block in either direction closes it.
create function private.messenger_reachable(p_from uuid, p_to uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_reach public.reachability;
begin
  if p_from is null or p_to is null or p_from = p_to then
    return false;
  end if;
  if private.is_blocked(p_from, p_to) then
    return false;
  end if;
  if private.is_connected(p_from, p_to) then
    return true;
  end if;
  select m.reachability into v_reach from public.members m where m.id = p_to;
  if v_reach is null or v_reach = 'off' then
    return false;
  end if;
  if v_reach = 'open' then
    return true;
  end if;
  return private.is_connected_within(p_from, p_to, 2);
end;
$$;
revoke execute on function private.messenger_reachable(uuid, uuid) from public, anon, authenticated;

-- The caller's row in a thread, locked, or a refusal in a word.
create function private.thread_member_row(p_thread uuid, p_member uuid)
returns public.thread_members
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_row public.thread_members;
begin
  select * into v_row from public.thread_members tm
  where tm.thread_id = p_thread and tm.member_id = p_member
  for update;
  if v_row.thread_id is null then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  return v_row;
end;
$$;
revoke execute on function private.thread_member_row(uuid, uuid) from public, anon, authenticated;

create function private.thread_require_active(p_thread uuid, p_member uuid)
returns public.thread_members
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_row public.thread_members := private.thread_member_row(p_thread, p_member);
begin
  if v_row.state <> 'active' then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  return v_row;
end;
$$;
revoke execute on function private.thread_require_active(uuid, uuid) from public, anon, authenticated;

create function private.thread_require_lead(p_thread uuid, p_member uuid, p_co_lead_too boolean)
returns public.thread_members
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_row public.thread_members := private.thread_require_active(p_thread, p_member);
begin
  if v_row.role = 'lead' or (p_co_lead_too and v_row.role = 'co_lead') then
    return v_row;
  end if;
  raise exception 'not_a_lead' using errcode = '42501';
end;
$$;
revoke execute on function private.thread_require_lead(uuid, uuid, boolean) from public, anon, authenticated;

create function private.require_uid()
returns uuid
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  perform private.messaging_settings_touch(v_uid);
  return v_uid;
end;
$$;
revoke execute on function private.require_uid() from public, anon, authenticated;

-- ===================================================================================================
-- B. Threads: one-to-one, requests, groups, Space and event threads.
-- ===================================================================================================

-- A pair's thread (1330): refused when blocked; requires a connection or an accepted request either
-- way; one thread per pair on pair_key; both members active, a member who left is active again.
create function private.thread_open_one_to_one(p_other uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_key text;
  v_thread uuid;
begin
  if p_other is null or p_other = v_uid then
    raise exception 'bad_member' using errcode = '22023';
  end if;
  if not exists (select 1 from public.members m where m.id = p_other) then
    raise exception 'bad_member' using errcode = '22023';
  end if;
  if private.is_blocked(v_uid, p_other) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  if not private.is_connected(v_uid, p_other)
    and not exists (
      select 1 from public.message_requests r
      where r.state = 'accepted'
        and ((r.sender_id = v_uid and r.recipient_id = p_other) or (r.sender_id = p_other and r.recipient_id = v_uid))
    )
  then
    raise exception 'request_first' using errcode = '42501';
  end if;
  v_key := least(v_uid, p_other)::text || ':' || greatest(v_uid, p_other)::text;
  insert into public.threads as t (kind, created_by, pair_key, history_visible_to_new)
  values ('one_to_one', v_uid, v_key, true)
  on conflict (pair_key) do update set last_activity_at = t.last_activity_at
  returning t.id into v_thread;
  insert into public.thread_members as tm (thread_id, member_id, state, joined_at)
  values (v_thread, v_uid, 'active', now()), (v_thread, p_other, 'active', now())
  on conflict (thread_id, member_id) do update
    set state = 'active', joined_at = coalesce(tm.joined_at, now())
    where tm.state <> 'active';
  return v_thread;
end;
$$;
revoke execute on function private.thread_open_one_to_one(uuid) from public, anon, authenticated;

-- A request (1330, 1341, 450, 446): text only, 240 characters, refused when blocked, when already
-- connected (open the thread instead), when the recipient is not reachable, when the sender holds 20
-- pending, and past the daily ceiling. No read state exists.
create function private.message_request_send(p_recipient uuid, p_body text)
returns public.message_requests
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_body text := trim(coalesce(p_body, ''));
  v_row public.message_requests;
begin
  if p_recipient is null or p_recipient = v_uid or not exists (select 1 from public.members m where m.id = p_recipient) then
    raise exception 'bad_member' using errcode = '22023';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 240 then
    raise exception 'bad_body' using errcode = '22023';
  end if;
  if private.is_blocked(v_uid, p_recipient) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  if private.is_connected(v_uid, p_recipient) then
    raise exception 'already_connected' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.message_requests r
    where (r.sender_id = v_uid and r.recipient_id = p_recipient)
       or (r.sender_id = p_recipient and r.recipient_id = v_uid and r.state in ('pending', 'accepted'))
  ) then
    -- One word whatever the earlier row's state, so a decline never reaches the sender (157).
    raise exception 'request_exists' using errcode = 'P0001';
  end if;
  if not private.messenger_reachable(v_uid, p_recipient) then
    raise exception 'not_reachable' using errcode = '42501';
  end if;
  if (select count(*) from public.message_requests r where r.sender_id = v_uid and r.state = 'pending') >= 20 then
    raise exception 'too_many_pending' using errcode = 'P0001';
  end if;
  if not public.rate_limit_check('message_request') then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.message_requests (sender_id, recipient_id, body)
  values (v_uid, p_recipient, v_body)
  returning * into v_row;
  return v_row;
end;
$$;
revoke execute on function private.message_request_send(uuid, text) from public, anon, authenticated;

-- Accept (1341): recipient only; opens the pair's thread and writes the request's text as its first
-- message by the sender. A declined request may be accepted later.
create function private.message_request_accept(p_request uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_req public.message_requests;
  v_key text;
  v_thread uuid;
begin
  select * into v_req from public.message_requests r where r.id = p_request for update;
  if v_req.id is null or v_req.recipient_id <> v_uid then
    raise exception 'not_your_request' using errcode = '42501';
  end if;
  if v_req.state = 'accepted' and v_req.thread_id is not null then
    return v_req.thread_id;
  end if;
  if v_req.state = 'blocked' or private.is_blocked(v_uid, v_req.sender_id) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  update public.message_requests set state = 'accepted', decided_at = now() where id = p_request;
  v_key := least(v_uid, v_req.sender_id)::text || ':' || greatest(v_uid, v_req.sender_id)::text;
  insert into public.threads as t (kind, created_by, pair_key, history_visible_to_new)
  values ('one_to_one', v_req.sender_id, v_key, true)
  on conflict (pair_key) do update set last_activity_at = t.last_activity_at
  returning t.id into v_thread;
  insert into public.thread_members as tm (thread_id, member_id, state, joined_at)
  values (v_thread, v_uid, 'active', now()), (v_thread, v_req.sender_id, 'active', now())
  on conflict (thread_id, member_id) do update
    set state = 'active', joined_at = coalesce(tm.joined_at, now())
    where tm.state <> 'active';
  perform 1 from public.threads t where t.id = v_thread for update;
  if not exists (select 1 from public.messages m where m.thread_id = v_thread and m.client_id = v_req.id) then
    insert into public.messages (thread_id, seq, client_id, author_id, kind, body, created_at)
    values (
      v_thread,
      coalesce((select max(m.seq) from public.messages m where m.thread_id = v_thread), 0) + 1,
      v_req.id,
      v_req.sender_id,
      'text',
      v_req.body,
      v_req.created_at);
    update public.threads set last_activity_at = now() where id = v_thread;
  end if;
  update public.message_requests set thread_id = v_thread where id = p_request;
  return v_thread;
end;
$$;
revoke execute on function private.message_request_accept(uuid) from public, anon, authenticated;

create function private.message_request_decline(p_request uuid)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_req public.message_requests;
begin
  select * into v_req from public.message_requests r where r.id = p_request for update;
  if v_req.id is null or v_req.recipient_id <> v_uid then
    raise exception 'not_your_request' using errcode = '42501';
  end if;
  if v_req.state <> 'pending' then
    raise exception 'not_pending' using errcode = 'P0001';
  end if;
  update public.message_requests set state = 'declined', decided_at = now() where id = p_request;
end;
$$;
revoke execute on function private.message_request_decline(uuid) from public, anon, authenticated;

-- Block from a request (1341): the request is marked and the recipient's member_blocks row is
-- written the way Connect's block control writes it, so the ruling 198 trigger revokes the
-- relationship both ways and the ruling 442 trigger counts it.
create function private.message_request_block(p_request uuid)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_req public.message_requests;
begin
  select * into v_req from public.message_requests r where r.id = p_request for update;
  if v_req.id is null or v_req.recipient_id <> v_uid then
    raise exception 'not_your_request' using errcode = '42501';
  end if;
  update public.message_requests set state = 'blocked', decided_at = now() where id = p_request;
  insert into public.member_blocks (blocker_id, blocked_id)
  values (v_uid, v_req.sender_id)
  on conflict (blocker_id, blocked_id) do nothing;
end;
$$;
revoke execute on function private.message_request_block(uuid) from public, anon, authenticated;

-- A community group (1332, 1342): the creator leads; every id named is invited, each reachable from
-- the inviter under the same test a request passes.
create function private.thread_create_group(p_name text, p_member_ids uuid[])
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
    if v_member is null or v_member = v_uid or not exists (select 1 from public.members m where m.id = v_member) then
      raise exception 'bad_member' using errcode = '22023';
    end if;
    if not private.messenger_reachable(v_uid, v_member) then
      raise exception 'not_reachable' using errcode = '42501';
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
revoke execute on function private.thread_create_group(text, uuid[]) from public, anon, authenticated;

-- An invitation (1332, 1342): a lead or co_lead invites anyone reachable; an active member invites
-- their own connection. Only a community_group or an event_thread takes invitations; Space threads
-- follow the Space's roles.
create function private.thread_invite(p_thread uuid, p_member uuid)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_me public.thread_members := private.thread_require_active(p_thread, v_uid);
  v_kind text;
  v_state public.thread_member_state;
begin
  select t.kind into v_kind from public.threads t where t.id = p_thread;
  if v_kind not in ('community_group', 'event_thread') then
    raise exception 'no_invitations' using errcode = '22023';
  end if;
  if p_member is null or p_member = v_uid or not exists (select 1 from public.members m where m.id = p_member) then
    raise exception 'bad_member' using errcode = '22023';
  end if;
  if v_me.role = 'member' and not private.is_connected(v_uid, p_member) then
    raise exception 'not_your_connection' using errcode = '42501';
  end if;
  if not private.messenger_reachable(v_uid, p_member) then
    raise exception 'not_reachable' using errcode = '42501';
  end if;
  select tm.state into v_state from public.thread_members tm
  where tm.thread_id = p_thread and tm.member_id = p_member for update;
  if v_state in ('active', 'invited') then
    raise exception 'already_member' using errcode = 'P0001';
  end if;
  insert into public.thread_members (thread_id, member_id, state, invited_by)
  values (p_thread, p_member, 'invited', v_uid)
  on conflict (thread_id, member_id) do update
    set state = 'invited', invited_by = v_uid, role = 'member';
end;
$$;
revoke execute on function private.thread_invite(uuid, uuid) from public, anon, authenticated;

-- Acceptance (1342): the invited member becomes active at the thread's current seq. On an
-- event_thread a member registered as going joins the same way without an invited row, the RSVP
-- being the offer (1331); the cap trigger applies on acceptance.
create function private.thread_invite_accept(p_thread uuid)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_row public.thread_members;
  v_thread public.threads;
  v_max bigint;
begin
  select * into v_thread from public.threads t where t.id = p_thread for update;
  if v_thread.id is null then
    raise exception 'no_thread' using errcode = '22023';
  end if;
  select * into v_row from public.thread_members tm
  where tm.thread_id = p_thread and tm.member_id = v_uid for update;
  v_max := coalesce((select max(m.seq) from public.messages m where m.thread_id = p_thread), 0);
  if v_row.thread_id is not null then
    if v_row.state = 'active' then
      return;
    end if;
    if v_row.state <> 'invited' then
      raise exception 'not_invited' using errcode = '42501';
    end if;
    update public.thread_members
    set state = 'active', joined_at = now(), joined_seq = v_max
    where thread_id = p_thread and member_id = v_uid;
    return;
  end if;
  if v_thread.kind = 'event_thread' and exists (
    select 1 from public.event_registrations r
    where r.event_id = v_thread.anchor_id and r.member_id = v_uid and r.status = 'going'
  ) then
    insert into public.thread_members (thread_id, member_id, state, joined_at, joined_seq)
    values (p_thread, v_uid, 'active', now(), v_max);
    return;
  end if;
  raise exception 'not_invited' using errcode = '42501';
end;
$$;
revoke execute on function private.thread_invite_accept(uuid) from public, anon, authenticated;

create function private.thread_invite_decline(p_thread uuid)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
begin
  delete from public.thread_members
  where thread_id = p_thread and member_id = v_uid and state = 'invited';
  if not found then
    raise exception 'not_invited' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function private.thread_invite_decline(uuid) from public, anon, authenticated;

-- Leaving writes no system message (1342).
create function private.thread_leave(p_thread uuid)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_row public.thread_members := private.thread_require_active(p_thread, v_uid);
begin
  if exists (select 1 from public.threads t where t.id = p_thread and t.kind = 'one_to_one') then
    raise exception 'no_leaving' using errcode = '22023';
  end if;
  update public.thread_members set state = 'left', pinned_at = null
  where thread_id = p_thread and member_id = v_uid;
end;
$$;
revoke execute on function private.thread_leave(uuid) from public, anon, authenticated;

create function private.thread_remove(p_thread uuid, p_member uuid)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_me public.thread_members := private.thread_require_lead(p_thread, v_uid, true);
  v_target public.thread_members;
begin
  if p_member = v_uid then
    raise exception 'bad_member' using errcode = '22023';
  end if;
  select * into v_target from public.thread_members tm
  where tm.thread_id = p_thread and tm.member_id = p_member for update;
  if v_target.thread_id is null or v_target.state not in ('active', 'invited') then
    raise exception 'not_a_member' using errcode = '22023';
  end if;
  if v_target.role = 'lead' or (v_target.role = 'co_lead' and v_me.role <> 'lead') then
    raise exception 'not_a_lead' using errcode = '42501';
  end if;
  update public.thread_members set state = 'removed', pinned_at = null
  where thread_id = p_thread and member_id = p_member;
end;
$$;
revoke execute on function private.thread_remove(uuid, uuid) from public, anon, authenticated;

create function private.thread_set_history(p_thread uuid, p_visible boolean)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_me public.thread_members := private.thread_require_lead(p_thread, v_uid, false);
begin
  if p_visible is null then
    raise exception 'bad_value' using errcode = '22023';
  end if;
  update public.threads set history_visible_to_new = p_visible where id = p_thread;
end;
$$;
revoke execute on function private.thread_set_history(uuid, boolean) from public, anon, authenticated;

create function private.thread_set_role(p_thread uuid, p_member uuid, p_role public.thread_member_role)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_me public.thread_members := private.thread_require_lead(p_thread, v_uid, false);
begin
  if p_role is null or p_role = 'lead' then
    raise exception 'bad_role' using errcode = '22023';
  end if;
  if p_member = v_uid then
    raise exception 'bad_member' using errcode = '22023';
  end if;
  update public.thread_members set role = p_role
  where thread_id = p_thread and member_id = p_member and state = 'active';
  if not found then
    raise exception 'not_a_member' using errcode = '22023';
  end if;
end;
$$;
revoke execute on function private.thread_set_role(uuid, uuid, public.thread_member_role) from public, anon, authenticated;

-- The Space's thread (1331, 1342): made if absent, every active role holder active in it with the
-- Space lead leading, a holder whose role ended set to left. Exempt from the cap. Idempotent, so the
-- Space page calls it on open and a role change calls it when a write path for roles exists.
create function private.space_thread_sync(p_space uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_space public.spaces;
  v_thread uuid;
  v_max bigint;
begin
  select * into v_space from public.spaces s where s.id = p_space for update;
  if v_space.id is null then
    raise exception 'no_space' using errcode = '22023';
  end if;
  select t.id into v_thread from public.threads t
  where t.kind = 'space_thread' and t.anchor_kind = 'space' and t.anchor_id = p_space
  for update;
  if v_thread is null then
    insert into public.threads (kind, anchor_kind, anchor_id, name, created_by, history_visible_to_new)
    values ('space_thread', 'space', p_space, v_space.title,
      (select m.id from public.members m where m.id = v_space.owner_member_id), true)
    returning id into v_thread;
  end if;
  v_max := coalesce((select max(m.seq) from public.messages m where m.thread_id = v_thread), 0);
  insert into public.thread_members as tm (thread_id, member_id, role, state, joined_at, joined_seq)
  select v_thread, r.member_id,
    case when r.role = 'lead' then 'lead'::public.thread_member_role else 'member'::public.thread_member_role end,
    'active'::public.thread_member_state, now(), v_max
  from public.space_roles r
  join public.members m on m.id = r.member_id
  where r.space_id = p_space and r.status = 'active'
  on conflict (thread_id, member_id) do update
    set state = 'active',
        role = excluded.role,
        joined_at = coalesce(tm.joined_at, now())
    where tm.state <> 'active' or tm.role <> excluded.role;
  update public.thread_members tm
  set state = 'left', pinned_at = null
  where tm.thread_id = v_thread
    and tm.state = 'active'
    and not exists (
      select 1 from public.space_roles r
      where r.space_id = p_space and r.member_id = tm.member_id and r.status = 'active');
  return v_thread;
end;
$$;
revoke execute on function private.space_thread_sync(uuid) from public, anon, authenticated;

-- The event's thread (1331): host only; the host leads; attendees join through
-- private.thread_invite_accept, the RSVP being the offer.
create function private.event_thread_open(p_event uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_event public.events;
  v_thread uuid;
begin
  select * into v_event from public.events e where e.id = p_event for update;
  if v_event.id is null then
    raise exception 'no_event' using errcode = '22023';
  end if;
  if v_event.host_member_id <> v_uid then
    raise exception 'not_the_host' using errcode = '42501';
  end if;
  select t.id into v_thread from public.threads t
  where t.kind = 'event_thread' and t.anchor_kind = 'event' and t.anchor_id = p_event;
  if v_thread is null then
    insert into public.threads (kind, anchor_kind, anchor_id, name, created_by, history_visible_to_new)
    values ('event_thread', 'event', p_event, v_event.title, v_uid, true)
    returning id into v_thread;
  end if;
  insert into public.thread_members as tm (thread_id, member_id, role, state, joined_at)
  values (v_thread, v_uid, 'lead', 'active', now())
  on conflict (thread_id, member_id) do update
    set state = 'active', role = 'lead', joined_at = coalesce(tm.joined_at, now());
  return v_thread;
end;
$$;
revoke execute on function private.event_thread_open(uuid) from public, anon, authenticated;

-- ===================================================================================================
-- C. Messages: the one write path, edit, delete, reactions, pins, reports.
-- ===================================================================================================

-- The one write path (Guardrail 1; 1343, 1346, 1351, 1352, 1353). In order: the caller's settings
-- row; active membership; for a one_to_one, no block either way; the idempotent return; the ceiling;
-- the body, the kind and the media; seq under a lock on the thread row; the preview only when the
-- author's setting is on; the row; mentions of active members; last_activity_at; every member's
-- archive cleared; the author's cursors.
create function private.message_send(
  p_thread uuid,
  p_client_id uuid,
  p_body text,
  p_kind public.message_kind,
  p_reply_to uuid,
  p_media uuid,
  p_mentions uuid[],
  p_link_preview jsonb
)
returns public.messages
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_me public.thread_members := private.thread_require_active(p_thread, v_uid);
  v_thread public.threads;
  v_kind public.message_kind := coalesce(p_kind, 'text');
  v_body text := nullif(trim(coalesce(p_body, '')), '');
  v_other uuid;
  v_row public.messages;
  v_seq bigint;
  v_preview jsonb;
begin
  select * into v_thread from public.threads t where t.id = p_thread;
  if v_thread.kind = 'one_to_one' then
    select tm.member_id into v_other from public.thread_members tm
    where tm.thread_id = p_thread and tm.member_id <> v_uid limit 1;
    if private.is_blocked(v_uid, v_other) then
      raise exception 'blocked' using errcode = '42501';
    end if;
  end if;
  if p_client_id is null then
    raise exception 'bad_client_id' using errcode = '22023';
  end if;
  select * into v_row from public.messages m
  where m.thread_id = p_thread and m.client_id = p_client_id;
  if v_row.id is not null then
    return v_row;
  end if;
  if not public.rate_limit_check('message_send') then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if v_kind = 'system' then
    raise exception 'bad_kind' using errcode = '22023';
  end if;
  if v_body is not null and char_length(v_body) > 10000 then
    raise exception 'too_long' using errcode = '22023';
  end if;
  if v_kind = 'text' and v_body is null then
    raise exception 'empty' using errcode = '22023';
  end if;
  if v_kind in ('voice', 'media') then
    if p_media is null then
      raise exception 'no_media' using errcode = '22023';
    end if;
    if not public.rate_limit_check('message_media') then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;
  if p_media is not null and not exists (
    select 1 from public.media md where md.id = p_media and md.owner_id = v_uid and md.delete_requested_at is null
  ) then
    raise exception 'bad_media' using errcode = '22023';
  end if;
  if p_reply_to is not null and not exists (
    select 1 from public.messages m where m.id = p_reply_to and m.thread_id = p_thread
  ) then
    raise exception 'bad_reply' using errcode = '22023';
  end if;
  if p_link_preview is not null and jsonb_typeof(p_link_preview) <> 'object' then
    raise exception 'bad_preview' using errcode = '22023';
  end if;
  perform 1 from public.threads t where t.id = p_thread for update;
  v_seq := coalesce((select max(m.seq) from public.messages m where m.thread_id = p_thread), 0) + 1;
  if p_link_preview is not null and coalesce(
    (select s.link_previews_enabled from public.member_messaging_settings s where s.member_id = v_uid), false)
  then
    v_preview := p_link_preview;
  end if;
  insert into public.messages (thread_id, seq, client_id, author_id, kind, body, reply_to, media_id, link_preview)
  values (p_thread, v_seq, p_client_id, v_uid, v_kind, v_body, p_reply_to, p_media, v_preview)
  returning * into v_row;
  if p_mentions is not null then
    insert into public.message_mentions (message_id, member_id)
    select distinct v_row.id, x
    from unnest(p_mentions) as x
    where x is not null and x <> v_uid
      and private.thread_member_in(p_thread, x, array['active']::public.thread_member_state[])
    on conflict do nothing;
  end if;
  update public.threads set last_activity_at = v_row.created_at where id = p_thread;
  update public.thread_members set archived_at = null
  where thread_id = p_thread and archived_at is not null;
  update public.thread_members
  set delivered_seq = greatest(delivered_seq, v_seq),
      read_seq = greatest(read_seq, v_seq),
      last_opened_at = now()
  where thread_id = p_thread and member_id = v_uid;
  return v_row;
end;
$$;
revoke execute on function private.message_send(uuid, uuid, text, public.message_kind, uuid, uuid, uuid[], jsonb) from public, anon, authenticated;
comment on function private.message_send(uuid, uuid, text, public.message_kind, uuid, uuid, uuid[], jsonb) is
  'The one write path for messages (Brief 14 Guardrail 1; rulings 1343, 1346, 1351, 1352, 1353): idempotent on (thread_id, client_id), seq assigned under a lock on the thread row, 10,000 characters, rate_limit_check(message_send) and (message_media), active membership, no block on a one_to_one, a preview only when the author''s setting is on, mentions of active members, archive cleared for every member, the author''s cursors at the new seq. Reached through public.messenger_send; no client role holds execute here.';

-- Edit within 60 minutes (1343): the author, a text message, not deleted.
create function private.message_edit(p_message uuid, p_body text)
returns public.messages
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_row public.messages;
  v_body text := nullif(trim(coalesce(p_body, '')), '');
begin
  select * into v_row from public.messages m where m.id = p_message for update;
  if v_row.id is null or v_row.author_id is distinct from v_uid then
    raise exception 'not_your_message' using errcode = '42501';
  end if;
  if v_row.deleted_at is not null or v_row.kind <> 'text' then
    raise exception 'not_editable' using errcode = 'P0001';
  end if;
  if v_row.created_at < now() - interval '60 minutes' then
    raise exception 'edit_window_closed' using errcode = 'P0001';
  end if;
  if v_body is null or char_length(v_body) > 10000 then
    raise exception 'bad_body' using errcode = '22023';
  end if;
  update public.messages set body = v_body, edited_at = now()
  where id = p_message
  returning * into v_row;
  return v_row;
end;
$$;
revoke execute on function private.message_edit(uuid, text) from public, anon, authenticated;

-- Delete for everyone within 60 hours (1343): body, preview and media cleared, the media row marked
-- for the server route that removes the object (41-B); answers the storage path for that route.
create function private.message_delete_for_everyone(p_message uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_row public.messages;
  v_path text;
begin
  select * into v_row from public.messages m where m.id = p_message for update;
  if v_row.id is null or v_row.author_id is distinct from v_uid then
    raise exception 'not_your_message' using errcode = '42501';
  end if;
  if v_row.deleted_at is not null then
    return jsonb_build_object('message_id', v_row.id, 'storage_path', null);
  end if;
  if v_row.created_at < now() - interval '60 hours' then
    raise exception 'delete_window_closed' using errcode = 'P0001';
  end if;
  if v_row.media_id is not null then
    update public.media set delete_requested_at = now()
    where id = v_row.media_id and delete_requested_at is null
    returning storage_path into v_path;
  end if;
  update public.messages
  set deleted_at = now(), body = null, link_preview = null, media_id = null, pinned_by = null
  where id = p_message;
  return jsonb_build_object('message_id', v_row.id, 'storage_path', v_path);
end;
$$;
revoke execute on function private.message_delete_for_everyone(uuid) from public, anon, authenticated;

-- Reactions (1370): a toggle, no notification (1316), on a message the caller may read.
create function private.message_react(p_message uuid, p_reaction text)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_row public.messages;
begin
  select * into v_row from public.messages m where m.id = p_message;
  if v_row.id is null or not private.message_visible(v_row.thread_id, v_row.seq, v_row.author_id, v_uid) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  if v_row.deleted_at is not null then
    raise exception 'deleted' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.message_reaction_kinds k where k.value = p_reaction) then
    raise exception 'bad_reaction' using errcode = '22023';
  end if;
  insert into public.message_reactions (message_id, member_id, reaction)
  values (p_message, v_uid, p_reaction)
  on conflict do nothing;
end;
$$;
revoke execute on function private.message_react(uuid, text) from public, anon, authenticated;

create function private.message_unreact(p_message uuid, p_reaction text)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
begin
  delete from public.message_reactions
  where message_id = p_message and member_id = v_uid and reaction = p_reaction;
end;
$$;
revoke execute on function private.message_unreact(uuid, text) from public, anon, authenticated;

-- Pins (1371): a lead or co_lead, one pinned message per thread.
create function private.message_pin(p_message uuid)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_row public.messages;
  v_me public.thread_members;
begin
  select * into v_row from public.messages m where m.id = p_message for update;
  if v_row.id is null then
    raise exception 'no_message' using errcode = '22023';
  end if;
  v_me := private.thread_require_lead(v_row.thread_id, v_uid, true);
  if v_row.deleted_at is not null then
    raise exception 'deleted' using errcode = 'P0001';
  end if;
  update public.messages set pinned_by = null
  where thread_id = v_row.thread_id and pinned_by is not null and id <> p_message;
  update public.messages set pinned_by = v_uid where id = p_message;
end;
$$;
revoke execute on function private.message_pin(uuid) from public, anon, authenticated;

create function private.message_unpin(p_message uuid)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_row public.messages;
  v_me public.thread_members;
begin
  select * into v_row from public.messages m where m.id = p_message for update;
  if v_row.id is null then
    raise exception 'no_message' using errcode = '22023';
  end if;
  v_me := private.thread_require_lead(v_row.thread_id, v_uid, true);
  update public.messages set pinned_by = null where id = p_message;
end;
$$;
revoke execute on function private.message_unpin(uuid) from public, anon, authenticated;

-- A report (1349): on a message the caller may read, not their own, with a reason from the vocabulary.
create function private.message_report(p_message uuid, p_reason text, p_note text)
returns uuid
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_row public.messages;
  v_id uuid;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  select * into v_row from public.messages m where m.id = p_message;
  if v_row.id is null or not private.message_visible(v_row.thread_id, v_row.seq, v_row.author_id, v_uid) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  if v_row.author_id = v_uid then
    raise exception 'own_message' using errcode = '22023';
  end if;
  if not exists (select 1 from public.message_report_reasons r where r.value = p_reason) then
    raise exception 'bad_reason' using errcode = '22023';
  end if;
  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'bad_note' using errcode = '22023';
  end if;
  insert into public.message_reports (message_id, reporter_id, reason, note)
  values (p_message, v_uid, p_reason, v_note)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function private.message_report(uuid, text, text) from public, anon, authenticated;

-- The staff view of a reported message (1350): an admin at aal2 through private.is_admin (1177,
-- 1265), every view written to message_view_audit, the thread's metadata and the one message's text.
create function private.report_message_view(p_report uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_report public.message_reports;
  v_msg public.messages;
  v_thread public.threads;
begin
  if v_uid is null or not private.is_admin() then
    raise exception 'not_staff' using errcode = '42501';
  end if;
  select * into v_report from public.message_reports r where r.id = p_report;
  if v_report.id is null then
    raise exception 'no_report' using errcode = '22023';
  end if;
  insert into public.message_view_audit (report_id, staff_id) values (p_report, v_uid);
  select * into v_msg from public.messages m where m.id = v_report.message_id;
  select * into v_thread from public.threads t where t.id = v_msg.thread_id;
  return jsonb_build_object(
    'report', jsonb_build_object(
      'id', v_report.id, 'reason', v_report.reason, 'note', v_report.note,
      'state', v_report.state, 'created_at', v_report.created_at,
      'reporter', (select m.name from public.members m where m.id = v_report.reporter_id)),
    'thread', jsonb_build_object(
      'id', v_thread.id, 'kind', v_thread.kind, 'name', v_thread.name,
      'created_at', v_thread.created_at, 'last_activity_at', v_thread.last_activity_at,
      'members', (select coalesce(jsonb_agg(m.name order by m.name), '[]'::jsonb)
                  from public.thread_members tm join public.members m on m.id = tm.member_id
                  where tm.thread_id = v_thread.id and tm.state = 'active'),
      'message_count', (select count(*) from public.messages m where m.thread_id = v_thread.id)),
    'message', case when v_msg.id is null then null else jsonb_build_object(
      'id', v_msg.id, 'seq', v_msg.seq, 'kind', v_msg.kind, 'body', v_msg.body,
      'media_id', v_msg.media_id, 'created_at', v_msg.created_at,
      'edited_at', v_msg.edited_at, 'deleted_at', v_msg.deleted_at,
      'author', case when v_msg.author_deleted_at is not null then 'a former member'
                     else (select m.name from public.members m where m.id = v_msg.author_id) end) end);
end;
$$;
revoke execute on function private.report_message_view(uuid) from public, anon, authenticated;
comment on function private.report_message_view(uuid) is
  'The one way staff read a message''s text (Brief 14, ruling 1350): an admin at aal2 (1265), one report, the thread''s kind, members, created, last active and an internal message count, and the one message, with a message_view_audit row written first. Reached through public.messenger_report_view; no policy grants staff a message.';

-- ===================================================================================================
-- D. The member's own thread state: cursors, unread, mute, archive, pins.
-- ===================================================================================================

create function private.thread_delivered_to(p_thread uuid, p_seq bigint)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_me public.thread_members := private.thread_require_active(p_thread, v_uid);
  v_max bigint := coalesce((select max(m.seq) from public.messages m where m.thread_id = p_thread), 0);
begin
  update public.thread_members
  set delivered_seq = greatest(delivered_seq, least(coalesce(p_seq, 0), v_max))
  where thread_id = p_thread and member_id = v_uid;
end;
$$;
revoke execute on function private.thread_delivered_to(uuid, bigint) from public, anon, authenticated;

create function private.thread_read_to(p_thread uuid, p_seq bigint)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_me public.thread_members := private.thread_require_active(p_thread, v_uid);
  v_max bigint := coalesce((select max(m.seq) from public.messages m where m.thread_id = p_thread), 0);
  v_to bigint := least(coalesce(p_seq, 0), v_max);
begin
  update public.thread_members
  set read_seq = greatest(read_seq, v_to),
      delivered_seq = greatest(delivered_seq, v_to),
      last_opened_at = now()
  where thread_id = p_thread and member_id = v_uid;
end;
$$;
revoke execute on function private.thread_read_to(uuid, bigint) from public, anon, authenticated;

-- Mark as unread (1344): the cursor steps back to the seq before the last message.
create function private.thread_mark_unread(p_thread uuid)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_me public.thread_members := private.thread_require_active(p_thread, v_uid);
  v_max bigint := coalesce((select max(m.seq) from public.messages m where m.thread_id = p_thread), 0);
begin
  update public.thread_members
  set read_seq = least(read_seq, greatest(v_max - 1, 0))
  where thread_id = p_thread and member_id = v_uid;
end;
$$;
revoke execute on function private.thread_mark_unread(uuid) from public, anon, authenticated;

-- Mute (1348): a duration from the vocabulary; always is infinity; null clears.
create function private.thread_mute(p_thread uuid, p_duration text)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_me public.thread_members := private.thread_require_active(p_thread, v_uid);
  v_until timestamptz;
  v_dur public.message_mute_durations;
begin
  if p_duration is not null then
    select * into v_dur from public.message_mute_durations d where d.value = p_duration;
    if v_dur.value is null then
      raise exception 'bad_duration' using errcode = '22023';
    end if;
    v_until := case when v_dur.duration is null then 'infinity'::timestamptz else now() + v_dur.duration end;
  end if;
  update public.thread_members set muted_until = v_until
  where thread_id = p_thread and member_id = v_uid;
end;
$$;
revoke execute on function private.thread_mute(uuid, text) from public, anon, authenticated;

create function private.thread_archive(p_thread uuid)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_me public.thread_members := private.thread_require_active(p_thread, v_uid);
begin
  update public.thread_members set archived_at = coalesce(archived_at, now()), pinned_at = null
  where thread_id = p_thread and member_id = v_uid;
end;
$$;
revoke execute on function private.thread_archive(uuid) from public, anon, authenticated;

create function private.thread_unarchive(p_thread uuid)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_me public.thread_members := private.thread_require_active(p_thread, v_uid);
begin
  update public.thread_members set archived_at = null
  where thread_id = p_thread and member_id = v_uid;
end;
$$;
revoke execute on function private.thread_unarchive(uuid) from public, anon, authenticated;

-- Pins (1335, 1371): three per member; pins_full is the word the client renders as "Unpin a
-- conversation to pin this one."
create function private.thread_pin(p_thread uuid)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_me public.thread_members := private.thread_require_active(p_thread, v_uid);
begin
  if v_me.pinned_at is not null then
    return;
  end if;
  perform 1 from public.thread_members tm where tm.member_id = v_uid and tm.pinned_at is not null for update;
  if (select count(*) from public.thread_members tm where tm.member_id = v_uid and tm.pinned_at is not null) >= 3 then
    raise exception 'pins_full' using errcode = 'P0001';
  end if;
  update public.thread_members set pinned_at = now(), archived_at = null
  where thread_id = p_thread and member_id = v_uid;
end;
$$;
revoke execute on function private.thread_pin(uuid) from public, anon, authenticated;

create function private.thread_unpin(p_thread uuid)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_me public.thread_members := private.thread_require_active(p_thread, v_uid);
begin
  update public.thread_members set pinned_at = null
  where thread_id = p_thread and member_id = v_uid;
end;
$$;
revoke execute on function private.thread_unpin(uuid) from public, anon, authenticated;

-- ===================================================================================================
-- E. Search (1338, 1347): inside the viewer's policy scope, optional author, thread and dates.
-- ===================================================================================================
create function private.message_search(
  p_query text,
  p_member uuid,
  p_thread uuid,
  p_before timestamptz,
  p_after timestamptz
)
returns table (thread_id uuid, message_id uuid, seq bigint, created_at timestamptz, headline text)
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_q tsquery;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if p_query is null or char_length(trim(p_query)) < 1 or char_length(p_query) > 200 then
    raise exception 'bad_query' using errcode = '22023';
  end if;
  v_q := websearch_to_tsquery('simple', p_query);
  if v_q is null or numnode(v_q) = 0 then
    return;
  end if;
  return query
  select m.thread_id, m.id, m.seq, m.created_at,
    ts_headline('simple', m.body, v_q, 'MaxWords=24, MinWords=12, MaxFragments=1, StartSel=<b>, StopSel=</b>')
  from public.messages m
  where m.deleted_at is null
    and m.search @@ v_q
    and private.message_visible(m.thread_id, m.seq, m.author_id, v_uid)
    and (p_member is null or m.author_id = p_member)
    and (p_thread is null or m.thread_id = p_thread)
    and (p_before is null or m.created_at < p_before)
    and (p_after is null or m.created_at >= p_after)
  order by m.created_at desc
  limit 100;
end;
$$;
revoke execute on function private.message_search(text, uuid, uuid, timestamptz, timestamptz) from public, anon, authenticated;

-- ===================================================================================================
-- F. The digest line (1339) and the DIA signals (1350, 1373).
-- ===================================================================================================

-- Names of up to three authors of unread messages in threads the member has not muted and has not
-- opened since the newest unread message, as words; null when nothing. Lane A's digest reads it.
create function private.messenger_digest_line(p_member uuid)
returns text
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_names text[];
  v_n integer;
begin
  if p_member is null then
    return null;
  end if;
  with unread as (
    select m.author_id, m.author_deleted_at, m.created_at
    from public.thread_members tm
    join public.threads t on t.id = tm.thread_id
    join public.messages m on m.thread_id = tm.thread_id and m.seq > tm.read_seq
    where tm.member_id = p_member
      and tm.state = 'active'
      and (tm.muted_until is null or tm.muted_until < now())
      and m.author_id is distinct from p_member
      and m.deleted_at is null
      and (t.history_visible_to_new or m.seq > tm.joined_seq)
      and (t.kind <> 'one_to_one' or not private.is_blocked(p_member, m.author_id))
      and (tm.last_opened_at is null or tm.last_opened_at < m.created_at)
  ), authors as (
    select coalesce(mm.name, 'a former member') as name, max(u.created_at) as latest
    from unread u
    left join public.members mm on mm.id = u.author_id
    group by coalesce(mm.name, 'a former member')
  )
  select array_agg(a.name order by a.latest desc), count(*)
  into v_names, v_n
  from authors a;
  if v_n is null or v_n = 0 then
    return null;
  end if;
  if v_n = 1 then
    return v_names[1];
  end if;
  if v_n = 2 then
    return v_names[1] || ' and ' || v_names[2];
  end if;
  if v_n = 3 then
    return v_names[1] || ', ' || v_names[2] || ' and ' || v_names[3];
  end if;
  return v_names[1] || ', ' || v_names[2] || ', ' || v_names[3] || ' and others';
end;
$$;
revoke execute on function private.messenger_digest_line(uuid) from public, anon, authenticated;
comment on function private.messenger_digest_line(uuid) is
  'The names for the daily digest (Brief 14, ruling 1339): up to three authors of unread messages in threads not muted and not opened since the newest unread, then "and others"; null when nothing. Lane A''s digest calls it after 39-A merges; no client role holds execute.';

-- DIA dismissals (1373): persisted here, never in browser storage. The member reads their own.
create table public.messenger_dia_dismissals (
  member_id uuid not null references public.members (id) on delete cascade,
  signal_key text not null check (char_length(signal_key) between 1 and 120),
  dismissed_at timestamptz not null default now(),
  primary key (member_id, signal_key)
);
alter table public.messenger_dia_dismissals enable row level security;
revoke all on table public.messenger_dia_dismissals from public, anon, authenticated;
grant select on table public.messenger_dia_dismissals to authenticated;
grant all on table public.messenger_dia_dismissals to service_role;
create policy messenger_dia_dismissals_owner_select on public.messenger_dia_dismissals
  for select to authenticated
  using (member_id = (select auth.uid()));
create policy messenger_dia_dismissals_service_role on public.messenger_dia_dismissals
  for all to service_role using (true) with check (true);
comment on table public.messenger_dia_dismissals is
  'A member''s dismissals of DIA''s Messenger suggestion lines (Brief 14, ruling 1373), keyed by signal, persisted here and never in browser storage; applied as an anti-join in private.messenger_dia_signals. Personas (1116): member reads own; Space lead, event host and admin deliberately absent (a dismissal is the member''s own); service role all. No client role writes: private.messenger_dia_dismiss is the writer.';
insert into public.admin_catalogue (schema_name, table_name, admin_treatment, admin_reason, dia_treatment, dia_reason) values
  ('public', 'messenger_dia_dismissals', 'exempt',
   'A member''s own dismissals; no console shows them (1373).',
   'member_side', 'DIA reads a dismissal to stay silent on what the member dismissed (1373).');

create function private.messenger_dia_dismiss(p_key text)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
begin
  if p_key is null or char_length(p_key) < 1 or char_length(p_key) > 120 then
    raise exception 'bad_key' using errcode = '22023';
  end if;
  insert into public.messenger_dia_dismissals (member_id, signal_key)
  values (v_uid, p_key)
  on conflict do nothing;
end;
$$;
revoke execute on function private.messenger_dia_dismiss(text) from public, anon, authenticated;

-- Age in words for a signal line: never a number a surface would render as a score.
create function private.messenger_age_words(p_at timestamptz)
returns text
language sql
stable
set search_path to ''
as $$
  select case
    when p_at is null then null
    when p_at > now() - interval '1 day' then 'today'
    when p_at > now() - interval '2 days' then 'yesterday'
    when p_at > now() - interval '7 days' then 'this week'
    when p_at > now() - interval '14 days' then 'last week'
    when p_at > now() - interval '30 days' then 'this month'
    else 'a while ago'
  end;
$$;
revoke execute on function private.messenger_age_words(timestamptz) from public, anon, authenticated;

-- Structure only (1350): the oldest pending request's sender and age in words, and one quiet
-- one-to-one thread with a member the caller shares an attested event with. Never body text. At most
-- two rows, dismissals anti-joined (1373).
create function private.messenger_dia_signals(p_member uuid)
returns table (signal_key text, line text, thread_id uuid, request_id uuid)
language plpgsql
stable
security definer
set search_path to ''
as $$
begin
  if p_member is null or p_member <> auth.uid() then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  return query
  (
    select 'request:' || r.id::text,
      m.name || ' sent you a message request ' || private.messenger_age_words(r.created_at),
      null::uuid, r.id
    from public.message_requests r
    join public.members m on m.id = r.sender_id
    where r.recipient_id = p_member and r.state = 'pending'
      and not private.is_blocked(p_member, r.sender_id)
      and not exists (
        select 1 from public.messenger_dia_dismissals d
        where d.member_id = p_member and d.signal_key = 'request:' || r.id::text)
    order by r.created_at asc
    limit 1
  )
  union all
  (
    select 'quiet:' || t.id::text,
      'You and ' || om.name || ' were both at ' || e.title || ' and have not spoken in a while',
      t.id, null::uuid
    from public.thread_members me
    join public.threads t on t.id = me.thread_id and t.kind = 'one_to_one'
    join public.thread_members other on other.thread_id = t.id and other.member_id <> p_member and other.state = 'active'
    join public.members om on om.id = other.member_id
    join lateral (
      select ev.title, greatest(xa.attested_at, xb.attested_at) as at
      from public.attestations xa
      join public.attestations xb on xb.object_kind = 'event' and xb.object_id = xa.object_id
      join public.events ev on ev.id = xa.object_id
      where xa.object_kind = 'event'
        and xa.accepted_at is not null and xb.accepted_at is not null
        and p_member in (xa.member_id, xa.attester_member_id)
        and other.member_id in (xb.member_id, xb.attester_member_id)
      order by greatest(xa.attested_at, xb.attested_at) desc
      limit 1
    ) e on true
    where me.member_id = p_member and me.state = 'active'
      and (me.muted_until is null or me.muted_until < now())
      and not private.is_blocked(p_member, other.member_id)
      and t.last_activity_at < now() - interval '14 days'
      and not exists (
        select 1 from public.messages m where m.thread_id = t.id and m.created_at > now() - interval '14 days')
      and not exists (
        select 1 from public.messenger_dia_dismissals d
        where d.member_id = p_member and d.signal_key = 'quiet:' || t.id::text)
    order by e.at desc
    limit 1
  );
end;
$$;
revoke execute on function private.messenger_dia_signals(uuid) from public, anon, authenticated;
comment on function private.messenger_dia_signals(uuid) is
  'DIA''s Messenger suggestions, structure only (Brief 14, ruling 1350): the oldest pending request''s sender and age in words, and one quiet one_to_one thread with a member the caller shares an attested event with. At most two rows, never text, dismissals anti-joined (1373). Reached through public.messenger_dia_signals.';

-- ===================================================================================================
-- G. The public wrappers: the names a client calls, granted to authenticated only.
-- ===================================================================================================
create function public.messenger_settings()
returns public.member_messaging_settings
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_row public.member_messaging_settings;
begin
  select * into v_row from public.member_messaging_settings s where s.member_id = v_uid;
  return v_row;
end;
$$;
create function public.messenger_settings_set(p_receipts boolean default null, p_link_previews boolean default null, p_media_notice_seen boolean default null)
returns public.member_messaging_settings
language sql volatile security definer set search_path to ''
as $$ select private.messaging_settings_set(p_receipts, p_link_previews, coalesce(p_media_notice_seen, false)); $$;
create function public.messenger_open_one_to_one(p_other uuid)
returns uuid language sql volatile security definer set search_path to ''
as $$ select private.thread_open_one_to_one(p_other); $$;
create function public.messenger_request_send(p_recipient uuid, p_body text)
returns public.message_requests language sql volatile security definer set search_path to ''
as $$ select private.message_request_send(p_recipient, p_body); $$;
create function public.messenger_request_accept(p_request uuid)
returns uuid language sql volatile security definer set search_path to ''
as $$ select private.message_request_accept(p_request); $$;
create function public.messenger_request_decline(p_request uuid)
returns void language sql volatile security definer set search_path to ''
as $$ select private.message_request_decline(p_request); $$;
create function public.messenger_request_block(p_request uuid)
returns void language sql volatile security definer set search_path to ''
as $$ select private.message_request_block(p_request); $$;
create function public.messenger_thread_create_group(p_name text, p_member_ids uuid[])
returns uuid language sql volatile security definer set search_path to ''
as $$ select private.thread_create_group(p_name, p_member_ids); $$;
create function public.messenger_thread_invite(p_thread uuid, p_member uuid)
returns void language sql volatile security definer set search_path to ''
as $$ select private.thread_invite(p_thread, p_member); $$;
create function public.messenger_thread_invite_accept(p_thread uuid)
returns void language sql volatile security definer set search_path to ''
as $$ select private.thread_invite_accept(p_thread); $$;
create function public.messenger_thread_invite_decline(p_thread uuid)
returns void language sql volatile security definer set search_path to ''
as $$ select private.thread_invite_decline(p_thread); $$;
create function public.messenger_thread_leave(p_thread uuid)
returns void language sql volatile security definer set search_path to ''
as $$ select private.thread_leave(p_thread); $$;
create function public.messenger_thread_remove(p_thread uuid, p_member uuid)
returns void language sql volatile security definer set search_path to ''
as $$ select private.thread_remove(p_thread, p_member); $$;
create function public.messenger_thread_set_history(p_thread uuid, p_visible boolean)
returns void language sql volatile security definer set search_path to ''
as $$ select private.thread_set_history(p_thread, p_visible); $$;
create function public.messenger_thread_set_role(p_thread uuid, p_member uuid, p_role public.thread_member_role)
returns void language sql volatile security definer set search_path to ''
as $$ select private.thread_set_role(p_thread, p_member, p_role); $$;
-- The Space page's entry: a member holding an active role in the Space syncs and opens its thread.
create function public.messenger_space_thread_sync(p_space uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
begin
  if not exists (
    select 1 from public.space_roles r where r.space_id = p_space and r.member_id = v_uid and r.status = 'active'
  ) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  return private.space_thread_sync(p_space);
end;
$$;
create function public.messenger_event_thread_open(p_event uuid)
returns uuid language sql volatile security definer set search_path to ''
as $$ select private.event_thread_open(p_event); $$;
create function public.messenger_send(
  p_thread uuid,
  p_client_id uuid,
  p_body text default null,
  p_kind public.message_kind default 'text',
  p_reply_to uuid default null,
  p_media uuid default null,
  p_mentions uuid[] default null,
  p_link_preview jsonb default null
)
returns public.messages language sql volatile security definer set search_path to ''
as $$ select private.message_send(p_thread, p_client_id, p_body, p_kind, p_reply_to, p_media, p_mentions, p_link_preview); $$;
create function public.messenger_edit(p_message uuid, p_body text)
returns public.messages language sql volatile security definer set search_path to ''
as $$ select private.message_edit(p_message, p_body); $$;
create function public.messenger_delete(p_message uuid)
returns jsonb language sql volatile security definer set search_path to ''
as $$ select private.message_delete_for_everyone(p_message); $$;
create function public.messenger_react(p_message uuid, p_reaction text)
returns void language sql volatile security definer set search_path to ''
as $$ select private.message_react(p_message, p_reaction); $$;
create function public.messenger_unreact(p_message uuid, p_reaction text)
returns void language sql volatile security definer set search_path to ''
as $$ select private.message_unreact(p_message, p_reaction); $$;
create function public.messenger_pin_message(p_message uuid)
returns void language sql volatile security definer set search_path to ''
as $$ select private.message_pin(p_message); $$;
create function public.messenger_unpin_message(p_message uuid)
returns void language sql volatile security definer set search_path to ''
as $$ select private.message_unpin(p_message); $$;
create function public.messenger_delivered_to(p_thread uuid, p_seq bigint)
returns void language sql volatile security definer set search_path to ''
as $$ select private.thread_delivered_to(p_thread, p_seq); $$;
create function public.messenger_read_to(p_thread uuid, p_seq bigint)
returns void language sql volatile security definer set search_path to ''
as $$ select private.thread_read_to(p_thread, p_seq); $$;
create function public.messenger_mark_unread(p_thread uuid)
returns void language sql volatile security definer set search_path to ''
as $$ select private.thread_mark_unread(p_thread); $$;
create function public.messenger_mute(p_thread uuid, p_duration text default null)
returns void language sql volatile security definer set search_path to ''
as $$ select private.thread_mute(p_thread, p_duration); $$;
create function public.messenger_archive(p_thread uuid)
returns void language sql volatile security definer set search_path to ''
as $$ select private.thread_archive(p_thread); $$;
create function public.messenger_unarchive(p_thread uuid)
returns void language sql volatile security definer set search_path to ''
as $$ select private.thread_unarchive(p_thread); $$;
create function public.messenger_pin_thread(p_thread uuid)
returns void language sql volatile security definer set search_path to ''
as $$ select private.thread_pin(p_thread); $$;
create function public.messenger_unpin_thread(p_thread uuid)
returns void language sql volatile security definer set search_path to ''
as $$ select private.thread_unpin(p_thread); $$;
create function public.messenger_report(p_message uuid, p_reason text, p_note text default null)
returns uuid language sql volatile security definer set search_path to ''
as $$ select private.message_report(p_message, p_reason, p_note); $$;
create function public.messenger_report_view(p_report uuid)
returns jsonb language sql volatile security definer set search_path to ''
as $$ select private.report_message_view(p_report); $$;
create function public.messenger_search(
  p_query text,
  p_member uuid default null,
  p_thread uuid default null,
  p_before timestamptz default null,
  p_after timestamptz default null
)
returns table (thread_id uuid, message_id uuid, seq bigint, created_at timestamptz, headline text)
language sql stable security definer set search_path to ''
as $$ select * from private.message_search(p_query, p_member, p_thread, p_before, p_after); $$;
create function public.messenger_dia_dismiss(p_key text)
returns void language sql volatile security definer set search_path to ''
as $$ select private.messenger_dia_dismiss(p_key); $$;
create function public.messenger_dia_signals()
returns table (signal_key text, line text, thread_id uuid, request_id uuid)
language sql stable security definer set search_path to ''
as $$ select * from private.messenger_dia_signals(auth.uid()); $$;

do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'public.messenger_settings()',
    'public.messenger_settings_set(boolean, boolean, boolean)',
    'public.messenger_open_one_to_one(uuid)',
    'public.messenger_request_send(uuid, text)',
    'public.messenger_request_accept(uuid)',
    'public.messenger_request_decline(uuid)',
    'public.messenger_request_block(uuid)',
    'public.messenger_thread_create_group(text, uuid[])',
    'public.messenger_thread_invite(uuid, uuid)',
    'public.messenger_thread_invite_accept(uuid)',
    'public.messenger_thread_invite_decline(uuid)',
    'public.messenger_thread_leave(uuid)',
    'public.messenger_thread_remove(uuid, uuid)',
    'public.messenger_thread_set_history(uuid, boolean)',
    'public.messenger_thread_set_role(uuid, uuid, public.thread_member_role)',
    'public.messenger_space_thread_sync(uuid)',
    'public.messenger_event_thread_open(uuid)',
    'public.messenger_send(uuid, uuid, text, public.message_kind, uuid, uuid, uuid[], jsonb)',
    'public.messenger_edit(uuid, text)',
    'public.messenger_delete(uuid)',
    'public.messenger_react(uuid, text)',
    'public.messenger_unreact(uuid, text)',
    'public.messenger_pin_message(uuid)',
    'public.messenger_unpin_message(uuid)',
    'public.messenger_delivered_to(uuid, bigint)',
    'public.messenger_read_to(uuid, bigint)',
    'public.messenger_mark_unread(uuid)',
    'public.messenger_mute(uuid, text)',
    'public.messenger_archive(uuid)',
    'public.messenger_unarchive(uuid)',
    'public.messenger_pin_thread(uuid)',
    'public.messenger_unpin_thread(uuid)',
    'public.messenger_report(uuid, text, text)',
    'public.messenger_report_view(uuid)',
    'public.messenger_search(text, uuid, uuid, timestamptz, timestamptz)',
    'public.messenger_dia_dismiss(text)',
    'public.messenger_dia_signals()'
  ] loop
    execute format('revoke execute on function %s from public, anon', v_fn);
    execute format('grant execute on function %s to authenticated, service_role', v_fn);
  end loop;
end;
$$;

-- ===================================================================================================
-- H. The read projections (Guardrail 1): one view per surface, security invoker, so every row comes
--    through the viewer's own policies and the helpers above answer only what a thread member may see.
--    No count column anywhere (82, 1317).
-- ===================================================================================================

-- The list: the caller's active and invited threads.
create view public.messenger_threads_view
with (security_invoker = true)
as
select
  t.id as thread_id,
  t.kind,
  case when t.kind = 'one_to_one' then other.core ->> 'name' else t.name end as name,
  case when t.kind = 'one_to_one' then other.core ->> 'headline' end as headline,
  case when t.kind = 'one_to_one' then other.core ->> 'avatar_path' end as avatar_path,
  case when t.kind = 'one_to_one' then other.member_id end as other_member_id,
  names.names -> 'names' as member_names,
  coalesce((names.names ->> 'others')::boolean, false) as others,
  case
    when last.id is null then null
    when last.deleted_at is not null then ''
    when last.kind = 'voice' then 'Voice note'
    when last.kind = 'media' then 'Media'
    else left(last.body, 140)
  end as last_line,
  last.kind as last_kind,
  last.author_id as last_author_id,
  last.seq as last_seq,
  t.last_activity_at,
  (tm.state = 'active' and last.id is not null and tm.read_seq < last.seq) as unread,
  (tm.muted_until is not null and tm.muted_until > now()) as muted,
  tm.archived_at is not null as archived,
  tm.pinned_at is not null as pinned,
  tm.pinned_at,
  tm.state = 'invited' as invited,
  tm.role,
  tm.state,
  tm.read_seq,
  tm.delivered_seq,
  t.anchor_kind,
  t.anchor_id,
  t.parent_thread_id,
  t.history_visible_to_new,
  t.created_at
from public.thread_members tm
join public.threads t on t.id = tm.thread_id
left join lateral (
  select o.member_id, private.messenger_member_core(o.member_id) as core
  from public.thread_members o
  where o.thread_id = t.id and o.member_id <> tm.member_id and t.kind = 'one_to_one'
  limit 1
) other on true
left join lateral (
  select private.messenger_names(
    (select array_agg(o.member_id order by o.joined_at nulls last, o.member_id)
     from public.thread_members o
     where o.thread_id = t.id and o.member_id <> tm.member_id and o.state = 'active')) as names
) names on true
left join lateral (
  select m.id, m.seq, m.kind, m.body, m.deleted_at, m.author_id
  from public.messages m
  where m.thread_id = t.id
  order by m.seq desc
  limit 1
) last on true
where tm.member_id = (select auth.uid())
  and tm.state in ('active', 'invited');

revoke all on public.messenger_threads_view from public, anon;
grant select on public.messenger_threads_view to authenticated, service_role;
comment on view public.messenger_threads_view is
  'The Messenger list, one row per thread the caller is active or invited in (Brief 14; rulings 1317, 1335, 1339, 1348): kind, name (the other member''s for a one_to_one), member names up to three then others, the last line (blank when deleted, a word for voice or media), unread, muted, archived, pinned, invited. Security invoker; no count column.';

-- The thread: messages the caller may read, with author, reactions, ticks and read-by.
create view public.messenger_messages_view
with (security_invoker = true)
as
select
  m.id as message_id,
  m.thread_id,
  m.seq,
  m.author_id,
  case
    when m.author_deleted_at is not null then 'a former member'
    else author.core ->> 'name'
  end as author_name,
  case when m.author_deleted_at is null then author.core ->> 'avatar_path' end as author_avatar_path,
  m.author_deleted_at is not null as former_member,
  case when m.deleted_at is not null or blocked.yes then null else m.body end as body,
  m.kind,
  case when m.deleted_at is not null or blocked.yes then null else m.media_id end as media_id,
  case when m.deleted_at is not null or blocked.yes then null else m.link_preview end as link_preview,
  reply.summary as reply_to,
  coalesce(reactions.list, '[]'::jsonb) as reactions,
  m.edited_at is not null as edited,
  m.deleted_at is not null as deleted,
  m.pinned_by is not null as pinned,
  blocked.yes as blocked,
  (m.author_id = (select auth.uid())) as own,
  case
    when m.author_id is distinct from (select auth.uid()) then null
    when others.n = 0 then 1::smallint
    when others.undelivered > 0 then 1::smallint
    when private.receipts_on((select auth.uid())) and others.unread_or_off = 0 then 3::smallint
    else 2::smallint
  end as tick,
  case
    when m.author_id is distinct from (select auth.uid())
      or t.kind = 'one_to_one'
      or others.n > 20
      or not private.receipts_on((select auth.uid()))
    then null
    else readers.names -> 'names'
  end as read_by,
  case
    when m.author_id is distinct from (select auth.uid())
      or t.kind = 'one_to_one'
      or others.n > 20
      or not private.receipts_on((select auth.uid()))
    then false
    else coalesce((readers.names ->> 'others')::boolean, false)
  end as read_by_others,
  mentions.ids as mentions,
  m.created_at,
  m.edited_at
from public.messages m
join public.threads t on t.id = m.thread_id
left join lateral (
  select private.messenger_member_core(m.author_id) as core
) author on true
left join lateral (
  select (t.kind <> 'one_to_one' and private.viewer_blocks(m.author_id)) as yes
) blocked on true
left join lateral (
  select jsonb_build_object(
    'message_id', r.id,
    'seq', r.seq,
    'author_name', case when r.author_deleted_at is not null then 'a former member'
                        else private.messenger_member_core(r.author_id) ->> 'name' end,
    'kind', r.kind,
    'deleted', r.deleted_at is not null,
    'line', case
      when r.deleted_at is not null or private.viewer_blocks(r.author_id) then null
      when r.kind = 'voice' then 'Voice note'
      when r.kind = 'media' then 'Media'
      else left(r.body, 120) end) as summary
  from public.messages r
  where r.id = m.reply_to
) reply on true
left join lateral (
  select jsonb_agg(jsonb_build_object(
    'reaction', x.reaction,
    'names', x.names -> 'names',
    'others', coalesce((x.names ->> 'others')::boolean, false),
    'own', x.own) order by x.position) as list
  from (
    select k.value as reaction, k.position,
      private.messenger_names(array_agg(rx.member_id order by rx.created_at)) as names,
      bool_or(rx.member_id = (select auth.uid())) as own
    from public.message_reactions rx
    join public.message_reaction_kinds k on k.value = rx.reaction
    where rx.message_id = m.id
    group by k.value, k.position
  ) x
) reactions on true
left join lateral (
  select count(*) as n,
    count(*) filter (where o.delivered_seq < m.seq) as undelivered,
    count(*) filter (where o.read_seq < m.seq or not private.receipts_on(o.member_id)) as unread_or_off
  from public.thread_members o
  where o.thread_id = m.thread_id and o.member_id <> m.author_id and o.state = 'active'
) others on true
left join lateral (
  select private.messenger_names(
    (select array_agg(o.member_id order by o.member_id)
     from public.thread_members o
     where o.thread_id = m.thread_id and o.member_id <> m.author_id and o.state = 'active'
       and o.read_seq >= m.seq and private.receipts_on(o.member_id))) as names
) readers on true
left join lateral (
  select array_agg(mn.member_id) as ids from public.message_mentions mn where mn.message_id = m.id
) mentions on true;

revoke all on public.messenger_messages_view from public, anon;
grant select on public.messenger_messages_view to authenticated, service_role;
comment on view public.messenger_messages_view is
  'The thread''s messages for the caller (Brief 14; rulings 1343, 1345, 1349, 1370, 1371): author name and avatar (a former member once the account is gone), body (null when deleted, and null with blocked true when the viewer blocks the author in a group), reply summary, reactions as words with names up to three then others, edited, deleted, pinned, own, tick for own messages (1 stored, 2 delivered by every other member, 3 read by every other member with receipts on when the viewer''s are on), and read_by names for groups of 20 or fewer. Security invoker; no count column.';

-- The requests: pending and declined requests to the caller.
create view public.messenger_requests_view
with (security_invoker = true)
as
select
  r.id as request_id,
  r.sender_id,
  sender.core ->> 'name' as sender_name,
  sender.core ->> 'handle' as sender_handle,
  sender.core ->> 'headline' as sender_headline,
  sender.core ->> 'avatar_path' as sender_avatar_path,
  sender.core ->> 'stance_label' as sender_stance,
  r.body,
  r.state,
  r.created_at,
  r.decided_at,
  mutuals.j -> 'names' as mutual_names,
  coalesce((mutuals.j ->> 'others')::boolean, false) as mutual_others,
  spaces.j -> 'names' as shared_space_names,
  coalesce((spaces.j ->> 'others')::boolean, false) as shared_space_others
from public.message_requests r
left join lateral (select private.messenger_member_core(r.sender_id) as core) sender on true
left join lateral (select private.messenger_mutuals(r.sender_id) as j) mutuals on true
left join lateral (select private.messenger_shared_spaces(r.sender_id) as j) spaces on true
where r.recipient_id = (select auth.uid())
  and r.state in ('pending', 'declined');

revoke all on public.messenger_requests_view from public, anon;
grant select on public.messenger_requests_view to authenticated, service_role;
comment on view public.messenger_requests_view is
  'The Requests section (Brief 14, ruling 1341): pending and declined requests to the caller with the sender''s name, headline and stance label (187), the one message, mutual connections and shared Spaces as names up to three then others. Security invoker; no count column; no read state.';

-- ===================================================================================================
-- I. The live arms (382): the wrappers are what the arms call as authenticated; nothing further.
-- ===================================================================================================
