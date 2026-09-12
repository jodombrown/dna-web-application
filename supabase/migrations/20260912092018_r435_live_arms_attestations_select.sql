-- Rulings 435 and 382 (Fix PR 02): the accepted_at arm inserts its fixture row as live_arms with
-- `returning id` and later updates it `where id = $1`. Both read the id column, and Postgres refuses
-- either without SELECT on that column ("permission denied for table attestations", 42501), which
-- is what CI run 166 reported and why the arm read UNPROVEN (ruling 228). live_arms gains exactly
-- that column and nothing wider; the policies attestations_live_arms_insert and
-- attestations_live_arms_update still confine every row to the two test accounts.
grant select (id) on public.attestations to live_arms;
