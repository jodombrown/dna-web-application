-- Convene Discovery rebuild (handoff 32-B), file 3 of 3: the Home ladders reach the projection, and the
-- rail remembers its state per member. Rulings 633, 927, 928, 1060, 1082, 1094, 1110 and 1111. Runs after
-- 20260924100000 and 20260924110000. Committed before it is applied (ruling 225). Applied to the canonical
-- project by Chat through the Supabase MCP's execute_sql under rulings 963 and 965, with its
-- supabase_migrations.schema_migrations row in the same transaction, and never by apply_migration
-- (rulings 553, 269).
--
-- The Home ladders (928, 1060, 1110). p_home_rung names how far from the chosen home an event may be:
--   in       the home's city, as before (the default when p_home is set and the rung is not)
--   around   within 50 km of the home's stored coordinates, measured to the event place's coordinates
--            on a sphere of radius 6371 km; where either side lacks coordinates, the city match (1110).
--            The distance is internal and never shown (632)
--   region   the home's stored region (1060) and country; a home with no stored region matches nothing
--   country  the home's country
-- Anywhere is no p_home at all. A rung without a home is refused. The Near your homes lane still ranks
-- by the member's homes and never filters (633); the rung narrows the corpus like every other facet.
-- The function body is 20260924100000's with only these edits, so the signature gains p_home_rung and
-- the function is dropped and recreated with its grants.
--
-- The rail's memory (1082, 1094, 1111). public.member_rail_state holds one row per member, surface and
-- width band: whether that rail was left collapsed. The member writes their own rows under row policy
-- and reads only their own; no row means the rail opens collapsed (1094). The surface and band names
-- are the app's keys, held to the slug form and never shown.

-- ---------------------------------------------------------------------------------------------
-- The projection with the ladders (1110)
-- ---------------------------------------------------------------------------------------------

drop function public.convene_discovery(text, text[], text[], text, text[], uuid, text[]);

create function public.convene_discovery(
  p_lens text default 'all',
  p_format text[] default null,
  p_price text[] default null,
  p_when text default null,
  p_families text[] default null,
  p_home uuid default null,
  p_places text[] default null,
  p_home_rung text default null
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
  v_modes public.event_mode[];
  v_place_city text;
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
  v_limit := case when v_lens = 'all' then 24 else 60 end;

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
    select l.lane as section, l.position,
      coalesce((
        select jsonb_agg(jsonb_build_object('event_id', k.event_id, 'post_id', k.post_id, 'reason', k.reason)
                         order by k.rn)
        from kept k
        where k.section = l.lane and k.rn <= v_limit
      ), '[]'::jsonb) as items,
      (select count(*) from kept k where k.section = l.lane) as n
    from public.convene_lanes l
    where v_lens = 'all' or l.lane = v_lens
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

revoke execute on function public.convene_discovery(text, text[], text[], text, text[], uuid, text[], text) from public, anon;
grant execute on function public.convene_discovery(text, text[], text[], text, text[], uuid, text[], text) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- The rail's memory (1111)
-- ---------------------------------------------------------------------------------------------

create table public.member_rail_state (
  member_id uuid not null references public.members (id) on delete cascade,
  surface text not null check (surface ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(surface) <= 40),
  width_band text not null check (width_band ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(width_band) <= 20),
  collapsed boolean not null,
  updated_at timestamptz not null default now(),
  primary key (member_id, surface, width_band)
);

comment on table public.member_rail_state is
  'Whether a member left a surface''s rail collapsed at a width band (1082, 1094, 1111). No row means collapsed. Written and read by the member only.';

alter table public.member_rail_state enable row level security;

revoke all on table public.member_rail_state from anon, authenticated;
grant select, insert, update, delete on table public.member_rail_state to authenticated;
grant all on table public.member_rail_state to service_role;

create policy member_rail_state_owner_select on public.member_rail_state
  for select to authenticated
  using (member_id = (select auth.uid()));

create policy member_rail_state_owner_insert on public.member_rail_state
  for insert to authenticated
  with check (member_id = (select auth.uid()));

create policy member_rail_state_owner_update on public.member_rail_state
  for update to authenticated
  using (member_id = (select auth.uid()))
  with check (member_id = (select auth.uid()));

create policy member_rail_state_owner_delete on public.member_rail_state
  for delete to authenticated
  using (member_id = (select auth.uid()));

create policy member_rail_state_service_role on public.member_rail_state
  for all to service_role
  using (true) with check (true);
