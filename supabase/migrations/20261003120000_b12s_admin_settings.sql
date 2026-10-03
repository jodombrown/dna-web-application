-- Brief 12, admin Settings (Session 45, Lane C, handoff 45-D, Part A). The database half of the admin
-- app's Settings: five vocabularies, the staff member's own settings, the company's one row of shared
-- settings, and the three reads the page shows. Governed by EXTRACTION-45-12S.md (approved as 1413)
-- and rulings 1178, 1265, 1299, 1300, 1381, 1382, 1391 to 1395 and 1410 to 1416, with 1116, 382 and
-- 564. Committed before it is applied (ruling 225). Applied by Chat through the Supabase MCP's
-- execute_sql with its supabase_migrations.schema_migrations row in the same transaction, never by
-- apply_migration (rulings 553, 963, 965). Runs after 20261002160000, the last version the project
-- records at the time of writing.
--
-- Read live on 3 October 2026 before this file was written: public.vocabularies() is the
-- 20261002130100 body byte for byte (24 keys, none for appearance, grains, comparisons or zones);
-- the admin definers are owned by postgres, which holds select on auth.sessions; auth.sessions
-- carries id, user_id, created_at, updated_at, refreshed_at (timestamp without time zone, UTC),
-- not_after, user_agent and ip; pg_timezone_names knows all seven zones below; admin_actions carries
-- target_kind member only (role.granted, role.migrated); admin_reads names the seven projections of
-- 20261002140000 and nothing else; no table named for zones, grains, appearance or settings exists.
--
-- What this adds.
--   public.admin_appearances, public.overview_grains, public.overview_comparisons,
--   public.reporting_zones                 four vocabularies in the existing value, label, position
--                                          form (1392), served by vocabularies(). reporting_zones
--                                          keys on the IANA identifier, carries the extraction's
--                                          name and city, and the zone's standard abbreviation for
--                                          the zones the runtime names only by an offset (WAT, SAST,
--                                          EAT); a trigger refuses an identifier pg_timezone_names
--                                          does not know.
--   public.admin_read_subjects             a fifth vocabulary: the page and block each logged
--                                          projection reads as in the read log. Read only inside
--                                          public.admin_read_log, so it is not a vocabularies() key.
--   public.admin_staff_settings            one row per staff member (1382, 1392).
--   public.admin_org_settings              exactly one row (1391, 1394).
--   private.admin_staff_entry(text)        the gate every Settings function opens with: any live
--                                          platform role at aal2 (1265).
--   public.admin_staff_settings_read/save  the caller's own row, and nobody else's.
--   public.admin_org_settings_read/save    read by any staff role; written by admin alone, each
--                                          change with its admin_actions row in the same
--                                          transaction, and a write that changes nothing writes
--                                          no row (1391).
--   public.admin_read_log, public.admin_change_history, public.admin_my_sessions
--                                          the three reads; the first two log their own read (1178);
--                                          the third returns no IP address.
--   private.overview_window                validates grain and comparison against the two new
--                                          tables instead of its literal lists; otherwise the
--                                          20261002140000 body.
--   private.admin_org_actions_count(text)  a count for the live arms (382), never a row.
--   admin_catalogue rows                   for the seven new tables (1299, 1300).
--
-- What this file does not touch: any member surface's projection or write path, any existing policy
-- or grant, any admin_* projection of 20261002140000, admin-dia-note, docs/GAPS.md and CLAUDE.md.

-- ---------------------------------------------------------------------------------------------------
-- 1. The four option vocabularies (1392), in public.thread_kinds' form: every signed-in persona reads
--    them through vocabularies(); service role writes them; no client role writes a row.
-- ---------------------------------------------------------------------------------------------------

create table public.admin_appearances (
  value text primary key,
  label text not null,
  position smallint not null unique
);
alter table public.admin_appearances enable row level security;
revoke all on table public.admin_appearances from public, anon, authenticated;
grant select on table public.admin_appearances to authenticated;
grant all on table public.admin_appearances to service_role;
create policy admin_appearances_member_select on public.admin_appearances
  for select to authenticated using (true);
create policy admin_appearances_service_role on public.admin_appearances
  for all to service_role using (true) with check (true);
comment on table public.admin_appearances is
  'The appearances a staff member can choose in the admin app''s Settings (handoff 45-D, rulings 1381, 1392, 1393), served by vocabularies() as admin_appearances. system follows each device. Personas (1116): member, Space lead, event host and admin read it through vocabularies(), as members; service role writes it; anon is deliberately absent because no signed-out surface offers it.';

insert into public.admin_appearances (value, label, position) values
  ('system', 'System', 1),
  ('light', 'Light', 2),
  ('dark', 'Dark', 3);

create table public.overview_grains (
  value text primary key,
  label text not null,
  position smallint not null unique
);
alter table public.overview_grains enable row level security;
revoke all on table public.overview_grains from public, anon, authenticated;
grant select on table public.overview_grains to authenticated;
grant all on table public.overview_grains to service_role;
create policy overview_grains_member_select on public.overview_grains
  for select to authenticated using (true);
create policy overview_grains_service_role on public.overview_grains
  for all to service_role using (true) with check (true);
comment on table public.overview_grains is
  'The Overview''s time grains, values as the admin_overview_* projections take them (handoff 45-D, rulings 1304, 1392), served by vocabularies() as overview_grains; private.overview_window refuses a grain with no row. Personas (1116): member, Space lead, event host and admin read it through vocabularies(), as members; service role writes it; anon is deliberately absent because no signed-out surface offers it.';

insert into public.overview_grains (value, label, position) values
  ('now', 'Now', 1),
  ('hour', 'Hour', 2),
  ('day', 'Day', 3),
  ('week', 'Week', 4),
  ('month', 'Month', 5),
  ('quarter', 'Quarter', 6),
  ('year', 'Year', 7);

create table public.overview_comparisons (
  value text primary key,
  label text not null,
  position smallint not null unique
);
alter table public.overview_comparisons enable row level security;
revoke all on table public.overview_comparisons from public, anon, authenticated;
grant select on table public.overview_comparisons to authenticated;
grant all on table public.overview_comparisons to service_role;
create policy overview_comparisons_member_select on public.overview_comparisons
  for select to authenticated using (true);
create policy overview_comparisons_service_role on public.overview_comparisons
  for all to service_role using (true) with check (true);
comment on table public.overview_comparisons is
  'The Overview''s comparisons, values as the admin_overview_* projections take them (handoff 45-D, rulings 1304, 1392), served by vocabularies() as overview_comparisons; private.overview_window refuses a comparison with no row. Personas (1116): member, Space lead, event host and admin read it through vocabularies(), as members; service role writes it; anon is deliberately absent because no signed-out surface offers it.';

insert into public.overview_comparisons (value, label, position) values
  ('previous', 'Previous period', 1),
  ('last_year', 'Same period last year', 2);

create table public.reporting_zones (
  value text primary key,
  name text not null,
  city text not null,
  abbreviation text not null,
  position smallint not null unique
);
alter table public.reporting_zones enable row level security;
revoke all on table public.reporting_zones from public, anon, authenticated;
grant select on table public.reporting_zones to authenticated;
grant all on table public.reporting_zones to service_role;
create policy reporting_zones_member_select on public.reporting_zones
  for select to authenticated using (true);
create policy reporting_zones_service_role on public.reporting_zones
  for all to service_role using (true) with check (true);
comment on table public.reporting_zones is
  'The zones the company reports in and a staff member may read in (handoff 45-D, rulings 1382, 1392, 1394), served by vocabularies() as reporting_zones. value is the IANA identifier, never a fixed offset (extraction C11); a row whose identifier pg_timezone_names does not know is refused. name and city are the words the admin writes ("Pacific time, Los Angeles"); abbreviation is the zone''s standard-time abbreviation, which the app shows only where the runtime names the zone by a bare offset, so a zone that keeps daylight time still reads PDT or BST from the runtime. Personas (1116): member, Space lead, event host and admin read it through vocabularies(), as members; service role writes it; anon is deliberately absent because no signed-out surface offers it.';

create function private.reporting_zone_known()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if new.value is null or not exists (
    select 1 from pg_catalog.pg_timezone_names n where n.name = new.value
  ) then
    raise exception 'reporting_zones: % is not a time zone pg_timezone_names knows', coalesce(new.value, '(null)')
      using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function private.reporting_zone_known() from public;

create trigger reporting_zones_known
  before insert or update of value on public.reporting_zones
  for each row execute function private.reporting_zone_known();

comment on trigger reporting_zones_known on public.reporting_zones is
  'Refuses with 22023 any zone identifier pg_timezone_names does not know (handoff 45-D Part A item 1), so every zone the Overview is passed is one the projections can compute in.';

insert into public.reporting_zones (value, name, city, abbreviation, position) values
  ('America/Los_Angeles', 'Pacific time', 'Los Angeles', 'PST', 1),
  ('America/New_York', 'Eastern time', 'New York', 'EST', 2),
  ('Africa/Accra', 'Greenwich time', 'Accra', 'GMT', 3),
  ('Europe/London', 'UK time', 'London', 'GMT', 4),
  ('Africa/Lagos', 'West Africa time', 'Lagos', 'WAT', 5),
  ('Africa/Johannesburg', 'South Africa time', 'Johannesburg', 'SAST', 6),
  ('Africa/Nairobi', 'East Africa time', 'Nairobi', 'EAT', 7);

-- ---------------------------------------------------------------------------------------------------
-- 2. The read log's labels (handoff 45-D Part A item 2): one row per projection name admin_reads
--    records, with the page and, where the read is one block's, the block. Seeded from every
--    projection that logs today and the two Settings reads below. Read only inside
--    public.admin_read_log; a projection with no row reads there by its raw name.
-- ---------------------------------------------------------------------------------------------------

create table public.admin_read_subjects (
  value text primary key,
  page text not null,
  block text,
  position smallint not null unique
);
alter table public.admin_read_subjects enable row level security;
revoke all on table public.admin_read_subjects from public, anon, authenticated;
grant all on table public.admin_read_subjects to service_role;
create policy admin_read_subjects_service_role on public.admin_read_subjects
  for all to service_role using (true) with check (true);
comment on table public.admin_read_subjects is
  'The page and block each logged admin projection reads as in a staff member''s read log (handoff 45-D, rulings 1178, 1392): value is the projection name public.admin_reads records. Personas (1116): member, Space lead and event host are deliberately absent, because the names describe the company''s admin reads and no member surface shows them; admin reads the labels only through public.admin_read_log, a gated definer, so no client role holds a grant; service role writes it, and a projection added later arrives with its row.';

insert into public.admin_read_subjects (value, page, block, position) values
  ('admin_overview_window', 'Overview', null, 1),
  ('admin_overview_mobilization', 'Overview', 'Mobilization', 2),
  ('admin_overview_levers', 'Overview', 'The levers', 3),
  ('admin_overview_network', 'Overview', 'The network', 4),
  ('admin_overview_company', 'Overview', 'Company lines', 5),
  ('admin_dia_note_read', 'Overview', 'DIA''s note for the week', 6),
  ('admin_dia_note_write', 'Overview', 'DIA''s note for the week', 7),
  ('admin_read_log', 'Settings', 'Your read log', 8),
  ('admin_change_history', 'Settings', 'Change history', 9);

-- ---------------------------------------------------------------------------------------------------
-- 3. The two settings tables. No client grant on either: every read and write is a gated definer
--    below, acting on the caller's own row or on the one company row.
-- ---------------------------------------------------------------------------------------------------

create table public.admin_staff_settings (
  member_id uuid primary key references public.members (id) on delete cascade,
  appearance text not null default 'system' references public.admin_appearances (value),
  reading_zone text references public.reporting_zones (value),
  default_grain text not null default 'week' references public.overview_grains (value),
  default_compare text not null default 'previous' references public.overview_comparisons (value),
  updated_at timestamptz not null default now()
);
alter table public.admin_staff_settings enable row level security;
revoke all on table public.admin_staff_settings from public, anon, authenticated;
grant all on table public.admin_staff_settings to service_role;
create policy admin_staff_settings_service_role on public.admin_staff_settings
  for all to service_role using (true) with check (true);
comment on table public.admin_staff_settings is
  'One staff member''s own admin Settings (handoff 45-D, rulings 1381, 1382, 1392, 1393): appearance, the zone they read clock times in (null means the company reporting zone, 1411), and the grain and comparison the Overview opens to, each a key into its vocabulary. Personas (1116): member, Space lead and event host are deliberately absent, because the row configures the admin app alone; admin and every other staff role read and write only their own row, at aal2, through public.admin_staff_settings_read and public.admin_staff_settings_save, gated definers, so no client role holds a grant and no row policy is needed for one; service role holds all for migrations.';

create table public.admin_org_settings (
  id boolean primary key default true,
  reporting_zone text not null default 'America/Los_Angeles' references public.reporting_zones (value),
  dia_note boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.members (id) on delete set null,
  constraint admin_org_settings_one_row check (id)
);
alter table public.admin_org_settings enable row level security;
revoke all on table public.admin_org_settings from public, anon, authenticated;
grant all on table public.admin_org_settings to service_role;
create policy admin_org_settings_service_role on public.admin_org_settings
  for all to service_role using (true) with check (true);
comment on table public.admin_org_settings is
  'The company''s shared admin Settings, exactly one row (handoff 45-D, rulings 1391, 1394): the reporting zone every staff member''s Overview counts its days and weeks in, and whether DIA''s note shows on the Overview. Personas (1116): member, Space lead and event host are deliberately absent, because the row configures the admin app alone; every staff role reads it at aal2 through public.admin_org_settings_read, and admin alone writes it through public.admin_org_settings_save, which writes each change''s admin_actions row in the same transaction; no client role holds a grant; service role holds all for migrations.';

insert into public.admin_org_settings (id) values (true);

-- ---------------------------------------------------------------------------------------------------
-- 4. The gate (1265): any live platform role at aal2. One copy, the first statement of every
--    Settings function below.
-- ---------------------------------------------------------------------------------------------------

create function private.admin_staff_entry(p_fn text)
returns void
language plpgsql
stable
security definer
set search_path to ''
as $$
begin
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' or not exists (
    select 1 from public.platform_roles r
    where r.member_id = auth.uid() and r.revoked_at is null
  ) then
    raise exception '%: a live platform role at aal2 required', p_fn using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.admin_staff_entry(text) from public;

comment on function private.admin_staff_entry(text) is
  'The first call of every admin Settings function (handoff 45-D, ruling 1265): refuses with 42501 unless the caller''s JWT is at aal2 and the caller holds any live public.platform_roles row.';

-- ---------------------------------------------------------------------------------------------------
-- 5. The staff member's own settings (1382, 1392): one read and one write, on the caller's own row.
-- ---------------------------------------------------------------------------------------------------

create function private.admin_staff_settings_json(s public.admin_staff_settings)
returns jsonb
language sql
immutable
set search_path to ''
as $$
  select jsonb_build_object(
    'appearance', s.appearance,
    'reading_zone', s.reading_zone,
    'default_grain', s.default_grain,
    'default_compare', s.default_compare
  );
$$;

revoke all on function private.admin_staff_settings_json(public.admin_staff_settings) from public;

-- Volatile: a staff member with no row yet is given the table's defaults by inserting them, so the
-- defaults are stated once, on the columns, and never again here or in the app.
create function public.admin_staff_settings_read()
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_row public.admin_staff_settings;
begin
  perform private.admin_staff_entry('admin_staff_settings_read');
  insert into public.admin_staff_settings (member_id) values (auth.uid())
  on conflict (member_id) do nothing;
  select * into strict v_row from public.admin_staff_settings s where s.member_id = auth.uid();
  return private.admin_staff_settings_json(v_row);
end;
$$;

revoke all on function public.admin_staff_settings_read() from public, anon;
grant execute on function public.admin_staff_settings_read() to authenticated;

comment on function public.admin_staff_settings_read() is
  'The caller''s own admin Settings (handoff 45-D Part A item 3): appearance, reading_zone (null is the company zone), default_grain and default_compare. Gate: any live platform role at aal2 (1265). A caller with no row is given the columns'' defaults.';

-- p_patch carries only the keys being changed. reading_zone null means the company zone, so a
-- key's presence, not its value, says whether it changes.
create function public.admin_staff_settings_save(p_patch jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_key text;
  v_row public.admin_staff_settings;
begin
  perform private.admin_staff_entry('admin_staff_settings_save');
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb then
    raise exception 'admin_staff_settings_save: a patch object with at least one key is required'
      using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_patch) loop
    if v_key not in ('appearance', 'reading_zone', 'default_grain', 'default_compare') then
      raise exception 'admin_staff_settings_save: unknown setting %', v_key using errcode = '22023';
    end if;
  end loop;
  if p_patch ? 'appearance' and (
    jsonb_typeof(p_patch -> 'appearance') <> 'string'
    or not exists (select 1 from public.admin_appearances a where a.value = p_patch ->> 'appearance')
  ) then
    raise exception 'admin_staff_settings_save: unknown appearance' using errcode = '22023';
  end if;
  if p_patch ? 'reading_zone' and jsonb_typeof(p_patch -> 'reading_zone') <> 'null' and (
    jsonb_typeof(p_patch -> 'reading_zone') <> 'string'
    or not exists (select 1 from public.reporting_zones z where z.value = p_patch ->> 'reading_zone')
  ) then
    raise exception 'admin_staff_settings_save: unknown zone' using errcode = '22023';
  end if;
  if p_patch ? 'default_grain' and (
    jsonb_typeof(p_patch -> 'default_grain') <> 'string'
    or not exists (select 1 from public.overview_grains g where g.value = p_patch ->> 'default_grain')
  ) then
    raise exception 'admin_staff_settings_save: unknown grain' using errcode = '22023';
  end if;
  if p_patch ? 'default_compare' and (
    jsonb_typeof(p_patch -> 'default_compare') <> 'string'
    or not exists (select 1 from public.overview_comparisons c where c.value = p_patch ->> 'default_compare')
  ) then
    raise exception 'admin_staff_settings_save: unknown comparison' using errcode = '22023';
  end if;

  insert into public.admin_staff_settings (member_id) values (auth.uid())
  on conflict (member_id) do nothing;

  update public.admin_staff_settings s
  set appearance = case when p_patch ? 'appearance' then p_patch ->> 'appearance' else s.appearance end,
      reading_zone = case when p_patch ? 'reading_zone' then p_patch ->> 'reading_zone' else s.reading_zone end,
      default_grain = case when p_patch ? 'default_grain' then p_patch ->> 'default_grain' else s.default_grain end,
      default_compare = case when p_patch ? 'default_compare' then p_patch ->> 'default_compare' else s.default_compare end,
      updated_at = now()
  where s.member_id = auth.uid()
  returning * into strict v_row;

  return private.admin_staff_settings_json(v_row);
end;
$$;

revoke all on function public.admin_staff_settings_save(jsonb) from public, anon;
grant execute on function public.admin_staff_settings_save(jsonb) to authenticated;

comment on function public.admin_staff_settings_save(jsonb) is
  'The one write of a staff member''s own admin Settings (handoff 45-D Part A item 3). p_patch carries the keys that change (appearance, reading_zone, default_grain, default_compare), each checked against its vocabulary; reading_zone null returns the caller to the company zone. Refuses 42501 without a live platform role at aal2 (1265) and 22023 on an empty patch, an unknown key or an unknown value. Acts on the caller''s row alone and returns it.';

-- ---------------------------------------------------------------------------------------------------
-- 6. The company's settings (1391, 1394): read by every staff role, written by admin alone, each
--    change recorded in admin_actions in the transaction that makes it.
-- ---------------------------------------------------------------------------------------------------

create function public.admin_org_settings_read()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_row public.admin_org_settings;
begin
  perform private.admin_staff_entry('admin_org_settings_read');
  select * into strict v_row from public.admin_org_settings o where o.id;
  return jsonb_build_object('reporting_zone', v_row.reporting_zone, 'dia_note', v_row.dia_note);
end;
$$;

revoke all on function public.admin_org_settings_read() from public, anon;
grant execute on function public.admin_org_settings_read() to authenticated;

comment on function public.admin_org_settings_read() is
  'The company''s admin Settings (handoff 45-D Part A item 4, ruling 1391): reporting_zone, the IANA zone every Overview counts its days and weeks in (1394), and dia_note, whether DIA''s note shows on the Overview. Gate: any live platform role at aal2 (1265). Read by the Overview, Settings and admin-dia-note as the caller.';

create function public.admin_org_settings_save(p_patch jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_key text;
  v_before public.admin_org_settings;
  v_after public.admin_org_settings;
begin
  if not private.has_platform_role('admin') then
    raise exception 'admin_org_settings_save: admin at aal2 required' using errcode = '42501';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb then
    raise exception 'admin_org_settings_save: a patch object with at least one key is required'
      using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_patch) loop
    if v_key not in ('reporting_zone', 'dia_note') then
      raise exception 'admin_org_settings_save: unknown setting %', v_key using errcode = '22023';
    end if;
  end loop;
  if p_patch ? 'reporting_zone' and (
    jsonb_typeof(p_patch -> 'reporting_zone') <> 'string'
    or not exists (select 1 from public.reporting_zones z where z.value = p_patch ->> 'reporting_zone')
  ) then
    raise exception 'admin_org_settings_save: unknown zone' using errcode = '22023';
  end if;
  if p_patch ? 'dia_note' and jsonb_typeof(p_patch -> 'dia_note') <> 'boolean' then
    raise exception 'admin_org_settings_save: dia_note must be true or false' using errcode = '22023';
  end if;

  select * into strict v_before from public.admin_org_settings o where o.id for update;

  update public.admin_org_settings o
  set reporting_zone = case when p_patch ? 'reporting_zone' then p_patch ->> 'reporting_zone' else o.reporting_zone end,
      dia_note = case when p_patch ? 'dia_note' then (p_patch ->> 'dia_note')::boolean else o.dia_note end
  where o.id
  returning * into strict v_after;

  -- One admin_actions row per setting that changed, and none for one that did not (1391).
  if v_after.reporting_zone is distinct from v_before.reporting_zone then
    insert into public.admin_actions (actor, role_at_time, action, target_kind, target_id, reason, before, after)
    values (auth.uid(), 'admin', 'org_setting.changed', 'organization_setting', 'reporting_zone', null,
            to_jsonb(v_before.reporting_zone), to_jsonb(v_after.reporting_zone));
  end if;
  if v_after.dia_note is distinct from v_before.dia_note then
    insert into public.admin_actions (actor, role_at_time, action, target_kind, target_id, reason, before, after)
    values (auth.uid(), 'admin', 'org_setting.changed', 'organization_setting', 'dia_note', null,
            to_jsonb(v_before.dia_note), to_jsonb(v_after.dia_note));
  end if;
  if v_after.reporting_zone is distinct from v_before.reporting_zone
     or v_after.dia_note is distinct from v_before.dia_note then
    update public.admin_org_settings o set updated_at = now(), updated_by = auth.uid() where o.id;
  end if;

  return jsonb_build_object('reporting_zone', v_after.reporting_zone, 'dia_note', v_after.dia_note);
end;
$$;

revoke all on function public.admin_org_settings_save(jsonb) from public, anon;
grant execute on function public.admin_org_settings_save(jsonb) to authenticated;

comment on function public.admin_org_settings_save(jsonb) is
  'The one write of the company''s admin Settings (handoff 45-D Part A item 4, rulings 1391, 1394). Refuses 42501 unless the caller is an admin at aal2, and 22023 on an empty patch, an unknown key, a zone with no reporting_zones row or a dia_note that is not boolean. Each setting whose value changes writes one admin_actions row in this transaction: action org_setting.changed, target_kind organization_setting, target_id the setting''s name, before and after the values. A write that changes nothing writes no row. Returns the settings.';

-- ---------------------------------------------------------------------------------------------------
-- 7. The three reads (handoff 45-D Part A item 5). The read log and the change history log their own
--    read first (1178), so the newest entry of the log is the read that shows it.
-- ---------------------------------------------------------------------------------------------------

create function public.admin_read_log(p_before bigint default null, p_limit int default 100)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 100), 1), 200);
  v_entries jsonb;
  v_last bigint;
  v_count int;
begin
  perform private.admin_staff_entry('admin_read_log');
  perform private.log_admin_read('admin_read_log');
  with page as (
    select r.id, r.occurred_at, r.projection, s.page, s.block
    from public.admin_reads r
    left join public.admin_read_subjects s on s.value = r.projection
    where r.actor = auth.uid()
      and (p_before is null or r.id < p_before)
    order by r.id desc
    limit v_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'at', p.occurred_at, 'projection', p.projection,
           'page', p.page, 'block', p.block) order by p.id desc), '[]'::jsonb),
         min(p.id), count(*)
  into v_entries, v_last, v_count
  from page p;
  return jsonb_build_object(
    'entries', v_entries,
    'next', case when v_count = v_limit then v_last else null end
  );
end;
$$;

revoke all on function public.admin_read_log(bigint, int) from public, anon;
grant execute on function public.admin_read_log(bigint, int) to authenticated;

comment on function public.admin_read_log(bigint, int) is
  'The caller''s own read log (handoff 45-D Part A item 5, rulings 1178, 1382): their admin_reads rows, newest first, each with the page and block admin_read_subjects names for its projection (null page when none does, and the app shows the raw name), paged by id with next the cursor for the page after. Gate: any live platform role at aal2 (1265). Logs its own read first. Never another staff member''s rows.';

create function public.admin_change_history(p_before bigint default null, p_limit int default 100)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 100), 1), 200);
  v_entries jsonb;
  v_last bigint;
  v_count int;
begin
  perform private.admin_staff_entry('admin_change_history');
  perform private.log_admin_read('admin_change_history');
  with page as (
    select a.id, a.occurred_at, a.target_id, a.before, a.after, m.name as by_name
    from public.admin_actions a
    left join public.members m on m.id = a.actor
    where a.target_kind = 'organization_setting'
      and (p_before is null or a.id < p_before)
    order by a.id desc
    limit v_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'at', p.occurred_at, 'setting', p.target_id,
           'before', p.before, 'after', p.after, 'by', p.by_name) order by p.id desc), '[]'::jsonb),
         min(p.id), count(*)
  into v_entries, v_last, v_count
  from page p;
  return jsonb_build_object(
    'entries', v_entries,
    'next', case when v_count = v_limit then v_last else null end
  );
end;
$$;

revoke all on function public.admin_change_history(bigint, int) from public, anon;
grant execute on function public.admin_change_history(bigint, int) to authenticated;

comment on function public.admin_change_history(bigint, int) is
  'Every Organization setting change, newest first (handoff 45-D Part A item 5, rulings 1178, 1391): from admin_actions where target_kind is organization_setting, each with the setting''s name, the value before and after, and the display name of the staff member who made it. Staff names only; no member appears here. Paged by id. Gate: any live platform role at aal2 (1265). Logs its own read first.';

create function public.admin_my_sessions()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_current text := auth.jwt() ->> 'session_id';
begin
  perform private.admin_staff_entry('admin_my_sessions');
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', x.id, 'user_agent', x.user_agent, 'last_active_at', x.last_active_at,
             'current', x.current) order by x.current desc, x.last_active_at desc), '[]'::jsonb)
    from (
      select s.id,
             s.user_agent,
             greatest(s.created_at, s.updated_at, s.refreshed_at at time zone 'UTC') as last_active_at,
             (s.id::text = v_current) as current
      from auth.sessions s
      where s.user_id = auth.uid()
        and (s.not_after is null or s.not_after > now())
    ) x
  );
end;
$$;

revoke all on function public.admin_my_sessions() from public, anon;
grant execute on function public.admin_my_sessions() to authenticated;

comment on function public.admin_my_sessions() is
  'The caller''s own active sessions (handoff 45-D Part A item 5, ruling 1382): id, user agent, last activity (the latest of created, updated and refreshed) and whether it is the session the JWT''s session_id claim names. No IP address leaves the function. Gate: any live platform role at aal2 (1265).';

-- ---------------------------------------------------------------------------------------------------
-- 8. private.overview_window: grain and comparison are validated against the two vocabularies
--    instead of literal lists (1392). Every other line is the 20261002140000 body.
-- ---------------------------------------------------------------------------------------------------

create or replace function private.overview_window(p_grain text, p_compare text, p_tz text)
returns private.overview_window
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  w private.overview_window;
  v_now timestamptz := now();
  v_local timestamp;
  v_local_start timestamp;
  v_unit interval;
  v_trunc text;
begin
  if p_grain is null or not exists (select 1 from public.overview_grains g where g.value = p_grain) then
    raise exception 'overview: unknown grain %', coalesce(p_grain, '(null)') using errcode = '22023';
  end if;
  if p_compare is null or not exists (select 1 from public.overview_comparisons c where c.value = p_compare) then
    raise exception 'overview: unknown comparison %', coalesce(p_compare, '(null)') using errcode = '22023';
  end if;
  if p_tz is null or not exists (select 1 from pg_catalog.pg_timezone_names n where n.name = p_tz) then
    raise exception 'overview: unknown time zone %', coalesce(p_tz, '(null)') using errcode = '22023';
  end if;

  w.grain := p_grain;
  w.compare := p_compare;
  w.tz := p_tz;
  w.now_at := v_now;
  w.cur_end := v_now;
  v_local := v_now at time zone p_tz;

  if p_grain = 'now' then
    w.cur_start := v_now - interval '60 minutes';
    w.bucket := interval '5 minutes';
    w.cmp_start := case when p_compare = 'previous'
      then w.cur_start - interval '60 minutes'
      else ((w.cur_start at time zone p_tz) - interval '1 year') at time zone p_tz end;
  elsif p_grain = 'hour' then
    -- The last completed clock hour (extraction §1: "The hour to 11:00", against "09:00 to 10:00").
    w.cur_end := date_trunc('hour', v_now);
    w.cur_start := w.cur_end - interval '1 hour';
    w.bucket := interval '5 minutes';
    w.cmp_start := case when p_compare = 'previous'
      then w.cur_start - interval '1 hour'
      else ((w.cur_start at time zone p_tz) - interval '1 year') at time zone p_tz end;
  else
    v_trunc := p_grain;
    v_unit := case p_grain
      when 'day' then interval '1 day'
      when 'week' then interval '1 week'
      when 'month' then interval '1 month'
      when 'quarter' then interval '3 months'
      else interval '1 year' end;
    w.bucket := case p_grain
      when 'day' then interval '1 hour'
      when 'week' then interval '1 day'
      when 'month' then interval '1 day'
      when 'quarter' then interval '1 week'
      else interval '1 month' end;
    v_local_start := date_trunc(v_trunc, v_local);
    w.cur_start := v_local_start at time zone p_tz;
    w.cmp_start := case when p_compare = 'previous'
      then (v_local_start - v_unit) at time zone p_tz
      else date_trunc(v_trunc, v_local_start - interval '1 year') at time zone p_tz end;
  end if;

  -- To the same point: the comparison window is as long as the current one has run so far.
  w.cmp_end := w.cmp_start + (w.cur_end - w.cur_start);

  select min(m.created_at) into w.first_record from public.members m;
  if w.first_record is null or w.cmp_end <= w.first_record then
    w.has_comparison := false;
    w.comparison_reason := 'before_first_record';
    w.cmp_start := null;
    w.cmp_end := null;
  else
    w.has_comparison := true;
    w.comparison_reason := null;
  end if;
  return w;
end;
$$;

comment on function private.overview_window(text, text, text) is
  'The Overview''s period and comparison for a grain, a comparison and a zone (Brief 12 12B, rulings 1304, 1305, 1310): calendar periods in the zone, weeks Monday to Sunday, the current period so far and the comparison period to the same point; now is the trailing sixty minutes and hour the last completed clock hour. Refuses with 22023 a grain with no public.overview_grains row, a comparison with no public.overview_comparisons row (handoff 45-D, 1392) and an unknown zone. A comparison window that ends at or before min(members.created_at) is reported as absent with reason before_first_record, never written in.';

-- ---------------------------------------------------------------------------------------------------
-- 9. vocabularies() gains the four option vocabularies (1392). Every other key is the live
--    definition byte for byte (20261002130100, read through pg_proc.prosrc on 3 October 2026).
-- ---------------------------------------------------------------------------------------------------

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
                          from public.event_block_kinds k),
    -- Ruling 1177: the platform roles a member can hold, in the vocabulary's order.
    'platform_role_kinds', (select coalesce(jsonb_agg(jsonb_build_object('value', k.role, 'label', k.label)
                                                       order by k.position), '[]'::jsonb)
                            from public.platform_role_kinds k),
    -- Brief 14 (1331): Messenger's thread kinds, surfaced or schema-only.
    'thread_kinds', (select coalesce(jsonb_agg(jsonb_build_object(
                              'value', k.value, 'label', k.label, 'surfaced', k.surfaced)
                              order by k.position), '[]'::jsonb)
                     from public.thread_kinds k),
    -- Brief 14 (1348): the three mute durations.
    'message_mute_durations', (select coalesce(jsonb_agg(jsonb_build_object('value', d.value, 'label', d.label)
                                                          order by d.position), '[]'::jsonb)
                               from public.message_mute_durations d),
    -- Brief 14 (1349): the six report reasons.
    'message_report_reasons', (select coalesce(jsonb_agg(jsonb_build_object('value', r.value, 'label', r.label)
                                                          order by r.position), '[]'::jsonb)
                               from public.message_report_reasons r),
    -- Brief 14 (1370): the five reactions, words and never glyphs.
    'message_reaction_kinds', (select coalesce(jsonb_agg(jsonb_build_object('value', r.value, 'label', r.label)
                                                          order by r.position), '[]'::jsonb)
                               from public.message_reaction_kinds r),
    -- Handoff 45-D (1381, 1393): the admin app's appearances.
    'admin_appearances', (select coalesce(jsonb_agg(jsonb_build_object('value', a.value, 'label', a.label)
                                                     order by a.position), '[]'::jsonb)
                          from public.admin_appearances a),
    -- Handoff 45-D (1304, 1392): the Overview's grains, values as the projections take them.
    'overview_grains', (select coalesce(jsonb_agg(jsonb_build_object('value', g.value, 'label', g.label)
                                                   order by g.position), '[]'::jsonb)
                        from public.overview_grains g),
    -- Handoff 45-D (1304, 1392): the Overview's comparisons.
    'overview_comparisons', (select coalesce(jsonb_agg(jsonb_build_object('value', c.value, 'label', c.label)
                                                        order by c.position), '[]'::jsonb)
                             from public.overview_comparisons c),
    -- Handoff 45-D (1382, 1394): the reporting zones, by IANA identifier.
    'reporting_zones', (select coalesce(jsonb_agg(jsonb_build_object(
                                 'value', z.value, 'name', z.name, 'city', z.city, 'abbreviation', z.abbreviation)
                                 order by z.position), '[]'::jsonb)
                        from public.reporting_zones z)
  );
$$;

-- ---------------------------------------------------------------------------------------------------
-- 10. The catalogue (1299, 1300): each new table with its real row; the guard of 20261002120000
--     runs again so a missing row fails the apply.
-- ---------------------------------------------------------------------------------------------------

insert into public.admin_catalogue (schema_name, table_name, admin_treatment, admin_reason, dia_treatment, dia_reason) values
  ('public', 'admin_appearances', 'operated',
   'A vocabulary a console edits by row; served to signed-in callers through vocabularies().',
   'excluded', 'A vocabulary, not member data.'),
  ('public', 'overview_grains', 'operated',
   'A vocabulary a console edits by row; served through vocabularies() and read by private.overview_window.',
   'excluded', 'A vocabulary, not member data.'),
  ('public', 'overview_comparisons', 'operated',
   'A vocabulary a console edits by row; served through vocabularies() and read by private.overview_window.',
   'excluded', 'A vocabulary, not member data.'),
  ('public', 'reporting_zones', 'operated',
   'A vocabulary a console edits by row; served through vocabularies(); every row a zone pg_timezone_names knows.',
   'excluded', 'A vocabulary, not member data.'),
  ('public', 'admin_read_subjects', 'operated',
   'The read log''s labels for each logged projection, read only inside admin_read_log (handoff 45-D).',
   'excluded', 'Describes admin reads, not members.'),
  ('public', 'admin_staff_settings', 'operated',
   'Each staff member''s own admin Settings, read and written only through admin_staff_settings_read and admin_staff_settings_save on the caller''s own row (handoff 45-D, 1392).',
   'excluded', 'Staff preferences for the admin app; nothing DIA reasons over (1300).'),
  ('public', 'admin_org_settings', 'operated',
   'The company''s one row of admin Settings, read by every staff role and written by admin through admin_org_settings_save with its admin_actions row (handoff 45-D, 1391).',
   'company_side', 'admin-dia-note reads dia_note to know whether to speak at all; no member in the row (1300).');

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
    raise exception 'b12s: tables with no admin_catalogue row (1299): %', v_missing;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- 11. The live arms (382). Settings functions are executable by authenticated, which the arms set as
--     each persona; the one addition is a count of admin_actions rows for an Organization setting,
--     because admin_actions is readable by no client role (1178) and a count names no row.
-- ---------------------------------------------------------------------------------------------------

create function private.admin_org_actions_count(p_setting text)
returns integer
language sql
stable
security definer
set search_path to ''
as $$
  select count(*)::integer
  from public.admin_actions a
  where a.target_kind = 'organization_setting' and a.target_id = p_setting;
$$;

revoke all on function private.admin_org_actions_count(text) from public;
grant execute on function private.admin_org_actions_count(text) to live_arms;

comment on function private.admin_org_actions_count(text) is
  'How many admin_actions rows record a change to one Organization setting (handoff 45-D arm 3, ruling 382), for the live arms that prove each change writes exactly one and a no-change write none. A count and never a row; executable by live_arms only.';
