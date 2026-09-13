-- B3 Profile: the sign-up trigger, the section saves, the one read projection, the vocabulary read,
-- the public attestation rail, and the publish_post amendment that lets a Connect from a profile
-- name the member.
--
-- save_profile_section(section, payload): one RPC, one section per call, SECURITY INVOKER so every
-- write runs under the owner's own policies; validates caps and vocabulary membership server-side.
-- profile_view(handle, as_public): SECURITY DEFINER; returns exactly what the caller may see, using
-- the same private.can_see_section predicate as the table policies, so the client never filters.

-- ---------------------------------------------------------------------------
-- Handles and the sign-up trigger
-- ---------------------------------------------------------------------------

create or replace function private.slugify(p text)
returns text
language sql immutable strict
as $$
  select nullif(trim(both '-' from regexp_replace(lower(p), '[^a-z0-9]+', '-', 'g')), '');
$$;

-- A free handle from a name: the slug, then slug-2, slug-3, ... Never shorter than two characters.
create or replace function private.mint_handle(p_name text)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_base text := coalesce(private.slugify(p_name), 'member');
  v_try text;
  v_n int := 1;
begin
  v_base := left(v_base, 32);
  if length(v_base) < 2 then v_base := v_base || '-member'; end if;
  v_try := v_base;
  while exists (select 1 from public.members m where m.handle = v_try) loop
    v_n := v_n + 1;
    v_try := v_base || '-' || v_n;
  end loop;
  return v_try;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Member');
begin
  insert into public.members (id, handle, name)
  values (new.id, private.mint_handle(v_name), left(v_name, 80))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_member on auth.users;
create trigger on_auth_user_created_member
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Members who signed up before this migration.
insert into public.members (id, handle, name)
select u.id,
  private.mint_handle(coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'Member')),
  left(coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'Member'), 80)
from auth.users u
where not exists (select 1 from public.members m where m.id = u.id);

revoke execute on function private.slugify(text), private.mint_handle(text), private.handle_new_user()
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Time zone from a written place (ruling 131). "Johannesburg, SAST": the city matched against the
-- IANA names, the abbreviation as the tie-break, then the abbreviation alone (Africa first).
-- Returns null when nothing matches, and the local time line is absent rather than guessed.
-- ---------------------------------------------------------------------------
create or replace function private.tz_from_place(p_place text)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_city text := lower(replace(trim(split_part(coalesce(p_place, ''), ',', 1)), ' ', '_'));
  v_abbr text := upper(trim(split_part(coalesce(p_place, ''), ',', 2)));
  v_tz text;
begin
  if v_city = '' then return null; end if;
  select n.name into v_tz
  from pg_catalog.pg_timezone_names n
  where lower(n.name) like '%/' || v_city
  order by (v_abbr <> '' and upper(n.abbrev) = v_abbr) desc, (n.name like 'Africa/%') desc, n.name
  limit 1;
  if v_tz is null and v_abbr <> '' then
    select n.name into v_tz
    from pg_catalog.pg_timezone_names n
    where upper(n.abbrev) = v_abbr and n.name not like 'posix/%' and n.name not like 'Etc/%'
    order by (n.name like 'Africa/%') desc, n.name
    limit 1;
  end if;
  return v_tz;
end;
$$;
revoke execute on function private.tz_from_place(text) from public, anon;
grant execute on function private.tz_from_place(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- save_profile_section(section text, payload jsonb) returns void
-- sections and payloads:
--   core       {name, headline}
--   about      {about}
--   segment    {segment, timeline, needs, base, offer, support, interests[]}
--   origin     {origin_country, heritage, pathway}
--   where      {current_place, local_tz?}
--   work       {focus[], industries[], regions[]}
--   skills     {skills[]}        languages {languages[]}
--   intent     {intent[], note}
--   links      {website, linkedin, x, instagram}
--   media      {avatar_path?, cover_path?, cover_focus?}   (paths under profile-media/{uid}/)
--   pattern    {pattern}
--   switches   {private?, shared?}
--   visibility {section, audience}
-- ---------------------------------------------------------------------------
create or replace function public.save_profile_section(section text, payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  p jsonb := coalesce(payload, '{}'::jsonb);
  v_name text;
  v_headline text;
  v_text text;
  v_seg public.member_segment;
  v_arr text[];
  v_tz text;
  v_place text;
  v_kind public.link_kind;
  v_url text;
  v_section public.profile_section;
  v_aud public.audience;
  v_path text;
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

  elsif section = 'segment' then
    v_seg := nullif(p ->> 'segment', '')::public.member_segment;
    if v_seg is null then
      raise exception 'save_profile_section: segment required' using errcode = '22023';
    end if;
    update public.members set segment = v_seg, updated_at = now() where id = v_uid;
    insert into public.member_segment_details (member_id, segment, return_timeline, needs, base, offer, support)
    values (
      v_uid, v_seg,
      case when v_seg = 'returnee' then nullif(p ->> 'timeline', '')::public.return_timeline end,
      case when v_seg = 'returnee' then nullif(left(trim(coalesce(p ->> 'needs', '')), 500), '') end,
      case when v_seg = 'anchor' then nullif(left(trim(coalesce(p ->> 'base', '')), 120), '') end,
      case when v_seg = 'anchor' then nullif(left(trim(coalesce(p ->> 'offer', '')), 500), '') end,
      case when v_seg = 'ally' then nullif(left(trim(coalesce(p ->> 'support', '')), 500), '') end
    )
    on conflict (member_id, segment) do update set
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
    update public.members set current_place = v_place, local_tz = v_tz, updated_at = now() where id = v_uid;

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
    update public.members set
      profile_private = coalesce((p ->> 'private')::boolean, profile_private),
      profile_shared = coalesce((p ->> 'shared')::boolean, profile_shared),
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

revoke execute on function public.save_profile_section(text, jsonb) from public, anon;
grant execute on function public.save_profile_section(text, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- profile_view(handle, as_public) returns jsonb, or null when the caller may not open the profile
-- (anonymous and not shared, or no such handle: the same answer, so existence is not disclosed).
-- handle null = the caller's own profile. as_public (owner only) renders the anonymous projection.
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
  v_rows jsonb;
  v_obj jsonb;
  v_tmp text;
begin
  if p_handle is null then
    if v_caller is null then return null; end if;
    select * into m from public.members where id = v_caller;
  else
    select * into m from public.members where handle = lower(p_handle);
  end if;
  if m.id is null then return null; end if;

  v_owner := v_caller is not null and v_caller = m.id and not coalesce(p_as_public, false);
  v_viewer := case when v_owner then v_caller when v_caller = m.id then null else v_caller end;
  if v_viewer is null and not v_owner and not m.profile_shared then return null; end if;
  v_private := m.profile_private and not v_owner;
  v_first := split_part(m.name, ' ', 1);
  v_tier := case
    when exists (select 1 from public.attestations a where a.member_id = m.id) then 'attested'
    when m.identified_at is not null then 'identified'
    else 'account' end;

  -- A section is admitted when the owner is looking, or when private.admit_section allows the
  -- viewer (null viewer = the anonymous rule, which is what "View as public" renders).

  -- About
  if v_owner or (not v_private and private.admit_section(m.id, 'about', v_viewer)) then
    select jsonb_build_object('about', a.about) into v_obj from public.member_about a where a.member_id = m.id;
    if v_owner or v_obj is not null then v_sections := v_sections || jsonb_build_object('about', coalesce(v_obj, '{}'::jsonb)); end if;
  end if;

  -- Segment: the current variant's fields; the owner also gets every variant.
  if v_owner or (not v_private and private.admit_section(m.id, 'segment', v_viewer)) then
    select jsonb_strip_nulls(jsonb_build_object(
      'timeline', d.return_timeline, 'needs', d.needs, 'base', d.base, 'offer', d.offer, 'support', d.support))
    into v_seg_fields from public.member_segment_details d where d.member_id = m.id and d.segment = m.segment;
    v_seg_fields := coalesce(v_seg_fields, '{}'::jsonb);
    if m.segment = 'exploring' then
      select coalesce(jsonb_agg(i.name order by t.position), '[]'::jsonb) into v_rows
      from public.member_interests i join public.interests t on t.name = i.name where i.member_id = m.id;
      v_seg_fields := v_seg_fields || jsonb_build_object('interests', v_rows);
    end if;
    if v_owner then
      select coalesce(jsonb_object_agg(d.segment, jsonb_strip_nulls(jsonb_build_object(
        'timeline', d.return_timeline, 'needs', d.needs, 'base', d.base, 'offer', d.offer, 'support', d.support))), '{}'::jsonb)
      into v_variants from public.member_segment_details d where d.member_id = m.id;
      select coalesce(jsonb_agg(i.name order by t.position), '[]'::jsonb) into v_rows
      from public.member_interests i join public.interests t on t.name = i.name where i.member_id = m.id;
      v_variants := v_variants || jsonb_build_object('exploring', coalesce(v_variants -> 'exploring', '{}'::jsonb) || jsonb_build_object('interests', v_rows));
      v_sections := v_sections || jsonb_build_object('segment', jsonb_build_object('segment', m.segment, 'fields', v_seg_fields, 'variants', v_variants));
    elsif m.segment is not null and (
      v_seg_fields - 'interests' <> '{}'::jsonb or jsonb_array_length(coalesce(v_seg_fields -> 'interests', '[]'::jsonb)) > 0) then
      v_sections := v_sections || jsonb_build_object('segment', jsonb_build_object('segment', m.segment, 'fields', v_seg_fields));
    end if;
  end if;

  -- Origin and heritage
  if v_owner or (not v_private and private.admit_section(m.id, 'origin', v_viewer)) then
    select jsonb_strip_nulls(jsonb_build_object('origin_country', m.origin_country, 'heritage', o.heritage, 'pathway', o.pathway))
    into v_obj from (select 1) s left join public.member_origin o on o.member_id = m.id;
    v_obj := coalesce(v_obj, jsonb_strip_nulls(jsonb_build_object('origin_country', m.origin_country)));
    if v_owner or v_obj <> '{}'::jsonb then v_sections := v_sections || jsonb_build_object('origin', v_obj); end if;
  end if;

  -- Where I am
  if v_owner or (not v_private and private.admit_section(m.id, 'where', v_viewer)) then
    v_obj := jsonb_strip_nulls(jsonb_build_object('current_place', m.current_place, 'local_tz', m.local_tz));
    if v_owner or m.current_place is not null then v_sections := v_sections || jsonb_build_object('where', v_obj); end if;
  end if;

  -- What I work on
  if v_owner or (not v_private and private.admit_section(m.id, 'work', v_viewer)) then
    v_obj := jsonb_build_object(
      'focus', (select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) from public.member_focus_areas j join public.focus_areas t on t.name = j.name where j.member_id = m.id),
      'industries', (select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) from public.member_industries j join public.industries t on t.name = j.name where j.member_id = m.id),
      'regions', (select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) from public.member_regional_expertise j join public.regional_expertise t on t.name = j.name where j.member_id = m.id));
    if v_owner or jsonb_array_length(v_obj -> 'focus') + jsonb_array_length(v_obj -> 'industries') + jsonb_array_length(v_obj -> 'regions') > 0 then
      v_sections := v_sections || jsonb_build_object('work', v_obj);
    end if;
  end if;

  -- Skills
  if v_owner or (not v_private and private.admit_section(m.id, 'skills', v_viewer)) then
    select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) into v_rows
    from public.member_skills j join public.skills t on t.name = j.name where j.member_id = m.id;
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('skills', jsonb_build_object('skills', v_rows)); end if;
  end if;

  -- Languages
  if v_owner or (not v_private and private.admit_section(m.id, 'languages', v_viewer)) then
    select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) into v_rows
    from public.member_languages j join public.languages t on t.name = j.name where j.member_id = m.id;
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('languages', jsonb_build_object('languages', v_rows)); end if;
  end if;

  -- What I am here for
  if v_owner or (not v_private and private.admit_section(m.id, 'intent', v_viewer)) then
    select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) into v_rows
    from public.member_intents j join public.intents t on t.name = j.name where j.member_id = m.id;
    select n.note into v_tmp from public.member_intent n where n.member_id = m.id;
    v_obj := jsonb_strip_nulls(jsonb_build_object('intent', v_rows, 'note', v_tmp));
    if v_owner or jsonb_array_length(v_rows) > 0 or v_tmp is not null then v_sections := v_sections || jsonb_build_object('intent', v_obj); end if;
  end if;

  -- Links
  if v_owner or (not v_private and private.admit_section(m.id, 'links', v_viewer)) then
    select coalesce(jsonb_object_agg(l.kind, l.url), '{}'::jsonb) into v_obj from public.member_links l where l.member_id = m.id;
    if v_owner or v_obj <> '{}'::jsonb then v_sections := v_sections || jsonb_build_object('links', v_obj); end if;
  end if;

  -- Activity (ruling 125): grounded-or-empty, projections over attestations, space_roles, stories.
  if v_owner or (not v_private and private.admit_section(m.id, 'convene', v_viewer)) then
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', e.title, 'sub', 'Attested by ' || am.name || ', ' || a.attester_role, 'when', a.attested_at) order by a.attested_at desc), '[]'::jsonb)
    into v_rows from public.attestations a
    join public.events e on e.id = a.object_id and a.object_kind = 'event'
    join public.members am on am.id = a.attester_member_id
    where a.member_id = m.id and a.c_category = 'convene';
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('convene', v_rows); end if;
  end if;
  if v_owner or (not v_private and private.admit_section(m.id, 'collaborate', v_viewer)) then
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', s.title,
      'sub', (case r.role when 'lead' then 'Lead' else 'Member' end) || ' since ' || to_char(r.created_at, 'Mon YYYY'),
      'completed', s.status = 'completed', 'when', r.created_at) order by r.created_at desc), '[]'::jsonb)
    into v_rows from public.space_roles r join public.spaces s on s.id = r.space_id
    where r.member_id = m.id and r.status = 'active';
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('collaborate', v_rows); end if;
  end if;
  if v_owner or (not v_private and private.admit_section(m.id, 'contribute', v_viewer)) then
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', o.title, 'sub', 'Fulfilled a Need from ' || am.name, 'when', a.attested_at) order by a.attested_at desc), '[]'::jsonb)
    into v_rows from public.attestations a
    join public.opportunities o on o.id = a.object_id and a.object_kind = 'opportunity'
    join public.members am on am.id = a.attester_member_id
    where a.member_id = m.id and a.c_category = 'contribute';
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('contribute', v_rows); end if;
  end if;
  if v_owner or (not v_private and private.admit_section(m.id, 'convey', v_viewer)) then
    select coalesce(jsonb_agg(jsonb_build_object('title', s.title, 'sub', 'Story', 'when', s.created_at, 'post_id', p.id) order by s.created_at desc), '[]'::jsonb)
    into v_rows from public.stories s
    left join public.posts p on p.created_object_kind = 'story' and p.created_object_id = s.id and p.status = 'published'
    where s.author_member_id = m.id;
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('convey', v_rows); end if;
  end if;

  -- Badges (ruling 123): one per attested context, in order Convene, Collaborate, Contribute.
  if v_owner or (not v_private and private.admit_section(m.id, 'badges', v_viewer)) then
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

  -- Relationship, mutuals and shared Spaces: a signed-in visitor only (rulings 118 to 120, 136).
  if v_viewer is not null and not v_owner then
    select case c.status
        when 'accepted' then 'connected'
        when 'pending' then case when c.from_member_id = v_viewer then 'sent' else 'received' end
        else 'none' end
    into v_rel
    from public.connection_requests c
    where c.status in ('accepted', 'pending')
      and ((c.from_member_id = v_viewer and c.to_member_id = m.id) or (c.from_member_id = m.id and c.to_member_id = v_viewer))
    order by (c.status = 'accepted') desc, c.created_at desc
    limit 1;
    v_rel := coalesce(v_rel, 'none');
    v_following := exists (select 1 from public.member_follows f where f.follower_id = v_viewer and f.member_id = m.id);
    v_anchored := private.shares_anchor(v_viewer, m.id);
    if not v_private then
      -- Up to three connections in common, as names (never a count).
      with mine as (
        select case when c.from_member_id = v_viewer then c.to_member_id else c.from_member_id end as other
        from public.connection_requests c where c.status = 'accepted' and v_viewer in (c.from_member_id, c.to_member_id)
      ), theirs as (
        select case when c.from_member_id = m.id then c.to_member_id else c.from_member_id end as other
        from public.connection_requests c where c.status = 'accepted' and m.id in (c.from_member_id, c.to_member_id)
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
    'member', jsonb_build_object(
      'id', m.id, 'handle', m.handle, 'name', m.name, 'headline', m.headline,
      'avatar_path', m.avatar_path, 'cover_path', m.cover_path, 'cover_focus', m.cover_focus,
      'origin_country', m.origin_country, 'current_place', m.current_place, 'local_tz', m.local_tz,
      'segment', m.segment, 'pattern', m.pattern, 'tier', v_tier),
    'switches', case when v_owner then jsonb_build_object('private', m.profile_private, 'shared', m.profile_shared) end,
    'private', v_private,
    'sections', v_sections,
    'badges', v_badges,
    'visibility', v_vis,
    'relationship', case when v_viewer is not null and not v_owner then jsonb_build_object('state', v_rel, 'following', v_following) end,
    'mutuals', v_mutuals,
    'shared_spaces', v_shared_spaces,
    'anchored', v_anchored,
    'dia_line', v_dia
  ));
end;
$$;

revoke execute on function public.profile_view(text, boolean) from public;
grant execute on function public.profile_view(text, boolean) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- profile_vocabularies(): every list the edit form offers, in one read.
-- ---------------------------------------------------------------------------
create or replace function public.profile_vocabularies()
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
    'heritage', (select jsonb_agg(x) from unnest(enum_range(null::public.heritage_kind)) x),
    'pathway', (select jsonb_agg(x) from unnest(enum_range(null::public.return_pathway)) x),
    'timeline', (select jsonb_agg(x) from unnest(enum_range(null::public.return_timeline)) x)
  );
$$;
revoke execute on function public.profile_vocabularies() from public, anon;
grant execute on function public.profile_vocabularies() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- public_attestations(): the rail in the public C sheets (ruling 135). Attestations across DNA
-- whose member set Badges to Everyone on DNA and shares a profile that is not private; newest
-- first, twelve per C. Anonymous-callable; nothing else about those members is returned.
-- ---------------------------------------------------------------------------
create or replace function public.public_attestations()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with eligible as (
    select a.*, mm.name as member_name, mm.handle as member_handle, mm.avatar_path, am.name as attester_name,
      coalesce(e.title, s.title, o.title, 'Attested') as object_title,
      row_number() over (partition by a.c_category order by a.attested_at desc) as rn
    from public.attestations a
    join public.members mm on mm.id = a.member_id and mm.profile_shared and not mm.profile_private
    join public.members am on am.id = a.attester_member_id
    left join public.events e on a.object_kind = 'event' and e.id = a.object_id
    left join public.spaces s on a.object_kind = 'space' and s.id = a.object_id
    left join public.opportunities o on a.object_kind = 'opportunity' and o.id = a.object_id
    where private.section_audience(a.member_id, 'badges') = 'everyone'
  )
  select coalesce(jsonb_object_agg(c, items), '{}'::jsonb)
  from (
    select c_category::text as c, jsonb_agg(jsonb_build_object(
      'member', member_name, 'handle', member_handle, 'avatar_path', avatar_path,
      'object', object_title, 'attester', attester_name, 'role', attester_role, 'when', attested_at,
      'c', c_category, 'object_kind', object_kind, 'object_id', object_id) order by attested_at desc) as items
    from eligible where rn <= 12 group by c_category
  ) g;
$$;
revoke execute on function public.public_attestations() from public;
grant execute on function public.public_attestations() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- publish_post: a Connect opened from a profile carries the member as its anchor; the request then
-- names that member (to_member_id) so the relationship state ("Request sent", "Request received",
-- Accept, Decline) is real. Everything else in the function is unchanged from B1.
-- ---------------------------------------------------------------------------
create or replace function public.publish_post(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_post_id uuid := coalesce((payload ->> 'id')::uuid, gen_random_uuid());
  v_verb text := nullif(payload ->> 'verb', '');
  v_c public.c_category;
  v_body text := coalesce(payload ->> 'body', '');
  v_author_kind public.anchor_kind := (payload ->> 'author_kind')::public.anchor_kind;
  v_author_id uuid := (payload ->> 'author_id')::uuid;
  v_anchor_kind public.anchor_kind := nullif(payload -> 'anchor' ->> 'kind', '')::public.anchor_kind;
  v_anchor_id uuid := nullif(payload -> 'anchor' ->> 'id', '')::uuid;
  v_audience public.audience := coalesce(nullif(payload ->> 'audience', ''), 'everyone')::public.audience;
  v_host_context text := coalesce(payload ->> 'host_context', 'feed');
  f jsonb := coalesce(payload -> 'fields', '{}'::jsonb);
  v_title text;
  v_space_id uuid;
  v_event_id uuid;
  v_obj_kind public.anchor_kind;
  v_obj_id uuid;
  v_place text;
  v_mode public.event_mode;
  v_roles jsonb;
  v_instrument public.contribute_instrument;
  v_to_member uuid;
  m jsonb;
begin
  if v_uid is null then
    raise exception 'publish_post: not signed in' using errcode = '42501';
  end if;
  if v_verb is not null and v_verb not in ('connect', 'convene', 'collaborate', 'contribute', 'convey') then
    raise exception 'publish_post: unknown verb %', v_verb using errcode = '22023';
  end if;
  v_c := coalesce(v_verb, 'convey')::public.c_category;
  if v_c = 'system' then
    raise exception 'publish_post: system is platform-only' using errcode = '22023';
  end if;
  if v_author_kind is null or v_author_id is null or v_author_kind not in ('member', 'space') then
    raise exception 'publish_post: author required' using errcode = '22023';
  end if;
  if not private.can_author_as(v_author_kind, v_author_id) then
    raise exception 'publish_post: no right to author as this %', v_author_kind using errcode = '42501';
  end if;
  if (v_anchor_kind is null) <> (v_anchor_id is null) then
    raise exception 'publish_post: anchor needs kind and id' using errcode = '22023';
  end if;
  if v_audience = 'anchored' and v_anchor_kind is null then
    raise exception 'publish_post: anchored audience needs an anchor' using errcode = '22023';
  end if;
  if length(trim(v_body)) = 0
     and jsonb_array_length(coalesce(payload -> 'media', '[]'::jsonb)) = 0
     and nullif(payload -> 'link' ->> 'url', '') is null
     and v_verb is null then
    raise exception 'publish_post: nothing to publish' using errcode = '22023';
  end if;

  v_title := coalesce(nullif(trim(f ->> 'title'), ''), nullif(left(split_part(trim(v_body), E'\n', 1), 80), ''), 'Untitled');
  v_space_id := case when v_anchor_kind = 'space' then v_anchor_id else null end;
  v_event_id := case when v_anchor_kind = 'event' then v_anchor_id else null end;

  if v_verb = 'connect' then
    -- B3: a member anchor names the request's recipient (a Connect from that member's profile).
    v_to_member := case when v_anchor_kind = 'member' and v_anchor_id <> v_uid
      and exists (select 1 from public.members mm where mm.id = v_anchor_id) then v_anchor_id end;
    insert into public.connection_requests (from_member_id, to_member_id, to_name, why, status)
    values (v_uid, v_to_member, coalesce(f ->> 'who', ''), coalesce(nullif(f ->> 'why', ''), nullif(v_body, '')), 'pending')
    returning id into v_obj_id;
    v_obj_kind := 'connection_request';

  elsif v_verb = 'convene' then
    v_place := nullif(trim(f ->> 'place'), '');
    v_mode := (case
      when coalesce((f ->> 'hybrid')::boolean, false) then 'hybrid'
      when v_place ~* '^(https?://|www\.)' then 'virtual'
      else 'in_person' end)::public.event_mode;
    insert into public.events (host_member_id, title, starts_at, when_text, mode, location, virtual_url, ticket_kind, space_id)
    values (
      v_uid, v_title,
      nullif(payload ->> 'starts_at', '')::timestamptz,
      concat_ws(E'\n', nullif(trim(f ->> 'date'), ''), nullif(trim(f ->> 'time'), '')),
      v_mode,
      case when v_place is not null and v_mode <> 'virtual' then jsonb_build_object('text', v_place) else null end,
      case when v_mode = 'virtual' then v_place else null end,
      (case when lower(coalesce(f ->> 'ticket', 'Free')) = 'paid' then 'paid' else 'free' end)::public.ticket_kind,
      v_space_id
    ) returning id into v_obj_id;
    v_obj_kind := 'event';

  elsif v_verb = 'collaborate' then
    select coalesce(jsonb_agg(trim(r)), '[]'::jsonb) into v_roles
    from unnest(string_to_array(coalesce(f ->> 'roles', ''), ',')) as r
    where length(trim(r)) > 0;
    insert into public.spaces (owner_member_id, title, category, description, roles_sought, status)
    values (v_uid, v_title, nullif(trim(f ->> 'category'), ''), nullif(v_body, ''), v_roles, 'active')
    returning id into v_obj_id;
    insert into public.space_roles (space_id, member_id, role, status) values (v_obj_id, v_uid, 'lead', 'active');
    v_obj_kind := 'space';

  elsif v_verb = 'contribute' then
    v_instrument := (case lower(coalesce(f ->> 'instrument', ''))
      when 'skills' then 'skills' when 'in-kind' then 'in_kind' when 'in_kind' then 'in_kind' else 'time' end)::public.contribute_instrument;
    insert into public.opportunities (receiver_member_id, title, instrument, need, by_date, by_text, space_id, event_id)
    values (
      v_uid, v_title, v_instrument,
      coalesce(nullif(f ->> 'need', ''), nullif(v_body, '')),
      nullif(payload ->> 'by_date', '')::date,
      coalesce(f ->> 'by', ''),
      v_space_id, v_event_id
    ) returning id into v_obj_id;
    v_obj_kind := 'opportunity';

  elsif v_verb = 'convey' then
    insert into public.stories (author_member_id, title, body, origin_kind, origin_id)
    values (v_uid, v_title, v_body, v_anchor_kind, v_anchor_id)
    returning id into v_obj_id;
    v_obj_kind := 'story';
  end if;

  insert into public.posts (id, author_kind, author_id, created_by, c_category, body, anchor_kind, anchor_id,
                            created_object_kind, created_object_id, audience, status, published_at)
  values (v_post_id, v_author_kind, v_author_id, v_uid, v_c, v_body, v_anchor_kind, v_anchor_id,
          v_obj_kind, v_obj_id, v_audience, 'published', now());

  for m in select * from jsonb_array_elements(coalesce(payload -> 'media', '[]'::jsonb)) loop
    insert into public.post_media (post_id, storage_path, width, height, position)
    values (v_post_id, m ->> 'storage_path', (m ->> 'width')::int, (m ->> 'height')::int, coalesce((m ->> 'position')::int, 0));
  end loop;

  if nullif(payload -> 'link' ->> 'url', '') is not null then
    insert into public.post_links (post_id, url, title, description, image_url, fetched_at)
    values (v_post_id, payload -> 'link' ->> 'url', payload -> 'link' ->> 'title',
            payload -> 'link' ->> 'description', payload -> 'link' ->> 'image_url',
            case when payload -> 'link' ->> 'title' is not null then now() else null end);
  end if;

  if payload ? 'dia' and jsonb_typeof(payload -> 'dia') = 'object' then
    insert into public.post_dia (post_id, verb, confidence, proposed_fields, accepted, member_overrode, latency_ms)
    values (
      v_post_id,
      nullif(payload -> 'dia' ->> 'verb', '')::public.c_category,
      nullif(payload -> 'dia' ->> 'confidence', '')::numeric,
      coalesce(payload -> 'dia' -> 'proposed_fields', '{}'::jsonb),
      coalesce((payload -> 'dia' ->> 'accepted')::boolean, false),
      coalesce((payload -> 'dia' ->> 'member_overrode')::boolean, false),
      nullif(payload -> 'dia' ->> 'latency_ms', '')::int
    );
  end if;

  delete from public.post_drafts where member_id = v_uid and host_context = v_host_context;

  return v_post_id;
end;
$$;
