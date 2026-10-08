-- Handoff 55-A (39-A), File D: the one writer of public.notifications (rulings 1319, 1518), its two
-- siblings, the three member functions (1322, 1521) and the dot (82). Closes N1's writer, N3, and
-- N10's write side.
--
--   private.notify                 the only function that inserts a row. Refuses an unknown kind,
--                                  writes nothing for a member acting on themselves or across a block
--                                  either way (1518), resolves the C from the kind or from the
--                                  object's context (1325), folds a grouping kind into the open row
--                                  (1317), and enqueues mail by File E's rule (1320, 1520).
--   private.notification_retract   deletes the recipient's rows of a kind about an object.
--   private.notification_settle    marks them read, and seen, because the recipient acted on them.
--   notifications_mark_seen        the caller's unseen rows become seen; the panel calls it on open.
--   notifications_mark_all_read    the caller's unread rows become read; its control is held (1521).
--   notifications_dot              existence only (82): an unseen row of a kind that renders, from a
--                                  member the caller does not block either way.
--
-- Each engine's own write function calls the writer in its own transaction, never a trigger (1002,
-- 1319): send_introduction, respond_to_request (whose trigger on_connection_request_accepted and its
-- function private.notify_connection_accepted are dropped here), withdraw_request,
-- purge_expired_introductions (471), invite_event_party, respond_to_event_role (1519; its in-place
-- kind rewrite is gone), remove_event_party, message_request_send, message_request_accept,
-- message_request_decline and message_request_block (1315, 1339; public.messenger_request_block wraps
-- the last and is unchanged), thread_invite, thread_invite_accept, thread_invite_decline and
-- thread_remove. Every body is the live definition read through pg_get_functiondef in Session 55,
-- changed only where it now calls the writer or a sibling.
--
-- Two readings the handoff left open, taken here and named in the PR:
--   settle sets seen_at with read_at: a request the member answered from Connect is not news, so it
--     must not hold the bell's dot.
--   remove_event_party retracts the host's role_accepted row about the party as well as the member's
--     role_invitation, because the object it points at is deleted with it; and thread_remove retracts
--     an invited member's thread_invitation, the same act on a thread.
--
-- plpgsql bodies name the anchor values File A adds; they are evaluated when called, never in the
-- transaction that adds them. private.notify enqueues into the tables File E creates, by the same
-- rule. A community_group thread has no anchor, so its C is unruled and its invitation writes nothing
-- (held).
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963).

-- ---------------------------------------------------------------------------------------------------
-- 1. The C of a context-derived kind (1325).
-- ---------------------------------------------------------------------------------------------------

create function private.notification_c_for(p_object_kind public.anchor_kind, p_object_id uuid)
returns public.c_category
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
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
      select t.anchor_kind, t.anchor_id into v_anchor_kind, v_anchor_id
      from public.threads t where t.id = p_object_id;
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
  'The C a context-derived notification kind takes from its object (1325): an event is Convene, a Space is Collaborate, a thread is its anchor''s. Null where the context names no C, which private.notify refuses.';

-- ---------------------------------------------------------------------------------------------------
-- 2. The writer (1319, 1518).
-- ---------------------------------------------------------------------------------------------------

create function private.notify(
  p_recipient uuid,
  p_kind text,
  p_actor_kind public.anchor_kind,
  p_actor_id uuid,
  p_object_kind public.anchor_kind,
  p_object_id uuid,
  p_group_key text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_k public.notification_kinds;
  v_c public.c_category;
  v_id uuid;
  v_mode text;
  v_tz text;
  v_local timestamp;
  v_next timestamp;
  v_due timestamptz;
begin
  -- 1. A kind with no row.
  select * into v_k from public.notification_kinds k where k.kind = p_kind;
  if v_k.kind is null then
    raise exception 'notify: unknown kind %', coalesce(p_kind, '(null)') using errcode = '22023';
  end if;
  if p_recipient is null then
    raise exception 'notify: a recipient is required' using errcode = '22023';
  end if;

  -- 2. Nothing for a member acting on themselves, or across a block either way (1518).
  if p_actor_kind::text = 'member'
     and (p_actor_id = p_recipient or private.is_blocked(p_recipient, p_actor_id)) then
    return null;
  end if;

  -- 3. The C: the kind's, or the object's context (1325).
  v_c := case when v_k.c_from_object
              then private.notification_c_for(p_object_kind, p_object_id)
              else v_k.c end;
  if v_c is null then
    raise exception 'notify: no C for kind % on this object', p_kind using errcode = '22023';
  end if;

  -- 4. A grouping kind folds into the recipient's open row under the same key (1317).
  if v_k.groups and p_group_key is not null then
    update public.notifications n
    set grouped_actor_ids = case
          when p_actor_id is null
            or p_actor_id = n.actor_id
            or p_actor_id = any (n.grouped_actor_ids) then n.grouped_actor_ids
          else n.grouped_actor_ids || p_actor_id
        end,
        updated_at = now(),
        seen_at = null
    where n.id = (
      select g.id
      from public.notifications g
      where g.recipient_member_id = p_recipient
        and g.kind = p_kind
        and g.group_key = p_group_key
        and g.read_at is null
        and g.created_at > now() - v_k.group_window
      order by g.created_at desc
      limit 1
      for update)
    returning n.id into v_id;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  -- 5. A new row.
  insert into public.notifications
    (recipient_member_id, kind, c_category, actor_kind, actor_id, object_kind, object_id, group_key)
  values
    (p_recipient, p_kind, v_c, p_actor_kind, p_actor_id, p_object_kind, p_object_id,
     case when v_k.groups then p_group_key end)
  returning id into v_id;

  -- 6. Mail, by File E's rule (1320, 1520): only a kind with both its subject and its line; the
  --    member's preference for the row's C, else the kind's default; a transactional kind is
  --    immediate whatever the preference; off writes nothing. A digest is due at the next 08:00 in
  --    the member's own zone, UTC where they have none (held until ruled).
  if v_k.email_subject is not null and v_k.email_line is not null then
    if v_k.transactional then
      v_mode := 'immediate';
    else
      select p.mode into v_mode
      from public.notification_preferences p
      where p.member_id = p_recipient and p.c = v_c and p.channel = 'email';
      v_mode := coalesce(v_mode, v_k.email_default);
    end if;
    if v_mode in ('immediate', 'digest') then
      if v_mode = 'immediate' then
        v_due := now();
      else
        select m.local_tz into v_tz from public.members m where m.id = p_recipient;
        if v_tz is null
           or not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = v_tz) then
          v_tz := 'UTC';
        end if;
        v_local := now() at time zone v_tz;
        v_next := date_trunc('day', v_local) + interval '8 hours';
        if v_next <= v_local then
          v_next := v_next + interval '1 day';
        end if;
        v_due := v_next at time zone v_tz;
      end if;
      insert into private.notification_outbox (notification_id, member_id, channel, mode, due_at)
      values (v_id, p_recipient, 'email', v_mode, v_due);
    end if;
  end if;

  return v_id;
end;
$$;

revoke all on function private.notify(uuid, text, public.anchor_kind, uuid, public.anchor_kind, uuid, text)
  from public, anon, authenticated;

comment on function private.notify(uuid, text, public.anchor_kind, uuid, public.anchor_kind, uuid, text) is
  'The one writer of public.notifications (handoff 55-A, rulings 1319, 1518), called inside each engine''s own write function and never from a client or a trigger. Raises 22023 for a kind with no notification_kinds row or a C it cannot resolve; returns null and writes nothing for a member acting on themselves or across a block either way; folds a grouping kind into the open row under its key (1317); otherwise inserts, enqueues mail by the kind''s rule (1320, 1520) and returns the new id. No client role may execute it.';

-- ---------------------------------------------------------------------------------------------------
-- 3. The siblings: retract and settle.
-- ---------------------------------------------------------------------------------------------------

create function private.notification_retract(
  p_recipient uuid,
  p_kind text,
  p_object_kind public.anchor_kind,
  p_object_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
begin
  delete from public.notifications n
  where n.recipient_member_id = p_recipient
    and n.kind = p_kind
    and n.object_kind = p_object_kind
    and n.object_id = p_object_id;
end;
$$;

revoke all on function private.notification_retract(uuid, text, public.anchor_kind, uuid)
  from public, anon, authenticated;

comment on function private.notification_retract(uuid, text, public.anchor_kind, uuid) is
  'Deletes the recipient''s rows of one kind about one object (handoff 55-A): a request withdrawn, declined, expired or removed takes its notification with it (157, 471). Outbox rows go by cascade.';

create function private.notification_settle(
  p_recipient uuid,
  p_kind text,
  p_object_kind public.anchor_kind,
  p_object_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
begin
  update public.notifications n
  set read_at = coalesce(n.read_at, now()),
      seen_at = coalesce(n.seen_at, now())
  where n.recipient_member_id = p_recipient
    and n.kind = p_kind
    and n.object_kind = p_object_kind
    and n.object_id = p_object_id
    and (n.read_at is null or n.seen_at is null);
end;
$$;

revoke all on function private.notification_settle(uuid, text, public.anchor_kind, uuid)
  from public, anon, authenticated;

comment on function private.notification_settle(uuid, text, public.anchor_kind, uuid) is
  'Marks the recipient''s rows of one kind about one object read, and seen, because the recipient has acted on the object (handoff 55-A): an accepted request stays in the list without its weight and holds no dot.';

-- ---------------------------------------------------------------------------------------------------
-- 4. The member's own marks (1322, 1521) and the dot (82).
-- ---------------------------------------------------------------------------------------------------

create function public.notifications_mark_seen()
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'notifications_mark_seen: not signed in' using errcode = '42501';
  end if;
  update public.notifications n
  set seen_at = now()
  where n.recipient_member_id = v_uid and n.seen_at is null;
end;
$$;

revoke all on function public.notifications_mark_seen() from public, anon;
grant execute on function public.notifications_mark_seen() to authenticated;

comment on function public.notifications_mark_seen() is
  'The caller''s unseen rows become seen (handoff 55-A, rulings 1322, 1521). The panel calls it when it opens, which clears the bell''s dot; each row keeps its unread weight until it is opened.';

create function public.notifications_mark_all_read()
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'notifications_mark_all_read: not signed in' using errcode = '42501';
  end if;
  update public.notifications n
  set read_at = now()
  where n.recipient_member_id = v_uid and n.read_at is null;
end;
$$;

revoke all on function public.notifications_mark_all_read() from public, anon;
grant execute on function public.notifications_mark_all_read() to authenticated;

comment on function public.notifications_mark_all_read() is
  'The caller''s unread rows become read (handoff 55-A, rulings 1322, 1521). Its control in the panel is held for the Chat/Design queue; nothing in the app calls it yet.';

create function public.notifications_dot()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1
    from public.notifications n
    join public.notification_kinds k on k.kind = n.kind
    where n.recipient_member_id = auth.uid()
      and n.seen_at is null
      and k.renders
      and not (n.actor_kind = 'member' and private.is_blocked(n.recipient_member_id, n.actor_id))
  );
$$;

revoke all on function public.notifications_dot() from public, anon;
grant execute on function public.notifications_dot() to authenticated;

comment on function public.notifications_dot() is
  'Whether the bell shows its dot (handoff 55-A, rulings 82, 1322): one of the caller''s rows is unseen, its kind renders, and it passes the select policy''s block test. Existence only, never a count.';

-- ---------------------------------------------------------------------------------------------------
-- 5. Connect (461, 471, 157). The trigger that wrote connection_accepted goes; respond_to_request
--    writes it in its own transaction.
-- ---------------------------------------------------------------------------------------------------

create or replace function public.send_introduction(p_recipient uuid, p_message text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_msg text := btrim(coalesce(p_message, ''));
  v_name text;
  v_id uuid;
begin
  if v_uid is null then raise exception 'send_introduction: not signed in' using errcode = '42501'; end if;
  if p_recipient is null or p_recipient = v_uid then
    raise exception 'send_introduction: recipient required' using errcode = '22023';
  end if;
  -- Ruling 401 (under 417): the message is one short optional note. The profile's Connect entry
  -- sends none; Connect's own sheet still asks for one on the client. The cap stands.
  if length(v_msg) > 300 then
    raise exception 'An introduction needs a message of up to 300 characters.' using errcode = '22023';
  end if;
  -- Ruling 442 (F23): a ceiling per member on introductions, in words, never a number to the client.
  if not private.rate_limit(v_uid, 'send_introduction', interval '1 hour', 20) then
    raise exception 'Too many introductions for now. Try again later.' using errcode = 'P0001';
  end if;
  select m.name into v_name from public.members m where m.id = p_recipient;
  if v_name is null then raise exception 'send_introduction: not available' using errcode = '42501'; end if;
  -- Ruling 213: a Private member who is not already a connection has no card to send from, so an
  -- introduction to them is refused. It joins the block and the window in the one refusal every
  -- other condition already shares, so the caller cannot work out which condition fired.
  -- Ruling 229: the gate reads the outward state too. A sender who withdrew inside the window gave
  -- up their turn, so a re-send is refused with the same one message, and the write path cannot be
  -- used as an oracle for a state the surfaces have made identical.
  if private.is_blocked(v_uid, p_recipient)
     or not private.admit_member(p_recipient, v_uid)
     or not private.is_onboarded(p_recipient)
     or private.relationship_display(v_uid, p_recipient) <> 'none' then
    raise exception 'send_introduction: not available' using errcode = '42501';
  end if;
  insert into public.connection_requests (from_member_id, to_member_id, to_name, why, message, status)
  values (v_uid, p_recipient, v_name, nullif(v_msg, ''), v_msg, 'pending')
  returning id into v_id;
  -- 461, N1: the recipient hears of the request, in this transaction (1319).
  perform private.notify(p_recipient, 'connection_request', 'member', v_uid, 'connection_request', v_id);
  return v_id;
end;
$$;

create or replace function public.respond_to_request(p_sender uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'respond_to_request: not signed in' using errcode = '42501'; end if;
  update public.connection_requests c
  set status = case when coalesce(p_accept, false) then 'accepted'::public.request_status else 'declined'::public.request_status end,
      responded_at = now()
  where c.from_member_id = p_sender and c.to_member_id = v_uid and c.status = 'pending'
  returning c.id into v_id;
  if v_id is null then raise exception 'respond_to_request: no request waiting' using errcode = 'P0002'; end if;
  if coalesce(p_accept, false) then
    -- The recipient's own request row is settled, and the sender hears of the acceptance (1319).
    perform private.notification_settle(v_uid, 'connection_request', 'connection_request', v_id);
    perform private.notify(p_sender, 'connection_accepted', 'member', v_uid, 'connection_request', v_id);
  else
    -- 157: a decline reaches nobody; the recipient's row goes with it.
    perform private.notification_retract(v_uid, 'connection_request', 'connection_request', v_id);
  end if;
end;
$$;

drop trigger if exists on_connection_request_accepted on public.connection_requests;

drop function if exists private.notify_connection_accepted();

create or replace function public.withdraw_request(p_recipient uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'withdraw_request: not signed in' using errcode = '42501'; end if;
  for v_id in
    update public.connection_requests c
    set status = 'withdrawn', responded_at = now()
    where c.from_member_id = v_uid and c.to_member_id = p_recipient and c.status = 'pending'
    returning c.id
  loop
    -- 471: a withdrawn request takes the recipient's notification with it.
    perform private.notification_retract(p_recipient, 'connection_request', 'connection_request', v_id);
  end loop;
end;
$$;

create or replace function private.purge_expired_introductions()
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_n integer := 0;
  v_row record;
begin
  for v_row in
    delete from public.connection_requests
    where status = 'pending'
      and expires_at is not null
      and expires_at <= now()
    returning id, to_member_id
  loop
    -- 471: an expired request takes the recipient's notification with it.
    perform private.notification_retract(v_row.to_member_id, 'connection_request', 'connection_request', v_row.id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- 6. Convene's named parties (736, 1027, 1519).
-- ---------------------------------------------------------------------------------------------------

create or replace function public.invite_event_party(p_event uuid, p_member uuid, p_role text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events%rowtype;
  v_row public.event_parties%rowtype;
begin
  if v_uid is null then
    raise exception 'invite_event_party: not signed in' using errcode = '42501';
  end if;
  if p_event is null or p_member is null or p_role is null then
    raise exception 'An invitation needs an event, a member and a role.' using errcode = '22023';
  end if;
  if not private.is_event_host(p_event) then
    raise exception 'Only the host names people on this event.' using errcode = '42501';
  end if;

  select * into v_event from public.events e where e.id = p_event;
  if v_event.status <> 'published' or v_event.cancelled_at is not null then
    raise exception 'This event is not taking new names.' using errcode = '22023';
  end if;
  if p_member = v_event.host_member_id then
    raise exception 'You host this event, and the page already names you as its host.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.event_role_kinds k where k.role = p_role) then
    raise exception 'That is not a role an event can name.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.members m where m.id = p_member) then
    raise exception 'That member is not on DNA.' using errcode = '22023';
  end if;
  if private.is_blocked(v_uid, p_member) then
    raise exception 'That member cannot be named on your event.' using errcode = '22023';
  end if;

  insert into public.event_parties as p (event_id, member_id, role)
  values (p_event, p_member, p_role)
  on conflict on constraint event_parties_event_member_role_key do nothing
  returning p.* into v_row;

  if v_row.id is null then
    select * into v_row
    from public.event_parties p
    where p.event_id = p_event and p.member_id = p_member and p.role = p_role;
  else
    perform private.notify(p_member, 'role_invitation', 'member', v_uid, 'event_party', v_row.id);
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'event_id', v_row.event_id,
    'member_id', v_row.member_id,
    'role', v_row.role,
    'status', v_row.status,
    'updated_at', v_row.updated_at
  );
end;
$$;

create or replace function public.respond_to_event_role(p_party uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.event_parties%rowtype;
  v_event public.events%rowtype;
  v_to public.event_party_status;
begin
  if v_uid is null then
    raise exception 'respond_to_event_role: not signed in' using errcode = '42501';
  end if;
  if p_party is null or p_accept is null then
    raise exception 'An answer needs an invitation and a choice.' using errcode = '22023';
  end if;

  select * into v_row from public.event_parties p where p.id = p_party for update;
  if not found or v_row.member_id is distinct from v_uid then
    raise exception 'That invitation is not yours to answer.' using errcode = '42501';
  end if;

  v_to := case when p_accept then 'accepted'::public.event_party_status
               else 'declined'::public.event_party_status end;

  if v_to = 'accepted' then
    select * into v_event from public.events e where e.id = v_row.event_id;
    if v_event.status <> 'published' or v_event.cancelled_at is not null then
      raise exception 'This event is not taking new names.' using errcode = '22023';
    end if;
  end if;

  if v_row.status is distinct from v_to then
    update public.event_parties p
    set status = v_to, responded_at = now(), updated_at = now()
    where p.id = p_party
    returning p.* into v_row;

    if v_to = 'accepted' then
      -- 1519: the invitee's invitation is settled and the host hears of the acceptance.
      perform private.notification_settle(v_uid, 'role_invitation', 'event_party', p_party);
      perform private.notify(v_event.host_member_id, 'role_accepted', 'member', v_uid, 'event_party', p_party);
    else
      perform private.notification_retract(v_uid, 'role_invitation', 'event_party', p_party);
    end if;
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'event_id', v_row.event_id,
    'role', v_row.role,
    'status', v_row.status,
    'responded_at', v_row.responded_at
  );
end;
$$;

create or replace function public.remove_event_party(p_party uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_row public.event_parties%rowtype;
  v_host uuid;
begin
  if auth.uid() is null then
    raise exception 'remove_event_party: not signed in' using errcode = '42501';
  end if;
  if p_party is null then
    raise exception 'A removal needs a named party.' using errcode = '22023';
  end if;

  select * into v_row from public.event_parties p where p.id = p_party for update;
  if not found or not private.is_event_host(v_row.event_id) then
    raise exception 'Only the host removes a name from this event.' using errcode = '42501';
  end if;
  if v_row.status = 'declined' then
    raise exception 'A declined invitation is the member''s answer, and it stays.' using errcode = '22023';
  end if;

  select e.host_member_id into v_host from public.events e where e.id = v_row.event_id;
  perform private.notification_retract(v_row.member_id, 'role_invitation', 'event_party', p_party);
  perform private.notification_retract(v_host, 'role_accepted', 'event_party', p_party);
  delete from public.event_parties p where p.id = p_party;

  return jsonb_build_object('id', p_party, 'removed', true);
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- 7. Messenger's requests (1315, 1339).
-- ---------------------------------------------------------------------------------------------------

create or replace function private.message_request_send(p_recipient uuid, p_body text)
returns public.message_requests
language plpgsql
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
  perform private.notify(p_recipient, 'message_request', 'member', v_uid, 'message_request', v_row.id);
  return v_row;
end;
$$;

create or replace function private.message_request_accept(p_request uuid)
returns uuid
language plpgsql
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
  perform private.notification_settle(v_uid, 'message_request', 'message_request', p_request);
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

create or replace function private.message_request_decline(p_request uuid)
returns void
language plpgsql
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
  perform private.notification_retract(v_uid, 'message_request', 'message_request', p_request);
end;
$$;

create or replace function private.message_request_block(p_request uuid)
returns void
language plpgsql
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
  perform private.notification_retract(v_uid, 'message_request', 'message_request', p_request);
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- 8. Messenger's thread invitations (1325, 1341). Only a thread whose anchor names a C notifies; a
--    community_group has no anchor and its C is unruled, so its invitation writes nothing (held).
-- ---------------------------------------------------------------------------------------------------

create or replace function private.thread_invite(p_thread uuid, p_member uuid)
returns void
language plpgsql
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
  if private.notification_c_for('thread', p_thread) is not null then
    perform private.notify(p_member, 'thread_invitation', 'member', v_uid, 'thread', p_thread);
  end if;
end;
$$;

create or replace function private.thread_invite_accept(p_thread uuid)
returns void
language plpgsql
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
    perform private.notification_settle(v_uid, 'thread_invitation', 'thread', p_thread);
    return;
  end if;
  raise exception 'not_invited' using errcode = '42501';
end;
$$;

create or replace function private.thread_invite_decline(p_thread uuid)
returns void
language plpgsql
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
  perform private.notification_retract(v_uid, 'thread_invitation', 'thread', p_thread);
end;
$$;

create or replace function private.thread_remove(p_thread uuid, p_member uuid)
returns void
language plpgsql
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
  if v_target.state = 'invited' then
    perform private.notification_retract(p_member, 'thread_invitation', 'thread', p_thread);
  end if;
end;
$$;
