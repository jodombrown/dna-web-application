// RSVP edge drift (ruling 1002, Convene Pass 2). public.event_registrations is the truth for
// attendance; the event_rsvp edge the Connection Engine reads is derived from it inside the one
// write path, private.rsvp_write, in the same transaction and never by a trigger. A derivation that
// nothing enforces is a derivation that drifts, so private.rsvp_edge_drift() names every place the
// two disagree and this arm reads it, through LIVE_DB_URL as live_arms (ruling 382: the role holds
// USAGE on private and EXECUTE on that one function, and nothing else).
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
// The denominator is read separately and is not always reachable. The PASS line says how many going
// member registrations stand behind it when the connecting role can count them, and says why it
// cannot when it cannot: 20260921120100 grants live_arms nothing on public.event_registrations, so
// on the canonical project the count is refused and the PASS states the agreement without it. The
// agreement itself is measured either way, because private.rsvp_edge_drift() is SECURITY DEFINER and
// scans both sides whole. Recorded as gap G57.
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
    try {
      const c = await client.query(
        "select count(*)::int as n from public.event_registrations where member_id is not null and status = 'going'",
      );
      measured = c.rows[0].n;
    } catch (e) {
      refused =
        e.code === "42501"
          ? "the connecting role holds no select on public.event_registrations (G57)"
          : "the count could not be read: " + (e.message || e);
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

    const behind =
      measured === null
        ? `the count of going member registrations behind it is not readable here (${refused})`
        : `${measured} going member registration(s) measured`;
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
