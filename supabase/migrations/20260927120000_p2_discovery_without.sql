-- Convene Discovery, Session 35, handoff 35-A: More on Convene's floors (ruling 1174, extending 1148).
-- Runs after 20260926170400. Committed before it is applied (ruling 225). Applied to the canonical project by
-- Chat through the Supabase MCP's execute_sql under rulings 963 and 965, with its
-- supabase_migrations.schema_migrations row in the same transaction, and never by apply_migration (rulings
-- 553, 269).
--
-- More on Convene reads All with the lens's events removed. Until this file the surface removed them after the
-- projection had applied each lane's floor, so a lane the removal thinned below its floor still showed (1174).
-- The projection now takes p_without, the lens whose events a read of All leaves out, and removes them before
-- the floors, so a lane the removal leaves under its floor drops, as any lane short of its floor drops.
--
-- The function body is 20260926170400's (md5 of the body afddb51efcfaaea42731c202f8e6df0a, equal to the live
-- prosrc when this file was written) with only these edits, so the signature gains p_without and the function
-- is dropped and recreated with its grants:
--   p_without     trimmed; empty is none. Refused with 22023 unless p_lens is all and p_without is a lens in
--                 public.convene_lenses other than all
--   v_lens_limit  the 60 a lens read returns, named once and read by both v_limit and the removal
--   left_out      the lens's own events exactly as that lens's read returns them: its lane, less this member's
--                 dismissals in it, the first v_lens_limit in the lane's order
--   kept          leaves those events out of every lane, so grouped counts, and the floors apply, after the
--                 removal. Under a search the floors still do not apply (1173)
-- Every other lane, the suggestion, lane_order, homes, follows and subscriptions are unchanged.

drop function public.convene_discovery(text, text[], text[], text, text[], uuid, text[], text, text);

create function public.convene_discovery(
  p_lens text default 'all',
  p_format text[] default null,
  p_price text[] default null,
  p_when text default null,
  p_families text[] default null,
  p_home uuid default null,
  p_places text[] default null,
  p_home_rung text default null,
  p_q text default null,
  p_without text default null
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_lens text := coalesce(nullif(btrim(p_lens), ''), 'all');
  v_tz text;
  v_local timestamp;
  v_today date;
  v_soon_end timestamptz;
  v_month_end timestamptz;
  v_week timestamp;
  v_weekend_start timestamptz;
  v_weekend_end timestamptz;
  v_fresh_since timestamptz := now() - interval '7 days';
  v_limit integer;
  v_lens_limit constant integer := 60;
  v_without text := nullif(btrim(p_without), '');
  v_modes public.event_mode[];
  v_place_city text;
  v_sections jsonb;
  v_suggest jsonb;
  v_q text := nullif(btrim(p_q), '');
  v_pat text;
  v_order jsonb;
begin
  if v_uid is null then
    raise exception 'convene_discovery: not signed in' using errcode = '42501';
  end if;
  if not exists (select 1 from public.convene_lenses l where l.lens = v_lens) then
    raise exception 'That is not a lens.' using errcode = '22023';
  end if;
  -- More on Convene (1148, 1174): p_without names a lens whose events this read of All leaves out, exactly
  -- the events that lens's own read returns, before the floors are applied.
  if v_without is not null and (
    v_lens <> 'all'
    or v_without = 'all'
    or not exists (select 1 from public.convene_lenses l where l.lens = v_without)
  ) then
    raise exception 'That is not a lens to leave out.' using errcode = '22023';
  end if;
  if p_when is not null and p_when not in ('two_weeks', 'this_month', 'later') then
    raise exception 'That is not a when.' using errcode = '22023';
  end if;
  if p_format is not null and not (p_format <@ array['in_person', 'online', 'hybrid']) then
    raise exception 'That is not a format.' using errcode = '22023';
  end if;
  if p_price is not null and not (p_price <@ array['free', 'paid']) then
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
  if p_home_rung is not null and (p_home is null or p_home_rung not in ('in', 'around', 'region', 'country')) then
    raise exception 'That is not a distance from a home.' using errcode = '22023';
  end if;
  if p_places is not null and exists (
    select 1 from unnest(p_places) x
    where not (
      (split_part(x, '|', 1) in ('city', 'region') and array_length(string_to_array(x, '|'), 1) = 3
        and split_part(x, '|', 3) <> '')
      or (split_part(x, '|', 1) = 'country' and array_length(string_to_array(x, '|'), 1) = 2
        and split_part(x, '|', 2) <> '')
    )
  ) then
    raise exception 'That is not a place.' using errcode = '22023';
  end if;

  -- Search (1124, 1159): the trimmed text, 1 to 100 characters, matched as a case-insensitive substring
  -- with the pattern characters taken literally. The corpus narrows before lanes form, so every floor
  -- applies to the narrowed corpus.
  if v_q is not null then
    if length(v_q) > 100 then
      raise exception 'That search is too long.' using errcode = '22023';
    end if;
    v_pat := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  v_tz := private.viewer_local_tz();
  if v_tz is null or not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = v_tz) then
    v_tz := 'UTC';
  end if;
  v_local := v_now at time zone v_tz;
  v_today := v_local::date;
  v_soon_end := (v_today + 14)::timestamp at time zone v_tz;
  v_month_end := (date_trunc('month', v_today::timestamp) + interval '1 month') at time zone v_tz;
  v_week := date_trunc('week', v_local);
  v_weekend_start := greatest(v_local, v_week + interval '4 days 17 hours') at time zone v_tz;
  v_weekend_end := (v_week + interval '7 days') at time zone v_tz;
  v_limit := case when v_lens = 'all' then 24 else v_lens_limit end;

  if p_format is not null then
    select array_agg(case f when 'online' then 'virtual' else f end::public.event_mode)
    into v_modes
    from unnest(p_format) f;
  end if;

  select x into v_place_city
  from unnest(p_places) with ordinality u(x, i)
  where split_part(x, '|', 1) = 'city'
  order by i
  limit 1;

  with corpus as (
    select
      e.id as event_id,
      p.id as post_id,
      p.published_at,
      e.host_member_id as host,
      e.mode,
      e.family,
      e.starts_at,
      coalesce(e.starts_at, e.expected_window_start::timestamp at time zone v_tz) as sort_at
    from public.events e
    join lateral (
      select p.id, p.published_at
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
      and (
        p_price is null
        or (case e.ticket_kind::text when 'donation' then 'paid' else e.ticket_kind::text end) = any (p_price)
      )
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
              and case
                when coalesce(p_home_rung, 'in') = 'around'
                     and h.lat is not null and h.lng is not null and d.lat is not null and d.lng is not null then
                  2 * 6371 * asin(sqrt(
                    power(sin(radians(d.lat - h.lat) / 2), 2)
                    + cos(radians(h.lat)) * cos(radians(d.lat)) * power(sin(radians(d.lng - h.lng) / 2), 2)
                  )) <= 50
                when coalesce(p_home_rung, 'in') in ('in', 'around') then
                  lower(btrim(d.city)) = lower(btrim(h.city))
                  and (d.country is null or h.country is null or lower(btrim(d.country)) = lower(btrim(h.country)))
                when p_home_rung = 'region' then
                  nullif(btrim(h.region), '') is not null
                  and lower(btrim(d.region)) = lower(btrim(h.region))
                  and (d.country is null or h.country is null or lower(btrim(d.country)) = lower(btrim(h.country)))
                else
                  nullif(btrim(h.country), '') is not null
                  and lower(btrim(d.country)) = lower(btrim(h.country))
              end
          )
        )
      )
      and (
        p_places is null
        or exists (
          select 1
          from public.event_delivery d
          cross join unnest(p_places) pl
          where d.event_id = c.event_id
            and d.kind = 'physical'
            and (
              (split_part(pl, '|', 1) = 'city'
                and coalesce(lower(btrim(replace(d.country, '|', ' '))), '') = split_part(pl, '|', 2)
                and lower(btrim(replace(d.city, '|', ' '))) = split_part(pl, '|', 3))
              or (split_part(pl, '|', 1) = 'region'
                and coalesce(lower(btrim(replace(d.country, '|', ' '))), '') = split_part(pl, '|', 2)
                and lower(btrim(replace(d.region, '|', ' '))) = split_part(pl, '|', 3))
              or (split_part(pl, '|', 1) = 'country'
                and lower(btrim(replace(d.country, '|', ' '))) = split_part(pl, '|', 2))
            )
        )
      )
      and (
        v_pat is null
        or e.title ilike v_pat
        or exists (
          select 1 from private.member_display(array[c.host]) hd where hd.name ilike v_pat
        )
        or (private.event_post_facts(c.event_id) -> 'presented_by' ->> 'name') ilike v_pat
        or exists (
          select 1
          from public.event_delivery d
          where d.event_id = c.event_id
            and (d.place_name ilike v_pat or d.city ilike v_pat or d.region ilike v_pat or d.country ilike v_pat)
        )
        or exists (
          select 1 from public.convene_families cf where cf.family = c.family and cf.label ilike v_pat
        )
      )
  ),
  candidates as (
    -- soon (659)
    select 'soon'::text as section, n.event_id, n.post_id,
      jsonb_build_object('kind', 'soon', 'starts_at', n.starts_at, 'mode', n.mode) as reason,
      extract(epoch from n.starts_at)::numeric as ord
    from narrowed n
    where n.starts_at >= v_now and n.starts_at < v_soon_end

    union all
    -- weekend (1092, 1106)
    select 'weekend', n.event_id, n.post_id,
      jsonb_build_object('kind', 'weekend', 'starts_at', n.starts_at, 'mode', n.mode),
      extract(epoch from n.starts_at)::numeric
    from narrowed n
    where n.starts_at >= v_weekend_start and n.starts_at < v_weekend_end

    union all
    -- online, shown as Join from anywhere (1092)
    select 'online', n.event_id, n.post_id,
      jsonb_build_object('kind', 'online', 'starts_at', n.starts_at, 'mode', n.mode),
      coalesce(extract(epoch from n.sort_at), 1e12)::numeric
    from narrowed n
    where n.mode in ('virtual', 'hybrid')

    union all
    -- filling (1124, 1157): five or more going as this viewer's row policy returns them, as event_page
    -- counts them; ranked by going registrations created in the last 72 hours, then by start. The rank is
    -- never shown and no count leaves this function.
    select 'filling', n.event_id, n.post_id,
      jsonb_build_object('kind', 'filling', 'starts_at', n.starts_at, 'mode', n.mode),
      (-(g.recent::numeric) * 1e12) + coalesce(extract(epoch from n.sort_at), 1e11)::numeric
    from narrowed n
    cross join lateral (
      select count(*) as total,
        count(*) filter (where r.created_at >= v_now - interval '72 hours') as recent
      from public.event_registrations r
      where r.event_id = n.event_id
        and r.status = 'going'
        and r.member_id is not null
    ) g
    where g.total >= 5

    union all
    -- fresh (1092, 1107): newest publication first
    select 'fresh', n.event_id, n.post_id,
      jsonb_build_object('kind', 'fresh', 'published_at', n.published_at),
      (-extract(epoch from n.published_at))::numeric
    from narrowed n
    where n.published_at >= v_fresh_since

    union all
    -- curated (20, 41, 629, 1040): newest pick first
    select 'curated', n.event_id, n.post_id,
      jsonb_build_object('kind', 'curated', 'editor', jsonb_build_object('id', d.id, 'name', d.name), 'line', k.line),
      (-extract(epoch from k.picked_at))::numeric
    from narrowed n
    join public.convene_picks k on k.event_id = n.event_id and k.withdrawn_at is null
    cross join lateral private.member_display(array[k.picked_by]) d

    union all
    -- follow (650)
    select 'follow', n.event_id, n.post_id,
      jsonb_build_object('kind', 'follow', 'host', jsonb_build_object('id', d.id, 'name', d.name)),
      coalesce(extract(epoch from n.sort_at), 1e12)::numeric
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
    -- near (633): the first matching home in the member's order ranks the event; no chosen city
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
    where v_place_city is null
      and n.mode in ('in_person', 'hybrid')

    union all
    -- near with a chosen city: that city's in-person and hybrid events (B9-SPEC, 1095)
    select 'near', n.event_id, n.post_id,
      jsonb_build_object('kind', 'near', 'place', jsonb_build_object('city', pc.city)),
      coalesce(extract(epoch from n.sort_at), 1e12)::numeric
    from narrowed n
    cross join lateral (
      select btrim(d.city) as city
      from public.event_delivery d
      where d.event_id = n.event_id
        and d.kind = 'physical'
        and coalesce(lower(btrim(replace(d.country, '|', ' '))), '') = split_part(v_place_city, '|', 2)
        and lower(btrim(replace(d.city, '|', ' '))) = split_part(v_place_city, '|', 3)
      order by d.position
      limit 1
    ) pc
    where v_place_city is not null
      and n.mode in ('in_person', 'hybrid')

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
  -- The lens's own events (1174): its one lane less this member's dismissals in it, the first v_lens_limit
  -- in its order, as the read of that lens returns them.
  left_out as (
    select w.event_id
    from (
      select r.event_id, row_number() over (order by r.ord, r.event_id) as rn
      from candidates r
      where r.section = v_without
        and not exists (
          select 1 from public.discovery_dismissals x
          where x.member_id = v_uid and x.event_id = r.event_id and x.section = r.section
        )
    ) w
    where w.rn <= v_lens_limit
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
      and not exists (select 1 from left_out w where w.event_id = r.event_id)
  ),
  -- Learned order (1124, 1160): a lane the member acted in during the last seven days moves up, most
  -- recent first; the base order holds beneath. Read here, written only by note_lane_act.
  grouped as (
    select l.lane as section, l.position, la.acted_at as learned_at,
      coalesce((
        select jsonb_agg(jsonb_build_object('event_id', k.event_id, 'post_id', k.post_id, 'reason', k.reason)
                         order by k.rn)
        from kept k
        where k.section = l.lane and k.rn <= v_limit
      ), '[]'::jsonb) as items,
      (select count(*) from kept k where k.section = l.lane) as n
    from public.convene_lanes l
    left join public.member_lane_activity la
      on la.member_id = v_uid and la.lane = l.lane and la.acted_at >= v_now - interval '7 days'
    where v_lens = 'all' or l.lane = v_lens
  )
  select coalesce(jsonb_agg(jsonb_build_object('section', g.section, 'items', g.items)
                            order by g.learned_at desc nulls last, g.position), '[]'::jsonb)
  into v_sections
  from grouped g
  where v_lens <> 'all'
     or g.n >= case when v_pat is null then private.convene_threshold(g.section) else 1 end;

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

  select jsonb_agg(l.lane order by la.acted_at desc nulls last, l.position)
  into v_order
  from public.convene_lanes l
  left join public.member_lane_activity la
    on la.member_id = v_uid and la.lane = l.lane and la.acted_at >= v_now - interval '7 days';

  return jsonb_build_object(
    'lens', v_lens,
    'lane_order', v_order,
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

revoke execute on function public.convene_discovery(text, text[], text[], text, text[], uuid, text[], text, text, text) from public, anon;
grant execute on function public.convene_discovery(text, text[], text[], text, text[], uuid, text[], text, text, text) to authenticated, service_role;
