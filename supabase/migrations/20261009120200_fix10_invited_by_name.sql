-- Fix PR 10, item 9 (handoff 59-FIX-10 addendum 1; ruling 1638, under 141, 212 and 1592): the
-- invitee's lines, migration B.
--
-- public.messenger_threads_view is replaced from 20261008150600's body (applied by Chat through
-- execute_sql with the recorded md5 equal to the file, so the file is the live body) with one column
-- appended at the end, invited_by_name: the inviter's name on the viewer's own row while the viewer's
-- state is invited, null otherwise. The name is read the way every other name in this view is read,
-- through private.messenger_member_core, which answers a member the viewer shares a thread with in
-- any state and null to anyone else, so a name the viewer may not see is null and the surfaces
-- render nothing for it (grounded-or-empty). The addendum names private.can_see_core as the view's
-- gate; the view has never read it, and the one helper it reads is kept. Every other line of the
-- view is 20261008150600's; existing column positions hold.
--
-- The surfaces: the list row's last line reads "Invited by {name}" and the thread's log reads
-- "{name} invited you. Accept to read the conversation." while the viewer is invited, and nothing
-- where the name is null.
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963), with its
-- supabase_migrations.schema_migrations row in the same transaction. src/lib/database.types.ts is
-- regenerated after the apply.

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
    end as last_author_name,
    invited_names.names -> 'names'::text as invited_names,
    coalesce((invited_names.names ->> 'others'::text)::boolean, false) as invited_others,
    case
        when tm.state = 'invited'::public.thread_member_state
          then private.messenger_member_core(tm.invited_by) ->> 'name'::text
        else null::text
    end as invited_by_name
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
            and m.kind <> 'system'::public.message_kind
            and (t.kind = 'one_to_one'::text or not private.viewer_blocks(m.author_id))
          order by m.seq desc
         limit 1) last on true
     left join lateral ( select private.messenger_names(( select array_agg(o.member_id order by o.joined_at, o.member_id) as array_agg
                   from public.thread_members o
                  where o.thread_id = t.id and o.member_id <> tm.member_id and o.state = 'invited'::public.thread_member_state)) as names) invited_names on true
  where tm.member_id = (( select auth.uid() as uid)) and (tm.state = any (array['active'::public.thread_member_state, 'invited'::public.thread_member_state]));
