-- Brief 14 Messenger, handoff 41-A, file 8 of 9: the three Messenger ceilings (ruling 1353), added to
-- public.rate_limit_check as branches. The 20260912090557 body is carried unchanged with three
-- branches after media_upload; the ceilings stay in the function body (finding F3: no ceiling table
-- exists and none is created), and the client never supplies a window or a count.
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963, 965), never
-- apply_migration (553, 269).

create or replace function public.rate_limit_check(p_action text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'rate_limit_check: not signed in' using errcode = '42501';
  end if;
  if p_action = 'media_upload' then
    return private.rate_limit(v_uid, 'media_upload', interval '1 hour', 60);
  end if;
  -- Brief 14 (1353): thirty sends a minute, twenty requests a day, forty media objects an hour.
  if p_action = 'message_send' then
    return private.rate_limit(v_uid, 'message_send', interval '1 minute', 30);
  end if;
  if p_action = 'message_request' then
    return private.rate_limit(v_uid, 'message_request', interval '1 day', 20);
  end if;
  if p_action = 'message_media' then
    return private.rate_limit(v_uid, 'message_media', interval '1 hour', 40);
  end if;
  raise exception 'rate_limit_check: unknown action' using errcode = '22023';
end;
$$;
revoke execute on function public.rate_limit_check(text) from public, anon;
grant execute on function public.rate_limit_check(text) to authenticated, service_role;
comment on function public.rate_limit_check(text) is
  'The one rate-limit RPC (rulings 442, 1353): media_upload (60 an hour), message_send (30 a minute), message_request (20 a day), message_media (40 an hour). The action names the ceiling; the answer is a boolean the caller turns into words.';
