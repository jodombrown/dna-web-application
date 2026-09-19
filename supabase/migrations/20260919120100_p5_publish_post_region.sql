-- Convene Pass 5: publish_post persists the region Mapbox already returned (ruling 927). Committed
-- before it is applied (ruling 225); reaches the canonical project by SQL Editor paste on
-- supabase.com, or by dispatch-only GitHub Actions with a required reviewer (ruling 562), and never
-- by apply_migration (rulings 553, 269). The two Pass 4 headers say `supabase db push` and are not
-- amended, because ruling 466 forbids editing an applied migration.
--
-- A new file rather than an edit to 20260918120100 (ruling 466): an applied migration is never
-- amended, and `tests/migration-lint.cjs` enforces that by version rather than by path. The pairing
-- follows Pass 4's own: 20260919120000 adds the column, this file teaches the write path to fill it.
--
-- WHAT HANDOFF 27-A GOT WRONG ABOUT THIS, recorded here because the correction is the change.
-- Item 10 states the outcome as "`place-resolve` persists the region it already fetches from
-- Mapbox... written to the new column on the same write that stores `city` and `country`".
-- `supabase/functions/place-resolve/index.ts` performs no database write at all: it is a pure
-- resolver that calls Mapbox Search Box, maps the response and answers JSON. Nothing in it touches
-- `event_delivery` or `member_homes`, and nothing else in the tree writes `member_homes` at all.
-- The write that stores `city` and `country` is this function, from the composer's payload. So the
-- region travels the same road they do: place-resolve returns it, ConveneForm stores it as
-- `convene.region`, and this branch writes it onto the physical `event_delivery` row. A response
-- with no region writes null, because `nullif(trim(...), '')` is what every other place column here
-- already does and the composer writes an empty string where Mapbox gave nothing.
--
-- Latest prior definition: 20260918120100_p4_publish_post_map_link.sql. Every branch of that file is
-- carried here byte for byte; this definition differs from it in exactly three places, all inside
-- the convene branch and all about `convene.region`: the declaration, the read, and the column on
-- the physical `event_delivery` row. There is no refusal: a region is a label Mapbox either returned
-- or did not, nothing is derived from it, and there is no shape for it to fail.
--
-- What this file does NOT carry forward, and why. Ruling 929 withdrew the host-placed pin from the
-- build, so `convene.pin_x` and `convene.pin_y` are no longer in the payload. This function did not
-- read them before and does not read them now; the note in 20260918120100's header explaining that
-- an unread key is dropped still describes the behaviour, and the keys simply stopped arriving.
-- Gap G43 is unchanged: the pin gains a coordinate in the pass that gives the plate tiles.
--
-- The keys this branch reads are 20260918120100's list plus one:
--   convene.region              the Mapbox context region for the resolved place (927). Stored and
--                               never derived from: no surface computes with it, and a surface that
--                               has none renders nothing rather than guessing.
--
-- HOW THE VERSION IS RECORDED. As 20260919120000's header sets out at length:
-- `tests/migration-drift.cjs` md5s the whole file text against the recorded `statements` joined with
-- newlines, so the row must carry this file's own text and a hand-written list of bare statements
-- reads FAIL forever. The applier records it, because the applier is what has the file.


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
  v_mode public.event_mode;
  v_roles jsonb;
  v_instrument public.contribute_instrument;
  v_to_member uuid;
  v_message text;
  m jsonb;
  -- Convene Pass 1
  v_format text;
  v_starts timestamptz;
  v_ends timestamptz;
  v_doors timestamptz;
  v_tz text;
  v_when text;
  v_window text;
  v_win_start date;
  v_win_end date;
  v_place_id text;
  v_place_name text;
  v_place_text text;
  v_link text;
  v_link_tba boolean;
  v_map_link text;
  -- Ruling 927: Mapbox's context region for the resolved place, stored and never derived from.
  v_region text;
  v_lng double precision;
  v_lat double precision;
  v_capacity integer;
  v_ticket public.ticket_kind;
  v_probe timestamp;
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
    -- Convene Pass 1. The form's keys arrive namespaced (664); the title falls back to the body's
    -- first line the way every verb's does. Refusals are plain sentences: the form's validity
    -- (SPEC 3) keeps a member from reaching them, so whoever does is at the API.
    v_title := coalesce(nullif(trim(f ->> 'convene.title'), ''), v_title);
    v_format := nullif(trim(f ->> 'convene.format'), '');
    if v_format is null or v_format not in ('in_person', 'online', 'hybrid') then
      raise exception 'An event needs a format: in person, online or hybrid.' using errcode = '22023';
    end if;
    v_mode := (case v_format when 'online' then 'virtual' else v_format end)::public.event_mode;

    -- 520, 634: a start instant or an honest window, never both invented and never an end alone.
    v_starts := nullif(f ->> 'convene.starts_at', '')::timestamptz;
    v_ends := nullif(f ->> 'convene.ends_at', '')::timestamptz;
    v_doors := nullif(f ->> 'convene.doors_at', '')::timestamptz;
    v_window := nullif(trim(f ->> 'convene.when_window'), '');
    v_when := coalesce(nullif(trim(f ->> 'convene.when'), ''), v_window, '');
    if v_starts is null and v_window is null then
      raise exception 'An event needs a date and time, or a window in words.' using errcode = '22023';
    end if;
    if v_starts is not null then
      v_window := null;
    end if;
    if v_ends is not null and v_starts is null then
      raise exception 'An end time needs a start time.' using errcode = '22023';
    end if;
    if v_ends is not null and v_ends <= v_starts then
      raise exception 'An event has to end after it starts.' using errcode = '22023';
    end if;
    if v_window is not null then
      v_win_start := nullif(f ->> 'convene.expected_window_start', '')::date;
      v_win_end := nullif(f ->> 'convene.expected_window_end', '')::date;
      if (v_win_start is null) <> (v_win_end is null) or v_win_end < v_win_start then
        raise exception 'A window needs both ends, in order.' using errcode = '22023';
      end if;
    end if;

    -- The zone is derived, never asked (SPEC 4). A name Postgres does not know is refused rather
    -- than stored, because every later read renders the local time through it.
    v_tz := nullif(trim(f ->> 'convene.timezone'), '');
    if v_tz is not null then
      begin
        v_probe := now() at time zone v_tz;
      exception when others then
        raise exception 'That time zone is not one the calendar knows.' using errcode = '22023';
      end;
    end if;

    -- The door (521): what each format needs, and nothing it does not.
    v_place_id := nullif(trim(f ->> 'convene.place_id'), '');
    v_place_name := nullif(trim(f ->> 'convene.place_name'), '');
    v_place_text := nullif(trim(f ->> 'convene.place_text'), '');
    v_link := nullif(trim(f ->> 'convene.link'), '');
    v_link_tba := coalesce((f ->> 'convene.link_tba')::boolean, false);
    if v_format in ('in_person', 'hybrid') and v_place_id is null and v_place_text is null then
      raise exception 'An in-person event needs a place, resolved or in your words.' using errcode = '22023';
    end if;
    if v_format in ('online', 'hybrid') and v_link is null and not v_link_tba then
      raise exception 'An online event needs a meeting link, or a promise to announce one.' using errcode = '22023';
    end if;
    if v_link is not null and v_link !~* '^https?://' then
      raise exception 'A meeting link must start with http:// or https://' using errcode = '22023';
    end if;
    -- Convene Pass 4 (P4-SPEC section 7; rulings 815, 816). The host's own link to a map, taken as
    -- an opaque string and stored as one. It is not parsed, not geocoded, not plotted, and nothing
    -- below or anywhere else derives a point, a place or a zone from it: the place columns and the
    -- zone are settled above, by place-resolve and by the country, before this is read at all. The
    -- one test it faces is the shape an href must have before a surface may render it, which is the
    -- same guard the meeting link carries two lines up and is the reason `javascript:` never
    -- reaches a reader. Refused rather than silently dropped, because a link the host pasted and
    -- the event did not keep is worse than a sentence saying why.
    v_map_link := nullif(trim(f ->> 'convene.map_link'), '');
    -- Ruling 927. No refusal follows it: a region is a label Mapbox either returned or did not,
    -- nothing here derives from it, and there is no shape for it to fail. Absent, empty or
    -- whitespace all become null, which is the same treatment `city` and `country` get below and is
    -- what makes "a response with no region writes null rather than a guess" true of the database
    -- and not only of the resolver.
    v_region := nullif(trim(f ->> 'convene.region'), '');
    if v_map_link is not null and v_format not in ('in_person', 'hybrid') then
      raise exception 'A map link belongs to an event with a place.' using errcode = '22023';
    end if;
    if v_map_link is not null and v_map_link !~* '^https?://' then
      raise exception 'A map link must start with http:// or https://' using errcode = '22023';
    end if;
    if v_map_link is not null and length(v_map_link) > 2048 then
      raise exception 'That map link is too long to keep.' using errcode = '22023';
    end if;
    v_lng := nullif(f ->> 'convene.lng', '')::double precision;
    v_lat := nullif(f ->> 'convene.lat', '')::double precision;
    if (v_lng is null) <> (v_lat is null) then
      raise exception 'A place carries both coordinates or neither.' using errcode = '22023';
    end if;

    v_ticket := (case lower(coalesce(nullif(f ->> 'convene.price_nature', ''), 'free'))
      when 'paid' then 'paid' when 'donation' then 'donation' else 'free' end)::public.ticket_kind;
    v_capacity := nullif(regexp_replace(coalesce(f ->> 'convene.capacity', ''), '[^0-9]', '', 'g'), '')::integer;
    if v_capacity is not null and v_capacity <= 0 then
      raise exception 'Capacity is a whole number above zero.' using errcode = '22023';
    end if;
    -- Canon 6: a Space chosen in More options, else the Space the composer opened inside.
    v_space_id := coalesce(nullif(f ->> 'convene.space_id', '')::uuid, v_space_id);

    insert into public.events (
      host_member_id, title, starts_at, ends_at, doors_at, when_text, mode, ticket_kind, space_id,
      status, timezone, time_confirmed, date_confirmed, expected_window_start, expected_window_end,
      window_basis, delivery_intent
    ) values (
      v_uid, v_title, v_starts, v_ends, v_doors, v_when, v_mode, v_ticket, v_space_id,
      'published', v_tz, v_starts is not null, v_starts is not null, v_win_start, v_win_end,
      v_window, coalesce(f ->> 'convene.delivery_intent', '')
    ) returning id into v_obj_id;

    -- 521: one row per endpoint. The physical row is what a reader of the event sees; the meeting
    -- link is host-only until Pass 2 opens it on attendance.
    if v_format in ('in_person', 'hybrid') then
      insert into public.event_delivery (event_id, kind, position, place_id, place_name, place_text, city, country, region, lng, lat, map_link)
      values (
        v_obj_id, 'physical', 0,
        v_place_id,
        v_place_name,
        case when v_place_id is null then v_place_text else null end,
        nullif(trim(f ->> 'convene.city'), ''),
        nullif(trim(f ->> 'convene.country'), ''),
        v_region,
        v_lng, v_lat,
        v_map_link
      );
    end if;
    if v_format in ('online', 'hybrid') then
      if v_link is not null then
        insert into public.event_delivery (event_id, kind, position, url)
        values (v_obj_id, 'meeting_link', case when v_format = 'hybrid' then 1 else 0 end, v_link);
      else
        insert into public.event_delivery (event_id, kind, position)
        values (v_obj_id, 'to_be_announced', case when v_format = 'hybrid' then 1 else 0 end);
      end if;
    end if;
    -- 623: the host's number lives off the readable row.
    if v_capacity is not null then
      insert into public.event_host_settings (event_id, capacity) values (v_obj_id, v_capacity);
    end if;
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

  -- Ruling 288: a client-minted post id is a proposal, not an authority. The nested block opens a
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
    -- Ruling 439 (F20): a link is a web address or it is not a link. Anything without an http or
    -- https scheme (javascript:, data:, a bare host) is refused by name and never stored.
    if payload -> 'link' ->> 'url' !~* '^https?://' then
      raise exception 'publish_post: a link must start with http:// or https://' using errcode = '22023';
    end if;
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
