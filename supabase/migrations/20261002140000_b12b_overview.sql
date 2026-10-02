-- Brief 12 12B, the Overview projections (Session 45, Lane C, handoff 45-B, Part B). The five
-- aggregate projections the admin app's Overview reads, the corridor density threshold, DIA's note
-- cache, and their catalogue rows. Governed by SPEC-40-12B.md Part B and rulings 1178, 1265, 1273,
-- 1280, 1281, 1295, 1299, 1300, 1303, 1304, 1305, 1310, 1311 and 1362 to 1365, with 1116, 382, 435
-- and 564. Committed before it is applied (ruling 225). Applied by Chat through the Supabase MCP's
-- execute_sql with its supabase_migrations.schema_migrations row in the same transaction, never by
-- apply_migration (rulings 553, 963, 965). Runs after 20261002130800, the last version the project
-- records at the time of writing (b14a_retention, another lane's), and after 20261002120000, whose
-- ledger it reads.
--
-- Read live on 2 October 2026 before this file was written: private.has_platform_role(text) requires
-- auth.jwt() ->> 'aal' = 'aal2' itself and a live platform_roles row, so no projection here reads
-- the claim a second time (1265); private.log_admin_read(text) is executable by service_role only
-- and runs inside a definer; public.mobilization_ledger holds 38 rows at definition_version 1,
-- depths engaging and leading, source counterparty, every direction, and no row carries a corridor;
-- public.surface_event_rollups holds 0 rows and no projection here reads it (handoff item 4);
-- public.member_connections stores both directions of every connection (34 rows, 34 matched
-- pairs), so a pair is counted once by member_id < other_id; public.attestations carries two
-- accepted rows whose (object_kind, attester_role) are (event, host) and (opportunity, Space lead);
-- public.connection_requests statuses are accepted, pending and withdrawn; public.event_registrations
-- statuses are going; public.corridors keys on text with one active row; public.admin_catalogue
-- holds 93 rows and the guard of 20261002120000 requires a row for every table in public; and
-- pg_timezone_names knows America/Los_Angeles on PostgreSQL 17.6.
--
-- What this adds.
--   public.corridors.density_threshold   the internal threshold a corridor's density is read against
--                                        (1303, SPEC gap). Nullable, no default, added bare (564): a
--                                        corridor with none renders "No threshold set" and no tick.
--   public.admin_dia_notes               DIA's statements for one period, grain, comparison, zone and
--                                        definition version (SPEC Part D item 4). RLS on, no policy
--                                        for any role; read and written only through the two gated
--                                        definer functions below.
--   private.admin_overview_entry(text)   the two statements every projection opens with, in order:
--                                        refuse with 42501 unless the caller holds admin or analyst
--                                        at aal2 (1311, 1265), then log the read (1178).
--   private.overview_window(...)         the period, its comparison and whether one exists (1304,
--                                        1310), computed in the caller's zone, never written in.
--   public.admin_overview_window, public.admin_overview_mobilization, public.admin_overview_levers,
--   public.admin_overview_network, public.admin_overview_company
--                                        the five projections, aggregates only (1281).
--   public.admin_dia_note_read, public.admin_dia_note_write
--                                        the cache's two paths, gated and logged as the projections.
--   private.admin_reads_count(uuid, text) a count for the live arms (382): how many admin_reads rows
--                                        an actor wrote for a projection, never a row.
--   admin_catalogue rows                 the new table, and corridors' treatment now that a
--                                        projection reads it, its new column excluded from DIA's
--                                        member-side reach (1299, 1300).
--
-- Where the handoff's sources and the tree disagree, built to the outcome and reported (555):
--   admin_overview_network reads side and stance at now(), because it takes p_tz alone and has no
--   period end to read them at; the SPEC gives it no grain.
--   A member's first act is the earliest ledger act at or after onboarded_at (1365): the seeded
--   accounts carry acts dated before their onboarding, and a negative day count is not a time to
--   first act.
--   Attestations are placed by (object_kind, attester_role): an event attestation by its host is
--   event attendance, an event attestation by anyone else is hosting, and everything else is other,
--   so no row is unplaceable; the kinds that fall to other are returned so the report can name them.
--   The refresh moment the window reports is the greater of the rollups' last rolled_at and the
--   ledger's last derived_at, because the rollups are empty until 12C part 2 and the ledger is what
--   every figure on the page reads.
--
-- What this file does not touch: any member surface's projection or write path, any existing
-- policy or grant, public.vocabularies(), surface_event_rollups, docs/GAPS.md and CLAUDE.md.

-- ---------------------------------------------------------------------------------------------------
-- 1. The corridor threshold (1303). Added bare and left without a default (564): nothing backfills,
--    and a corridor with no threshold renders "No threshold set" rather than a guessed one. Setting a
--    threshold is the Events console's job later (12E); until then Chat sets it by migration on the
--    founder's word.
-- ---------------------------------------------------------------------------------------------------

alter table public.corridors add column density_threshold numeric;

comment on column public.corridors.density_threshold is
  'The internal density threshold this corridor is read against on the Overview (Brief 12 12B, ruling 1303): connections per joined member, counting only connections between members of the same corridor. Null means no threshold is set and the Overview says so. Company-facing, never shown to a member, and excluded from DIA''s member-side reach (1300). Written by migration until the Events console (12E) owns it.';

-- ---------------------------------------------------------------------------------------------------
-- 2. DIA's note cache (SPEC Part D item 4). One row per period, grain, comparison, zone and
--    definition version; the statements as DIA returned them after the server's own checks (1301).
--    No policy for any role: the only reads and writes are the two definer functions in section 7.
-- ---------------------------------------------------------------------------------------------------

create table public.admin_dia_notes (
  grain text not null,
  compare text not null,
  tz text not null,
  period_start timestamptz not null,
  definition_version int not null,
  statements jsonb not null default '[]'::jsonb,
  written_at timestamptz not null default now(),
  primary key (grain, compare, tz, period_start, definition_version),
  constraint admin_dia_notes_statements_array check (jsonb_typeof(statements) = 'array')
);

alter table public.admin_dia_notes enable row level security;

revoke all on table public.admin_dia_notes from public, anon, authenticated, service_role;

comment on table public.admin_dia_notes is
  'DIA''s note for one Overview period (Brief 12 12B, SPEC Part D item 4, rulings 1273, 1301): the word-only statements the admin-dia-note Edge Function kept, keyed on grain, comparison, zone, period start and the definition version in force, so DIA is asked once per period and not on every load. No policy for any role and no client grant: a member, a Space lead, an event host and the service role hold nothing here, deliberately (1116), because the cache serves one admin surface and nothing a member sees; an admin or analyst at aal2 reads it only through public.admin_dia_note_read and writes it only through public.admin_dia_note_write, each a definer that logs the read (1178). Rows carry aggregates in words and never a member (1281).';

-- ---------------------------------------------------------------------------------------------------
-- 3. The entry every projection opens with, and the window every period is computed from.
-- ---------------------------------------------------------------------------------------------------

-- Statement one: the gate (1311: admin and analyst open the Overview; 1265: has_platform_role reads
-- aal2 itself). Statement two: the log (1178). Called first in every projection below, so the two
-- stay in this order everywhere.
create function private.admin_overview_entry(p_projection text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not (private.has_platform_role('admin') or private.has_platform_role('analyst')) then
    raise exception '%: admin or analyst at aal2 required', p_projection using errcode = '42501';
  end if;
  perform private.log_admin_read(p_projection);
end;
$$;

revoke all on function private.admin_overview_entry(text) from public;

comment on function private.admin_overview_entry(text) is
  'The first call of every Overview projection (Brief 12 12B, rulings 1265, 1178, 1311): refuses with 42501 unless the caller holds admin or analyst at aal2, then writes the caller''s admin_reads row for the projection named. One copy so the order never varies.';

-- The period and its comparison (1304, 1305, 1310): calendar periods in the caller's zone, weeks
-- Monday to Sunday (date_trunc('week') is ISO), the current period so far against the comparison
-- period to the same point. `now` is the trailing sixty minutes and `hour` the last completed clock
-- hour against the hour before it, as the extraction draws both.
-- A comparison exists only when its window ends after the network's first record,
-- min(members.created_at); otherwise comparison_reason is before_first_record and the client writes
-- the sentence with first_record's date (1310).
create type private.overview_window as (
  grain text,
  compare text,
  tz text,
  now_at timestamptz,
  cur_start timestamptz,
  cur_end timestamptz,
  cmp_start timestamptz,
  cmp_end timestamptz,
  has_comparison boolean,
  comparison_reason text,
  first_record timestamptz,
  bucket interval
);

create function private.overview_window(p_grain text, p_compare text, p_tz text)
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
  if p_grain is null or p_grain not in ('now', 'hour', 'day', 'week', 'month', 'quarter', 'year') then
    raise exception 'overview: unknown grain %', coalesce(p_grain, '(null)') using errcode = '22023';
  end if;
  if p_compare is null or p_compare not in ('previous', 'last_year') then
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

revoke all on function private.overview_window(text, text, text) from public;

comment on function private.overview_window(text, text, text) is
  'The Overview''s period and comparison for a grain, a comparison and a zone (Brief 12 12B, rulings 1304, 1305, 1310): calendar periods in the zone, weeks Monday to Sunday, the current period so far and the comparison period to the same point; now is the trailing sixty minutes and hour the last completed clock hour. Refuses an unknown grain, comparison or zone with 22023. A comparison window that ends at or before min(members.created_at) is reported as absent with reason before_first_record, never written in.';

-- The sub-periods a trend series is drawn over: one bucket per step from the period's start to now,
-- in the zone, the last one cut at now.
create function private.overview_buckets(w private.overview_window)
returns table (b_start timestamptz, b_end timestamptz)
language sql
stable
security definer
set search_path to ''
as $$
  with s as (
    select (g at time zone w.tz) as b_start
    from generate_series(w.cur_start at time zone w.tz, w.cur_end at time zone w.tz, w.bucket) g
  )
  select b_start, least(coalesce(lead(b_start) over (order by b_start), w.cur_end), w.cur_end) as b_end
  from s
  where b_start < w.cur_end
  order by b_start;
$$;

revoke all on function private.overview_buckets(private.overview_window) from public;

-- The window as every projection returns it.
create function private.overview_window_json(w private.overview_window)
returns jsonb
language sql
immutable
set search_path to ''
as $$
  select jsonb_build_object(
    'grain', w.grain,
    'compare', w.compare,
    'tz', w.tz,
    'now', w.now_at,
    'period', jsonb_build_object('start', w.cur_start, 'end', w.cur_end),
    'comparison', case when w.has_comparison
      then jsonb_build_object('start', w.cmp_start, 'end', w.cmp_end) else null end,
    'comparison_reason', w.comparison_reason,
    'first_record', w.first_record,
    'bucket', w.bucket::text
  );
$$;

revoke all on function private.overview_window_json(private.overview_window) from public;

-- The definition version in force: the latest the ledger carries, 1 before any row exists.
create function private.overview_version()
returns int
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(max(l.definition_version), 1) from public.mobilization_ledger l;
$$;

revoke all on function private.overview_version() from public;

-- ---------------------------------------------------------------------------------------------------
-- 4. The window projection.
-- ---------------------------------------------------------------------------------------------------

create function public.admin_overview_window(p_grain text, p_compare text, p_tz text)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  w private.overview_window;
  v_rolled timestamptz;
  v_derived timestamptz;
begin
  perform private.admin_overview_entry('admin_overview_window');
  w := private.overview_window(p_grain, p_compare, p_tz);
  select max(r.rolled_at) into v_rolled from public.surface_event_rollups r;
  select max(l.derived_at) into v_derived from public.mobilization_ledger l;
  return private.overview_window_json(w) || jsonb_build_object(
    'definition_version', private.overview_version(),
    'rollups_refreshed_at', v_rolled,
    'ledger_derived_at', v_derived,
    'refreshed_at', greatest(v_rolled, v_derived)
  );
end;
$$;

revoke all on function public.admin_overview_window(text, text, text) from public, anon;
grant execute on function public.admin_overview_window(text, text, text) to authenticated;

comment on function public.admin_overview_window(text, text, text) is
  'The Overview''s window (Brief 12 12B, SPEC Part B): the period''s start and end so far, the comparison window or null with its reason and the first record''s moment (1310), the definition version in force, and when the rollups and the ledger were last refreshed. Refuses with 42501 unless the caller holds admin or analyst at aal2 (1311), logs the read (1178), refuses an unknown zone with 22023 (1305). No member in any key or value (1281).';

-- ---------------------------------------------------------------------------------------------------
-- 5. Mobilization: the ledger at the current definition version (1280 to 1288).
-- ---------------------------------------------------------------------------------------------------

create function public.admin_overview_mobilization(p_grain text, p_compare text, p_tz text)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  w private.overview_window;
  v int;
  v_mobilized jsonb;
  v_bridging jsonb;
  v_depth jsonb;
  v_direction jsonb;
  v_source jsonb;
  v_corridors jsonb;
  v_outside int;
begin
  perform private.admin_overview_entry('admin_overview_mobilization');
  w := private.overview_window(p_grain, p_compare, p_tz);
  v := private.overview_version();

  -- Mobilized Members (1280): distinct members with an act in the trailing 28 days at the period's
  -- end, and the same at the comparison's end; the series reads it at each bucket's end.
  select jsonb_build_object(
    'value', (select count(distinct l.member_id) from public.mobilization_ledger l
              where l.definition_version = v
                and l.occurred_at > w.cur_end - interval '28 days' and l.occurred_at <= w.cur_end),
    'comparison', case when w.has_comparison then
      (select count(distinct l.member_id) from public.mobilization_ledger l
        where l.definition_version = v
          and l.occurred_at > w.cmp_end - interval '28 days' and l.occurred_at <= w.cmp_end)
      else null end,
    'series', (select coalesce(jsonb_agg(jsonb_build_object(
        'start', b.b_start,
        'value', (select count(distinct l.member_id) from public.mobilization_ledger l
                  where l.definition_version = v
                    and l.occurred_at > b.b_end - interval '28 days' and l.occurred_at <= b.b_end))
        order by b.b_start), '[]'::jsonb)
      from private.overview_buckets(w) b)
  ) into v_mobilized;

  -- Bridging acts (1285): acts in the period whose parties sit on different sides.
  select jsonb_build_object(
    'value', (select count(*) from public.mobilization_ledger l
              where l.definition_version = v and l.bridging
                and l.occurred_at >= w.cur_start and l.occurred_at < w.cur_end),
    'comparison', case when w.has_comparison then
      (select count(*) from public.mobilization_ledger l
        where l.definition_version = v and l.bridging
          and l.occurred_at >= w.cmp_start and l.occurred_at < w.cmp_end)
      else null end,
    'series', (select coalesce(jsonb_agg(jsonb_build_object(
        'start', b.b_start,
        'value', (select count(*) from public.mobilization_ledger l
                  where l.definition_version = v and l.bridging
                    and l.occurred_at >= b.b_start and l.occurred_at < b.b_end))
        order by b.b_start), '[]'::jsonb)
      from private.overview_buckets(w) b)
  ) into v_bridging;

  -- Depth (1286): one point per bucket with Engaging and Leading; Collaborating and Contributing
  -- are null until the Spaces and Contribute engines exist.
  select jsonb_build_object(
    'points', (select coalesce(jsonb_agg(jsonb_build_object(
        'start', b.b_start,
        'engaging', (select count(*) from public.mobilization_ledger l
                     where l.definition_version = v and l.depth = 'engaging'
                       and l.occurred_at >= b.b_start and l.occurred_at < b.b_end),
        'leading', (select count(*) from public.mobilization_ledger l
                    where l.definition_version = v and l.depth = 'leading'
                      and l.occurred_at >= b.b_start and l.occurred_at < b.b_end),
        'collaborating', null,
        'contributing', null)
        order by b.b_start), '[]'::jsonb)
      from private.overview_buckets(w) b),
    'not_measurable', jsonb_build_array('collaborating', 'contributing')
  ) into v_depth;

  -- Direction (1285): the four, in the extraction's order, counts of acts in the period.
  select jsonb_agg(jsonb_build_object(
      'key', d.key,
      'value', (select count(*) from public.mobilization_ledger l
                where l.definition_version = v and l.direction = d.key
                  and l.occurred_at >= w.cur_start and l.occurred_at < w.cur_end))
      order by d.ord)
  into v_direction
  from (values ('diaspora_to_continent', 1), ('continent_to_diaspora', 2),
               ('diaspora_to_diaspora', 3), ('continent_to_continent', 4)) d (key, ord);

  -- Source (1287): on-platform counterparty confirmations; partner and DNA system are null with
  -- not_connected until the Relationships console and the check-in path write them.
  select jsonb_build_array(
    jsonb_build_object('key', 'counterparty', 'status', 'connected',
      'value', (select count(*) from public.mobilization_ledger l
                where l.definition_version = v and l.source = 'counterparty'
                  and l.occurred_at >= w.cur_start and l.occurred_at < w.cur_end)),
    jsonb_build_object('key', 'partner', 'status', 'not_connected', 'value', null),
    jsonb_build_object('key', 'dna_system', 'status', 'not_connected', 'value', null)
  ) into v_source;

  -- By corridor: every corridor, with acts in the period, mobilized members at the period's end
  -- and bridging acts, each act counted once per corridor it carries and never summed across
  -- corridors; and the acts outside any corridor.
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id,
      'label', c.continental_place || ' to ' || c.diaspora_place,
      'status', c.status,
      'acts', (select count(*) from public.mobilization_ledger l
               where l.definition_version = v and l.corridor_ids @> array[c.id]
                 and l.occurred_at >= w.cur_start and l.occurred_at < w.cur_end),
      'mobilized', (select count(distinct l.member_id) from public.mobilization_ledger l
                    where l.definition_version = v and l.corridor_ids @> array[c.id]
                      and l.occurred_at > w.cur_end - interval '28 days' and l.occurred_at <= w.cur_end),
      'bridging', (select count(*) from public.mobilization_ledger l
                   where l.definition_version = v and l.bridging and l.corridor_ids @> array[c.id]
                     and l.occurred_at >= w.cur_start and l.occurred_at < w.cur_end))
      order by c.id), '[]'::jsonb)
  into v_corridors
  from public.corridors c;

  select count(*) into v_outside
  from public.mobilization_ledger l
  where l.definition_version = v and cardinality(l.corridor_ids) = 0
    and l.occurred_at >= w.cur_start and l.occurred_at < w.cur_end;

  return private.overview_window_json(w) || jsonb_build_object(
    'definition_version', v,
    'mobilized', v_mobilized,
    'bridging', v_bridging,
    'depth', v_depth,
    'direction', v_direction,
    'source', v_source,
    'corridors', v_corridors,
    'outside_corridor', v_outside,
    'acts', (select count(*) from public.mobilization_ledger l
             where l.definition_version = v
               and l.occurred_at >= w.cur_start and l.occurred_at < w.cur_end)
  );
end;
$$;

revoke all on function public.admin_overview_mobilization(text, text, text) from public, anon;
grant execute on function public.admin_overview_mobilization(text, text, text) to authenticated;

comment on function public.admin_overview_mobilization(text, text, text) is
  'The Mobilization block (Brief 12 12B, SPEC Part B, rulings 1280 to 1288): Mobilized Members in the trailing 28 days at the period''s end with its comparison and series, bridging acts, depth per bucket with Collaborating and Contributing null, the four directions, the three sources with partner and DNA system null and not_connected, one row per corridor and the acts outside any corridor, all from public.mobilization_ledger at the definition version in force. Gate, log and zone as admin_overview_window. Aggregates only, never a member id (1281).';

-- ---------------------------------------------------------------------------------------------------
-- 6. The levers, from the product tables; and the network and the company lines.
-- ---------------------------------------------------------------------------------------------------

create function public.admin_overview_levers(p_grain text, p_compare text, p_tz text)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  w private.overview_window;
  v int;
  v_onboarding jsonb;
  v_first_act jsonb;
  v_intros jsonb;
  v_rsvp jsonb;
  v_events jsonb;
  v_att jsonb;
  v_posts jsonb;
begin
  perform private.admin_overview_entry('admin_overview_levers');
  w := private.overview_window(p_grain, p_compare, p_tz);
  v := private.overview_version();

  -- Onboarding (1364): Completed from members.onboarded_at; Started and the drop-off step are not
  -- connected until 12C part 2 adds a step-level aggregate.
  select jsonb_build_object(
    'completed', jsonb_build_object(
      'value', (select count(*) from public.members m
                where m.onboarded_at >= w.cur_start and m.onboarded_at < w.cur_end),
      'comparison', case when w.has_comparison then
        (select count(*) from public.members m
          where m.onboarded_at >= w.cmp_start and m.onboarded_at < w.cmp_end) else null end,
      'series', (select coalesce(jsonb_agg(jsonb_build_object(
          'start', b.b_start,
          'value', (select count(*) from public.members m
                    where m.onboarded_at >= b.b_start and m.onboarded_at < b.b_end))
          order by b.b_start), '[]'::jsonb)
        from private.overview_buckets(w) b)),
    'started', jsonb_build_object('value', null, 'status', 'not_connected'),
    'drop_off', jsonb_build_object('value', null, 'status', 'not_connected')
  ) into v_onboarding;

  -- Time to first act (1365): the median days from onboarded_at to the member's first ledger act at
  -- or after it, over members whose onboarded_at falls in the period; members with no act yet are
  -- excluded, and with none counted the value is null.
  with joined as (
    select m.id, m.onboarded_at,
      (select min(l.occurred_at) from public.mobilization_ledger l
       where l.definition_version = v and l.member_id = m.id and l.occurred_at >= m.onboarded_at) as first_act
    from public.members m
    where m.onboarded_at >= w.cur_start and m.onboarded_at < w.cur_end
  ),
  joined_cmp as (
    select m.id, m.onboarded_at,
      (select min(l.occurred_at) from public.mobilization_ledger l
       where l.definition_version = v and l.member_id = m.id and l.occurred_at >= m.onboarded_at) as first_act
    from public.members m
    where w.has_comparison and m.onboarded_at >= w.cmp_start and m.onboarded_at < w.cmp_end
  )
  select jsonb_build_object(
    'status', 'connected',
    'value', (select round((percentile_cont(0.5) within group (order by extract(epoch from (j.first_act - j.onboarded_at)) / 86400.0))::numeric, 1)
              from joined j where j.first_act is not null),
    'members_counted', (select count(*) from joined j where j.first_act is not null),
    'members_onboarded', (select count(*) from joined),
    'comparison', case when w.has_comparison then
      (select round((percentile_cont(0.5) within group (order by extract(epoch from (j.first_act - j.onboarded_at)) / 86400.0))::numeric, 1)
       from joined_cmp j where j.first_act is not null) else null end
  ) into v_first_act;

  -- Introductions: sent by created_at, accepted by responded_at, and the median time to answer over
  -- requests answered in the period.
  select jsonb_build_object(
    'sent', jsonb_build_object(
      'value', (select count(*) from public.connection_requests r
                where r.created_at >= w.cur_start and r.created_at < w.cur_end),
      'comparison', case when w.has_comparison then
        (select count(*) from public.connection_requests r
          where r.created_at >= w.cmp_start and r.created_at < w.cmp_end) else null end,
      'series', (select coalesce(jsonb_agg(jsonb_build_object(
          'start', b.b_start,
          'value', (select count(*) from public.connection_requests r
                    where r.created_at >= b.b_start and r.created_at < b.b_end))
          order by b.b_start), '[]'::jsonb)
        from private.overview_buckets(w) b)),
    'accepted', jsonb_build_object(
      'value', (select count(*) from public.connection_requests r
                where r.status = 'accepted' and r.responded_at >= w.cur_start and r.responded_at < w.cur_end),
      'comparison', case when w.has_comparison then
        (select count(*) from public.connection_requests r
          where r.status = 'accepted' and r.responded_at >= w.cmp_start and r.responded_at < w.cmp_end) else null end),
    'answer_days', jsonb_build_object(
      'value', (select round((percentile_cont(0.5) within group (order by extract(epoch from (r.responded_at - r.created_at)) / 86400.0))::numeric, 1)
                from public.connection_requests r
                where r.responded_at is not null and r.status <> 'withdrawn'
                  and r.responded_at >= w.cur_start and r.responded_at < w.cur_end),
      'comparison', case when w.has_comparison then
        (select round((percentile_cont(0.5) within group (order by extract(epoch from (r.responded_at - r.created_at)) / 86400.0))::numeric, 1)
         from public.connection_requests r
         where r.responded_at is not null and r.status <> 'withdrawn'
           and r.responded_at >= w.cmp_start and r.responded_at < w.cmp_end) else null end)
  ) into v_intros;

  -- RSVP going (intent, never an act: 1296): registrations with status going by created_at.
  select jsonb_build_object(
    'value', (select count(*) from public.event_registrations e
              where e.status = 'going' and e.created_at >= w.cur_start and e.created_at < w.cur_end),
    'comparison', case when w.has_comparison then
      (select count(*) from public.event_registrations e
        where e.status = 'going' and e.created_at >= w.cmp_start and e.created_at < w.cmp_end) else null end,
    'series', (select coalesce(jsonb_agg(jsonb_build_object(
        'start', b.b_start,
        'value', (select count(*) from public.event_registrations e
                  where e.status = 'going' and e.created_at >= b.b_start and e.created_at < b.b_end))
        order by b.b_start), '[]'::jsonb)
      from private.overview_buckets(w) b)
  ) into v_rsvp;

  -- Events held: ends_at in the period and not cancelled; filled when the going count reached
  -- event_host_settings.capacity.
  with held as (
    select e.id,
      (select hs.capacity from public.event_host_settings hs where hs.event_id = e.id) as capacity,
      (select count(*) from public.event_registrations r where r.event_id = e.id and r.status = 'going') as going
    from public.events e
    where e.cancelled_at is null and e.ends_at >= w.cur_start and e.ends_at < w.cur_end
  )
  select jsonb_build_object(
    'held', jsonb_build_object(
      'value', (select count(*) from held),
      'comparison', case when w.has_comparison then
        (select count(*) from public.events e
          where e.cancelled_at is null and e.ends_at >= w.cmp_start and e.ends_at < w.cmp_end) else null end,
      'series', (select coalesce(jsonb_agg(jsonb_build_object(
          'start', b.b_start,
          'value', (select count(*) from public.events e
                    where e.cancelled_at is null and e.ends_at >= b.b_start and e.ends_at < b.b_end))
          order by b.b_start), '[]'::jsonb)
        from private.overview_buckets(w) b)),
    'filled', jsonb_build_object(
      'value', (select count(*) from held h where h.capacity is not null and h.going >= h.capacity))
  ) into v_events;

  -- Attestations by context (435: accepted_at in the period): an event attestation by its host is
  -- event attendance, an event attestation by anyone else is hosting, everything else is other, and
  -- the kinds that fell to other are named.
  with acc as (
    select a.object_kind::text as object_kind, a.attester_role,
      case when a.object_kind = 'event' and a.attester_role = 'host' then 'event_attendance'
           when a.object_kind = 'event' then 'hosting'
           else 'other' end as context
    from public.attestations a
    where a.accepted_at >= w.cur_start and a.accepted_at < w.cur_end
  )
  select jsonb_build_object(
    'value', (select count(*) from acc),
    'comparison', case when w.has_comparison then
      (select count(*) from public.attestations a
        where a.accepted_at >= w.cmp_start and a.accepted_at < w.cmp_end) else null end,
    'series', (select coalesce(jsonb_agg(jsonb_build_object(
        'start', b.b_start,
        'value', (select count(*) from public.attestations a
                  where a.accepted_at >= b.b_start and a.accepted_at < b.b_end))
        order by b.b_start), '[]'::jsonb)
      from private.overview_buckets(w) b),
    'by_context', jsonb_build_object(
      'event_attendance', (select count(*) from acc where context = 'event_attendance'),
      'hosting', (select count(*) from acc where context = 'hosting'),
      'other', (select count(*) from acc where context = 'other')),
    'other_kinds', (select coalesce(jsonb_agg(distinct (object_kind || '/' || attester_role)), '[]'::jsonb)
                    from acc where context = 'other')
  ) into v_att;

  -- Posts by C: published in the period, by c_category; system posts are counted apart.
  select jsonb_build_object(
    'value', (select count(*) from public.posts p
              where p.c_category <> 'system' and p.published_at >= w.cur_start and p.published_at < w.cur_end),
    'comparison', case when w.has_comparison then
      (select count(*) from public.posts p
        where p.c_category <> 'system' and p.published_at >= w.cmp_start and p.published_at < w.cmp_end) else null end,
    'series', (select coalesce(jsonb_agg(jsonb_build_object(
        'start', b.b_start,
        'value', (select count(*) from public.posts p
                  where p.c_category <> 'system' and p.published_at >= b.b_start and p.published_at < b.b_end))
        order by b.b_start), '[]'::jsonb)
      from private.overview_buckets(w) b),
    'by_c', (select jsonb_object_agg(c.key, (select count(*) from public.posts p
              where p.c_category::text = c.key and p.published_at >= w.cur_start and p.published_at < w.cur_end))
             from (values ('convey'), ('convene'), ('connect'), ('collaborate'), ('contribute')) c (key)),
    'system', (select count(*) from public.posts p
               where p.c_category = 'system' and p.published_at >= w.cur_start and p.published_at < w.cur_end)
  ) into v_posts;

  return private.overview_window_json(w) || jsonb_build_object(
    'definition_version', v,
    'invites', jsonb_build_object('value', null, 'status', 'not_connected'),
    'onboarding', v_onboarding,
    'time_to_first_act', v_first_act,
    'introductions', v_intros,
    'rsvp_going', v_rsvp,
    'events', v_events,
    'attestations', v_att,
    'posts', v_posts,
    'story_led', jsonb_build_object('value', null, 'status', 'not_connected')
  );
end;
$$;

revoke all on function public.admin_overview_levers(text, text, text) from public, anon;
grant execute on function public.admin_overview_levers(text, text, text) to authenticated;

comment on function public.admin_overview_levers(text, text, text) is
  'The nine levers (Brief 12 12B, SPEC Part B, rulings 1362 to 1365): invites null and not_connected (1363); onboarding Completed from members.onboarded_at with Started and the drop-off step not connected (1364); time to first act as the median days from onboarding to the first ledger act over members onboarded in the period (1365); introductions sent, accepted and the median time to answer; RSVP going; events held and filled; attestations by context; posts by C; story-led acts null and not_connected. Gate, log and zone as admin_overview_window. Aggregates only (1281).';

create function public.admin_overview_network(p_tz text)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_now timestamptz := now();
  v_sides jsonb;
  v_stances jsonb;
  v_corridors jsonb;
begin
  perform private.admin_overview_entry('admin_overview_network');
  if p_tz is null or not exists (select 1 from pg_catalog.pg_timezone_names n where n.name = p_tz) then
    raise exception 'overview: unknown time zone %', coalesce(p_tz, '(null)') using errcode = '22023';
  end if;

  -- Two breakdowns of the same joined members, never merged (1295): the side from the country in
  -- force now through private.member_side, the stance from the same history row.
  with joined as (
    select m.id, private.member_side(m.id, v_now) as side, (private.profile_at(m.id, v_now)).stance as stance
    from public.members m
    where m.onboarded_at is not null
  )
  select
    (select jsonb_agg(jsonb_build_object('side', s.side,
        'value', (select count(*) from joined j where j.side = s.side)) order by s.ord)
     from (values ('diaspora', 1), ('continent', 2)) s (side, ord)),
    (select jsonb_agg(jsonb_build_object('stance', k.stance, 'label', k.label,
        'value', (select count(*) from joined j where j.stance = k.stance)) order by k.position)
     from public.member_stances k)
  into v_sides, v_stances;

  -- Corridor density (1303): connections whose two ends are both in the corridor, each pair counted
  -- once (member_connections stores both directions), over the corridor's joined members.
  select coalesce(jsonb_agg(d order by d ->> 'id'), '[]'::jsonb) into v_corridors
  from (
    select jsonb_build_object(
      'id', c.id,
      'label', c.continental_place || ' to ' || c.diaspora_place,
      'status', c.status,
      'joined_members', j.n,
      'connections', x.n,
      'density', case when j.n > 0 then round(x.n::numeric / j.n, 2) else null end,
      'threshold', c.density_threshold) as d
    from public.corridors c
    cross join lateral (
      select count(*) as n
      from public.member_corridors mc
      join public.members m on m.id = mc.member_id and m.onboarded_at is not null
      where mc.corridor_id = c.id) j
    cross join lateral (
      select count(*) as n
      from public.member_connections k
      where k.member_id < k.other_id
        and exists (select 1 from public.member_corridors a where a.corridor_id = c.id and a.member_id = k.member_id)
        and exists (select 1 from public.member_corridors b where b.corridor_id = c.id and b.member_id = k.other_id)) x
  ) t;

  return jsonb_build_object(
    'tz', p_tz,
    'as_of', v_now,
    'registered', (select count(*) from public.members),
    'admitted', jsonb_build_object('value', null, 'status', 'not_connected'),
    'joined', (select count(*) from public.members m where m.onboarded_at is not null),
    'by_side', coalesce(v_sides, '[]'::jsonb),
    'by_stance', coalesce(v_stances, '[]'::jsonb),
    'corridors', v_corridors
  );
end;
$$;

revoke all on function public.admin_overview_network(text) from public, anon;
grant execute on function public.admin_overview_network(text) to authenticated;

comment on function public.admin_overview_network(text) is
  'The network block (Brief 12 12B, SPEC Part B, rulings 623, 1295, 1303, 1362): registered, admitted (null and not_connected until the Members console''s invite cohort exists) and joined as three counts never merged; joined members by side and by stance as two breakdowns read at now() through private.member_side and private.profile_at; and per corridor its joined members, its connections counted once, its density and its threshold. Gate, log and zone as admin_overview_window. Aggregates only (1281).';

create function public.admin_overview_company()
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
begin
  perform private.admin_overview_entry('admin_overview_company');
  return jsonb_build_object(
    'partnerships', jsonb_build_object('status', 'not_connected'),
    'newsletter', jsonb_build_object('status', 'not_connected'),
    'revenue', jsonb_build_object('status', 'not_connected'),
    'chapters', jsonb_build_object('status', 'not_connected')
  );
end;
$$;

revoke all on function public.admin_overview_company() from public, anon;
grant execute on function public.admin_overview_company() to authenticated;

comment on function public.admin_overview_company() is
  'The four company lines (Brief 12 12B, SPEC Part B): partnerships, newsletter, revenue and chapters, each not_connected until the Relationships console, the newsletter, paid ticketing and the business track exist. Gate and log as admin_overview_window.';

-- ---------------------------------------------------------------------------------------------------
-- 7. DIA's note cache: the two paths (SPEC Part D item 4), gated and logged exactly as the
--    projections, keyed on the window's period start and the definition version in force.
-- ---------------------------------------------------------------------------------------------------

create function public.admin_dia_note_read(p_grain text, p_compare text, p_tz text)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  w private.overview_window;
  v_row public.admin_dia_notes;
begin
  perform private.admin_overview_entry('admin_dia_note_read');
  w := private.overview_window(p_grain, p_compare, p_tz);
  select n.* into v_row
  from public.admin_dia_notes n
  where n.grain = w.grain and n.compare = w.compare and n.tz = w.tz
    and n.period_start = w.cur_start and n.definition_version = private.overview_version();
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'statements', v_row.statements,
    'written_at', v_row.written_at,
    'period_start', v_row.period_start,
    'definition_version', v_row.definition_version
  );
end;
$$;

revoke all on function public.admin_dia_note_read(text, text, text) from public, anon;
grant execute on function public.admin_dia_note_read(text, text, text) to authenticated;

comment on function public.admin_dia_note_read(text, text, text) is
  'DIA''s cached note for the current period of a grain, comparison and zone (Brief 12 12B, SPEC Part D item 4), or null when none is written. Gate, log and zone as admin_overview_window; the one read of public.admin_dia_notes.';

create function public.admin_dia_note_write(p_grain text, p_compare text, p_tz text, p_statements jsonb)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  w private.overview_window;
begin
  perform private.admin_overview_entry('admin_dia_note_write');
  w := private.overview_window(p_grain, p_compare, p_tz);
  if p_statements is null or jsonb_typeof(p_statements) <> 'array' then
    raise exception 'admin_dia_note_write: statements must be an array' using errcode = '22023';
  end if;
  insert into public.admin_dia_notes (grain, compare, tz, period_start, definition_version, statements, written_at)
  values (w.grain, w.compare, w.tz, w.cur_start, private.overview_version(), p_statements, now())
  on conflict (grain, compare, tz, period_start, definition_version) do update
    set statements = excluded.statements, written_at = excluded.written_at;
end;
$$;

revoke all on function public.admin_dia_note_write(text, text, text, jsonb) from public, anon;
grant execute on function public.admin_dia_note_write(text, text, text, jsonb) to authenticated;

comment on function public.admin_dia_note_write(text, text, text, jsonb) is
  'Writes DIA''s note for the current period of a grain, comparison and zone (Brief 12 12B, SPEC Part D item 4), replacing an earlier one for the same key. Gate, log and zone as admin_overview_window; refuses a non-array with 22023; the one write of public.admin_dia_notes. Called by the admin-dia-note Edge Function with the caller''s own JWT.';

-- ---------------------------------------------------------------------------------------------------
-- 8. The catalogue (1299, 1300): the new table with a real row, and corridors now that a projection
--    reads it, its density_threshold named as excluded from DIA's member-side reach. The guard of
--    20261002120000 runs again so a missing row fails the apply.
-- ---------------------------------------------------------------------------------------------------

insert into public.admin_catalogue (schema_name, table_name, admin_treatment, admin_reason, dia_treatment, dia_reason) values
  ('public', 'admin_dia_notes', 'projected',
   'DIA''s cached Overview note, read and written only through admin_dia_note_read and admin_dia_note_write, each gated and logged (Brief 12 12B).',
   'company_side', 'DIA''s own words over aggregates for the company''s review; no member in any row (1273, 1281).');

update public.admin_catalogue
set admin_treatment = 'projected',
    admin_reason = 'Read as aggregates by admin_overview_mobilization and admin_overview_network, density against density_threshold (Brief 12 12B, ruling 1303); thresholds are written by migration until the Events console (12E).',
    dia_treatment = 'excluded',
    dia_reason = 'Corridors are place pairs and density_threshold is company-facing; excluded from DIA''s member-side reach (1300).',
    recorded_at = now()
where schema_name = 'public' and table_name = 'corridors';

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
    raise exception 'b12b: tables with no admin_catalogue row (1299): %', v_missing;
  end if;
  if (select count(*) from public.admin_catalogue a where a.schema_name = 'public' and a.table_name = 'corridors') <> 1 then
    raise exception 'b12b: corridors has no admin_catalogue row to update (1299)';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- 9. The live arms (382): the projections are executable by authenticated, which the arms set as
--    the admin persona at aal2, so nothing wider is granted. The one addition is a count of
--    admin_reads rows for an actor and a projection, for SPEC arm 2, because the log itself is
--    readable by no client role (1178) and a count names no row.
-- ---------------------------------------------------------------------------------------------------

create function private.admin_reads_count(p_actor uuid, p_projection text)
returns integer
language sql
stable
security definer
set search_path to ''
as $$
  select count(*)::integer
  from public.admin_reads r
  where r.actor = p_actor and r.projection = p_projection;
$$;

revoke all on function private.admin_reads_count(uuid, text) from public;
grant execute on function private.admin_reads_count(uuid, text) to live_arms;

comment on function private.admin_reads_count(uuid, text) is
  'How many admin_reads rows an actor wrote for a projection (Brief 12 12B, ruling 382), for the live arms that prove every projection call logs exactly one. A count and never a row; executable by live_arms only.';
