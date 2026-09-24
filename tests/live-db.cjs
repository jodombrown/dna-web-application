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
//   Convene Pass 1 (521, 623)        publish_post writes a hybrid event with a link and a capacity as
//                                   the owner; the member selects the event and sees the physical
//                                   delivery row, no meeting_link row and no event_host_settings
//                                   row; the owner sees all three. Unproven until the Pass 1
//                                   migrations are on the project.
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
    delivery:
      "Convene Pass 1 (521, 623): a second member reads the physical delivery row and neither the meeting link nor the host settings",
    attend:
      "Brief 10 (1030): a first going answer writes the convene default with no override, and a later answer writes an override only",
    guest:
      "Handoff 30-D (1026, 1034): a link request is normalized and throttled, the address is stored as a hash only, and guest_rsvp opens once, withdraws and goes again with no edge on a guest row (1002)",
    claim:
      "Handoff 30-D (1033): a confirmed member claims their guest row with its edge, the drift function stays at zero, and a second claim does nothing",
    discovery:
      "Handoff 32-B (1092, 1105): the owner's answer carries its lanes in convene_lanes order, curated among them",
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

    // ------------------------------------------------------------------------------------------
    // Convene Pass 1 (P1-SPEC section 6, row policy; rulings 521, 623). The owner publishes a
    // hybrid event through publish_post with the namespaced convene.* keys: a resolved place, a
    // meeting link and a capacity. The member (a reader of the event through its published post)
    // selects the delivery rows and the host settings: the physical row is theirs to read, the
    // meeting_link row and the capacity are not. The owner, as host, reads all three: that pair is
    // ruling 270's control. Everything rolls back. Before the Pass 1 migrations reach the project
    // the tables do not exist and the arm reports unproven (228), never a pass.
    // ------------------------------------------------------------------------------------------
    await inTransaction(client, async () => {
      await actAsSelf(client);
      // Presence by name, not by privilege: information_schema.tables lists only the tables the
      // current role holds a privilege on, and live_arms holds none on these (the grants are to
      // authenticated and service_role), so it read zero on a project that had them. The reads
      // below run as authenticated through set role, where the grants and the policies apply.
      const present = await client.query(
        "select (to_regclass('public.event_delivery') is not null and to_regclass('public.event_host_settings') is not null) as ok",
      );
      if (!present.rows[0] || present.rows[0].ok !== true) {
        skip(
          names.delivery,
          "20260916120100_p1_convene_place_columns.sql is not on the project yet",
        );
        return;
      }
      await actAs(client, owner.id);
      const starts = new Date(Date.now() + 14 * 86400e3);
      starts.setUTCHours(19, 0, 0, 0);
      const payload = JSON.stringify({
        verb: "convene",
        body: "Convene Pass 1 row-policy arm. Rolled back by the same run.",
        author_kind: "member",
        author_id: owner.id,
        audience: "everyone",
        host_context: "live-checks",
        fields: {
          "convene.title": "Row policy supper",
          "convene.format": "hybrid",
          "convene.when": "in two weeks at 19:00",
          "convene.starts_at": starts.toISOString(),
          "convene.timezone": "Africa/Accra",
          "convene.place_id": "live-arms-place",
          "convene.place_name": "Front Room",
          "convene.city": "Accra",
          "convene.country": "Ghana",
          "convene.lng": "-0.1747",
          "convene.lat": "5.5559",
          "convene.link": "https://meet.example/row-policy",
          "convene.price_nature": "free",
          "convene.capacity": "40",
          "convene.delivery_intent":
            "In person at Front Room, Accra and Online, link with your ticket.",
        },
      });
      const published = await attempt(client, "select public.publish_post($1::jsonb) as id", [
        payload,
      ]);
      if (!published.ok) {
        record(
          names.delivery,
          false,
          "publish_post refused: " + published.code + " " + published.message,
        );
        return;
      }
      // The host reads their own post for the event id (posts_member_select). live_arms holds no
      // grant on posts, so this read stays as the owner rather than resetting the role; and every
      // read from here goes through attempt(), so a refusal records a FAIL with its code instead of
      // escaping the arm and ending the suite.
      const ev = await attempt(
        client,
        "select created_object_id as id from public.posts where id = $1",
        [published.rows[0].id],
      );
      const eventId = ev.ok && ev.rows[0] ? ev.rows[0].id : null;
      if (!eventId) {
        record(
          names.delivery,
          false,
          "the published post carries no event id: " +
            (ev.ok ? "no row" : ev.code + " " + ev.message),
        );
        return;
      }
      const readAs = async (uid) => {
        await actAs(client, uid);
        const e = await attempt(client, "select id from public.events where id = $1", [eventId]);
        const d = await attempt(
          client,
          "select kind from public.event_delivery where event_id = $1 order by position",
          [eventId],
        );
        const h = await attempt(
          client,
          "select capacity from public.event_host_settings where event_id = $1",
          [eventId],
        );
        const refused = [e, d, h].find((r) => !r.ok);
        return {
          error: refused ? refused.code + " " + refused.message : null,
          event: e.ok ? e.rows.length : -1,
          kinds: d.ok ? d.rows.map((r) => r.kind) : [],
          settings: h.ok ? h.rows.length : -1,
        };
      };
      const asMember = await readAs(member.id);
      const asOwner = await readAs(owner.id);
      if (asMember.error || asOwner.error) {
        record(names.delivery, false, "a read was refused: " + (asMember.error || asOwner.error));
        return;
      }
      record(
        names.delivery,
        asMember.event === 1 &&
          asMember.kinds.length === 1 &&
          asMember.kinds[0] === "physical" &&
          asMember.settings === 0,
        "member sees event " +
          asMember.event +
          ", rows " +
          JSON.stringify(asMember.kinds) +
          ", settings " +
          asMember.settings,
      );
      record(
        "Convene Pass 1 control: the host reads the physical row, the meeting link and the capacity",
        asOwner.event === 1 &&
          asOwner.kinds.length === 2 &&
          asOwner.kinds.includes("physical") &&
          asOwner.kinds.includes("meeting_link") &&
          asOwner.settings === 1,
        "owner sees event " +
          asOwner.event +
          ", rows " +
          JSON.stringify(asOwner.kinds) +
          ", settings " +
          asOwner.settings,
      );
    });
    // ------------------------------------------------------------------------------------------
    // Brief 10 (handoff 30-C; rulings 680, 1023, 1028, 1029, 1030). The owner publishes a free
    // in-person event to everyone; the member's convene default is cleared inside this transaction
    // so the first case is reachable whatever the account holds, then the member answers going
    // twice: the first answer sets the default and stores no override (1030), the second stores an
    // override alone. The member's own projection carries the answer. Signed out, the public
    // projection answers for the slug with no registrant, no going list, no viewer block and no
    // meeting link (680, 1028), the member projection is refused (1023), and no client role may
    // call the media lookup (1029). Everything rolls back.
    // ------------------------------------------------------------------------------------------
    await inTransaction(client, async () => {
      await actAsSelf(client);
      const present = await client.query(
        "select (to_regprocedure('public.event_page(uuid)') is not null and to_regprocedure('public.event_public_page(text)') is not null) as ok",
      );
      if (!present.rows[0] || present.rows[0].ok !== true) {
        skip(names.attend, "20260921160100_p2_event_page.sql is not on the project yet");
        return;
      }
      await actAs(client, owner.id);
      const starts = new Date(Date.now() + 21 * 86400e3);
      starts.setUTCHours(19, 0, 0, 0);
      const published = await attempt(client, "select public.publish_post($1::jsonb) as id", [
        JSON.stringify({
          verb: "convene",
          body: "Brief 10 attend arm. Rolled back by the same run.",
          author_kind: "member",
          author_id: owner.id,
          audience: "everyone",
          host_context: "live-checks",
          fields: {
            "convene.title": "Attend arm supper",
            "convene.format": "in_person",
            "convene.when": "in three weeks at 19:00",
            "convene.starts_at": starts.toISOString(),
            "convene.timezone": "Africa/Accra",
            "convene.place_id": "live-arms-place",
            "convene.place_name": "Front Room",
            "convene.city": "Accra",
            "convene.country": "Ghana",
            "convene.lng": "-0.1747",
            "convene.lat": "5.5559",
            "convene.price_nature": "free",
            "convene.delivery_intent": "In the room, at a long table.",
          },
        }),
      ]);
      if (!published.ok) {
        record(
          names.attend,
          false,
          "publish_post refused: " + published.code + " " + published.message,
        );
        return;
      }
      const ev = await attempt(
        client,
        "select e.id, e.slug from public.posts p join public.events e on e.id = p.created_object_id where p.id = $1",
        [published.rows[0].id],
      );
      const eventId = ev.ok && ev.rows[0] ? ev.rows[0].id : null;
      const slug = ev.ok && ev.rows[0] ? ev.rows[0].slug : null;
      if (!eventId || !slug) {
        record(
          names.attend,
          false,
          "the published post carries no event with a slug: " +
            (ev.ok ? "no row" : ev.code + " " + ev.message),
        );
        return;
      }
      await actAs(client, member.id);
      await attempt(
        client,
        "delete from public.member_visibility where member_id = $1 and section = 'convene'",
        [member.id],
      );
      const first = await attempt(
        client,
        "select public.rsvp_event($1::uuid, 'going', 'everyone') as r",
        [eventId],
      );
      const second = await attempt(
        client,
        "select public.rsvp_event($1::uuid, 'going', 'anchored') as r",
        [eventId],
      );
      const mine = await attempt(client, "select public.event_page($1::uuid) as p", [eventId]);
      const r1 = first.ok ? first.rows[0].r : null;
      const r2 = second.ok ? second.rows[0].r : null;
      const page = mine.ok ? mine.rows[0].p : null;
      record(
        names.attend,
        !!r1 &&
          r1.default_set === true &&
          r1.audience_override === null &&
          !!r2 &&
          r2.default_set === false &&
          r2.audience_override === "anchored" &&
          !!page &&
          page.viewer &&
          page.viewer.registration &&
          page.viewer.registration.status === "going" &&
          page.viewer.registration.audience_override === "anchored" &&
          page.viewer.has_default === true &&
          page.viewer.default_audience === "everyone",
        "first " +
          (first.ok ? JSON.stringify(r1) : first.code + " " + first.message) +
          " second " +
          (second.ok ? JSON.stringify(r2) : second.code + " " + second.message) +
          " page " +
          (mine.ok ? JSON.stringify(page && page.viewer) : mine.code + " " + mine.message),
      );
      await client.query("set local role anon");
      await client.query("select set_config('request.jwt.claims', '', true)");
      const pub = await attempt(client, "select public.event_public_page($1) as p", [slug]);
      const pp = pub.ok ? pub.rows[0].p : null;
      const text = pp ? JSON.stringify(pp) : "";
      record(
        "Brief 10 (680, 1028): the signed-out page carries no registrant name, no going list, no viewer block and no meeting link",
        !!pp &&
          pp.event &&
          pp.event.slug === slug &&
          !("going" in pp) &&
          !("viewer" in pp) &&
          !("meeting_url" in pp) &&
          !("invitations" in pp) &&
          !text.includes(member.name) &&
          !text.includes(member.id),
        pub.ok ? "keys " + Object.keys(pp || {}).join(",") : pub.code + " " + pub.message,
      );
      const refused = await attempt(client, "select public.event_page($1::uuid) as p", [eventId]);
      record(
        "Brief 10 (1023): signed out cannot call the member projection",
        !refused.ok && refused.code === "42501",
        refused.ok ? "answered" : refused.code + " " + refused.message,
      );
      await actAs(client, member.id);
      const media = await attempt(
        client,
        "select * from public.event_media_object($1, 'media', '0')",
        [slug],
      );
      record(
        "Brief 10 (1029): a client role may not call event_media_object",
        !media.ok && media.code === "42501",
        media.ok ? "answered " + media.rows.length + " row(s)" : media.code + " " + media.message,
      );
    });
    // ------------------------------------------------------------------------------------------
    // Handoff 30-D (rulings 1002, 1026, 1033, 1034; item 14.1). The owner publishes a free public
    // event; then, as the arm's own role, the two service-role functions are driven the way the
    // guest-rsvp Edge Function drives them: a link request is normalized and answered send once
    // and throttled on the second ask, a bad address and a slug with no public page are refused in
    // the database's own words, and the table that records the ask has no column for the address
    // at all, only a 64-hex hash. guest_rsvp's open writes going once with the offer made once,
    // reports the row after, withdraws and goes again, and the drift function counts no guest row
    // (a guest row carries no edge). Then the member, whose address auth.users holds confirmed,
    // has a guest row written for that address, claims it with its edge, and a second claim does
    // nothing. Everything rolls back. The functions are executable by service_role alone (1026),
    // so the arm reports itself unproven, never passing, when the arm's role holds no execute on
    // them (ruling 228): the grant is a migration of Chat's under 382.
    // ------------------------------------------------------------------------------------------
    await inTransaction(client, async () => {
      await actAsSelf(client);
      const present = await client.query(
        "select (to_regprocedure('public.guest_link_request(text,text)') is not null and to_regprocedure('public.guest_rsvp(uuid,text,text)') is not null and to_regprocedure('public.claim_guest_registrations()') is not null) as ok",
      );
      if (!present.rows[0] || present.rows[0].ok !== true) {
        skip(names.guest, "20260922120000_p2_guest_path.sql is not on the project yet");
        skip(names.claim, "20260922120000_p2_guest_path.sql is not on the project yet");
        return;
      }
      const may = await client.query(
        "select has_function_privilege(current_user, 'public.guest_link_request(text,text)', 'execute') as link, has_function_privilege(current_user, 'public.guest_rsvp(uuid,text,text)', 'execute') as rsvp, current_user as who",
      );
      if (!may.rows[0] || !may.rows[0].link || !may.rows[0].rsvp) {
        const why =
          (may.rows[0] ? may.rows[0].who : "the arm's role") +
          " holds no execute on guest_link_request and guest_rsvp, which are service_role's alone (1026); the arm runs once a migration grants them to live_arms (382)";
        skip(names.guest, why);
        skip(names.claim, why);
        return;
      }
      await actAs(client, owner.id);
      const starts = new Date(Date.now() + 28 * 86400e3);
      starts.setUTCHours(18, 30, 0, 0);
      const published = await attempt(client, "select public.publish_post($1::jsonb) as id", [
        JSON.stringify({
          verb: "convene",
          body: "Handoff 30-D guest arm. Rolled back by the same run.",
          author_kind: "member",
          author_id: owner.id,
          audience: "everyone",
          host_context: "live-checks",
          fields: {
            "convene.title": "Guest arm supper",
            "convene.format": "in_person",
            "convene.when": "in four weeks at 18:30",
            "convene.starts_at": starts.toISOString(),
            "convene.timezone": "Africa/Accra",
            "convene.place_id": "live-arms-place",
            "convene.place_name": "Front Room",
            "convene.city": "Accra",
            "convene.country": "Ghana",
            "convene.lng": "-0.1747",
            "convene.lat": "5.5559",
            "convene.price_nature": "free",
            "convene.delivery_intent": "In the room, at a long table.",
          },
        }),
      ]);
      if (!published.ok) {
        record(
          names.guest,
          false,
          "publish_post refused: " + published.code + " " + published.message,
        );
        skip(names.claim, "no event to claim against");
        return;
      }
      const ev = await attempt(
        client,
        "select e.id, e.slug from public.posts p join public.events e on e.id = p.created_object_id where p.id = $1",
        [published.rows[0].id],
      );
      const eventId = ev.ok && ev.rows[0] ? ev.rows[0].id : null;
      const slug = ev.ok && ev.rows[0] ? ev.rows[0].slug : null;
      if (!eventId || !slug) {
        record(names.guest, false, "the published post carries no event with a slug");
        skip(names.claim, "no event to claim against");
        return;
      }

      // The link request, as the function calls it (the arm's own role, not a client role).
      await actAsSelf(client);
      const typed = "  Guest.Arm@Example.Invalid ";
      const normalized = "guest.arm@example.invalid";
      const first = await attempt(client, "select public.guest_link_request($1, $2) as r", [
        slug,
        typed,
      ]);
      const second = await attempt(client, "select public.guest_link_request($1, $2) as r", [
        slug,
        normalized,
      ]);
      const badAddress = await attempt(client, "select public.guest_link_request($1, $2) as r", [
        slug,
        "not-an-address",
      ]);
      const noPage = await attempt(client, "select public.guest_link_request($1, $2) as r", [
        "this-slug-has-no-public-page-000000",
        normalized,
      ]);
      // pg_attribute rather than information_schema.columns: the view shows a column only to a
      // role with some privilege on its table, and live_arms holds none on guest_link_requests by
      // design (no client role reads or writes it), so the view answered nothing on a8fc5b0.
      const columns = await client.query(
        "select array_agg(a.attname::text order by a.attname) as cols from pg_catalog.pg_attribute a where a.attrelid = 'public.guest_link_requests'::regclass and a.attnum > 0 and not a.attisdropped",
      );
      const constraint = await client.query(
        "select pg_get_constraintdef(oid) as def from pg_constraint where conname = 'guest_link_requests_hash_check'",
      );
      const cols = (columns.rows[0] && columns.rows[0].cols) || [];
      const r1 = first.ok ? first.rows[0].r : null;
      const r2 = second.ok ? second.rows[0].r : null;
      const linkOk =
        !!r1 &&
        r1.send === true &&
        r1.email === normalized &&
        !!r1.facts &&
        r1.facts.slug === slug &&
        !("meeting_url" in r1.facts && r1.facts.meeting_url) &&
        !!r2 &&
        r2.send === false &&
        !badAddress.ok &&
        badAddress.code === "22023" &&
        !noPage.ok &&
        noPage.code === "22023" &&
        cols.join(",") === "email_hash,event_id,id,requested_at" &&
        !!constraint.rows[0] &&
        /\[0-9a-f\]\{64\}/.test(constraint.rows[0].def);

      // The guest's answers: open once, reported after, withdraw, go again; no edge on a guest row.
      const open1 = await attempt(client, "select public.guest_rsvp($1::uuid, $2, 'open') as r", [
        eventId,
        normalized,
      ]);
      const open2 = await attempt(client, "select public.guest_rsvp($1::uuid, $2, 'open') as r", [
        eventId,
        normalized,
      ]);
      const withdraw = await attempt(
        client,
        "select public.guest_rsvp($1::uuid, $2, 'not_going') as r",
        [eventId, normalized],
      );
      const again = await attempt(client, "select public.guest_rsvp($1::uuid, $2, 'going') as r", [
        eventId,
        normalized,
      ]);
      const drift1 = await attempt(client, "select * from private.rsvp_edge_drift()", []);
      const o1 = open1.ok ? open1.rows[0].r : null;
      const o2 = open2.ok ? open2.rows[0].r : null;
      const w = withdraw.ok ? withdraw.rows[0].r : null;
      const a = again.ok ? again.rows[0].r : null;
      const rsvpOk =
        !!o1 &&
        o1.state === "returned" &&
        o1.status === "going" &&
        o1.offer_conversion === true &&
        !!o2 &&
        o2.state === "existing" &&
        o2.status === "going" &&
        o2.offer_conversion === false &&
        !!w &&
        w.state === "answered" &&
        w.status === "not_going" &&
        !!a &&
        a.state === "answered" &&
        a.status === "going" &&
        a.offer_conversion === false &&
        drift1.ok &&
        drift1.rows.length === 0;
      record(
        names.guest,
        linkOk && rsvpOk,
        "link first " +
          (first.ok
            ? JSON.stringify({ send: r1.send, email: r1.email })
            : first.code + " " + first.message) +
          " second " +
          (second.ok ? JSON.stringify(r2.send) : second.code + " " + second.message) +
          " bad " +
          (badAddress.ok ? "answered" : badAddress.code) +
          " noPage " +
          (noPage.ok ? "answered" : noPage.code) +
          " cols " +
          cols.join(",") +
          " | open " +
          (open1.ok
            ? JSON.stringify([o1.state, o1.status, o1.offer_conversion])
            : open1.code + " " + open1.message) +
          " again " +
          (open2.ok ? JSON.stringify([o2.state, o2.offer_conversion]) : open2.code) +
          " withdraw " +
          (withdraw.ok ? w.status : withdraw.code) +
          " going " +
          (again.ok ? JSON.stringify([a.status, a.offer_conversion]) : again.code) +
          " drift " +
          (drift1.ok ? drift1.rows.length : drift1.code + " " + drift1.message),
      );

      // The claim: the member test account's address. MEMBER_EMAIL is what the ruling 218
      // sign-in arm in tests/live-checks.cjs signs that account in with, so it is the address
      // auth.users holds and the one the claim reads; auth.users itself is not readable by the
      // arm's role (42501 on a8fc5b0), and is tried only when the variable is absent. The claim
      // function checks the confirmation itself: a zero claim against a seeded row is the failure.
      let memberEmail = (process.env.MEMBER_EMAIL || "").trim().toLowerCase() || null;
      let whoNote = "MEMBER_EMAIL";
      if (!memberEmail) {
        const who = await attempt(
          client,
          "select lower(btrim(u.email)) as email from auth.users u where u.id = $1 and u.email_confirmed_at is not null",
          [member.id],
        );
        memberEmail = who.ok && who.rows[0] ? who.rows[0].email : null;
        whoNote = who.ok ? "auth.users" : "auth.users refused " + who.code;
      }
      if (!memberEmail) {
        skip(
          names.claim,
          "no address for the member test account: MEMBER_EMAIL is not set and " +
            whoNote +
            ", so no guest row can be written for the member's own address",
        );
        return;
      }

      const seeded = await attempt(client, "select public.guest_rsvp($1::uuid, $2, 'going') as r", [
        eventId,
        memberEmail,
      ]);
      await actAs(client, member.id);
      const claim1 = await attempt(client, "select public.claim_guest_registrations() as r", []);
      const mine = await attempt(client, "select public.event_page($1::uuid) as p", [eventId]);
      const claim2 = await attempt(client, "select public.claim_guest_registrations() as r", []);
      await actAsSelf(client);
      const drift2 = await attempt(client, "select * from private.rsvp_edge_drift()", []);
      const c1 = claim1.ok ? claim1.rows[0].r : null;
      const c2 = claim2.ok ? claim2.rows[0].r : null;
      const pg = mine.ok ? mine.rows[0].p : null;
      record(
        names.claim,
        seeded.ok &&
          !!c1 &&
          c1.claimed === 1 &&
          !!pg &&
          pg.viewer &&
          pg.viewer.registration &&
          pg.viewer.registration.status === "going" &&
          !!c2 &&
          c2.claimed === 0 &&
          c2.kept === 0 &&
          drift2.ok &&
          drift2.rows.length === 0,
        "address from " +
          whoNote +
          " seed " +
          (seeded.ok ? "ok" : seeded.code + " " + seeded.message) +
          " claim " +
          (claim1.ok ? JSON.stringify(c1) : claim1.code + " " + claim1.message) +
          " page " +
          (mine.ok ? JSON.stringify(pg && pg.viewer && pg.viewer.registration) : mine.code) +
          " again " +
          (claim2.ok ? JSON.stringify(c2) : claim2.code) +
          " drift " +
          (drift2.ok ? drift2.rows.length : drift2.code + " " + drift2.message),
      );
    });
    // ------------------------------------------------------------------------------------------
    // Brief 9 (handoff 31-A; rulings 581, 631, 632, 650, 658, 693, 1037 to 1045), as handoff 32-B
    // and its Addenda leave it (1092 to 1095, 1105, 1110, 1111). Chat's behaviour proof, replayed as
    // the owner on the project's stand-in data (every event carries a family, the owner is an editor
    // with one live pick, the owner's homes are Los Angeles then Accra). The owner subscribes to
    // culture_arts, dismisses the picked event from curated and writes a rail row inside this
    // transaction; all of it rolls back. The refusals are read at the grant (42501) and at the
    // projection's own checks (22023), and signed out is refused the projection outright (662).
    // ------------------------------------------------------------------------------------------
    await inTransaction(client, async () => {
      await actAsSelf(client);
      const present = await client.query(
        "select to_regprocedure('public.convene_discovery(text, text[], text[], text, text[], uuid, text[], text)') is not null as ok",
      );
      if (!present.rows[0] || present.rows[0].ok !== true) {
        skip(
          names.discovery,
          "20260924120000_p2_home_ladders_and_rail.sql is not on the project yet (Chat applies 32-B's four migrations before its enforcing run)",
        );
        return;
      }
      const ask = async (sql, values) => {
        const r = await attempt(client, sql, values);
        return r.ok ? { ok: true, d: r.rows[0] && r.rows[0].d } : r;
      };
      const failed = (r) => r.code + " " + r.message;
      const section = (d, id) => ((d && d.sections) || []).find((s) => s.section === id) || null;
      const sectionIds = (d) => ((d && d.sections) || []).map((s) => s.section);

      // As the owner: live_arms holds no EXECUTE on vocabularies() (ruling 382), authenticated does.
      await actAs(client, owner.id);
      const vocab = await ask("select public.vocabularies() as d");
      const families =
        vocab.ok && Array.isArray(vocab.d.convene_families) ? vocab.d.convene_families : [];
      const lenses =
        vocab.ok && Array.isArray(vocab.d.convene_lenses) ? vocab.d.convene_lenses : [];
      const lanes = vocab.ok && Array.isArray(vocab.d.convene_lanes) ? vocab.d.convene_lanes : [];
      const laneIds = lanes.map((l) => l.value);

      const all = await ask("select public.convene_discovery('all') as d");
      const ids = all.ok ? sectionIds(all.d) : [];
      const inOrder = ids.every(
        (id, i) =>
          laneIds.includes(id) && (i === 0 || laneIds.indexOf(ids[i - 1]) < laneIds.indexOf(id)),
      );
      record(
        names.discovery,
        all.ok && ids.length > 0 && inOrder && ids.includes("curated"),
        all.ok ? "sections " + JSON.stringify(ids) : failed(all),
      );

      const curatedItem =
        all.ok && section(all.d, "curated") ? section(all.d, "curated").items[0] : null;
      const pick = curatedItem && curatedItem.reason;
      record(
        "Brief 9 (1040): a pick renders as the editor's name and line",
        !!pick &&
          pick.kind === "curated" &&
          !!pick.editor &&
          pick.editor.id === owner.id &&
          pick.editor.name === owner.name &&
          typeof pick.line === "string" &&
          pick.line.trim() !== "",
        pick ? JSON.stringify(pick) : "no curated item in the owner's answer",
      );

      const noCount = [];
      const walk = (v, at) => {
        if (Array.isArray(v)) v.forEach((x, i) => walk(x, at + "[" + i + "]"));
        else if (v && typeof v === "object")
          for (const [k, x] of Object.entries(v)) {
            if (/(^|_)(count|counts|total|n)$/i.test(k)) noCount.push(at + "." + k);
            walk(x, at + "." + k);
          }
      };
      if (all.ok) walk(all.d, "answer");
      record(
        "Brief 9 (581, 632): the answer carries no count key",
        all.ok && noCount.length === 0,
        all.ok ? (noCount.length ? "keys " + noCount.join(",") : "none") : failed(all),
      );

      const sub = await attempt(client, "select public.set_subscription('culture_arts', true)");
      const taste = sub.ok ? await ask("select public.convene_discovery('taste') as d") : sub;
      const tasteItems =
        taste.ok && section(taste.d, "taste") ? section(taste.d, "taste").items : [];
      record(
        "Brief 9 (658, 1039): after set_subscription('culture_arts'), the taste lens carries that family",
        taste.ok &&
          tasteItems.length > 0 &&
          tasteItems.every((i) => i.reason && i.reason.family === "culture_arts"),
        taste.ok
          ? "families " + JSON.stringify([...new Set(tasteItems.map((i) => i.reason.family))])
          : failed(taste),
      );

      const dismissName =
        "Brief 9 (1044, 1105): a dismissal in curated empties that lane and is keyed on the lane alone";
      if (curatedItem) {
        const eventId = curatedItem.event_id;
        // The owner may hold committed dismissals of this event in other lanes from the app, so
        // the arm reads what this dismissal added, not what the owner holds.
        const sectionsOf = async () => {
          const r = await attempt(
            client,
            "select section from public.discovery_dismissals where event_id = $1::uuid",
            [eventId],
          );
          return r.ok ? r.rows.map((x) => x.section) : null;
        };
        const before = await sectionsOf();
        const dismissed = await attempt(
          client,
          "select public.dismiss_discovery_item($1::uuid, 'curated')",
          [eventId],
        );
        const curated = dismissed.ok
          ? await ask("select public.convene_discovery('curated') as d")
          : dismissed;
        const after = await sectionsOf();
        const curatedSection = curated.ok ? section(curated.d, "curated") : null;
        const added = before && after ? after.filter((x) => !before.includes(x)) : null;
        record(
          dismissName,
          !!curatedSection &&
            curatedSection.items.length === 0 &&
            !!added &&
            added.length === 1 &&
            added[0] === "curated",
          (curated.ok ? "curated " + JSON.stringify(curated.d.sections) : failed(curated)) +
            " added " +
            JSON.stringify(added),
        );
      } else record(dismissName, false, "no curated item to dismiss");

      const inPerson = await ask("select public.convene_discovery('all', array['in_person']) as d");
      const inPersonIds = inPerson.ok ? sectionIds(inPerson.d) : [];
      record(
        "Brief 9 (586, 693): an in-person facet drops the online lane",
        inPerson.ok && !inPersonIds.includes("online"),
        inPerson.ok ? "sections " + JSON.stringify(inPersonIds) : failed(inPerson),
      );

      const insert = await attempt(
        client,
        "insert into public.member_subscriptions (member_id, kind, family) values ($1, 'family', 'sport_wellness')",
        [owner.id],
      );
      record(
        "Brief 9 (1039): a direct insert into member_subscriptions is refused",
        !insert.ok && insert.code === "42501",
        insert.ok ? "inserted" : failed(insert),
      );
      const floors = await attempt(client, "select * from private.convene_thresholds");
      record(
        "Brief 9 (1045): a member cannot read private.convene_thresholds",
        !floors.ok && floors.code === "42501",
        floors.ok ? "read " + floors.rows.length + " row(s)" : failed(floors),
      );
      const editors = await attempt(client, "select * from public.editors");
      record(
        "Brief 9 (1040): a member cannot read public.editors",
        !editors.ok && editors.code === "42501",
        editors.ok ? "read " + editors.rows.length + " row(s)" : failed(editors),
      );

      // 1093: the lens set is five, so events and the three retired lenses are all refused.
      const refusedLenses = [];
      for (const l of ["events", "soon", "online", "near"]) {
        const r = await attempt(client, "select public.convene_discovery($1)", [l]);
        if (r.ok || r.code !== "22023")
          refusedLenses.push(l + " " + (r.ok ? "answered" : failed(r)));
      }
      record(
        "Brief 9 (1041, 1093): events and the retired soon, online and near lenses are refused with 22023",
        refusedLenses.length === 0,
        refusedLenses.join("; ") || "all four refused",
      );
      const badSection = await attempt(
        client,
        "select public.dismiss_discovery_item($1::uuid, 'all')",
        [curatedItem ? curatedItem.event_id : "00000000-0000-0000-0000-000000000000"],
      );
      record(
        "Brief 9 (1044): a dismissal in all is refused with 22023",
        !badSection.ok && badSection.code === "22023",
        badSection.ok ? "accepted" : failed(badSection),
      );
      // 1095: Donation is gone; the projection refuses it as any unknown price.
      const donation = await attempt(
        client,
        "select public.convene_discovery('all', null, array['donation'])",
      );
      record(
        "Handoff 32-B (1095): a price of donation is refused with 22023",
        !donation.ok && donation.code === "22023",
        donation.ok ? "answered" : failed(donation),
      );
      // 1095: Place's options are grounded places, and the projection takes one and refuses a
      // malformed id.
      const places = await ask("select public.convene_places() as d");
      const opts = places.ok && Array.isArray(places.d) ? places.d : [];
      const wellFormed = opts.every((o) => {
        const parts = String(o.id).split("|");
        return (
          ["city", "region", "country"].includes(o.kind) &&
          parts[0] === o.kind &&
          parts.length === (o.kind === "country" ? 2 : 3) &&
          o.id === o.id.toLowerCase() &&
          typeof o.name === "string" &&
          o.name !== ""
        );
      });
      const city = opts.find((o) => o.kind === "city");
      const narrowed = city
        ? await ask(
            "select public.convene_discovery('all', null, null, null, null, null, array[$1]) as d",
            [city.id],
          )
        : null;
      const nearPlace =
        narrowed && narrowed.ok && section(narrowed.d, "near")
          ? section(narrowed.d, "near").items.every(
              (i) => i.reason && i.reason.place && i.reason.place.city,
            )
          : true;
      const malformed = await attempt(
        client,
        "select public.convene_discovery('all', null, null, null, null, null, array['town|x'])",
      );
      record(
        "Handoff 32-B (1095): convene_places() answers grounded places by kind; a city narrows and Near reads the place; a malformed place is refused",
        places.ok &&
          opts.length > 0 &&
          wellFormed &&
          !!narrowed &&
          narrowed.ok &&
          nearPlace &&
          !malformed.ok &&
          malformed.code === "22023",
        (places.ok
          ? opts.length + " option(s), first " + JSON.stringify(opts[0])
          : failed(places)) +
          " narrowed " +
          (narrowed
            ? narrowed.ok
              ? JSON.stringify(sectionIds(narrowed.d))
              : failed(narrowed)
            : "no city") +
          " malformed " +
          (malformed.ok ? "answered" : malformed.code),
      );
      // 1110: every rung of the owner's first home answers; a rung with no home, or an unknown rung,
      // is refused.
      const ownerHome = all.ok && all.d.homes && all.d.homes[0] ? all.d.homes[0].id : null;
      const rungNotes = [];
      if (ownerHome)
        for (const rung of ["in", "around", "region", "country"]) {
          const r = await attempt(
            client,
            "select public.convene_discovery('all', null, null, null, null, $1::uuid, null, $2)",
            [ownerHome, rung],
          );
          if (!r.ok) rungNotes.push(rung + " " + failed(r));
        }
      const lonely = await attempt(
        client,
        "select public.convene_discovery('all', null, null, null, null, null, null, 'around')",
      );
      const far = ownerHome
        ? await attempt(
            client,
            "select public.convene_discovery('all', null, null, null, null, $1::uuid, null, 'far')",
            [ownerHome],
          )
        : { ok: true };
      record(
        "Handoff 32-B (1110): each rung of a home answers; a rung without a home or an unknown rung is refused with 22023",
        !!ownerHome &&
          rungNotes.length === 0 &&
          !lonely.ok &&
          lonely.code === "22023" &&
          !far.ok &&
          far.code === "22023",
        (ownerHome ? rungNotes.join("; ") || "four rungs answered" : "the owner has no home") +
          " lonely " +
          (lonely.ok ? "answered" : lonely.code) +
          " far " +
          (far.ok ? "answered" : far.code),
      );
      if (ownerHome) {
        await actAs(client, member.id);
        const foreign = await attempt(
          client,
          "select public.convene_discovery('all', null, null, null, null, $1::uuid)",
          [ownerHome],
        );
        record(
          "Brief 9 (1042): another member's home is refused as a facet with 22023",
          !foreign.ok && foreign.code === "22023",
          foreign.ok ? "answered" : failed(foreign),
        );
      } else {
        record(
          "Brief 9 (1042): another member's home is refused as a facet with 22023",
          false,
          "the owner's answer carries no home to offer another member",
        );
      }

      // 1111: the rail's memory is the member's own row; another member neither reads nor writes it.
      await actAs(client, owner.id);
      const own = await attempt(
        client,
        // Idempotent against a row the owner committed from the app, through the owner's insert and
        // update policies both.
        "insert into public.member_rail_state (member_id, surface, width_band, collapsed) values ($1, 'discovery', 'wide', false) on conflict (member_id, surface, width_band) do update set collapsed = excluded.collapsed, updated_at = now()",
        [owner.id],
      );
      await actAs(client, member.id);
      const peek = await attempt(
        client,
        "select collapsed from public.member_rail_state where member_id = $1::uuid",
        [owner.id],
      );
      const forge = await attempt(
        client,
        "insert into public.member_rail_state (member_id, surface, width_band, collapsed) values ($1, 'discovery', 'medium', true)",
        [owner.id],
      );
      record(
        "Handoff 32-B (1111): a member writes their own rail row; another member reads none of it and cannot write it",
        own.ok && peek.ok && peek.rows.length === 0 && !forge.ok && forge.code === "42501",
        "own " +
          (own.ok ? "written" : failed(own)) +
          " peek " +
          (peek.ok ? peek.rows.length + " row(s)" : failed(peek)) +
          " forge " +
          (forge.ok ? "written" : failed(forge)),
      );

      // 1080, 1081: the alias history and the reserved words are the database's alone.
      const aliases = await attempt(client, "select alias from public.event_aliases limit 1");
      const words = await attempt(client, "select word from public.reserved_link_words limit 1");
      record(
        "Handoff 32-B (1080, 1100): a member cannot read event_aliases or reserved_link_words",
        !aliases.ok && aliases.code === "42501" && !words.ok && words.code === "42501",
        "aliases " +
          (aliases.ok ? "read" : aliases.code) +
          " words " +
          (words.ok ? "read" : words.code),
      );

      record(
        "Handoff 32-B (1037, 1093, 1105): vocabularies() serves the nine families, the five lenses with their short words and the nine lanes in order",
        families.length === 9 &&
          lenses.map((l) => l.value).join(",") === "all,follow,taste,curated,network" &&
          lenses.every((l) => typeof l.short === "string" && l.short.trim() !== "") &&
          laneIds.join(",") === "soon,weekend,online,fresh,curated,follow,taste,near,network" &&
          lanes.every((l) => typeof l.name === "string" && l.name.trim() !== ""),
        vocab.ok
          ? "lenses " +
              JSON.stringify(lenses.map((l) => l.value + ":" + l.short)) +
              " lanes " +
              JSON.stringify(laneIds)
          : failed(vocab),
      );

      await client.query("set local role anon");
      await client.query("select set_config('request.jwt.claims', '', true)");
      const anon = await attempt(client, "select public.convene_discovery('all')");
      const anonPlaces = await attempt(client, "select public.convene_places()");
      const anonRail = await attempt(client, "select * from public.member_rail_state");
      record(
        "Brief 9 (662): signed out cannot call convene_discovery or convene_places, or read a rail row",
        !anon.ok &&
          anon.code === "42501" &&
          !anonPlaces.ok &&
          anonPlaces.code === "42501" &&
          !anonRail.ok &&
          anonRail.code === "42501",
        "discovery " +
          (anon.ok ? "answered" : anon.code) +
          " places " +
          (anonPlaces.ok ? "answered" : anonPlaces.code) +
          " rail " +
          (anonRail.ok ? "read" : anonRail.code),
      );
    });
  } finally {
    await client.end().catch(() => {});
  }
}

module.exports = { runLiveDbArms, clientConfig };
