-- Convene Discovery rebuild (handoff 32-B), file 1 of 2: the lanes leave the lens table, the lens set
-- becomes five, and the one read projection learns the nine lanes and the Place facet. Rulings 581,
-- 632, 633, 1092, 1093, 1095, 1105, 1106 and 1107, on 650, 658, 659, 680 and 1040. Committed before it
-- is applied (ruling 225). Applied to the canonical project by Chat through the Supabase MCP's
-- execute_sql under rulings 963 and 965, with its supabase_migrations.schema_migrations row in the
-- same transaction, and never by apply_migration (rulings 553, 269).
--
-- Why a second table (1105). public.convene_lenses was the lens bar's vocabulary and the lane table at
-- once: discovery_dismissals and private.convene_thresholds reference it with ON DELETE CASCADE, and
-- convene_discovery formed its sections from it. Cutting it to 1093's five rows in place would have
-- dropped three lanes with their floors and every dismissal in them. So public.convene_lanes is
-- created with 1092's nine, both references are moved onto it, and only then does the lens table
-- lose soon, online and near. A lens says who (follow, taste, curated, network map one to one onto
-- their lanes); a facet says what.
--
-- The floors are B9-SPEC's and stay internal (632): soon 4, weekend 2, online 2, fresh 2, curated 1,
-- follow 1, taste 2, near 2, network 1. A lane renders on All only at or above its floor; under its
-- own lens it renders whatever it holds.
--
-- What changes in public.convene_discovery, and nothing else does:
--   weekend  Friday 17:00 to Monday 00:00 in the member's zone; before Friday 17:00 the coming
--            weekend, during it what is left (1106)
--   fresh    an upcoming event whose post was published in the last seven days, newest first (1107)
--   price    free or paid; a donation event is paid (1095)
--   places   p_places, ids from public.convene_places(): 'city|<country>|<city>',
--            'region|<country>|<region>' or 'country|<country>', lower-cased and trimmed; an event
--            matches when one of its physical places matches one id. With a city chosen, the near
--            lane holds that city's in-person and hybrid events instead of the homes' (B9-SPEC)
--   sections formed from convene_lanes in its order, returned under the same keys as before
-- The signature gains p_places, so the function is dropped and recreated with its grants.
--
-- public.convene_places() serves Place's typeahead (1095): every city, region and country that has an
-- event in the discovery corpus as this member sees it, so the list is grounded by construction and
-- never counted. It runs as the caller, like the projection.

-- ---------------------------------------------------------------------------------------------
-- The lanes (1092, 1105)
-- ---------------------------------------------------------------------------------------------

create table public.convene_lanes (
  lane text primary key
    check (lane in ('soon', 'weekend', 'online', 'fresh', 'curated', 'follow', 'taste', 'near', 'network')),
  name text not null check (length(btrim(name)) between 1 and 60),
  position smallint not null unique check (position >= 0)
);

comment on table public.convene_lanes is
  'Discovery''s nine lanes in 1092''s one fixed order (1105). Floors are private.convene_thresholds (632); dismissals are per lane (581). Served by vocabularies() as convene_lanes.';

alter table public.convene_lanes enable row level security;

revoke all on table public.convene_lanes from anon, authenticated;
grant select on table public.convene_lanes to authenticated;
grant all on table public.convene_lanes to service_role;

create policy convene_lanes_member_select on public.convene_lanes
  for select to authenticated
  using (true);

create policy convene_lanes_service_role on public.convene_lanes
  for all to service_role
  using (true) with check (true);

insert into public.convene_lanes (lane, name, position) values
  ('soon', 'Happening soon', 0),
  ('weekend', 'This weekend', 1),
  ('online', 'Join from anywhere', 2),
  ('fresh', 'New this week', 3),
  ('curated', 'Curated by Convene', 4),
  ('follow', 'From communities you follow', 5),
  ('taste', 'Because of what you follow', 6),
  ('near', 'Near your homes', 7),
  ('network', 'Connected to your network', 8);

-- ---------------------------------------------------------------------------------------------
-- Floors and dismissals move onto the lanes before the lens table shrinks
-- ---------------------------------------------------------------------------------------------

alter table private.convene_thresholds drop constraint convene_thresholds_section_fkey;
alter table private.convene_thresholds
  add constraint convene_thresholds_section_fkey foreign key (section)
  references public.convene_lanes (lane) on update cascade on delete cascade;

insert into private.convene_thresholds (section, floor) values
  ('soon', 4), ('weekend', 2), ('online', 2), ('fresh', 2), ('curated', 1),
  ('follow', 1), ('taste', 2), ('near', 2), ('network', 1)
on conflict (section) do update set floor = excluded.floor, updated_at = now();

alter table public.discovery_dismissals drop constraint discovery_dismissals_section_fkey;
alter table public.discovery_dismissals
  add constraint discovery_dismissals_section_fkey foreign key (section)
  references public.convene_lanes (lane) on update cascade on delete cascade;

-- ---------------------------------------------------------------------------------------------
-- The lens set is five (1093)
-- ---------------------------------------------------------------------------------------------

delete from public.convene_lenses where lens in ('soon', 'online', 'near');

alter table public.convene_lenses drop constraint convene_lenses_lens_check;
alter table public.convene_lenses
  add constraint convene_lenses_lens_check check (lens in ('all', 'follow', 'taste', 'curated', 'network'));

update public.convene_lenses set name = 'Communities', position = 1 where lens = 'follow';
update public.convene_lenses set name = 'For you', short = 'For you', position = 2 where lens = 'taste';
update public.convene_lenses set name = 'Curated', position = 3 where lens = 'curated';
update public.convene_lenses set name = 'My network', position = 4 where lens = 'network';

comment on table public.convene_lenses is
  'Convene''s lens set (693, 1041, 1093): All, Communities, For you, Curated, My network. A lens says who the events come from; each lens but All shows its one lane (1105). Served by vocabularies() as convene_lenses.';

-- ---------------------------------------------------------------------------------------------
-- Dismissals name a lane (581, 1105)
-- ---------------------------------------------------------------------------------------------

create or replace function public.dismiss_discovery_item(p_event uuid, p_section text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'dismiss_discovery_item: not signed in' using errcode = '42501';
  end if;
  if p_section is null
     or not exists (select 1 from public.convene_lanes l where l.lane = p_section) then
    raise exception 'That is not a section.' using errcode = '22023';
  end if;
  if p_event is null or not exists (select 1 from public.events e where e.id = p_event) then
    raise exception 'That is not an event.' using errcode = '22023';
  end if;
  insert into public.discovery_dismissals (member_id, event_id, section)
  values (v_uid, p_event, p_section)
  on conflict (member_id, event_id, section) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- vocabularies() serves the lanes beside the lenses
-- ---------------------------------------------------------------------------------------------

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
                      from public.convene_lanes n)
  );
$$;

-- ---------------------------------------------------------------------------------------------
-- Place's typeahead (1095)
-- ---------------------------------------------------------------------------------------------

create function public.convene_places()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_tz text;
begin
  if v_uid is null then
    raise exception 'convene_places: not signed in' using errcode = '42501';
  end if;
  v_tz := private.viewer_local_tz();
  if v_tz is null or not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = v_tz) then
    v_tz := 'UTC';
  end if;

  return (
    with places as (
      select d.city, d.region, d.country
      from public.events e
      join public.event_delivery d on d.event_id = e.id and d.kind = 'physical'
      where e.status = 'published'
        and exists (
          select 1 from public.posts p
          where p.created_object_kind = 'event' and p.created_object_id = e.id and p.status = 'published'
        )
        and (
          coalesce(e.ends_at, e.starts_at, (e.expected_window_end + 1)::timestamp at time zone v_tz) is null
          or coalesce(e.ends_at, e.starts_at, (e.expected_window_end + 1)::timestamp at time zone v_tz) > v_now
        )
    ),
    options as (
      select distinct on (k.id) k.id, k.kind, k.name, k.country, k.rank
      from (
        select 'city|' || coalesce(lower(btrim(replace(p.country, '|', ' '))), '') || '|'
                 || lower(btrim(replace(p.city, '|', ' '))) as id,
               'city'::text as kind, btrim(p.city) as name, btrim(p.country) as country, 0 as rank
        from places p where nullif(btrim(p.city), '') is not null
        union all
        select 'region|' || coalesce(lower(btrim(replace(p.country, '|', ' '))), '') || '|'
                 || lower(btrim(replace(p.region, '|', ' '))),
               'region', btrim(p.region), btrim(p.country), 1
        from places p where nullif(btrim(p.region), '') is not null
        union all
        select 'country|' || lower(btrim(replace(p.country, '|', ' '))),
               'country', btrim(p.country), btrim(p.country), 2
        from places p where nullif(btrim(p.country), '') is not null
      ) k
      order by k.id, k.name
    )
    select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'kind', o.kind, 'name', o.name, 'country', o.country)
                              order by o.rank, o.name, o.id), '[]'::jsonb)
    from options o
  );
end;
$$;

revoke execute on function public.convene_places() from public, anon;
grant execute on function public.convene_places() to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- The projection (631 as amended by 1092; 1093, 1095, 1105 to 1107)
-- ---------------------------------------------------------------------------------------------

drop function public.convene_discovery(text, text[], text[], text, text[], uuid);

create function public.convene_discovery(
  p_lens text default 'all',
  p_format text[] default null,
  p_price text[] default null,
  p_when text default null,
  p_families text[] default null,
  p_home uuid default null,
  p_places text[] default null
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
              and lower(btrim(d.city)) = lower(btrim(h.city))
              and (d.country is null or h.country is null or lower(btrim(d.country)) = lower(btrim(h.country)))
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

revoke execute on function public.convene_discovery(text, text[], text[], text, text[], uuid, text[]) from public, anon;
grant execute on function public.convene_discovery(text, text[], text[], text, text[], uuid, text[]) to authenticated, service_role;
