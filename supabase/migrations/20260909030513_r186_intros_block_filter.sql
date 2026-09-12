-- ---------------------------------------------------------------------------
-- Ruling 186: block and report are chassis-level, and private.is_blocked is an absolute filter in
-- both directions on every projection that returns a member.
--
-- The Brief 4 audit ran each projection live, as a member, with a block in place. Members,
-- Suggested, the network lens, the rail rows, mutual names and Where's underlying counts all
-- filtered correctly in both directions. connection_request_intros did not: it returns to_name,
-- a member's name, to whichever party the request belongs to, with no block filter. A Connect
-- post in the Feed therefore still named a member who had since blocked the viewer, or whom the
-- viewer had blocked.
--
-- private.is_blocked is symmetric, so filtering on the pair covers both directions at once.
-- Nothing else about the projection changes; it keeps its own party scope and its lack of a
-- status column (ruling 157: no declined status may reach a sender).
-- ---------------------------------------------------------------------------
create or replace function public.connection_request_intros(p_ids uuid[])
returns table (id uuid, from_member_id uuid, to_member_id uuid, to_name text, why text, message text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.from_member_id, c.to_member_id, c.to_name, c.why, c.message, c.created_at
  from public.connection_requests c
  where c.id = any (coalesce(p_ids, '{}'))
    and (c.from_member_id = auth.uid() or c.to_member_id = auth.uid())
    -- Ruling 186: a blocked pair never reaches each other through any projection.
    and not private.is_blocked(c.from_member_id, c.to_member_id);
$$;
revoke execute on function public.connection_request_intros(uuid[]) from public, anon;
grant execute on function public.connection_request_intros(uuid[]) to authenticated, service_role;
