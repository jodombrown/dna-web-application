-- B3 Profile: helper predicates, privileges, RLS policies, storage policies.
--
-- Personas: owner (the member whose profile it is), member (any other signed-in member: the core
-- row is always visible, sections by audience), Space lead and event host (no access beyond member;
-- a shared Space role or a shared attested event is what qualifies a member for Anchored sections,
-- ruling 136), admin (read all, remove any), service role (Edge Functions and the engines that write
-- attestations), anonymous (the public page: the core row of a shared profile and its Everyone
-- sections only; a non-shared profile returns no rows, ruling 139). Default-deny throughout.
--
-- The audience rules live here, in private.can_see_section, and profile_view (rpcs migration) calls
-- the same predicate, so the database decides what a viewer sees and the client never filters.

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER, STABLE, empty search_path; schema private is not exposed by PostgREST).
-- ---------------------------------------------------------------------------

-- Ruling 136: a visitor shares an anchor with the owner when both hold an active role in the same
-- Space, or both appear on an attestation at the same event (as the attested member or the host who
-- attested). Segment is not a qualifier.
create or replace function private.shares_anchor(p_a uuid, p_b uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_a is not null and p_b is not null and p_a <> p_b and (
    exists (
      select 1 from public.space_roles ra
      join public.space_roles rb on rb.space_id = ra.space_id
      where ra.member_id = p_a and rb.member_id = p_b
        and ra.status = 'active' and rb.status = 'active'
    )
    or exists (
      select 1 from public.attestations xa
      join public.attestations xb
        on xb.object_kind = 'event' and xb.object_id = xa.object_id
      where xa.object_kind = 'event'
        and p_a in (xa.member_id, xa.attester_member_id)
        and p_b in (xb.member_id, xb.attester_member_id)
    )
  );
$$;

-- The audience a section carries: the stored row, or the default (My connections for links,
-- Everyone on DNA otherwise).
create or replace function private.section_audience(p_member uuid, p_section public.profile_section)
returns public.audience
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select v.audience from public.member_visibility v where v.member_id = p_member and v.section = p_section),
    case when p_section = 'links' then 'connections'::public.audience else 'everyone'::public.audience end
  );
$$;

-- May this viewer (null = anonymous) see this section of this member's profile?
-- Owner: always. Private profile: nobody else. Anonymous: only a shared profile's Everyone sections.
-- Member: Everyone; My connections with an accepted connection; Anchored with a shared anchor.
-- profile_view passes the viewer explicitly (the owner's "View as public" evaluates the anonymous
-- rule); the table policies pass auth.uid() through can_see_section below.
create or replace function private.admit_section(p_member uuid, p_section public.profile_section, p_viewer uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when p_viewer is not null and p_viewer = p_member then true
    when exists (select 1 from public.members m where m.id = p_member and m.profile_private) then false
    when p_viewer is null then
      exists (select 1 from public.members m where m.id = p_member and m.profile_shared)
      and private.section_audience(p_member, p_section) = 'everyone'
    else
      case private.section_audience(p_member, p_section)
        when 'everyone' then true
        when 'connections' then private.is_connected(p_viewer, p_member)
        when 'anchored' then private.shares_anchor(p_viewer, p_member)
        else false
      end
  end;
$$;

create or replace function private.can_see_section(p_member uuid, p_section public.profile_section)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.admit_section(p_member, p_section, auth.uid());
$$;

-- May the caller see this member's core row? Signed-in members always; anonymous when shared.
create or replace function private.can_see_core(p_member uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when auth.uid() is not null then true
    else exists (select 1 from public.members m where m.id = p_member and m.profile_shared)
  end;
$$;

-- A uuid from a storage folder name, or null; policies on storage.objects must not throw on
-- other buckets' paths.
create or replace function private.uuid_or_null(p text)
returns uuid
language sql immutable strict
as $$
  select case when p ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p::uuid else null end;
$$;

-- Vocabulary caps (ruling 122), enforced at the row so no write path can exceed them.
create or replace function private.enforce_vocab_cap()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_cap int := tg_argv[0]::int;
  v_n int;
begin
  execute format('select count(*) from %I.%I where member_id = $1', tg_table_schema, tg_table_name)
    into v_n using new.member_id;
  if v_n >= v_cap then
    raise exception '%: up to % allowed', tg_table_name, v_cap using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger member_focus_areas_cap before insert on public.member_focus_areas
  for each row execute function private.enforce_vocab_cap('3');
create trigger member_industries_cap before insert on public.member_industries
  for each row execute function private.enforce_vocab_cap('3');
create trigger member_regional_expertise_cap before insert on public.member_regional_expertise
  for each row execute function private.enforce_vocab_cap('3');
create trigger member_skills_cap before insert on public.member_skills
  for each row execute function private.enforce_vocab_cap('5');
create trigger member_languages_cap before insert on public.member_languages
  for each row execute function private.enforce_vocab_cap('6');
create trigger member_intents_cap before insert on public.member_intents
  for each row execute function private.enforce_vocab_cap('3');
create trigger member_interests_cap before insert on public.member_interests
  for each row execute function private.enforce_vocab_cap('5');

revoke execute on function
  private.shares_anchor(uuid, uuid), private.section_audience(uuid, public.profile_section),
  private.admit_section(uuid, public.profile_section, uuid),
  private.can_see_section(uuid, public.profile_section), private.can_see_core(uuid),
  private.enforce_vocab_cap(), private.uuid_or_null(text)
from public, anon;
grant execute on function
  private.shares_anchor(uuid, uuid), private.section_audience(uuid, public.profile_section),
  private.can_see_section(uuid, public.profile_section), private.can_see_core(uuid)
to authenticated, service_role;
-- The public page runs these through the anon role's policies.
grant usage on schema private to anon;
grant execute on function
  private.can_see_section(uuid, public.profile_section), private.can_see_core(uuid),
  private.section_audience(uuid, public.profile_section), private.uuid_or_null(text)
to anon;
grant execute on function private.uuid_or_null(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Privileges. Reads by anon and authenticated go through the policies below; the core row of a
-- shared profile is the first anonymous read in the product (ruling 139). Writes belong to the
-- owner (save_profile_section, SECURITY INVOKER) or the service role.
-- ---------------------------------------------------------------------------

grant select (id, handle, name, headline, avatar_path, cover_path, cover_focus, origin_country,
  current_place, local_tz, segment, pattern, identified_at, created_at)
  on table public.members to anon;
grant select on table public.members to authenticated;
-- The owner edits the core row and the switches through save_profile_section; handle and the
-- Identified mark (identified_at) are never a member's to write.
grant update (name, headline, avatar_path, cover_path, cover_focus, origin_country, current_place,
  local_tz, segment, pattern, profile_private, profile_shared, updated_at)
  on table public.members to authenticated;
grant all on table public.members to service_role;

grant select on table public.focus_areas, public.industries, public.regional_expertise, public.skills,
  public.languages, public.intents, public.interests, public.countries to authenticated;
grant all on table public.focus_areas, public.industries, public.regional_expertise, public.skills,
  public.languages, public.intents, public.interests, public.countries to service_role;

grant select on table public.member_focus_areas, public.member_industries,
  public.member_regional_expertise, public.member_skills, public.member_languages,
  public.member_intents, public.member_interests, public.member_segment_details, public.member_links,
  public.member_about, public.member_origin, public.member_intent, public.attestations to anon;
grant select, insert, update, delete on table public.member_focus_areas, public.member_industries,
  public.member_regional_expertise, public.member_skills, public.member_languages,
  public.member_intents, public.member_interests, public.member_segment_details, public.member_links,
  public.member_about, public.member_origin, public.member_intent, public.member_visibility,
  public.member_follows to authenticated;
grant select on table public.attestations to authenticated;
grant all on table public.member_focus_areas, public.member_industries,
  public.member_regional_expertise, public.member_skills, public.member_languages,
  public.member_intents, public.member_interests, public.member_segment_details, public.member_links,
  public.member_about, public.member_origin, public.member_intent, public.member_visibility,
  public.member_follows, public.attestations to service_role;

-- ---------------------------------------------------------------------------
-- members (core row and switches)
-- ---------------------------------------------------------------------------
-- owner: own row, read and write. Insert is the sign-up trigger's (service context), never a member's.
create policy members_owner_select on public.members for select to authenticated
using (id = (select auth.uid()));
create policy members_owner_update on public.members for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- member: every core row (ruling 127: the core row is always visible to signed-in members).
create policy members_member_select on public.members for select to authenticated
using (true);
-- Space lead, event host: no access beyond member.
-- admin: read all (members_member_select), delete a member's profile row.
create policy members_admin_delete on public.members for delete to authenticated
using (private.is_admin());
-- anonymous: a shared profile's core row (columns limited by the grant above).
create policy members_anon_select on public.members for select to anon
using (profile_shared);
-- service role.
create policy members_service_role on public.members for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Vocabularies: reference data, readable by members, written by migrations and the service role.
-- ---------------------------------------------------------------------------
create policy focus_areas_member_select on public.focus_areas for select to authenticated using (true);
create policy focus_areas_service_role on public.focus_areas for all to service_role using (true) with check (true);
create policy industries_member_select on public.industries for select to authenticated using (true);
create policy industries_service_role on public.industries for all to service_role using (true) with check (true);
create policy regional_expertise_member_select on public.regional_expertise for select to authenticated using (true);
create policy regional_expertise_service_role on public.regional_expertise for all to service_role using (true) with check (true);
create policy skills_member_select on public.skills for select to authenticated using (true);
create policy skills_service_role on public.skills for all to service_role using (true) with check (true);
create policy languages_member_select on public.languages for select to authenticated using (true);
create policy languages_service_role on public.languages for all to service_role using (true) with check (true);
create policy intents_member_select on public.intents for select to authenticated using (true);
create policy intents_service_role on public.intents for all to service_role using (true) with check (true);
create policy interests_member_select on public.interests for select to authenticated using (true);
create policy interests_service_role on public.interests for all to service_role using (true) with check (true);
create policy countries_member_select on public.countries for select to authenticated using (true);
create policy countries_service_role on public.countries for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Section tables. One pattern each: owner writes own rows; any viewer (member or anonymous) reads
-- rows only when private.can_see_section admits them for that section; Space lead and event host
-- have no access beyond member; admin reads all; service role everything.
-- ---------------------------------------------------------------------------

-- about
create policy member_about_viewer_select on public.member_about for select to authenticated, anon
using (private.can_see_section(member_id, 'about'));
create policy member_about_owner_write on public.member_about for insert to authenticated
with check (member_id = (select auth.uid()));
create policy member_about_owner_update on public.member_about for update to authenticated
using (member_id = (select auth.uid())) with check (member_id = (select auth.uid()));
create policy member_about_owner_delete on public.member_about for delete to authenticated
using (member_id = (select auth.uid()));
create policy member_about_admin_select on public.member_about for select to authenticated using (private.is_admin());
create policy member_about_service_role on public.member_about for all to service_role using (true) with check (true);

-- origin (heritage, pathway)
create policy member_origin_viewer_select on public.member_origin for select to authenticated, anon
using (private.can_see_section(member_id, 'origin'));
create policy member_origin_owner_write on public.member_origin for insert to authenticated
with check (member_id = (select auth.uid()));
create policy member_origin_owner_update on public.member_origin for update to authenticated
using (member_id = (select auth.uid())) with check (member_id = (select auth.uid()));
create policy member_origin_owner_delete on public.member_origin for delete to authenticated
using (member_id = (select auth.uid()));
create policy member_origin_admin_select on public.member_origin for select to authenticated using (private.is_admin());
create policy member_origin_service_role on public.member_origin for all to service_role using (true) with check (true);

-- intent note
create policy member_intent_viewer_select on public.member_intent for select to authenticated, anon
using (private.can_see_section(member_id, 'intent'));
create policy member_intent_owner_write on public.member_intent for insert to authenticated
with check (member_id = (select auth.uid()));
create policy member_intent_owner_update on public.member_intent for update to authenticated
using (member_id = (select auth.uid())) with check (member_id = (select auth.uid()));
create policy member_intent_owner_delete on public.member_intent for delete to authenticated
using (member_id = (select auth.uid()));
create policy member_intent_admin_select on public.member_intent for select to authenticated using (private.is_admin());
create policy member_intent_service_role on public.member_intent for all to service_role using (true) with check (true);

-- work: focus areas, industries, regional expertise
create policy member_focus_areas_viewer_select on public.member_focus_areas for select to authenticated, anon
using (private.can_see_section(member_id, 'work'));
create policy member_focus_areas_owner_insert on public.member_focus_areas for insert to authenticated
with check (member_id = (select auth.uid()));
create policy member_focus_areas_owner_delete on public.member_focus_areas for delete to authenticated
using (member_id = (select auth.uid()));
create policy member_focus_areas_admin_select on public.member_focus_areas for select to authenticated using (private.is_admin());
create policy member_focus_areas_service_role on public.member_focus_areas for all to service_role using (true) with check (true);

create policy member_industries_viewer_select on public.member_industries for select to authenticated, anon
using (private.can_see_section(member_id, 'work'));
create policy member_industries_owner_insert on public.member_industries for insert to authenticated
with check (member_id = (select auth.uid()));
create policy member_industries_owner_delete on public.member_industries for delete to authenticated
using (member_id = (select auth.uid()));
create policy member_industries_admin_select on public.member_industries for select to authenticated using (private.is_admin());
create policy member_industries_service_role on public.member_industries for all to service_role using (true) with check (true);

create policy member_regional_expertise_viewer_select on public.member_regional_expertise for select to authenticated, anon
using (private.can_see_section(member_id, 'work'));
create policy member_regional_expertise_owner_insert on public.member_regional_expertise for insert to authenticated
with check (member_id = (select auth.uid()));
create policy member_regional_expertise_owner_delete on public.member_regional_expertise for delete to authenticated
using (member_id = (select auth.uid()));
create policy member_regional_expertise_admin_select on public.member_regional_expertise for select to authenticated using (private.is_admin());
create policy member_regional_expertise_service_role on public.member_regional_expertise for all to service_role using (true) with check (true);

-- skills
create policy member_skills_viewer_select on public.member_skills for select to authenticated, anon
using (private.can_see_section(member_id, 'skills'));
create policy member_skills_owner_insert on public.member_skills for insert to authenticated
with check (member_id = (select auth.uid()));
create policy member_skills_owner_delete on public.member_skills for delete to authenticated
using (member_id = (select auth.uid()));
create policy member_skills_admin_select on public.member_skills for select to authenticated using (private.is_admin());
create policy member_skills_service_role on public.member_skills for all to service_role using (true) with check (true);

-- languages
create policy member_languages_viewer_select on public.member_languages for select to authenticated, anon
using (private.can_see_section(member_id, 'languages'));
create policy member_languages_owner_insert on public.member_languages for insert to authenticated
with check (member_id = (select auth.uid()));
create policy member_languages_owner_delete on public.member_languages for delete to authenticated
using (member_id = (select auth.uid()));
create policy member_languages_admin_select on public.member_languages for select to authenticated using (private.is_admin());
create policy member_languages_service_role on public.member_languages for all to service_role using (true) with check (true);

-- intent (chips)
create policy member_intents_viewer_select on public.member_intents for select to authenticated, anon
using (private.can_see_section(member_id, 'intent'));
create policy member_intents_owner_insert on public.member_intents for insert to authenticated
with check (member_id = (select auth.uid()));
create policy member_intents_owner_delete on public.member_intents for delete to authenticated
using (member_id = (select auth.uid()));
create policy member_intents_admin_select on public.member_intents for select to authenticated using (private.is_admin());
create policy member_intents_service_role on public.member_intents for all to service_role using (true) with check (true);

-- segment: interests and the per-variant details
create policy member_interests_viewer_select on public.member_interests for select to authenticated, anon
using (private.can_see_section(member_id, 'segment'));
create policy member_interests_owner_insert on public.member_interests for insert to authenticated
with check (member_id = (select auth.uid()));
create policy member_interests_owner_delete on public.member_interests for delete to authenticated
using (member_id = (select auth.uid()));
create policy member_interests_admin_select on public.member_interests for select to authenticated using (private.is_admin());
create policy member_interests_service_role on public.member_interests for all to service_role using (true) with check (true);

-- A viewer sees only the variant the member currently stands in; the other variants' data is the
-- owner's (kept so changing the segment loses nothing, SPEC section 4).
create policy member_segment_details_viewer_select on public.member_segment_details for select to authenticated, anon
using (
  private.can_see_section(member_id, 'segment')
  and (member_id = (select auth.uid())
    or exists (select 1 from public.members m where m.id = member_id and m.segment = member_segment_details.segment))
);
create policy member_segment_details_owner_insert on public.member_segment_details for insert to authenticated
with check (member_id = (select auth.uid()));
create policy member_segment_details_owner_update on public.member_segment_details for update to authenticated
using (member_id = (select auth.uid())) with check (member_id = (select auth.uid()));
create policy member_segment_details_owner_delete on public.member_segment_details for delete to authenticated
using (member_id = (select auth.uid()));
create policy member_segment_details_admin_select on public.member_segment_details for select to authenticated using (private.is_admin());
create policy member_segment_details_service_role on public.member_segment_details for all to service_role using (true) with check (true);

-- links (default audience My connections)
create policy member_links_viewer_select on public.member_links for select to authenticated, anon
using (private.can_see_section(member_id, 'links'));
create policy member_links_owner_insert on public.member_links for insert to authenticated
with check (member_id = (select auth.uid()));
create policy member_links_owner_update on public.member_links for update to authenticated
using (member_id = (select auth.uid())) with check (member_id = (select auth.uid()));
create policy member_links_owner_delete on public.member_links for delete to authenticated
using (member_id = (select auth.uid()));
create policy member_links_admin_select on public.member_links for select to authenticated using (private.is_admin());
create policy member_links_service_role on public.member_links for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- member_visibility: the owner's audience settings. Nobody else reads them (a hidden section leaves
-- no trace, not even its setting). Space lead, event host: none. admin: read. service role: all.
-- ---------------------------------------------------------------------------
create policy member_visibility_owner_select on public.member_visibility for select to authenticated
using (member_id = (select auth.uid()));
create policy member_visibility_owner_insert on public.member_visibility for insert to authenticated
with check (member_id = (select auth.uid()));
create policy member_visibility_owner_update on public.member_visibility for update to authenticated
using (member_id = (select auth.uid())) with check (member_id = (select auth.uid()));
create policy member_visibility_owner_delete on public.member_visibility for delete to authenticated
using (member_id = (select auth.uid()));
create policy member_visibility_admin_select on public.member_visibility for select to authenticated using (private.is_admin());
create policy member_visibility_service_role on public.member_visibility for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- member_follows: the follower's own rows only. The followed member never reads follower rows
-- (no follower list, no count, ruling 120). Space lead, event host: none. admin: read, remove.
-- ---------------------------------------------------------------------------
create policy member_follows_follower_select on public.member_follows for select to authenticated
using (follower_id = (select auth.uid()));
create policy member_follows_follower_insert on public.member_follows for insert to authenticated
with check (follower_id = (select auth.uid()));
create policy member_follows_follower_delete on public.member_follows for delete to authenticated
using (follower_id = (select auth.uid()));
create policy member_follows_admin_select on public.member_follows for select to authenticated using (private.is_admin());
create policy member_follows_admin_delete on public.member_follows for delete to authenticated using (private.is_admin());
create policy member_follows_service_role on public.member_follows for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- attestations: the attested member and the attester read their own; other viewers read a row when
-- the owner's badges or that C's activity section admits them (both project over this table).
-- No member insert path in this brief: the counterparty's engine writes through the service role
-- (CLAUDE.md: confirmed flags are set only by the counterparty, never by inference or by DIA).
-- Space lead and event host write nothing here until their engines ship. admin: read, remove.
-- ---------------------------------------------------------------------------
create policy attestations_party_select on public.attestations for select to authenticated
using (member_id = (select auth.uid()) or attester_member_id = (select auth.uid()));
create policy attestations_viewer_select on public.attestations for select to authenticated, anon
using (
  private.can_see_section(member_id, 'badges')
  or private.can_see_section(member_id, c_category::text::public.profile_section)
);
create policy attestations_admin_select on public.attestations for select to authenticated using (private.is_admin());
create policy attestations_admin_delete on public.attestations for delete to authenticated using (private.is_admin());
create policy attestations_service_role on public.attestations for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Storage: profile-media. Read when the owner's core row is visible to the caller (signed-in
-- members always; anonymous when shared). Writes are the media-upload function's (service role);
-- the owner may remove their own files. Space lead, event host: member access. admin: read all.
-- ---------------------------------------------------------------------------
create policy profile_media_objects_viewer_select on storage.objects for select to authenticated, anon
using (
  bucket_id = 'profile-media'
  and private.can_see_core(private.uuid_or_null((storage.foldername(name))[1]))
);
create policy profile_media_objects_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy profile_media_objects_admin_select on storage.objects for select to authenticated
using (bucket_id = 'profile-media' and private.is_admin());
create policy profile_media_objects_service_role on storage.objects for all to service_role
using (bucket_id = 'profile-media') with check (bucket_id = 'profile-media');
