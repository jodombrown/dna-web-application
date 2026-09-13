-- ---------------------------------------------------------------------------
-- Publish path defects, D2. Ruling 267.
--
-- `public.publish_post(jsonb)` took `payload ->> 'id'` unchecked. A client-minted id that had
-- already been consumed raised 23505 on `posts_pkey` out of the bare insert, the whole transaction
-- rolled back, and the rollback undid `delete from public.post_drafts` with it. The draft returned
-- on every reload and every retry failed identically, so the member was wedged permanently and
-- signing out did not clear it, because the draft is server-side (ruling 56).
--
-- Guardrails this migration keeps. The client still mints the post id: media uploads to
-- `{member_id}/{post_id}/{file}` before the post row exists, so a server-minted id is not available
-- in time and the fix is a guard, not a relocation. The function stays SECURITY INVOKER, so every
-- write continues to run under the caller's RLS. No existence oracle is added: the guard is a
-- nested `BEGIN ... EXCEPTION WHEN unique_violation` block, which reads no row and needs no new
-- grant. The `revoke` and `grant` at the foot are carried over unchanged.
--
-- Nothing else in the function body changes. The body below is
-- `20260909160000_fix_pr_01_rulings_212_216.sql`'s, reproduced in full because
-- `create or replace function` replaces the whole body and that migration is applied and is not
-- edited in place.
--
-- Ruling 140 governs the language: this is a correctness defect on a project holding no real member
-- data. Severity is recorded; it is not a leak or a breach and it does not gate a merge.
-- ---------------------------------------------------------------------------

create or replace function public.publish_post(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_post_id uuid := coalesce((payload ->> 'id')::uuid, gen_random_uuid());
  v_verb text := nullif(payload ->> 'verb', '');
  v_c public.c_category;
  v_body text := coalesce(payload ->> 'body', '');
  v_author_kind public.anchor_kind := (payload ->> 'author_kind')::public.anchor_kind;
  v_author_id uuid := (payload ->> 'author_id')::uuid;
  v_anchor_kind public.anchor_kind := nullif(payload -> 'anchor' ->> 'kind', '')::public.anchor_kind;
  v_anchor_id uuid := nullif(payload -> 'anchor' ->> 'id', '')::uuid;
  v_audience public.audience := coalesce(nullif(payload ->> 'audience', ''), 'everyone')::public.audience;
  v_host_context text := coalesce(payload ->> 'host_context', 'feed');
  f jsonb := coalesce(payload -> 'fields', '{}'::jsonb);
  v_title text;
  v_space_id uuid;
  v_event_id uuid;
  v_obj_kind public.anchor_kind;
  v_obj_id uuid;
  v_place text;
  v_mode public.event_mode;
  v_roles jsonb;
  v_instrument public.contribute_instrument;
  v_to_member uuid;
  v_message text;
  m jsonb;
begin
  if v_uid is null then
    raise exception 'publish_post: not signed in' using errcode = '42501';
  end if;
  if v_verb is not null and v_verb not in ('connect', 'convene', 'collaborate', 'contribute', 'convey') then
    raise exception 'publish_post: unknown verb %', v_verb using errcode = '22023';
  end if;
  v_c := coalesce(v_verb, 'convey')::public.c_category;
  if v_c = 'system' then
    raise exception 'publish_post: system is platform-only' using errcode = '22023';
  end if;
  if v_author_kind is null or v_author_id is null or v_author_kind not in ('member', 'space') then
    raise exception 'publish_post: author required' using errcode = '22023';
  end if;
  if not private.can_author_as(v_author_kind, v_author_id) then
    raise exception 'publish_post: no right to author as this %', v_author_kind using errcode = '42501';
  end if;
  if (v_anchor_kind is null) <> (v_anchor_id is null) then
    raise exception 'publish_post: anchor needs kind and id' using errcode = '22023';
  end if;
  if v_audience = 'anchored' and v_anchor_kind is null then
    raise exception 'publish_post: anchored audience needs an anchor' using errcode = '22023';
  end if;
  if length(trim(v_body)) = 0
     and jsonb_array_length(coalesce(payload -> 'media', '[]'::jsonb)) = 0
     and nullif(payload -> 'link' ->> 'url', '') is null
     and v_verb is null then
    raise exception 'publish_post: nothing to publish' using errcode = '22023';
  end if;

  v_title := coalesce(nullif(trim(f ->> 'title'), ''), nullif(left(split_part(trim(v_body), E'\n', 1), 80), ''), 'Untitled');
  v_space_id := case when v_anchor_kind = 'space' then v_anchor_id else null end;
  v_event_id := case when v_anchor_kind = 'event' then v_anchor_id else null end;

  if v_verb = 'connect' then
    -- Ruling 215 (F16): one writer into connection_requests. The composer's Connect verb is ruling
    -- 119's self-introduction, so it is send_introduction, which is the only path that enforces the
    -- block, the decline window and ruling 213's Private rule, and which refuses with one message
    -- whichever condition fired. A Connect post that names no member is not an introduction and is
    -- refused with that same message rather than writing a request addressed to nobody.
    v_to_member := case when v_anchor_kind = 'member' and v_anchor_id <> v_uid then v_anchor_id end;
    -- B4 (ruling 119): the request carries its message; a request is never sent empty.
    v_message := left(btrim(coalesce(nullif(f ->> 'why', ''), nullif(v_body, ''), '')), 300);
    if v_message = '' then
      raise exception 'An introduction needs a message.' using errcode = '22023';
    end if;
    if v_to_member is null then
      raise exception 'send_introduction: not available' using errcode = '42501';
    end if;
    v_obj_id := public.send_introduction(v_to_member, v_message);
    v_obj_kind := 'connection_request';

  elsif v_verb = 'convene' then
    v_place := nullif(trim(f ->> 'place'), '');
    v_mode := (case
      when coalesce((f ->> 'hybrid')::boolean, false) then 'hybrid'
      when v_place ~* '^(https?://|www\.)' then 'virtual'
      else 'in_person' end)::public.event_mode;
    insert into public.events (host_member_id, title, starts_at, when_text, mode, location, virtual_url, ticket_kind, space_id)
    values (
      v_uid, v_title,
      nullif(payload ->> 'starts_at', '')::timestamptz,
      concat_ws(E'\n', nullif(trim(f ->> 'date'), ''), nullif(trim(f ->> 'time'), '')),
      v_mode,
      case when v_place is not null and v_mode <> 'virtual' then jsonb_build_object('text', v_place) else null end,
      case when v_mode = 'virtual' then v_place else null end,
      (case when lower(coalesce(f ->> 'ticket', 'Free')) = 'paid' then 'paid' else 'free' end)::public.ticket_kind,
      v_space_id
    ) returning id into v_obj_id;
    v_obj_kind := 'event';

  elsif v_verb = 'collaborate' then
    select coalesce(jsonb_agg(trim(r)), '[]'::jsonb) into v_roles
    from unnest(string_to_array(coalesce(f ->> 'roles', ''), ',')) as r
    where length(trim(r)) > 0;
    insert into public.spaces (owner_member_id, title, category, description, roles_sought, status)
    values (v_uid, v_title, nullif(trim(f ->> 'category'), ''), nullif(v_body, ''), v_roles, 'active')
    returning id into v_obj_id;
    insert into public.space_roles (space_id, member_id, role, status) values (v_obj_id, v_uid, 'lead', 'active');
    v_obj_kind := 'space';

  elsif v_verb = 'contribute' then
    v_instrument := (case lower(coalesce(f ->> 'instrument', ''))
      when 'skills' then 'skills' when 'in-kind' then 'in_kind' when 'in_kind' then 'in_kind' else 'time' end)::public.contribute_instrument;
    insert into public.opportunities (receiver_member_id, title, instrument, need, by_date, by_text, space_id, event_id)
    values (
      v_uid, v_title, v_instrument,
      coalesce(nullif(f ->> 'need', ''), nullif(v_body, '')),
      nullif(payload ->> 'by_date', '')::date,
      coalesce(f ->> 'by', ''),
      v_space_id, v_event_id
    ) returning id into v_obj_id;
    v_obj_kind := 'opportunity';

  elsif v_verb = 'convey' then
    insert into public.stories (author_member_id, title, body, origin_kind, origin_id)
    values (v_uid, v_title, v_body, v_anchor_kind, v_anchor_id)
    returning id into v_obj_id;
    v_obj_kind := 'story';
  end if;

  -- Ruling 267: a client-minted post id is a proposal, not an authority. The nested block opens a
  -- subtransaction, so a collision is caught here and re-raised as a named refusal instead of
  -- reaching the caller as `duplicate key value violates unique constraint "posts_pkey"`. It reads
  -- no row and needs no new grant, so nothing here answers "does post <uuid> exist" for
  -- `authenticated`. The verb's object row inserted immediately above is rolled back with the
  -- subtransaction when this exception propagates, which is correct: a collision must leave no
  -- orphan story, event, space or opportunity behind.
  begin
    insert into public.posts (id, author_kind, author_id, created_by, c_category, body, anchor_kind, anchor_id,
                              created_object_kind, created_object_id, audience, status, published_at)
    values (v_post_id, v_author_kind, v_author_id, v_uid, v_c, v_body, v_anchor_kind, v_anchor_id,
            v_obj_kind, v_obj_id, v_audience, 'published', now());
  exception
    when unique_violation then
      raise exception 'publish_post: this post has already been published' using errcode = '23505';
  end;

  for m in select * from jsonb_array_elements(coalesce(payload -> 'media', '[]'::jsonb)) loop
    insert into public.post_media (post_id, storage_path, width, height, position)
    values (v_post_id, m ->> 'storage_path', (m ->> 'width')::int, (m ->> 'height')::int, coalesce((m ->> 'position')::int, 0));
  end loop;

  if nullif(payload -> 'link' ->> 'url', '') is not null then
    insert into public.post_links (post_id, url, title, description, image_url, fetched_at)
    values (v_post_id, payload -> 'link' ->> 'url', payload -> 'link' ->> 'title',
            payload -> 'link' ->> 'description', payload -> 'link' ->> 'image_url',
            case when payload -> 'link' ->> 'title' is not null then now() else null end);
  end if;

  if payload ? 'dia' and jsonb_typeof(payload -> 'dia') = 'object' then
    insert into public.post_dia (post_id, verb, confidence, proposed_fields, accepted, member_overrode, latency_ms)
    values (
      v_post_id,
      nullif(payload -> 'dia' ->> 'verb', '')::public.c_category,
      nullif(payload -> 'dia' ->> 'confidence', '')::numeric,
      coalesce(payload -> 'dia' -> 'proposed_fields', '{}'::jsonb),
      coalesce((payload -> 'dia' ->> 'accepted')::boolean, false),
      coalesce((payload -> 'dia' ->> 'member_overrode')::boolean, false),
      nullif(payload -> 'dia' ->> 'latency_ms', '')::int
    );
  end if;

  delete from public.post_drafts where member_id = v_uid and host_context = v_host_context;

  return v_post_id;
end;
$$;

revoke execute on function public.publish_post(jsonb) from public, anon;
grant execute on function public.publish_post(jsonb) to authenticated, service_role;
