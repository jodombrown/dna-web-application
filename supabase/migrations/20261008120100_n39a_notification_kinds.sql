-- Handoff 55-A (39-A), File B: the notification kind vocabulary (ruling 1318) and the row's new
-- columns (1317, 1322, 1325), and private.can_see_anchor extended to the two anchor values File A
-- adds (1319). Closes N4 (the client's hardcoded kind array) at the database side and N1's kind half.
--
--   public.notification_kinds   one row per kind: its C, or the marker that the C comes from the
--                               object's context (1325); the destination in words (490), copied for
--                               attestation_received, space_role_approved and event_reminder from
--                               docs/GAPS.md G19 where 547 recorded them; whether it renders; whether
--                               it groups and inside what window (1317); its email default and copy.
--                               Under 1520 every row is email off, not transactional, and carries no
--                               email subject or line, so no kind enqueues mail.
--   public.notifications        kind becomes text referencing the vocabulary; the generated
--                               c_category becomes a plain column written by private.notify (1319),
--                               backfilled from each row's kind; seen_at (1322), group_key and
--                               grouped_actor_ids (1317), updated_at. public.notification_kind is
--                               dropped once nothing depends on it.
--   public.vocabularies()       gains notification_kinds; every other key is unchanged.
--
-- reply, mention (1316, 1399) and account_security (N13) have no row: their rulings or copy are not
-- made. Held, not omitted.
--
-- pg_depend on public.notification_kind, read on the canonical project before this file was written
-- (Session 55): the implicit array type notification_kind[], the column public.notifications.kind,
-- and the default expression of public.notifications attnum 4, which is the generated c_category's
-- CASE. The two notifications dependents go with the column changes below; the array type goes with
-- the type. Nothing else names it: the four function bodies that wrote notifications (b2 trigger
-- notify_connection_accepted, invite_event_party, respond_to_event_role, remove_event_party) use text
-- literals, and File D replaces each of them.
--
-- Rows existing at the read: 16, every one connection_accepted. The backfill is by join, and the file
-- raises rather than guessing if any row's kind has no vocabulary row.
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963).

-- ---------------------------------------------------------------------------------------------------
-- 1. The vocabulary (1318).
-- ---------------------------------------------------------------------------------------------------

create table public.notification_kinds (
  kind text primary key,
  c public.c_category,
  c_from_object boolean not null default false,
  destination text,
  renders boolean not null default false,
  transactional boolean not null default false,
  groups boolean not null default false,
  group_window interval,
  email_default text not null default 'off',
  email_subject text,
  email_line text,
  position integer not null unique,
  constraint notification_kinds_c_check check ((c is not null) <> c_from_object),
  constraint notification_kinds_renders_check check (not renders or destination is not null),
  constraint notification_kinds_group_check check (not groups or group_window is not null),
  constraint notification_kinds_email_default_check
    check (email_default in ('off', 'immediate', 'digest'))
);

alter table public.notification_kinds enable row level security;

revoke all on table public.notification_kinds from public, anon, authenticated;
grant select on table public.notification_kinds to authenticated;
grant all on table public.notification_kinds to service_role;

create policy notification_kinds_member_select on public.notification_kinds
  for select to authenticated using (true);

create policy notification_kinds_service_role on public.notification_kinds
  for all to service_role using (true) with check (true);

comment on table public.notification_kinds is
  'The notification kind vocabulary (handoff 55-A, ruling 1318), served by vocabularies() as notification_kinds. c is the engine whose glyph marks the row; c_from_object marks a kind whose C is the object''s context (1325), resolved by private.notification_c_for, and exactly one of the two holds. destination is the line a row names before the tap (490); a kind renders only with one. groups and group_window fold repeat events into one unread row (1317). email_default, email_subject and email_line decide whether private.notify enqueues mail: a kind enqueues only when both copy columns are set, and under 1520 none is. Personas (1116): member, Space lead, event host and admin read it as authenticated, directly and through vocabularies(); service role writes it; anon is deliberately absent because no signed-out surface shows a notification.';

insert into public.notification_kinds (kind, c, c_from_object, destination, renders, groups, position) values
  ('connection_request',   'connect',     false, 'Opens My Network, Requests', true,  false, 1),
  ('connection_accepted',  'connect',     false, 'Opens their profile',        true,  false, 2),
  ('role_invitation',      'convene',     false, 'Opens the event',            true,  false, 3),
  ('role_accepted',        'convene',     false, 'Opens the event',            false, false, 4),
  ('event_reminder',       'convene',     false, 'Opens the event',            false, false, 5),
  ('attestation_received', null,          true,  'Opens the contribution',     false, false, 6),
  ('space_role_approved',  'collaborate', false, 'Opens the Space',            false, false, 7),
  ('message_request',      'connect',     false, null,                         false, false, 8),
  ('thread_invitation',    null,          true,  null,                         false, false, 9);

-- ---------------------------------------------------------------------------------------------------
-- 2. public.notifications: kind as text against the vocabulary, c_category as a written column.
--    The generated column depends on kind's enum type, so it goes first; it comes back as a plain
--    column added bare, backfilled, then made not null (564).
-- ---------------------------------------------------------------------------------------------------

alter table public.notifications drop column c_category;

alter table public.notifications alter column kind type text using kind::text;

do $$
declare
  v_orphans text;
begin
  select string_agg(distinct n.kind, ', ')
  into v_orphans
  from public.notifications n
  where not exists (select 1 from public.notification_kinds k where k.kind = n.kind);
  if v_orphans is not null then
    raise exception 'notifications: rows whose kind has no notification_kinds row: %', v_orphans;
  end if;
end;
$$;

alter table public.notifications
  add constraint notifications_kind_fkey foreign key (kind) references public.notification_kinds (kind);

alter table public.notifications add column c_category public.c_category;

update public.notifications n
set c_category = k.c
from public.notification_kinds k
where k.kind = n.kind;

alter table public.notifications alter column c_category set not null;

-- 1322: seen is the bell's dot, read is the row's weight. A row already read was seen when it was
-- read; an unread row stays unseen, so the dot reads as it did before this file.
alter table public.notifications add column seen_at timestamptz;

update public.notifications set seen_at = read_at where read_at is not null;

-- 1317: the key that folds repeat events into one unread row, and the actors folded into it.
alter table public.notifications add column group_key text;

alter table public.notifications add column grouped_actor_ids uuid[] not null default '{}';

-- updated_at reads created_at on the rows that exist, not the moment of this apply.
alter table public.notifications add column updated_at timestamptz;

update public.notifications set updated_at = created_at;

alter table public.notifications alter column updated_at set default now();

alter table public.notifications alter column updated_at set not null;

drop type public.notification_kind;

create index notifications_unseen_idx on public.notifications (recipient_member_id)
  where seen_at is null;

create index notifications_group_idx on public.notifications (recipient_member_id, kind, group_key)
  where read_at is null and group_key is not null;

comment on column public.notifications.kind is
  'A public.notification_kinds row (1318). Written only by private.notify (1319).';
comment on column public.notifications.c_category is
  'The row''s C, resolved by private.notify from the kind''s row or, for a c_from_object kind, from the object''s context (1325). Never computed by a client.';
comment on column public.notifications.seen_at is
  'When the recipient opened the panel with this row in it (1322); the bell''s dot is an unseen row of a kind that renders. Written by notifications_mark_seen and private.notification_settle, never by a client update.';
comment on column public.notifications.group_key is
  'The key under which a grouping kind folds repeat events into one unread row (1317); null for a kind that does not group.';
comment on column public.notifications.grouped_actor_ids is
  'The actors folded into this row after its first actor, each once (1317).';
comment on column public.notifications.updated_at is
  'The last time an event folded into this row (1317), or its creation.';

-- ---------------------------------------------------------------------------------------------------
-- 3. private.can_see_anchor gains the two values File A adds (1319). The enum is compared as text, so
--    this SQL body names neither new value as an enum literal in the transaction that added it.
--    Every other branch is the live definition, read through pg_get_functiondef in Session 55.
-- ---------------------------------------------------------------------------------------------------

create or replace function private.can_see_anchor(p_kind public.anchor_kind, p_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select case p_kind::text
    when 'member' then p_id = auth.uid() or private.is_connected(auth.uid(), p_id)
    when 'space' then private.is_space_member(p_id)
    when 'event' then private.is_event_host(p_id) or exists (
      select 1 from public.events e
      where e.id = p_id and e.space_id is not null and private.is_space_member(e.space_id))
    when 'opportunity' then exists (
      select 1 from public.opportunities o
      where o.id = p_id and (o.receiver_member_id = auth.uid()
        or (o.space_id is not null and private.is_space_member(o.space_id))))
    when 'connection_request' then exists (
      select 1 from public.connection_requests c
      where c.id = p_id and (c.from_member_id = auth.uid() or c.to_member_id = auth.uid()))
    when 'story' then exists (
      select 1 from public.stories s where s.id = p_id and s.author_member_id = auth.uid())
    -- 1319: a thread is visible to its active and invited members.
    when 'thread' then private.thread_member_in(
      p_id, auth.uid(), array['active', 'invited']::public.thread_member_state[])
    -- 1319: a message request is visible to its sender and its recipient.
    when 'message_request' then exists (
      select 1 from public.message_requests r
      where r.id = p_id and (r.sender_id = auth.uid() or r.recipient_id = auth.uid()))
    else false
  end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- 4. vocabularies() gains notification_kinds (1318). Every other key is the live definition byte for
--    byte (20261003120000).
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
                        from public.reporting_zones z),
    -- Handoff 55-A (1318, 1325): the notification kinds, each with its C or the marker that the C
    -- comes from the object's context, the destination in words (490) and whether it renders.
    'notification_kinds', (select coalesce(jsonb_agg(jsonb_build_object(
                                    'value', k.kind, 'c', k.c, 'c_from_object', k.c_from_object,
                                    'destination', k.destination, 'renders', k.renders)
                                    order by k.position), '[]'::jsonb)
                           from public.notification_kinds k)
  );
$$;

-- ---------------------------------------------------------------------------------------------------
-- 5. The catalogue (1299, 1300). The new table with its row; notifications moves from unreviewed to
--    a stated treatment.
-- ---------------------------------------------------------------------------------------------------

insert into public.admin_catalogue (schema_name, table_name, admin_treatment, admin_reason, dia_treatment, dia_reason) values
  ('public', 'notification_kinds', 'operated',
   'A vocabulary a console edits by row; served through vocabularies() and read by private.notify for each kind''s C, grouping and email rule (handoff 55-A, 1318).',
   'excluded', 'A vocabulary, not member data; DIA treatment for notifications is unruled (1300).');

update public.admin_catalogue
set admin_treatment = 'exempt',
    admin_reason = 'Each member''s own notification rows, read by the recipient alone under row policy and written only by private.notify and its siblings (1319, 1323); no console reads or edits them. The delivery-health projection over the outbox is held for Brief 12''s next revision (handoff 55-A, 1299).',
    dia_treatment = 'excluded',
    dia_reason = 'DIA treatment for notifications is unruled (1300).',
    recorded_at = now()
where schema_name = 'public' and table_name = 'notifications';
