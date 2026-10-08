-- Handoff 55-A (39-A), File A: the two anchor values the notification writer names as objects
-- (rulings 1315, 1319, 1339). A message request and a Messenger thread become objects a notification
-- can point at: `message_request` for the request's own row, `thread` for a thread invitation.
--
-- Values only (CLAUDE.md, the enum line): a value added by `alter type ... add value` cannot be used in
-- the transaction that adds it, so nothing in this file uses either value, and nothing in the files
-- after it uses either as data. The functions that name them are plpgsql, whose bodies are not
-- evaluated at creation, or compare the enum as text (`private.can_see_anchor` in the next file).
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963).

alter type public.anchor_kind add value if not exists 'thread';
alter type public.anchor_kind add value if not exists 'message_request';
