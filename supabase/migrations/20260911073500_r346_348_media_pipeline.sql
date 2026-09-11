-- Rulings 346 to 348: one media pipeline, and its master registry.
--
-- 346: every image the app stores flows through one write path (the media-upload Edge Function).
-- That path validates, stores a single master under a canonical path, records exactly one row here,
-- and runs Tinify as a switchable optimisation the upload does not fail without. Delivery is through
-- Supabase Storage image transformations, so this one master serves every size. The avatar control
-- is the first consumer; the composer's images and the profile cover adopt the same path next,
-- without a second table or a second function.
--
-- 347: EXIF and all metadata are stripped on both the client and the server. A phone photo carries
-- GPS coordinates, and a member who uploads a portrait has not consented to publishing where they
-- stood. This is a Digital Trust Layer obligation (rulings 139 to 141), which is why the strip
-- happens twice and, on the server, unconditionally rather than as a side effect of the optional
-- Tinify pass.
--
-- 348 (hook only, not built here): every image can be reframed later, never required. The master is
-- stored with its pixels untouched; `crop` and `focal_point` are recorded beside it, and a future
-- reframe is a metadata write against this row, never a re-upload. This migration leaves the columns;
-- their write path arrives with 348.

-- ---------------------------------------------------------------------------
-- public.media: the master registry. One row per stored master.
-- ---------------------------------------------------------------------------
create table public.media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.members (id) on delete cascade,
  bucket text not null check (bucket in ('profile-media', 'post-media')),
  -- Canonical path of the master object in `bucket`. Unique: one row owns one object.
  storage_path text not null unique,
  kind text not null check (kind in ('avatar', 'cover', 'post')),
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp')),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  byte_size integer not null check (byte_size >= 0),
  -- 346: whether the switchable Tinify pass ran on the master. False is a complete, servable master;
  -- the flag exists so a later backfill can find masters uploaded while the pass was switched off.
  optimized boolean not null default false,
  -- 348: reframe is a metadata write, never a re-upload. Null means deliver the master as stored.
  -- Shapes are validated by 348's write path, not here; there is no writer for either column yet.
  crop jsonb,
  focal_point jsonb,
  created_at timestamptz not null default now()
);
create index media_owner_idx on public.media (owner_id, created_at desc);
create index media_kind_idx on public.media (owner_id, kind, created_at desc);

alter table public.media enable row level security;

-- Members read their own rows (delivery and, under 348, reframe). The one write path is the
-- media-upload function under the service role; members never insert, update or delete a media row
-- directly, so no such policy is granted here. 348's reframe adds a member update policy scoped to
-- crop and focal_point when it is built.
grant select on table public.media to authenticated;
grant all on table public.media to service_role;

-- member: own rows only.
create policy media_member_select on public.media for select to authenticated
using (owner_id = (select auth.uid()));
-- Space lead and event host: no direct read of the registry. They see a delivered image through the
-- owning surface's Storage RLS (the post or the member core row), exactly as post_media inherits
-- visibility from posts; the registry row itself stays owner-scoped.
-- admin: read all.
create policy media_admin_select on public.media for select to authenticated
using (private.is_admin());
-- service role: the pipeline's write path.
create policy media_service_role on public.media for all to service_role
using (true) with check (true);
