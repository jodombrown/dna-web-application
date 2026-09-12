-- ---------------------------------------------------------------------------
-- Rulings 193 and 194: one vocabulary path, served at runtime, with nothing behind it.
--
-- CLAUDE.md's absolute is that fixed vocabularies are database tables read at runtime, never
-- hardcoded arrays in a component. Three merged surfaces still held one (docs/GAPS.md G4). Two of
-- them, the Composer's Contribute instrument and the Feed's labels for the same values, had no
-- runtime source to read: public.contribute_instrument reached no client projection at all, and
-- publish_post mapped the display strings back server-side, which is why nothing had broken yet.
--
-- Two changes here, both to function bodies. No table, column, policy, grant or row is touched.
--
--   1. public.profile_vocabularies() becomes public.vocabularies(). The projection is no longer
--      Profile's: the Composer (Brief 1) and the Feed (Brief 2) read it too. Ruling 193 says rename
--      the path rather than add a second one, so the old name is dropped, not left as an alias. A
--      second name is a second path by another route.
--   2. It gains 'instrument', through the same enum_range mechanism that already serves
--      heritage_kind, return_pathway and return_timeline.
--
-- Why 'instrument' is [{value, label}] where the other three enums are bare strings: those three
-- enums carry their own display text as their labels ('Already back'), so value and label are the
-- same string. contribute_instrument's values are machine values ('in_kind'), so the surface needs
-- both. The label is derived from the value by one rule, here, rather than listed: hyphenate the
-- separator and capitalise the first letter, which is what the removed literals said in the two
-- components. A list would be the same anti-pattern moved into SQL.
-- ---------------------------------------------------------------------------

create or replace function public.vocabularies()
returns jsonb
language sql
stable
security invoker
set search_path = ''
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
    -- Ruling 187: the segment labels come from the table, here as everywhere else.
    'segments', (select coalesce(jsonb_agg(jsonb_build_object('value', s.segment, 'label', s.label)
                                           order by s.position), '[]'::jsonb)
                 from public.member_segments s),
    'heritage', (select jsonb_agg(x) from unnest(enum_range(null::public.heritage_kind)) x),
    'pathway', (select jsonb_agg(x) from unnest(enum_range(null::public.return_pathway)) x),
    'timeline', (select jsonb_agg(x) from unnest(enum_range(null::public.return_timeline)) x),
    -- Ruling 193: the Contribute instrument, in enum order, with its label derived from its value.
    'instrument', (select coalesce(jsonb_agg(jsonb_build_object(
                            'value', x,
                            'label', upper(left(replace(x::text, '_', '-'), 1))
                                     || substr(replace(x::text, '_', '-'), 2)) order by x), '[]'::jsonb)
                   from unnest(enum_range(null::public.contribute_instrument)) x)
  );
$$;

revoke execute on function public.vocabularies() from public, anon;
grant execute on function public.vocabularies() to authenticated, service_role;

-- The old name goes with the same change that replaces it (ruling 193: one path, not two).
drop function if exists public.profile_vocabularies();
