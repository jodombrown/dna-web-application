-- Brief 14 Messenger, handoff 56-41E, item 1.3 (rulings 1398, 1577, 1403).
-- The five-word reaction vocabulary is retired. public.vocabularies() replaces the
-- message_reaction_kinds key with message_reaction_quick, the eight quick glyphs from
-- message_reaction_emoji ordered by quick_position as { value, label }; then
-- message_reaction_kinds and its catalogue row go. Nothing reads the table by now: message_reactions
-- dropped its foreign key in 20261008150100, message_react reads message_reaction_emoji, and the
-- messages projection groups by the emoji string since 20261008150600. Every other line of
-- vocabularies() is the body read live at 2d81408.
--
-- This file carries a drop table and a delete, which the execute_sql guard refuses (1528): it
-- reaches the project by the founder's SQL Editor paste of these bytes, recording this version in
-- the same transaction. Committed before it is applied (225). It is the last of the eight and is
-- applied after 20261008150600.

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
    -- Brief 14, 41-E (1403, 1577): the quick bar's eight emoji in 1403's order, the character and
    -- its glyph name. The full set is message_reaction_emoji; the picker reads emojibase's own
    -- file from the app's origin and never this projection.
    'message_reaction_quick', (select coalesce(jsonb_agg(jsonb_build_object('value', e.emoji, 'label', e.label)
                                                          order by e.quick_position), '[]'::jsonb)
                               from public.message_reaction_emoji e
                               where e.quick_position is not null),
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

drop table public.message_reaction_kinds;

delete from public.admin_catalogue
where schema_name = 'public' and table_name = 'message_reaction_kinds';
