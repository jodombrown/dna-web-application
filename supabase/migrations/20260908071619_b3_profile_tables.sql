-- B3 Profile: enums, tables, vocabulary seeds, storage bucket. Every table has RLS enabled here;
-- privileges and policies ship in 20260908090100_b3_profile_rls.sql, RPCs in
-- 20260908090200_b3_profile_rpcs.sql. Nothing is exposed until those run.
--
-- Doctrine carried (rulings 122 to 136, 46 to 48, 123): no completion score anywhere, visual or
-- stored; vocabularies are tables, never code constants; one segment block with per-variant
-- fields keyed by segment; per-section audience with badges as a section like any other; the
-- whole-profile Private and Share switches (Share off by default); attestations are the only
-- source of badges and of "attested" activity, written by the counterparty's engine, never here.

create type public.member_segment as enum ('returnee', 'anchor', 'ally', 'exploring');
create type public.heritage_kind as enum ('First generation', 'Second generation', 'Third generation or later', 'Continental');
create type public.return_pathway as enum ('Already returned', 'Planning a return', 'Circular, both places', 'Not planning a return');
create type public.return_timeline as enum ('Already back', 'Within a year', 'One to three years', 'Someday, not fixed');
create type public.link_kind as enum ('website', 'linkedin', 'x', 'instagram');
create type public.masthead_pattern as enum ('kente', 'adinkra', 'mudcloth');
-- Section keys that carry an audience (ruling 124). The core row has none: it is always visible.
create type public.profile_section as enum (
  'about', 'segment', 'origin', 'where', 'work', 'skills', 'languages', 'intent', 'links',
  'convene', 'collaborate', 'contribute', 'convey', 'badges'
);

-- ---------------------------------------------------------------------------
-- members: one row per auth user, created by the sign-up trigger (rpcs migration). The core row
-- plus the whole-profile switches. handle is the public address (/m/:handle).
-- ---------------------------------------------------------------------------
create table public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$'),
  name text not null check (length(trim(name)) between 1 and 80),
  headline text check (headline is null or length(headline) <= 140),
  avatar_path text,
  cover_path text,
  cover_focus text not null default 'center 35%',
  origin_country text,
  current_place text check (current_place is null or length(current_place) <= 120),
  -- IANA zone derived from current_place by save_profile_section (pg_timezone_names), or passed explicitly.
  local_tz text,
  segment public.member_segment,
  pattern public.masthead_pattern not null default 'kente',
  profile_private boolean not null default false,
  profile_shared boolean not null default false,
  -- Identified tier (ruling 123): set by an identity action through the service role only. Null = Account tier.
  identified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index members_shared_idx on public.members (handle) where profile_shared and not profile_private;
alter table public.members enable row level security;

-- ---------------------------------------------------------------------------
-- Vocabularies (rulings 122, 128, 131): database tables read by this form and by Connect's filters
-- later. Seeded verbatim from SPEC.md section 3; ampersands and casing are vocabulary values.
-- ---------------------------------------------------------------------------
create table public.focus_areas (name text primary key, position smallint not null unique);
create table public.industries (name text primary key, position smallint not null unique);
create table public.regional_expertise (name text primary key, position smallint not null unique);
create table public.skills (name text primary key, position smallint not null unique);
create table public.languages (name text primary key, position smallint not null unique);
-- Fixed lists that render as chips (What I am here for, Still Exploring interests) and the origin
-- country select. Same shape so Connect's filters read them the same way.
create table public.intents (name text primary key, position smallint not null unique);
create table public.interests (name text primary key, position smallint not null unique);
create table public.countries (name text primary key, position smallint not null unique);
alter table public.focus_areas enable row level security;
alter table public.industries enable row level security;
alter table public.regional_expertise enable row level security;
alter table public.skills enable row level security;
alter table public.languages enable row level security;
alter table public.intents enable row level security;
alter table public.interests enable row level security;
alter table public.countries enable row level security;

insert into public.focus_areas (name, position) values
  ('Agriculture & Food Systems', 1), ('Technology & Innovation', 2), ('Healthcare & Wellness', 3),
  ('Education & Training', 4), ('Finance & Investment', 5), ('Arts & Culture', 6),
  ('Policy & Governance', 7), ('Infrastructure & Energy', 8), ('Trade & Commerce', 9),
  ('Environment & Climate', 10);
insert into public.industries (name, position) values
  ('Agriculture', 1), ('Technology', 2), ('Healthcare', 3), ('Education', 4), ('Finance', 5),
  ('Manufacturing', 6), ('Retail', 7), ('Energy', 8), ('Real Estate', 9), ('Creative Industries', 10);
insert into public.regional_expertise (name, position) values
  ('West Africa', 1), ('East Africa', 2), ('Southern Africa', 3), ('Central Africa', 4),
  ('North Africa', 5), ('African Diaspora', 6);
insert into public.skills (name, position) values
  ('Leadership', 1), ('Project Management', 2), ('Software Development', 3), ('Marketing', 4),
  ('Sales', 5), ('Design', 6), ('Data Analysis', 7), ('Strategy', 8), ('Operations', 9), ('Research', 10);
insert into public.languages (name, position) values
  ('English', 1), ('French', 2), ('Portuguese', 3), ('Arabic', 4), ('Swahili', 5), ('Hausa', 6),
  ('Yoruba', 7), ('Igbo', 8), ('Twi', 9), ('Amharic', 10), ('isiZulu', 11), ('Sesotho', 12),
  ('Wolof', 13), ('Somali', 14);
insert into public.intents (name, position) values
  ('Find collaborators', 1), ('Offer skills', 2), ('Find a mentor', 3), ('Mentor others', 4),
  ('Host and convene', 5), ('Learn what is happening', 6), ('Return home well', 7), ('Fund or be funded', 8);
insert into public.interests (name, position) values
  ('Health', 1), ('Agriculture', 2), ('Energy', 3), ('Education', 4), ('Housing', 5), ('Trade', 6),
  ('Creative economy', 7), ('Climate', 8), ('Governance', 9), ('Sport', 10);
-- Countries of origin: the African Union member states, written names (never a flag glyph).
insert into public.countries (name, position) values
  ('Algeria', 1), ('Angola', 2), ('Benin', 3), ('Botswana', 4), ('Burkina Faso', 5), ('Burundi', 6),
  ('Cabo Verde', 7), ('Cameroon', 8), ('Central African Republic', 9), ('Chad', 10), ('Comoros', 11),
  ('Congo', 12), ('Côte d''Ivoire', 13), ('Democratic Republic of the Congo', 14), ('Djibouti', 15),
  ('Egypt', 16), ('Equatorial Guinea', 17), ('Eritrea', 18), ('Eswatini', 19), ('Ethiopia', 20),
  ('Gabon', 21), ('Gambia', 22), ('Ghana', 23), ('Guinea', 24), ('Guinea-Bissau', 25), ('Kenya', 26),
  ('Lesotho', 27), ('Liberia', 28), ('Libya', 29), ('Madagascar', 30), ('Malawi', 31), ('Mali', 32),
  ('Mauritania', 33), ('Mauritius', 34), ('Morocco', 35), ('Mozambique', 36), ('Namibia', 37),
  ('Niger', 38), ('Nigeria', 39), ('Rwanda', 40), ('Sahrawi Arab Democratic Republic', 41),
  ('São Tomé and Príncipe', 42), ('Senegal', 43), ('Seychelles', 44), ('Sierra Leone', 45),
  ('Somalia', 46), ('South Africa', 47), ('South Sudan', 48), ('Sudan', 49), ('Tanzania', 50),
  ('Togo', 51), ('Tunisia', 52), ('Uganda', 53), ('Zambia', 54), ('Zimbabwe', 55);

alter table public.members
  add constraint members_origin_country_fkey foreign key (origin_country)
  references public.countries (name) on update cascade on delete set null;

-- Join tables: one row per selection, vocabulary membership enforced by the foreign key,
-- caps (3, 3, 3, 5, 6, 3, 5) enforced by save_profile_section.
create table public.member_focus_areas (
  member_id uuid not null references public.members (id) on delete cascade,
  name text not null references public.focus_areas (name) on update cascade on delete cascade,
  primary key (member_id, name)
);
create table public.member_industries (
  member_id uuid not null references public.members (id) on delete cascade,
  name text not null references public.industries (name) on update cascade on delete cascade,
  primary key (member_id, name)
);
create table public.member_regional_expertise (
  member_id uuid not null references public.members (id) on delete cascade,
  name text not null references public.regional_expertise (name) on update cascade on delete cascade,
  primary key (member_id, name)
);
create table public.member_skills (
  member_id uuid not null references public.members (id) on delete cascade,
  name text not null references public.skills (name) on update cascade on delete cascade,
  primary key (member_id, name)
);
create table public.member_languages (
  member_id uuid not null references public.members (id) on delete cascade,
  name text not null references public.languages (name) on update cascade on delete cascade,
  primary key (member_id, name)
);
create table public.member_intents (
  member_id uuid not null references public.members (id) on delete cascade,
  name text not null references public.intents (name) on update cascade on delete cascade,
  primary key (member_id, name)
);
create table public.member_interests (
  member_id uuid not null references public.members (id) on delete cascade,
  name text not null references public.interests (name) on update cascade on delete cascade,
  primary key (member_id, name)
);
create index member_focus_areas_name_idx on public.member_focus_areas (name);
create index member_industries_name_idx on public.member_industries (name);
create index member_regional_expertise_name_idx on public.member_regional_expertise (name);
create index member_skills_name_idx on public.member_skills (name);
create index member_languages_name_idx on public.member_languages (name);
create index member_intents_name_idx on public.member_intents (name);
create index member_interests_name_idx on public.member_interests (name);
alter table public.member_focus_areas enable row level security;
alter table public.member_industries enable row level security;
alter table public.member_regional_expertise enable row level security;
alter table public.member_skills enable row level security;
alter table public.member_languages enable row level security;
alter table public.member_intents enable row level security;
alter table public.member_interests enable row level security;

-- Section text fields live in their own tables (not on members) so a row policy, not a column
-- grant, decides who reads them: About (ruling 128, the page's only free text), Origin and heritage
-- (origin_country itself stays on the core row), the optional sentence under What I am here for.
create table public.member_about (
  member_id uuid primary key references public.members (id) on delete cascade,
  about text not null check (length(about) between 1 and 500),
  updated_at timestamptz not null default now()
);
alter table public.member_about enable row level security;

create table public.member_origin (
  member_id uuid primary key references public.members (id) on delete cascade,
  heritage public.heritage_kind,
  pathway public.return_pathway,
  updated_at timestamptz not null default now()
);
alter table public.member_origin enable row level security;

create table public.member_intent (
  member_id uuid primary key references public.members (id) on delete cascade,
  note text check (note is null or length(note) <= 200),
  updated_at timestamptz not null default now()
);
alter table public.member_intent enable row level security;

-- Segment block (ruling 122): per-variant fields keyed by segment, so changing the segment keeps
-- the other variants' data. Interests (Still Exploring) live in member_interests.
create table public.member_segment_details (
  member_id uuid not null references public.members (id) on delete cascade,
  segment public.member_segment not null,
  return_timeline public.return_timeline,
  needs text check (needs is null or length(needs) <= 500),
  base text check (base is null or length(base) <= 120),
  offer text check (offer is null or length(offer) <= 500),
  support text check (support is null or length(support) <= 500),
  updated_at timestamptz not null default now(),
  primary key (member_id, segment)
);
alter table public.member_segment_details enable row level security;

-- Links (ruling 128): website plus three handles. Nothing else is added.
create table public.member_links (
  member_id uuid not null references public.members (id) on delete cascade,
  kind public.link_kind not null,
  url text not null check (length(url) between 1 and 200),
  primary key (member_id, kind)
);
alter table public.member_links enable row level security;

-- Per-section audience (ruling 124). A missing row means the default: My connections for links,
-- Everyone on DNA for every other section.
create table public.member_visibility (
  member_id uuid not null references public.members (id) on delete cascade,
  section public.profile_section not null,
  audience public.audience not null default 'everyone',
  primary key (member_id, section)
);
alter table public.member_visibility enable row level security;

-- Follow (rulings 118 to 120): one row per follower per member, independent of the connection
-- state. No count column anywhere; the UI reads only whether the viewer's own row exists.
create table public.member_follows (
  follower_id uuid not null references public.members (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, member_id),
  check (follower_id <> member_id)
);
create index member_follows_member_idx on public.member_follows (member_id);
alter table public.member_follows enable row level security;

-- Attestations (rulings 46 to 48, 123, 125, 135): the record behind badges and attested activity.
-- Identity infrastructure shared by the Cs, not an engine table: rows are written only by the
-- counterparty's engine (service role) when Convene, Collaborate and Contribute ship; nothing in
-- this brief inserts one, so every projection over it is grounded-or-empty. object_kind uses the
-- shared anchor type. attester_role is the counterparty's role in words ("host", "Space lead").
create table public.attestations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  c_category public.c_category not null check (c_category in ('convene', 'collaborate', 'contribute')),
  object_kind public.anchor_kind not null check (object_kind in ('event', 'space', 'opportunity')),
  object_id uuid not null,
  attester_member_id uuid not null references public.members (id) on delete cascade,
  attester_role text not null check (length(attester_role) between 1 and 60),
  attested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (attester_member_id <> member_id),
  unique (member_id, object_kind, object_id, attester_member_id)
);
create index attestations_member_idx on public.attestations (member_id, c_category, attested_at desc);
create index attestations_object_idx on public.attestations (object_kind, object_id);
create index attestations_recent_idx on public.attestations (c_category, attested_at desc);
alter table public.attestations enable row level security;

-- ---------------------------------------------------------------------------
-- Storage: profile-media, private. Avatar and cover under {member_id}/{avatar|cover}/{uuid}.{ext},
-- written by the media-upload Edge Function after the Tinify pass (the composer's media path).
-- Reads are signed URLs under the storage policies in the RLS migration.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-media', 'profile-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
