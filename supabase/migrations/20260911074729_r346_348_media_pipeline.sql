-- Rulings 346 to 348: one media pipeline, and its master registry.
create table public.media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.members (id) on delete cascade,
  bucket text not null check (bucket in ('profile-media', 'post-media')),
  storage_path text not null unique,
  kind text not null check (kind in ('avatar', 'cover', 'post')),
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp')),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  byte_size integer not null check (byte_size >= 0),
  optimized boolean not null default false,
  crop jsonb,
  focal_point jsonb,
  created_at timestamptz not null default now()
);
create index media_owner_idx on public.media (owner_id, created_at desc);
create index media_kind_idx on public.media (owner_id, kind, created_at desc);

alter table public.media enable row level security;

grant select on table public.media to authenticated;
grant all on table public.media to service_role;

create policy media_member_select on public.media for select to authenticated
using (owner_id = (select auth.uid()));
create policy media_admin_select on public.media for select to authenticated
using (private.is_admin());
create policy media_service_role on public.media for all to service_role
using (true) with check (true);
