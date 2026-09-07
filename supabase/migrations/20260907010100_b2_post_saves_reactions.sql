-- B2 Shell/Feed: post_saves (Saved lens, Save action) and post_reactions (React action).
--
-- One row per member per post, no reaction type, no count column anywhere. The UI reads only
-- whether the viewer's own row exists, never an aggregate (no-count doctrine). Reads are therefore
-- restricted to the owning member: a viewer needs their own save/react state on any visible post,
-- and nothing else about who saved or reacted is exposed.
--
-- Personas: member (own rows; the post must be visible to them under posts RLS), Space lead and
-- event host (no access beyond their own member rows), admin (read all, remove any), service role.

create table public.post_saves (
  member_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, post_id)
);
create index post_saves_post_idx on public.post_saves (post_id);
alter table public.post_saves enable row level security;

create table public.post_reactions (
  member_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, post_id)
);
create index post_reactions_post_idx on public.post_reactions (post_id);
alter table public.post_reactions enable row level security;

revoke all on table public.post_saves, public.post_reactions from anon;
grant select, insert, delete on table public.post_saves, public.post_reactions to authenticated;
grant all on table public.post_saves, public.post_reactions to service_role;

-- member: own rows only. Insert requires the post to be visible under the caller's posts policies.
create policy post_saves_member_select on public.post_saves for select to authenticated
using (member_id = (select auth.uid()));
create policy post_saves_member_insert on public.post_saves for insert to authenticated
with check (
  member_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published')
);
create policy post_saves_member_delete on public.post_saves for delete to authenticated
using (member_id = (select auth.uid()));
-- Space lead, event host: no access beyond their own member rows above.
create policy post_saves_admin_select on public.post_saves for select to authenticated
using (private.is_admin());
create policy post_saves_admin_delete on public.post_saves for delete to authenticated
using (private.is_admin());
create policy post_saves_service_role on public.post_saves for all to service_role
using (true) with check (true);

create policy post_reactions_member_select on public.post_reactions for select to authenticated
using (member_id = (select auth.uid()));
create policy post_reactions_member_insert on public.post_reactions for insert to authenticated
with check (
  member_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published')
);
create policy post_reactions_member_delete on public.post_reactions for delete to authenticated
using (member_id = (select auth.uid()));
-- Space lead, event host: no access beyond their own member rows above.
create policy post_reactions_admin_select on public.post_reactions for select to authenticated
using (private.is_admin());
create policy post_reactions_admin_delete on public.post_reactions for delete to authenticated
using (private.is_admin());
create policy post_reactions_service_role on public.post_reactions for all to service_role
using (true) with check (true);
