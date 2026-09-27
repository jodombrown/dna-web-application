-- Convene Discovery, first Discovery handoff (Session 34), file 1 of 4: the Browse and Filling up lanes
-- join public.convene_lanes at their places in the base order, with their floors. Rulings 1124 (reversing
-- 1089 and 1090), 1131, 1133, 632 and 1105. Runs after 20260924140000. Committed before it is applied
-- (ruling 225). Applied to the canonical project by Chat through the Supabase MCP's execute_sql under
-- rulings 963 and 965, with its supabase_migrations.schema_migrations row in the same transaction, and
-- never by apply_migration (rulings 553, 269).
--
-- The lane ids are structural (194, 1041, 1105): each is a branch in the projection, so the table's check
-- names them. The check is replaced to admit 'browse' and 'filling'; nothing else about it changes.
--
-- Base order after this file (B9-SPEC Revision 6, Lanes): soon 0, weekend 1, online 2, browse 3,
-- filling 4, fresh 5, curated 6, follow 7, taste 8, near 9, network 10. position is unique and not
-- deferrable, so the six lanes that move go past the range first and then to their places, and the two
-- new rows are inserted after both steps. discovery_dismissals and private.convene_thresholds reference
-- the lane id, not its position, so neither is touched by the move.
--
-- Floors (632): browse 1, counted in tiles; filling 2, counted in events. Internal, never shown.

alter table public.convene_lanes drop constraint convene_lanes_lane_check;
alter table public.convene_lanes
  add constraint convene_lanes_lane_check check (lane in (
    'soon', 'weekend', 'online', 'browse', 'filling', 'fresh', 'curated', 'follow', 'taste', 'near', 'network'
  ));

update public.convene_lanes
set position = position + 100
where lane in ('fresh', 'curated', 'follow', 'taste', 'near', 'network');

update public.convene_lanes
set position = case lane
  when 'fresh' then 5
  when 'curated' then 6
  when 'follow' then 7
  when 'taste' then 8
  when 'near' then 9
  when 'network' then 10
end
where lane in ('fresh', 'curated', 'follow', 'taste', 'near', 'network');

insert into public.convene_lanes (lane, name, position) values
  ('browse', 'Browse', 3),
  ('filling', 'Filling up', 4);

comment on table public.convene_lanes is
  'Discovery''s eleven lanes in their base order (1092 as amended by 1124; 1105). Floors are private.convene_thresholds (632); dismissals are per lane (581); a member''s recent acts reorder the lanes for that member only (1124, 1160). Served by vocabularies() as convene_lanes.';

insert into private.convene_thresholds (section, floor) values
  ('browse', 1), ('filling', 2)
on conflict (section) do update set floor = excluded.floor, updated_at = now();
