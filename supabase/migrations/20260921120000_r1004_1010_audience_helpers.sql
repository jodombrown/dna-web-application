-- Rulings 1010 and 1004: one audience helper, and the convene default becomes connections.
-- Committed before it is applied (ruling 225). Applied to the canonical project by Chat through the
-- Supabase MCP's execute_sql under rulings 963 and 965, with its supabase_migrations.schema_migrations
-- row in the same transaction, and never by apply_migration (rulings 553, 269). Runs before
-- 20260921120100, which reads private.admit_audience.
--
-- 1010. Ruling 680's per-event RSVP override needs admission by an explicit audience value, and
-- private.admit_section only takes a section. Its signed-in branch moves into
-- private.admit_audience(member, audience, viewer) and admit_section calls it, so the audience
-- semantics live in one function: everyone admits; connections admits through is_connected;
-- anchored admits through shares_anchor; a private profile refuses everyone but its owner.
--
-- admit_section is reached by thirteen row policies, through can_see_section, and five functions
-- (profile_view, connect_card, connect_cards, connect_where and is_visible_stance_variant), so the
-- change is proved rather than asserted. The previous definition is kept under a temporary name, both are asked every
-- member x profile_section x viewer question (every member, and signed out), and this file raises if
-- a single answer differs. The proof runs before 1004's change, which alters 'convene' on purpose.
--
-- Latest prior definitions: private.admit_section and private.section_audience in
-- 20260908071744_b3_profile_rls.sql, read on the live project in Session 29. admit_section's body is
-- carried unchanged except its signed-in branch, which now calls admit_audience instead of spelling
-- out the case. admit_audience refuses a null viewer, which admit_section never passes it.
--
-- 1004. A member with no member_visibility row for 'convene' resolves to 'connections', as 'links'
-- already does, rather than 'everyone'. Ruling 1003 made that row the per-member RSVP default, and
-- 680 locks the default as connections. Every caller of section_audience with 'convene' was read on
-- the live project before this file was written: profile_view's Convene section and its owner
-- settings block, and attestations_viewer_select through each row's category. The first two narrow
-- for members who never set the section, which 1004 accepted. The third does not narrow in practice,
-- because that policy also admits through the badges section (ruling 1013).

create function private.admit_audience(p_member uuid, p_audience public.audience, p_viewer uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select case
    when p_viewer is null then false
    when p_viewer = p_member then true
    when exists (select 1 from public.members m where m.id = p_member and m.profile_private) then false
    else
      case p_audience
        when 'everyone' then true
        when 'connections' then private.is_connected(p_viewer, p_member)
        when 'anchored' then private.shares_anchor(p_viewer, p_member)
        else false
      end
  end;
$$;

revoke execute on function private.admit_audience(uuid, public.audience, uuid) from public, anon, authenticated;

alter function private.admit_section(uuid, public.profile_section, uuid) rename to admit_section_pre_1010;

create function private.admit_section(p_member uuid, p_section public.profile_section, p_viewer uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select case
    when p_viewer is not null and p_viewer = p_member then true
    when exists (select 1 from public.members m where m.id = p_member and m.profile_private) then false
    when p_viewer is null then
      exists (select 1 from public.members m where m.id = p_member and m.profile_shared)
      and private.section_audience(p_member, p_section) = 'everyone'
    else
      private.admit_audience(p_member, private.section_audience(p_member, p_section), p_viewer)
  end;
$$;

revoke execute on function private.admit_section(uuid, public.profile_section, uuid) from public, anon, authenticated;

do $$
declare
  v_diff bigint;
begin
  select count(*) into v_diff
  from public.members m
  cross join unnest(enum_range(null::public.profile_section)) as s(section)
  cross join (select v.id from public.members v union all select null::uuid) as w(viewer)
  where private.admit_section(m.id, s.section, w.viewer)
    is distinct from private.admit_section_pre_1010(m.id, s.section, w.viewer);
  if v_diff > 0 then
    raise exception 'Ruling 1010: admit_section would answer % member, section and viewer questions differently.', v_diff
      using errcode = 'P0001';
  end if;
end;
$$;

drop function private.admit_section_pre_1010(uuid, public.profile_section, uuid);

create or replace function private.section_audience(p_member uuid, p_section public.profile_section)
returns public.audience
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(
    (select v.audience from public.member_visibility v where v.member_id = p_member and v.section = p_section),
    case when p_section in ('links', 'convene') then 'connections'::public.audience else 'everyone'::public.audience end
  );
$$;
