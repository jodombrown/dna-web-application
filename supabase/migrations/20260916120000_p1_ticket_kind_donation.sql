-- Convene Pass 1 (P1-SPEC section 3, the send-off): tickets are Free, Paid or Donation as words.
-- Alone in its file: an ADD VALUE cannot share a transaction with a statement that uses the value,
-- and 20260916120200_p1_publish_post_convene.sql casts it. Amounts are Pass 4; this is the kind only.
alter type public.ticket_kind add value if not exists 'donation';
