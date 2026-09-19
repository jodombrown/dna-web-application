-- Ruling 927: `place-resolve` already fetches Mapbox's context for every resolved place and keeps
-- only the city and the country from it. The region is in the same response and is dropped, so a
-- surface that wants to say "Ashanti" has to issue a second lookup for a value the first one
-- already carried. This column keeps it.
--
-- Nullable on both tables. On `event_delivery` that matches every other place column. On
-- `member_homes` it diverges from the table's `NOT NULL` pattern on purpose: existing rows hold no
-- Mapbox context to backfill from, and deriving a region for them would be invented geography in
-- the database, which is what ruling 790's guardrail refuses. New rows written through the composer
-- carry it; old rows read null and a surface renders nothing, which is grounded-or-empty.
--
-- Added bare with no default, so ruling 564's two-statement form is not engaged and
-- `tests/migration-lint.cjs` has nothing to flag. Committed before it is applied (ruling 225).
--
-- Reaches the canonical project by SQL Editor paste on supabase.com, or by dispatch-only GitHub
-- Actions with a required reviewer (ruling 562), and never by `apply_migration` (553, 269). The two
-- Pass 4 headers say `supabase db push` and are not amended, because ruling 466 forbids editing an
-- applied migration; this header and its sibling are the tree's corrected statement.
--
-- HOW THE VERSION IS RECORDED, and why this file does not record it itself. `tests/migration-drift.cjs`
-- md5s **the whole file text**, trailing whitespace stripped, and compares it to the md5 of the
-- recorded `statements` array joined with newlines. So a row whose `statements` array is a
-- hand-written list of the bare DDL — `array['alter table public.event_delivery add column region
-- text', ...]` — does not match this file and the arm reads
-- `FAIL 20260919120000 p5_region_context: statement md5 ... differs from ...` on every branch that
-- carries the file, permanently. It is not an `EMPTY` row either; that is the separate `if (!row.n)`
-- condition. A file cannot contain its own full text as a literal, so the recording is done by
-- whatever applies the file and has the file in hand: the dispatch-only Action reads it, and a paste
-- records it in the same transaction with the file's own text as the statement. What must be true
-- when the paste is done is only this: `array_to_string(statements, E'\n')` equals this file's text
-- with trailing whitespace stripped. Nothing else makes the drift arm read clean, which is this
-- change's own proof.
--
-- RLS. Both tables already carry it with policies for every persona, and all four are row
-- predicates that enumerate no columns, so a new column inherits them and needs no policy edit:
-- `event_delivery_physical_select` (kind <> 'meeting_link' and the event is visible),
-- `event_delivery_host_all`, `event_delivery_service_role`, `member_homes_owner_all`
-- (member_id = auth.uid()) and `member_homes_service_role`. Read in
-- 20260916120100_p1_convene_place_columns.sql rather than assumed.

begin;

alter table public.event_delivery
  add column region text;

comment on column public.event_delivery.region is
  'Mapbox context region for the resolved place (ruling 927). Null where the place was not resolved, where Mapbox returned no region, or where the row predates this column.';

alter table public.member_homes
  add column region text;

comment on column public.member_homes.region is
  'Mapbox context region for the home (ruling 927). Null on rows written before this column; nullable by design because no backfill exists that is not invented (790). No writer exists in the tree yet: member_homes is read by src/lib/homes.ts and written by nothing, so this column is chassis for the Profile homes editor that ruling 633 still owes.';

commit;
