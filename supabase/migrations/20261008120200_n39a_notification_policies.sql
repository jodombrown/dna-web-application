-- Handoff 55-A (39-A), File C: the read policies on public.notifications (rulings 1323, 1518; N9,
-- N10).
--
--   N9   notifications_actor_select returned a row, read_at among its columns, to the member who
--        caused it, against its own migration's comment (b2). No reader in src/ uses it. Dropped
--        (1323): an actor reads none of the rows they cause.
--   N10  a row from a member the recipient has blocked still rendered with the name. The recipient's
--        select now carries the block test both ways (private.is_blocked is symmetric, 1518), as row
--        policy and never as client filtering (139): a blocked member's rows stop reaching the
--        recipient at all. private.notify refuses to write such a row in the first place (File D);
--        this is the read side for rows written before a block.
--
-- The update policy and the column grant are unchanged: a client may set read_at on its own rows and
-- nothing else. seen_at is written by notifications_mark_seen and private.notification_settle, never
-- by a client update (1322).
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963).

drop policy if exists notifications_actor_select on public.notifications;

drop policy if exists notifications_recipient_select on public.notifications;

create policy notifications_recipient_select on public.notifications
  for select to authenticated
  using (
    recipient_member_id = (select auth.uid())
    and not (actor_kind = 'member' and private.is_blocked(recipient_member_id, actor_id))
  );

comment on policy notifications_recipient_select on public.notifications is
  'The recipient reads their own rows, and none whose member actor they block or are blocked by (handoff 55-A, rulings 1323, 1518). No other client role reads a row: the actor''s policy is gone (N9).';
