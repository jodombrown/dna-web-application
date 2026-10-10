-- Handoff 58-12C2 Revision 2 (Session 60), the member app's recording: the data half (Brief 12, 12C
-- part 2). Rulings 1361, 1364, 1615, 1616 and 1619, under 466 (a change is a new file) and 225
-- (committed before it is applied).
--
-- What this file does, in order:
--
--   1. surface_event_kinds gains `anonymous` (1616): a kind marked anonymous is written with no member
--      id even when a session exists. `not null default false` reaches every row by design, which is
--      the 564 exemption, and no row is anonymous until the update below names three.
--   2. sign_in_failed, password_reset_requested and password_reset_completed become public and
--      anonymous (1361, 1616). A completed reset runs inside a recovery session, and without 1616 it
--      would record the member; the other fifteen rows are not touched.
--   3. public.record_event is replaced from its live body (md5(prosrc)
--      90fdbefe05978975080578e5c6fc0401, byte-identical to 20261002120000_b12c_recording_ledger.sql's
--      body, read through pg_get_functiondef at 17:05 UTC on 10 October 2026). One insertion: when
--      the kind is anonymous, v_member is set null after the 1298 check, so the row carries no member
--      and the rate limit keys on the session. Every other line is byte for byte.
--   4. public.admin_overview_levers is replaced from its live body (md5(prosrc)
--      22274b5b80ea5451246742e25f417ae1, byte-identical to 20261002140000_b12b_overview.sql's body,
--      read the same way). Its onboarding block is rewritten (1615): completed exactly as before;
--      started as value, comparison and series over members.created_at, status connected; drop_off as
--      status connected with by_step {who, where, relationship}, each the members created in the
--      current window who are on that step now, read as public.onboarding_state() reads it. Every
--      line outside the onboarding block is byte for byte.
--
-- No new table, so no admin_catalogue row (1299). No signature change and no grant change: create or
-- replace keeps each function's grants (record_event to anon and authenticated; levers to
-- authenticated). The three kinds' member-facing copy does not change.
--
-- Applied by Chat through execute_sql (963) after this commit and before the enforcing run, guarded on
-- the two live md5s above, with its supabase_migrations.schema_migrations row in the same transaction.

-- ---------------------------------------------------------------------------------------------------
-- 1. The column (1616).
-- ---------------------------------------------------------------------------------------------------

alter table public.surface_event_kinds add column anonymous boolean not null default false;

comment on column public.surface_event_kinds.anonymous is
  'True for a kind that is written with no member id even when a session exists (1616): record_event sets the member null after the 1298 check, and the rate limit keys on the session. The three access kinds of 1361 are anonymous because a completed reset runs inside a recovery session.';

comment on table public.surface_event_kinds is
  'The kinds of behaviour the log may record, each with the prop keys it allows, whether it is recordable while signed out (1298, choice 5 of the tracking plan), whether it is written without a member id even when a session exists (anonymous, 1616) and what it feeds (Brief 12 12C, tracking plan). A kind is added by row, never by code, and public.record_event refuses a kind not here. Personas (1116): member, Space lead, event host and admin read it through one select-all policy as signed-in callers; none of them writes it; signed out reads nothing, because record_event reads it as a definer; service role holds all.';

-- ---------------------------------------------------------------------------------------------------
-- 2. The three access kinds (1361, 1616).
-- ---------------------------------------------------------------------------------------------------

update public.surface_event_kinds
set public = true, anonymous = true
where kind in ('sign_in_failed', 'password_reset_requested', 'password_reset_completed');

-- ---------------------------------------------------------------------------------------------------
-- 3. The writer (1616), from its live body.
-- ---------------------------------------------------------------------------------------------------

create or replace function public.record_event(
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
  -- An anonymous kind writes no member id even when a session exists (1616), and with v_member null
  -- the rate limit below keys on the session.
  if k.anonymous then
    v_member := null;
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

comment on function public.record_event(text, text, uuid, text, text, public.anchor_kind, uuid, jsonb, text) is
  'The one writer of surface_events (Brief 12 12C, rulings 1179, 1297, 1298, 1616). Refuses with 22023 an unknown kind, a prop key the kind does not allow, a signed-out call for a kind that is not public, a member as the object, an unknown app or viewport, and a missing session or surface. Stamps auth.uid() and the server''s time, never a member id or a time from the caller, and stamps no member at all for a kind marked anonymous (1616); the C is the kind''s area when that is a C and system otherwise. Rate-limited to 600 an hour per member, or per session while signed out or for an anonymous kind, through private.rate_limit; returns nothing and never reveals whether a row was written.';

-- ---------------------------------------------------------------------------------------------------
-- 4. The Onboarding lever (1615), from its live body.
-- ---------------------------------------------------------------------------------------------------

create or replace function public.admin_overview_levers(p_grain text, p_compare text, p_tz text)
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

  -- Onboarding (1364, 1615): Completed from members.onboarded_at, exactly as before; Started from
  -- members.created_at in the same shape; and the drop-off line from the members created in the
  -- period who have not finished, by the step they are on, read as public.onboarding_state() reads it
  -- (who while who_completed_at is null, where while current_place is null, relationship while
  -- onboarded_at is null). Product facts in members, never the behaviour log (1179).
  with started as (
    select m.id,
      case
        when m.who_completed_at is null then 'who'
        when m.current_place is null then 'where'
        when m.onboarded_at is null then 'relationship'
        else null end as step
    from public.members m
    where m.created_at >= w.cur_start and m.created_at < w.cur_end
  )
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
    'started', jsonb_build_object(
      'status', 'connected',
      'value', (select count(*) from started),
      'comparison', case when w.has_comparison then
        (select count(*) from public.members m
          where m.created_at >= w.cmp_start and m.created_at < w.cmp_end) else null end,
      'series', (select coalesce(jsonb_agg(jsonb_build_object(
          'start', b.b_start,
          'value', (select count(*) from public.members m
                    where m.created_at >= b.b_start and m.created_at < b.b_end))
          order by b.b_start), '[]'::jsonb)
        from private.overview_buckets(w) b)),
    'drop_off', jsonb_build_object(
      'status', 'connected',
      'by_step', jsonb_build_object(
        'who', (select count(*) from started s where s.step = 'who'),
        'where', (select count(*) from started s where s.step = 'where'),
        'relationship', (select count(*) from started s where s.step = 'relationship')))
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

comment on function public.admin_overview_levers(text, text, text) is
  'The nine levers (Brief 12 12B, SPEC Part B, rulings 1362 to 1365, 1615): invites null and not_connected (1363); onboarding Completed from members.onboarded_at, Started from members.created_at, and the drop-off line as the members created in the period who have not finished, by the step onboarding_state() would name (1364, 1615); time to first act as the median days from onboarding to the first ledger act over members onboarded in the period (1365); introductions sent, accepted and the median time to answer; RSVP going; events held and filled; attestations by context; posts by C; story-led acts null and not_connected. Gate, log and zone as admin_overview_window. Aggregates only (1281).';
