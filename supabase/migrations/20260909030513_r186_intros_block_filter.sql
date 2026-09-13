-- Ruling 186: private.is_blocked is an absolute filter in both directions on every projection
-- that returns a member. connection_request_intros returned to_name with no block filter.
-- private.is_blocked is symmetric, so filtering on the pair covers both directions at once.
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
