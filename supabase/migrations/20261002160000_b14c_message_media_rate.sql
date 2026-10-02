-- Brief 14 Messenger, handoff 41-C, Part D (SPEC 41-14; working label M13; ruling 1353): a message
-- carrying media counted twice against the message_media ceiling. private.message_media_record
-- (20261002150000, 41-B) calls rate_limit_check('message_media') when the object is recorded, and
-- private.message_send (20261002130500, 41-A) called it again for every voice and media kind when the
-- message that carries the object was sent, so forty uploads an hour read as twenty. The function is
-- replaced whole with that one branch removed and nothing else changed: the body below is the 41-A
-- body line for line, less the three lines that asked the ceiling a second time, and the comment
-- names (message_send) alone. The no_media check that shared the branch stays.
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963, 965), never
-- apply_migration (553, 269); a new file, never an amendment of the applied one (466). The live arm
-- in tests/live-db.cjs (r2mediaOnce) asks the ceiling thirty-nine times, records one object and sends
-- the message that carries it, inside a rolled-back transaction: the fortieth count is the record's
-- and the send is not refused.

create or replace function private.message_send(
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
  'The one write path for messages (Brief 14 Guardrail 1; rulings 1343, 1346, 1351, 1352, 1353): idempotent on (thread_id, client_id), seq assigned under a lock on the thread row, 10,000 characters, rate_limit_check(message_send) and never (message_media), which message_media_record counts once at the upload (41-C, M13), active membership, no block on a one_to_one, a preview only when the author''s setting is on, mentions of active members, archive cleared for every member, the author''s cursors at the new seq. Reached through public.messenger_send; no client role holds execute here.';
