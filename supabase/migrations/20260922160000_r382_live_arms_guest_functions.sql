-- Ruling 382, for handoff 30-D's two live-db guest arms (Session 31). Committed on PR #58's branch
-- and applied to the canonical project by Chat through execute_sql under rulings 963 and 965, with
-- its supabase_migrations.schema_migrations row in the same transaction, never by apply_migration
-- (rulings 553, 269). Runs after 20260922150100.
--
-- The arms prove, inside a transaction they roll back, that guest_link_request refuses an event
-- with no public page and that guest_rsvp writes a going row for a followed link only. Both
-- functions are SECURITY DEFINER with execute granted to service_role alone (20260922120000), so
-- the connecting role live_arms could not call them and both arms read UNPROVEN (ruling 228).
--
-- live_arms gains execute on exactly these two signatures and nothing wider. What the grant
-- reaches is named here rather than assumed: the functions gate on the event's public page and on
-- the throttle, not on the caller, so a holder of LIVE_DB_URL may mint a guest row on any published
-- event. That is CI's one secret for this role and the arms roll their rows back. Recorded as a
-- finding under the prototype posture, severity Low, invite-boundary gate: before real member data
-- the arms move behind a fixture policy that admits only the two ruling 218 test accounts' events,
-- as the attestations arms already do (435).
--
-- No table changes, no function changes, no change to any existing policy or grant.

grant execute on function public.guest_link_request(text, text) to live_arms;
grant execute on function public.guest_rsvp(uuid, text, text) to live_arms;
