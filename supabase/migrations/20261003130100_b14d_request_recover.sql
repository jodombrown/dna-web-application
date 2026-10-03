-- Brief 14 Messenger, handoff 41-D, Part A2 (rulings 1341; held item 3): Recover returns a declined
-- request to pending. At bf6b10c Recover called messenger_request_accept, which accepts from
-- declined and opens a thread; the extraction's Recover puts the card back in Requests with the
-- toast "Back in Requests." The sender is not told either way (157). The sender's cap of twenty
-- pending (private.message_request_send) counts only the sender's own sends at send time, so a
-- recovery may leave a sender above twenty; that is the recipient's act, not the sender's.
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963).

create or replace function private.message_request_recover(p_request uuid)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_req public.message_requests;
begin
  select * into v_req from public.message_requests r where r.id = p_request for update;
  if v_req.id is null or v_req.recipient_id <> v_uid then
    raise exception 'not_your_request' using errcode = '42501';
  end if;
  if v_req.state <> 'declined' then
    raise exception 'not_declined' using errcode = 'P0001';
  end if;
  update public.message_requests
  set state = 'pending', decided_at = null
  where id = p_request;
end;
$$;

revoke all on function private.message_request_recover(uuid) from public;

create or replace function public.messenger_request_recover(p_request uuid)
returns void
language sql
volatile
security definer
set search_path to ''
as $$ select private.message_request_recover(p_request); $$;

revoke all on function public.messenger_request_recover(uuid) from public, anon;
grant execute on function public.messenger_request_recover(uuid) to authenticated, service_role;
