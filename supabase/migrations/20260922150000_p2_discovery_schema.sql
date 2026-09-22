-- Convene Pass 2 (Brief 9, the Discovery Dashboard): the schema the dashboard reads and writes.
-- Rulings 1037 to 1045, on 20, 41, 194, 581, 629, 631, 632, 650, 657, 658, 693, 729 and 925.
-- Committed before it is applied (ruling 225). Applied to the canonical project by Chat through the
-- Supabase MCP's execute_sql under rulings 963 and 965, with its supabase_migrations.schema_migrations
-- row in the same transaction, and never by apply_migration (rulings 553, 269). Runs after
-- 20260922120000. The projection that reads these tables is 20260922150100, in a second transaction.
--
-- The families (657, 1037, 1038). public.convene_families is Convene's one runtime vocabulary of
-- category families: a machine value, the label a surface shows, the schema.org types the discovery
-- report anchors each family to, and a position. It seeds the report's nine. Civic and community and
-- Giving and cause carry no anchor in the report and hold an empty array; an export maps an empty
-- array to schema.org Event. Virtual and hybrid is the format axis (events.mode), not a family.
-- public.vocabularies() serves the table as convene_families.
--
-- The family on an event (1037). events.family is one nullable reference. A host sets it through the
-- events table's existing update policy; Pass 1's composer gains the field only once Design draws it.
-- An event with no family is in no family's lane and matches no family facet (grounded-or-empty).
--
-- The lenses (693, 1041). public.convene_lenses holds All and 631's seven sections: the section name
-- a lane heading and a lens list heading read verbatim, the short word the LensBar seat reads (925:
-- My homes, never Near me), the Strand icon, the scope line under the bar (729) and 631's order. The
-- ids are pinned by a check to the eight the projection has a branch for, so no row can name a lens
-- nothing renders, and none is `events`, which is Brief 10's route segment under /convene.
-- public.vocabularies() serves the table as convene_lenses. The Feed's src/lib/lens.ts is not this
-- table's concern: 194 ratifies lens ids as structural and their labels as copy (1041).
--
-- Subscriptions (658, 1039). public.member_subscriptions is the one typed relation, separate from
-- follows (650): kind family or home, exactly one target. Only family is writable at launch, through
-- public.set_subscription; home waits for the city digests and no function writes it yet.
--
-- The editors and the picks (20, 41, 629, 1040). public.editors is the platform's one editor role,
-- because 20 has one editor owning Diaspora Daily and the Curated picks. public.convene_picks is a
-- live editorial pick of an event with the editor's one line, shown as that person's choice and
-- never paid. At most one live pick per event. Both are written by the service role only; no
-- authoring surface is drawn yet.
--
-- Dismissals (581, 1044). public.discovery_dismissals records that a member took one event out of one
-- section. The key is member, event and section, so the same event stays in the member's other
-- sections. Written through public.dismiss_discovery_item only.
--
-- Thresholds (632, 1045). private.convene_thresholds holds each section's internal floor, read only by
-- private.convene_threshold, which the projection calls. No client role reads the table and no floor
-- ever reaches a surface. The stand-in floor while prototyping is 1.
--
-- Who reads what, by persona:
--   member      the families and the lenses; their own subscriptions and dismissals; live picks of
--               events the events table's own policy lets them see.
--   editor      as a member. Picks are written by the service role.
--   signed out  nothing here (662).
--   admin       every row, read only.
--   service     everything.
--
-- The write paths. Direct writes are refused: authenticated holds select only on these tables, and no
-- policy admits an insert, update or delete. set_subscription and dismiss_discovery_item are the two
-- member write paths, each security definer with an empty search_path.

-- ---------------------------------------------------------------------------------------------
-- The families (657, 1037, 1038)
-- ---------------------------------------------------------------------------------------------

create table public.convene_families (
  family text primary key check (family ~ '^[a-z]+(_[a-z]+)*$'),
  label text not null check (length(btrim(label)) between 1 and 60),
  schema_org text[] not null default '{}'::text[],
  position smallint not null unique check (position >= 1),
  created_at timestamptz not null default now()
);

comment on table public.convene_families is
  'Convene''s category families (657, 1037, 1038): the discovery report''s nine, with schema.org anchors. Served by vocabularies() as convene_families.';

alter table public.convene_families enable row level security;

revoke all on table public.convene_families from anon, authenticated;
grant select on table public.convene_families to authenticated;
grant all on table public.convene_families to service_role;

create policy convene_families_member_select on public.convene_families
  for select to authenticated
  using (true);

create policy convene_families_service_role on public.convene_families
  for all to service_role
  using (true) with check (true);

insert into public.convene_families (family, label, schema_org, position) values
  ('small_social', 'Small social gatherings', array['SocialEvent'], 1),
  ('learning_dialogue', 'Learning and dialogue', array['EducationEvent', 'CourseInstance'], 2),
  ('professional_economic', 'Professional and economic', array['BusinessEvent'], 3),
  ('culture_arts', 'Culture and arts',
    array['MusicEvent', 'Festival', 'VisualArtsEvent', 'TheaterEvent', 'DanceEvent', 'LiteraryEvent', 'ScreeningEvent'], 4),
  ('heritage_religious', 'Cultural, heritage and religious', array['SocialEvent'], 5),
  ('civic_community', 'Civic and community', '{}'::text[], 6),
  ('giving_cause', 'Giving and cause', '{}'::text[], 7),
  ('sport_wellness', 'Sport and wellness', array['SportsEvent'], 8),
  ('family_kids', 'Family and kids', array['ChildrensEvent'], 9);

alter table public.events
  add column family text references public.convene_families (family) on update cascade on delete restrict;

comment on column public.events.family is
  'The event''s one category family (1037). Null until the host sets it; an event with no family is in no family''s lane.';

create index events_family_idx on public.events (family) where family is not null;

-- ---------------------------------------------------------------------------------------------
-- The lenses (693, 1041)
-- ---------------------------------------------------------------------------------------------

create table public.convene_lenses (
  lens text primary key
    check (lens in ('all', 'follow', 'taste', 'soon', 'online', 'curated', 'near', 'network')),
  name text not null check (length(btrim(name)) between 1 and 60),
  short text not null check (length(btrim(short)) between 1 and 20),
  icon text not null check (icon ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  scope text not null check (length(btrim(scope)) between 1 and 120),
  position smallint not null unique check (position >= 0)
);

comment on table public.convene_lenses is
  'Convene''s lens set (693, 1041): All and 631''s seven sections in 631''s order, with the LensBar seat''s short word (925) and the scope line (729). Served by vocabularies() as convene_lenses.';

alter table public.convene_lenses enable row level security;

revoke all on table public.convene_lenses from anon, authenticated;
grant select on table public.convene_lenses to authenticated;
grant all on table public.convene_lenses to service_role;

create policy convene_lenses_member_select on public.convene_lenses
  for select to authenticated
  using (true);

create policy convene_lenses_service_role on public.convene_lenses
  for all to service_role
  using (true) with check (true);

insert into public.convene_lenses (lens, name, short, icon, scope, position) values
  ('all', 'All', 'All', 'circle-dot', 'Everything happening, as lanes.', 0),
  ('follow', 'From communities you follow', 'Communities', 'users', 'Events whose host you follow.', 1),
  ('taste', 'Because of what you follow', 'Categories', 'heart',
    'Events in the category families you subscribe to.', 2),
  ('soon', 'Happening soon', 'Soon', 'clock', 'The next two weeks, across every home you hold.', 3),
  ('online', 'Online from anywhere', 'Online', 'globe', 'Online and hybrid events, any place.', 4),
  ('curated', 'Curated by Convene', 'Curated', 'bookmark', 'Picks chosen by an editor and named as theirs.', 5),
  ('near', 'Near your homes', 'My homes', 'map-pin', 'In-person and hybrid events in your homes, in order.', 6),
  ('network', 'Connected to your network', 'My network', 'user-plus', 'A connection hosting, or connections going.', 7);

-- ---------------------------------------------------------------------------------------------
-- Subscriptions (658, 1039)
-- ---------------------------------------------------------------------------------------------

create table public.member_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  kind text not null check (kind in ('family', 'home')),
  family text references public.convene_families (family) on update cascade on delete cascade,
  home_id uuid references public.member_homes (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint member_subscriptions_one_target check (
    (kind = 'family' and family is not null and home_id is null)
    or (kind = 'home' and home_id is not null and family is null)
  )
);

comment on table public.member_subscriptions is
  'A member''s subscriptions (658, 1039): one typed relation, family or home, separate from follows. Family is written by set_subscription; home waits for the city digests.';

create unique index member_subscriptions_family_key
  on public.member_subscriptions (member_id, family) where kind = 'family';
create unique index member_subscriptions_home_key
  on public.member_subscriptions (member_id, home_id) where kind = 'home';

alter table public.member_subscriptions enable row level security;

revoke all on table public.member_subscriptions from anon, authenticated;
grant select on table public.member_subscriptions to authenticated;
grant all on table public.member_subscriptions to service_role;

create policy member_subscriptions_owner_select on public.member_subscriptions
  for select to authenticated
  using (member_id = (select auth.uid()));

create policy member_subscriptions_admin_select on public.member_subscriptions
  for select to authenticated
  using (private.is_admin());

create policy member_subscriptions_service_role on public.member_subscriptions
  for all to service_role
  using (true) with check (true);

create or replace function public.set_subscription(p_family text, p_on boolean)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'set_subscription: not signed in' using errcode = '42501';
  end if;
  if p_family is null or not exists (select 1 from public.convene_families f where f.family = p_family) then
    raise exception 'That is not a category family.' using errcode = '22023';
  end if;
  if coalesce(p_on, false) then
    insert into public.member_subscriptions (member_id, kind, family)
    values (v_uid, 'family', p_family)
    on conflict (member_id, family) where kind = 'family' do nothing;
  else
    delete from public.member_subscriptions s
    where s.member_id = v_uid and s.kind = 'family' and s.family = p_family;
  end if;
end;
$$;

revoke execute on function public.set_subscription(text, boolean) from public, anon;
grant execute on function public.set_subscription(text, boolean) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- The editors and the picks (20, 41, 629, 1040)
-- ---------------------------------------------------------------------------------------------

create table public.editors (
  member_id uuid primary key references public.members (id) on delete cascade,
  granted_at timestamptz not null default now()
);

comment on table public.editors is
  'The platform''s editor role (20, 1040): the people whose picks Curated by Convene and Diaspora Daily carry. Written by the service role only.';

alter table public.editors enable row level security;

revoke all on table public.editors from anon, authenticated;
grant all on table public.editors to service_role;

create policy editors_service_role on public.editors
  for all to service_role
  using (true) with check (true);

create or replace function private.is_editor(p_member uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select p_member is not null and exists (select 1 from public.editors e where e.member_id = p_member);
$$;

revoke execute on function private.is_editor(uuid) from public, anon, authenticated;
grant execute on function private.is_editor(uuid) to service_role;

create table public.convene_picks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  picked_by uuid not null references public.editors (member_id) on delete restrict,
  line text not null check (length(btrim(line)) between 1 and 200),
  picked_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  constraint convene_picks_withdrawn_after check (withdrawn_at is null or withdrawn_at >= picked_at)
);

comment on table public.convene_picks is
  'Curated by Convene (20, 41, 629, 1040): an editor''s live pick of an event with their one line, shown as their choice and never paid. Written by the service role only.';

create unique index convene_picks_live_key on public.convene_picks (event_id) where withdrawn_at is null;
create index convene_picks_picked_by_idx on public.convene_picks (picked_by);

alter table public.convene_picks enable row level security;

revoke all on table public.convene_picks from anon, authenticated;
grant select on table public.convene_picks to authenticated;
grant all on table public.convene_picks to service_role;

create policy convene_picks_member_select on public.convene_picks
  for select to authenticated
  using (
    withdrawn_at is null
    and exists (select 1 from public.events e where e.id = convene_picks.event_id)
  );

create policy convene_picks_admin_select on public.convene_picks
  for select to authenticated
  using (private.is_admin());

create policy convene_picks_service_role on public.convene_picks
  for all to service_role
  using (true) with check (true);

-- ---------------------------------------------------------------------------------------------
-- Dismissals (581, 1044)
-- ---------------------------------------------------------------------------------------------

create table public.discovery_dismissals (
  member_id uuid not null references public.members (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  section text not null references public.convene_lenses (lens) on update cascade on delete cascade
    check (section <> 'all'),
  created_at timestamptz not null default now(),
  primary key (member_id, event_id, section)
);

comment on table public.discovery_dismissals is
  'DIA''s Not this? on Discovery (581, 1044): one event out of one section for one member, persisted server-side. Written by dismiss_discovery_item only.';

create index discovery_dismissals_event_idx on public.discovery_dismissals (event_id);

alter table public.discovery_dismissals enable row level security;

revoke all on table public.discovery_dismissals from anon, authenticated;
grant select on table public.discovery_dismissals to authenticated;
grant all on table public.discovery_dismissals to service_role;

create policy discovery_dismissals_owner_select on public.discovery_dismissals
  for select to authenticated
  using (member_id = (select auth.uid()));

create policy discovery_dismissals_admin_select on public.discovery_dismissals
  for select to authenticated
  using (private.is_admin());

create policy discovery_dismissals_service_role on public.discovery_dismissals
  for all to service_role
  using (true) with check (true);

create or replace function public.dismiss_discovery_item(p_event uuid, p_section text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'dismiss_discovery_item: not signed in' using errcode = '42501';
  end if;
  if p_section is null or p_section = 'all'
     or not exists (select 1 from public.convene_lenses l where l.lens = p_section) then
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

revoke execute on function public.dismiss_discovery_item(uuid, text) from public, anon;
grant execute on function public.dismiss_discovery_item(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Thresholds (632, 1045)
-- ---------------------------------------------------------------------------------------------

create table private.convene_thresholds (
  section text primary key references public.convene_lenses (lens) on update cascade on delete cascade
    check (section <> 'all'),
  floor integer not null check (floor >= 1),
  updated_at timestamptz not null default now()
);

comment on table private.convene_thresholds is
  'Each Discovery section''s internal floor (632, 1045). Never shown. Set empirically after launch; 1 while prototyping.';

revoke all on table private.convene_thresholds from public, anon, authenticated;
grant all on table private.convene_thresholds to service_role;

insert into private.convene_thresholds (section, floor) values
  ('follow', 1), ('taste', 1), ('soon', 1), ('online', 1), ('curated', 1), ('near', 1), ('network', 1);

create or replace function private.convene_threshold(p_section text)
returns integer
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce((select t.floor from private.convene_thresholds t where t.section = p_section), 1);
$$;

revoke execute on function private.convene_threshold(text) from public, anon;
grant execute on function private.convene_threshold(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- The vocabulary read (187, 693, 1037, 1041)
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
    -- Rulings 693, 925, 729 and 1041: Convene's lens set, All then 631's seven in 631's order.
    'convene_lenses', (select coalesce(jsonb_agg(jsonb_build_object(
                                'value', l.lens, 'name', l.name, 'short', l.short, 'icon', l.icon, 'scope', l.scope)
                                order by l.position), '[]'::jsonb)
                       from public.convene_lenses l)
  );
$$;
