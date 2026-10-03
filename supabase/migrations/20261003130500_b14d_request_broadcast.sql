-- Brief 14 Messenger, handoff 41-D Addendum 1, Part A6 (ruling 157; G197): a decline never
-- reaches the sender. private.message_requests_broadcast sent every insert and update to both
-- inboxes with the state in the payload, so the sender's socket learned of a decline, and would
-- learn of a recovery. The recipient still receives every change. The sender receives the insert
-- (their own send, on their other tabs) and the accept (the thread now exists); a decline, a
-- recovery and a block send nothing to the sender. Replaced whole; nothing else changed.
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963).

create or replace function private.message_requests_broadcast()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_payload jsonb := jsonb_build_object(
    'id', new.id,
    'state', new.state,
    'sender_id', new.sender_id,
    'recipient_id', new.recipient_id,
    'thread_id', new.thread_id,
    'created_at', new.created_at,
    'decided_at', new.decided_at);
begin
  perform realtime.send(v_payload, 'request', 'inbox:' || new.recipient_id::text, true);
  if tg_op = 'INSERT' or new.state = 'accepted' then
    perform realtime.send(v_payload, 'request', 'inbox:' || new.sender_id::text, true);
  end if;
  return null;
end;
$function$;
