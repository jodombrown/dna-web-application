# Gap notes

Things the build knows are missing, with the ruling that put them here. A gap is not a defect: it is
work that was deliberately not done, recorded so it is not rediscovered by accident. Notion is the
source of truth for the Gap Register; this file is the repo's working copy, and it carries only gaps
a reader of this codebase would otherwise have to infer from an absence.

Phase posture (ruling 140): the canonical project holds no real member data, so visibility, RLS and
consent findings are recorded with a severity and tracked. None of them blocks a merge. They are
invite-boundary gates, to close before the first real member invite.

## G1. Block and report have no surface (ruling 186)

**Severity: high at the invite boundary. Not a merge blocker (ruling 140).**

`public.member_blocks` exists and is enforced, but nothing in the app writes to it.

Ruling 50 places block and report in the chassis, on every surface. The chassis shipped without a
block store, so `member_blocks` was created inside Brief 4 to give Connect's projections something
to filter on. Ruling 186 moves its ownership out of Connect and corrects the register: block and
report were **not** built in the chassis.

What exists:

- The table, with RLS: the blocker selects, inserts and deletes their own rows; the blocked member
  never learns the row exists; admin may select and delete; service role has full access.
- `private.is_blocked(a, b)`, symmetric, applied as an absolute filter on every projection that
  returns a member (see the audit below).

What is missing:

- Any writer. No Block action on a member card, a profile, a post, a thread or a sheet, so in the
  running app the table can only ever hold rows put there by hand.
- Report entirely: no report object, no reason vocabulary, no queue, no admin surface. Ruling 115's
  human review queue has no inbox.
- An unblock surface, which the delete policy already permits but nothing calls.

Where it belongs: the chassis, not an engine. Convene, Collaborate, Contribute and Messaging all
filter on the same table (ruling 186), so the surface is written once and every engine inherits it.
Its brief also has to settle what a block does to work already shared between the two members, which
is a product question no ruling has yet answered.

## G2. `profile_view` does not block-filter its subject (rulings 157, 186)

**Severity: moderate at the invite boundary. Not a merge blocker (ruling 140). Needs a ruling before
it is coded, because it is a product decision, not an oversight.**

Confirmed live during the Brief 4 audit: with a block in place, `profile_view('<blocker>')` called by
the blocked member returned the full profile. Every projection *inside* the payload behaved (mutual
names emptied correctly, in both directions); the subject itself is unfiltered.

The open question is what block means for a profile, and the rulings do not settle it. Ruling 119
calls block "the hard stop" and ruling 157 calls it terminal both ways, but both describe the
connection path, not the readability of a member's page. Two defensible answers:

1. A blocked pair cannot open each other's profile at all: `profile_view` returns null and
   `/m/:handle` renders the same not-found the route already has for an unknown handle.
2. Block governs discovery and contact, not a page a member chose to make visible; the profile stays
   readable and only the actions come off.

Answer 1 is the stronger reading of "terminal both ways" and is what a member blocking someone
almost certainly expects. It also leaks the block: a profile that used to open and now does not
tells the blocked member they were blocked, which the `member_blocks` RLS is written specifically to
avoid ("the blocked member never learns of the row"). That tension is why this needs a founder
ruling rather than a patch.

Not changed in this PR. Ruling 188 also holds Profile still until its full matrix has run.

## G3. Multi-select filters on Connect (ruling 163)

**Severity: low. Deliberate scope cut, not a defect.**

Filters are single-value at launch, one value per axis across ten axes. Multi-select on skill, focus
area and industry was logged rather than built, because it turns the chip row, the URL scheme and
the empty-state copy into their own design problem. `docs/connect/SPEC.md` §13 refers to this as the
"logged gap"; this is where it is logged.

## Audit: `member_blocks` as an absolute filter (ruling 186, item 4)

Run against the canonical project on 9 September 2026, as a real member with real blocks, not by
reading the SQL. A block was inserted, every projection that returns a member was called from both
sides, and the database was returned to its prior state (zero block rows, `where_floor` back to 5).

| Projection | Blocker's view | Blocked party's view | Result |
| --- | --- | --- | --- |
| `connect_cards('members')` | blocked member absent | blocker absent | pass, both directions |
| `connect_cards('suggested')` | blocked member absent | blocker absent | pass, both directions |
| `connect_cards('network')` (connections, requests, sent, following) | blocked member absent | blocker absent | pass, both directions |
| Mutual names (`connect_card`, `profile_view.mutuals`) | mutual emptied | mutual emptied | pass, both directions |
| DIA rail rows (`connect-suggest`) | inherits `connect_cards('suggested')` under the member's own JWT | same | pass, both directions |
| `connect_where()` underlying counts | country tile disappeared | country tile disappeared | pass, both directions |
| `connection_request_intros(ids)` | **returned the other party's name** | **same** | **failed; fixed in this PR** |
| `profile_view(handle)` subject | returned the profile | returned the profile | **failed; logged as G2, not fixed** |

The `connect_where` rows sit below the floor of five on real data, so that line was proved by
dropping `where_floor` to 1 for the two calls and restoring it to 5 immediately after.
