-- ---------------------------------------------------------------------------
-- Brief 5, onboarding: the stance axis, and the three onboarding writes.
--
-- Committed before it is applied (ruling 225). One file, in the handoff's order: add the stance
-- enum and column with its default; copy segment to stance by name; verify the counts and that no
-- row is null; drop segment; add stance_declared_at, onboarded_at and username_changes; rename and
-- update the vocabulary table; replace every projection and write path that read segment so it
-- reads stance. Then the four onboarding functions.
--
-- What was measured on the canonical project before this was written (ruling 242): seven members;
-- two carry segment = returnee, five carry null; four label rows (Returnee, Anchor, Ally, Still
-- Exploring); two member_segment_details rows, both returnee. Nobody is kin, because kin did not
-- exist. The five nulls take the column default, exploring (ruling 247), and their
-- stance_declared_at stays null, which is the true value: the choice was never recorded
-- (ruling 297). No statement in this file writes stance_declared_at or onboarded_at.
--
-- Two things this file never does. stance_declared_at is set by no default, no migration and no
-- backfill; only by a member touching a card (onboard_relationship), or by that member changing
-- their stance later, which the trigger at the end records. onboarded_at is set once, by
-- onboard_relationship, and by nothing else.
--
-- Not in the handoff, decided here and reported: members.handle is the username. It already exists
-- from Brief 3 as the public address (/m/:handle), it is unique, and its check constraint keeps it
-- lowercase, so a second username column would be a second home for one axis, the shape ruling 187
-- names. The handoff's own rule for current_place (reuse, never a parallel column) is applied to it.
-- who_completed_at is added because name is NOT NULL from the sign-up trigger and so cannot mark
-- screen one; the handoff's "first null of name, current_place, onboarded_at" needs a marker for
-- the first screen that a prefilled name does not supply.
-- ---------------------------------------------------------------------------

-- 1. The enum and the column. Default exploring (ruling 247): a member always has a stance.
create type public.stance as enum ('returnee', 'kin', 'anchor', 'ally', 'exploring');
alter table public.members add column stance public.stance not null default 'exploring';

-- 2. Copy segment to stance by name. Every existing value has the same name in the new enum.
update public.members set stance = segment::text::public.stance where segment is not null;

-- 3. Verify before anything is dropped. Every named segment survives under the same name with the
-- same count, every row has a stance, and the only rows whose stance is not their former segment
-- are the ones that had none. The counts print as a notice so the apply log carries them.
do $$
declare
  v_members bigint;
  v_before jsonb;
  v_after jsonb;
  v_null_stance bigint;
  v_mismatch bigint;
  v_was_null bigint;
  r record;
begin
  select count(*) into v_members from public.members;
  select coalesce(jsonb_object_agg(x.k, x.n), '{}'::jsonb) into v_before
    from (select coalesce(m.segment::text, 'null') as k, count(*) as n from public.members m group by 1) x;
  select coalesce(jsonb_object_agg(x.k, x.n), '{}'::jsonb) into v_after
    from (select m.stance::text as k, count(*) as n from public.members m group by 1) x;
  select count(*) into v_null_stance from public.members where stance is null;
  select count(*) into v_was_null from public.members where segment is null;
  select count(*) into v_mismatch from public.members where segment is not null and segment::text <> stance::text;
  if v_null_stance > 0 then
    raise exception 'B5 stance copy: % rows have no stance', v_null_stance;
  end if;
  if v_mismatch > 0 then
    raise exception 'B5 stance copy: % rows where stance differs from segment by name', v_mismatch;
  end if;
  for r in select m.segment::text as k, count(*) as n from public.members m where m.segment is not null group by 1 loop
    if r.k = 'exploring' then
      if coalesce((v_after ->> r.k)::bigint, 0) <> r.n + v_was_null then
        raise exception 'B5 stance copy: exploring expected % (% named plus % default), found %',
          r.n + v_was_null, r.n, v_was_null, coalesce(v_after ->> r.k, '0');
      end if;
    elsif coalesce((v_after ->> r.k)::bigint, 0) <> r.n then
      raise exception 'B5 stance copy: % expected %, found %', r.k, r.n, coalesce(v_after ->> r.k, '0');
    end if;
  end loop;
  if (select coalesce(sum((v ->> 0)::bigint), 0) from jsonb_each(v_after) as e(k, v)) <> v_members then
    raise exception 'B5 stance copy: stance counts do not sum to the member count';
  end if;
  raise notice 'B5 stance copy verified: members=%, segment before=%, stance after=%, rows defaulted from null=%',
    v_members, v_before, v_after, v_was_null;
end $$;

-- 4. Drop the old column. Not left behind as a second axis (ruling 187).
alter table public.members drop column segment;

-- 5. The onboarding columns. All nullable and unset for every existing member: null is the true
-- value, nobody has onboarded. username_changes counts deliberate changes away from the derived
-- suggestion. No grant to anon or authenticated on any of them: they are read through
-- onboarding_state() and written by the SECURITY DEFINER paths below and nothing else.
alter table public.members
  add column stance_declared_at timestamptz,
  add column onboarded_at timestamptz,
  add column who_completed_at timestamptz,
  add column username_changes smallint not null default 0 check (username_changes >= 0);
comment on column public.members.stance_declared_at is 'Set when the member touches a stance card in onboarding (onboard_relationship) or changes stance later. Never by a default, migration or backfill.';
comment on column public.members.onboarded_at is 'Set once, by onboard_relationship, and by nothing else. Never cleared.';
comment on column public.members.who_completed_at is 'Screen one of onboarding was written (onboard_who). name is NOT NULL from the sign-up trigger and cannot mark it.';
comment on column public.members.username_changes is 'Deliberate username changes away from the derived suggestion. Accepting the suggestion leaves it at 0.';
-- save_profile_section is SECURITY INVOKER (Brief 3), so the owner's own update on the axis column
-- keeps the grant segment had. Nothing else on members changes.
grant update (stance) on table public.members to authenticated;

-- 6. The section key follows the axis. Row values in member_visibility follow the rename.
alter type public.profile_section rename value 'segment' to 'stance';

-- 7. The per-variant block (ruling 122) is keyed by the axis value, so its column, its type and its
-- policy predicate follow. The viewer policy depends on the column type, so it is dropped first and
-- recreated with the same predicate under the new names.
drop policy member_segment_details_viewer_select on public.member_segment_details;
drop function private.is_visible_segment_variant(uuid, public.member_segment);
alter table public.member_segment_details rename to member_stance_details;
alter table public.member_stance_details rename column segment to stance;
alter table public.member_stance_details alter column stance type public.stance using stance::text::public.stance;
alter table public.member_stance_details rename constraint member_segment_details_pkey to member_stance_details_pkey;
alter table public.member_stance_details rename constraint member_segment_details_member_id_fkey to member_stance_details_member_id_fkey;
alter table public.member_stance_details rename constraint member_segment_details_base_check to member_stance_details_base_check;
alter table public.member_stance_details rename constraint member_segment_details_needs_check to member_stance_details_needs_check;
alter table public.member_stance_details rename constraint member_segment_details_offer_check to member_stance_details_offer_check;
alter table public.member_stance_details rename constraint member_segment_details_support_check to member_stance_details_support_check;
alter policy member_segment_details_owner_insert on public.member_stance_details rename to member_stance_details_owner_insert;
alter policy member_segment_details_owner_update on public.member_stance_details rename to member_stance_details_owner_update;
alter policy member_segment_details_owner_delete on public.member_stance_details rename to member_stance_details_owner_delete;
alter policy member_segment_details_admin_select on public.member_stance_details rename to member_stance_details_admin_select;
alter policy member_segment_details_service_role on public.member_stance_details rename to member_stance_details_service_role;

create or replace function private.is_visible_stance_variant(p_member uuid, p_stance public.stance)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_member = auth.uid()
      or (private.can_see_section(p_member, 'stance')
          and exists (select 1 from public.members m where m.id = p_member and m.stance = p_stance));
$$;
revoke execute on function private.is_visible_stance_variant(uuid, public.stance) from public;
grant execute on function private.is_visible_stance_variant(uuid, public.stance) to anon, authenticated, service_role;

create policy member_stance_details_viewer_select on public.member_stance_details
for select to authenticated, anon
using (
  private.can_see_section(member_id, 'stance')
  and private.is_visible_stance_variant(member_id, stance)
);

-- 8. The vocabulary table (ruling 193): renamed, retyped, and its rows become the five stances in
-- ruling 300's order with ruling 300's names. The filter and the profile chooser read this table
-- and nothing else (ruling 187). Positions step through a gap because position is unique.
alter table public.member_segments rename to member_stances;
alter table public.member_stances rename column segment to stance;
alter table public.member_stances alter column stance type public.stance using stance::text::public.stance;
alter table public.member_stances rename constraint member_segments_pkey to member_stances_pkey;
alter table public.member_stances rename constraint member_segments_label_key to member_stances_label_key;
alter table public.member_stances rename constraint member_segments_position_key to member_stances_position_key;
alter policy member_segments_member_select on public.member_stances rename to member_stances_member_select;
alter policy member_segments_service_role on public.member_stances rename to member_stances_service_role;
update public.member_stances set position = position + 10;
update public.member_stances set position = 1, label = 'Returnee' where stance = 'returnee';
update public.member_stances set position = 3, label = 'Anchor' where stance = 'anchor';
update public.member_stances set position = 4, label = 'Ally' where stance = 'ally';
update public.member_stances set position = 5, label = 'Still exploring' where stance = 'exploring';
insert into public.member_stances (stance, label, position) values ('kin', 'Kin', 2);
do $$
begin
  if (select count(*) from public.member_stances) <> 5
     or (select string_agg(label, ',' order by position) from public.member_stances) <> 'Returnee,Kin,Anchor,Ally,Still exploring' then
    raise exception 'B5 member_stances: expected the five stances in ruling 300 order, found %',
      (select string_agg(label || '@' || position, ',' order by position) from public.member_stances);
  end if;
end $$;

-- 9. Nothing references the old type now.
drop type public.member_segment;

-- 10. A stance change after onboarding is a declaration too (the handoff: set when a member touches
-- a card in the onboarding session or changes stance later). Recorded here so every writer of the
-- axis inherits it rather than restating it, and so no grant on stance_declared_at is needed for
-- the invoker path. A no-op update does not fire it; onboard_relationship sets the timestamp itself
-- for the case where the member re-selects the default.
create or replace function private.stance_declared()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.stance is distinct from old.stance then
    new.stance_declared_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function private.stance_declared() from public, anon, authenticated;
drop trigger if exists members_stance_declared on public.members;
create trigger members_stance_declared
  before update of stance on public.members
  for each row execute function private.stance_declared();

-- ---------------------------------------------------------------------------
-- 11. Every projection and write path that read segment now reads stance. Each body below is the
-- live definition (matched to pg_proc by md5 before editing) with the axis renamed and nothing
-- else changed: profile_view, save_profile_section, connect_cards, private.connect_card,
-- connect_filter_options, vocabularies. connect_where never read the axis and is untouched.
-- Keys that change on the wire: profile_view.member.stance and .stance_label, sections.stance,
-- connect card stance_label, connect_filter_options.stances, vocabularies.stances, the
-- connect_cards filter key stance, and save_profile_section('stance', {stance, ...}).
-- ---------------------------------------------------------------------------

create or replace function public.profile_view(p_handle text default null, p_as_public boolean default false)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_viewer uuid;
  m public.members%rowtype;
  v_owner boolean;
  v_private boolean;
  v_first text;
  v_tier text;
  v_sections jsonb := '{}'::jsonb;
  v_seg_fields jsonb;
  v_variants jsonb;
  v_rel text := 'none';
  v_following boolean := false;
  v_mutuals jsonb := '[]'::jsonb;
  v_shared_spaces jsonb := '[]'::jsonb;
  v_anchored boolean := false;
  v_badges jsonb := '[]'::jsonb;
  v_dia text;
  v_vis jsonb;
  -- Ruling 187: the label for this member's stance, read from the one vocabulary table.
  v_stance_label text;
  -- Ruling 198 and B4A section 6. The two directions are separate facts and do separate work.
  -- v_blocked_by_me: the caller has blocked this member. It is the caller's own row, so it may be
  -- told to them (viewer_blocked), and it does not touch their audience scope.
  -- v_blocked_by_them: this member has blocked the caller. This is ruling 198's "blocked party",
  -- and the only case that drops a viewer to the anonymous rule.
  -- v_blocked: either direction, which is private.is_blocked. It governs discovery and contact,
  -- symmetric by ruling 198, so neither party gets a relationship object.
  v_blocked_by_me boolean := false;
  v_blocked_by_them boolean := false;
  v_blocked boolean := false;
  -- The viewer the audience rules see. It is v_viewer for everyone except a viewer this member has
  -- blocked, who is scoped to the anonymous rule: the lowest audience, the same rows a signed-out
  -- stranger gets.
  v_scope uuid;
  v_rows jsonb;
  v_obj jsonb;
  v_tmp text;
  -- Ruling 212: the three audiences that decide the five core-row attributes. One
  -- evaluation each, used by both the section and the member object, so the two can
  -- never disagree the way F2 found them disagreeing.
  v_see_origin boolean;
  v_see_where boolean;
  v_see_stance boolean;
begin
  if p_handle is null then
    if v_caller is null then return null; end if;
    select * into m from public.members where id = v_caller;
  else
    select * into m from public.members where handle = lower(p_handle);
  end if;
  if m.id is null then return null; end if;
  select s.label into v_stance_label from public.member_stances s where s.stance = m.stance;

  v_owner := v_caller is not null and v_caller = m.id and not coalesce(p_as_public, false);
  v_viewer := case when v_owner then v_caller when v_caller = m.id then null else v_caller end;
  -- Ruling 198: the block drops the viewer's scope; it does not hide the page. Hiding it would
  -- disclose the block (a page that opened yesterday and 404s today says exactly what happened) and
  -- be circumvented by signing out anyway. So the gate below still reads v_viewer, and a blocked
  -- member who could open this profile before can still open it, seeing what the public sees.
  -- Read directly rather than through private.is_blocked, which cannot tell the two apart. The
  -- lookup is the (blocker_id, blocked_id) primary key both ways round.
  if v_caller is not null and v_caller <> m.id then
    v_blocked_by_me := exists (
      select 1 from public.member_blocks b where b.blocker_id = v_caller and b.blocked_id = m.id);
    v_blocked_by_them := exists (
      select 1 from public.member_blocks b where b.blocker_id = m.id and b.blocked_id = v_caller);
  end if;
  v_blocked := v_blocked_by_me or v_blocked_by_them;
  -- B4A section 6: only the party who was blocked falls to the anonymous rule. The blocker keeps
  -- their own viewer, so ruling 220's anchor still admits Anchored sections to them, and the
  -- revoked edge is what removes Connections sections from both sides rather than a scope drop.
  v_scope := case when v_blocked_by_them then null else v_viewer end;
  if v_viewer is null and not v_owner and not m.profile_shared then return null; end if;
  v_private := m.profile_private and not v_owner;
  -- Ruling 213: a Private member's row is the owner's and their existing connections', and nobody
  -- else's. A non-connection's handle lookup returns the same NULL an unshared profile already
  -- returns anonymously, so the two cases are indistinguishable and existence is not disclosed.
  -- The owner's own "View as public" evaluates the same rule and gets the same NULL.
  if v_private and not private.is_connected(v_caller, m.id) then return null; end if;
  v_first := split_part(m.name, ' ', 1);
  v_tier := case
    when exists (select 1 from public.attestations a where a.member_id = m.id) then 'attested'
    when m.identified_at is not null then 'identified'
    else 'account' end;
  v_see_origin  := v_owner or (not v_private and private.admit_section(m.id, 'origin', v_scope));
  v_see_where   := v_owner or (not v_private and private.admit_section(m.id, 'where', v_scope));
  v_see_stance := v_owner or (not v_private and private.admit_section(m.id, 'stance', v_scope));

  -- A section is admitted when the owner is looking, or when private.admit_section allows the
  -- viewer (null viewer = the anonymous rule, which is what "View as public" renders).

  -- About
  if v_owner or (not v_private and private.admit_section(m.id, 'about', v_scope)) then
    select jsonb_build_object('about', a.about) into v_obj from public.member_about a where a.member_id = m.id;
    if v_owner or v_obj is not null then v_sections := v_sections || jsonb_build_object('about', coalesce(v_obj, '{}'::jsonb)); end if;
  end if;

  -- Stance: the current variant's fields; the owner also gets every variant.
  if v_see_stance then
    select jsonb_strip_nulls(jsonb_build_object(
      'timeline', d.return_timeline, 'needs', d.needs, 'base', d.base, 'offer', d.offer, 'support', d.support))
    into v_seg_fields from public.member_stance_details d where d.member_id = m.id and d.stance = m.stance;
    v_seg_fields := coalesce(v_seg_fields, '{}'::jsonb);
    if m.stance = 'exploring' then
      select coalesce(jsonb_agg(i.name order by t.position), '[]'::jsonb) into v_rows
      from public.member_interests i join public.interests t on t.name = i.name where i.member_id = m.id;
      v_seg_fields := v_seg_fields || jsonb_build_object('interests', v_rows);
    end if;
    if v_owner then
      select coalesce(jsonb_object_agg(d.stance, jsonb_strip_nulls(jsonb_build_object(
        'timeline', d.return_timeline, 'needs', d.needs, 'base', d.base, 'offer', d.offer, 'support', d.support))), '{}'::jsonb)
      into v_variants from public.member_stance_details d where d.member_id = m.id;
      select coalesce(jsonb_agg(i.name order by t.position), '[]'::jsonb) into v_rows
      from public.member_interests i join public.interests t on t.name = i.name where i.member_id = m.id;
      v_variants := v_variants || jsonb_build_object('exploring', coalesce(v_variants -> 'exploring', '{}'::jsonb) || jsonb_build_object('interests', v_rows));
      v_sections := v_sections || jsonb_build_object('stance', jsonb_build_object('stance', m.stance, 'fields', v_seg_fields, 'variants', v_variants));
    elsif m.stance is not null and (
      v_seg_fields - 'interests' <> '{}'::jsonb or jsonb_array_length(coalesce(v_seg_fields -> 'interests', '[]'::jsonb)) > 0) then
      v_sections := v_sections || jsonb_build_object('stance', jsonb_build_object('stance', m.stance, 'fields', v_seg_fields));
    end if;
  end if;

  -- Origin and heritage
  if v_see_origin then
    select jsonb_strip_nulls(jsonb_build_object('origin_country', m.origin_country, 'heritage', o.heritage, 'pathway', o.pathway))
    into v_obj from (select 1) s left join public.member_origin o on o.member_id = m.id;
    v_obj := coalesce(v_obj, jsonb_strip_nulls(jsonb_build_object('origin_country', m.origin_country)));
    if v_owner or v_obj <> '{}'::jsonb then v_sections := v_sections || jsonb_build_object('origin', v_obj); end if;
  end if;

  -- Where I am
  if v_see_where then
    v_obj := jsonb_strip_nulls(jsonb_build_object('current_place', m.current_place, 'current_country', m.current_country, 'local_tz', m.local_tz));
    if v_owner or m.current_place is not null or m.current_country is not null then v_sections := v_sections || jsonb_build_object('where', v_obj); end if;
  end if;

  -- What I work on
  if v_owner or (not v_private and private.admit_section(m.id, 'work', v_scope)) then
    v_obj := jsonb_build_object(
      'focus', (select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) from public.member_focus_areas j join public.focus_areas t on t.name = j.name where j.member_id = m.id),
      'industries', (select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) from public.member_industries j join public.industries t on t.name = j.name where j.member_id = m.id),
      'regions', (select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) from public.member_regional_expertise j join public.regional_expertise t on t.name = j.name where j.member_id = m.id));
    if v_owner or jsonb_array_length(v_obj -> 'focus') + jsonb_array_length(v_obj -> 'industries') + jsonb_array_length(v_obj -> 'regions') > 0 then
      v_sections := v_sections || jsonb_build_object('work', v_obj);
    end if;
  end if;

  -- Skills
  if v_owner or (not v_private and private.admit_section(m.id, 'skills', v_scope)) then
    select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) into v_rows
    from public.member_skills j join public.skills t on t.name = j.name where j.member_id = m.id;
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('skills', jsonb_build_object('skills', v_rows)); end if;
  end if;

  -- Languages
  if v_owner or (not v_private and private.admit_section(m.id, 'languages', v_scope)) then
    select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) into v_rows
    from public.member_languages j join public.languages t on t.name = j.name where j.member_id = m.id;
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('languages', jsonb_build_object('languages', v_rows)); end if;
  end if;

  -- What I am here for
  if v_owner or (not v_private and private.admit_section(m.id, 'intent', v_scope)) then
    select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) into v_rows
    from public.member_intents j join public.intents t on t.name = j.name where j.member_id = m.id;
    select n.note into v_tmp from public.member_intent n where n.member_id = m.id;
    v_obj := jsonb_strip_nulls(jsonb_build_object('intent', v_rows, 'note', v_tmp));
    if v_owner or jsonb_array_length(v_rows) > 0 or v_tmp is not null then v_sections := v_sections || jsonb_build_object('intent', v_obj); end if;
  end if;

  -- Links
  if v_owner or (not v_private and private.admit_section(m.id, 'links', v_scope)) then
    select coalesce(jsonb_object_agg(l.kind, l.url), '{}'::jsonb) into v_obj from public.member_links l where l.member_id = m.id;
    if v_owner or v_obj <> '{}'::jsonb then v_sections := v_sections || jsonb_build_object('links', v_obj); end if;
  end if;

  -- Activity (ruling 125): grounded-or-empty, projections over attestations, space_roles, stories.
  if v_owner or (not v_private and private.admit_section(m.id, 'convene', v_scope)) then
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', e.title,
      'sub', 'Attested by ' || private.third_party_label(am.id, a.attester_role, v_scope is null)
        || case when v_scope is not null or private.named_publicly(am.id) then ', ' || a.attester_role else '' end,
      'when', a.attested_at) order by a.attested_at desc), '[]'::jsonb)
    into v_rows from public.attestations a
    join public.events e on e.id = a.object_id and a.object_kind = 'event'
    join public.members am on am.id = a.attester_member_id
    where a.member_id = m.id and a.c_category = 'convene';
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('convene', v_rows); end if;
  end if;
  if v_owner or (not v_private and private.admit_section(m.id, 'collaborate', v_scope)) then
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', s.title,
      'sub', (case r.role when 'lead' then 'Lead' else 'Member' end) || ' since ' || to_char(r.created_at, 'Mon YYYY'),
      'completed', s.status = 'completed', 'when', r.created_at) order by r.created_at desc), '[]'::jsonb)
    into v_rows from public.space_roles r join public.spaces s on s.id = r.space_id
    where r.member_id = m.id and r.status = 'active';
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('collaborate', v_rows); end if;
  end if;
  if v_owner or (not v_private and private.admit_section(m.id, 'contribute', v_scope)) then
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', o.title, 'sub', 'Fulfilled a Need from ' || private.third_party_label(am.id, a.attester_role, v_scope is null), 'when', a.attested_at) order by a.attested_at desc), '[]'::jsonb)
    into v_rows from public.attestations a
    join public.opportunities o on o.id = a.object_id and a.object_kind = 'opportunity'
    join public.members am on am.id = a.attester_member_id
    where a.member_id = m.id and a.c_category = 'contribute';
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('contribute', v_rows); end if;
  end if;
  if v_owner or (not v_private and private.admit_section(m.id, 'convey', v_scope)) then
    select coalesce(jsonb_agg(jsonb_build_object('title', s.title, 'sub', 'Story', 'when', s.created_at, 'post_id', p.id) order by s.created_at desc), '[]'::jsonb)
    into v_rows from public.stories s
    left join public.posts p on p.created_object_kind = 'story' and p.created_object_id = s.id and p.status = 'published'
    where s.author_member_id = m.id;
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('convey', v_rows); end if;
  end if;

  -- Badges (ruling 123): one per attested context, in order Convene, Collaborate, Contribute.
  if v_owner or (not v_private and private.admit_section(m.id, 'badges', v_scope)) then
    select coalesce(jsonb_agg(jsonb_build_object('c', g.c, 'items', g.items) order by g.ord), '[]'::jsonb) into v_badges
    from (
      select a.c_category as c,
        case a.c_category when 'convene' then 1 when 'collaborate' then 2 else 3 end as ord,
        jsonb_agg(jsonb_build_object(
          'object', coalesce(e.title, s.title, o.title, 'Attested'),
          'attester', private.third_party_label(am.id, a.attester_role, v_scope is null),
          'role', case when v_scope is not null or private.named_publicly(am.id) then a.attester_role end,
          'when', a.attested_at) order by a.attested_at desc) as items
      from public.attestations a
      join public.members am on am.id = a.attester_member_id
      left join public.events e on a.object_kind = 'event' and e.id = a.object_id
      left join public.spaces s on a.object_kind = 'space' and s.id = a.object_id
      left join public.opportunities o on a.object_kind = 'opportunity' and o.id = a.object_id
      where a.member_id = m.id
      group by a.c_category
    ) g;
  end if;

  -- Relationship, mutuals and shared Spaces: a signed-in visitor only (rulings 118 to 120, 136).
  -- The blocked party gets none of it (ruling 198): no mutual name, no shared Space, no anchored
  -- qualification and no DIA line, which is B4A section 7's "does not render" list. The blocker
  -- keeps all of it (B4A section 7, Done Means 5): a block does not remove them for the blocker.
  -- The relationship object itself is withheld from both, on v_blocked below, so neither party is
  -- offered a Connect action or a Follow, and it is absent rather than 'none' so the surface
  -- renders no action at all.
  if v_viewer is not null and not v_owner and not v_blocked_by_them then
    -- Brief 4 (rulings 157, 168, 214): one relationship rule for every surface, and the window
    -- reaches no surface as itself. private.relationship_display maps it to sent.
    v_rel := private.relationship_display(v_viewer, m.id);
    v_following := exists (select 1 from public.member_follows f where f.follower_id = v_viewer and f.member_id = m.id);
    v_anchored := private.shares_anchor(v_viewer, m.id);
    if not v_private then
      -- Up to three connections in common, as names (never a count).
      with mine as (
        select c.other_id as other from public.member_connections c
        where c.member_id = v_viewer and not private.is_blocked(v_viewer, c.other_id)
      ), theirs as (
        select c.other_id as other from public.member_connections c where c.member_id = m.id
      )
      select coalesce(jsonb_agg(jsonb_build_object('name', mm.name, 'handle', mm.handle, 'avatar_path', mm.avatar_path) order by mm.name), '[]'::jsonb)
      into v_mutuals
      from (select other from mine intersect select other from theirs limit 3) x
      join public.members mm on mm.id = x.other;
      select coalesce(jsonb_agg(s.title order by s.title), '[]'::jsonb) into v_shared_spaces
      from public.space_roles ra join public.space_roles rb on rb.space_id = ra.space_id
      join public.spaces s on s.id = ra.space_id
      where ra.member_id = v_viewer and rb.member_id = m.id and ra.status = 'active' and rb.status = 'active';
      -- DIA's line (ruling 125): only with a real reason, in words.
      select 'Fulfilled a Need in the Space you lead.' into v_dia
      from public.attestations a join public.opportunities o on o.id = a.object_id and a.object_kind = 'opportunity'
      where a.member_id = m.id and a.c_category = 'contribute' and o.space_id is not null
        and exists (select 1 from public.space_roles r where r.space_id = o.space_id and r.member_id = v_viewer and r.role = 'lead' and r.status = 'active')
      order by a.attested_at desc limit 1;
      if v_dia is not null then
        v_dia := v_first || ' fulfilled a Need in the Space you lead.';
      else
        select v_first || ' was at ' || e.title || ', which you hosted.' into v_dia
        from public.attestations a join public.events e on e.id = a.object_id and a.object_kind = 'event'
        where a.member_id = m.id and e.host_member_id = v_viewer
        order by a.attested_at desc limit 1;
      end if;
    end if;
  end if;

  -- The owner's audience settings, every section with its default.
  if v_owner then
    select jsonb_object_agg(s.section, private.section_audience(m.id, s.section)) into v_vis
    from unnest(enum_range(null::public.profile_section)) as s(section);
  end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'viewer', case when v_owner then 'owner' when v_viewer is null then 'anon' else 'member' end,
    -- Ruling 212 (F2a, F2b): the five section-gated attributes are admitted or omitted by the same
    -- predicate the sections use, with the explicit viewer already in scope, anonymous callers
    -- included. Omit, never blank: a withheld attribute produces no key at all.
    'member', jsonb_strip_nulls(jsonb_build_object(
      'id', m.id, 'handle', m.handle, 'name', m.name, 'headline', m.headline,
      'avatar_path', m.avatar_path, 'cover_path', m.cover_path, 'cover_focus', m.cover_focus,
      'origin_country', case when v_see_origin then m.origin_country end,
      'current_place', case when v_see_where then m.current_place end,
      'current_country', case when v_see_where then m.current_country end,
      'local_tz', case when v_see_where then m.local_tz end,
      'stance', case when v_see_stance then m.stance end,
      'stance_label', case when v_see_stance then v_stance_label end,
      'pattern', m.pattern, 'tier', v_tier)),
    'switches', case when v_owner then jsonb_build_object('private', m.profile_private, 'shared', m.profile_shared) end,
    'private', v_private,
    'sections', v_sections,
    'badges', v_badges,
    'visibility', v_vis,
    'relationship', case when v_viewer is not null and not v_owner and not v_blocked
                         then jsonb_build_object('state', v_rel, 'following', v_following) end,
    -- B4A section 4: the overflow reads Block or Unblock from the caller's own block, and nothing
    -- in this payload says whether this member has blocked the caller.
    'viewer_blocked', v_blocked_by_me,
    'mutuals', v_mutuals,
    'shared_spaces', v_shared_spaces,
    'anchored', v_anchored,
    'dia_line', v_dia
  ));
end;
$$;

create or replace function public.save_profile_section(section text, payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  p jsonb := coalesce(payload, '{}'::jsonb);
  v_name text;
  v_headline text;
  v_text text;
  v_seg public.stance;
  v_arr text[];
  v_tz text;
  v_place text;
  v_country text;
  v_kind public.link_kind;
  v_url text;
  v_section public.profile_section;
  v_aud public.audience;
  v_path text;
  v_priv boolean;
  v_shared boolean;
begin
  if v_uid is null then
    raise exception 'save_profile_section: not signed in' using errcode = '42501';
  end if;
  if not exists (select 1 from public.members m where m.id = v_uid) then
    raise exception 'save_profile_section: no profile row' using errcode = 'P0002';
  end if;

  if section = 'core' then
    v_name := left(trim(coalesce(p ->> 'name', '')), 80);
    if v_name = '' then
      raise exception 'A name is required.' using errcode = '22023';
    end if;
    v_headline := nullif(left(trim(coalesce(p ->> 'headline', '')), 140), '');
    update public.members set name = v_name, headline = v_headline, updated_at = now() where id = v_uid;

  elsif section = 'about' then
    v_text := nullif(left(trim(coalesce(p ->> 'about', '')), 500), '');
    if v_text is null then
      delete from public.member_about where member_id = v_uid;
    else
      insert into public.member_about (member_id, about) values (v_uid, v_text)
      on conflict (member_id) do update set about = excluded.about, updated_at = now();
    end if;

  elsif section = 'stance' then
    v_seg := nullif(p ->> 'stance', '')::public.stance;
    if v_seg is null then
      raise exception 'save_profile_section: stance required' using errcode = '22023';
    end if;
    update public.members set stance = v_seg, updated_at = now() where id = v_uid;
    insert into public.member_stance_details (member_id, stance, return_timeline, needs, base, offer, support)
    values (
      v_uid, v_seg,
      case when v_seg = 'returnee' then nullif(p ->> 'timeline', '')::public.return_timeline end,
      case when v_seg = 'returnee' then nullif(left(trim(coalesce(p ->> 'needs', '')), 500), '') end,
      case when v_seg = 'anchor' then nullif(left(trim(coalesce(p ->> 'base', '')), 120), '') end,
      case when v_seg = 'anchor' then nullif(left(trim(coalesce(p ->> 'offer', '')), 500), '') end,
      case when v_seg = 'ally' then nullif(left(trim(coalesce(p ->> 'support', '')), 500), '') end
    )
    on conflict (member_id, stance) do update set
      return_timeline = excluded.return_timeline, needs = excluded.needs, base = excluded.base,
      offer = excluded.offer, support = excluded.support, updated_at = now();
    if v_seg = 'exploring' then
      select coalesce(array_agg(distinct x), '{}') into v_arr
      from jsonb_array_elements_text(coalesce(p -> 'interests', '[]'::jsonb)) x;
      if array_length(v_arr, 1) > 5 then raise exception 'Interests: up to 5' using errcode = '23514'; end if;
      delete from public.member_interests where member_id = v_uid;
      insert into public.member_interests (member_id, name) select v_uid, unnest(v_arr);
    end if;

  elsif section = 'origin' then
    update public.members set origin_country = nullif(p ->> 'origin_country', ''), updated_at = now() where id = v_uid;
    if nullif(p ->> 'heritage', '') is null and nullif(p ->> 'pathway', '') is null then
      delete from public.member_origin where member_id = v_uid;
    else
      insert into public.member_origin (member_id, heritage, pathway)
      values (v_uid, nullif(p ->> 'heritage', '')::public.heritage_kind, nullif(p ->> 'pathway', '')::public.return_pathway)
      on conflict (member_id) do update set heritage = excluded.heritage, pathway = excluded.pathway, updated_at = now();
    end if;

  elsif section = 'where' then
    v_place := nullif(left(trim(coalesce(p ->> 'current_place', '')), 120), '');
    v_tz := nullif(p ->> 'local_tz', '');
    if v_tz is not null and not exists (select 1 from pg_catalog.pg_timezone_names n where n.name = v_tz) then
      raise exception 'save_profile_section: unknown time zone' using errcode = '22023';
    end if;
    if v_tz is null and v_place is not null then v_tz := private.tz_from_place(v_place); end if;
    if v_place is null then v_tz := null; end if;
    v_country := nullif(trim(coalesce(p ->> 'current_country', '')), '');
    if v_country is not null and not exists (select 1 from public.world_countries w where w.name = v_country) then
      raise exception 'save_profile_section: Current country: that value is not in the list' using errcode = '23503';
    end if;
    update public.members set current_place = v_place, current_country = v_country, local_tz = v_tz, updated_at = now() where id = v_uid;

  elsif section = 'work' then
    select coalesce(array_agg(distinct x), '{}') into v_arr from jsonb_array_elements_text(coalesce(p -> 'focus', '[]'::jsonb)) x;
    if array_length(v_arr, 1) > 3 then raise exception 'Focus areas: up to 3' using errcode = '23514'; end if;
    delete from public.member_focus_areas where member_id = v_uid;
    insert into public.member_focus_areas (member_id, name) select v_uid, unnest(v_arr);
    select coalesce(array_agg(distinct x), '{}') into v_arr from jsonb_array_elements_text(coalesce(p -> 'industries', '[]'::jsonb)) x;
    if array_length(v_arr, 1) > 3 then raise exception 'Industries: up to 3' using errcode = '23514'; end if;
    delete from public.member_industries where member_id = v_uid;
    insert into public.member_industries (member_id, name) select v_uid, unnest(v_arr);
    select coalesce(array_agg(distinct x), '{}') into v_arr from jsonb_array_elements_text(coalesce(p -> 'regions', '[]'::jsonb)) x;
    if array_length(v_arr, 1) > 3 then raise exception 'Regional expertise: up to 3' using errcode = '23514'; end if;
    delete from public.member_regional_expertise where member_id = v_uid;
    insert into public.member_regional_expertise (member_id, name) select v_uid, unnest(v_arr);

  elsif section = 'skills' then
    select coalesce(array_agg(distinct x), '{}') into v_arr from jsonb_array_elements_text(coalesce(p -> 'skills', '[]'::jsonb)) x;
    if array_length(v_arr, 1) > 5 then raise exception 'Skills: up to 5' using errcode = '23514'; end if;
    delete from public.member_skills where member_id = v_uid;
    insert into public.member_skills (member_id, name) select v_uid, unnest(v_arr);

  elsif section = 'languages' then
    select coalesce(array_agg(distinct x), '{}') into v_arr from jsonb_array_elements_text(coalesce(p -> 'languages', '[]'::jsonb)) x;
    if array_length(v_arr, 1) > 6 then raise exception 'Languages: up to 6' using errcode = '23514'; end if;
    delete from public.member_languages where member_id = v_uid;
    insert into public.member_languages (member_id, name) select v_uid, unnest(v_arr);

  elsif section = 'intent' then
    select coalesce(array_agg(distinct x), '{}') into v_arr from jsonb_array_elements_text(coalesce(p -> 'intent', '[]'::jsonb)) x;
    if array_length(v_arr, 1) > 3 then raise exception 'Intent: up to 3' using errcode = '23514'; end if;
    delete from public.member_intents where member_id = v_uid;
    insert into public.member_intents (member_id, name) select v_uid, unnest(v_arr);
    v_text := nullif(left(trim(coalesce(p ->> 'note', '')), 200), '');
    if v_text is null then
      delete from public.member_intent where member_id = v_uid;
    else
      insert into public.member_intent (member_id, note) values (v_uid, v_text)
      on conflict (member_id) do update set note = excluded.note, updated_at = now();
    end if;

  elsif section = 'links' then
    for v_kind in select unnest(enum_range(null::public.link_kind)) loop
      v_url := nullif(left(trim(coalesce(p ->> v_kind::text, '')), 200), '');
      if v_kind <> 'website' and v_url is not null then v_url := ltrim(v_url, '@'); end if;
      if v_url is null then
        delete from public.member_links where member_id = v_uid and kind = v_kind;
      else
        insert into public.member_links (member_id, kind, url) values (v_uid, v_kind, v_url)
        on conflict (member_id, kind) do update set url = excluded.url;
      end if;
    end loop;

  elsif section = 'media' then
    if p ? 'avatar_path' then
      v_path := nullif(p ->> 'avatar_path', '');
      if v_path is not null and v_path not like v_uid::text || '/avatar/%' then
        raise exception 'save_profile_section: avatar path outside your folder' using errcode = '42501';
      end if;
      update public.members set avatar_path = v_path, updated_at = now() where id = v_uid;
    end if;
    if p ? 'cover_path' then
      v_path := nullif(p ->> 'cover_path', '');
      if v_path is not null and v_path not like v_uid::text || '/cover/%' then
        raise exception 'save_profile_section: cover path outside your folder' using errcode = '42501';
      end if;
      update public.members set cover_path = v_path, updated_at = now() where id = v_uid;
    end if;
    if p ? 'cover_focus' then
      update public.members set cover_focus = coalesce(nullif(left(p ->> 'cover_focus', 40), ''), 'center 35%'), updated_at = now() where id = v_uid;
    end if;

  elsif section = 'pattern' then
    update public.members set pattern = (p ->> 'pattern')::public.masthead_pattern, updated_at = now() where id = v_uid;

  elsif section = 'switches' then
    -- F1: profile_private and profile_shared left the authenticated column grant, and this
    -- function is SECURITY INVOKER, so it can no longer read the switch the caller did not send
    -- from the row it is updating. private.own_switches() returns the caller's own two values and
    -- nobody else's, so the partial save keeps working without widening the grant.
    select s.profile_private, s.profile_shared into v_priv, v_shared from private.own_switches() s;
    update public.members set
      profile_private = coalesce((p ->> 'private')::boolean, v_priv),
      profile_shared = coalesce((p ->> 'shared')::boolean, v_shared),
      updated_at = now()
    where id = v_uid;

  elsif section = 'visibility' then
    v_section := (p ->> 'section')::public.profile_section;
    v_aud := (p ->> 'audience')::public.audience;
    insert into public.member_visibility (member_id, section, audience) values (v_uid, v_section, v_aud)
    on conflict (member_id, section) do update set audience = excluded.audience;

  else
    raise exception 'save_profile_section: unknown section %', section using errcode = '22023';
  end if;
end;
$$;

create or replace function public.connect_cards(
  p_lens text,
  p_filters jsonb default '{}'::jsonb,
  p_cursor text default null,
  p_limit integer default 20
)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  f jsonb := coalesce(p_filters, '{}'::jsonb);
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 40);
  v_cur_name text;
  v_cur_id uuid;
  v_next text;
  v_items jsonb := '[]'::jsonb;
  v_requests jsonb := '[]'::jsonb;
  v_sent jsonb := '[]'::jsonb;
  v_connections jsonb := '[]'::jsonb;
  v_following jsonb := '[]'::jsonb;
  v_matched text[];
  v_window interval := make_interval(days => private.setting_int('decline_window_days', 90));
  v_n integer := 0;
  v_card jsonb;
  r record;
begin
  if v_uid is null then return null; end if;

  if p_lens = 'members' then
    if p_cursor is not null and length(p_cursor) > 37 then
      v_cur_id := private.uuid_or_null(right(p_cursor, 36));
      v_cur_name := left(p_cursor, length(p_cursor) - 37);
    end if;
    v_matched := array_remove(array[f ->> 'focus', f ->> 'industry', f ->> 'skill', f ->> 'region'], null);
    for r in
      select m.id, m.name
      from public.members m
      where m.id <> v_uid
        and not private.is_blocked(v_uid, m.id)
        -- Ruling 213: a Private member is not in Members for anyone but an existing connection.
        and private.admit_member(m.id, v_uid)
        -- Ruling 212 (F5): every axis over a section-gated attribute checks the audience first, or
        -- the filter is a searchable index over what the member withheld. stance, location and
        -- origin join heritage, pathway, focus, industry, skill and region, which already did.
        and (f ->> 'stance' is null or (private.admit_section(m.id, 'stance', v_uid) and m.stance::text = f ->> 'stance'))
        and (f ->> 'location' is null or (private.admit_section(m.id, 'where', v_uid) and m.current_country = f ->> 'location'))
        and (f ->> 'origin' is null or (private.admit_section(m.id, 'origin', v_uid) and m.origin_country = f ->> 'origin'))
        and (f ->> 'heritage' is null or (private.admit_section(m.id, 'origin', v_uid) and exists (
          select 1 from public.member_origin o where o.member_id = m.id and o.heritage::text = f ->> 'heritage')))
        and (f ->> 'pathway' is null or (private.admit_section(m.id, 'origin', v_uid) and exists (
          select 1 from public.member_origin o where o.member_id = m.id and o.pathway::text = f ->> 'pathway')))
        and (f ->> 'corridor' is null or exists (
          select 1 from public.member_corridors mc join public.corridors c on c.id = mc.corridor_id
          where mc.member_id = m.id and mc.corridor_id = f ->> 'corridor' and c.status = 'active'))
        and (f ->> 'focus' is null or (private.admit_section(m.id, 'work', v_uid) and exists (
          select 1 from public.member_focus_areas j where j.member_id = m.id and j.name = f ->> 'focus')))
        and (f ->> 'industry' is null or (private.admit_section(m.id, 'work', v_uid) and exists (
          select 1 from public.member_industries j where j.member_id = m.id and j.name = f ->> 'industry')))
        and (f ->> 'skill' is null or (private.admit_section(m.id, 'skills', v_uid) and exists (
          select 1 from public.member_skills j where j.member_id = m.id and j.name = f ->> 'skill')))
        and (f ->> 'region' is null or (private.admit_section(m.id, 'work', v_uid) and exists (
          select 1 from public.member_regional_expertise j where j.member_id = m.id and j.name = f ->> 'region')))
        and (v_cur_id is null or (m.name, m.id) > (v_cur_name, v_cur_id))
      order by m.name, m.id
      limit v_limit + 1
    loop
      v_n := v_n + 1;
      if v_n > v_limit then
        v_next := r.name || '|' || r.id::text;
        exit;
      end if;
      v_card := private.connect_card(v_uid, r.id, 'members', v_matched);
      if v_card is not null then v_items := v_items || v_card; end if;
    end loop;
    return jsonb_build_object('items', v_items, 'next_cursor', v_next);

  elsif p_lens = 'suggested' then
    for r in
      with cand as (
        select m.id, m.name,
          (select coalesce(jsonb_agg(distinct e.title), '[]'::jsonb)
             from public.attestations xa
             join public.attestations xb on xb.object_kind = 'event' and xb.object_id = xa.object_id
             join public.events e on e.id = xa.object_id
             where xa.object_kind = 'event'
               and v_uid in (xa.member_id, xa.attester_member_id)
               and m.id in (xb.member_id, xb.attester_member_id)) as events,
          (select coalesce(jsonb_agg(distinct s.title), '[]'::jsonb)
             from public.space_roles ra
             join public.space_roles rb on rb.space_id = ra.space_id
             join public.spaces s on s.id = ra.space_id
             where ra.member_id = v_uid and rb.member_id = m.id
               and ra.status = 'active' and rb.status = 'active') as spaces,
          (select coalesce(jsonb_agg(distinct (c.continental_place || ' to ' || c.diaspora_place)), '[]'::jsonb)
             from public.member_corridors a
             join public.member_corridors b on b.corridor_id = a.corridor_id
             join public.corridors c on c.id = a.corridor_id
             where a.member_id = v_uid and b.member_id = m.id and c.status = 'active') as corridors,
          case when private.admit_section(m.id, 'work', v_uid) then
            (select coalesce(jsonb_agg(a.name order by t.position), '[]'::jsonb)
               from public.member_focus_areas a join public.member_focus_areas b on b.name = a.name
               join public.focus_areas t on t.name = a.name
               where a.member_id = v_uid and b.member_id = m.id) else '[]'::jsonb end as focus,
          case when private.admit_section(m.id, 'work', v_uid) then
            (select coalesce(jsonb_agg(a.name order by t.position), '[]'::jsonb)
               from public.member_industries a join public.member_industries b on b.name = a.name
               join public.industries t on t.name = a.name
               where a.member_id = v_uid and b.member_id = m.id) else '[]'::jsonb end as industries,
          case when private.admit_section(m.id, 'work', v_uid) then
            (select coalesce(jsonb_agg(a.name order by t.position), '[]'::jsonb)
               from public.member_regional_expertise a join public.member_regional_expertise b on b.name = a.name
               join public.regional_expertise t on t.name = a.name
               where a.member_id = v_uid and b.member_id = m.id) else '[]'::jsonb end as regions,
          case when private.admit_section(m.id, 'skills', v_uid) then
            (select coalesce(jsonb_agg(a.name order by t.position), '[]'::jsonb)
               from public.member_skills a join public.member_skills b on b.name = a.name
               join public.skills t on t.name = a.name
               where a.member_id = v_uid and b.member_id = m.id) else '[]'::jsonb end as skills,
          case when private.admit_section(m.id, 'languages', v_uid) then
            (select coalesce(jsonb_agg(a.name order by t.position), '[]'::jsonb)
               from public.member_languages a join public.member_languages b on b.name = a.name
               join public.languages t on t.name = a.name
               where a.member_id = v_uid and b.member_id = m.id) else '[]'::jsonb end as languages,
          (select coalesce(jsonb_agg(x.name order by x.name), '[]'::jsonb)
             from (
               select mm.name
               from public.member_connections c1
               join public.member_connections c2 on c2.member_id = m.id and c2.other_id = c1.other_id
               join public.members mm on mm.id = c1.other_id
               where c1.member_id = v_uid and not private.is_blocked(v_uid, c1.other_id)
               order by mm.name limit 3
             ) x) as mutuals,
          exists (select 1 from public.second_degree s where s.member_id = v_uid and s.fof_id = m.id) as fof
        from public.members m
        where m.id <> v_uid
          and not private.is_blocked(v_uid, m.id)
          -- Ruling 213: and not a Private member the viewer is not already connected to.
          and private.admit_member(m.id, v_uid)
          and not exists (select 1 from public.dismissed_suggestions d where d.member_id = v_uid and d.dismissed_id = m.id)
          -- Ruling 229: Suggested reads the outward state, not the raw one. A withdrawn request
          -- inside the window reads sent everywhere else, so a candidate reappearing here would be
          -- the probe the ruling closes: present means it was pending, absent means it was declined.
          and private.relationship_display(v_uid, m.id) = 'none'
      ),
      scored as (
        select c.*,
          (jsonb_array_length(c.events) > 0)::integer
          + (jsonb_array_length(c.spaces) > 0)::integer
          + (jsonb_array_length(c.corridors) > 0)::integer
          + (jsonb_array_length(c.focus) + jsonb_array_length(c.industries) + jsonb_array_length(c.regions)
             + jsonb_array_length(c.skills) + jsonb_array_length(c.languages) > 0)::integer
          + (c.fof and jsonb_array_length(c.mutuals) > 0)::integer as hits
        from cand c
      )
      select * from scored s
      where s.hits > 0
      order by s.hits desc, s.name, s.id
      limit v_limit
    loop
      v_card := private.connect_card(v_uid, r.id, 'suggested', '{}');
      if v_card is null then continue; end if;
      v_items := v_items || (v_card || jsonb_build_object('facts', jsonb_strip_nulls(jsonb_build_object(
        'events', nullif(r.events, '[]'::jsonb),
        'spaces', nullif(r.spaces, '[]'::jsonb),
        'corridors', nullif(r.corridors, '[]'::jsonb),
        'overlap', nullif(jsonb_strip_nulls(jsonb_build_object(
          'focus', nullif(r.focus, '[]'::jsonb),
          'industries', nullif(r.industries, '[]'::jsonb),
          'regions', nullif(r.regions, '[]'::jsonb),
          'skills', nullif(r.skills, '[]'::jsonb),
          'languages', nullif(r.languages, '[]'::jsonb))), '{}'::jsonb),
        'mutuals', case when r.fof then nullif(r.mutuals, '[]'::jsonb) end
      ))));
    end loop;
    return jsonb_build_object('items', v_items);

  elsif p_lens = 'network' then
    for r in
      select c.id, c.from_member_id, c.message
      from public.connection_requests c
      where c.to_member_id = v_uid and c.status = 'pending' and not private.is_blocked(v_uid, c.from_member_id)
      order by c.created_at desc
    loop
      v_card := private.connect_card(v_uid, r.from_member_id, 'requests', '{}');
      if v_card is not null then
        v_requests := v_requests || (v_card || jsonb_build_object('message', r.message));
      end if;
    end loop;
    for r in
      select distinct on (c.to_member_id) c.to_member_id
      from public.connection_requests c
      where c.from_member_id = v_uid and c.to_member_id is not null
        and not private.is_blocked(v_uid, c.to_member_id)
        -- Ruling 229: a withdrawn request keeps its Sent row for the rest of the window, for the
        -- same reason. Without it, withdrawing and watching the row vanish separates a pending
        -- request from one inside the window in a single click.
        and (c.status = 'pending'
          or (c.status in ('declined', 'withdrawn') and c.responded_at > now() - v_window))
      order by c.to_member_id, c.created_at desc
    loop
      v_card := private.connect_card(v_uid, r.to_member_id, 'sent', '{}');
      -- Pending until the window elapses (ruling 157): the projection never says declined.
      if v_card is not null then v_sent := v_sent || (v_card || jsonb_build_object('rel', 'sent')); end if;
    end loop;
    for r in
      select c.other_id from public.member_connections c
      where c.member_id = v_uid and not private.is_blocked(v_uid, c.other_id)
      order by c.created_at desc, c.other_id
    loop
      v_card := private.connect_card(v_uid, r.other_id, 'connections', '{}');
      if v_card is not null then v_connections := v_connections || v_card; end if;
    end loop;
    for r in
      select e.to_id from public.edges e
      where e.from_id = v_uid and e.edge_type = 'follow' and e.revoked_at is null
        and not private.is_blocked(v_uid, e.to_id)
      order by e.created_at desc, e.to_id
    loop
      v_card := private.connect_card(v_uid, r.to_id, 'following', '{}');
      if v_card is not null then v_following := v_following || v_card; end if;
    end loop;
    return jsonb_build_object('requests', v_requests, 'sent', v_sent, 'connections', v_connections, 'following', v_following);
  end if;

  raise exception 'connect_cards: unknown lens %', p_lens using errcode = '22023';
end;
$$;

create or replace function private.connect_card(p_viewer uuid, p_member uuid, p_context text, p_matched text[])
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  m public.members%rowtype;
  v_rel text;
  v_following boolean;
  v_seg text;
  v_heritage text;
  v_corridor text;
  v_place text;
  v_origin text;
  v_chips jsonb := '[]'::jsonb;
  v_badges jsonb := '[]'::jsonb;
  v_mutuals jsonb := '[]'::jsonb;
begin
  select * into m from public.members where id = p_member;
  if m.id is null then return null; end if;
  -- Ruling 214: window is sender-side state and renders as sent everywhere. The
  -- distinction stays inside private.relationship_state, which the write paths read.
  v_rel := private.relationship_display(p_viewer, p_member);
  v_following := exists (select 1 from public.edges e
    where e.from_id = p_viewer and e.to_id = p_member and e.edge_type = 'follow' and e.revoked_at is null);
  -- Ruling 212 (F2b): stance, origin and place are section-gated attributes, read through the
  -- same predicate the Work and Skills chips already use. The card that showed Work chips obeying
  -- the audience while origin and place ignored it is the finding this closes.
  if private.admit_section(m.id, 'stance', p_viewer) then
    select s.label into v_seg from public.member_stances s where s.stance = m.stance;
  end if;
  if private.admit_section(m.id, 'origin', p_viewer) then
    v_origin := m.origin_country;
    select o.heritage::text into v_heritage from public.member_origin o where o.member_id = m.id;
  end if;
  select c.continental_place || ' to ' || c.diaspora_place into v_corridor
  from public.member_corridors mc join public.corridors c on c.id = mc.corridor_id
  where mc.member_id = m.id and c.status = 'active'
  order by mc.created_at limit 1;
  if private.admit_section(m.id, 'where', p_viewer) then
    v_place := case
      when m.current_place is not null and m.current_country is not null
        and position(lower(m.current_country) in lower(m.current_place)) = 0
        then m.current_place || ', ' || m.current_country
      else coalesce(m.current_place, m.current_country) end;
  end if;

  if private.admit_section(m.id, 'badges', p_viewer) then
    select coalesce(jsonb_agg(jsonb_build_object('c', g.c, 'items', g.items) order by g.ord), '[]'::jsonb) into v_badges
    from (
      select a.c_category as c,
        case a.c_category when 'convene' then 1 when 'collaborate' then 2 else 3 end as ord,
        jsonb_agg(jsonb_build_object(
          'object', coalesce(e.title, s.title, o.title, 'Attested'),
          'attester', am.name, 'role', a.attester_role, 'when', a.attested_at) order by a.attested_at desc) as items
      from public.attestations a
      join public.members am on am.id = a.attester_member_id
      left join public.events e on a.object_kind = 'event' and e.id = a.object_id
      left join public.spaces s on a.object_kind = 'space' and s.id = a.object_id
      left join public.opportunities o on a.object_kind = 'opportunity' and o.id = a.object_id
      where a.member_id = m.id
      group by a.c_category
    ) g;
  end if;

  -- Mutuals as names, up to three, never a count (ruling 120); not shown once connected.
  if v_rel <> 'connected' then
    select coalesce(jsonb_agg(jsonb_build_object('name', x.name, 'avatar_path', x.avatar_path) order by x.name), '[]'::jsonb)
    into v_mutuals
    from (
      select mm.name, mm.avatar_path
      from public.member_connections c1
      join public.member_connections c2 on c2.member_id = m.id and c2.other_id = c1.other_id
      join public.members mm on mm.id = c1.other_id
      where c1.member_id = p_viewer and not private.is_blocked(p_viewer, c1.other_id)
      order by mm.name limit 3
    ) x;
  end if;

  if p_context = 'members' then
    with vals as (
      select j.name, 1 as ax, t.position from public.member_focus_areas j join public.focus_areas t on t.name = j.name
      where j.member_id = m.id and private.admit_section(m.id, 'work', p_viewer)
      union all
      select j.name, 2, t.position from public.member_industries j join public.industries t on t.name = j.name
      where j.member_id = m.id and private.admit_section(m.id, 'work', p_viewer)
      union all
      select j.name, 3, t.position from public.member_regional_expertise j join public.regional_expertise t on t.name = j.name
      where j.member_id = m.id and private.admit_section(m.id, 'work', p_viewer)
      union all
      select j.name, 4, t.position from public.member_skills j join public.skills t on t.name = j.name
      where j.member_id = m.id and private.admit_section(m.id, 'skills', p_viewer)
    )
    select coalesce(jsonb_agg(v.name order by (v.name = any (coalesce(p_matched, '{}'))) desc, v.ax, v.position), '[]'::jsonb)
    into v_chips from vals v;
  end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'id', m.id, 'handle', m.handle, 'name', m.name, 'avatar_path', m.avatar_path,
    'identified', m.identified_at is not null,
    'headline', m.headline, 'stance_label', v_seg, 'place', v_place, 'origin', v_origin,
    'heritage', v_heritage, 'corridor_label', v_corridor,
    'chips', v_chips, 'badges', v_badges, 'mutuals', v_mutuals,
    'rel', v_rel, 'following', v_following
  ));
end;
$$;

create or replace function public.connect_filter_options()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'stances', (select coalesce(jsonb_agg(jsonb_build_object('value', s.stance, 'label', s.label) order by s.position), '[]'::jsonb) from public.member_stances s),
    'locations', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.world_countries),
    'origins', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.countries),
    'heritage', (select jsonb_agg(x) from unnest(enum_range(null::public.heritage_kind)) x),
    'pathway', (select jsonb_agg(x) from unnest(enum_range(null::public.return_pathway)) x),
    'corridors', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'label', c.continental_place || ' to ' || c.diaspora_place) order by c.id), '[]'::jsonb)
                  from public.corridors c where c.status = 'active'),
    'focus', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.focus_areas),
    'industries', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.industries),
    'skills', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.skills),
    'regions', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.regional_expertise)
  ) end;
$$;

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
                   from unnest(enum_range(null::public.contribute_instrument)) x)
  );
$$;

-- ---------------------------------------------------------------------------
-- 12. Onboarding: one write per screen, one read projection. Each SECURITY DEFINER, each for
-- auth.uid() only, each returning what the next state needs and nothing about other members.
-- ---------------------------------------------------------------------------

-- The username derivation (SPEC section 9, mirrored by the client): trim, lowercase, strip
-- everything except a-z 0-9 space and hyphen, spaces to hyphens, collapse runs, trim hyphens.
-- Cut to the handle column's forty characters at the end, which the SPEC's steps do not mention
-- and the column requires.
create or replace function private.derive_username(p_name text)
returns text
language sql immutable strict set search_path = ''
as $$
  select nullif(trim(both '-' from left(
    regexp_replace(
      regexp_replace(
        regexp_replace(lower(trim(p_name)), '[^a-z0-9 -]', '', 'g'),
        ' ', '-', 'g'),
      '-+', '-', 'g'),
    40)), '');
$$;
revoke execute on function private.derive_username(text) from public, anon, authenticated;

-- Screen one. Name required; username and photo offered. On a collision the result is taken and
-- nothing is written; no suffix is ever appended (SPEC section 9). A username equal to the derived
-- suggestion leaves username_changes where it is; one that differs from both the suggestion and
-- the member's current handle counts as a deliberate change.
create or replace function public.onboard_who(p_name text, p_username text default null, p_avatar_path text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  m public.members%rowtype;
  v_name text := left(trim(coalesce(p_name, '')), 80);
  v_suggestion text;
  v_user text;
  v_avatar text := nullif(trim(coalesce(p_avatar_path, '')), '');
begin
  if v_uid is null then
    raise exception 'onboarding: not signed in' using errcode = '42501';
  end if;
  select * into m from public.members where id = v_uid;
  if m.id is null then
    raise exception 'onboarding: no profile row' using errcode = 'P0002';
  end if;
  if m.onboarded_at is not null then
    raise exception 'onboarding: already complete' using errcode = 'P0001';
  end if;
  if v_name = '' then
    raise exception 'A name is required.' using errcode = '22023';
  end if;
  v_suggestion := coalesce(private.derive_username(v_name), 'member');
  v_user := coalesce(nullif(lower(trim(coalesce(p_username, ''))), ''), v_suggestion);
  -- The handle column's shape, three to forty characters. The SPEC's hint copy carries the two
  -- numerals the surface shows; reconcile these bounds with them when the SPEC lands.
  if v_user !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' then
    return jsonb_build_object('status', 'invalid', 'suggestion', v_suggestion);
  end if;
  if exists (select 1 from public.members x where x.handle = v_user and x.id <> v_uid) then
    return jsonb_build_object('status', 'taken', 'suggestion', v_suggestion);
  end if;
  if v_avatar is not null and v_avatar not like v_uid::text || '/avatar/%' then
    raise exception 'onboarding: photo path is not this member''s avatar' using errcode = '22023';
  end if;

  update public.members set
    name = v_name,
    handle = v_user,
    -- No photo offered keeps the one the member already has (a provider photo, or a resume after
    -- one was set); onboarding never removes a photo, the profile does.
    avatar_path = coalesce(v_avatar, m.avatar_path),
    username_changes = case when v_user <> v_suggestion and v_user <> m.handle
                            then m.username_changes + 1 else m.username_changes end,
    who_completed_at = coalesce(m.who_completed_at, now()),
    updated_at = now()
  where id = v_uid;

  return jsonb_build_object(
    'status', 'ok',
    'name', v_name,
    'username', v_user,
    'avatar_path', coalesce(v_avatar, m.avatar_path),
    'suggestion', v_suggestion,
    'username_changes', case when v_user <> v_suggestion and v_user <> m.handle
                             then m.username_changes + 1 else m.username_changes end);
end;
$$;

-- Screen two. City and country; the country must be a value in the world list (ruling 142) and
-- anything else is refused. The stored shape is Brief 3's: current_place carries the city,
-- current_country the country, local_tz derived from the city as save_profile_section does.
create or replace function public.onboard_where(p_city text, p_country text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  m public.members%rowtype;
  v_city text := nullif(left(trim(coalesce(p_city, '')), 120), '');
  v_country text := nullif(trim(coalesce(p_country, '')), '');
  v_tz text;
begin
  if v_uid is null then
    raise exception 'onboarding: not signed in' using errcode = '42501';
  end if;
  select * into m from public.members where id = v_uid;
  if m.id is null then
    raise exception 'onboarding: no profile row' using errcode = 'P0002';
  end if;
  if m.onboarded_at is not null then
    raise exception 'onboarding: already complete' using errcode = 'P0001';
  end if;
  if m.who_completed_at is null then
    raise exception 'onboarding: screen one is not complete' using errcode = 'P0001';
  end if;
  if v_city is null then
    raise exception 'A city is required.' using errcode = '22023';
  end if;
  if v_country is null or not exists (select 1 from public.world_countries w where w.name = v_country) then
    raise exception 'Current country: that value is not in the list' using errcode = '23503';
  end if;
  v_tz := private.tz_from_place(v_city);
  update public.members set
    current_place = v_city, current_country = v_country, local_tz = v_tz, updated_at = now()
  where id = v_uid;
  return jsonb_build_object('status', 'ok', 'city', v_city, 'country', v_country);
end;
$$;

-- Screen three, and the only path that sets onboarded_at. p_touched is the client flag from SPEC
-- section 6: true on any selection, including re-selecting the default, never on opening the
-- explainer. Untouched, the default stands unrecorded and only onboarded_at is written. Touched,
-- the stance is written and stance_declared_at with it, whether or not the value changed.
create or replace function public.onboard_relationship(p_stance public.stance, p_touched boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  m public.members%rowtype;
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'onboarding: not signed in' using errcode = '42501';
  end if;
  select * into m from public.members where id = v_uid;
  if m.id is null then
    raise exception 'onboarding: no profile row' using errcode = 'P0002';
  end if;
  if m.onboarded_at is not null then
    raise exception 'onboarding: already complete' using errcode = 'P0001';
  end if;
  if m.who_completed_at is null or m.current_place is null then
    raise exception 'onboarding: an earlier screen is not complete' using errcode = 'P0001';
  end if;
  if coalesce(p_touched, false) then
    if p_stance is null then
      raise exception 'onboarding: a touched card carries a stance' using errcode = '22023';
    end if;
    update public.members set
      stance = p_stance, stance_declared_at = v_now, onboarded_at = v_now, updated_at = v_now
    where id = v_uid;
  else
    update public.members set onboarded_at = v_now, updated_at = v_now where id = v_uid;
  end if;
  select * into m from public.members where id = v_uid;
  return jsonb_build_object(
    'status', 'ok',
    'stance', m.stance,
    'stance_declared_at', m.stance_declared_at,
    'onboarded_at', m.onboarded_at);
end;
$$;

-- The read projection: the first incomplete screen, and the saved values so resume renders what
-- was saved. Nothing about other members. Screen one is incomplete until onboard_who has written;
-- screen two until current_place is set; screen three until onboarded_at is set.
create or replace function public.onboarding_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  m public.members%rowtype;
  v_label text;
begin
  if v_uid is null then return null; end if;
  select * into m from public.members where id = v_uid;
  if m.id is null then return null; end if;
  select s.label into v_label from public.member_stances s where s.stance = m.stance;
  return jsonb_build_object(
    'next', case
      when m.who_completed_at is null then 'who'
      when m.current_place is null then 'where'
      when m.onboarded_at is null then 'relationship'
      else null end,
    'who', jsonb_build_object(
      'name', m.name,
      'username', case when m.who_completed_at is null then null else m.handle end,
      'suggestion', coalesce(private.derive_username(m.name), 'member'),
      'avatar_path', m.avatar_path,
      'completed', m.who_completed_at is not null),
    'where', jsonb_build_object(
      'city', m.current_place,
      'country', m.current_country,
      'completed', m.current_place is not null),
    'relationship', jsonb_build_object(
      'stance', m.stance,
      'stance_label', v_label,
      'declared', m.stance_declared_at is not null,
      'completed', m.onboarded_at is not null),
    'onboarded_at', m.onboarded_at);
end;
$$;

revoke execute on function public.onboard_who(text, text, text) from public, anon;
revoke execute on function public.onboard_where(text, text) from public, anon;
revoke execute on function public.onboard_relationship(public.stance, boolean) from public, anon;
revoke execute on function public.onboarding_state() from public, anon;
grant execute on function public.onboard_who(text, text, text) to authenticated, service_role;
grant execute on function public.onboard_where(text, text) to authenticated, service_role;
grant execute on function public.onboard_relationship(public.stance, boolean) to authenticated, service_role;
grant execute on function public.onboarding_state() to authenticated, service_role;
