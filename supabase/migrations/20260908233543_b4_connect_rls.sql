-- B4 Connect: helper predicates, triggers, privileges and RLS policies for the graph substrate.
--
-- Personas on every table: member (any signed-in member), Space lead and event host (no access
-- beyond member: Connect has no anchor-scoped rows), admin (read all, remove any), service role
-- (engines and Edge Functions), anonymous (nothing; ruling 156). Default-deny throughout; every
-- column a policy filters on is indexed.
--
-- The single most important policy in this brief (ruling 157): the sender has no direct select on
-- connection_requests. A sender reading their own row would read status = 'declined'. Every sender-
-- side read goes through the SECURITY DEFINER projections in the rpcs migration, which map a
-- declined row to Pending in the Sent section and to the window state on the card, and never
-- return the status. The recipient selects rows addressed to them normally. All status changes
-- happen through respond_to_request and withdraw_request; the update grant leaves authenticated.

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER, STABLE, empty search_path; schema private is not exposed).
-- ---------------------------------------------------------------------------

-- Blocks are an absolute filter, in either direction (rulings 119, 157).
create or replace function private.is_blocked(p_a uuid, p_b uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_a is not null and p_b is not null and exists (
    select 1 from public.member_blocks b
    where (b.blocker_id = p_a and b.blocked_id = p_b) or (b.blocker_id = p_b and b.blocked_id = p_a)
  );
$$;

-- First degree now reads the adjacency projection (one index scan), not the request table.
create or replace function private.is_connected(p_a uuid, p_b uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_a is not null and p_b is not null and exists (
    select 1 from public.member_connections c where c.member_id = p_a and c.other_id = p_b
  );
$$;

-- Within n hops (1 = first degree, 2 = adds the materialised second degree, 3 = a bounded,
-- cycle-guarded CTE for this one pair; never enumerated).
create or replace function private.is_connected_within(p_a uuid, p_b uuid, p_hops integer)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_a is null or p_b is null or p_a = p_b then return false; end if;
  if private.is_connected(p_a, p_b) then return true; end if;
  if p_hops < 2 then return false; end if;
  if exists (select 1 from public.second_degree s where s.member_id = p_a and s.fof_id = p_b) then
    return true;
  end if;
  if p_hops < 3 then return false; end if;
  return exists (
    select 1
    from public.member_connections c1
    join public.member_connections c2 on c2.member_id = c1.other_id and c2.other_id <> p_a
    join public.member_connections c3 on c3.member_id = c2.other_id and c3.other_id <> c1.other_id and c3.other_id <> p_a
    where c1.member_id = p_a and c3.other_id = p_b
    limit 1
  );
end;
$$;

-- The Where floor, read from configuration (ruling 154), never a literal in a query.
create or replace function private.setting_int(p_key text, p_default integer)
returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce((select s.value_int from private.connect_settings s where s.key = p_key), p_default);
$$;

revoke execute on function
  private.is_blocked(uuid, uuid), private.is_connected_within(uuid, uuid, integer),
  private.setting_int(text, integer)
from public, anon;
grant execute on function
  private.is_blocked(uuid, uuid), private.is_connected_within(uuid, uuid, integer),
  private.setting_int(text, integer)
to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Triggers. Accept writes both connect edges and both adjacency rows (ruling 111); the adjacency
-- insert maintains second_degree incrementally; a follow edge mirrors into member_follows so the
-- profile's read (Brief 3) stays right without a second write path.
-- ---------------------------------------------------------------------------

create or replace function private.on_connection_accepted()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' and new.to_member_id is not null then
    insert into public.edges (from_id, to_id, edge_type) values
      (new.from_member_id, new.to_member_id, 'connect'),
      (new.to_member_id, new.from_member_id, 'connect')
    on conflict do nothing;
    insert into public.member_connections (member_id, other_id, source_request_id) values
      (new.from_member_id, new.to_member_id, new.id),
      (new.to_member_id, new.from_member_id, new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function private.on_connection_accepted() from public;
create trigger on_connection_request_accepted_graph
  after update of status on public.connection_requests
  for each row execute function private.on_connection_accepted();

-- Incremental second degree. For the new pair (a, b): every other connection x of a becomes a
-- friend-of-friend of b via a, and b of x; the pair itself leaves the second-degree set. Both
-- adjacency rows fire, so both sides are covered. The nightly rebuild corrects any drift.
create or replace function private.second_degree_on_connect()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.second_degree s
  where (s.member_id = new.member_id and s.fof_id = new.other_id)
     or (s.member_id = new.other_id and s.fof_id = new.member_id);
  insert into public.second_degree (member_id, fof_id, via_count, sample_via_ids)
  select x.other_id, new.other_id, 1, array[new.member_id]
  from public.member_connections x
  where x.member_id = new.member_id and x.other_id <> new.other_id
    and not exists (select 1 from public.member_connections d where d.member_id = x.other_id and d.other_id = new.other_id)
  on conflict (member_id, fof_id) do update set
    via_count = public.second_degree.via_count + 1,
    sample_via_ids = case when array_length(public.second_degree.sample_via_ids, 1) >= 3
      then public.second_degree.sample_via_ids
      else array_append(public.second_degree.sample_via_ids, new.member_id) end,
    refreshed_at = now();
  insert into public.second_degree (member_id, fof_id, via_count, sample_via_ids)
  select new.other_id, x.other_id, 1, array[new.member_id]
  from public.member_connections x
  where x.member_id = new.member_id and x.other_id <> new.other_id
    and not exists (select 1 from public.member_connections d where d.member_id = new.other_id and d.other_id = x.other_id)
  on conflict (member_id, fof_id) do update set
    via_count = public.second_degree.via_count + 1,
    sample_via_ids = case when array_length(public.second_degree.sample_via_ids, 1) >= 3
      then public.second_degree.sample_via_ids
      else array_append(public.second_degree.sample_via_ids, new.member_id) end,
    refreshed_at = now();
  return new;
end;
$$;
revoke execute on function private.second_degree_on_connect() from public;
create trigger on_member_connection_second_degree
  after insert on public.member_connections
  for each row execute function private.second_degree_on_connect();

-- Full rebuild (the nightly REFRESH of ruling 111).
create or replace function private.refresh_second_degree()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  create temp table sd_new on commit drop as
  select a.member_id, b.other_id as fof_id, count(*)::integer as via_count,
    (array_agg(a.other_id))[1:3] as sample_via_ids
  from public.member_connections a
  join public.member_connections b on b.member_id = a.other_id
  where b.other_id <> a.member_id
    and not exists (select 1 from public.member_connections d where d.member_id = a.member_id and d.other_id = b.other_id)
  group by a.member_id, b.other_id;
  delete from public.second_degree s
  where not exists (select 1 from sd_new n where n.member_id = s.member_id and n.fof_id = s.fof_id);
  insert into public.second_degree (member_id, fof_id, via_count, sample_via_ids, refreshed_at)
  select member_id, fof_id, via_count, sample_via_ids, now() from sd_new
  on conflict (member_id, fof_id) do update set
    via_count = excluded.via_count, sample_via_ids = excluded.sample_via_ids, refreshed_at = now();
end;
$$;
revoke execute on function private.refresh_second_degree() from public, anon, authenticated;
grant execute on function private.refresh_second_degree() to service_role;
select private.refresh_second_degree();

-- Nightly rebuild through pg_cron where the platform allows it; otherwise the function stands
-- ready for an operator schedule and the incremental path keeps the set current.
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron not available here (%); schedule private.refresh_second_degree() by hand', sqlerrm;
    return;
  end;
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'dna_second_degree_nightly';
    perform cron.schedule('dna_second_degree_nightly', '15 2 * * *', 'select private.refresh_second_degree()');
  end if;
exception when others then
  raise notice 'pg_cron schedule skipped (%)', sqlerrm;
end $$;

-- A follow edge mirrors into member_follows (the profile's read); a revoked edge leaves it.
create or replace function private.mirror_follow_edge()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.edge_type = 'follow' and new.revoked_at is null then
    insert into public.member_follows (follower_id, member_id, created_at)
    values (new.from_id, new.to_id, new.created_at) on conflict do nothing;
  elsif tg_op = 'UPDATE' and new.edge_type = 'follow' and new.revoked_at is not null and old.revoked_at is null then
    delete from public.member_follows f where f.follower_id = new.from_id and f.member_id = new.to_id
      and not exists (select 1 from public.edges e where e.from_id = new.from_id and e.to_id = new.to_id
        and e.edge_type = 'follow' and e.revoked_at is null and e.id <> new.id);
  end if;
  return new;
end;
$$;
revoke execute on function private.mirror_follow_edge() from public;
create trigger on_edge_follow_mirror
  after insert or update of revoked_at on public.edges
  for each row execute function private.mirror_follow_edge();

-- A member's edges pointing at them leave with them (to_id carries no foreign key, see tables).
create or replace function private.edges_purge_member()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.edges e where e.to_id = old.id and e.edge_type in ('connect', 'follow');
  return old;
end;
$$;
revoke execute on function private.edges_purge_member() from public;
create trigger on_member_deleted_edges
  before delete on public.members
  for each row execute function private.edges_purge_member();

-- ---------------------------------------------------------------------------
-- Privileges. anon: nothing on any Connect table. authenticated: reads under the policies below;
-- writes only where the surface writes directly (dismissals, blocks); everything else through the
-- SECURITY DEFINER write paths. service_role: everything.
-- ---------------------------------------------------------------------------

revoke all on table public.edges, public.member_connections, public.second_degree,
  public.dismissed_suggestions, public.corridors, public.member_corridors, public.member_embeddings,
  public.member_blocks, public.member_segments from anon, public;

grant select on table public.edges to authenticated;
grant select on table public.member_connections to authenticated;
-- via_count and sample_via_ids are withheld by column grant: no client can select them.
grant select (member_id, fof_id, refreshed_at) on table public.second_degree to authenticated;
grant select, insert, delete on table public.dismissed_suggestions to authenticated;
grant select on table public.corridors to authenticated;
grant select on table public.member_corridors to authenticated;
grant select, insert, delete on table public.member_blocks to authenticated;
grant select on table public.member_segments to authenticated;
-- member_embeddings: no member access at all.

grant all on table public.edges, public.member_connections, public.second_degree,
  public.dismissed_suggestions, public.corridors, public.member_corridors, public.member_embeddings,
  public.member_blocks, public.member_segments to service_role;

-- connection_requests (ruling 157): the sender loses direct select and every status write moves to
-- the write paths. Insert stays for the composer's Connect verb (publish_post, SECURITY INVOKER).
drop policy if exists connection_requests_member_select on public.connection_requests;
drop policy if exists connection_requests_member_update on public.connection_requests;
drop policy if exists connection_requests_member_delete on public.connection_requests;
revoke update, delete on table public.connection_requests from authenticated;
create policy connection_requests_recipient_select on public.connection_requests for select to authenticated
using (to_member_id = (select auth.uid()) and status <> 'withdrawn');

-- member_follows: one write path (set_follow, through edges). The follower's own read stands.
drop policy if exists member_follows_follower_insert on public.member_follows;
drop policy if exists member_follows_follower_delete on public.member_follows;
revoke insert, update, delete on table public.member_follows from authenticated;

-- ---------------------------------------------------------------------------
-- edges: a follow is the follower's alone (ruling 118: a followed member never learns who follows
-- them, by row or by count). A connect edge is readable by either party. Later types: either end.
-- ---------------------------------------------------------------------------
create policy edges_member_select on public.edges for select to authenticated
using (
  from_id = (select auth.uid())
  or (edge_type <> 'follow' and to_id = (select auth.uid()))
);
create policy edges_admin_select on public.edges for select to authenticated using (private.is_admin());
create policy edges_admin_delete on public.edges for delete to authenticated using (private.is_admin());
create policy edges_service_role on public.edges for all to service_role using (true) with check (true);

-- member_connections: either party of the pair. Written by trigger only.
create policy member_connections_party_select on public.member_connections for select to authenticated
using (member_id = (select auth.uid()) or other_id = (select auth.uid()));
create policy member_connections_admin_select on public.member_connections for select to authenticated using (private.is_admin());
create policy member_connections_admin_delete on public.member_connections for delete to authenticated using (private.is_admin());
create policy member_connections_service_role on public.member_connections for all to service_role using (true) with check (true);

-- second_degree: own rows only, and never the counting columns (grant above).
create policy second_degree_owner_select on public.second_degree for select to authenticated
using (member_id = (select auth.uid()));
create policy second_degree_admin_select on public.second_degree for select to authenticated using (private.is_admin());
create policy second_degree_service_role on public.second_degree for all to service_role using (true) with check (true);

-- dismissed_suggestions: own rows, select, insert and delete (ruling 113).
create policy dismissed_suggestions_owner_select on public.dismissed_suggestions for select to authenticated
using (member_id = (select auth.uid()));
create policy dismissed_suggestions_owner_insert on public.dismissed_suggestions for insert to authenticated
with check (member_id = (select auth.uid()) and not private.is_blocked((select auth.uid()), dismissed_id));
create policy dismissed_suggestions_owner_delete on public.dismissed_suggestions for delete to authenticated
using (member_id = (select auth.uid()));
create policy dismissed_suggestions_admin_select on public.dismissed_suggestions for select to authenticated using (private.is_admin());
create policy dismissed_suggestions_service_role on public.dismissed_suggestions for all to service_role using (true) with check (true);

-- corridors: reference rows, readable by members; the seed is written by migration or service role.
create policy corridors_member_select on public.corridors for select to authenticated using (true);
create policy corridors_service_role on public.corridors for all to service_role using (true) with check (true);

-- member_corridors: a member reads their own rows; other members' corridor lines arrive through
-- the projection. Written by the service role with the seed (ruling 154).
create policy member_corridors_owner_select on public.member_corridors for select to authenticated
using (member_id = (select auth.uid()));
create policy member_corridors_admin_select on public.member_corridors for select to authenticated using (private.is_admin());
create policy member_corridors_service_role on public.member_corridors for all to service_role using (true) with check (true);

-- member_embeddings: service role only (no provider is called in this build; ruling 153).
create policy member_embeddings_admin_select on public.member_embeddings for select to authenticated using (private.is_admin());
create policy member_embeddings_service_role on public.member_embeddings for all to service_role using (true) with check (true);

-- member_blocks: the blocker's own rows. The blocked member never learns of the row.
create policy member_blocks_owner_select on public.member_blocks for select to authenticated
using (blocker_id = (select auth.uid()));
create policy member_blocks_owner_insert on public.member_blocks for insert to authenticated
with check (blocker_id = (select auth.uid()));
create policy member_blocks_owner_delete on public.member_blocks for delete to authenticated
using (blocker_id = (select auth.uid()));
create policy member_blocks_admin_select on public.member_blocks for select to authenticated using (private.is_admin());
create policy member_blocks_admin_delete on public.member_blocks for delete to authenticated using (private.is_admin());
create policy member_blocks_service_role on public.member_blocks for all to service_role using (true) with check (true);

-- member_segments: reference data.
create policy member_segments_member_select on public.member_segments for select to authenticated using (true);
create policy member_segments_service_role on public.member_segments for all to service_role using (true) with check (true);
