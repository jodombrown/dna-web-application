-- Brief 3 follow-on rulings.
-- Ruling 142: Country of origin and heritage keep the African list (countries); Current location
--   draws from a full world list (world_countries), both database tables read by the form and,
--   later, by Connect's filters. members.current_country joins current_place (city and time zone).
-- Ruling 141: a member's name never reaches a signed-out page through another member's content
--   unless their own Share switch is on. Third parties render as a role otherwise.
-- Ruling 144: accepting a connection request notifies the requester (connection_accepted);
--   declining writes nothing (ruling 119).
-- Anon's column grant on members trims to the core row: identified_at and created_at leave it.

-- ---------------------------------------------------------------------------
-- Ruling 142: world_countries
-- ---------------------------------------------------------------------------
create table public.world_countries (name text primary key, position smallint not null unique);
alter table public.world_countries enable row level security;
comment on table public.world_countries is 'Current location list (ruling 142): every UN member state plus Palestine and Vatican City. Origin and heritage use public.countries (African states).';
insert into public.world_countries (name, position) values
  ('Afghanistan', 1),
  ('Albania', 2),
  ('Algeria', 3),
  ('Andorra', 4),
  ('Angola', 5),
  ('Antigua and Barbuda', 6),
  ('Argentina', 7),
  ('Armenia', 8),
  ('Australia', 9),
  ('Austria', 10),
  ('Azerbaijan', 11),
  ('Bahamas', 12),
  ('Bahrain', 13),
  ('Bangladesh', 14),
  ('Barbados', 15),
  ('Belarus', 16),
  ('Belgium', 17),
  ('Belize', 18),
  ('Benin', 19),
  ('Bhutan', 20),
  ('Bolivia', 21),
  ('Bosnia and Herzegovina', 22),
  ('Botswana', 23),
  ('Brazil', 24),
  ('Brunei', 25),
  ('Bulgaria', 26),
  ('Burkina Faso', 27),
  ('Burundi', 28),
  ('Cabo Verde', 29),
  ('Cambodia', 30),
  ('Cameroon', 31),
  ('Canada', 32),
  ('Central African Republic', 33),
  ('Chad', 34),
  ('Chile', 35),
  ('China', 36),
  ('Colombia', 37),
  ('Comoros', 38),
  ('Congo', 39),
  ('Costa Rica', 40),
  ('Côte d''Ivoire', 41),
  ('Croatia', 42),
  ('Cuba', 43),
  ('Cyprus', 44),
  ('Czechia', 45),
  ('Democratic Republic of the Congo', 46),
  ('Denmark', 47),
  ('Djibouti', 48),
  ('Dominica', 49),
  ('Dominican Republic', 50),
  ('Ecuador', 51),
  ('Egypt', 52),
  ('El Salvador', 53),
  ('Equatorial Guinea', 54),
  ('Eritrea', 55),
  ('Estonia', 56),
  ('Eswatini', 57),
  ('Ethiopia', 58),
  ('Fiji', 59),
  ('Finland', 60),
  ('France', 61),
  ('Gabon', 62),
  ('Gambia', 63),
  ('Georgia', 64),
  ('Germany', 65),
  ('Ghana', 66),
  ('Greece', 67),
  ('Grenada', 68),
  ('Guatemala', 69),
  ('Guinea', 70),
  ('Guinea-Bissau', 71),
  ('Guyana', 72),
  ('Haiti', 73),
  ('Honduras', 74),
  ('Hungary', 75),
  ('Iceland', 76),
  ('India', 77),
  ('Indonesia', 78),
  ('Iran', 79),
  ('Iraq', 80),
  ('Ireland', 81),
  ('Israel', 82),
  ('Italy', 83),
  ('Jamaica', 84),
  ('Japan', 85),
  ('Jordan', 86),
  ('Kazakhstan', 87),
  ('Kenya', 88),
  ('Kiribati', 89),
  ('Kuwait', 90),
  ('Kyrgyzstan', 91),
  ('Laos', 92),
  ('Latvia', 93),
  ('Lebanon', 94),
  ('Lesotho', 95),
  ('Liberia', 96),
  ('Libya', 97),
  ('Liechtenstein', 98),
  ('Lithuania', 99),
  ('Luxembourg', 100),
  ('Madagascar', 101),
  ('Malawi', 102),
  ('Malaysia', 103),
  ('Maldives', 104),
  ('Mali', 105),
  ('Malta', 106),
  ('Marshall Islands', 107),
  ('Mauritania', 108),
  ('Mauritius', 109),
  ('Mexico', 110),
  ('Micronesia', 111),
  ('Moldova', 112),
  ('Monaco', 113),
  ('Mongolia', 114),
  ('Montenegro', 115),
  ('Morocco', 116),
  ('Mozambique', 117),
  ('Myanmar', 118),
  ('Namibia', 119),
  ('Nauru', 120),
  ('Nepal', 121),
  ('Netherlands', 122),
  ('New Zealand', 123),
  ('Nicaragua', 124),
  ('Niger', 125),
  ('Nigeria', 126),
  ('North Korea', 127),
  ('North Macedonia', 128),
  ('Norway', 129),
  ('Oman', 130),
  ('Pakistan', 131),
  ('Palau', 132),
  ('Palestine', 133),
  ('Panama', 134),
  ('Papua New Guinea', 135),
  ('Paraguay', 136),
  ('Peru', 137),
  ('Philippines', 138),
  ('Poland', 139),
  ('Portugal', 140),
  ('Qatar', 141),
  ('Romania', 142),
  ('Russia', 143),
  ('Rwanda', 144),
  ('Saint Kitts and Nevis', 145),
  ('Saint Lucia', 146),
  ('Saint Vincent and the Grenadines', 147),
  ('Samoa', 148),
  ('San Marino', 149),
  ('São Tomé and Príncipe', 150),
  ('Saudi Arabia', 151),
  ('Senegal', 152),
  ('Serbia', 153),
  ('Seychelles', 154),
  ('Sierra Leone', 155),
  ('Singapore', 156),
  ('Slovakia', 157),
  ('Slovenia', 158),
  ('Solomon Islands', 159),
  ('Somalia', 160),
  ('South Africa', 161),
  ('South Korea', 162),
  ('South Sudan', 163),
  ('Spain', 164),
  ('Sri Lanka', 165),
  ('Sudan', 166),
  ('Suriname', 167),
  ('Sweden', 168),
  ('Switzerland', 169),
  ('Syria', 170),
  ('Tajikistan', 171),
  ('Tanzania', 172),
  ('Thailand', 173),
  ('Timor-Leste', 174),
  ('Togo', 175),
  ('Tonga', 176),
  ('Trinidad and Tobago', 177),
  ('Tunisia', 178),
  ('Türkiye', 179),
  ('Turkmenistan', 180),
  ('Tuvalu', 181),
  ('Uganda', 182),
  ('Ukraine', 183),
  ('United Arab Emirates', 184),
  ('United Kingdom', 185),
  ('United States', 186),
  ('Uruguay', 187),
  ('Uzbekistan', 188),
  ('Vanuatu', 189),
  ('Vatican City', 190),
  ('Venezuela', 191),
  ('Vietnam', 192),
  ('Yemen', 193),
  ('Zambia', 194),
  ('Zimbabwe', 195);

grant select on table public.world_countries to authenticated;
grant select, insert, update, delete on table public.world_countries to service_role;
create policy world_countries_member_select on public.world_countries for select to authenticated using (true);
create policy world_countries_service_role on public.world_countries for all to service_role using (true) with check (true);

alter table public.members add column current_country text;
alter table public.members
  add constraint members_current_country_fkey foreign key (current_country)
  references public.world_countries (name) on update cascade on delete set null;
grant select (current_country) on table public.members to anon;
grant update (current_country) on table public.members to authenticated;

-- ---------------------------------------------------------------------------
-- Anon core-row grant trimmed: identified_at and created_at are never rendered publicly.
-- ---------------------------------------------------------------------------
revoke select (identified_at, created_at) on table public.members from anon;

-- ---------------------------------------------------------------------------
-- Ruling 141: third parties on a signed-out surface
-- ---------------------------------------------------------------------------
create or replace function private.named_publicly(p_member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select m.profile_shared and not m.profile_private from public.members m where m.id = p_member), false);
$$;
revoke execute on function private.named_publicly(uuid) from public;
grant execute on function private.named_publicly(uuid) to anon, authenticated, service_role;

-- The name when the surface is signed-in or the member shares publicly; otherwise the role:
-- the host, a Space lead, the recipient, a member.
create or replace function private.third_party_label(p_member uuid, p_role text, p_public boolean)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not p_public or private.named_publicly(p_member)
      then (select m.name from public.members m where m.id = p_member)
    when lower(coalesce(p_role, '')) = 'host' then 'the host'
    when lower(coalesce(p_role, '')) = 'space lead' then 'a Space lead'
    when lower(coalesce(p_role, '')) = 'recipient' then 'the recipient'
    else 'a member' end;
$$;
revoke execute on function private.third_party_label(uuid, text, boolean) from public;
grant execute on function private.third_party_label(uuid, text, boolean) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Ruling 144: accepting a request notifies the requester; declining is silent (ruling 119).
-- ---------------------------------------------------------------------------
create or replace function private.notify_connection_accepted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' and new.to_member_id is not null then
    insert into public.notifications (recipient_member_id, kind, actor_kind, actor_id, object_kind, object_id)
    values (new.from_member_id, 'connection_accepted', 'member', new.to_member_id, 'connection_request', new.id);
  end if;
  return new;
end;
$$;
revoke execute on function private.notify_connection_accepted() from public;
create trigger on_connection_request_accepted
  after update of status on public.connection_requests
  for each row execute function private.notify_connection_accepted();

-- ---------------------------------------------------------------------------
-- save_profile_section: the Where section carries current_country.
-- ---------------------------------------------------------------------------
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
  v_seg public.member_segment;
  v_arr text[];
  v_tz text;
  v_place text;
  v_country text;
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

-- ---------------------------------------------------------------------------
-- profile_view: current_country in the member row and the Where section; third parties gated.
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
    v_obj := jsonb_strip_nulls(jsonb_build_object('current_place', m.current_place, 'current_country', m.current_country, 'local_tz', m.local_tz));
    if v_owner or m.current_place is not null or m.current_country is not null then v_sections := v_sections || jsonb_build_object('where', v_obj); end if;
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
      'title', e.title,
      'sub', 'Attested by ' || private.third_party_label(am.id, a.attester_role, v_viewer is null)
        || case when v_viewer is not null or private.named_publicly(am.id) then ', ' || a.attester_role else '' end,
      'when', a.attested_at) order by a.attested_at desc), '[]'::jsonb)
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
      'title', o.title, 'sub', 'Fulfilled a Need from ' || private.third_party_label(am.id, a.attester_role, v_viewer is null), 'when', a.attested_at) order by a.attested_at desc), '[]'::jsonb)
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
          'attester', private.third_party_label(am.id, a.attester_role, v_viewer is null),
          'role', case when v_viewer is not null or private.named_publicly(am.id) then a.attester_role end,
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
      'origin_country', m.origin_country, 'current_place', m.current_place, 'current_country', m.current_country, 'local_tz', m.local_tz,
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

-- ---------------------------------------------------------------------------
-- profile_vocabularies: the world list.
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
    'world', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.world_countries),
    'heritage', (select jsonb_agg(x) from unnest(enum_range(null::public.heritage_kind)) x),
    'pathway', (select jsonb_agg(x) from unnest(enum_range(null::public.return_pathway)) x),
    'timeline', (select jsonb_agg(x) from unnest(enum_range(null::public.return_timeline)) x)
  );
$$;

-- ---------------------------------------------------------------------------
-- public_attestations: the attester is named only when they share publicly.
-- ---------------------------------------------------------------------------
create or replace function public.public_attestations()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with eligible as (
    select a.*, mm.name as member_name, mm.handle as member_handle, mm.avatar_path,
      private.third_party_label(am.id, a.attester_role, true) as attester_name,
      case when private.named_publicly(am.id) then a.attester_role end as attester_role_public,
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
      'object', object_title, 'attester', attester_name, 'role', attester_role_public, 'when', attested_at,
      'c', c_category, 'object_kind', object_kind, 'object_id', object_id) order by attested_at desc) as items
    from eligible where rn <= 12 group by c_category
  ) g;
$$;
