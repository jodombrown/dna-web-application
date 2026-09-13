// The live arms that run inside the database, on one `pg` client over LIVE_DB_URL (rulings 382,
// 408, 409). The role is live_arms: membership in anon and authenticated with SET and without
// INHERIT, plus the fixture grants the r382 and Fix PR 02 migrations name, scoped by policy to the
// two ruling 218 test accounts. Every arm opens its own transaction, builds its own fixture
// (ruling 241), acts as a member by `set local role authenticated` plus transaction-local
// request.jwt.claims, exactly the way PostgREST sets them, and rolls back whatever happened
// (ruling 269: no persistent write to canonical data). Each arm carries a negative control and
// reports both results (ruling 270), and an arm that cannot run reports UNPROVEN, never a pass
// (ruling 228).
//
// Arms:
//   Hotfix 01 (rulings 374 to 376)  onboard_who accepts only the caller's registered avatar; the
//                                   fixture in tests/fixtures/hotfix01-onboard-who.sql runs byte
//                                   for byte, one statement batch, its own begin and rollback.
//   IB-18 (rulings 215, 415)         a direct insert into connection_requests as a member is
//                                   refused at the grant (42501); send_introduction still writes.
//   416                              the feed row for another member's post carries that member's
//                                   name; a Private author's name is withheld; anon has no feed.
//   435                              an attestation with accepted_at null is absent from the
//                                   member's own profile_view; once accepted it appears.
//   439                              publish_post refuses a javascript: link by name and stores an
//                                   https one.
//   442                              the ceiling plus one call to onboard_who is refused in words,
//                                   and the hits table is unreachable to a member.
//
// Nothing here is secret: the connection string arrives from the runner and never from this file.
const fs = require("fs");
const path = require("path");

const OWNER_HANDLE = "owner-test";
const MEMBER_HANDLE = "member-test";

function claims(uid) {
  return JSON.stringify({ sub: uid, role: "authenticated", aud: "authenticated" });
}

/**
 * pg's client config from LIVE_DB_URL. A password with a reserved character (#, /, @, ?) that was
 * pasted into the secret without percent-encoding makes the WHATWG URL parser inside pg throw
 * "Invalid URL" and take the whole suite down with it (run 165). So the string is parsed here
 * first, greedily up to the last @, and the parts are handed to pg explicitly; a string that fits
 * neither shape returns null and the arms report unproven rather than crashing. Never logged.
 */
function clientConfig(url) {
  const ssl = /sslmode=disable/.test(url) ? false : { rejectUnauthorized: false };
  const base = { ssl, statement_timeout: 60_000, query_timeout: 60_000 };
  try {
    const u = new URL(url);
    if (u.hostname) {
      return {
        ...base,
        host: u.hostname,
        port: u.port ? Number(u.port) : 5432,
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        database: decodeURIComponent(u.pathname.replace(/^\//, "")) || "postgres",
      };
    }
  } catch {
    /* fall through to the manual parse */
  }
  const m =
    /^postgres(?:ql)?:\/\/([^:@]+):(.*)@([^@\/:?]+)(?::(\d+))?(?:\/([^?]*))?(?:\?.*)?$/.exec(url);
  if (!m) return null;
  return {
    ...base,
    host: m[3],
    port: m[4] ? Number(m[4]) : 5432,
    user: decodeURIComponent(m[1]),
    password: m[2],
    database: m[5] ? decodeURIComponent(m[5]) : "postgres",
  };
}

/** Run one arm inside a transaction that always rolls back, on a client already connected. */
async function inTransaction(client, fn) {
  await client.query("begin");
  try {
    return await fn();
  } finally {
    await client.query("rollback").catch(() => {});
  }
}

/** Execute a statement expected to fail; returns {ok:false, code, message} or {ok:true, rows}. */
async function attempt(client, text, values) {
  await client.query("savepoint arm_step");
  try {
    const r = await client.query(text, values);
    await client.query("release savepoint arm_step");
    return { ok: true, rows: r.rows };
  } catch (e) {
    await client.query("rollback to savepoint arm_step");
    return { ok: false, code: e.code, message: e.message };
  }
}

async function actAs(client, uid) {
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claims', $1, true)", [claims(uid)]);
}

async function actAsSelf(client) {
  await client.query("reset role");
  await client.query("select set_config('request.jwt.claims', '', true)");
}

async function testAccounts(client) {
  const r = await client.query(
    "select id, handle, name from public.members where handle in ($1, $2)",
    [OWNER_HANDLE, MEMBER_HANDLE],
  );
  const owner = r.rows.find((m) => m.handle === OWNER_HANDLE) || null;
  const member = r.rows.find((m) => m.handle === MEMBER_HANDLE) || null;
  return { owner, member };
}

async function runLiveDbArms({ record, skip }) {
  const url = process.env.LIVE_DB_URL;
  const names = {
    hotfix: "Hotfix 01: onboard_who accepts only the caller's registered avatar (H1a, H1b, H1c)",
    ib18: "IB-18 (ruling 415): connection_requests has one writer at the API",
    feed: "ruling 416: the feed carries the author's name under can_see_core",
    accepted: "ruling 435: an attestation renders only once accepted",
    url: "ruling 439: publish_post refuses a link without an http or https scheme",
    rate: "ruling 442: the ceiling plus one call to onboard_who is refused in words",
    onboarded: "ruling 459 (W49): connect_cards excludes an account that has not onboarded",
  };
  if (process.env.SKIP_REST) {
    for (const n of Object.values(names)) skip(n, "SKIP_REST");
    return;
  }
  if (!url) {
    for (const n of Object.values(names)) skip(n, "set LIVE_DB_URL (ruling 382)");
    return;
  }
  let pg;
  try {
    pg = require("pg");
  } catch {
    for (const n of Object.values(names)) skip(n, "the pg package is not installed");
    return;
  }
  const config = clientConfig(url);
  if (!config) {
    for (const n of Object.values(names))
      skip(n, "LIVE_DB_URL is not a postgres:// connection string this arm can parse");
    return;
  }
  let client;
  try {
    client = new pg.Client(config);
    await client.connect();
  } catch (e) {
    for (const n of Object.values(names)) skip(n, "could not connect: " + String(e.message || e));
    return;
  }
  try {
    const who = await client.query("select current_user as u");
    record(
      "ruling 382: the arms connect as live_arms and nothing broader",
      who.rows[0] && who.rows[0].u === "live_arms",
      "current_user " + (who.rows[0] && who.rows[0].u),
    );

    // ------------------------------------------------------------------------------------------
    // Hotfix 01: the fixture file, byte for byte. It opens and rolls back its own transaction.
    // ------------------------------------------------------------------------------------------
    {
      const sql = fs.readFileSync(
        path.join(__dirname, "fixtures/hotfix01-onboard-who.sql"),
        "utf8",
      );
      let rows = null;
      try {
        const results = await client.query(sql);
        const list = Array.isArray(results) ? results : [results];
        const withRows = list.find((r) => r && Array.isArray(r.rows) && r.rows.length);
        rows = withRows ? withRows.rows : [];
      } catch (e) {
        await client.query("rollback").catch(() => {});
        skip(names.hotfix, "the fixture batch failed: " + String(e.message || e));
      }
      if (rows) {
        const byOrd = new Map(rows.map((row) => [row.ord, row]));
        for (const row of rows.filter((x) => x.ord === 0)) {
          record("Hotfix 01: " + row.step, !!row.ok, "expected " + row.expect + "; got " + row.got);
        }
        for (const [ord, label] of [
          [1, "H1a: a registered avatar path is accepted"],
          [2, "H1b: an unregistered path under the caller's folder is refused"],
          [3, "H1c: a registered path owned by another member is refused"],
        ]) {
          const row = byOrd.get(ord);
          if (!row) skip("Hotfix 01: " + label, "no result row; the fixture did not reach it");
          else
            record(
              "Hotfix 01: " + row.step,
              !!row.ok,
              "expected " + row.expect + "; got " + row.got,
            );
        }
      }
    }

    const { owner, member } = await testAccounts(client);
    if (!owner || !member) {
      for (const n of [
        names.ib18,
        names.feed,
        names.accepted,
        names.url,
        names.rate,
        names.onboarded,
      ])
        skip(n, "owner-test and member-test are not both present");
      return;
    }

    // ------------------------------------------------------------------------------------------
    // IB-18. The negative control is the one path that still writes: send_introduction.
    // ------------------------------------------------------------------------------------------
    await inTransaction(client, async () => {
      await actAs(client, member.id);
      const direct = await attempt(
        client,
        "insert into public.connection_requests (from_member_id, to_member_id, to_name, status) values ($1, $2, $3, 'pending')",
        [member.id, owner.id, owner.name],
      );
      record(
        "IB-18 (ruling 415): a direct insert into connection_requests as a member is refused at the grant",
        !direct.ok && direct.code === "42501",
        direct.ok ? "the insert was accepted" : direct.code + " " + direct.message,
      );
      const viaPath = await attempt(client, "select public.send_introduction($1, $2) as id", [
        owner.id,
        "Ruling 415 arm. Rolled back by the same run.",
      ]);
      if (!viaPath.ok && /not available/.test(viaPath.message)) {
        skip(
          "IB-18 control: send_introduction as the same member still writes",
          "the two test accounts are not strangers (a request is pending, they are connected, or one blocks the other), so the one path refuses by design",
        );
      } else {
        record(
          "IB-18 control: send_introduction as the same member still writes",
          viaPath.ok && !!viaPath.rows[0] && !!viaPath.rows[0].id,
          viaPath.ok ? "request " + viaPath.rows[0].id : viaPath.code + " " + viaPath.message,
        );
      }
    });

    // ------------------------------------------------------------------------------------------
    // 416. The owner's post (published by the arm if they have none), read as the other member.
    // ------------------------------------------------------------------------------------------
    await inTransaction(client, async () => {
      await actAs(client, owner.id);
      let post = await client.query(
        "select id from public.feed where author_kind = 'member' and author_id = $1 limit 1",
        [owner.id],
      );
      let postId = post.rows[0] ? post.rows[0].id : null;
      if (!postId) {
        const pub = await attempt(client, "select public.publish_post($1::jsonb) as id", [
          JSON.stringify({
            body: "Ruling 416 feed author arm. Rolled back by the same run.",
            author_kind: "member",
            author_id: owner.id,
            audience: "everyone",
            host_context: "live-checks",
          }),
        ]);
        postId = pub.ok ? pub.rows[0].id : null;
        record(
          "ruling 416: the arm publishes a post as the owner so there is a row to read",
          !!postId,
          pub.ok ? "post " + postId : pub.code + " " + pub.message,
        );
      }
      if (!postId) {
        skip(names.feed, "no post by the owner could be read or published");
        return;
      }
      await actAs(client, member.id);
      const asMember = await client.query(
        "select author_name, author_handle from public.feed where id = $1",
        [postId],
      );
      const row = asMember.rows[0];
      record(
        "ruling 416: the feed row for the other member's post carries their name and handle",
        !!row && row.author_name === owner.name && row.author_handle === owner.handle,
        row ? "author_name " + JSON.stringify(row.author_name) : "no row",
      );
      // Control: the owner turns Private. can_see_core then refuses a stranger, so the name is
      // withheld: either the row still comes back with author_name null, or the row is gone.
      await actAs(client, owner.id);
      const priv = await attempt(
        client,
        "update public.members set profile_private = true where id = $1",
        [owner.id],
      );
      await actAs(client, member.id);
      const afterPriv = await client.query("select author_name from public.feed where id = $1", [
        postId,
      ]);
      const r2 = afterPriv.rows[0];
      record(
        "ruling 416 control: a Private author's name is withheld from a stranger",
        priv.ok && (!r2 || r2.author_name === null),
        !priv.ok
          ? "could not set Private: " + priv.message
          : r2
            ? "row present, author_name " + JSON.stringify(r2.author_name)
            : "row absent",
      );
      await client.query("set local role anon");
      const anon = await attempt(client, "select id from public.feed limit 1");
      record(
        "ruling 416 control: anon has no feed",
        !anon.ok && anon.code === "42501",
        anon.ok ? "anon read the feed" : anon.code,
      );
    });

    // ------------------------------------------------------------------------------------------
    // 435. One attestation on the owner, unaccepted; the owner's own projection omits it.
    // ------------------------------------------------------------------------------------------
    await inTransaction(client, async () => {
      await actAsSelf(client);
      const ins = await attempt(
        client,
        `insert into public.attestations (member_id, c_category, object_kind, object_id, attester_member_id, attester_role, accepted_at)
         values ($1, 'collaborate', 'space', gen_random_uuid(), $2, 'Space lead', null) returning id`,
        [owner.id, member.id],
      );
      if (!ins.ok) {
        skip(
          names.accepted,
          "the fixture row could not be inserted: " + ins.code + " " + ins.message,
        );
        return;
      }
      const attId = ins.rows[0].id;
      const badgesOf = async () => {
        await actAs(client, owner.id);
        const v = await client.query("select public.profile_view() as v");
        const body = v.rows[0] ? v.rows[0].v : null;
        const items = [];
        for (const g of (body && body.badges) || []) for (const it of g.items || []) items.push(it);
        return { tier: body && body.member && body.member.tier, items };
      };
      const before = await badgesOf();
      record(
        "ruling 435: an attestation with accepted_at null is absent from the member's own profile_view",
        !before.items.some((it) => it.attester === member.name && it.object === "Attested") &&
          before.tier !== "attested",
        "badges " + before.items.length + " tier " + before.tier,
      );
      await actAsSelf(client);
      const acc = await attempt(
        client,
        "update public.attestations set accepted_at = now() where id = $1",
        [attId],
      );
      const after = await badgesOf();
      record(
        "ruling 435 control: the same row appears once accepted, and the tier reads attested",
        acc.ok &&
          after.items.some((it) => it.attester === member.name && it.object === "Attested") &&
          after.tier === "attested",
        acc.ok
          ? "badges " + after.items.length + " tier " + after.tier
          : acc.code + " " + acc.message,
      );
    });

    // ------------------------------------------------------------------------------------------
    // 439. A javascript: link is refused by name; an https link publishes and is stored.
    // ------------------------------------------------------------------------------------------
    await inTransaction(client, async () => {
      await actAs(client, owner.id);
      const payload = (url) =>
        JSON.stringify({
          body: "Ruling 439 link arm. Rolled back by the same run.",
          author_kind: "member",
          author_id: owner.id,
          audience: "everyone",
          host_context: "live-checks",
          link: { url },
        });
      const bad = await attempt(client, "select public.publish_post($1::jsonb) as id", [
        payload("javascript:alert(1)"),
      ]);
      record(
        "ruling 439: a publish carrying javascript:alert(1) is refused by name",
        !bad.ok && /must start with http:\/\/ or https:\/\//.test(bad.message),
        bad.ok ? "the publish was accepted" : bad.code + " " + bad.message,
      );
      const good = await attempt(client, "select public.publish_post($1::jsonb) as id", [
        payload("https://example.com/"),
      ]);
      let stored = null;
      if (good.ok) {
        const l = await client.query("select url from public.post_links where post_id = $1", [
          good.rows[0].id,
        ]);
        stored = l.rows[0] ? l.rows[0].url : null;
      }
      record(
        "ruling 439 control: an https link publishes and is stored as given",
        good.ok && stored === "https://example.com/",
        good.ok ? "stored " + JSON.stringify(stored) : good.code + " " + good.message,
      );
    });

    // ------------------------------------------------------------------------------------------
    // 442. onboard_who ten times with a username that cannot be written (invalid, no write), then
    // the eleventh. The owner's onboarding stamps are cleared first, as the Hotfix 01 fixture does,
    // so the function reaches its checks; everything rolls back.
    // ------------------------------------------------------------------------------------------
    await inTransaction(client, async () => {
      await actAsSelf(client);
      await client.query(
        "update public.members set onboarded_at = null, who_completed_at = null where id = $1",
        [owner.id],
      );
      await actAs(client, owner.id);
      const CEILING = 10;
      let under = 0;
      let last = null;
      for (let i = 0; i < CEILING; i++) {
        const r = await attempt(client, "select public.onboard_who($1, $2, null) as out", [
          owner.name,
          "x",
        ]);
        last = r;
        if (r.ok && r.rows[0] && r.rows[0].out && r.rows[0].out.status === "invalid") under++;
      }
      record(
        "ruling 442 control: calls under the ceiling are answered",
        under === CEILING,
        under + " of " + CEILING + " answered" + (last && !last.ok ? "; last " + last.message : ""),
      );
      const over = await attempt(client, "select public.onboard_who($1, $2, null) as out", [
        owner.name,
        "x",
      ]);
      record(
        "ruling 442: the ceiling plus one call to onboard_who is refused in words",
        !over.ok && /Too many attempts/.test(over.message),
        over.ok ? "the call was answered" : over.code + " " + over.message,
      );
      const peek = await attempt(client, "select count(*) from private.rate_limit_hits");
      record(
        "ruling 442: the hits table is unreachable to a member",
        !peek.ok && peek.code === "42501",
        peek.ok ? "a member read the table" : peek.code,
      );
    });

    // ------------------------------------------------------------------------------------------
    // 459 (W49). The arm builds its own fixture (ruling 241): it sets Member Test's onboarded_at
    // inside the transaction, measures the projections and the write path with it set, then clears
    // it and measures the same three again. The pair with onboarded_at set is the negative control
    // ruling 270 asks for, so each refusal is read against the behaviour it reverts to and not
    // against nothing. The control write is taken inside a savepoint and rolled back, so the
    // request row it creates cannot be the reason the gated attempt is refused.
    //
    // connect_where is the country mosaic, not a list of members: it returns the country names that
    // hold at least private.setting_int('where_floor', 5) admitted members, so one member entering
    // or leaving it is observable only at that boundary. The arm reads it both ways and states
    // which case it met rather than asserting an absence that would pass for the wrong reason.
    // ------------------------------------------------------------------------------------------
    await inTransaction(client, async () => {
      const seen = async () => {
        await actAs(client, owner.id);
        const cards = await attempt(
          client,
          "select public.connect_cards('members', '{}'::jsonb, null, 200) as out",
        );
        const where = await attempt(client, "select public.connect_where() as out");
        const text = (r) => JSON.stringify(r.ok && r.rows[0] ? r.rows[0].out : null);
        const mosaic = where.ok && where.rows[0] ? where.rows[0].out : null;
        return {
          inCards: cards.ok && text(cards).includes(member.id),
          where: where.ok ? text(where) : null,
          tiles: mosaic ? (mosaic.continent || []).length + (mosaic.diaspora || []).length : 0,
          err: cards.ok ? (where.ok ? null : where.message) : cards.message,
        };
      };
      const intro = async () => {
        await actAs(client, owner.id);
        await client.query("savepoint r459_intro");
        const r = await attempt(client, "select public.send_introduction($1, $2) as id", [
          member.id,
          "Ruling 459 arm. Rolled back by the same run.",
        ]);
        await client.query("rollback to savepoint r459_intro");
        return r;
      };

      await actAsSelf(client);
      await client.query("update public.members set onboarded_at = now() where id = $1", [
        member.id,
      ]);
      const control = await seen();
      const controlIntro = await intro();

      await actAsSelf(client);
      await client.query("update public.members set onboarded_at = null where id = $1", [
        member.id,
      ]);
      const gated = await seen();
      const gatedIntro = await intro();

      if (!control.inCards) {
        skip(
          names.onboarded,
          control.err
            ? "a projection could not be read: " + control.err
            : "the onboarded member is not in connect_cards to begin with, so their absence proves nothing",
        );
      } else {
        record(
          names.onboarded,
          !gated.inCards,
          gated.err ? "a projection could not be read: " + gated.err : "in connect_cards true",
        );
        record(
          "ruling 459 control: the same member is in connect_cards while onboarded_at is set",
          true,
          "in connect_cards true",
        );
      }

      const emptyMosaic = control.where === null || control.tiles === 0;
      if (emptyMosaic || control.where === gated.where) {
        skip(
          "ruling 459: connect_where excludes an account that has not onboarded",
          emptyMosaic
            ? "the mosaic names a country only once it holds five admitted members and no country on this project reaches that floor, so one member entering or leaving it changes nothing to measure"
            : "the member's country holds more than the floor with or without them, so the tile stands either way and the difference is not observable",
        );
      } else {
        record(
          "ruling 459: connect_where excludes an account that has not onboarded",
          true,
          "mosaic with " + control.where + "; without " + gated.where,
        );
      }

      if (!controlIntro.ok && /not available/.test(controlIntro.message || "")) {
        skip(
          "ruling 459: send_introduction refuses a recipient who has not onboarded",
          "the two test accounts are not strangers (a request is pending, they are connected, or one blocks the other), so the one write path refuses either way",
        );
      } else {
        record(
          "ruling 459: send_introduction refuses a recipient who has not onboarded",
          !gatedIntro.ok && /send_introduction: not available/.test(gatedIntro.message || ""),
          gatedIntro.ok ? "the write was accepted" : gatedIntro.code + " " + gatedIntro.message,
        );
        record(
          "ruling 459 control: the same introduction is accepted while onboarded_at is set",
          controlIntro.ok && !!controlIntro.rows[0] && !!controlIntro.rows[0].id,
          controlIntro.ok
            ? "request " + controlIntro.rows[0].id + ", rolled back"
            : controlIntro.code + " " + controlIntro.message,
        );
      }
    });
  } finally {
    await client.end().catch(() => {});
  }
}

module.exports = { runLiveDbArms, clientConfig };
