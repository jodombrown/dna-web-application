-- Rulings 435 and 382 (Fix PR 02): an INSERT ... RETURNING is checked against the table's SELECT
-- policies as well as its INSERT policy, and a row no SELECT policy admits is refused with "new row
-- violates row-level security policy" (42501), which is what CI run 169 reported for the accepted_at
-- arm's fixture row. live_arms gains a SELECT policy confined to the two test accounts, the same
-- scope as attestations_live_arms_insert and attestations_live_arms_update; the column grant stays
-- id only.
drop policy if exists attestations_live_arms_select on public.attestations;
create policy attestations_live_arms_select on public.attestations
  for select to live_arms
  using (exists (
    select 1 from public.members m
    where m.id = member_id and m.handle in ('owner-test', 'member-test')
  ));
