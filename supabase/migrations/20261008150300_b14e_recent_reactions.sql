-- Brief 14 Messenger, handoff 56-41E, item 1.5 (ruling 1405).
-- The member's own recent emoji, first in the picker: the caller's last 24 distinct reaction values
-- from message_reactions by created_at descending. Structure only: it reads the member's own
-- reaction rows and never a message body, so nothing here reasons from text (1405).
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963).

create function public.messenger_recent_reactions()
returns text[]
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(array_agg(x.reaction order by x.last_at desc), '{}'::text[])
  from (
    select r.reaction, max(r.created_at) as last_at
    from public.message_reactions r
    where r.member_id = private.require_uid()
    group by r.reaction
    order by last_at desc
    limit 24
  ) x;
$$;

revoke all on function public.messenger_recent_reactions() from public, anon;
grant execute on function public.messenger_recent_reactions() to authenticated, service_role;
