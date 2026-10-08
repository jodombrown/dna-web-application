-- Brief 14 Messenger, handoff 56-41E, item 1.7 (rulings 1591, 1387, S5).
-- A rename writes a system message: after its update, private.thread_rename inserts a messages row
-- of kind system, authored by the renamer, whose body is the fixed event word 'renamed', never prose
-- and never a name; the client composes "{first name} renamed the group." from author_name. The seq
-- is allocated as private.message_send allocates it, under the thread row's lock (which the rename
-- already holds through its select for update), max(seq) + 1. A system row is skipped by search
-- (private.message_search), by the list's last line (the threads projection, 20261008150600) and
-- by the pin (private.message_pin refuses it with bad_kind). message_send's own refusal of the kind
-- (bad_kind) stands: no client writes a system row.
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
  v_seq bigint;
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
  -- 1591: the system line, allocated on the same path as message_send, under the lock taken above.
  v_seq := coalesce((select max(m.seq) from public.messages m where m.thread_id = p_thread), 0) + 1;
  insert into public.messages (thread_id, seq, client_id, author_id, kind, body)
  values (p_thread, v_seq, gen_random_uuid(), v_uid, 'system', 'renamed');
  update public.thread_members
  set delivered_seq = greatest(delivered_seq, v_seq),
      read_seq = greatest(read_seq, v_seq)
  where thread_id = p_thread and member_id = v_uid;
end;
$$;

revoke all on function private.thread_rename(uuid, text) from public;

create or replace function private.message_search(
  p_query text,
  p_member uuid,
  p_thread uuid,
  p_before timestamp with time zone,
  p_after timestamp with time zone
)
returns table(thread_id uuid, message_id uuid, seq bigint, created_at timestamp with time zone, headline text)
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
    and m.kind <> 'system'
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

revoke all on function private.message_search(text, uuid, uuid, timestamp with time zone, timestamp with time zone) from public;

create or replace function private.message_pin(p_message uuid)
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
  if v_row.kind = 'system' then
    raise exception 'bad_kind' using errcode = '22023';
  end if;
  update public.messages set pinned_by = null
  where thread_id = v_row.thread_id and pinned_by is not null and id <> p_message;
  update public.messages set pinned_by = v_uid where id = p_message;
end;
$$;

revoke all on function private.message_pin(uuid) from public;
