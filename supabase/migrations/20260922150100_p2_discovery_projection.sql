-- Convene Pass 2 (Brief 9, the Discovery Dashboard): the dashboard's one read projection. Rulings
-- 581, 631, 632, 633, 650, 658, 659, 661, 693, 724, 1037 to 1045, on 20, 508 and 680. Committed before
-- it is applied (ruling 225). Applied to the canonical project by Chat through the Supabase MCP's
-- execute_sql under rulings 963 and 965, with its supabase_migrations.schema_migrations row in the
-- same transaction, and never by apply_migration (rulings 553, 269). Runs after 20260922150000, in a
-- second transaction, because it reads the tables that file adds.
--
-- public.convene_discovery(lens, facets) is the only read the dashboard makes for what it shows. It
-- runs as the caller (security invoker), so the corpus is exactly what the posts, events,
-- event_delivery and event_registrations policies already give this member: audience scope stays row
-- policy (Digital Trust Layer), a block hides a host's event, and a going row reaches the network
-- section only where its registrant's convene audience admits this viewer (680). The cards
-- themselves are hydrated by the Feed's existing path from the post ids returned here (660), so the
-- card has one read.
--
-- The corpus. Published events with a published post, not yet over: an event is over when its end,
-- or its start, or the day after its expected window, has passed; an event with none of the three is
-- upcoming. Facets narrow the corpus before any section is formed (586, 693):
--   format    in_person, online, hybrid (online is events.mode virtual)
--   price     free, paid, donation (events.ticket_kind)
--   when      two_weeks, this_month or later, in the member's local time; later includes undated
--   families  convene_families values (1037)
--   home      one of the member's own homes: in-person or hybrid events whose place is in that city
--
-- The sections (631), in convene_lenses order, each item carrying the words DIA's line is built from
-- and never a number (581):
--   follow   the host is followed by the member (650)
--   taste    the family is subscribed (658); an event with no family is in no family's lane
--   soon     starts within fourteen days in the member's local time (659); the window is never shown
--   online   virtual or hybrid, first-class
--   curated  a live pick, carried as the editor's name and line (20, 41, 629)
--   near     in-person or hybrid in any of the member's homes, homes ranking in order (633)
--   network  a connection hosts, or connections are going where visibility permits
-- An event may sit in several sections. A dismissed item is out of that section only (1044).
--
-- Density (632, 1045). Under lens all a section renders only when its items reach its internal floor,
-- read through private.convene_threshold; below it the section is absent from the answer. Under any
-- other lens the one section is always returned, empty or not, because a lens is navigation and its
-- emptiness is 724's EmptyState. The answer never carries a count.
--
-- The first section's sentence (650). When the member follows no one and the lens is all or follow,
-- `suggest` names one host of an upcoming event the member can see, with that event's title and city,
-- for DIA's one sentence. DIA names a host and never follows for the member. With no such host the
-- sentence is absent.
--
-- The rails (730, 690). `homes` is the member's homes in order for the homes line and the Home facet
-- (1042); `follows` and `subscriptions` are the two 1440 widgets.

-- The viewer's own time zone (659). public.members is not readable by authenticated, so the one column
-- the soon window needs is read through a security definer helper that answers only for the caller.
create or replace function private.viewer_local_tz()
returns text
language sql
stable
security definer
set search_path to ''
as $$
  select m.local_tz from public.members m where m.id = auth.uid();
$$;

revoke execute on function private.viewer_local_tz() from public, anon;
grant execute on function private.viewer_local_tz() to authenticated, service_role;

create or replace function public.convene_discovery(
  p_lens text default 'all',
  p_format text[] default null,
  p_price text[] default null,
  p_when text default null,
  p_families text[] default null,
  p_home uuid default null
)
returns jsonb
language plpgsql
stable
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_lens text := coalesce(nullif(btrim(p_lens), ''), 'all');
  v_tz text;
  v_today date;
  v_soon_end timestamptz;
  v_month_end timestamptz;
  v_limit integer;
  v_modes public.event_mode[];
  v_sections jsonb;
  v_suggest jsonb;
begin
  if v_uid is null then
    raise exception 'convene_discovery: not signed in' using errcode = '42501';
  end if;
  if not exists (select 1 from public.convene_lenses l where l.lens = v_lens) then
    raise exception 'That is not a lens.' using errcode = '22023';
  end if;
  if p_when is not null and p_when not in ('two_weeks', 'this_month', 'later') then
    raise exception 'That is not a when.' using errcode = '22023';
  end if;
  if p_format is not null and not (p_format <@ array['in_person', 'online', 'hybrid']) then
    raise exception 'That is not a format.' using errcode = '22023';
  end if;
  if p_price is not null and not (p_price <@ array['free', 'paid', 'donation']) then
    raise exception 'That is not a price.' using errcode = '22023';
  end if;
  if p_families is not null and exists (
    select 1 from unnest(p_families) x
    where not exists (select 1 from public.convene_families f where f.family = x)
  ) then
    raise exception 'That is not a category family.' using errcode = '22023';
  end if;
  if p_home is not null and not exists (
    select 1 from public.member_homes h where h.id = p_home and h.member_id = v_uid
  ) then
    raise exception 'That is not one of your homes.' using errcode = '22023';
  end if;

  v_tz := private.viewer_local_tz();
  if v_tz is null or not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = v_tz) then
    v_tz := 'UTC';
  end if;
  v_today := (v_now at time zone v_tz)::date;
  v_soon_end := (v_today + 14)::timestamp at time zone v_tz;
  v_month_end := (date_trunc('month', v_today::timestamp) + interval '1 month') at time zone v_tz;
  v_limit := case when v_lens = 'all' then 24 else 60 end;

  if p_format is not null then
    select array_agg(case f when 'online' then 'virtual' else f end::public.event_mode)
    into v_modes
    from unnest(p_format) f;
  end if;

  with corpus as (
    select
      e.id as event_id,
      p.id as post_id,
      e.host_member_id as host,
      e.mode,
      e.family,
      e.starts_at,
      coalesce(e.starts_at, e.expected_window_start::timestamp at time zone v_tz) as sort_at
    from public.events e
    join lateral (
      select p.id
      from public.posts p
      where p.created_object_kind = 'event'
        and p.created_object_id = e.id
        and p.status = 'published'
      order by p.published_at, p.id
      limit 1
    ) p on true
    where e.status = 'published'
      and (
        coalesce(e.ends_at, e.starts_at, (e.expected_window_end + 1)::timestamp at time zone v_tz) is null
        or coalesce(e.ends_at, e.starts_at, (e.expected_window_end + 1)::timestamp at time zone v_tz) > v_now
      )
  ),
  narrowed as (
    select c.*
    from corpus c
    join public.events e on e.id = c.event_id
    where e.status = 'published'
      and (v_modes is null or c.mode = any (v_modes))
      and (p_price is null or e.ticket_kind::text = any (p_price))
      and (p_families is null or c.family = any (p_families))
      and (
        p_when is null
        or (p_when = 'two_weeks' and c.starts_at >= v_now and c.starts_at < v_soon_end)
        or (p_when = 'this_month' and c.starts_at >= v_now and c.starts_at < v_month_end)
        or (p_when = 'later' and (c.starts_at is null or c.starts_at >= v_month_end))
      )
      and (
        p_home is null
        or (
          c.mode in ('in_person', 'hybrid')
          and exists (
            select 1
            from public.member_homes h
            join public.event_delivery d on d.event_id = c.event_id and d.kind = 'physical'
            where h.id = p_home
              and lower(btrim(d.city)) = lower(btrim(h.city))
              and (d.country is null or h.country is null or lower(btrim(d.country)) = lower(btrim(h.country)))
          )
        )
      )
  ),
  candidates as (
    -- follow (650)
    select 'follow'::text as section, n.event_id, n.post_id,
      jsonb_build_object('kind', 'follow', 'host', jsonb_build_object('id', d.id, 'name', d.name)) as reason,
      coalesce(extract(epoch from n.sort_at), 1e12)::numeric as ord
    from narrowed n
    join public.member_follows f on f.follower_id = v_uid and f.member_id = n.host
    cross join lateral private.member_display(array[n.host]) d

    union all
    -- taste (658, 1037)
    select 'taste', n.event_id, n.post_id,
      jsonb_build_object('kind', 'taste', 'family', cf.family, 'label', cf.label),
      coalesce(extract(epoch from n.sort_at), 1e12)::numeric
    from narrowed n
    join public.member_subscriptions s on s.member_id = v_uid and s.kind = 'family' and s.family = n.family
    join public.convene_families cf on cf.family = n.family

    union all
    -- soon (659)
    select 'soon', n.event_id, n.post_id,
      jsonb_build_object('kind', 'soon', 'starts_at', n.starts_at, 'mode', n.mode),
      extract(epoch from n.starts_at)::numeric
    from narrowed n
    where n.starts_at >= v_now and n.starts_at < v_soon_end

    union all
    -- online
    select 'online', n.event_id, n.post_id,
      jsonb_build_object('kind', 'online', 'starts_at', n.starts_at, 'mode', n.mode),
      coalesce(extract(epoch from n.sort_at), 1e12)::numeric
    from narrowed n
    where n.mode in ('virtual', 'hybrid')

    union all
    -- curated (20, 41, 629, 1040): newest pick first
    select 'curated', n.event_id, n.post_id,
      jsonb_build_object('kind', 'curated', 'editor', jsonb_build_object('id', d.id, 'name', d.name), 'line', k.line),
      (-extract(epoch from k.picked_at))::numeric
    from narrowed n
    join public.convene_picks k on k.event_id = n.event_id and k.withdrawn_at is null
    cross join lateral private.member_display(array[k.picked_by]) d

    union all
    -- near (633): the first matching home in the member's order ranks the event
    select 'near', n.event_id, n.post_id,
      jsonb_build_object('kind', 'near', 'home', jsonb_build_object('id', hm.id, 'city', hm.city)),
      (hm.position::numeric * 1e12) + coalesce(extract(epoch from n.sort_at), 1e11)::numeric
    from narrowed n
    cross join lateral (
      select h.id, h.city, h.position
      from public.member_homes h
      join public.event_delivery d on d.event_id = n.event_id and d.kind = 'physical'
      where h.member_id = v_uid
        and h.city is not null
        and lower(btrim(d.city)) = lower(btrim(h.city))
        and (d.country is null or h.country is null or lower(btrim(d.country)) = lower(btrim(h.country)))
      order by h.position, h.id
      limit 1
    ) hm
    where n.mode in ('in_person', 'hybrid')

    union all
    -- network: a connection hosting, else up to two connections going the viewer may see (680)
    select 'network', n.event_id, n.post_id,
      case
        when n.host <> v_uid and private.is_connected(v_uid, n.host) then
          jsonb_build_object('kind', 'network', 'host',
            (select jsonb_build_object('id', d.id, 'name', d.name) from private.member_display(array[n.host]) d))
        else
          jsonb_build_object('kind', 'network', 'going', g.names)
      end,
      coalesce(extract(epoch from n.sort_at), 1e12)::numeric
    from narrowed n
    left join lateral (
      select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name) order by r.created_at, r.member_id) as names
      from (
        select r.member_id, r.created_at
        from public.event_registrations r
        where r.event_id = n.event_id
          and r.status = 'going'
          and r.member_id is not null
          and r.member_id <> v_uid
          and private.is_connected(v_uid, r.member_id)
        order by r.created_at, r.member_id
        limit 2
      ) r
      cross join lateral private.member_display(array[r.member_id]) d
    ) g on true
    where (n.host <> v_uid and private.is_connected(v_uid, n.host))
       or g.names is not null
  ),
  kept as (
    select r.*,
      row_number() over (partition by r.section order by r.ord, r.event_id) as rn
    from candidates r
    where (v_lens = 'all' or r.section = v_lens)
      and not exists (
        select 1 from public.discovery_dismissals x
        where x.member_id = v_uid and x.event_id = r.event_id and x.section = r.section
      )
  ),
  grouped as (
    select l.lens as section, l.position,
      coalesce((
        select jsonb_agg(jsonb_build_object('event_id', k.event_id, 'post_id', k.post_id, 'reason', k.reason)
                         order by k.rn)
        from kept k
        where k.section = l.lens and k.rn <= v_limit
      ), '[]'::jsonb) as items,
      (select count(*) from kept k where k.section = l.lens) as n
    from public.convene_lenses l
    where l.lens <> 'all'
      and (v_lens = 'all' or l.lens = v_lens)
  )
  select coalesce(jsonb_agg(jsonb_build_object('section', g.section, 'items', g.items) order by g.position), '[]'::jsonb)
  into v_sections
  from grouped g
  where v_lens <> 'all' or g.n >= private.convene_threshold(g.section);

  if v_lens in ('all', 'follow')
     and not exists (select 1 from public.member_follows f where f.follower_id = v_uid) then
    select jsonb_build_object(
      'host', jsonb_build_object('id', d.id, 'name', d.name, 'handle', d.handle),
      'event_id', s.event_id,
      'title', s.title,
      'city', s.city
    )
    into v_suggest
    from (
      select e.id as event_id, e.title, e.host_member_id,
        (select dl.city from public.event_delivery dl
          where dl.event_id = e.id and dl.kind = 'physical' order by dl.position limit 1) as city,
        coalesce(e.starts_at, e.expected_window_start::timestamp at time zone v_tz) as sort_at
      from public.events e
      where e.status = 'published'
        and e.host_member_id <> v_uid
        and exists (
          select 1 from public.posts p
          where p.created_object_kind = 'event' and p.created_object_id = e.id and p.status = 'published'
        )
        and (
          coalesce(e.ends_at, e.starts_at, (e.expected_window_end + 1)::timestamp at time zone v_tz) is null
          or coalesce(e.ends_at, e.starts_at, (e.expected_window_end + 1)::timestamp at time zone v_tz) > v_now
        )
      order by sort_at nulls last, e.id
      limit 1
    ) s
    cross join lateral private.member_display(array[s.host_member_id]) d;
  end if;

  return jsonb_build_object(
    'lens', v_lens,
    'homes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', h.id, 'city', h.city, 'place_name', h.place_name, 'region', h.region, 'country', h.country
      ) order by h.position, h.id)
      from public.member_homes h
      where h.member_id = v_uid
    ), '[]'::jsonb),
    'follows', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'handle', d.handle, 'avatar_path', d.avatar_path)
                       order by f.created_at, f.member_id)
      from public.member_follows f
      cross join lateral private.member_display(array[f.member_id]) d
      where f.follower_id = v_uid
    ), '[]'::jsonb),
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object('family', cf.family, 'label', cf.label) order by cf.position)
      from public.member_subscriptions s
      join public.convene_families cf on cf.family = s.family
      where s.member_id = v_uid and s.kind = 'family'
    ), '[]'::jsonb),
    'suggest', v_suggest,
    'sections', v_sections
  );
end;
$$;

revoke execute on function public.convene_discovery(text, text[], text[], text, text[], uuid) from public, anon;
grant execute on function public.convene_discovery(text, text[], text[], text, text[], uuid) to authenticated, service_role;
