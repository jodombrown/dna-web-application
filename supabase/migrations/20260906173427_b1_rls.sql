-- B1 Composer: privileges, helper predicates, and RLS policies.
--
-- Personas: member (any authenticated user), Space lead (space_roles.role = 'lead'),
-- event host (events.host_member_id), admin (JWT app_metadata.role = 'admin'),
-- service role (Edge Functions only). Anonymous gets no privilege on any table.
-- The project was created with automatic table exposure off, so every grant is explicit.

-- ---------------------------------------------------------------------------
-- Helper predicates. SECURITY DEFINER so a policy can consult another table
-- without re-entering that table's own policies. Read-only, STABLE, empty search_path.
-- They live in schema private, which PostgREST does not expose, so they are usable
-- from policies but never callable over the API.
-- ---------------------------------------------------------------------------

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function private.is_space_member(p_space uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.space_roles r
    where r.space_id = p_space and r.member_id = auth.uid() and r.status = 'active'
  );
$$;

create or replace function private.is_space_lead(p_space uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.space_roles r
    where r.space_id = p_space and r.member_id = auth.uid()
      and r.status = 'active' and r.role = 'lead'
  );
$$;

create or replace function private.is_connected(p_a uuid, p_b uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.connection_requests c
    where c.status = 'accepted'
      and ((c.from_member_id = p_a and c.to_member_id = p_b)
        or (c.from_member_id = p_b and c.to_member_id = p_a))
  );
$$;

create or replace function private.is_event_host(p_event uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.events e where e.id = p_event and e.host_member_id = auth.uid());
$$;

-- Is the caller "a member of the anchor" (brief, RLS baseline)?
create or replace function private.can_see_anchor(p_kind public.anchor_kind, p_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case p_kind
    when 'member' then p_id = auth.uid() or private.is_connected(auth.uid(), p_id)
    when 'space' then private.is_space_member(p_id)
    when 'event' then private.is_event_host(p_id) or exists (
      select 1 from public.events e
      where e.id = p_id and e.space_id is not null and private.is_space_member(e.space_id))
    when 'opportunity' then exists (
      select 1 from public.opportunities o
      where o.id = p_id and (o.receiver_member_id = auth.uid()
        or (o.space_id is not null and private.is_space_member(o.space_id))))
    when 'connection_request' then exists (
      select 1 from public.connection_requests c
      where c.id = p_id and (c.from_member_id = auth.uid() or c.to_member_id = auth.uid()))
    when 'story' then exists (
      select 1 from public.stories s where s.id = p_id and s.author_member_id = auth.uid())
    else false
  end;
$$;

-- May the caller author a post as this author (member self, or any active Space role)?
create or replace function private.can_author_as(p_kind public.anchor_kind, p_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case p_kind
    when 'member' then p_id = auth.uid()
    when 'space' then private.is_space_member(p_id)
    else false
  end;
$$;

-- Does the caller own this post row for write purposes (publisher, member author, or Space lead)?
create or replace function private.is_post_author(p_post uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.posts p
    where p.id = p_post
      and (p.created_by = auth.uid()
        or (p.author_kind = 'member' and p.author_id = auth.uid())
        or (p.author_kind = 'space' and private.is_space_lead(p.author_id)))
  );
$$;

revoke execute on function
  private.is_admin(), private.is_space_member(uuid), private.is_space_lead(uuid),
  private.is_connected(uuid, uuid), private.is_event_host(uuid),
  private.can_see_anchor(public.anchor_kind, uuid), private.can_author_as(public.anchor_kind, uuid),
  private.is_post_author(uuid)
from public, anon;
grant execute on function
  private.is_admin(), private.is_space_member(uuid), private.is_space_lead(uuid),
  private.is_connected(uuid, uuid), private.is_event_host(uuid),
  private.can_see_anchor(public.anchor_kind, uuid), private.can_author_as(public.anchor_kind, uuid),
  private.is_post_author(uuid)
to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Privileges. anon: nothing. authenticated: exactly what the surface needs.
-- service_role: everything (Edge Functions).
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated, service_role;
revoke all on all tables in schema public from anon;

grant select, insert, update, delete on table public.posts to authenticated;
grant select, insert, delete on table public.post_media to authenticated;
grant select, insert, delete on table public.post_links to authenticated;
grant insert on table public.post_dia to authenticated;
grant select on table public.post_dia to authenticated; -- admin-only via policy; members match no row
grant select, insert, update, delete on table public.post_drafts to authenticated;
grant select, insert, update, delete on table public.events to authenticated;
grant select, insert, update, delete on table public.spaces to authenticated;
grant select, insert, update, delete on table public.space_roles to authenticated;
grant select, insert, update, delete on table public.opportunities to authenticated;
grant select, insert, update, delete on table public.connection_requests to authenticated;
grant select, insert, update, delete on table public.stories to authenticated;

grant all on table
  public.posts, public.post_media, public.post_links, public.post_dia, public.post_drafts,
  public.events, public.spaces, public.space_roles, public.opportunities,
  public.connection_requests, public.stories
to service_role;

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------

-- member: Feed visibility (audience) plus own rows.
create policy posts_member_select on public.posts for select to authenticated
using (
  (status = 'published' and (
    audience = 'everyone'
    or (audience = 'connections' and author_kind = 'member' and private.is_connected(author_id, (select auth.uid())))
    or (audience = 'connections' and author_kind = 'space' and private.is_space_member(author_id))
    or (audience = 'anchored' and private.can_see_anchor(anchor_kind, anchor_id))
  ))
  or created_by = (select auth.uid())
  or (author_kind = 'member' and author_id = (select auth.uid()))
);
create policy posts_member_insert on public.posts for insert to authenticated
with check (
  c_category <> 'system'
  and created_by = (select auth.uid())
  and private.can_author_as(author_kind, author_id)
);
create policy posts_member_update on public.posts for update to authenticated
using (author_kind = 'member' and author_id = (select auth.uid()))
with check (author_kind = 'member' and author_id = (select auth.uid()) and c_category <> 'system');
create policy posts_member_delete on public.posts for delete to authenticated
using (author_kind = 'member' and author_id = (select auth.uid()));

-- Space lead: reads and writes posts authored as their Space.
create policy posts_space_lead_select on public.posts for select to authenticated
using (author_kind = 'space' and private.is_space_lead(author_id));
create policy posts_space_lead_update on public.posts for update to authenticated
using (author_kind = 'space' and private.is_space_lead(author_id))
with check (author_kind = 'space' and private.is_space_lead(author_id) and c_category <> 'system');
create policy posts_space_lead_delete on public.posts for delete to authenticated
using (author_kind = 'space' and private.is_space_lead(author_id));

-- event host: reads posts anchored to an event they host (also covered by can_see_anchor for anchored audience).
create policy posts_event_host_select on public.posts for select to authenticated
using (status = 'published' and anchor_kind = 'event' and private.is_event_host(anchor_id));

-- admin: read everything, remove anything.
create policy posts_admin_select on public.posts for select to authenticated using (private.is_admin());
create policy posts_admin_delete on public.posts for delete to authenticated using (private.is_admin());

-- service role.
create policy posts_service_role on public.posts for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- post_media, post_links: follow the parent post. The subquery on posts runs under
-- the caller's posts policies, so visibility is inherited rather than duplicated.
-- ---------------------------------------------------------------------------

create policy post_media_member_select on public.post_media for select to authenticated
using (exists (select 1 from public.posts p where p.id = post_id));
create policy post_media_member_insert on public.post_media for insert to authenticated
with check (private.is_post_author(post_id));
create policy post_media_member_delete on public.post_media for delete to authenticated
using (private.is_post_author(post_id));
-- Space lead and event host: inherited through posts policies above (is_post_author covers leads).
create policy post_media_admin_select on public.post_media for select to authenticated using (private.is_admin());
create policy post_media_admin_delete on public.post_media for delete to authenticated using (private.is_admin());
create policy post_media_service_role on public.post_media for all to service_role using (true) with check (true);

create policy post_links_member_select on public.post_links for select to authenticated
using (exists (select 1 from public.posts p where p.id = post_id));
create policy post_links_member_insert on public.post_links for insert to authenticated
with check (private.is_post_author(post_id));
create policy post_links_member_delete on public.post_links for delete to authenticated
using (private.is_post_author(post_id));
create policy post_links_admin_select on public.post_links for select to authenticated using (private.is_admin());
create policy post_links_admin_delete on public.post_links for delete to authenticated using (private.is_admin());
create policy post_links_service_role on public.post_links for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- post_dia: behavioural-graph input. Members write their own row through publish_post
-- and never read it back. Space leads and event hosts have no access. Admin reads.
-- ---------------------------------------------------------------------------

create policy post_dia_member_insert on public.post_dia for insert to authenticated
with check (private.is_post_author(post_id));
create policy post_dia_admin_select on public.post_dia for select to authenticated using (private.is_admin());
create policy post_dia_service_role on public.post_dia for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- post_drafts: private to the member. No Space lead, event host, or admin access.
-- ---------------------------------------------------------------------------

create policy post_drafts_member_select on public.post_drafts for select to authenticated
using (member_id = (select auth.uid()));
create policy post_drafts_member_insert on public.post_drafts for insert to authenticated
with check (member_id = (select auth.uid()));
create policy post_drafts_member_update on public.post_drafts for update to authenticated
using (member_id = (select auth.uid())) with check (member_id = (select auth.uid()));
create policy post_drafts_member_delete on public.post_drafts for delete to authenticated
using (member_id = (select auth.uid()));
create policy post_drafts_service_role on public.post_drafts for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- spaces
-- ---------------------------------------------------------------------------

create policy spaces_member_select on public.spaces for select to authenticated
using (
  owner_member_id = (select auth.uid())
  or private.is_space_member(id)
  or exists (select 1 from public.posts p where p.created_object_kind = 'space' and p.created_object_id = spaces.id)
);
create policy spaces_member_insert on public.spaces for insert to authenticated
with check (owner_member_id = (select auth.uid()));
create policy spaces_member_update on public.spaces for update to authenticated
using (owner_member_id = (select auth.uid())) with check (owner_member_id = (select auth.uid()));
create policy spaces_space_lead_update on public.spaces for update to authenticated
using (private.is_space_lead(id)) with check (private.is_space_lead(id));
-- event host: no direct access beyond membership.
create policy spaces_admin_select on public.spaces for select to authenticated using (private.is_admin());
create policy spaces_admin_update on public.spaces for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy spaces_admin_delete on public.spaces for delete to authenticated using (private.is_admin());
create policy spaces_service_role on public.spaces for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- space_roles: source of Space authorship rights.
-- ---------------------------------------------------------------------------

create policy space_roles_member_select on public.space_roles for select to authenticated
using (member_id = (select auth.uid()) or private.is_space_member(space_id));
-- A member may create the lead row for a Space they own (publish_post does this on Start a Space).
create policy space_roles_member_insert on public.space_roles for insert to authenticated
with check (
  member_id = (select auth.uid())
  and exists (select 1 from public.spaces s where s.id = space_id and s.owner_member_id = (select auth.uid()))
);
-- A member may leave (update their own status).
create policy space_roles_member_update on public.space_roles for update to authenticated
using (member_id = (select auth.uid())) with check (member_id = (select auth.uid()));
create policy space_roles_space_lead_insert on public.space_roles for insert to authenticated
with check (private.is_space_lead(space_id));
create policy space_roles_space_lead_update on public.space_roles for update to authenticated
using (private.is_space_lead(space_id)) with check (private.is_space_lead(space_id));
create policy space_roles_space_lead_delete on public.space_roles for delete to authenticated
using (private.is_space_lead(space_id));
create policy space_roles_admin_select on public.space_roles for select to authenticated using (private.is_admin());
create policy space_roles_admin_delete on public.space_roles for delete to authenticated using (private.is_admin());
create policy space_roles_service_role on public.space_roles for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------

create policy events_member_select on public.events for select to authenticated
using (
  (space_id is not null and private.is_space_member(space_id))
  or exists (select 1 from public.posts p where p.created_object_kind = 'event' and p.created_object_id = events.id)
);
create policy events_member_insert on public.events for insert to authenticated
with check (host_member_id = (select auth.uid()) and (space_id is null or private.is_space_member(space_id)));
create policy events_event_host_select on public.events for select to authenticated
using (host_member_id = (select auth.uid()));
create policy events_event_host_update on public.events for update to authenticated
using (host_member_id = (select auth.uid())) with check (host_member_id = (select auth.uid()));
create policy events_event_host_delete on public.events for delete to authenticated
using (host_member_id = (select auth.uid()));
create policy events_space_lead_update on public.events for update to authenticated
using (space_id is not null and private.is_space_lead(space_id))
with check (space_id is not null and private.is_space_lead(space_id));
create policy events_admin_select on public.events for select to authenticated using (private.is_admin());
create policy events_admin_update on public.events for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy events_admin_delete on public.events for delete to authenticated using (private.is_admin());
create policy events_service_role on public.events for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- opportunities
-- ---------------------------------------------------------------------------

create policy opportunities_member_select on public.opportunities for select to authenticated
using (
  receiver_member_id = (select auth.uid())
  or (space_id is not null and private.is_space_member(space_id))
  or exists (select 1 from public.posts p where p.created_object_kind = 'opportunity' and p.created_object_id = opportunities.id)
);
create policy opportunities_member_insert on public.opportunities for insert to authenticated
with check (receiver_member_id = (select auth.uid()) and (space_id is null or private.is_space_member(space_id)));
create policy opportunities_member_update on public.opportunities for update to authenticated
using (receiver_member_id = (select auth.uid())) with check (receiver_member_id = (select auth.uid()));
create policy opportunities_member_delete on public.opportunities for delete to authenticated
using (receiver_member_id = (select auth.uid()));
create policy opportunities_space_lead_update on public.opportunities for update to authenticated
using (space_id is not null and private.is_space_lead(space_id))
with check (space_id is not null and private.is_space_lead(space_id));
create policy opportunities_event_host_select on public.opportunities for select to authenticated
using (event_id is not null and private.is_event_host(event_id));
create policy opportunities_admin_select on public.opportunities for select to authenticated using (private.is_admin());
create policy opportunities_admin_delete on public.opportunities for delete to authenticated using (private.is_admin());
create policy opportunities_service_role on public.opportunities for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- connection_requests: only the two parties. No Space lead or event host access.
-- ---------------------------------------------------------------------------

create policy connection_requests_member_select on public.connection_requests for select to authenticated
using (from_member_id = (select auth.uid()) or to_member_id = (select auth.uid()));
create policy connection_requests_member_insert on public.connection_requests for insert to authenticated
with check (from_member_id = (select auth.uid()) and status = 'pending');
create policy connection_requests_member_update on public.connection_requests for update to authenticated
using (from_member_id = (select auth.uid()) or to_member_id = (select auth.uid()))
with check (from_member_id = (select auth.uid()) or to_member_id = (select auth.uid()));
create policy connection_requests_member_delete on public.connection_requests for delete to authenticated
using (from_member_id = (select auth.uid()));
create policy connection_requests_admin_select on public.connection_requests for select to authenticated using (private.is_admin());
create policy connection_requests_admin_delete on public.connection_requests for delete to authenticated using (private.is_admin());
create policy connection_requests_service_role on public.connection_requests for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- stories
-- ---------------------------------------------------------------------------

create policy stories_member_select on public.stories for select to authenticated
using (
  author_member_id = (select auth.uid())
  or exists (select 1 from public.posts p where p.created_object_kind = 'story' and p.created_object_id = stories.id)
);
create policy stories_member_insert on public.stories for insert to authenticated
with check (author_member_id = (select auth.uid()));
create policy stories_member_update on public.stories for update to authenticated
using (author_member_id = (select auth.uid())) with check (author_member_id = (select auth.uid()));
create policy stories_member_delete on public.stories for delete to authenticated
using (author_member_id = (select auth.uid()));
-- Space lead and event host: no access beyond what the post grants.
create policy stories_admin_select on public.stories for select to authenticated using (private.is_admin());
create policy stories_admin_delete on public.stories for delete to authenticated using (private.is_admin());
create policy stories_service_role on public.stories for all to service_role using (true) with check (true);
