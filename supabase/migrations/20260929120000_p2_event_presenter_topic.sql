-- Convene Pass 2, the event page build (Session 37, handoff 37-C): the facts Brief 10 Revision 4 adds
-- to both page reads, under 1187, 1196 and 658, on 1116 and 212. Committed before it is applied (225).
-- Applied by Chat through execute_sql with its ledger row in the same transaction, never by
-- apply_migration (553, 963). Runs after 20260928120000.
--
-- Read live on 29 September 2026 before this file was written: the presenter arrives in both reads
-- through private.event_post_facts as {kind, id, name, handle, avatar_path} for a member and
-- {kind, id, name} for a Space; public.members.headline is the member's one-line presenter line and
-- public.member_links (kind website, linkedin, x, instagram) their links; profile_view admits the
-- headline with the member's core (private.admit_member) and links with the links section
-- (private.admit_section, default audience connections); events.family is the event's topic, one of
-- public.convene_families; public.member_subscriptions holds a member's topic subscriptions, written
-- only by public.set_subscription.
--
-- What this changes, and nothing else:
--   private.event_presenter_profile  new. The presenter's line and links, admitted for the viewer
--                                    exactly as profile_view admits them, so an event page never shows
--                                    more of a presenter than their own profile does (1187, 212). A
--                                    Space presents no line and no links. One function, so the two reads
--                                    cannot disagree.
--   public.event_page                gains event.family, viewer.subscribed, presented_by.headline and
--                                    presented_by.links.
--   public.event_public_page         gains presented_by.headline and presented_by.links, read as a
--                                    signed-out viewer: a line only from a profile shared publicly, links
--                                    only where that section's audience is everyone. No topic, no
--                                    subscription (1196).
-- Every other key of both reads is unchanged, and the bodies are the live definitions from
-- 20260928120000.

create function private.event_presenter_profile(p_presented jsonb, p_as_public boolean)
returns jsonb
language sql
stable
security definer
set search_path to ''
as $$
  -- The viewer is never a parameter: it is the caller, or nobody when the public page asks. A caller
  -- can therefore see through this function only what profile_view already shows them, and asking
  -- as the public only ever shows less.
  with v as (select case when coalesce(p_as_public, true) then null::uuid else auth.uid() end as viewer)
  select case
    when p_presented is null or p_presented ->> 'kind' is distinct from 'member' then
      jsonb_build_object('headline', null, 'links', '[]'::jsonb)
    else coalesce((
      select jsonb_build_object(
        'headline',
          case when private.admit_member(m.id, v.viewer) then nullif(btrim(m.headline), '') end,
        'links',
          case when private.admit_member(m.id, v.viewer) and private.admit_section(m.id, 'links', v.viewer) then
            coalesce((
              select jsonb_agg(jsonb_build_object('kind', l.kind, 'url', l.url) order by l.kind)
              from public.member_links l
              where l.member_id = m.id and l.url ~ '^https?://'
            ), '[]'::jsonb)
          else '[]'::jsonb end
      )
      from public.members m
      where m.id = (p_presented ->> 'id')::uuid
    ), jsonb_build_object('headline', null, 'links', '[]'::jsonb))
  end
  from v;
$$;

revoke execute on function private.event_presenter_profile(jsonb, boolean) from public, anon;
grant execute on function private.event_presenter_profile(jsonb, boolean) to authenticated, service_role;

create or replace function public.event_page(p_event uuid)
returns jsonb
language plpgsql
stable
set search_path to ''
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
      'family', v_event.family,
      'full', private.event_is_full(p_event),
      'public', v_post is not null
        and v_post -> 'post' ->> 'audience' = 'everyone'
        and v_event.status in ('published', 'cancelled')
    ),
    'post', v_post -> 'post',
    'presented_by', case when v_post -> 'presented_by' is null then null
      else (v_post -> 'presented_by') || private.event_presenter_profile(v_post -> 'presented_by', false) end,
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
      ),
      'subscribed', v_event.family is not null and exists (
        select 1 from public.member_subscriptions s
        where s.member_id = v_uid and s.kind = 'family' and s.family = v_event.family
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
    'blocks', private.event_blocks_json(p_event),
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

create or replace function public.event_public_page(p_slug text)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
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
    ) || private.event_presenter_profile(v_post -> 'presented_by', true),
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
    'partners', '[]'::jsonb,
    'blocks', case when v_cancelled then '[]'::jsonb else private.event_blocks_json(v_event.id) end
  );
end;
$$;
