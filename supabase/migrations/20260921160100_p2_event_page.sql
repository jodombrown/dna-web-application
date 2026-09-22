-- Convene Pass 2 (Brief 10, Attend): the event page's two projections, the card's speakers, the first
-- RSVP's default, and the lookup behind the public page's images. Rulings 1023, 1025, 1027, 1028,
-- 1029, 1030 and 1032, on 508, 645, 662, 676, 678, 680, 737 and 1003. Committed before it is applied (ruling
-- 225). Applied to the canonical project by Chat through the Supabase MCP's execute_sql under rulings
-- 963 and 965, with its supabase_migrations.schema_migrations row in the same transaction, and never
-- by apply_migration (rulings 553, 269). Runs after 20260921160000, whose events.slug it reads.
--
-- The first RSVP (1030, 1003, 1004). private.rsvp_write is replaced with its body as 20260921120100
-- defined it (the live body, md5 48689454e9b5de4dd0a9e30dd09de497 before this file) and one change:
-- when a member with no member_visibility row for convene answers going, it writes the chosen scope,
-- or connections, as that row in the same transaction and stores no override on the registration.
-- Later answers write overrides only. Its signature and grants are unchanged.
--
-- Names on the event (678, 680). A speaker's acceptance is their opt-in to render with image and name
-- on every projection of the event, and a registrant's own audience is their opt-in to appear to the
-- viewers it admits, so their names cannot follow the members table's own policy. The projections
-- choose the rows under row policy, as the viewer, and private.member_display then reads the name,
-- handle and photo path for exactly those rows. It is a definer in the private schema, which the API
-- does not expose, so no client can call it with ids of its own.
--
-- The member page, public.event_page (1023). Invoker, so the events table's own policy decides
-- whether this member sees the event at all, and the registration and named-party policies decide
-- which of their rows come back. It returns the event, its post and presenter, the host, the place,
-- the meeting link only to the host, going registrants and accepted named parties, with door_withheld
-- saying a link exists that this viewer does not get (1025, 1032), the viewer's own answer, default and invitations, the accepted
-- speakers, no partners until Brief 8's record (1019), the going names only when five or more rows
-- come back (508, 645), and the calendar set. The viewer's pending invitation is returned to the
-- viewer alone; nobody else's pending row reaches this page (737).
--
-- The public page, public.event_public_page (662, 1028). Definer, because a signed-out caller reads
-- nothing under row policy. It answers only for a published or cancelled event whose post is to
-- everyone, and returns nothing otherwise, so the page renders its not-found state. It carries no
-- registration, no count and no attendee name in any state (680), the place without its pin or map
-- link, accepted speakers by name, and pending parties as their role alone (678).
--
-- The card, public.event_speakers (679). The Feed reads each event card's accepted speakers in one
-- call beside its other per-kind reads, under the named-party policy, with names as above.
--
-- The images, public.event_media_object (1029). The event-media Edge Function calls it with the
-- service role and nothing else may: it names the one storage object a public page may show, the
-- post's image at a position or an accepted speaker's photo, and nothing for any other event.

-- The first going answer writes the convene default (1030).
create or replace function private.rsvp_write(
  p_event uuid,
  p_member uuid,
  p_status public.registration_status,
  p_audience_override public.audience,
  p_contact_consent boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_prior public.registration_status;
  v_capacity integer;
  v_going bigint;
  v_row public.event_registrations%rowtype;
  v_first_default boolean := false;
begin
  if p_member is null or p_member is distinct from auth.uid() then
    raise exception 'rsvp_write: a member answers only for themselves' using errcode = '42501';
  end if;
  if not exists (select 1 from public.members m where m.id = p_member) then
    raise exception 'Finish joining DNA before you answer an event.' using errcode = '22023';
  end if;

  select * into v_event from public.events e where e.id = p_event for update;
  if not found then
    raise exception 'That event is not one you can answer.' using errcode = '22023';
  end if;
  if v_event.status <> 'published' or v_event.cancelled_at is not null then
    raise exception 'This event is not taking answers.' using errcode = '22023';
  end if;
  if coalesce(v_event.ends_at, v_event.starts_at) is not null
     and coalesce(v_event.ends_at, v_event.starts_at) <= now() then
    raise exception 'This event has already happened.' using errcode = '22023';
  end if;

  select r.status into v_prior
  from public.event_registrations r
  where r.event_id = p_event and r.member_id = p_member;

  if p_status = 'going' and v_prior is distinct from 'going' then
    if v_event.ticket_kind <> 'free' then
      raise exception 'This event takes tickets, and tickets are not open yet.' using errcode = '22023';
    end if;
    select s.capacity into v_capacity from public.event_host_settings s where s.event_id = p_event;
    if v_capacity is not null then
      select count(*) into v_going
      from public.event_registrations r
      where r.event_id = p_event and r.status = 'going';
      if v_going >= v_capacity then
        raise exception 'This event is full.' using errcode = '22023';
      end if;
    end if;
  end if;

  -- 1030: a member's first going answer writes their convene default in this transaction, and the
  -- row then follows that default rather than carrying the same scope as an override.
  if p_status = 'going' and not exists (
    select 1 from public.member_visibility v
    where v.member_id = p_member and v.section = 'convene'
  ) then
    insert into public.member_visibility (member_id, section, audience)
    values (p_member, 'convene', coalesce(p_audience_override, 'connections'))
    on conflict (member_id, section) do nothing;
    v_first_default := true;
  end if;

  insert into public.event_registrations as r (event_id, member_id, status, audience_override, contact_consent)
  values (p_event, p_member, p_status, case when v_first_default then null else p_audience_override end, coalesce(p_contact_consent, false))
  on conflict (event_id, member_id) where member_id is not null do update
    set status = excluded.status,
        audience_override = excluded.audience_override,
        contact_consent = excluded.contact_consent,
        updated_at = now()
  returning r.* into v_row;

  if v_row.status = 'going' then
    insert into public.edges (from_id, to_id, edge_type)
    values (p_member, p_event, 'event_rsvp')
    on conflict (from_id, to_id) where edge_type = 'event_rsvp' and revoked_at is null do nothing;
  else
    update public.edges e
    set revoked_at = now()
    where e.from_id = p_member and e.to_id = p_event
      and e.edge_type = 'event_rsvp' and e.revoked_at is null;
  end if;

  return jsonb_build_object(
    'event_id', v_row.event_id,
    'status', v_row.status,
    'audience_override', v_row.audience_override,
    'contact_consent', v_row.contact_consent,
    'default_set', v_first_default,
    'updated_at', v_row.updated_at
  );
end;
$$;

-- Names for rows a projection has already chosen under row policy (678, 680).
create function private.member_display(p_ids uuid[])
returns table (id uuid, name text, handle text, avatar_path text)
language sql
stable
security definer
set search_path to ''
as $$
  select m.id, m.name, m.handle, m.avatar_path
  from public.members m
  where m.id = any(p_ids);
$$;

revoke execute on function private.member_display(uuid[]) from public, anon;
grant execute on function private.member_display(uuid[]) to authenticated, service_role;

-- The event's post, its presenter and its images. Null when the event has no published post.
create function private.event_post_facts(p_event uuid)
returns jsonb
language sql
stable
security definer
set search_path to ''
as $$
  select jsonb_build_object(
    'post', jsonb_build_object('id', p.id, 'body', p.body, 'audience', p.audience, 'published_at', p.published_at),
    'presented_by', case p.author_kind
      when 'member' then (
        select jsonb_build_object('kind', 'member', 'id', m.id, 'name', m.name, 'handle', m.handle, 'avatar_path', m.avatar_path)
        from public.members m where m.id = p.author_id
      )
      when 'space' then (
        select jsonb_build_object('kind', 'space', 'id', s.id, 'name', s.title)
        from public.spaces s where s.id = p.author_id
      )
    end,
    'media', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', pm.position, 'storage_path', pm.storage_path, 'width', pm.width, 'height', pm.height
      ) order by pm.position)
      from public.post_media pm where pm.post_id = p.id
    ), '[]'::jsonb)
  )
  from public.posts p
  where p.created_object_kind = 'event' and p.created_object_id = p_event and p.status = 'published'
  order by p.published_at desc nulls last, p.id
  limit 1;
$$;

revoke execute on function private.event_post_facts(uuid) from public, anon;
grant execute on function private.event_post_facts(uuid) to authenticated, service_role;

-- 1025 and 1032: whether a meeting link exists, and the link itself only for the host, a going
-- registrant or an accepted named party.
create function private.event_meeting_link(p_event uuid)
returns jsonb
language sql
stable
security definer
set search_path to ''
as $$
  select jsonb_build_object(
    'has_link', exists (
      select 1 from public.event_delivery d
      where d.event_id = p_event and d.kind = 'meeting_link' and d.url is not null
    ),
    'url', (
      select d.url
      from public.event_delivery d
      where d.event_id = p_event and d.kind = 'meeting_link' and d.url is not null
        and auth.uid() is not null
        and (
          exists (select 1 from public.events e where e.id = p_event and e.host_member_id = auth.uid())
          or exists (
            select 1 from public.event_registrations r
            where r.event_id = p_event and r.member_id = auth.uid() and r.status = 'going'
          )
          or exists (
            select 1 from public.event_parties ep
            where ep.event_id = p_event and ep.member_id = auth.uid() and ep.status = 'accepted'
          )
        )
      order by d.position
      limit 1
    )
  );
$$;

revoke execute on function private.event_meeting_link(uuid) from public, anon;
grant execute on function private.event_meeting_link(uuid) to authenticated, service_role;

-- 623: whether the host's capacity is reached, as a fact and never as a number.
create function private.event_is_full(p_event uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce((
    select s.capacity is not null
      and (
        select count(*) from public.event_registrations r
        where r.event_id = p_event and r.status = 'going'
      ) >= s.capacity
    from public.event_host_settings s
    where s.event_id = p_event
  ), false);
$$;

revoke execute on function private.event_is_full(uuid) from public, anon;
grant execute on function private.event_is_full(uuid) to authenticated, service_role;

-- The card's and the page's accepted speakers, under the named-party policy (678, 679).
create function public.event_speakers(p_events uuid[])
returns table (event_id uuid, party_id uuid, member_id uuid, name text, handle text, avatar_path text, role text, label text)
language sql
stable
security invoker
set search_path to ''
as $$
  select p.event_id, p.id, p.member_id, d.name, d.handle, d.avatar_path, p.role, k.label
  from public.event_parties p
  join public.event_role_kinds k on k.role = p.role
  cross join lateral private.member_display(array[p.member_id]) d
  where p.event_id = any(p_events) and p.status = 'accepted'
  order by p.event_id, p.created_at, p.id;
$$;

revoke execute on function public.event_speakers(uuid[]) from public, anon;
grant execute on function public.event_speakers(uuid[]) to authenticated, service_role;

-- The member page's one read projection (1023). Null when the viewer cannot see the event.
create function public.event_page(p_event uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events%rowtype;
  v_post jsonb;
  v_meeting jsonb;
  v_place jsonb;
  v_going uuid[];
  v_names jsonb;
  v_when timestamptz;
begin
  if v_uid is null then
    raise exception 'event_page: not signed in' using errcode = '42501';
  end if;
  if p_event is null then
    return null;
  end if;

  select * into v_event from public.events e where e.id = p_event;
  if not found then
    return null;
  end if;

  v_post := private.event_post_facts(p_event);
  v_meeting := private.event_meeting_link(p_event);
  v_when := coalesce(v_event.ends_at, v_event.starts_at);

  select jsonb_build_object(
    'place_name', d.place_name, 'place_text', d.place_text, 'city', d.city, 'region', d.region,
    'country', d.country, 'lng', d.lng, 'lat', d.lat, 'map_link', d.map_link
  ) into v_place
  from public.event_delivery d
  where d.event_id = p_event and d.kind = 'physical'
  order by d.position
  limit 1;

  -- 680 and 508: the going rows this viewer's policy returns; 645: names only at five or more.
  select array_agg(r.member_id order by r.created_at, r.member_id) into v_going
  from public.event_registrations r
  where r.event_id = p_event and r.status = 'going' and r.member_id is not null;

  if coalesce(array_length(v_going, 1), 0) >= 5 then
    select jsonb_agg(x.card order by x.connection desc, x.shared desc, x.ord) into v_names
    from (
      select
        jsonb_build_object(
          'member_id', d.id, 'name', d.name, 'handle', d.handle, 'avatar_path', d.avatar_path,
          'you', d.id = v_uid, 'connection', c.connection, 'shared', c.shared
        ) as card,
        c.connection, c.shared, array_position(v_going, d.id) as ord
      from private.member_display(v_going) d
      cross join lateral (
        select
          d.id <> v_uid and private.is_connected(v_uid, d.id) as connection,
          d.id <> v_uid and private.shares_anchor(v_uid, d.id) as shared
      ) c
    ) x;
  end if;

  return jsonb_build_object(
    'event', jsonb_build_object(
      'id', v_event.id,
      'slug', v_event.slug,
      'title', v_event.title,
      'status', v_event.status,
      'cancelled', v_event.status = 'cancelled' or v_event.cancelled_at is not null,
      'cancelled_reason', v_event.cancelled_reason,
      'past', v_when is not null and v_when <= now(),
      'starts_at', v_event.starts_at,
      'ends_at', v_event.ends_at,
      'doors_at', v_event.doors_at,
      'timezone', v_event.timezone,
      'when_text', v_event.when_text,
      'date_confirmed', v_event.date_confirmed,
      'time_confirmed', v_event.time_confirmed,
      'expected_window_start', v_event.expected_window_start,
      'expected_window_end', v_event.expected_window_end,
      'window_basis', v_event.window_basis,
      'mode', v_event.mode,
      'ticket_kind', v_event.ticket_kind,
      'delivery_intent', v_event.delivery_intent,
      'full', private.event_is_full(p_event),
      'public', v_post is not null
        and v_post -> 'post' ->> 'audience' = 'everyone'
        and v_event.status in ('published', 'cancelled')
    ),
    'post', v_post -> 'post',
    'presented_by', v_post -> 'presented_by',
    'media', coalesce(v_post -> 'media', '[]'::jsonb),
    'host', (
      select jsonb_build_object('id', d.id, 'name', d.name, 'handle', d.handle, 'avatar_path', d.avatar_path)
      from private.member_display(array[v_event.host_member_id]) d
    ),
    'place', v_place,
    'meeting_url', v_meeting ->> 'url',
    'door_withheld', coalesce((v_meeting ->> 'has_link')::boolean, false) and v_meeting ->> 'url' is null,
    'viewer', jsonb_build_object(
      'is_host', v_event.host_member_id = v_uid,
      'registration', (
        select jsonb_build_object(
          'status', r.status, 'audience_override', r.audience_override, 'contact_consent', r.contact_consent
        )
        from public.event_registrations r
        where r.event_id = p_event and r.member_id = v_uid
      ),
      'default_audience', private.section_audience(v_uid, 'convene'),
      'has_default', exists (
        select 1 from public.member_visibility v where v.member_id = v_uid and v.section = 'convene'
      )
    ),
    'invitations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'party_id', p.id, 'role', p.role, 'label', k.label, 'verb', k.verb, 'status', p.status
      ) order by p.created_at, p.id)
      from public.event_parties p
      join public.event_role_kinds k on k.role = p.role
      where p.event_id = p_event and p.member_id = v_uid and p.status in ('invited', 'accepted')
    ), '[]'::jsonb),
    'speakers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'party_id', s.party_id, 'member_id', s.member_id, 'name', s.name, 'handle', s.handle,
        'avatar_path', s.avatar_path, 'role', s.role, 'label', s.label
      ))
      from public.event_speakers(array[p_event]) s
    ), '[]'::jsonb),
    'partners', '[]'::jsonb,
    'going', v_names,
    'calendar', jsonb_build_object(
      'uid', v_event.id,
      'title', v_event.title,
      'starts_at', v_event.starts_at,
      'ends_at', v_event.ends_at,
      'timezone', v_event.timezone,
      'location', coalesce(
        nullif(concat_ws(', ',
          nullif(coalesce(v_place ->> 'place_name', v_place ->> 'place_text'), ''),
          nullif(v_place ->> 'city', ''),
          nullif(v_place ->> 'country', '')
        ), ''),
        v_meeting ->> 'url'
      ),
      'url', v_meeting ->> 'url',
      'description', v_event.title || coalesce('. Presented by ' || (v_post -> 'presented_by' ->> 'name') || '.', '.')
    )
  );
end;
$$;

revoke execute on function public.event_page(uuid) from public, anon;
grant execute on function public.event_page(uuid) to authenticated, service_role;

-- The public page's one read projection (662, 1028). Null unless the event may have a public page.
create function public.event_public_page(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_post jsonb;
  v_cancelled boolean;
  v_when timestamptz;
begin
  if p_slug is null then
    return null;
  end if;

  select * into v_event from public.events e where e.slug = p_slug;
  if not found or v_event.status not in ('published', 'cancelled') then
    return null;
  end if;

  v_post := private.event_post_facts(v_event.id);
  if v_post is null or v_post -> 'post' ->> 'audience' is distinct from 'everyone' then
    return null;
  end if;

  v_cancelled := v_event.status = 'cancelled' or v_event.cancelled_at is not null;
  v_when := coalesce(v_event.ends_at, v_event.starts_at);

  return jsonb_build_object(
    'event', jsonb_build_object(
      'slug', v_event.slug,
      'title', v_event.title,
      'cancelled', v_cancelled,
      'cancelled_reason', v_event.cancelled_reason,
      'past', v_when is not null and v_when <= now(),
      'starts_at', v_event.starts_at,
      'ends_at', v_event.ends_at,
      'doors_at', v_event.doors_at,
      'timezone', v_event.timezone,
      'when_text', v_event.when_text,
      'date_confirmed', v_event.date_confirmed,
      'time_confirmed', v_event.time_confirmed,
      'expected_window_start', v_event.expected_window_start,
      'expected_window_end', v_event.expected_window_end,
      'window_basis', v_event.window_basis,
      'mode', v_event.mode,
      'ticket_kind', v_event.ticket_kind,
      'delivery_intent', v_event.delivery_intent
    ),
    'body', v_post -> 'post' ->> 'body',
    'presented_by', jsonb_build_object(
      'kind', v_post -> 'presented_by' ->> 'kind',
      'name', v_post -> 'presented_by' ->> 'name'
    ),
    'host', (select jsonb_build_object('name', m.name) from public.members m where m.id = v_event.host_member_id),
    'media', case when v_cancelled then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object('position', x -> 'position', 'width', x -> 'width', 'height', x -> 'height')
        order by (x ->> 'position')::integer)
      from jsonb_array_elements(v_post -> 'media') x
    ), '[]'::jsonb) end,
    'place', (
      select jsonb_build_object(
        'place_name', d.place_name, 'place_text', d.place_text, 'city', d.city,
        'region', d.region, 'country', d.country
      )
      from public.event_delivery d
      where d.event_id = v_event.id and d.kind = 'physical'
      order by d.position
      limit 1
    ),
    'speakers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'party_id', p.id, 'name', m.name, 'role', p.role, 'label', k.label, 'has_photo', m.avatar_path is not null
      ) order by p.created_at, p.id)
      from public.event_parties p
      join public.members m on m.id = p.member_id
      join public.event_role_kinds k on k.role = p.role
      where p.event_id = v_event.id and p.status = 'accepted'
    ), '[]'::jsonb),
    'pending_roles', coalesce((
      select jsonb_agg(jsonb_build_object('role', p.role, 'label', k.label) order by p.created_at, p.id)
      from public.event_parties p
      join public.event_role_kinds k on k.role = p.role
      where p.event_id = v_event.id and p.status = 'invited'
    ), '[]'::jsonb),
    'partners', '[]'::jsonb
  );
end;
$$;

revoke execute on function public.event_public_page(text) from public;
grant execute on function public.event_public_page(text) to anon, authenticated, service_role;

-- 1029: the one storage object a public page may show, for the event-media Edge Function only.
create function public.event_media_object(p_slug text, p_kind text, p_key text)
returns table (bucket text, path text)
language sql
stable
security definer
set search_path to ''
as $$
  with ev as (
    select e.id
    from public.events e
    where e.slug = p_slug and e.status = 'published' and e.cancelled_at is null
  ), po as (
    select p.id
    from public.posts p
    join ev on p.created_object_kind = 'event' and p.created_object_id = ev.id
    where p.status = 'published' and p.audience = 'everyone'
    order by p.published_at desc nulls last, p.id
    limit 1
  )
  select 'post-media'::text, pm.storage_path
  from public.post_media pm
  join po on pm.post_id = po.id
  where p_kind = 'media' and pm.position::text = p_key
  union all
  select 'profile-media'::text, m.avatar_path
  from public.event_parties ep
  join ev on ev.id = ep.event_id
  join public.members m on m.id = ep.member_id
  where p_kind = 'photo'
    and exists (select 1 from po)
    and ep.id::text = lower(p_key)
    and ep.status = 'accepted'
    and m.avatar_path is not null;
$$;

revoke execute on function public.event_media_object(text, text, text) from public, anon, authenticated;
grant execute on function public.event_media_object(text, text, text) to service_role;
