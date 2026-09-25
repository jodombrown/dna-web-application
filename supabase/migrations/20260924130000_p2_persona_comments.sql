-- Convene Discovery rebuild (handoff 32-B), file 4: the four new tables name every persona (ruling 1116, on
-- CLAUDE.md's every-persona RLS absolute). Comments only; no grant, policy or row changes. Runs after
-- 20260924100000, 20260924110000 and 20260924120000. Committed before it is applied (ruling 225). Applied to
-- the canonical project by Chat through the Supabase MCP's execute_sql under rulings 963 and 965, with its
-- supabase_migrations.schema_migrations row in the same transaction, and never by apply_migration (rulings
-- 553, 269).
--
-- Each comment keeps its table's first sentence and adds the personas: who reads, who writes, and each
-- persona that is deliberately absent with the reason (1116).

comment on table public.convene_lanes is
  'Discovery''s nine lanes in 1092''s one fixed order (1105). Floors are private.convene_thresholds (632); dismissals are per lane (581). Served by vocabularies() as convene_lanes. Personas (1116): member, Space lead, event host and admin read it as members do, through their authenticated select; none of them writes it, because the lane set changes only by migration; service role holds all.';

comment on table public.event_aliases is
  'Every alias an event has held (1080, 1100). An alias stays with its first event forever and redirects to it; one row per event is current. Written only by the events triggers. Personas (1116): member, event host, Space lead and admin are deliberately absent, because an alias is set through events.custom_slug under the events policies and triggers and read through resolve_event_link and event_alias_check, so no persona needs the table itself; service role holds all.';

comment on table public.reserved_link_words is
  'Words an event alias may not take (1080, 1108). Seeded from src/routes and five system words; added by row, never by code. Personas (1116): member, event host, Space lead and admin are deliberately absent, because the words are read only inside private.event_alias_problem and added by the service role; service role holds all.';

comment on table public.member_rail_state is
  'Whether a member left a surface''s rail collapsed at a width band (1082, 1094, 1111). No row means collapsed. Personas (1116): the member reads and writes their own rows only; Space lead, event host and admin are deliberately absent, because a member''s interface state is private and has no use to them; service role holds all.';
