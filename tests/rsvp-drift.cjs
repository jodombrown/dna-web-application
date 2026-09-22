// RSVP edge drift (ruling 1002, Convene Pass 2). public.event_registrations is the truth for
// attendance; the event_rsvp edge the Connection Engine reads is derived from it inside the one
// write path, private.rsvp_write, in the same transaction and never by a trigger. A derivation that
// nothing enforces is a derivation that drifts, so private.rsvp_edge_drift() names every place the
// two disagree and this arm reads it, through LIVE_DB_URL as live_arms (ruling 382: the role holds
// USAGE on private and EXECUTE on that function and on private.rsvp_going_member_count(), and
// nothing else).
// Usage: LIVE_DB_URL=postgres://... node tests/rsvp-drift.cjs
//
// Three outcomes, stated by name, in tests/migration-drift.cjs's shape:
//   PASS      the function returned no rows: every going member registration carries exactly one
//             live event_rsvp edge, and every live event_rsvp edge carries a going registration.
//   FAIL      a row, printed by kind, event and member. The run exits 1.
//   UNPROVEN  nothing was measured (ruling 228), and the run exits 0: no LIVE_DB_URL, no pg
//             package, a connection string this arm cannot parse, a connection that did not open,
//             or private.rsvp_edge_drift() not on the project yet. The last is the state between
//             20260921120100 landing in the tree (ruling 225 commits it first) and Chat applying
//             it, and it is the expected reading on every branch until then.
//
// The function existing while live_arms cannot execute it is not unproven, it is a FAIL: the same
// file that creates the function makes both grants, so the project disagreeing with the file about
// them is drift of exactly the kind ruling 444 exists to name.
//
// The denominator comes from private.rsvp_going_member_count() (ruling 1022, G57), which
// 20260921140100 creates and grants live_arms EXECUTE on. It returns the number of going member
// registrations and nothing else: live_arms still holds no select on public.event_registrations,
// because it does not bypass row security (ruling 382) and a policy admitting it would show it real
// members' rows. Once the function is on the project the PASS line states the number, zero included.
// Its two named failures mean two different things. 42883, the function not on the project, is the
// state between 20260921140100 landing in the tree and Chat applying it: the PASS states the
// agreement and says the count function is not applied yet. 42501, the function present and not
// executable by this role, is the same drift the paragraph above names for rsvp_edge_drift(),
// because the file that creates the function grants it, and it is a FAIL. Anything else keeps the
// count unread and the PASS says so. The agreement itself is measured either way, because
// private.rsvp_edge_drift() is SECURITY DEFINER and scans both sides whole.
const { clientConfig } = require("./live-db.cjs");

const unproven = (why) => {
  console.log(`UNPROVEN rsvp edge drift (ruling 1002)  (${why})`);
  process.exit(0);
};

(async () => {
  const url = process.env.LIVE_DB_URL;
  if (!url) unproven("set LIVE_DB_URL; nothing was measured");

  let pg;
  try {
    pg = require("pg");
  } catch {
    unproven("the pg package is not installed");
  }

  const config = clientConfig(url);
  if (!config) unproven("LIVE_DB_URL is not a postgres:// connection string this arm can parse");

  let client;
  try {
    client = new pg.Client(config);
    await client.connect();
  } catch (e) {
    unproven("could not connect: " + (e.message || e));
  }

  let code = 0;
  try {
    const present = await client.query(
      `select exists (
         select 1 from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'private' and p.proname = 'rsvp_edge_drift' and p.pronargs = 0
       ) as present`,
    );
    if (!present.rows[0].present) {
      console.log(
        "UNPROVEN rsvp edge drift (ruling 1002)  (private.rsvp_edge_drift() is not on the project yet; 20260921120100 is committed under ruling 225 and not applied)",
      );
      return;
    }

    let rows;
    try {
      const r = await client.query(
        "select kind, event_id, member_id from private.rsvp_edge_drift() order by kind, event_id, member_id",
      );
      rows = r.rows;
    } catch (e) {
      if (e.code === "42501") {
        console.log(
          "FAIL rsvp edge drift (ruling 1002): private.rsvp_edge_drift() exists and this role cannot reach it. 20260921120100 grants live_arms USAGE on schema private and EXECUTE on the function; the project holds neither.",
        );
        code = 1;
        return;
      }
      throw e;
    }

    let measured = null;
    let refused = "";
    let countDrift = false;
    try {
      const c = await client.query("select private.rsvp_going_member_count() as n");
      measured = c.rows[0].n;
    } catch (e) {
      if (e.code === "42501") {
        console.log(
          "FAIL rsvp edge drift (ruling 1022): private.rsvp_going_member_count() exists and this role cannot execute it. 20260921140100 grants live_arms EXECUTE on the function; the project does not hold it.",
        );
        countDrift = true;
      } else {
        refused =
          e.code === "42883"
            ? "private.rsvp_going_member_count() is not on the project yet; 20260921140100 is committed under ruling 225 and not applied"
            : "the count could not be read: " + (e.message || e);
      }
    }

    if (rows.length) {
      for (const row of rows) {
        console.log(`FAIL ${row.kind}: event ${row.event_id}, member ${row.member_id}`);
      }
      console.log(
        `\n${rows.length} disagreement(s) between public.event_registrations and the live event_rsvp edges (ruling 1002).`,
      );
      code = 1;
      return;
    }

    if (countDrift) {
      code = 1;
      return;
    }

    const behind =
      measured === null
        ? `the count of going member registrations behind it is not readable here (${refused})`
        : `${measured} going member registration(s) measured by private.rsvp_going_member_count()`;
    console.log(
      `PASS rsvp edge drift (ruling 1002)  every going member registration carries one live event_rsvp edge and every live event_rsvp edge carries a going registration; ${behind}`,
    );
  } catch (e) {
    // Anything the named outcomes above did not account for is a failure, not a silent pass: the
    // arm reached the project, so something was measurable and was not measured.
    console.error(e);
    code = 1;
  } finally {
    await client.end().catch(() => {});
  }
  process.exit(code);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
