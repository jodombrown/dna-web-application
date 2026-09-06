-- B1 Composer: tables. Every table has RLS enabled here; policies and grants ship in
-- 20260906170200_b1_rls.sql. Nothing is exposed until that migration runs.

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  owner_member_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category text,
  description text,
  roles_sought jsonb not null default '[]'::jsonb,
  status public.space_status not null default 'active',
  created_at timestamptz not null default now()
);
alter table public.spaces enable row level security;

create table public.space_roles (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  member_id uuid not null references auth.users (id) on delete cascade,
  role public.space_role not null default 'member',
  status public.space_role_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (space_id, member_id)
);
create index space_roles_member_idx on public.space_roles (member_id);
alter table public.space_roles enable row level security;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_member_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  -- The member's raw date and time text, stored alongside the parsed starts_at so nothing typed is lost.
  when_text text not null default '',
  mode public.event_mode not null default 'in_person',
  location jsonb,
  virtual_url text,
  ticket_kind public.ticket_kind not null default 'free',
  space_id uuid references public.spaces (id) on delete set null,
  created_at timestamptz not null default now()
);
create index events_space_idx on public.events (space_id);
alter table public.events enable row level security;

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  receiver_member_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  instrument public.contribute_instrument not null,
  need text,
  by_date date,
  -- Raw "By when" text, same rule as events.when_text.
  by_text text not null default '',
  space_id uuid references public.spaces (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  created_at timestamptz not null default now()
);
create index opportunities_space_idx on public.opportunities (space_id);
alter table public.opportunities enable row level security;

create table public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  from_member_id uuid not null references auth.users (id) on delete cascade,
  -- Nullable at launch: the composer's "Who" is free text until a member picker exists.
  to_member_id uuid references auth.users (id) on delete cascade,
  to_name text not null default '',
  why text,
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  check (to_member_id is null or to_member_id <> from_member_id)
);
create index connection_requests_from_idx on public.connection_requests (from_member_id, status);
create index connection_requests_to_idx on public.connection_requests (to_member_id, status);
alter table public.connection_requests enable row level security;

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  author_member_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null,
  origin_kind public.anchor_kind,
  origin_id uuid,
  created_at timestamptz not null default now(),
  check ((origin_kind is null) = (origin_id is null))
);
alter table public.stories enable row level security;

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_kind public.anchor_kind not null check (author_kind in ('member', 'space')),
  author_id uuid not null,
  -- The signed-in member who published. Equals author_id for member posts; for Space posts it
  -- records which role holder pressed Publish (needed so they can read what they published).
  created_by uuid not null references auth.users (id) on delete cascade,
  c_category public.c_category not null,
  body text not null,
  anchor_kind public.anchor_kind,
  anchor_id uuid,
  created_object_kind public.anchor_kind,
  created_object_id uuid,
  audience public.audience not null default 'everyone',
  status public.post_status not null default 'published',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  check ((anchor_kind is null) = (anchor_id is null)),
  check ((created_object_kind is null) = (created_object_id is null)),
  check (audience <> 'anchored' or anchor_kind is not null),
  check (status <> 'published' or published_at is not null)
);
create index posts_author_idx on public.posts (author_kind, author_id);
create index posts_created_by_idx on public.posts (created_by);
create index posts_anchor_idx on public.posts (anchor_kind, anchor_id);
create index posts_created_object_idx on public.posts (created_object_kind, created_object_id);
create index posts_published_idx on public.posts (published_at desc) where status = 'published';
alter table public.posts enable row level security;

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  storage_path text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  position smallint not null default 0 check (position between 0 and 3),
  created_at timestamptz not null default now(),
  unique (post_id, position)
);
alter table public.post_media enable row level security;

create table public.post_links (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  url text not null,
  title text,
  description text,
  image_url text,
  fetched_at timestamptz,
  created_at timestamptz not null default now(),
  unique (post_id)
);
alter table public.post_links enable row level security;

create table public.post_dia (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  verb public.c_category,
  confidence numeric(4, 3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  proposed_fields jsonb not null default '{}'::jsonb,
  accepted boolean not null default false,
  member_overrode boolean not null default false,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  created_at timestamptz not null default now(),
  unique (post_id)
);
alter table public.post_dia enable row level security;

create table public.post_drafts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users (id) on delete cascade,
  host_context text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, host_context)
);
alter table public.post_drafts enable row level security;
