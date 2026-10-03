-- Brief 14 Messenger, handoff 41-D, Part A4 (held items 4 and 5; ruling 1386).
-- 1. messenger_threads_view appends last_author_name (the "{first name}:" prefix on group rows).
-- 2. Both projections word media as Image or Video through private.messenger_media_word, a definer
--    helper gated on the viewer's membership of a thread that carries the media, because the views
--    are security_invoker and media's row policy shows a row to its owner only.
-- 3. In a group, the last line and unread skip messages from an author the viewer blocks (1386).
-- messenger_messages_view appends media_word for the quote draft, the pinned strip and Message info.
-- Every other line of both views is the definition read live at bf6b10c, schema-qualified.
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963).

create or replace function private.messenger_media_word(p_media uuid)
returns text
language sql
stable
security definer
set search_path to ''
as $$
  select case
    when md.mime like 'image/%' then 'Image'
    when md.mime like 'video/%' then 'Video'
    else null
  end
  from public.media md
  where md.id = p_media
    and auth.uid() is not null
    and exists (
      select 1 from public.messages m
      where m.media_id = p_media
        and private.thread_member_in(
          m.thread_id, auth.uid(), array['active', 'invited']::public.thread_member_state[])
    );
$$;

revoke all on function private.messenger_media_word(uuid) from public;
grant execute on function private.messenger_media_word(uuid) to authenticated, service_role;

create or replace view public.messenger_threads_view
with (security_invoker = true)
as
select t.id as thread_id,
    t.kind,
    case
        when t.kind = 'one_to_one'::text then other.core ->> 'name'::text
        else t.name
    end as name,
    case
        when t.kind = 'one_to_one'::text then other.core ->> 'headline'::text
        else null::text
    end as headline,
    case
        when t.kind = 'one_to_one'::text then other.core ->> 'avatar_path'::text
        else null::text
    end as avatar_path,
    case
        when t.kind = 'one_to_one'::text then other.member_id
        else null::uuid
    end as other_member_id,
    names.names -> 'names'::text as member_names,
    coalesce((names.names ->> 'others'::text)::boolean, false) as others,
    case
        when last.id is null then null::text
        when last.deleted_at is not null then ''::text
        when last.kind = 'voice'::public.message_kind then 'Voice note'::text
        when last.kind = 'media'::public.message_kind
          then coalesce(private.messenger_media_word(last.media_id), 'Media'::text)
        else "left"(last.body, 140)
    end as last_line,
    last.kind as last_kind,
    last.author_id as last_author_id,
    last.seq as last_seq,
    t.last_activity_at,
    tm.state = 'active'::public.thread_member_state and last.id is not null and tm.read_seq < last.seq as unread,
    tm.muted_until is not null and tm.muted_until > now() as muted,
    tm.archived_at is not null as archived,
    tm.pinned_at is not null as pinned,
    tm.pinned_at,
    tm.state = 'invited'::public.thread_member_state as invited,
    tm.role,
    tm.state,
    tm.read_seq,
    tm.delivered_seq,
    t.anchor_kind,
    t.anchor_id,
    t.parent_thread_id,
    t.history_visible_to_new,
    t.created_at,
    case
        when last.id is null then null::text
        when last.author_deleted_at is not null then 'a former member'::text
        else private.messenger_member_core(last.author_id) ->> 'name'::text
    end as last_author_name
   from public.thread_members tm
     join public.threads t on t.id = tm.thread_id
     left join lateral ( select o.member_id,
            private.messenger_member_core(o.member_id) as core
           from public.thread_members o
          where o.thread_id = t.id and o.member_id <> tm.member_id and t.kind = 'one_to_one'::text
         limit 1) other on true
     left join lateral ( select private.messenger_names(( select array_agg(o.member_id order by o.joined_at, o.member_id) as array_agg
                   from public.thread_members o
                  where o.thread_id = t.id and o.member_id <> tm.member_id and o.state = 'active'::public.thread_member_state)) as names) names on true
     left join lateral ( select m.id,
            m.seq,
            m.kind,
            m.body,
            m.deleted_at,
            m.author_id,
            m.author_deleted_at,
            m.media_id
           from public.messages m
          where m.thread_id = t.id
            and (t.kind = 'one_to_one'::text or not private.viewer_blocks(m.author_id))
          order by m.seq desc
         limit 1) last on true
  where tm.member_id = (( select auth.uid() as uid)) and (tm.state = any (array['active'::public.thread_member_state, 'invited'::public.thread_member_state]));

create or replace view public.messenger_messages_view
with (security_invoker = true)
as
select m.id as message_id,
    m.thread_id,
    m.seq,
    m.author_id,
    case
        when m.author_deleted_at is not null then 'a former member'::text
        else author.core ->> 'name'::text
    end as author_name,
    case
        when m.author_deleted_at is null then author.core ->> 'avatar_path'::text
        else null::text
    end as author_avatar_path,
    m.author_deleted_at is not null as former_member,
    case
        when m.deleted_at is not null or blocked.yes then null::text
        else m.body
    end as body,
    m.kind,
    case
        when m.deleted_at is not null or blocked.yes then null::uuid
        else m.media_id
    end as media_id,
    case
        when m.deleted_at is not null or blocked.yes then null::jsonb
        else m.link_preview
    end as link_preview,
    reply.summary as reply_to,
    coalesce(reactions.list, '[]'::jsonb) as reactions,
    m.edited_at is not null as edited,
    m.deleted_at is not null as deleted,
    m.pinned_by is not null as pinned,
    blocked.yes as blocked,
    m.author_id = (( select auth.uid() as uid)) as own,
    case
        when m.author_id is distinct from (( select auth.uid() as uid)) then null::smallint
        when others.n = 0 then 1::smallint
        when others.undelivered > 0 then 1::smallint
        when private.receipts_on(( select auth.uid() as uid)) and others.unread_or_off = 0 then 3::smallint
        else 2::smallint
    end as tick,
    case
        when m.author_id is distinct from (( select auth.uid() as uid)) or t.kind = 'one_to_one'::text or others.n > 20 or not private.receipts_on(( select auth.uid() as uid)) then null::jsonb
        else readers.names -> 'names'::text
    end as read_by,
    case
        when m.author_id is distinct from (( select auth.uid() as uid)) or t.kind = 'one_to_one'::text or others.n > 20 or not private.receipts_on(( select auth.uid() as uid)) then false
        else coalesce((readers.names ->> 'others'::text)::boolean, false)
    end as read_by_others,
    mentions.ids as mentions,
    m.created_at,
    m.edited_at,
    case
        when m.deleted_at is not null or blocked.yes or m.kind <> 'media'::public.message_kind then null::text
        else coalesce(private.messenger_media_word(m.media_id), 'Media'::text)
    end as media_word
   from public.messages m
     join public.threads t on t.id = m.thread_id
     left join lateral ( select private.messenger_member_core(m.author_id) as core) author on true
     left join lateral ( select t.kind <> 'one_to_one'::text and private.viewer_blocks(m.author_id) as yes) blocked on true
     left join lateral ( select jsonb_build_object('message_id', r.id, 'seq', r.seq, 'author_name',
                case
                    when r.author_deleted_at is not null then 'a former member'::text
                    else private.messenger_member_core(r.author_id) ->> 'name'::text
                end, 'kind', r.kind, 'deleted', r.deleted_at is not null, 'line',
                case
                    when r.deleted_at is not null or private.viewer_blocks(r.author_id) then null::text
                    when r.kind = 'voice'::public.message_kind then 'Voice note'::text
                    when r.kind = 'media'::public.message_kind
                      then coalesce(private.messenger_media_word(r.media_id), 'Media'::text)
                    else "left"(r.body, 120)
                end) as summary
           from public.messages r
          where r.id = m.reply_to) reply on true
     left join lateral ( select jsonb_agg(jsonb_build_object('reaction', x.reaction, 'names', x.names -> 'names'::text, 'others', coalesce((x.names ->> 'others'::text)::boolean, false), 'own', x.own) order by x."position") as list
           from ( select k.value as reaction,
                    k."position",
                    private.messenger_names(array_agg(rx.member_id order by rx.created_at)) as names,
                    bool_or(rx.member_id = (( select auth.uid() as uid))) as own
                   from public.message_reactions rx
                     join public.message_reaction_kinds k on k.value = rx.reaction
                  where rx.message_id = m.id
                  group by k.value, k."position") x) reactions on true
     left join lateral ( select count(*) as n,
            count(*) filter (where o.delivered_seq < m.seq) as undelivered,
            count(*) filter (where o.read_seq < m.seq or not private.receipts_on(o.member_id)) as unread_or_off
           from public.thread_members o
          where o.thread_id = m.thread_id and o.member_id <> m.author_id and o.state = 'active'::public.thread_member_state) others on true
     left join lateral ( select private.messenger_names(( select array_agg(o.member_id order by o.member_id) as array_agg
                   from public.thread_members o
                  where o.thread_id = m.thread_id and o.member_id <> m.author_id and o.state = 'active'::public.thread_member_state and o.read_seq >= m.seq and private.receipts_on(o.member_id))) as names) readers on true
     left join lateral ( select array_agg(mn.member_id) as ids
           from public.message_mentions mn
          where mn.message_id = m.id) mentions on true;
