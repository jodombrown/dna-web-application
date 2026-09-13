create or replace function private.rebuild_second_degree_for(p_members uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope uuid[];
begin
  if p_members is null or array_length(p_members, 1) is null then return; end if;
  select array_agg(distinct x) into v_scope from (
    select unnest(p_members) as x
    union
    select c.other_id from public.member_connections c where c.member_id = any(p_members)
  ) s;
  delete from public.second_degree s where s.member_id = any(v_scope);
  insert into public.second_degree (member_id, fof_id, via_count, sample_via_ids, refreshed_at)
  select a.member_id, b.other_id, count(*)::integer, (array_agg(a.other_id))[1:3], now()
  from public.member_connections a
  join public.member_connections b on b.member_id = a.other_id
  where a.member_id = any(v_scope)
    and b.other_id <> a.member_id
    and not exists (select 1 from public.member_connections d
                    where d.member_id = a.member_id and d.other_id = b.other_id)
  group by a.member_id, b.other_id
  on conflict (member_id, fof_id) do update set
    via_count = excluded.via_count, sample_via_ids = excluded.sample_via_ids, refreshed_at = now();
end;
$$;
revoke execute on function private.rebuild_second_degree_for(uuid[]) from public, anon, authenticated;
grant execute on function private.rebuild_second_degree_for(uuid[]) to service_role;

create or replace function private.on_member_blocked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.edges e set revoked_at = now()
  where e.edge_type in ('connect', 'follow')
    and e.revoked_at is null
    and ((e.from_id = new.blocker_id and e.to_id = new.blocked_id)
      or (e.from_id = new.blocked_id and e.to_id = new.blocker_id));

  delete from public.member_connections c
  where (c.member_id = new.blocker_id and c.other_id = new.blocked_id)
     or (c.member_id = new.blocked_id and c.other_id = new.blocker_id);

  delete from public.member_follows f
  where (f.follower_id = new.blocker_id and f.member_id = new.blocked_id)
     or (f.follower_id = new.blocked_id and f.member_id = new.blocker_id);

  perform private.rebuild_second_degree_for(array[new.blocker_id, new.blocked_id]);
  return new;
end;
$$;
revoke execute on function private.on_member_blocked() from public, anon, authenticated;

drop trigger if exists on_member_block_revokes_relationship on public.member_blocks;
create trigger on_member_block_revokes_relationship
  after insert on public.member_blocks
  for each row execute function private.on_member_blocked();
