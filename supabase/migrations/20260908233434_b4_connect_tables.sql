-- B4 Connect: the graph substrate (rulings 111 to 121, 153, 154, 157, 168). Every table has RLS
-- enabled here; privileges and policies ship in 20260908200100_b4_connect_rls.sql, projections and
-- write paths in 20260908200200_b4_connect_rpcs.sql. Nothing is exposed until those run.
--
-- Additive to the merged chassis: connection_requests, member_follows, members, the vocabulary
-- tables, attestations and notifications already exist and are extended, never duplicated.
-- No numeric anything reaches a client: via_count is internal (column grant withheld), the Where
-- floor is a configuration value in schema private, and every projection returns words.

-- pgvector for member_embeddings (created and left unpopulated, ruling 153).
create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- edges: the canonical typed relationship store (ruling 111). Brief 4 writes connect and follow;
-- the other values exist so later engines add rows rather than tables. to_id is a member for
-- connect and follow; for the later types it names the anchor (event, Space, opportunity, story),
-- so it carries no foreign key. A member's rows in either direction leave with the member.
-- ---------------------------------------------------------------------------
create type public.edge_type as enum (
  'connect', 'follow', 'event_rsvp', 'event_attested', 'space_role', 'space_role_completed',
  'contribution_fulfilled', 'story_about', 'authored'
);

create table public.edges (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.members (id) on delete cascade,
  to_id uuid not null,
  edge_type public.edge_type not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (from_id <> to_id)
);
create index edges_from_idx on public.edges (from_id, edge_type);
create index edges_to_idx on public.edges (to_id, edge_type);
-- The two hot types: one live edge per ordered pair.
create unique index edges_follow_live_uidx on public.edges (from_id, to_id)
  where edge_type = 'follow' and revoked_at is null;
create unique index edges_connect_live_uidx on public.edges (from_id, to_id)
  where edge_type = 'connect' and revoked_at is null;
alter table public.edges enable row level security;

-- ---------------------------------------------------------------------------
-- member_connections: the symmetric adjacency projection of accepted connect edges. Both directions
-- stored; maintained by trigger on accept (rls migration), never written by application code.
-- ---------------------------------------------------------------------------
create table public.member_connections (
  member_id uuid not null references public.members (id) on delete cascade,
  other_id uuid not null references public.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  source_request_id uuid references public.connection_requests (id) on delete set null,
  primary key (member_id, other_id),
  check (member_id <> other_id)
);
create index member_connections_other_idx on public.member_connections (other_id);
alter table public.member_connections enable row level security;

-- ---------------------------------------------------------------------------
-- connection_requests: extended. message is the introduction (ruling 119: never sent empty, 300
-- max); responded_at times the accept, decline or withdrawal (the 90-day window counts from it).
-- Rows written before this brief carried the composer's "why"; they keep it as their message.
-- ---------------------------------------------------------------------------
alter table public.connection_requests
  add column message text not null default '',
  add column responded_at timestamptz;
update public.connection_requests
  set message = coalesce(nullif(btrim(why), ''), 'Connected before introductions carried a message.')
  where btrim(message) = '';
update public.connection_requests
  set responded_at = created_at
  where status in ('accepted', 'declined', 'withdrawn') and responded_at is null;
alter table public.connection_requests
  add constraint connection_requests_message_len check (length(btrim(message)) between 1 and 300),
  add constraint connection_requests_responded check (status = 'pending' or responded_at is not null);
alter table public.connection_requests alter column message drop default;
-- One pending introduction per ordered pair.
create unique index connection_requests_pending_uidx
  on public.connection_requests (from_member_id, to_member_id) where status = 'pending';
-- The 90-day window and the terminal second decline read this.
create index connection_requests_declined_idx
  on public.connection_requests (from_member_id, to_member_id, responded_at desc) where status = 'declined';

-- ---------------------------------------------------------------------------
-- second_degree: the materialised friends-of-friends set (ruling 111). Incrementally updated on
-- each new connection (rls migration trigger) and fully rebuilt nightly by
-- private.refresh_second_degree() to correct drift. via_count and sample_via_ids are internal:
-- the column grant to authenticated withholds them and no projection selects them.
-- A table rather than a materialized view because a materialized view cannot be updated
-- incrementally; the nightly rebuild is the REFRESH.
-- ---------------------------------------------------------------------------
create table public.second_degree (
  member_id uuid not null references public.members (id) on delete cascade,
  fof_id uuid not null references public.members (id) on delete cascade,
  via_count integer not null check (via_count > 0),
  sample_via_ids uuid[] not null default '{}',
  refreshed_at timestamptz not null default now(),
  primary key (member_id, fof_id),
  check (member_id <> fof_id)
);
create index second_degree_fof_idx on public.second_degree (fof_id);
alter table public.second_degree enable row level security;

-- ---------------------------------------------------------------------------
-- dismissed_suggestions: own rows, permanent (ruling 113). Applied as an anti-join.
-- ---------------------------------------------------------------------------
create table public.dismissed_suggestions (
  member_id uuid not null references public.members (id) on delete cascade,
  dismissed_id uuid not null references public.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, dismissed_id),
  check (member_id <> dismissed_id)
);
alter table public.dismissed_suggestions enable row level security;

-- ---------------------------------------------------------------------------
-- corridors and member_corridors (ruling 154): ship with zero rows; the seed arrives before
-- invites. While corridors is empty the Corridor filter does not render and no card carries a
-- corridor line (grounded-or-empty applies to a filter axis as to a card line).
-- ---------------------------------------------------------------------------
create table public.corridors (
  id text primary key check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  diaspora_place text not null check (length(diaspora_place) between 1 and 80),
  continental_place text not null check (length(continental_place) between 1 and 80),
  sector text check (sector is null or length(sector) <= 80),
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now()
);
alter table public.corridors enable row level security;

create table public.member_corridors (
  member_id uuid not null references public.members (id) on delete cascade,
  corridor_id text not null references public.corridors (id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, corridor_id)
);
create index member_corridors_corridor_idx on public.member_corridors (corridor_id);
alter table public.member_corridors enable row level security;

-- ---------------------------------------------------------------------------
-- member_embeddings (ruling 153): created and left unpopulated. No provider is called anywhere in
-- this build; the table exists so the later embedding pass adds rows, not schema.
-- ---------------------------------------------------------------------------
create table public.member_embeddings (
  member_id uuid primary key references public.members (id) on delete cascade,
  embedding extensions.vector(1024) not null,
  updated_at timestamptz not null default now()
);
create index member_embeddings_hnsw_idx on public.member_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);
alter table public.member_embeddings enable row level security;

-- ---------------------------------------------------------------------------
-- member_blocks: the block record the Connect brief names as an absolute filter. The chassis had
-- no block store yet; this is the minimal one (own rows, no surface in this brief). A blocked pair
-- never appears to each other in Members, Suggested, a rail row, a mutual name or a Where count.
-- ---------------------------------------------------------------------------
create table public.member_blocks (
  blocker_id uuid not null references public.members (id) on delete cascade,
  blocked_id uuid not null references public.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index member_blocks_blocked_idx on public.member_blocks (blocked_id);
alter table public.member_blocks enable row level security;

-- ---------------------------------------------------------------------------
-- member_segments: the segment labels as a table read at runtime (CLAUDE.md: fixed vocabularies
-- are tables, never arrays in a component). Values are the member_segment enum.
-- ---------------------------------------------------------------------------
create table public.member_segments (
  segment public.member_segment primary key,
  label text not null unique,
  position smallint not null unique
);
alter table public.member_segments enable row level security;
insert into public.member_segments (segment, label, position) values
  ('returnee', 'Returnee', 1), ('anchor', 'Anchor', 2), ('ally', 'Ally', 3), ('exploring', 'Still Exploring', 4);

-- ---------------------------------------------------------------------------
-- Configuration (schema private, never exposed): the Where floor arrives with the corridor seed
-- (ruling 154); doctrine's default is five (CLAUDE.md: counts render nothing below five).
-- ---------------------------------------------------------------------------
create table private.connect_settings (
  key text primary key,
  value_int integer not null,
  updated_at timestamptz not null default now()
);
insert into private.connect_settings (key, value_int) values ('where_floor', 5);

-- ---------------------------------------------------------------------------
-- Backfill from the chassis: accepted requests become connect edges and adjacency rows; live
-- follows become follow edges. The canonical project holds no real member data (ruling 140).
-- ---------------------------------------------------------------------------
insert into public.edges (from_id, to_id, edge_type, created_at)
select c.from_member_id, c.to_member_id, 'connect', coalesce(c.responded_at, c.created_at)
from public.connection_requests c
where c.status = 'accepted' and c.to_member_id is not null
  and exists (select 1 from public.members m where m.id = c.from_member_id)
  and exists (select 1 from public.members m where m.id = c.to_member_id)
on conflict do nothing;
insert into public.edges (from_id, to_id, edge_type, created_at)
select c.to_member_id, c.from_member_id, 'connect', coalesce(c.responded_at, c.created_at)
from public.connection_requests c
where c.status = 'accepted' and c.to_member_id is not null
  and exists (select 1 from public.members m where m.id = c.from_member_id)
  and exists (select 1 from public.members m where m.id = c.to_member_id)
on conflict do nothing;
insert into public.member_connections (member_id, other_id, created_at, source_request_id)
select c.from_member_id, c.to_member_id, coalesce(c.responded_at, c.created_at), c.id
from public.connection_requests c
where c.status = 'accepted' and c.to_member_id is not null
  and exists (select 1 from public.members m where m.id = c.from_member_id)
  and exists (select 1 from public.members m where m.id = c.to_member_id)
on conflict do nothing;
insert into public.member_connections (member_id, other_id, created_at, source_request_id)
select c.to_member_id, c.from_member_id, coalesce(c.responded_at, c.created_at), c.id
from public.connection_requests c
where c.status = 'accepted' and c.to_member_id is not null
  and exists (select 1 from public.members m where m.id = c.from_member_id)
  and exists (select 1 from public.members m where m.id = c.to_member_id)
on conflict do nothing;
insert into public.edges (from_id, to_id, edge_type, created_at)
select f.follower_id, f.member_id, 'follow', f.created_at from public.member_follows f
on conflict do nothing;
