-- Convene Pass 2, the second Discovery handoff (Session 37): the event page's block store, ruling 1186,
-- under 1189 and 1194, on 705, 1116 and 1002. Committed before it is applied (ruling 225). Applied to the
-- canonical project by Chat through the Supabase MCP's execute_sql under rulings 963 and 965, with its
-- supabase_migrations.schema_migrations row in the same transaction, and never by apply_migration
-- (rulings 553, 269). Runs after 20260927120100.
--
-- Read live on 28 September 2026 before this file was written: no event_blocks table, no block vocabulary,
-- events.attachments jsonb empty on all 12 events and named by no function body, event_page security
-- invoker, event_public_page security definer, public.vocabularies() the one vocabulary read.
--
-- What this adds.
--   public.event_block_kinds  the runtime vocabulary of the kinds of host-written block. Its label is the
--                             heading the page shows over that kind's section, so no surface keeps a
--                             heading map. public.vocabularies() serves it as event_block_kinds.
--   public.event_blocks       one row per block: event, position, kind, a payload checked per kind.
--   public.save_event_blocks  the one write path. The host sends the page's whole ordered list; the
--                             function replaces the event's blocks in one transaction.
--   private.event_blocks_json the one read projection, called by event_page and event_public_page and by
--                             nothing else, so the blocks arrive inside the two reads that already exist.
--
-- The kinds seeded are link, programme and note. They are the kinds 1186 names that the platform can hold
-- today. Their payloads, all text and no number field:
--   link       {"url": "https://...", "label": "optional"}
--   programme  {"at": "HH:MM", "line": "..."}   at is the event's local wall-clock time, 24 hour
--   note       {"text": "..."}
-- Two departures from 1186's wording, raised and not smoothed:
--   1. No file kind, and no media column. 1186 says media are held by reference to public.media, but
--      public.media admits only jpeg, png and webp images (media_mime_check), in two image buckets, under
--      three kinds (media_kind_check), so a file cannot be a row there. The file kind arrives with a
--      migration that adds a file bucket, its media kind and mime types, and the block's media reference
--      together, after Strand's file part exists (1194). Nothing is seeded that cannot be rendered.
--   2. events.attachments is not dropped. 1186 retires it into file blocks "when the table lands", and
--      file blocks cannot land here. It is empty and unread by the database, so it is retired by its own
--      migration with the file kind, after the tree is read for a reader (an absolute names the table).
-- Body kinds (paragraph, heading, quote, list, image, video) are not seeded: 1186 does not name them and
-- the Hub's authoring, which decides them, is Brief 8's. A page with no blocks renders as today (1189).
--
-- Who reads what, by persona (ruling 1116):
--   event host    every block of their own events, in any status, through private.is_event_host.
--   member        the blocks of any event the events table's own policy lets them see, once the event is
--                 published or cancelled. A draft event's blocks reach the host and nobody else.
--   Space lead    as a member. Writing is deliberately absent: the one write function acts for the host
--                 only, as invite_event_party does, and the Hub's permission helper that widens it to co-hosts
--                 and Space leads arrives with Brief 8's Team migration (1018).
--   signed out    nothing from either table, deliberately absent. The public page's blocks come through
--                 event_public_page, which returns them only for a published or cancelled event whose post is
--                 audience everyone, and returns none for a cancelled event, as it returns no media for one.
--   admin         every row, read only.
--   service       everything.
-- Direct writes are refused: authenticated holds select only and no policy admits an insert, an update or a
-- delete. A block is host-written page content and no other table restates it, so nothing here is a derived
-- row (ruling 1002).

-- The payload check, one function so the table and the write function cannot disagree. Immutable because a
-- check constraint requires it. It returns false for a kind it does not know.
create function private.event_block_payload_ok(p_kind text, p_payload jsonb)
returns boolean
language plpgsql
immutable
set search_path to ''
as $$
declare
  v_key text;
begin
  if p_kind is null or p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return false;
  end if;

  if p_kind = 'link' then
    for v_key in select jsonb_object_keys(p_payload) loop
      if v_key not in ('url', 'label') then
        return false;
      end if;
    end loop;
    if jsonb_typeof(p_payload -> 'url') is distinct from 'string'
       or (p_payload ->> 'url') !~ '^https://[^[:space:][:cntrl:]]+$'
       or length(p_payload ->> 'url') > 2048 then
      return false;
    end if;
    if p_payload ? 'label' and (
         jsonb_typeof(p_payload -> 'label') is distinct from 'string'
         or (p_payload ->> 'label') <> btrim(p_payload ->> 'label')
         or (p_payload ->> 'label') ~ '[[:cntrl:]]'
         or length(p_payload ->> 'label') not between 1 and 160) then
      return false;
    end if;
    return true;
  end if;

  if p_kind = 'programme' then
    for v_key in select jsonb_object_keys(p_payload) loop
      if v_key not in ('at', 'line') then
        return false;
      end if;
    end loop;
    -- A missing key makes each comparison null, and a null check passes, so the answer is forced to false.
    return coalesce(
      jsonb_typeof(p_payload -> 'at') = 'string'
      and (p_payload ->> 'at') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      and jsonb_typeof(p_payload -> 'line') = 'string'
      and (p_payload ->> 'line') = btrim(p_payload ->> 'line')
      and (p_payload ->> 'line') !~ '[[:cntrl:]]'
      and length(p_payload ->> 'line') between 1 and 200,
      false);
  end if;

  if p_kind = 'note' then
    for v_key in select jsonb_object_keys(p_payload) loop
      if v_key <> 'text' then
        return false;
      end if;
    end loop;
    return coalesce(
      jsonb_typeof(p_payload -> 'text') = 'string'
      and (p_payload ->> 'text') = btrim(p_payload ->> 'text')
      and (p_payload ->> 'text') !~ '[[:cntrl:]]'
      and length(p_payload ->> 'text') between 1 and 500,
      false);
  end if;

  return false;
end;
$$;

revoke execute on function private.event_block_payload_ok(text, jsonb) from public, anon, authenticated;
grant execute on function private.event_block_payload_ok(text, jsonb) to service_role;

-- The vocabulary (1186), in public.event_role_kinds' shape. Positions are the page's order top to bottom;
-- position 1 is left free for the file kind, which sits above Links (Brief 10 Revision 4).
create table public.event_block_kinds (
  kind text primary key,
  label text not null,
  position smallint not null,
  constraint event_block_kinds_kind_check check (kind ~ '^[a-z][a-z_]*[a-z]$'),
  constraint event_block_kinds_label_check check (label = btrim(label) and label <> ''),
  constraint event_block_kinds_label_key unique (label),
  constraint event_block_kinds_position_key unique (position)
);

alter table public.event_block_kinds enable row level security;

revoke all on table public.event_block_kinds from anon, authenticated;
grant select on table public.event_block_kinds to authenticated;
grant all on table public.event_block_kinds to service_role;

create policy event_block_kinds_member_select on public.event_block_kinds
  for select to authenticated
  using (true);

create policy event_block_kinds_service_role on public.event_block_kinds
  for all to service_role
  using (true)
  with check (true);

comment on table public.event_block_kinds is
  'The kinds of host-written block an event page holds, and the heading each kind shows. Read by every signed-in persona (event host, member, Space lead, admin) through one select-all policy and served by public.vocabularies() as event_block_kinds. Signed out reads nothing here: the public page carries each block''s label inside event_public_page. Writes are service role only; a kind is added by a migration.';

insert into public.event_block_kinds (kind, label, position) values
  ('link', 'Links', 2),
  ('programme', 'Programme', 3),
  ('note', 'Good to know', 4);

-- The row (1186). Position is the block's place in the host's list and is unique per event; the page shows
-- sections in the kinds' order and blocks in this order within a section.
create table public.event_blocks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  kind text not null references public.event_block_kinds (kind),
  position smallint not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_blocks_event_position_key unique (event_id, position),
  constraint event_blocks_position_check check (position >= 0),
  constraint event_blocks_payload_check check (private.event_block_payload_ok(kind, payload))
);

alter table public.event_blocks enable row level security;

revoke all on table public.event_blocks from anon, authenticated;
grant select on table public.event_blocks to authenticated;
grant all on table public.event_blocks to service_role;

create policy event_blocks_event_host_select on public.event_blocks
  for select to authenticated
  using (private.is_event_host(event_id));

create policy event_blocks_member_select on public.event_blocks
  for select to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_blocks.event_id and e.status in ('published', 'cancelled')
    )
  );

create policy event_blocks_admin_select on public.event_blocks
  for select to authenticated
  using (private.is_admin());

create policy event_blocks_service_role on public.event_blocks
  for all to service_role
  using (true)
  with check (true);

comment on table public.event_blocks is
  'Host-written content of an event page: programme rows, notes and links, in the host''s order (ruling 1186). Event host reads every block of their events; a member reads the blocks of an event their events policy shows them once it is published or cancelled; a Space lead reads as a member and has no write until Brief 8''s permission helper; admin reads every row; service role all. Signed out is deliberately absent: the public page reads blocks through event_public_page. The only writer is public.save_event_blocks, which acts for the host.';

-- The one read projection. Security invoker, so event_page's caller reads under their own row policy and
-- event_public_page, a definer, reads as its owner. Ordered by the kinds' page order, then the host's order.
create function private.event_blocks_json(p_event uuid)
returns jsonb
language sql
stable
set search_path to ''
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('kind', b.kind, 'label', k.label, 'payload', b.payload)
              order by k.position, b.position),
    '[]'::jsonb)
  from public.event_blocks b
  join public.event_block_kinds k on k.kind = b.kind
  where b.event_id = p_event;
$$;

revoke execute on function private.event_blocks_json(uuid) from public, anon;
grant execute on function private.event_blocks_json(uuid) to authenticated, service_role;

-- The one write path (1186). The host sends the page's whole ordered list and the event's blocks become
-- exactly that list, in one transaction: an invalid block refuses the save and nothing changes. An empty
-- list clears the page. The event row is locked so two saves cannot interleave.
create function public.save_event_blocks(p_event uuid, p_blocks jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events%rowtype;
  v_item jsonb;
  v_kind text;
  v_pos smallint := 0;
begin
  if v_uid is null then
    raise exception 'save_event_blocks: not signed in' using errcode = '42501';
  end if;
  if p_event is null or p_blocks is null or jsonb_typeof(p_blocks) <> 'array' then
    raise exception 'A page save needs an event and a list of blocks.' using errcode = '22023';
  end if;
  if not private.is_event_host(p_event) then
    raise exception 'Only the host writes this event''s page.' using errcode = '42501';
  end if;

  select * into v_event from public.events e where e.id = p_event for update;
  if v_event.status = 'cancelled' or v_event.cancelled_at is not null then
    raise exception 'A cancelled event''s page is not edited.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_blocks) > 60 then
    raise exception 'A page holds at most 60 blocks.' using errcode = '22023';
  end if;

  delete from public.event_blocks b where b.event_id = p_event;

  for v_item in select x from jsonb_array_elements(p_blocks) as x loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Every block is an object with a kind and a payload.' using errcode = '22023';
    end if;
    v_kind := v_item ->> 'kind';
    if v_kind is null or not exists (select 1 from public.event_block_kinds k where k.kind = v_kind) then
      raise exception 'That is not a kind of block an event page holds.' using errcode = '22023';
    end if;
    if not coalesce(private.event_block_payload_ok(v_kind, v_item -> 'payload'), false) then
      raise exception 'A % block''s content is not in the shape that kind holds.', v_kind using errcode = '22023';
    end if;
    insert into public.event_blocks (event_id, kind, position, payload)
    values (p_event, v_kind, v_pos, v_item -> 'payload');
    v_pos := v_pos + 1;
  end loop;

  return private.event_blocks_json(p_event);
end;
$$;

revoke execute on function public.save_event_blocks(uuid, jsonb) from public, anon;
grant execute on function public.save_event_blocks(uuid, jsonb) to authenticated, service_role;

-- The two reads gain one key, blocks, and change nothing else (1189): an event with no blocks answers
-- exactly as before plus an empty list. The bodies are the live definitions read on 28 September.
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
    'partners', '[]'::jsonb,
    'blocks', case when v_cancelled then '[]'::jsonb else private.event_blocks_json(v_event.id) end
  );
end;
$$;

-- The one vocabulary read gains event_block_kinds. Every other key is unchanged.
create or replace function public.vocabularies()
returns jsonb
language sql
stable
set search_path to ''
as $$
  select jsonb_build_object(
    'focus', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.focus_areas),
    'industries', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.industries),
    'regions', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.regional_expertise),
    'skills', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.skills),
    'languages', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.languages),
    'intent', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.intents),
    'interests', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.interests),
    'countries', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.countries),
    'world', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.world_countries),
    -- Ruling 187: the stance labels come from the table, here as everywhere else.
    'stances', (select coalesce(jsonb_agg(jsonb_build_object('value', s.stance, 'label', s.label)
                                           order by s.position), '[]'::jsonb)
                 from public.member_stances s),
    'heritage', (select jsonb_agg(x) from unnest(enum_range(null::public.heritage_kind)) x),
    'pathway', (select jsonb_agg(x) from unnest(enum_range(null::public.return_pathway)) x),
    'timeline', (select jsonb_agg(x) from unnest(enum_range(null::public.return_timeline)) x),
    -- Ruling 193: the Contribute instrument, in enum order, with its label derived from its value.
    'instrument', (select coalesce(jsonb_agg(jsonb_build_object(
                            'value', x,
                            'label', upper(left(replace(x::text, '_', '-'), 1))
                                     || substr(replace(x::text, '_', '-'), 2)) order by x), '[]'::jsonb)
                   from unnest(enum_range(null::public.contribute_instrument)) x),
    -- Ruling 1018: the roles a host can name on an event, with the verb the invitation reads.
    'event_roles', (select coalesce(jsonb_agg(jsonb_build_object('value', k.role, 'label', k.label, 'verb', k.verb)
                                               order by k.position), '[]'::jsonb)
                    from public.event_role_kinds k),
    -- Rulings 657, 1037 and 1038: Convene's category families, in the report's order.
    'convene_families', (select coalesce(jsonb_agg(jsonb_build_object(
                                  'value', f.family, 'label', f.label, 'schema_org', to_jsonb(f.schema_org))
                                  order by f.position), '[]'::jsonb)
                         from public.convene_families f),
    -- Rulings 693, 925, 729, 1041 and 1093: Convene's lens set, All then the four who-lenses.
    'convene_lenses', (select coalesce(jsonb_agg(jsonb_build_object(
                                'value', l.lens, 'name', l.name, 'short', l.short, 'icon', l.icon, 'scope', l.scope)
                                order by l.position), '[]'::jsonb)
                       from public.convene_lenses l),
    -- Rulings 1092 and 1105: Discovery's nine lanes, in their one fixed order.
    'convene_lanes', (select coalesce(jsonb_agg(jsonb_build_object('value', n.lane, 'name', n.name)
                                order by n.position), '[]'::jsonb)
                      from public.convene_lanes n),
    -- Ruling 1186: the kinds of host-written block and the heading each shows.
    'event_block_kinds', (select coalesce(jsonb_agg(jsonb_build_object('value', k.kind, 'label', k.label)
                                                     order by k.position), '[]'::jsonb)
                          from public.event_block_kinds k)
  );
$$;
