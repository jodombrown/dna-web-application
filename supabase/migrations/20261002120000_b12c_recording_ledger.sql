-- Brief 12 12C, part 1: the recording layer and the mobilization ledger (Session 40, Lane C, handoff
-- 40-C). Schema and server only, no surface (1264). Governed by Brief 12 Revision 3,
-- TRACKING-PLAN-12C.md and rulings 1179, 1273, 1280 to 1288, 1294 to 1300, 1303 to 1305, with the
-- three choices at the end of the handoff ruled as written (1312, 1313, 1314), and 1116, 382 and 442.
-- Committed before it is applied (ruling 225). Applied by Chat through the Supabase MCP's execute_sql
-- with its supabase_migrations.schema_migrations row in the same transaction, never by apply_migration
-- (rulings 553, 963, 965). Runs after 20261001120000.
--
-- Read live on 2 October 2026 before this file was written: PostgreSQL 17.6; 72 tables in public and
-- none partitioned; pg_cron 1.6.4 with two jobs, dna_second_degree_nightly and
-- dna_introduction_expiry_nightly, owned by postgres; public.world_countries holds 195 rows, name and
-- position only; public.countries holds the 55 African Union member states by name, and 54 of them
-- match a world_countries row by that spelling, the one that does not being the Sahrawi Arab Democratic
-- Republic, which is an African Union member and not a United Nations member, so ruling 142's list has
-- no row for it; public.members carries stance (enum public.stance, default exploring),
-- stance_declared_at, current_country, current_place and local_tz, and no history of any of them;
-- public.corridors keys on a text id (los-angeles-accra-agriculture is the one row), and
-- public.member_corridors holds member_id and corridor_id text, no rows; public.attestations carries
-- accepted_at under ruling 435 (null is unaccepted and invisible to every projection), with one event
-- attestation on an event whose starts_at is null; public.connection_requests holds 14 accepted rows,
-- every one with to_member_id and responded_at; public.stories carries author_member_id;
-- private.rate_limit(uuid, text, interval, integer) exists and takes any uuid as its key; the live_arms
-- role exists under ruling 382 with select scoped to the two test accounts on members and
-- attestations; and the ensure_rls event trigger enables row security on every table created in public,
-- partitions included, which this file does again explicitly rather than rely on.
--
-- Two places the handoff's mechanism and the tree disagree, built to the outcome and reported (555):
--   corridor_ids is text[], not uuid[], because corridors.id is text;
--   is_african is set for the 54 African Union members world_countries carries, and the guard names
--   the one it cannot carry rather than failing on it; a 55-row match is not possible against a list
--   of United Nations members, and adding a country to ruling 142's list is scope nobody decided.
--
-- What this adds.
--   public.world_countries.is_african    which countries are African (1295), from public.countries.
--   public.member_profile_history        stance and place as they were, one row per change, one
--                                        backfill row per existing member (choice 2, 1313);
--                                        private.profile_at reads the row in force at a moment.
--   public.surface_event_kinds           the behaviour vocabulary, eighteen rows, read by authenticated.
--   public.surface_events                the behaviour log (1179), partitioned by month, no client
--                                        grant, written only by public.record_event; partitions for
--                                        the current and next month, made by
--                                        private.surface_events_ensure_partitions and dropped after
--                                        90 days by private.surface_events_drop_old_partitions.
--   public.partner_acts                  off-platform acts (1287), append-only, no writer yet.
--   public.mobilization_ledger           one row per act per definition version (1280 to 1288, 1294
--                                        to 1296), derived by private.derive_mobilization_v1 and
--                                        rebuilt from the product facts at any time.
--   public.surface_event_rollups         hourly counts of the behaviour log, kept forever, written
--                                        by private.rollup_surface_events.
--   public.admin_catalogue               every table's admin and DIA treatment (1299, 1300), the new
--                                        tables with real treatments and every earlier one unreviewed.
--   four pg_cron jobs                    derive hourly, roll up hourly, partition monthly, drop daily.
--   live_arms grants (382)               select scoped to the test accounts on the history, the log
--                                        and the ledger, select on the catalogue, execute on the
--                                        helpers the arms call, and private.mobilization_jobs() for
--                                        the cron arm, because cron.job is supabase_admin's.
--
-- What this file does not touch: any surface, src/, tests/, admin/, public.vocabularies(), any
-- existing policy or grant, docs/GAPS.md and CLAUDE.md. The app's calls to record_event are part 2
-- (choice 3, 1314).

-- ---------------------------------------------------------------------------------------------------
-- 1. Which countries are African (1295). The African Union's members are public.countries, read at
--    runtime like every vocabulary; the flag is set from that table and never from a list in code.
--    not null default false reaches every existing row by design, which is the exempt shape under
--    ruling 564.
-- ---------------------------------------------------------------------------------------------------

alter table public.world_countries add column is_african boolean not null default false;

do $$
declare
  v_absent text;
  v_matched integer;
begin
  update public.world_countries w
  set is_african = true
  from public.countries c
  where c.name = w.name;
  get diagnostics v_matched = row_count;

  -- Every African Union member matches a row except the one ruling 142's list cannot carry, named
  -- here so that a spelling drift on either table fails the apply by name instead of silently
  -- shrinking the continent.
  select string_agg(c.name, ', ' order by c.name)
  into v_absent
  from public.countries c
  left join public.world_countries w on w.name = c.name
  where w.name is null and c.name <> 'Sahrawi Arab Democratic Republic';

  if v_absent is not null then
    raise exception 'b12c: African Union members with no world_countries row (1295): %', v_absent;
  end if;
  if v_matched <> (select count(*) from public.countries) - 1 then
    raise exception 'b12c: expected % African rows, set % (1295)', (select count(*) from public.countries) - 1, v_matched;
  end if;
end;
$$;

comment on column public.world_countries.is_african is
  'True for the African Union member states as public.countries names them (Brief 12 12C, ruling 1295). Read at runtime by private.member_side_of to tell the continent side from the diaspora side; never a list in code. The Sahrawi Arab Democratic Republic is an African Union member with no row here, because this list is ruling 142''s United Nations members plus Palestine and Vatican City.';

-- ---------------------------------------------------------------------------------------------------
-- 2. Stance and place history (1295, choice 2). Append-only for every role; a delete is admitted only
--    as the cascade from public.members, which is the one delete that reaches it with the member row
--    already gone.
-- ---------------------------------------------------------------------------------------------------

create table public.member_profile_history (
  id bigint generated always as identity primary key,
  member_id uuid not null references public.members (id) on delete cascade,
  stance public.stance not null,
  current_country text,
  current_place text,
  valid_from timestamptz not null default now(),
  source text not null check (source in ('change', 'backfill'))
);

create index member_profile_history_member_valid_idx
  on public.member_profile_history (member_id, valid_from desc, id desc);

alter table public.member_profile_history enable row level security;

revoke all on table public.member_profile_history from public, anon, authenticated, service_role;
grant select, insert on table public.member_profile_history to service_role;

create policy member_profile_history_service_role_select on public.member_profile_history
  for select to service_role
  using (true);

create policy member_profile_history_service_role_insert on public.member_profile_history
  for insert to service_role
  with check (true);

comment on table public.member_profile_history is
  'A member''s stance, current country and current place as they were, one row per change and one backfill row per member who existed before the table did (Brief 12 12C, ruling 1295, choice 2 of handoff 40-C). Written only by the members trigger and the backfill; read only inside private.profile_at, so an act is sided and stanced as the member was when it happened and not as they are today. Personas (1116): member, Space lead, event host and admin are deliberately absent, because a member''s own row is already theirs on members and history serves the derivation and nothing a surface shows; service role may select and insert; the update, delete and truncate triggers refuse every role, the service role included, and admit a delete only as the cascade of a member''s deletion.';

-- The refusal for the two append-only record tables of this file. A row-level delete whose member
-- row no longer exists is the cascade from public.members, the only path that can produce that
-- state, and is let through so that a member's deletion is not refused at their history.
create function private.refuse_record_change()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if tg_op = 'DELETE' and tg_level = 'ROW'
     and not exists (select 1 from public.members m where m.id = old.member_id) then
    return old;
  end if;
  raise exception '%: % is append-only for every role (Brief 12 12C, rulings 1287, 1295)', tg_table_name, tg_op
    using errcode = '42501';
end;
$$;

revoke all on function private.refuse_record_change() from public;

create trigger member_profile_history_append_only
  before update or delete on public.member_profile_history
  for each row execute function private.refuse_record_change();

create trigger member_profile_history_no_truncate
  before truncate on public.member_profile_history
  for each statement execute function private.refuse_record_change();

-- One row when one of the three changed, none otherwise. After the row, so members_stance_declared
-- (before update of stance) has already stamped stance_declared_at.
create function private.member_profile_history_write()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.stance is not distinct from old.stance
     and new.current_country is not distinct from old.current_country
     and new.current_place is not distinct from old.current_place then
    return null;
  end if;
  insert into public.member_profile_history (member_id, stance, current_country, current_place, valid_from, source)
  values (new.id, new.stance, new.current_country, new.current_place, now(), 'change');
  return null;
end;
$$;

revoke all on function private.member_profile_history_write() from public;

create trigger members_profile_history
  after insert or update of stance, current_country, current_place on public.members
  for each row execute function private.member_profile_history_write();

-- The row in force at a moment; a moment before the member's first row reads the first row. A
-- member with no row answers a row of nulls.
create function private.profile_at(p_member uuid, p_at timestamptz)
returns public.member_profile_history
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  r public.member_profile_history;
begin
  select h.* into r
  from public.member_profile_history h
  where h.member_id = p_member and h.valid_from <= p_at
  order by h.valid_from desc, h.id desc
  limit 1;
  if not found then
    select h.* into r
    from public.member_profile_history h
    where h.member_id = p_member
    order by h.valid_from asc, h.id asc
    limit 1;
  end if;
  return r;
end;
$$;

revoke all on function private.profile_at(uuid, timestamptz) from public;

comment on function private.profile_at(uuid, timestamptz) is
  'The member_profile_history row in force for a member at a moment (Brief 12 12C, ruling 1295): the latest row whose valid_from is at or before the moment, else the member''s first row, else a row of nulls.';

-- The side a country puts a member on (1295): continent when it is African, else diaspora. A null
-- country reads diaspora under the ruling's else.
create function private.member_side_of(p_country text)
returns text
language sql
stable
security definer
set search_path to ''
as $$
  select case
    when exists (select 1 from public.world_countries w where w.name = p_country and w.is_african) then 'continent'
    else 'diaspora'
  end;
$$;

revoke all on function private.member_side_of(text) from public;

create function private.member_side(p_member uuid, p_at timestamptz)
returns text
language sql
stable
security definer
set search_path to ''
as $$
  select private.member_side_of((private.profile_at(p_member, p_at)).current_country);
$$;

revoke all on function private.member_side(uuid, timestamptz) from public;

comment on function private.member_side(uuid, timestamptz) is
  'continent or diaspora for a member at a moment, from the country in force then (Brief 12 12C, ruling 1295); stance is read beside it and never merged into it.';

-- Backfill (choice 2, 1313): one row per existing member, dated now and marked backfill, because
-- their earlier stance and place are unknown.
insert into public.member_profile_history (member_id, stance, current_country, current_place, valid_from, source)
select m.id, m.stance, m.current_country, m.current_place, now(), 'backfill'
from public.members m
order by m.created_at, m.id;

-- ---------------------------------------------------------------------------------------------------
-- 3. The behaviour log (1179, 1297, 1298).
-- ---------------------------------------------------------------------------------------------------

create table public.surface_event_kinds (
  kind text primary key,
  area text not null,
  allowed_props text[] not null default '{}',
  public boolean not null default false,
  feeds text not null,
  position int not null unique
);

alter table public.surface_event_kinds enable row level security;

revoke all on table public.surface_event_kinds from public, anon, authenticated;
grant select on table public.surface_event_kinds to authenticated;
grant all on table public.surface_event_kinds to service_role;

create policy surface_event_kinds_member_select on public.surface_event_kinds
  for select to authenticated
  using (true);

create policy surface_event_kinds_service_role on public.surface_event_kinds
  for all to service_role
  using (true)
  with check (true);

comment on table public.surface_event_kinds is
  'The kinds of behaviour the log may record, each with the prop keys it allows, whether it is recordable while signed out (1298, choice 5 of the tracking plan) and what it feeds (Brief 12 12C, tracking plan). A kind is added by row, never by code, and public.record_event refuses a kind not here. Personas (1116): member, Space lead, event host and admin read it through one select-all policy as signed-in callers; none of them writes it; signed out reads nothing, because record_event reads it as a definer; service role holds all.';

insert into public.surface_event_kinds (kind, area, allowed_props, public, feeds, position) values
  ('sign_in_succeeded',          'access',     '{method}',                false, 'Activation, return rate',             1),
  ('sign_in_failed',             'access',     '{reason_class}',          false, 'System health',                       2),
  ('password_reset_requested',   'access',     '{}',                      false, 'The 311 page''s reset funnel',        3),
  ('password_reset_completed',   'access',     '{}',                      false, 'The 311 page''s reset funnel',        4),
  ('onboarding_step_viewed',     'onboarding', '{step}',                  false, 'Onboarding funnel',                   5),
  ('feed_viewed',                'feed',       '{lens}',                  false, 'Engagement depth',                    6),
  ('card_opened',                'feed',       '{card_c}',                false, 'Attribution referrer',                7),
  ('composer_opened',            'composer',   '{host_context,verb}',     false, 'Publish funnel',                      8),
  ('composer_closed_unpublished','composer',   '{verb,had_text}',         false, 'The 311 page''s abandonment',         9),
  ('dia_suggestion_shown',       'dia',        '{suggestion_kind}',       false, 'DIA usefulness',                      10),
  ('dia_suggestion_acted',       'dia',        '{suggestion_kind}',       false, 'DIA usefulness',                      11),
  ('connect_viewed',             'connect',    '{lens,filter_keys}',      false, 'Liquidity inputs',                    12),
  ('profile_viewed',             'connect',    '{}',                      false, 'Funnel to introductions',             13),
  ('discovery_viewed',           'convene',    '{lens,filter_keys}',      false, 'Event liquidity',                     14),
  ('event_page_viewed',          'convene',    '{}',                      true,  'Event funnel, attribution',           15),
  ('story_opened',               'convey',     '{}',                      true,  'Story-led acts',                      16),
  ('empty_state_seen',           'everywhere', '{state}',                 false, 'The 311 page''s empty states',        17),
  ('client_error',               'everywhere', '{code}',                  false, 'System health',                       18);

create table public.surface_events (
  id bigint generated always as identity,
  occurred_at timestamptz not null default now(),
  kind text not null references public.surface_event_kinds (kind),
  app text not null check (app in ('app', 'admin', 'lms', 'site')),
  member_id uuid,
  session_id uuid not null,
  surface text not null,
  referrer_surface text,
  c_category public.c_category,
  object_kind public.anchor_kind,
  object_id uuid,
  props jsonb not null default '{}'::jsonb,
  viewport text check (viewport in ('narrow', 'medium', 'wide')),
  primary key (id, occurred_at),
  constraint surface_events_object_never_member check (object_kind is distinct from 'member'),
  constraint surface_events_object_pair check ((object_kind is null) = (object_id is null)),
  constraint surface_events_props_object check (jsonb_typeof(props) = 'object')
) partition by range (occurred_at);

create index surface_events_session_idx on public.surface_events (session_id, occurred_at);
create index surface_events_kind_idx on public.surface_events (kind, occurred_at);
create index surface_events_member_idx on public.surface_events (member_id, occurred_at)
  where member_id is not null;
create index surface_events_object_idx on public.surface_events (object_kind, object_id, occurred_at)
  where object_id is not null;

alter table public.surface_events enable row level security;

revoke all on table public.surface_events from public, anon, authenticated, service_role;
grant select on table public.surface_events to service_role;

create policy surface_events_service_role_select on public.surface_events
  for select to service_role
  using (true);

comment on table public.surface_events is
  'The behaviour log (Brief 12 12C, rulings 1179, 1297, 1298): what members and signed-out visitors look at, open, start and abandon, with the server''s time, a per-tab session id and never an IP address, a user agent, a location or a device identifier, and never another member as the object (1297). Partitioned by month on occurred_at; partitions older than 90 days are dropped daily (1179) once their hours are in surface_event_rollups. Written only by public.record_event, which refuses what the kind does not allow. Personas (1116): member, Space lead, event host and admin are deliberately absent, because the log is read only by 12B admin_* projections and nothing in it is shown to a member as a number about themselves or anyone else (1281); service role may select for the projections and nothing else.';

-- Partitions for the current month and the next, idempotent, with row security and the revokes on
-- each, because neither a policy nor a grant on the parent reaches a partition read by name.
create function private.surface_events_ensure_partitions()
returns text[]
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_month date;
  v_name text;
  v_made text[] := '{}';
begin
  for v_month in
    select d::date
    from generate_series(
      date_trunc('month', now() at time zone 'UTC')::date,
      (date_trunc('month', now() at time zone 'UTC') + interval '1 month')::date,
      interval '1 month') d
  loop
    v_name := 'surface_events_' || to_char(v_month, 'YYYY_MM');
    if to_regclass('public.' || quote_ident(v_name)) is null then
      execute format(
        'create table public.%I partition of public.surface_events for values from (%L) to (%L)',
        v_name,
        to_char(v_month, 'YYYY-MM-DD') || ' 00:00:00+00',
        to_char(v_month + interval '1 month', 'YYYY-MM-DD') || ' 00:00:00+00');
      execute format('alter table public.%I enable row level security', v_name);
      execute format('revoke all on table public.%I from public, anon, authenticated, service_role', v_name);
      v_made := v_made || v_name;
    end if;
  end loop;
  return v_made;
end;
$$;

revoke all on function private.surface_events_ensure_partitions() from public;

comment on function private.surface_events_ensure_partitions() is
  'Creates the surface_events partitions for the current month and the next when they do not exist, each with row security on and no API grant (Brief 12 12C, ruling 1179). Run by this migration and monthly by pg_cron; returns the names it made.';

-- Partitions wholly older than the retention window go, by name: a partition named
-- surface_events_YYYY_MM holds that month and nothing else, so one whose month ends at or before
-- now() less the window is dropped whole (1179).
create function private.surface_events_drop_old_partitions(p_keep interval default interval '90 days')
returns text[]
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_rel record;
  v_month date;
  v_dropped text[] := '{}';
begin
  for v_rel in
    select c.relname
    from pg_catalog.pg_inherits i
    join pg_catalog.pg_class c on c.oid = i.inhrelid
    where i.inhparent = 'public.surface_events'::regclass
      and c.relname ~ '^surface_events_\d{4}_\d{2}$'
    order by c.relname
  loop
    v_month := make_date(substr(v_rel.relname, 16, 4)::int, substr(v_rel.relname, 21, 2)::int, 1);
    if (v_month + interval '1 month') <= (now() - p_keep) then
      execute format('drop table public.%I', v_rel.relname);
      v_dropped := v_dropped || v_rel.relname;
    end if;
  end loop;
  return v_dropped;
end;
$$;

revoke all on function private.surface_events_drop_old_partitions(interval) from public;

comment on function private.surface_events_drop_old_partitions(interval) is
  'Drops every surface_events partition whose month ended at or before now() less the window, 90 days by default (Brief 12 12C, ruling 1179; the figure waits on counsel, 1282). Run daily by pg_cron; returns the names it dropped.';

select private.surface_events_ensure_partitions();

-- The one writer (1179: server functions only). The browser asks, the database decides. It stamps
-- auth.uid() and the server's time, refuses with 22023 anything the kind does not allow, and never
-- says whether a row was written.
create function public.record_event(
  p_kind text,
  p_app text,
  p_session uuid,
  p_surface text,
  p_referrer text,
  p_object_kind public.anchor_kind,
  p_object_id uuid,
  p_props jsonb,
  p_viewport text
)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  k public.surface_event_kinds;
  v_member uuid := auth.uid();
  v_props jsonb := coalesce(p_props, '{}'::jsonb);
  v_bad text;
  v_c public.c_category;
begin
  select * into k from public.surface_event_kinds s where s.kind = p_kind;
  if not found then
    raise exception 'record_event: unknown kind %', coalesce(p_kind, '(null)') using errcode = '22023';
  end if;
  if v_member is null and not k.public then
    raise exception 'record_event: % is not recordable while signed out (1298)', p_kind using errcode = '22023';
  end if;
  if p_app is null or p_app not in ('app', 'admin', 'lms', 'site') then
    raise exception 'record_event: unknown app %', coalesce(p_app, '(null)') using errcode = '22023';
  end if;
  if p_session is null then
    raise exception 'record_event: a session id is required' using errcode = '22023';
  end if;
  if p_surface is null or btrim(p_surface) = '' then
    raise exception 'record_event: a surface is required' using errcode = '22023';
  end if;
  if p_object_kind = 'member' then
    raise exception 'record_event: a member is never an object (1297)' using errcode = '22023';
  end if;
  if (p_object_kind is null) <> (p_object_id is null) then
    raise exception 'record_event: object_kind and object_id come together' using errcode = '22023';
  end if;
  if p_viewport is not null and p_viewport not in ('narrow', 'medium', 'wide') then
    raise exception 'record_event: unknown viewport %', p_viewport using errcode = '22023';
  end if;
  if jsonb_typeof(v_props) <> 'object' then
    raise exception 'record_event: props must be an object' using errcode = '22023';
  end if;
  select o.key into v_bad
  from jsonb_object_keys(v_props) as o(key)
  where not (o.key = any (k.allowed_props))
  limit 1;
  if v_bad is not null then
    raise exception 'record_event: % is not a prop of %', v_bad, p_kind using errcode = '22023';
  end if;

  -- 600 an hour, keyed on the member when signed in and on the session otherwise (442). Over the
  -- ceiling the call returns as it always does.
  if not private.rate_limit(coalesce(v_member, p_session), 'record_event', interval '1 hour', 600) then
    return;
  end if;

  v_c := case
    when k.area in ('connect', 'convene', 'collaborate', 'contribute', 'convey') then k.area::public.c_category
    else 'system'::public.c_category
  end;

  insert into public.surface_events
    (kind, app, member_id, session_id, surface, referrer_surface, c_category, object_kind, object_id, props, viewport)
  values
    (p_kind, p_app, v_member, p_session, btrim(p_surface), nullif(btrim(p_referrer), ''), v_c,
     p_object_kind, p_object_id, v_props, p_viewport);
end;
$$;

revoke all on function public.record_event(text, text, uuid, text, text, public.anchor_kind, uuid, jsonb, text) from public;
grant execute on function public.record_event(text, text, uuid, text, text, public.anchor_kind, uuid, jsonb, text) to anon, authenticated;

comment on function public.record_event(text, text, uuid, text, text, public.anchor_kind, uuid, jsonb, text) is
  'The one writer of surface_events (Brief 12 12C, rulings 1179, 1297, 1298). Refuses with 22023 an unknown kind, a prop key the kind does not allow, a signed-out call for a kind that is not public, a member as the object, an unknown app or viewport, and a missing session or surface. Stamps auth.uid() and the server''s time, never a member id or a time from the caller; the C is the kind''s area when that is a C and system otherwise. Rate-limited to 600 an hour per member, or per session while signed out, through private.rate_limit; returns nothing and never reveals whether a row was written.';

-- ---------------------------------------------------------------------------------------------------
-- 4. Off-platform acts (1287). Append-only; no writer in this handoff. The Relationships console
--    writes it later through an audited RPC.
-- ---------------------------------------------------------------------------------------------------

create table public.partner_acts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  depth text not null check (depth in ('engaging', 'collaborating', 'contributing', 'leading')),
  c_category public.c_category not null,
  occurred_at timestamptz not null,
  source text not null check (source in ('partner', 'dna_system')),
  source_ref text not null,
  confirmed_by uuid,
  created_at timestamptz not null default now()
);

create index partner_acts_member_idx on public.partner_acts (member_id, occurred_at);
create index partner_acts_created_idx on public.partner_acts (created_at);

alter table public.partner_acts enable row level security;

revoke all on table public.partner_acts from public, anon, authenticated, service_role;
grant select, insert on table public.partner_acts to service_role;

create policy partner_acts_service_role_select on public.partner_acts
  for select to service_role
  using (true);

create policy partner_acts_service_role_insert on public.partner_acts
  for insert to service_role
  with check (true);

create trigger partner_acts_append_only
  before update or delete on public.partner_acts
  for each row execute function private.refuse_record_change();

create trigger partner_acts_no_truncate
  before truncate on public.partner_acts
  for each statement execute function private.refuse_record_change();

comment on table public.partner_acts is
  'Acts confirmed off the platform by a verified partner or a DNA system (Brief 12 12C, ruling 1287): the member, the depth as the source stated it, the C, when it happened, which source and its reference, and the staff member who confirmed it, who carries no foreign key so that a staff member''s deletion never reaches a record. Permanent and append-only; derived into the ledger as recorded. No writer exists yet: the Relationships console writes it later through an audited RPC (12E, 12G). Personas (1116): member, Space lead and event host are deliberately absent, because a partner-reported act is company data and no number from it attaches to a person on any surface (1281); admin writes it only through that future RPC and reads it only through a 12B projection; service role may select and insert, and the update, delete and truncate triggers refuse every role, the service role included, admitting a delete only as the cascade of a member''s deletion.';

-- ---------------------------------------------------------------------------------------------------
-- 5. The mobilization ledger (1280 to 1288, 1294 to 1296). One row per act per definition version,
--    with each party's side and stance as they were. Primary key (definition_version, act_key).
-- ---------------------------------------------------------------------------------------------------

create table public.mobilization_ledger (
  definition_version int not null,
  act_key text not null,
  occurred_at timestamptz not null,
  depth text not null check (depth in ('engaging', 'collaborating', 'contributing', 'leading')),
  c_category public.c_category not null,
  source text not null check (source in ('counterparty', 'partner', 'dna_system')),
  member_id uuid not null,
  counterparty_id uuid,
  member_side text not null check (member_side in ('diaspora', 'continent')),
  member_stance public.stance not null,
  counterparty_side text check (counterparty_side in ('diaspora', 'continent')),
  counterparty_stance public.stance,
  direction text check (direction in ('diaspora_to_continent', 'continent_to_diaspora', 'diaspora_to_diaspora', 'continent_to_continent')),
  bridging boolean not null default false,
  corridor_ids text[] not null default '{}',
  derived_at timestamptz not null default now(),
  primary key (definition_version, act_key),
  constraint mobilization_ledger_counterparty_side check ((counterparty_id is null) = (counterparty_side is null)),
  constraint mobilization_ledger_counterparty_direction check ((counterparty_id is null) = (direction is null))
);

create index mobilization_ledger_version_occurred_idx on public.mobilization_ledger (definition_version, occurred_at);
create index mobilization_ledger_version_member_idx on public.mobilization_ledger (definition_version, member_id, occurred_at);

alter table public.mobilization_ledger enable row level security;

revoke all on table public.mobilization_ledger from public, anon, authenticated, service_role;
grant select on table public.mobilization_ledger to service_role;

create policy mobilization_ledger_service_role_select on public.mobilization_ledger
  for select to service_role
  using (true);

comment on table public.mobilization_ledger is
  'The Diaspora Mobilization ledger (Brief 12 12C, rulings 1280 to 1288, 1294 to 1296): one row per act per definition version, keyed on a stable act key, with the member it counts for and the counterparty, each party''s side (continent when the country in force at the act is African, else diaspora) and stance as they were then (1295), the direction and whether it bridges (1285), the depth (1286), the source (1287), and the corridors of either party, in each of which the act appears once and across which it is never summed (choice 1 of handoff 40-C). Derived rows only, written by private.derive_mobilization_v1 and rebuilt from the product facts at any time; member ids carry no foreign key because the rows restate facts whose truth lives elsewhere. Personas (1116): member, Space lead, event host and admin are deliberately absent, because the ledger is read only by 12B admin_* projections as aggregates and no number from it ever attaches to a person (1281); service role may select for those projections and nothing else.';

-- Definition version 1. The window bounds when a source fact was recorded, not when the act
-- occurred, so an attestation accepted days after the event still enters at the next hourly run;
-- null bounds mean all history. Attestations count once accepted (435: null is unaccepted and
-- invisible to every projection). RSVP going is never an act (1296); follows, saves and hearts are
-- never acts (1284).
create function private.derive_mobilization_v1(p_from timestamptz default null, p_to timestamptz default null)
returns integer
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_from timestamptz := coalesce(p_from, '-infinity'::timestamptz);
  v_to timestamptz := coalesce(p_to, 'infinity'::timestamptz);
  v_n integer;
begin
  with
  -- Co-attended an event: Engaging for the attested member, the attester the counterparty, at the
  -- attestation's own time.
  attended as (
    select
      'attestation:' || a.id::text as act_key,
      a.attested_at as occurred_at,
      'engaging'::text as depth,
      a.c_category,
      'counterparty'::text as source,
      a.member_id,
      a.attester_member_id as counterparty_id
    from public.attestations a
    where a.object_kind = 'event'
      and a.accepted_at is not null
      and a.accepted_at >= v_from and a.accepted_at < v_to
  ),
  -- Hosted an event that happened: Leading for the host once any attendance is attested and
  -- accepted, at the event's start, or at the earliest attestation when the event carries no start.
  hosted as (
    select
      'hosted:' || e.id::text,
      coalesce(e.starts_at, min(a.attested_at)),
      'leading'::text,
      'convene'::public.c_category,
      'counterparty'::text,
      e.host_member_id,
      null::uuid
    from public.events e
    join public.attestations a on a.object_kind = 'event' and a.object_id = e.id and a.accepted_at is not null
    group by e.id, e.starts_at, e.host_member_id
    having bool_or(a.accepted_at >= v_from and a.accepted_at < v_to)
  ),
  -- Accepted introduction (1294): Engaging for both parties, one row each, the other the
  -- counterparty, at the response.
  intros as (
    select
      'intro:' || r.id::text || ':' || p.member_id::text,
      coalesce(r.responded_at, r.created_at),
      'engaging'::text,
      'connect'::public.c_category,
      'counterparty'::text,
      p.member_id,
      p.other_id
    from public.connection_requests r
    cross join lateral (values (r.from_member_id, r.to_member_id), (r.to_member_id, r.from_member_id)) as p (member_id, other_id)
    where r.status = 'accepted'
      and r.to_member_id is not null
      and coalesce(r.responded_at, r.created_at) >= v_from
      and coalesce(r.responded_at, r.created_at) < v_to
  ),
  -- A signed-in member opened a story by someone else: the earliest open per session and story,
  -- and the session's end, its last recorded event plus thirty minutes.
  opened as (
    select
      s.session_id,
      s.member_id as opener,
      s.object_id as story_id,
      st.author_member_id as author,
      min(s.occurred_at) as opened_at,
      (select max(x.occurred_at) from public.surface_events x where x.session_id = s.session_id) + interval '30 minutes' as session_end
    from public.surface_events s
    join public.stories st on st.id = s.object_id
    where s.kind = 'story_opened'
      and s.object_kind = 'story'
      and s.member_id is not null
      and st.author_member_id is not null
      and st.author_member_id <> s.member_id
    group by s.session_id, s.member_id, s.object_id, st.author_member_id
  ),
  -- Story-led act: Leading for the story's author when the opener went on, in that session, to
  -- RSVP, send an introduction or attest; the opener is the counterparty and the time is the later
  -- act's. Written to the ledger when derived, so it outlives the log's 90 days.
  story_led as (
    select
      'story:' || o.story_id::text || ':' || o.opener::text || ':' || f.act_key,
      f.at,
      'leading'::text,
      'convey'::public.c_category,
      'dna_system'::text,
      o.author,
      o.opener
    from opened o
    join lateral (
      select 'rsvp:' || g.id::text as act_key, g.created_at as at
      from public.event_registrations g
      where g.member_id = o.opener and g.status = 'going'
        and g.created_at > o.opened_at and g.created_at <= o.session_end
      union all
      select 'intro:' || r.id::text, r.created_at
      from public.connection_requests r
      where r.from_member_id = o.opener
        and r.created_at > o.opened_at and r.created_at <= o.session_end
      union all
      select 'attestation:' || a.id::text, a.attested_at
      from public.attestations a
      where a.attester_member_id = o.opener
        and a.attested_at > o.opened_at and a.attested_at <= o.session_end
    ) f on true
    where f.at >= v_from and f.at < v_to
  ),
  -- Partner or system act (1287): as recorded.
  partner as (
    select
      'partner:' || p.id::text,
      p.occurred_at,
      p.depth,
      p.c_category,
      p.source,
      p.member_id,
      null::uuid
    from public.partner_acts p
    where p.created_at >= v_from and p.created_at < v_to
  ),
  acts as (
    select * from attended
    union all select * from hosted
    union all select * from intros
    union all select * from story_led
    union all select * from partner
  ),
  shaped as (
    select
      a.act_key, a.occurred_at, a.depth, a.c_category, a.source, a.member_id, a.counterparty_id,
      private.member_side_of(pm.current_country) as member_side,
      coalesce(pm.stance, 'exploring'::public.stance) as member_stance,
      case when a.counterparty_id is null then null else private.member_side_of(pc.current_country) end as counterparty_side,
      case when a.counterparty_id is null then null else coalesce(pc.stance, 'exploring'::public.stance) end as counterparty_stance,
      (select coalesce(array_agg(distinct mc.corridor_id order by mc.corridor_id), '{}'::text[])
       from public.member_corridors mc
       where mc.member_id = a.member_id or mc.member_id = a.counterparty_id) as corridor_ids
    from acts a
    left join lateral private.profile_at(a.member_id, a.occurred_at) pm on true
    left join lateral private.profile_at(a.counterparty_id, a.occurred_at) pc on true
  )
  insert into public.mobilization_ledger as l
    (definition_version, act_key, occurred_at, depth, c_category, source, member_id, counterparty_id,
     member_side, member_stance, counterparty_side, counterparty_stance, direction, bridging, corridor_ids, derived_at)
  select
    1, s.act_key, s.occurred_at, s.depth, s.c_category, s.source, s.member_id, s.counterparty_id,
    s.member_side, s.member_stance, s.counterparty_side, s.counterparty_stance,
    case when s.counterparty_side is null then null else s.member_side || '_to_' || s.counterparty_side end,
    coalesce(s.member_side <> s.counterparty_side, false),
    s.corridor_ids,
    now()
  from shaped s
  on conflict (definition_version, act_key) do update set
    occurred_at = excluded.occurred_at,
    depth = excluded.depth,
    c_category = excluded.c_category,
    source = excluded.source,
    member_id = excluded.member_id,
    counterparty_id = excluded.counterparty_id,
    member_side = excluded.member_side,
    member_stance = excluded.member_stance,
    counterparty_side = excluded.counterparty_side,
    counterparty_stance = excluded.counterparty_stance,
    direction = excluded.direction,
    bridging = excluded.bridging,
    corridor_ids = excluded.corridor_ids,
    derived_at = now()
  where (l.occurred_at, l.depth, l.c_category, l.source, l.member_id, l.counterparty_id, l.member_side,
         l.member_stance, l.counterparty_side, l.counterparty_stance, l.direction, l.bridging, l.corridor_ids)
        is distinct from
        (excluded.occurred_at, excluded.depth, excluded.c_category, excluded.source, excluded.member_id,
         excluded.counterparty_id, excluded.member_side, excluded.member_stance, excluded.counterparty_side,
         excluded.counterparty_stance, excluded.direction, excluded.bridging, excluded.corridor_ids);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function private.derive_mobilization_v1(timestamptz, timestamptz) from public;

comment on function private.derive_mobilization_v1(timestamptz, timestamptz) is
  'Definition version 1 of Diaspora Mobilization (Brief 12 12C, rulings 1280 to 1288, 1294 to 1296): upserts into mobilization_ledger every act whose source fact was recorded in the window (null bounds mean all history), from accepted event attestations (Engaging, and Leading for the host), accepted introductions (Engaging for both), story-led RSVPs, introductions and attestations in the opener''s session (Leading for the author, source dna_system) and partner_acts as recorded. Each party is sided and stanced through private.profile_at at the act''s time. Idempotent: a row whose facts are unchanged is left as it is. Returns the number of rows written or changed.';

-- ---------------------------------------------------------------------------------------------------
-- 6. Rollups and schedules. The rollup is permanent and the raw rows are not (1179); the hourly job
--    covers the last two hours so a late row is counted before its partition can ever be dropped.
-- ---------------------------------------------------------------------------------------------------

create table public.surface_event_rollups (
  hour timestamptz not null,
  kind text not null,
  app text not null,
  surface text not null,
  events integer not null,
  sessions integer not null,
  members integer not null,
  rolled_at timestamptz not null default now(),
  primary key (hour, kind, app, surface)
);

alter table public.surface_event_rollups enable row level security;

revoke all on table public.surface_event_rollups from public, anon, authenticated, service_role;
grant select on table public.surface_event_rollups to service_role;

create policy surface_event_rollups_service_role_select on public.surface_event_rollups
  for select to service_role
  using (true);

comment on table public.surface_event_rollups is
  'Hourly counts of the behaviour log by kind, app and surface, in UTC hours: events, distinct sessions and distinct members (Brief 12 12C, ruling 1179). Permanent, so funnels outlive the raw rows'' 90 days; written hourly by private.rollup_surface_events over the last two hours. Personas (1116): member, Space lead, event host and admin are deliberately absent, because the counts are company numbers read only through 12B admin_* projections (1281); service role may select for those projections and nothing else.';

create function private.rollup_surface_events(p_from timestamptz, p_to timestamptz)
returns integer
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_n integer;
begin
  insert into public.surface_event_rollups as r (hour, kind, app, surface, events, sessions, members, rolled_at)
  select
    date_trunc('hour', s.occurred_at at time zone 'UTC') at time zone 'UTC',
    s.kind, s.app, s.surface,
    count(*)::integer,
    count(distinct s.session_id)::integer,
    count(distinct s.member_id)::integer,
    now()
  from public.surface_events s
  where s.occurred_at >= date_trunc('hour', p_from at time zone 'UTC') at time zone 'UTC'
    and s.occurred_at < p_to
  group by 1, 2, 3, 4
  on conflict (hour, kind, app, surface) do update set
    events = excluded.events,
    sessions = excluded.sessions,
    members = excluded.members,
    rolled_at = now()
  where (r.events, r.sessions, r.members) is distinct from (excluded.events, excluded.sessions, excluded.members);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function private.rollup_surface_events(timestamptz, timestamptz) from public;

comment on function private.rollup_surface_events(timestamptz, timestamptz) is
  'Upserts surface_event_rollups for every UTC hour touched by the window (Brief 12 12C, ruling 1179); an hour whose counts are unchanged is left as it is. Returns the number of rows written or changed.';

-- The four jobs (1179). Each is unscheduled by name first so the file can be re-run on a reset
-- without doubling a job; nothing is swallowed, because a schedule that silently failed to land is a
-- ledger that silently stops.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.unschedule(jobid) from cron.job
    where jobname in ('dna_mobilization_derive_hourly', 'dna_surface_events_rollup_hourly',
                      'dna_surface_events_partition_monthly', 'dna_surface_events_retention_daily');
    perform cron.schedule(
      'dna_mobilization_derive_hourly',
      '7 * * * *',
      'select private.derive_mobilization_v1(now() - interval ''48 hours'', now())');
    perform cron.schedule(
      'dna_surface_events_rollup_hourly',
      '12 * * * *',
      'select private.rollup_surface_events(now() - interval ''2 hours'', now())');
    perform cron.schedule(
      'dna_surface_events_partition_monthly',
      '10 2 20 * *',
      'select private.surface_events_ensure_partitions()');
    perform cron.schedule(
      'dna_surface_events_retention_daily',
      '35 3 * * *',
      'select private.surface_events_drop_old_partitions()');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- 7. The admin catalogue (1299, 1300). Every table in public: the ones this file creates with real
--    treatments, every earlier one unreviewed, so the catalogue starts complete and every later table
--    must arrive with a real row. A partition is its parent's and gets no row of its own.
-- ---------------------------------------------------------------------------------------------------

create table public.admin_catalogue (
  schema_name text not null,
  table_name text not null,
  admin_treatment text not null default 'unreviewed'
    check (admin_treatment in ('projected', 'operated', 'exempt', 'unreviewed')),
  admin_reason text,
  dia_treatment text not null default 'excluded'
    check (dia_treatment in ('member_side', 'company_side', 'excluded')),
  dia_reason text,
  recorded_at timestamptz not null default now(),
  primary key (schema_name, table_name)
);

alter table public.admin_catalogue enable row level security;

revoke all on table public.admin_catalogue from public, anon, authenticated;
grant all on table public.admin_catalogue to service_role;

create policy admin_catalogue_service_role on public.admin_catalogue
  for all to service_role
  using (true)
  with check (true);

comment on table public.admin_catalogue is
  'How the admin console treats each table and how DIA may read it (Brief 12 12C, rulings 1299, 1300): projected through an admin_* projection, operated by a console, exempt, or unreviewed; and member_side, company_side or excluded for DIA. One row per table in public, partitions excepted because a partition is its parent''s; a table that arrives after this file arrives with its own real row, which a migration lint of the other lane will refuse without. Personas (1116): member, Space lead, event host and admin are deliberately absent, because the catalogue describes the company''s tables and no surface shows it; service role holds all for migrations and the console that will edit it.';

insert into public.admin_catalogue (schema_name, table_name, admin_treatment, admin_reason, dia_treatment, dia_reason) values
  ('public', 'mobilization_ledger', 'projected',
   'Read as aggregates by the 12B admin_* projections; no number attaches to a person (1281).',
   'company_side', 'Company intelligence over derived acts, aggregate only (1273).'),
  ('public', 'surface_event_rollups', 'projected',
   'Hourly counts read by the 12B admin_* projections.',
   'company_side', 'Company intelligence over counts with no member identifier (1273).'),
  ('public', 'surface_event_kinds', 'operated',
   'A vocabulary a console edits by row; served to signed-in callers for the recorder.',
   'excluded', 'A vocabulary, not member data.'),
  ('public', 'surface_events', 'projected',
   'Raw behaviour read only through logged admin_* projections (1179); dropped at 90 days.',
   'excluded', 'Raw behaviour never reaches DIA until the Privacy Policy covers it (1273, 1282).'),
  ('public', 'member_profile_history', 'projected',
   'Stance and place history read only inside the derivation and admin aggregates.',
   'excluded', 'A member''s past place and stance are not DIA''s to reason over (1273).'),
  ('public', 'partner_acts', 'projected',
   'Partner-confirmed acts read through admin_* projections; written later by an audited RPC (12G).',
   'excluded', 'Partner-reported facts about a member stay company-side until consent covers them (1273).'),
  ('public', 'admin_catalogue', 'operated',
   'The catalogue itself, edited by a 12E console and by migrations.',
   'excluded', 'Describes tables, not members.');

insert into public.admin_catalogue (schema_name, table_name, admin_treatment, admin_reason, dia_treatment, dia_reason)
select
  n.nspname,
  c.relname,
  'unreviewed',
  'Existed before the catalogue (Brief 12 12C, ruling 1299); treatment to be ruled.',
  'excluded',
  'Unreviewed tables are excluded until ruled (1300).'
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and not c.relispartition
  and not exists (
    select 1 from public.admin_catalogue a where a.schema_name = n.nspname and a.table_name = c.relname)
order by c.relname;

-- The guard (1299): a table in public with no row fails the apply rather than leaving the catalogue
-- incomplete on its first day.
do $$
declare
  v_missing text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
  into v_missing
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and not c.relispartition
    and not exists (
      select 1 from public.admin_catalogue a where a.schema_name = 'public' and a.table_name = c.relname);
  if v_missing is not null then
    raise exception 'b12c: tables with no admin_catalogue row (1299): %', v_missing;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- 8. The live arms (382): what the mobilization block needs and nothing broader. Row reads are
--    confined to the two ruling 218 test accounts, as on members and attestations; the catalogue holds
--    no member data. cron.job is supabase_admin's, so the cron arm reads the four jobs through a
--    definer rather than a grant on the extension's table.
-- ---------------------------------------------------------------------------------------------------

grant select on table public.member_profile_history to live_arms;
create policy member_profile_history_live_arms_select on public.member_profile_history
  for select to live_arms
  using (exists (
    select 1 from public.members m
    where m.id = member_id and m.handle in ('owner-test', 'member-test')
  ));

grant select on table public.surface_events to live_arms;
create policy surface_events_live_arms_select on public.surface_events
  for select to live_arms
  using (
    member_id is null
    or exists (
      select 1 from public.members m
      where m.id = member_id and m.handle in ('owner-test', 'member-test')
    )
  );

grant select on table public.mobilization_ledger to live_arms;
create policy mobilization_ledger_live_arms_select on public.mobilization_ledger
  for select to live_arms
  using (exists (
    select 1 from public.members m
    where m.id in (member_id, counterparty_id) and m.handle in ('owner-test', 'member-test')
  ));

grant select on table public.admin_catalogue to live_arms;
create policy admin_catalogue_live_arms_select on public.admin_catalogue
  for select to live_arms
  using (true);

grant execute on function private.profile_at(uuid, timestamptz) to live_arms;
grant execute on function private.member_side(uuid, timestamptz) to live_arms;
grant execute on function private.derive_mobilization_v1(timestamptz, timestamptz) to live_arms;

create function private.mobilization_jobs()
returns table (jobname text, schedule text, command text, active boolean)
language sql
stable
security definer
set search_path to ''
as $$
  select j.jobname::text, j.schedule::text, j.command::text, j.active
  from cron.job j
  where j.jobname in ('dna_mobilization_derive_hourly', 'dna_surface_events_rollup_hourly',
                      'dna_surface_events_partition_monthly', 'dna_surface_events_retention_daily')
  order by j.jobname;
$$;

revoke all on function private.mobilization_jobs() from public;
grant execute on function private.mobilization_jobs() to live_arms;

comment on function private.mobilization_jobs() is
  'The four 12C pg_cron jobs by name, schedule and command, for the live arms (Brief 12 12C, ruling 382). Executable by live_arms only; cron.job itself stays supabase_admin''s.';

-- ---------------------------------------------------------------------------------------------------
-- 9. The ledger starts complete: one derivation over all history, and the rollup over whatever the
--    log holds, which on the first day is nothing.
-- ---------------------------------------------------------------------------------------------------

select private.derive_mobilization_v1(null::timestamptz, null::timestamptz);
select private.rollup_surface_events(timestamptz '2026-01-01', now());
