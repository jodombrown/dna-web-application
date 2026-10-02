-- Brief 14 Messenger, handoff 41-A, file 2 of 9: the four Messenger vocabularies, as tables read at
-- runtime through public.vocabularies() (the fixed-vocabulary absolute; rulings 1331, 1348, 1349,
-- 1370). Seeded as Extraction 41-14 rendered them. Every existing key of vocabularies() is carried
-- unchanged; four keys are added.
--
-- Committed before it is applied (ruling 225). Applied by Chat through execute_sql (963, 965), never
-- by apply_migration (553, 269).
--
-- Personas (1116): every signed-in member reads each vocabulary; Space lead, event host and admin read
-- it the same way, as members; service role holds all for migrations. No client role inserts, updates
-- or deletes a vocabulary row.

-- ---------------------------------------------------------------------------------------------------
-- 1. public.thread_kinds (1331): the seven kinds, five surfaced in v1 and two present in schema only.
-- ---------------------------------------------------------------------------------------------------
create table public.thread_kinds (
  value text primary key,
  label text not null,
  position smallint not null unique,
  surfaced boolean not null
);
alter table public.thread_kinds enable row level security;
revoke all on table public.thread_kinds from public, anon, authenticated;
grant select on table public.thread_kinds to authenticated;
grant all on table public.thread_kinds to service_role;
create policy thread_kinds_member_select on public.thread_kinds
  for select to authenticated using (true);
create policy thread_kinds_service_role on public.thread_kinds
  for all to service_role using (true) with check (true);
comment on table public.thread_kinds is
  'The kinds of thread Messenger holds (Brief 14, ruling 1331), served by vocabularies() as thread_kinds. surfaced false marks respond and introduction, present in schema and policy only in v1. Personas (1116): member, Space lead, event host and admin read it; service role writes it; anon is deliberately absent because Messenger is members-only.';

insert into public.thread_kinds (value, label, position, surfaced) values
  ('one_to_one', 'Direct message', 1, true),
  ('community_group', 'Community group', 2, true),
  ('space_thread', 'Space thread', 3, true),
  ('space_topic', 'Space topic', 4, true),
  ('event_thread', 'Event thread', 5, true),
  ('respond', 'Respond', 6, false),
  ('introduction', 'Introduction', 7, false);

-- ---------------------------------------------------------------------------------------------------
-- 2. public.message_mute_durations (1348): eight hours, one week, always (null duration).
-- ---------------------------------------------------------------------------------------------------
create table public.message_mute_durations (
  value text primary key,
  label text not null,
  position smallint not null unique,
  duration interval
);
alter table public.message_mute_durations enable row level security;
revoke all on table public.message_mute_durations from public, anon, authenticated;
grant select on table public.message_mute_durations to authenticated;
grant all on table public.message_mute_durations to service_role;
create policy message_mute_durations_member_select on public.message_mute_durations
  for select to authenticated using (true);
create policy message_mute_durations_service_role on public.message_mute_durations
  for all to service_role using (true) with check (true);
comment on table public.message_mute_durations is
  'The mute durations a thread offers (Brief 14, ruling 1348), served by vocabularies() as message_mute_durations; duration null is always, which private.thread_mute stores as infinity. Personas (1116): member, Space lead, event host and admin read it; service role writes it; anon deliberately absent.';

insert into public.message_mute_durations (value, label, position, duration) values
  ('eight_hours', '8 hours', 1, interval '8 hours'),
  ('one_week', '1 week', 2, interval '1 week'),
  ('always', 'Always', 3, null);

-- ---------------------------------------------------------------------------------------------------
-- 3. public.message_report_reasons (1349), as ratified in Extraction 41-14.
-- ---------------------------------------------------------------------------------------------------
create table public.message_report_reasons (
  value text primary key,
  label text not null,
  position smallint not null unique
);
alter table public.message_report_reasons enable row level security;
revoke all on table public.message_report_reasons from public, anon, authenticated;
grant select on table public.message_report_reasons to authenticated;
grant all on table public.message_report_reasons to service_role;
create policy message_report_reasons_member_select on public.message_report_reasons
  for select to authenticated using (true);
create policy message_report_reasons_service_role on public.message_report_reasons
  for all to service_role using (true) with check (true);
comment on table public.message_report_reasons is
  'The reasons a member may report a message under (Brief 14, ruling 1349; Extraction 41-14), served by vocabularies() as message_report_reasons. Personas (1116): member, Space lead, event host and admin read it; service role writes it; anon deliberately absent.';

insert into public.message_report_reasons (value, label, position) values
  ('harassment', 'Harassment', 1),
  ('spam_or_scam', 'Spam or a scam', 2),
  ('hate_or_threat', 'Hate or a threat', 3),
  ('sexual_content', 'Sexual content', 4),
  ('impersonation', 'Impersonation', 5),
  ('other', 'Something else', 6);

-- ---------------------------------------------------------------------------------------------------
-- 4. public.message_reaction_kinds (1370): reactions are words, never glyphs.
-- ---------------------------------------------------------------------------------------------------
create table public.message_reaction_kinds (
  value text primary key,
  label text not null,
  position smallint not null unique
);
alter table public.message_reaction_kinds enable row level security;
revoke all on table public.message_reaction_kinds from public, anon, authenticated;
grant select on table public.message_reaction_kinds to authenticated;
grant all on table public.message_reaction_kinds to service_role;
create policy message_reaction_kinds_member_select on public.message_reaction_kinds
  for select to authenticated using (true);
create policy message_reaction_kinds_service_role on public.message_reaction_kinds
  for all to service_role using (true) with check (true);
comment on table public.message_reaction_kinds is
  'The five reactions a message takes (Brief 14, ruling 1370), words and never glyphs, served by vocabularies() as message_reaction_kinds. Personas (1116): member, Space lead, event host and admin read it; service role writes it; anon deliberately absent.';

insert into public.message_reaction_kinds (value, label, position) values
  ('agree', 'Agree', 1),
  ('thanks', 'Thanks', 2),
  ('noted', 'Noted', 3),
  ('well_done', 'Well done', 4),
  ('sorry_to_hear', 'Sorry to hear', 5);

-- ---------------------------------------------------------------------------------------------------
-- 5. The catalogue (1299): every table in public arrives with its own real row.
-- ---------------------------------------------------------------------------------------------------
insert into public.admin_catalogue (schema_name, table_name, admin_treatment, admin_reason, dia_treatment, dia_reason) values
  ('public', 'thread_kinds', 'operated',
   'A vocabulary a console edits by row; served to signed-in callers through vocabularies().',
   'excluded', 'A vocabulary, not member data.'),
  ('public', 'message_mute_durations', 'operated',
   'A vocabulary a console edits by row; served to signed-in callers through vocabularies().',
   'excluded', 'A vocabulary, not member data.'),
  ('public', 'message_report_reasons', 'operated',
   'A vocabulary a console edits by row; served to signed-in callers through vocabularies().',
   'excluded', 'A vocabulary, not member data.'),
  ('public', 'message_reaction_kinds', 'operated',
   'A vocabulary a console edits by row; served to signed-in callers through vocabularies().',
   'excluded', 'A vocabulary, not member data.');

-- ---------------------------------------------------------------------------------------------------
-- 6. vocabularies(): the 20261001120000 body with four keys added and nothing else touched.
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
                               from public.message_reaction_kinds r)
  );
$$;
