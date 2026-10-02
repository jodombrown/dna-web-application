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
//   Brief 12 12A (1177, 1178, 1265,  the admin gate is the database: no policy cites is_admin, the
//   1266; handoff 40-A)              admin persona at aal1 holds a role and gets none, at aal2 grants
//                                   and revokes through the two audited RPCs, a member with no role
//                                   and signed out are refused, the two logs carry their append-only
//                                   triggers, and vocabularies() serves the six role kinds. The
//                                   admin persona is the id live_arms_admin_member() answers (382).
//   Brief 12 12C part 1 (1179, 1284,  the recording layer and the ledger: record_event refuses and
//   1294 to 1300; handoff 40-C)       accepts by the kind's row, a move writes one history row and
//                                   the side is read from history, is_african follows the African
//                                   Union list, the derivation is idempotent over the seeded data,
//                                   the four cron jobs are scheduled, and the catalogue is complete.
//   Brief 14 41-A (1330 to 1353,     Messenger's schema and server: a request accepted opens the
//   1368 to 1373; handoff 41-A)       pair's thread, a third member reads none of it, a blocked pair
//                                   reads zero rows, a late joiner sees nothing before joined_seq,
//                                   a send is idempotent and seq is dense, tick is 2 while receipts
//                                   are off, search stays inside scope, the 31st send in a minute
//                                   is refused, the publication stays empty, and the realtime topic
//                                   predicate grants the member's own inbox and denies another's.
//                                   The cap's refusal needs 257 member rows the project does not
//                                   hold and reports unproven (228); the trigger's presence is read.
//
// Nothing here is secret: the connection string arrives from the runner and never from this file.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const OWNER_HANDLE = "owner-test";
const MEMBER_HANDLE = "member-test";
/** 1165: the two events Chat seeded with five going RSVPs each, which Filling up must carry. */
const SEEDED_FILLING = [
  "bfcc66ba-f436-4067-ab7f-2486a556e6eb",
  "01e7c23d-5811-41fa-bb67-fe9b7a80cdbd",
];

/**
 * The claims PostgREST would set for a signed-in member. `aal` is the session's authenticator
 * assurance level as Supabase Auth writes it, "aal1" or "aal2"; left out, the claims carry none,
 * which the admin gate (1265) reads as not aal2.
 */
function claims(uid, aal) {
  const c = { sub: uid, role: "authenticated", aud: "authenticated" };
  if (aal) c.aal = aal;
  return JSON.stringify(c);
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

async function actAs(client, uid, aal) {
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claims', $1, true)", [claims(uid, aal)]);
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
      "Handoff 34-A (1160): the owner's answer names every lane in lane_order and carries its lanes in that order, curated among them",
    attendPresenters:
      "Addendum 4 item 1 (1121): event_presenters answers an event's presenter and host exactly as event_page does",
    attendPublic:
      "Brief 10 (680, 1028): the signed-out page carries no registrant name, no going list, no viewer block and no meeting link",
    attendMemberRefused: "Brief 10 (1023): signed out cannot call the member projection",
    attendPresentersAnon: "Addendum 4 item 1 (1121): signed out cannot call event_presenters",
    attendMedia: "Brief 10 (1029): a client role may not call event_media_object",
    discoveryPick: "Brief 9 (1040): a pick renders as the editor's name and line",
    discoverySearch:
      "Handoff 34-A (1124, 1159): a search keeps the pick it names, one that matches nothing drops every lane, and past 100 characters it is refused with 22023",
    discoverySearchOne:
      "Handoff 34-A addendum (1173): a search whose matches sit one to a lane returns the lane: the seeded event's title returns Filling up holding it",
    discoveryBrowse:
      "Handoff 34-A addendum (1172): no section is browse or carries tiles, and lane_order names the ten lanes",
    discoveryFilling:
      "Handoff 34-A (1157, 1165): Filling up carries both seeded events, and event_going_names gives each three first names, none the viewer's own",
    discoveryNoCount: "Brief 9 (581, 632): the answer carries no count key",
    discoveryTaste:
      "Brief 9 (658, 1039): after set_subscription('culture_arts'), the taste lens carries that family",
    discoveryFormat: "Brief 9 (586, 693): an in-person facet drops the online lane",
    discoverySubInsert: "Brief 9 (1039): a direct insert into member_subscriptions is refused",
    discoveryThresholds: "Brief 9 (1045): a member cannot read private.convene_thresholds",
    discoveryRoles: "Brief 12 12A (1177): a member cannot read public.platform_roles",
    discoveryRetired:
      "Brief 9 (1041, 1093): events and the retired soon, online and near lenses are refused with 22023",
    discoveryDismissAll: "Brief 9 (1044): a dismissal in all is refused with 22023",
    discoveryDonation: "Handoff 32-B (1095): a price of donation is refused with 22023",
    discoveryPlaces:
      "Handoff 32-B (1095): convene_places() answers grounded places by kind; a city narrows and Near reads the place; a malformed place is refused",
    discoveryRungs:
      "Handoff 32-B (1110): each rung of a home answers; a rung without a home or an unknown rung is refused with 22023",
    discoveryForeignHome: "Brief 9 (1042): another member's home is refused as a facet with 22023",
    discoveryRail:
      "Handoff 32-B (1111): a member writes their own rail row; another member reads none of it and cannot write it",
    discoveryLaneAct:
      "Handoff 34-A (1160): note_lane_act refuses an unknown lane or act with 22023, and a noted act moves its lane first in lane_order",
    discoveryLaneInsert:
      "Handoff 34-A (1160): a direct insert into member_lane_activity is refused for a member, and another member reads none of the owner's rows",
    discoveryAliases:
      "Handoff 32-B (1080, 1100): a member cannot read event_aliases or reserved_link_words",
    discoveryVocab:
      "Handoff 34-A (1037, 1093, 1105, 1124, 1172): vocabularies() serves the nine families, the five lenses with their short words and the ten lanes in their base order",
    discoverySignedOut:
      "Brief 9 (662): signed out cannot call convene_discovery or convene_places, or read a rail row",
    discoveryGoingSignedOut:
      "Handoff 34-A (1128, 1160): signed out cannot call event_going_names or note_lane_act",
    discoveryWithout:
      "Handoff 35-A (1174): a read of All with p_without => 'follow' carries none of the events the follow lens returns",
    discoveryWithoutLens:
      "Handoff 35-A (1174): p_without with a lens other than All is refused with 22023",
    discoveryWithoutAll: "Handoff 35-A (1174): p_without => 'all' is refused with 22023",
    grants:
      "G61 (Session 35): no table in public carries TRUNCATE, REFERENCES, TRIGGER or MAINTAIN for anon or authenticated, and the default ACL for postgres in public grants none of them",
    discoveryDismiss:
      "Brief 9 (1044, 1105): a dismissal in curated empties that lane and is keyed on the lane alone",
    blocksNotHost:
      "Handoff 37-A (1186): a member who is not the event's host is refused by save_event_blocks with 42501",
    blocksSignedOut:
      "Handoff 37-A (1186): signed out cannot execute save_event_blocks and cannot select from event_blocks",
    blocksSave:
      "Handoff 37-A (1186, 1189): the host's save of one note block returns it, event_page shows it as the host, and event_public_page shows it for an event with a public page",
    blocksRefused:
      "Handoff 37-A (1186): a save with a programme payload missing its line is refused with 22023 and leaves the earlier blocks in place, and an empty list clears them",
    presenterKeys:
      "Handoff 37-C (1196, 1225): event_page carries event.family, viewer.subscribed and the presenter's headline and links, read as the event's host",
    presenterPublic:
      "Handoff 37-C (1196, 1225): event_public_page carries the presenter's headline and links and no family, read signed out",
    presenterSubscribe:
      "Handoff 37-C (1039, 1196): set_subscription flips viewer.subscribed on event_page for the event's family",
    admin: "Brief 12 12A (1266): no row in pg_policies cites is_admin",
    adminAal1:
      "Brief 12 12A (1265): the admin persona at aal1 reads holds_role true and roles empty and is refused admin_grant_role with 42501; at aal2 the same call is answered",
    adminGrant:
      "Brief 12 12A (1177, 1178): the admin persona at aal2 grants analyst to member-test, who then reads holds_role true with analyst among roles; the revocation returns them to holds_role false",
    adminRefused:
      "Brief 12 12A (1265, 1266): member-test at aal2 with no role is refused admin_grant_role with 42501, and a direct select on platform_roles, admin_actions and admin_reads is refused with 42501",
    adminLastAdmin:
      "Brief 12 12A: the admin persona revoking its own admin row is refused with 22023 while it is the only live admin",
    adminAppendOnly:
      "Brief 12 12A (1178): pg_trigger shows the update, delete and truncate triggers on admin_actions and admin_reads (the service-role refusal itself is not exercisable by live_arms and is not claimed)",
    adminSignedOut:
      "Brief 12 12A: signed out cannot execute admin_session_state, admin_grant_role or admin_revoke_role (42501)",
    adminVocab:
      "Brief 12 12A (1177): vocabularies() carries platform_role_kinds as the six roles in order",
    mobil:
      "Brief 12 12C (1179, 1297, 1298): record_event refuses an unknown kind, a disallowed prop, a member object and a signed-out non-public kind with 22023, accepts a signed-in feed_viewed and a signed-out event_page_viewed, and a member cannot read surface_events",
    mobilHistory:
      "Brief 12 12C (1295): a change of current_country writes one member_profile_history row, a save that changes none of the three writes none, and the table refuses update and delete",
    mobilAfrican:
      "Brief 12 12C (1295): every African Union member world_countries carries reads is_african true, and the United States reads false",
    mobilDerive:
      "Brief 12 12C (1284, 1294, 1296): the ledger holds Engaging rows for the accepted introductions on the seeded data and none for any RSVP, follow, save or heart, and re-running the derivation adds nothing",
    mobilSide:
      "Brief 12 12C (1295): a member living in Accra reads continent side with their own stance, and after a move to London reads diaspora while a moment before the move still reads continent",
    mobilCron: "Brief 12 12C (1179): the four cron jobs exist with their schedules",
    mobilCatalogue:
      "Brief 12 12C (1299, 1300): every table the migration created has a catalogue row with a treatment other than unreviewed, and no table in public is without a row",
    messenger:
      "Brief 14 41-A (1330, 1341): owner-test's request to member-test is pending, accept opens the pair's thread with the request text as seq 1, both rows active, and the sender then opens the same thread",
    messengerThird:
      "Brief 14 41-A (1116, 1349): a third member selects none of the thread's messages and lists no thread",
    messengerBlocked:
      "Brief 14 41-A (1349): after member-test blocks owner-test, the one_to_one select returns zero rows to the blocked member and a send is refused with blocked",
    messengerHistory:
      "Brief 14 41-A (1342): in a group of three with history off, the late joiner reads nothing before joined_seq and reads the message sent after",
    messengerIdempotent:
      "Brief 14 41-A (1351): a second send with the same client_id returns the first row unchanged",
    messengerSeq:
      "Brief 14 41-A (1351): two sends in sequence take seq 2 and 3 under the lock on the thread row (true concurrency needs two connections on a committed fixture, which 269 forbids; sequential density is what is proven)",
    messengerCap:
      "Brief 14 41-A (1332): the 257th active community_group member is refused with group_full",
    messengerCapTrigger:
      "Brief 14 41-A (1332): on_thread_members_cap is a before insert or update trigger on thread_members and its function names the ceiling internally",
    messengerTick:
      "Brief 14 41-A (1345): the author's own message reads tick 2 after the recipient reads it with receipts off, and 3 once both have receipts on",
    messengerSearch:
      "Brief 14 41-A (1338, 1347): search returns the row inside scope and excludes a thread the caller left",
    messengerRate:
      "Brief 14 41-A (1353): rate_limit_check('message_send') answers thirty times and refuses the 31st in a minute",
    messengerPublication: "Brief 14 41-A (1351): the supabase_realtime publication holds no table",
    messengerRealtime:
      "Brief 14 41-A (1351): the realtime.messages policy's predicate grants inbox:{self}, denies inbox:{other}, no client role holds an insert policy on realtime.messages, and a client insert does not land",
    messengerVocab:
      "Brief 14 41-A (1331, 1348, 1349, 1370): vocabularies() carries the seven thread kinds, three mute durations, six report reasons and five reaction words",
    messengerGrants:
      "Brief 14 41-A (1116): no client role holds insert, update or delete on any table 41-A created, and every one of them has a catalogue row",
  };
  // G143: a block that opens with a presence probe carries every arm it holds in `names`, under one key
  // prefix, so a probe that fails reports each of them UNPROVEN and the job's total does not fall with
  // the coverage it lost. A key added here joins its block's list by its prefix.
  const armsOf = (prefix) =>
    Object.keys(names)
      .filter((k) => k.startsWith(prefix))
      .map((k) => names[k]);
  const unreachedIn = (prefix, why) => {
    for (const n of armsOf(prefix).filter((n) => n !== names[prefix])) skip(n, why);
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
        for (const n of armsOf("attend"))
          skip(n, "20260921160100_p2_event_page.sql is not on the project yet");
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
        unreachedIn("attend", "no event was published to read, so this arm did not run");
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
        unreachedIn(
          "attend",
          "the published post carries no event with a slug, so this arm did not run",
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
      // Addendum 4 item 1 (1121): the presenter line for a list of events is the pane's own. The
      // member reads it for the event they just answered, beside event_page's own two values.
      const presenters = await attempt(
        client,
        "select public.event_presenters(array[$1::uuid]) as p",
        [eventId],
      );
      const line = presenters.ok && presenters.rows[0].p ? presenters.rows[0].p[eventId] : null;
      record(
        names.attendPresenters,
        !!page &&
          !!line &&
          !!line.presented_by &&
          // 20260929120000 adds the presenter's headline and links to event_page's presented_by (1225);
          // event_presenters is the card's name line and carries neither, so the two are compared
          // on what both serve.
          JSON.stringify(line.presented_by) ===
            JSON.stringify(
              Object.fromEntries(
                Object.entries(page.presented_by).filter(
                  ([k]) => k !== "headline" && k !== "links",
                ),
              ),
            ) &&
          JSON.stringify(line.host) === JSON.stringify(page.host),
        presenters.ok
          ? JSON.stringify({
              line,
              page: page && { presented_by: page.presented_by, host: page.host },
            })
          : presenters.code + " " + presenters.message,
      );
      await client.query("set local role anon");
      await client.query("select set_config('request.jwt.claims', '', true)");
      const pub = await attempt(client, "select public.event_public_page($1) as p", [slug]);
      const pp = pub.ok ? pub.rows[0].p : null;
      const text = pp ? JSON.stringify(pp) : "";
      record(
        names.attendPublic,
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
        names.attendMemberRefused,
        !refused.ok && refused.code === "42501",
        refused.ok ? "answered" : refused.code + " " + refused.message,
      );
      const anonPresenters = await attempt(
        client,
        "select public.event_presenters(array[$1::uuid]) as p",
        [eventId],
      );
      record(
        names.attendPresentersAnon,
        !anonPresenters.ok && anonPresenters.code === "42501",
        anonPresenters.ok ? "answered" : anonPresenters.code + " " + anonPresenters.message,
      );
      await actAs(client, member.id);
      const media = await attempt(
        client,
        "select * from public.event_media_object($1, 'media', '0')",
        [slug],
      );
      record(
        names.attendMedia,
        !media.ok && media.code === "42501",
        media.ok ? "answered " + media.rows.length + " row(s)" : media.code + " " + media.message,
      );
    });
    // ------------------------------------------------------------------------------------------
    // Handoff 37-A (rulings 1186, 1189; 20260928120000). The owner publishes a free public event and
    // becomes its host. The member's save is refused as not the host (42501); signed out can neither
    // execute the write nor read the table (42501); the host's save of one note block comes back
    // as the block with its kind's label, event_page carries it for the host and event_public_page
    // carries it for the slug; a save whose programme block has no line is refused with 22023 and
    // the note block is still there when read back, never counted in advance; and an empty list
    // clears the page through the same function, so the arm leaves no row before the rollback.
    // ------------------------------------------------------------------------------------------
    await inTransaction(client, async () => {
      await actAsSelf(client);
      const present = await client.query(
        "select (to_regprocedure('public.save_event_blocks(uuid, jsonb)') is not null and to_regclass('public.event_blocks') is not null) as ok",
      );
      if (!present.rows[0] || present.rows[0].ok !== true) {
        for (const n of armsOf("blocks"))
          skip(n, "20260928120000_p2_event_blocks.sql is not on the project yet");
        return;
      }
      await actAs(client, owner.id);
      const starts = new Date(Date.now() + 28 * 86400e3);
      starts.setUTCHours(18, 30, 0, 0);
      const published = await attempt(client, "select public.publish_post($1::jsonb) as id", [
        JSON.stringify({
          verb: "convene",
          body: "Handoff 37-A blocks arm. Rolled back by the same run.",
          author_kind: "member",
          author_id: owner.id,
          audience: "everyone",
          host_context: "live-checks",
          fields: {
            "convene.title": "Blocks arm reading",
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
            "convene.delivery_intent": "In the room, with the programme on the page.",
          },
        }),
      ]);
      const ev = published.ok
        ? await attempt(
            client,
            "select e.id, e.slug from public.posts p join public.events e on e.id = p.created_object_id where p.id = $1",
            [published.rows[0].id],
          )
        : null;
      const eventId = ev && ev.ok && ev.rows[0] ? ev.rows[0].id : null;
      const slug = ev && ev.ok && ev.rows[0] ? ev.rows[0].slug : null;
      if (!eventId || !slug) {
        const why = !published.ok
          ? "publish_post refused: " + published.code + " " + published.message
          : "the published post carries no event with a slug";
        for (const n of armsOf("blocks")) skip(n, why + ", so this arm did not run");
        return;
      }
      const NOTE = "Doors open at six. The reading starts when the room is full.";
      const one = JSON.stringify([{ kind: "note", payload: { text: NOTE } }]);

      // (a) The member, who is not the host, is refused before any row is touched.
      await actAs(client, member.id);
      const notHost = await attempt(
        client,
        "select public.save_event_blocks($1::uuid, $2::jsonb) as b",
        [eventId, one],
      );
      record(
        names.blocksNotHost,
        !notHost.ok && notHost.code === "42501",
        notHost.ok ? "the save was accepted" : notHost.code + " " + notHost.message,
      );

      // (b) Signed out holds no execute on the write and no select on the table.
      await client.query("set local role anon");
      await client.query("select set_config('request.jwt.claims', '', true)");
      const anonSave = await attempt(
        client,
        "select public.save_event_blocks($1::uuid, $2::jsonb) as b",
        [eventId, one],
      );
      const anonRead = await attempt(
        client,
        "select b.id from public.event_blocks b where b.event_id = $1",
        [eventId],
      );
      record(
        names.blocksSignedOut,
        !anonSave.ok && anonSave.code === "42501" && !anonRead.ok && anonRead.code === "42501",
        "save " +
          (anonSave.ok ? "accepted" : anonSave.code) +
          " read " +
          (anonRead.ok ? "answered " + anonRead.rows.length + " row(s)" : anonRead.code),
      );

      // (c) The host's save returns the block with its kind's label, and both reads carry it.
      await actAs(client, owner.id);
      const saved = await attempt(
        client,
        "select public.save_event_blocks($1::uuid, $2::jsonb) as b",
        [eventId, one],
      );
      const mine = await attempt(client, "select public.event_page($1::uuid) as p", [eventId]);
      const page = mine.ok ? mine.rows[0].p : null;
      await client.query("set local role anon");
      await client.query("select set_config('request.jwt.claims', '', true)");
      const pub = await attempt(client, "select public.event_public_page($1) as p", [slug]);
      const pp = pub.ok ? pub.rows[0].p : null;
      const isNote = (list) =>
        Array.isArray(list) &&
        list.length === 1 &&
        list[0].kind === "note" &&
        list[0].label === "Good to know" &&
        !!list[0].payload &&
        list[0].payload.text === NOTE;
      record(
        names.blocksSave,
        saved.ok &&
          isNote(saved.rows[0].b) &&
          !!page &&
          page.viewer &&
          page.viewer.is_host === true &&
          isNote(page.blocks) &&
          !!pp &&
          isNote(pp.blocks),
        "save " +
          (saved.ok ? JSON.stringify(saved.rows[0].b) : saved.code + " " + saved.message) +
          " page " +
          (mine.ok ? JSON.stringify(page && page.blocks) : mine.code + " " + mine.message) +
          " public " +
          (pub.ok ? JSON.stringify(pp && pp.blocks) : pub.code + " " + pub.message),
      );

      // (d) A programme block without its line is refused as a whole, the note is still there when
      // read back, and an empty list clears the page through the same function.
      await actAs(client, owner.id);
      const refused = await attempt(
        client,
        "select public.save_event_blocks($1::uuid, $2::jsonb) as b",
        [
          eventId,
          JSON.stringify([
            { kind: "note", payload: { text: NOTE } },
            { kind: "programme", payload: { at: "18:30" } },
          ]),
        ],
      );
      const after = await attempt(client, "select public.event_page($1::uuid) as p", [eventId]);
      const kept = after.ok && after.rows[0].p ? after.rows[0].p.blocks : null;
      const cleared = await attempt(
        client,
        "select public.save_event_blocks($1::uuid, '[]'::jsonb) as b",
        [eventId],
      );
      const none = await attempt(client, "select public.event_page($1::uuid) as p", [eventId]);
      const left = none.ok && none.rows[0].p ? none.rows[0].p.blocks : null;
      record(
        names.blocksRefused,
        !refused.ok &&
          refused.code === "22023" &&
          isNote(kept) &&
          cleared.ok &&
          Array.isArray(cleared.rows[0].b) &&
          cleared.rows[0].b.length === 0 &&
          Array.isArray(left) &&
          left.length === 0,
        "refusal " +
          (refused.ok ? "accepted" : refused.code + " " + refused.message) +
          " kept " +
          (after.ok ? JSON.stringify(kept) : after.code + " " + after.message) +
          " cleared " +
          (cleared.ok ? JSON.stringify(cleared.rows[0].b) : cleared.code + " " + cleared.message) +
          " left " +
          (none.ok ? JSON.stringify(left) : none.code + " " + none.message),
      );
    });
    // ------------------------------------------------------------------------------------------
    // Handoff 37-C (20260929120000; rulings 1196, 1225). The two reads carry the presenter's line and
    // links, event_page carries the event's family and whether the viewer subscribes to it, and the
    // public read carries no family. Read on the project's own stand-in events (every event carries a
    // family) rather than a published one, so the arm writes only the owner's subscription, which
    // rolls back with the transaction.
    // ------------------------------------------------------------------------------------------
    await inTransaction(client, async () => {
      await actAsSelf(client);
      const present = await client.query(
        "select to_regprocedure('private.event_presenter_profile(jsonb, boolean)') is not null as ok",
      );
      if (!present.rows[0] || present.rows[0].ok !== true) {
        for (const n of armsOf("presenter"))
          skip(n, "20260929120000_p2_event_presenter_topic.sql is not on the project yet");
        return;
      }
      await actAs(client, owner.id);
      const cand = await client.query(
        "select e.id, e.slug, e.family, e.host_member_id from public.events e where e.family is not null and e.status = 'published' order by e.created_at, e.id limit 25",
      );
      let target = null;
      for (const row of cand.rows) {
        await client.query("set local role anon");
        await client.query("select set_config('request.jwt.claims', '', true)");
        const probe = await attempt(client, "select public.event_public_page($1) as p", [row.slug]);
        await actAs(client, owner.id);
        if (probe.ok && probe.rows[0].p) {
          target = { ...row, pub: probe.rows[0].p };
          break;
        }
      }
      if (!target) {
        for (const n of armsOf("presenter"))
          skip(
            n,
            "no published event with a family and a public page on the project, so this arm did not run",
          );
        return;
      }
      const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
      const shaped = (pb) => pb === null || (has(pb, "headline") && Array.isArray(pb.links));

      await actAs(client, target.host_member_id);
      const asHost = await attempt(client, "select public.event_page($1::uuid) as p", [target.id]);
      const hp = asHost.ok ? asHost.rows[0].p : null;
      record(
        names.presenterKeys,
        !!hp &&
          hp.event.family === target.family &&
          typeof hp.viewer.subscribed === "boolean" &&
          shaped(hp.presented_by),
        asHost.ok
          ? "family " +
              hp.event.family +
              " subscribed " +
              hp.viewer.subscribed +
              " presented_by " +
              JSON.stringify(hp.presented_by)
          : asHost.code + " " + asHost.message,
      );

      const pp = target.pub;
      record(
        names.presenterPublic,
        shaped(pp.presented_by) && !has(pp.event, "family") && !has(pp, "viewer"),
        "presented_by " +
          JSON.stringify(pp.presented_by) +
          " event keys " +
          Object.keys(pp.event).join(","),
      );

      await actAs(client, owner.id);
      const off = await attempt(client, "select public.set_subscription($1, false)", [
        target.family,
      ]);
      const before = await attempt(client, "select public.event_page($1::uuid) as p", [target.id]);
      const on = await attempt(client, "select public.set_subscription($1, true)", [target.family]);
      const after = await attempt(client, "select public.event_page($1::uuid) as p", [target.id]);
      record(
        names.presenterSubscribe,
        off.ok &&
          on.ok &&
          before.ok &&
          after.ok &&
          before.rows[0].p.viewer.subscribed === false &&
          after.rows[0].p.viewer.subscribed === true,
        "before " +
          (before.ok ? before.rows[0].p.viewer.subscribed : before.code) +
          " after " +
          (after.ok ? after.rows[0].p.viewer.subscribed : after.code),
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
    // Handoff 34-A adds the search, Filling up with the going names on Chat's seed (1165), and the
    // learned order's one writer, note_lane_act, each also rolled back; its addendum withdraws Browse
    // (1172) and lifts the floors under a search (1173).
    // ------------------------------------------------------------------------------------------
    await inTransaction(client, async () => {
      await actAsSelf(client);
      // 20260927120000 drops the nine-argument projection and creates it again with p_without, so the
      // probe names the ten-argument signature and that version's recorded row. Before it:
      // 20260926170300 drops the eight-argument projection and creates it again with p_q, so the
      // probe named the nine-argument signature; 20260926170400 keeps that signature and takes the
      // browse row out of convene_lanes, so the probe reads that version's recorded row, as the drift
      // arm reads it (444, 553: a paste records its version in the transaction that runs its DDL).
      // The probe runs as live_arms, which holds select on supabase_migrations.schema_migrations
      // (20260912090557) and none on convene_lanes: run 384's probe read the table itself, threw
      // 42501 and took the whole live step down before its count (G143 names what a failed probe
      // costs).
      const present = await client.query(
        "select to_regprocedure('public.convene_discovery(text, text[], text[], text, text[], uuid, text[], text, text, text)') is not null and exists (select 1 from supabase_migrations.schema_migrations where version = '20260927120000') as ok",
      );
      if (!present.rows[0] || present.rows[0].ok !== true) {
        for (const n of armsOf("discovery"))
          skip(
            n,
            "20260927120000 is not on the project yet (Chat applies 35-A's two migrations before its enforcing run)",
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

      // 1160: the order is the member's own, so the answer is read against its own lane_order,
      // which names every lane, and never against the table's base order.
      const all = await ask("select public.convene_discovery('all') as d");
      const ids = all.ok ? sectionIds(all.d) : [];
      const laneOrder = all.ok && all.d && Array.isArray(all.d.lane_order) ? all.d.lane_order : [];
      const wholeOrder =
        laneOrder.length === laneIds.length && laneIds.every((id) => laneOrder.includes(id));
      const inOrder = ids.every(
        (id, i) =>
          laneOrder.includes(id) &&
          (i === 0 || laneOrder.indexOf(ids[i - 1]) < laneOrder.indexOf(id)),
      );
      record(
        names.discovery,
        all.ok && ids.length > 0 && wholeOrder && inOrder && ids.includes("curated"),
        all.ok
          ? "sections " + JSON.stringify(ids) + " lane_order " + JSON.stringify(laneOrder)
          : failed(all),
      );

      const curatedItem =
        all.ok && section(all.d, "curated") ? section(all.d, "curated").items[0] : null;
      const pick = curatedItem && curatedItem.reason;
      record(
        names.discoveryPick,
        !!pick &&
          pick.kind === "curated" &&
          !!pick.editor &&
          pick.editor.id === owner.id &&
          pick.editor.name === owner.name &&
          typeof pick.line === "string" &&
          pick.line.trim() !== "",
        pick ? JSON.stringify(pick) : "no curated item in the owner's answer",
      );

      // 1124, 1159: the search narrows the corpus before the lanes form. The pick's own title keeps
      // the pick in Curated; a search that matches nothing drops every lane; 100 characters are
      // taken and 101 refused with 22023. Read before the dismissal below empties Curated inside
      // this transaction.
      const Q =
        "select public.convene_discovery('all', null, null, null, null, null, null, null, $1) as d";
      const titled = curatedItem
        ? await attempt(client, "select title from public.events where id = $1::uuid", [
            curatedItem.event_id,
          ])
        : null;
      const pickTitle = titled && titled.ok && titled.rows[0] ? titled.rows[0].title : null;
      const found = pickTitle ? await ask(Q, [pickTitle]) : null;
      const foundCurated = found && found.ok ? section(found.d, "curated") : null;
      const kept =
        !!foundCurated && foundCurated.items.some((i) => i.event_id === curatedItem.event_id);
      const nothing = await ask(Q, ["zq live arm matches no event 7c1"]);
      const hundred = await attempt(client, Q, ["x".repeat(100)]);
      const tooLong = await attempt(client, Q, ["x".repeat(101)]);
      record(
        names.discoverySearch,
        kept &&
          nothing.ok &&
          sectionIds(nothing.d).length === 0 &&
          hundred.ok &&
          !tooLong.ok &&
          tooLong.code === "22023",
        (pickTitle
          ? "found " + (found.ok ? JSON.stringify(sectionIds(found.d)) : failed(found))
          : "no pick title to search for") +
          " kept " +
          kept +
          " nothing " +
          (nothing.ok ? JSON.stringify(sectionIds(nothing.d)) : failed(nothing)) +
          " 100 " +
          (hundred.ok ? "answered" : failed(hundred)) +
          " 101 " +
          (tooLong.ok ? "answered" : tooLong.code),
      );

      // 1173: under a search the floors do not apply. One seeded event's title (1165) names that event,
      // and Filling up, whose floor is two, comes back holding it: a search whose matches sit one to
      // a lane returns the lane. Read as the owner, before the dismissal below.
      const seededTitle = await attempt(
        client,
        "select title from public.events where id = $1::uuid",
        [SEEDED_FILLING[0]],
      );
      const title = seededTitle.ok && seededTitle.rows[0] ? seededTitle.rows[0].title : null;
      const one = title ? await ask(Q, [title]) : null;
      const oneFilling = one && one.ok ? section(one.d, "filling") : null;
      const oneIds = one && one.ok ? sectionIds(one.d) : [];
      record(
        names.discoverySearchOne,
        !!one &&
          one.ok &&
          oneIds.length >= 1 &&
          !!oneFilling &&
          oneFilling.items.some((i) => i.event_id === SEEDED_FILLING[0]),
        (title ? "title found" : "no title for the seeded event") +
          " lanes " +
          (one ? (one.ok ? JSON.stringify(oneIds) : failed(one)) : "not read") +
          " filling " +
          (oneFilling ? oneFilling.items.length + " item(s)" : "absent"),
      );

      // 1172: the Browse lane is withdrawn. No section is browse, no section carries tiles, and
      // lane_order is the ten lanes.
      const tiled = all.ok ? ((all.d && all.d.sections) || []).filter((x) => "tiles" in x) : [];
      record(
        names.discoveryBrowse,
        all.ok && !section(all.d, "browse") && tiled.length === 0 && laneOrder.length === 10,
        all.ok
          ? "browse " +
              (section(all.d, "browse") ? "present" : "absent") +
              " tiled " +
              tiled.length +
              " lane_order " +
              laneOrder.length
          : failed(all),
      );

      // 1157, 1165: Chat seeded five going RSVPs on each of two events. Filling up carries both, as
      // the owner's row policy counts them, and event_going_names gives each three first names, never
      // the viewer's own (1128, 1138, 1158). The seed is canonical data, read and never written here.
      const filling = all.ok ? section(all.d, "filling") : null;
      const fillingIds = filling ? filling.items.map((i) => i.event_id) : [];
      const going = await ask("select public.event_going_names($1::uuid[]) as d", [SEEDED_FILLING]);
      const ownFirst = String(owner.name || "")
        .trim()
        .split(" ")[0];
      const named = going.ok && going.d ? SEEDED_FILLING.map((id) => going.d[id]) : [];
      record(
        names.discoveryFilling,
        !!filling &&
          SEEDED_FILLING.every((id) => fillingIds.includes(id)) &&
          going.ok &&
          named.length === SEEDED_FILLING.length &&
          named.every(
            (n) =>
              Array.isArray(n) &&
              n.length === 3 &&
              n.every((x) => typeof x === "string" && x !== "" && x !== ownFirst),
          ),
        "filling " +
          JSON.stringify(fillingIds) +
          " names " +
          (going.ok ? JSON.stringify(named) : failed(going)),
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
        names.discoveryNoCount,
        all.ok && noCount.length === 0,
        all.ok ? (noCount.length ? "keys " + noCount.join(",") : "none") : failed(all),
      );

      const sub = await attempt(client, "select public.set_subscription('culture_arts', true)");
      const taste = sub.ok ? await ask("select public.convene_discovery('taste') as d") : sub;
      const tasteItems =
        taste.ok && section(taste.d, "taste") ? section(taste.d, "taste").items : [];
      record(
        names.discoveryTaste,
        taste.ok &&
          tasteItems.length > 0 &&
          tasteItems.every((i) => i.reason && i.reason.family === "culture_arts"),
        taste.ok
          ? "families " + JSON.stringify([...new Set(tasteItems.map((i) => i.reason.family))])
          : failed(taste),
      );

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
          names.discoveryDismiss,
          !!curatedSection &&
            curatedSection.items.length === 0 &&
            !!added &&
            added.length === 1 &&
            added[0] === "curated",
          (curated.ok ? "curated " + JSON.stringify(curated.d.sections) : failed(curated)) +
            " added " +
            JSON.stringify(added),
        );
      } else record(names.discoveryDismiss, false, "no curated item to dismiss");

      const inPerson = await ask("select public.convene_discovery('all', array['in_person']) as d");
      const inPersonIds = inPerson.ok ? sectionIds(inPerson.d) : [];
      record(
        names.discoveryFormat,
        inPerson.ok && !inPersonIds.includes("online"),
        inPerson.ok ? "sections " + JSON.stringify(inPersonIds) : failed(inPerson),
      );

      const insert = await attempt(
        client,
        "insert into public.member_subscriptions (member_id, kind, family) values ($1, 'family', 'sport_wellness')",
        [owner.id],
      );
      record(
        names.discoverySubInsert,
        !insert.ok && insert.code === "42501",
        insert.ok ? "inserted" : failed(insert),
      );
      const floors = await attempt(client, "select * from private.convene_thresholds");
      record(
        names.discoveryThresholds,
        !floors.ok && floors.code === "42501",
        floors.ok ? "read " + floors.rows.length + " row(s)" : failed(floors),
      );
      // 1177: public.editors is folded into platform_roles, which has no client grant either.
      const roles = await attempt(client, "select * from public.platform_roles");
      record(
        names.discoveryRoles,
        !roles.ok && roles.code === "42501",
        roles.ok ? "read " + roles.rows.length + " row(s)" : failed(roles),
      );

      // 1093: the lens set is five, so events and the three retired lenses are all refused.
      const refusedLenses = [];
      for (const l of ["events", "soon", "online", "near"]) {
        const r = await attempt(client, "select public.convene_discovery($1)", [l]);
        if (r.ok || r.code !== "22023")
          refusedLenses.push(l + " " + (r.ok ? "answered" : failed(r)));
      }
      record(
        names.discoveryRetired,
        refusedLenses.length === 0,
        refusedLenses.join("; ") || "all four refused",
      );
      const badSection = await attempt(
        client,
        "select public.dismiss_discovery_item($1::uuid, 'all')",
        [curatedItem ? curatedItem.event_id : "00000000-0000-0000-0000-000000000000"],
      );
      record(
        names.discoveryDismissAll,
        !badSection.ok && badSection.code === "22023",
        badSection.ok ? "accepted" : failed(badSection),
      );
      // 1095: Donation is gone; the projection refuses it as any unknown price.
      const donation = await attempt(
        client,
        "select public.convene_discovery('all', null, array['donation'])",
      );
      record(
        names.discoveryDonation,
        !donation.ok && donation.code === "22023",
        donation.ok ? "answered" : failed(donation),
      );
      // 1174 (handoff 35-A): p_without leaves a lens's events out of a read of All before the floors
      // apply. The follow lens's ids are read as the owner, then All without them, and none may
      // appear in any lane; the arm reads nothing if the follow lens holds no event, since an empty
      // lens leaves nothing to leave out (UNPROVEN, never a pass).
      const followLens = await ask("select public.convene_discovery('follow') as d");
      const followIds = new Set(
        followLens.ok ? (section(followLens.d, "follow")?.items.map((i) => i.event_id) ?? []) : [],
      );
      const without = await ask(
        "select public.convene_discovery('all', p_without => 'follow') as d",
      );
      const leaked = without.ok
        ? ((without.d && without.d.sections) || []).flatMap((s) =>
            s.items
              .filter((i) => followIds.has(i.event_id))
              .map((i) => s.section + ":" + i.event_id),
          )
        : [];
      if (followLens.ok && followIds.size === 0)
        skip(names.discoveryWithout, "the owner's follow lens holds no event to leave out");
      else
        record(
          names.discoveryWithout,
          followLens.ok && without.ok && leaked.length === 0,
          !followLens.ok
            ? failed(followLens)
            : without.ok
              ? followIds.size +
                " follow event(s) left out, sections " +
                JSON.stringify(sectionIds(without.d)) +
                " leaked " +
                JSON.stringify(leaked)
              : failed(without),
        );
      const withoutLens = await attempt(
        client,
        "select public.convene_discovery('follow', p_without => 'curated')",
      );
      record(
        names.discoveryWithoutLens,
        !withoutLens.ok && withoutLens.code === "22023",
        withoutLens.ok ? "answered" : failed(withoutLens),
      );
      const withoutAll = await attempt(
        client,
        "select public.convene_discovery('all', p_without => 'all')",
      );
      record(
        names.discoveryWithoutAll,
        !withoutAll.ok && withoutAll.code === "22023",
        withoutAll.ok ? "answered" : failed(withoutAll),
      );
      // 1095: Place's options are grounded places, and the projection takes one and refuses a
      // malformed id. The project's own upcoming events carry no city (run 349 read one option,
      // `country|ghana`), so the owner publishes in-person events in Accra under a savepoint, as
      // Convene Pass 1 does, and the arm rolls back to that savepoint after its reads, so every
      // later check reads the project as it is. Two events, because 20260924100000 sets Near's floor
      // to 2: with one, the city's narrowing answered no lanes and Near was never read (G117).
      await client.query("savepoint places_fixture");
      const placeEvent = async (title, days, hour, when) => {
        const starts = new Date(Date.now() + days * 86400e3);
        starts.setUTCHours(hour, 0, 0, 0);
        return attempt(client, "select public.publish_post($1::jsonb) as id", [
          JSON.stringify({
            verb: "convene",
            body: "Place arm (1095). Rolled back by the same run.",
            author_kind: "member",
            author_id: owner.id,
            audience: "everyone",
            host_context: "live-checks",
            fields: {
              "convene.title": title,
              "convene.format": "in_person",
              "convene.when": when,
              "convene.starts_at": starts.toISOString(),
              "convene.timezone": "Africa/Accra",
              "convene.place_id": "live-arms-place",
              "convene.place_name": "Front Room",
              "convene.city": "Accra",
              "convene.region": "Greater Accra",
              "convene.country": "Ghana",
              "convene.lng": "-0.1747",
              "convene.lat": "5.5559",
              "convene.price_nature": "free",
              "convene.delivery_intent": "In person at Front Room, Accra.",
            },
          }),
        ]);
      };
      const fixtures = [
        await placeEvent("Place arm supper", 10, 18, "in ten days at 18:00"),
        await placeEvent("Place arm breakfast", 11, 8, "in eleven days at 08:00"),
      ];
      const refused = fixtures.find((f) => !f.ok);
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
      // The fixture's own city, not whichever city sorts first, so the lane read is the one the
      // fixture filled.
      const city = opts.find((o) => o.id === "city|ghana|accra");
      const narrowed = city
        ? await ask(
            "select public.convene_discovery('all', null, null, null, null, null, array[$1]) as d",
            [city.id],
          )
        : null;
      // Near must be there to be read: a lane under its floor is absent, and an absent lane proves
      // nothing about its reasons (228).
      const near = narrowed && narrowed.ok ? section(narrowed.d, "near") : null;
      const nearPlace =
        !!near &&
        near.items.length > 0 &&
        near.items.every(
          (i) =>
            i.reason &&
            i.reason.place &&
            String(i.reason.place.city || "").toLowerCase() === "accra",
        );
      const malformed = await attempt(
        client,
        "select public.convene_discovery('all', null, null, null, null, null, array['town|x'])",
      );
      await client.query("rollback to savepoint places_fixture");
      record(
        names.discoveryPlaces,
        !refused &&
          places.ok &&
          opts.length > 0 &&
          wellFormed &&
          !!narrowed &&
          narrowed.ok &&
          nearPlace &&
          !malformed.ok &&
          malformed.code === "22023",
        (refused ? "publish_post refused: " + failed(refused) + "; " : "") +
          (places.ok
            ? opts.length + " option(s), city " + JSON.stringify(city || null)
            : failed(places)) +
          " narrowed " +
          (narrowed
            ? narrowed.ok
              ? JSON.stringify(sectionIds(narrowed.d))
              : failed(narrowed)
            : "no city") +
          " near " +
          (near ? near.items.length + " item(s)" : "absent") +
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
        names.discoveryRungs,
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
          names.discoveryForeignHome,
          !foreign.ok && foreign.code === "22023",
          foreign.ok ? "answered" : failed(foreign),
        );
      } else {
        record(
          names.discoveryForeignHome,
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
        names.discoveryRail,
        own.ok && peek.ok && peek.rows.length === 0 && !forge.ok && forge.code === "42501",
        "own " +
          (own.ok ? "written" : failed(own)) +
          " peek " +
          (peek.ok ? peek.rows.length + " row(s)" : failed(peek)) +
          " forge " +
          (forge.ok ? "written" : failed(forge)),
      );

      // 1160: note_lane_act is the one writer of the learned order. It refuses a lane or an act it
      // does not know with 22023; a noted act puts its lane first in the member's lane_order, and the
      // owner reads their own row. A member's direct insert is refused at the grant (42501), and
      // another member reads none of the owner's rows. The owner's committed rows, from the app, are
      // left as they are: the noted act is an upsert and rolls back with the transaction.
      await actAs(client, owner.id);
      const badLane = await attempt(client, "select public.note_lane_act('nope', 'open')");
      const badAct = await attempt(client, "select public.note_lane_act('soon', 'look')");
      const noted = await attempt(client, "select public.note_lane_act('network', 'open')");
      const reordered = noted.ok ? await ask("select public.convene_discovery('all') as d") : noted;
      const firstLane =
        reordered.ok && reordered.d && Array.isArray(reordered.d.lane_order)
          ? reordered.d.lane_order[0]
          : null;
      const ownActs = await attempt(
        client,
        "select lane, act from public.member_lane_activity where member_id = $1::uuid",
        [owner.id],
      );
      record(
        names.discoveryLaneAct,
        !badLane.ok &&
          badLane.code === "22023" &&
          !badAct.ok &&
          badAct.code === "22023" &&
          noted.ok &&
          firstLane === "network" &&
          ownActs.ok &&
          ownActs.rows.some((r) => r.lane === "network" && r.act === "open"),
        "lane " +
          (badLane.ok ? "accepted" : badLane.code) +
          " act " +
          (badAct.ok ? "accepted" : badAct.code) +
          " noted " +
          (noted.ok ? "written" : failed(noted)) +
          " first " +
          firstLane +
          " own " +
          (ownActs.ok ? JSON.stringify(ownActs.rows) : failed(ownActs)),
      );
      await actAs(client, member.id);
      const forgeAct = await attempt(
        client,
        "insert into public.member_lane_activity (member_id, lane, act) values ($1, 'soon', 'open')",
        [member.id],
      );
      const peekActs = await attempt(
        client,
        "select lane from public.member_lane_activity where member_id = $1::uuid",
        [owner.id],
      );
      record(
        names.discoveryLaneInsert,
        !forgeAct.ok && forgeAct.code === "42501" && peekActs.ok && peekActs.rows.length === 0,
        "insert " +
          (forgeAct.ok ? "written" : failed(forgeAct)) +
          " peek " +
          (peekActs.ok ? peekActs.rows.length + " row(s)" : failed(peekActs)),
      );

      // 1080, 1081: the alias history and the reserved words are the database's alone.
      const aliases = await attempt(client, "select alias from public.event_aliases limit 1");
      const words = await attempt(client, "select word from public.reserved_link_words limit 1");
      record(
        names.discoveryAliases,
        !aliases.ok && aliases.code === "42501" && !words.ok && words.code === "42501",
        "aliases " +
          (aliases.ok ? "read" : aliases.code) +
          " words " +
          (words.ok ? "read" : words.code),
      );

      record(
        names.discoveryVocab,
        families.length === 9 &&
          lenses.map((l) => l.value).join(",") === "all,follow,taste,curated,network" &&
          lenses.every((l) => typeof l.short === "string" && l.short.trim() !== "") &&
          laneIds.join(",") ===
            "soon,weekend,online,filling,fresh,curated,follow,taste,near,network" &&
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
      const anonGoing = await attempt(client, "select public.event_going_names($1::uuid[])", [
        SEEDED_FILLING,
      ]);
      const anonAct = await attempt(client, "select public.note_lane_act('soon', 'open')");
      record(
        names.discoverySignedOut,
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
      // The control is the owner's own call above, which answered.
      record(
        names.discoveryGoingSignedOut,
        !anonGoing.ok && anonGoing.code === "42501" && !anonAct.ok && anonAct.code === "42501",
        "going " +
          (anonGoing.ok ? "answered" : anonGoing.code) +
          " act " +
          (anonAct.ok ? "written" : anonAct.code),
      );
    });

    // ------------------------------------------------------------------------------------------
    // G61 (Session 35, 20260927120100): TRUNCATE, REFERENCES, TRIGGER and MAINTAIN, which Supabase's
    // default privileges hand anon and authenticated on every table postgres creates in public, are
    // revoked from every table and from the default. Read from pg_class.relacl through aclexplode and
    // from pg_default_acl, never from information_schema.role_table_grants: that view lists only the
    // grants where the reading role is grantor or grantee, so as live_arms it would read zero whatever
    // the truth. Both catalogues are readable by every role.
    // ------------------------------------------------------------------------------------------
    await inTransaction(client, async () => {
      await actAsSelf(client);
      const held = await attempt(
        client,
        `select
           (select coalesce(jsonb_agg(distinct c.relname || ':' || r.rolname || ':' || a.privilege_type), '[]'::jsonb)
            from pg_class c
            cross join lateral aclexplode(c.relacl) a
            join pg_roles r on r.oid = a.grantee
            where c.relnamespace = 'public'::regnamespace
              and c.relkind in ('r', 'p')
              and r.rolname in ('anon', 'authenticated')
              and a.privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN')) as tables,
           (select coalesce(jsonb_agg(distinct r.rolname || ':' || a.privilege_type), '[]'::jsonb)
            from pg_default_acl d
            cross join lateral aclexplode(d.defaclacl) a
            join pg_roles r on r.oid = a.grantee
            where d.defaclnamespace = 'public'::regnamespace
              and d.defaclrole = 'postgres'::regrole
              and d.defaclobjtype = 'r'
              and r.rolname in ('anon', 'authenticated')
              and a.privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN')) as defaults`,
      );
      const row = held.ok ? held.rows[0] : null;
      record(
        names.grants,
        !!row && row.tables.length === 0 && row.defaults.length === 0,
        row
          ? "tables " +
              JSON.stringify(row.tables.slice(0, 5)) +
              " (" +
              row.tables.length +
              ") default ACL " +
              JSON.stringify(row.defaults)
          : held.code + " " + held.message,
      );
    });

    // ------------------------------------------------------------------------------------------
    // Brief 12 12A (rulings 1177, 1178, 1265, 1266; 20261001120000; handoff 40-A). The admin gate is
    // the database. Every arm opens with the same presence probe so that before the apply the block
    // reports UNPROVEN as a whole (G143, 228). The admin persona is the member id
    // live_arms_admin_member() answers, read as live_arms itself (382); the arms then act as that
    // member with an aal claim of their choosing, exactly as Supabase Auth would set it. Each arm is
    // its own rolled-back transaction, so a grant one arm makes is gone before the next begins.
    // ------------------------------------------------------------------------------------------
    const adminPresent = async () => {
      await actAsSelf(client);
      const present = await client.query(
        "select to_regprocedure('public.admin_session_state()') is not null as ok",
      );
      return !!present.rows[0] && present.rows[0].ok === true;
    };
    const adminMember = async () => {
      await actAsSelf(client);
      const r = await attempt(client, "select public.live_arms_admin_member() as id");
      return r.ok && r.rows[0] ? r.rows[0].id : null;
    };
    const stateAs = async (uid, aal) => {
      await actAs(client, uid, aal);
      const r = await attempt(client, "select public.admin_session_state() as s");
      return r.ok ? { ok: true, s: r.rows[0] && r.rows[0].s } : r;
    };
    const roleList = (st) => (st.ok && st.s && Array.isArray(st.s.roles) ? st.s.roles : null);
    const fmt = (r) => (r.ok ? "answered" : r.code + " " + r.message);
    if (!(await adminPresent())) {
      for (const n of armsOf("admin"))
        skip(n, "20261001120000_b12a_access_audit.sql is not on the project yet");
    } else {
      // 1. No policy anywhere cites is_admin (1266). pg_policies is readable by every role.
      await inTransaction(client, async () => {
        await actAsSelf(client);
        const cites = await attempt(
          client,
          "select schemaname || '.' || tablename || '.' || policyname as p from pg_policies where qual ilike '%is_admin%' or with_check ilike '%is_admin%' order by 1",
        );
        record(
          names.admin,
          cites.ok && cites.rows.length === 0,
          cites.ok
            ? cites.rows.length
              ? cites.rows.map((r) => r.p).join(", ")
              : "none"
            : fmt(cites),
        );
      });

      // 2. The admin persona at aal1: a role holder with no admin reach; at aal2 the same call answers.
      await inTransaction(client, async () => {
        const adminId = await adminMember();
        if (!adminId) {
          skip(names.adminAal1, "live_arms_admin_member() answered no admin");
          return;
        }
        const at1 = await stateAs(adminId, "aal1");
        const roles1 = roleList(at1);
        const grant1 = await attempt(
          client,
          "select public.admin_grant_role($1::uuid, 'analyst', 'live arm: aal1 control') as id",
          [adminId === member.id ? owner.id : member.id],
        );
        const at2 = await stateAs(adminId, "aal2");
        const roles2 = roleList(at2);
        const grant2 = await attempt(
          client,
          "select public.admin_grant_role($1::uuid, 'analyst', 'live arm: aal2 control') as id",
          [adminId === member.id ? owner.id : member.id],
        );
        record(
          names.adminAal1,
          at1.ok &&
            at1.s.holds_role === true &&
            Array.isArray(roles1) &&
            roles1.length === 0 &&
            !grant1.ok &&
            grant1.code === "42501" &&
            at2.ok &&
            Array.isArray(roles2) &&
            roles2.includes("admin") &&
            grant2.ok,
          "aal1 " +
            (at1.ok ? JSON.stringify(at1.s) : fmt(at1)) +
            " grant " +
            fmt(grant1) +
            "; aal2 roles " +
            JSON.stringify(roles2) +
            " grant " +
            fmt(grant2),
        );
      });

      // 3. Grant, read as the grantee, revoke, read again (1177, 1178).
      await inTransaction(client, async () => {
        const adminId = await adminMember();
        if (!adminId || adminId === member.id) {
          skip(names.adminGrant, adminId ? "the admin persona is member-test" : "no admin");
          return;
        }
        await actAs(client, adminId, "aal2");
        const granted = await attempt(
          client,
          "select public.admin_grant_role($1::uuid, 'analyst', 'live arm: grant analyst to member-test') as id",
          [member.id],
        );
        const holding = await stateAs(member.id, "aal2");
        const held = roleList(holding);
        await actAs(client, adminId, "aal2");
        const revoked = await attempt(
          client,
          "select public.admin_revoke_role($1::uuid, 'analyst', 'live arm: revoke analyst from member-test') as id",
          [member.id],
        );
        const after = await stateAs(member.id, "aal2");
        record(
          names.adminGrant,
          granted.ok &&
            typeof granted.rows[0].id !== "undefined" &&
            holding.ok &&
            holding.s.holds_role === true &&
            Array.isArray(held) &&
            held.includes("analyst") &&
            revoked.ok &&
            after.ok &&
            after.s.holds_role === false &&
            Array.isArray(roleList(after)) &&
            roleList(after).length === 0,
          "grant " +
            fmt(granted) +
            " then " +
            (holding.ok ? JSON.stringify(holding.s) : fmt(holding)) +
            "; revoke " +
            fmt(revoked) +
            " then " +
            (after.ok ? JSON.stringify(after.s) : fmt(after)),
        );
      });

      // 4. A member with no role: refused the write, and refused every direct read (1265, 1266).
      await inTransaction(client, async () => {
        await actAs(client, member.id, "aal2");
        const grant = await attempt(
          client,
          "select public.admin_grant_role($1::uuid, 'analyst', 'live arm: a member grants') as id",
          [owner.id],
        );
        const reads = [];
        for (const t of ["platform_roles", "admin_actions", "admin_reads"]) {
          const r = await attempt(client, "select * from public." + t + " limit 1");
          if (r.ok || r.code !== "42501") reads.push(t + " " + fmt(r));
        }
        record(
          names.adminRefused,
          !grant.ok && grant.code === "42501" && reads.length === 0,
          "grant " +
            fmt(grant) +
            (reads.length ? "; reads " + reads.join(", ") : "; all three reads refused"),
        );
      });

      // 5. The last live admin cannot revoke itself (22023), so the company cannot lock itself out.
      await inTransaction(client, async () => {
        const adminId = await adminMember();
        if (!adminId) {
          skip(names.adminLastAdmin, "live_arms_admin_member() answered no admin");
          return;
        }
        await actAs(client, adminId, "aal2");
        const self = await attempt(
          client,
          "select public.admin_revoke_role($1::uuid, 'admin', 'live arm: the last admin revokes itself') as id",
          [adminId],
        );
        record(
          names.adminLastAdmin,
          !self.ok && self.code === "22023",
          self.ok
            ? "revoked: either a second live admin exists or the guard did not hold"
            : fmt(self),
        );
      });

      // 6. The append-only triggers are on both logs (1178). live_arms holds no write on either
      // table, so the refusal itself is read from the catalog and not exercised; the arm says so.
      await inTransaction(client, async () => {
        await actAsSelf(client);
        const trg = await attempt(
          client,
          "select tgrelid::regclass::text || ':' || tgname as t from pg_trigger where not tgisinternal and tgrelid in ('public.admin_actions'::regclass, 'public.admin_reads'::regclass) order by 1",
        );
        const want = [
          "admin_actions:admin_actions_append_only",
          "admin_actions:admin_actions_no_truncate",
          "admin_reads:admin_reads_append_only",
          "admin_reads:admin_reads_no_truncate",
        ];
        const have = trg.ok ? trg.rows.map((r) => r.t) : [];
        record(
          names.adminAppendOnly,
          trg.ok && want.every((w) => have.includes(w)),
          (trg.ok ? have.join(", ") : fmt(trg)) +
            "; catalog only, the service-role refusal is not exercisable as live_arms",
        );
      });

      // 7. Signed out holds no execute on any of the three.
      await inTransaction(client, async () => {
        await client.query("set local role anon");
        await client.query("select set_config('request.jwt.claims', '', true)");
        const calls = [];
        for (const [n, sql] of [
          ["admin_session_state", "select public.admin_session_state()"],
          ["admin_grant_role", "select public.admin_grant_role($1::uuid, 'analyst', 'x')"],
          ["admin_revoke_role", "select public.admin_revoke_role($1::uuid, 'analyst', 'x')"],
        ]) {
          const r = await attempt(client, sql, sql.includes("$1") ? [member.id] : undefined);
          if (r.ok || r.code !== "42501") calls.push(n + " " + fmt(r));
        }
        record(names.adminSignedOut, calls.length === 0, calls.join("; ") || "all three refused");
      });

      // 8. The vocabulary serves the six roles in their one order (1177).
      await inTransaction(client, async () => {
        await actAs(client, member.id, "aal2");
        const v = await attempt(
          client,
          "select public.vocabularies() -> 'platform_role_kinds' as k",
        );
        const kinds = v.ok && Array.isArray(v.rows[0].k) ? v.rows[0].k.map((k) => k.value) : null;
        const want = ["admin", "editor", "moderator", "support", "finance", "analyst"];
        record(
          names.adminVocab,
          !!kinds && JSON.stringify(kinds) === JSON.stringify(want),
          v.ok ? JSON.stringify(kinds) : fmt(v),
        );
      });
    }

    // ------------------------------------------------------------------------------------------
    // Brief 12 12C part 1 (rulings 1179, 1284, 1294 to 1300; 20261002120000; handoff 40-C). The
    // recording layer and the mobilization ledger. Every arm opens with the same presence probe so
    // that before the apply the block reports UNPROVEN as a whole (G143, 228). live_arms reads the
    // history, the log and the ledger under policies confined to the two test accounts, reads the
    // catalogue whole, and executes profile_at, member_side, derive_mobilization_v1 and
    // mobilization_jobs (382). Each arm is its own rolled-back transaction: a row record_event
    // writes, a history row a move writes and a derivation's upsert are all gone before the next
    // arm begins (269).
    // ------------------------------------------------------------------------------------------
    const RECORD_EVENT =
      "public.record_event(text, text, uuid, text, text, public.anchor_kind, uuid, jsonb, text)";
    const mobilPresent = async () => {
      await actAsSelf(client);
      const present = await client.query("select to_regprocedure($1) is not null as ok", [
        RECORD_EVENT,
      ]);
      return !!present.rows[0] && present.rows[0].ok === true;
    };
    /** record_event with the envelope the app will send; props and object default to none. */
    const recordEvent = (kind, opts = {}) =>
      attempt(
        client,
        "select public.record_event($1, 'app', $2::uuid, $3, null, $4::public.anchor_kind, $5::uuid, $6::jsonb, 'wide')",
        [
          kind,
          opts.session,
          opts.surface || "/",
          opts.objectKind || null,
          opts.objectId || null,
          JSON.stringify(opts.props || {}),
        ],
      );
    const newUuid = async () => {
      await actAsSelf(client);
      const r = await client.query("select gen_random_uuid()::text as u");
      return r.rows[0].u;
    };
    if (!(await mobilPresent())) {
      for (const n of armsOf("mobil"))
        skip(n, "20261002120000_b12c_recording_ledger.sql is not on the project yet");
    } else {
      // 1. The one writer refuses what the kind does not allow and accepts what it does (1179, 1297,
      // 1298). The accepted calls are proven by the row they leave, read back as live_arms under its
      // test-account policy; a member reading the table directly is refused at the grant.
      await inTransaction(client, async () => {
        const session = await newUuid();
        await actAs(client, member.id);
        const unknown = await recordEvent("no_such_kind", { session });
        const badProp = await recordEvent("feed_viewed", {
          session,
          props: { lens: "all", ip: "x" },
        });
        const memberObject = await recordEvent("profile_viewed", {
          session,
          objectKind: "member",
          objectId: owner.id,
        });
        const accepted = await recordEvent("feed_viewed", { session, props: { lens: "all" } });
        const memberRead = await attempt(client, "select id from public.surface_events limit 1");
        await client.query("set local role anon");
        await client.query("select set_config('request.jwt.claims', '', true)");
        const signedOutPrivate = await recordEvent("feed_viewed", {
          session,
          props: { lens: "all" },
        });
        const signedOutPublic = await recordEvent("event_page_viewed", {
          session,
          surface: "/e/x",
          objectKind: "event",
          objectId: session,
        });
        await actAsSelf(client);
        const rows = await attempt(
          client,
          "select kind, member_id is null as anon from public.surface_events where session_id = $1::uuid order by id",
          [session],
        );
        const written = rows.ok ? rows.rows.map((r) => r.kind + (r.anon ? "(anon)" : "")) : null;
        const refused = (r) => !r.ok && r.code === "22023";
        record(
          names.mobil,
          refused(unknown) &&
            refused(badProp) &&
            refused(memberObject) &&
            refused(signedOutPrivate) &&
            accepted.ok &&
            signedOutPublic.ok &&
            !memberRead.ok &&
            memberRead.code === "42501" &&
            JSON.stringify(written) === JSON.stringify(["feed_viewed", "event_page_viewed(anon)"]),
          "unknown " +
            fmt(unknown) +
            "; prop " +
            fmt(badProp) +
            "; member object " +
            fmt(memberObject) +
            "; signed-out feed_viewed " +
            fmt(signedOutPrivate) +
            "; signed-in feed_viewed " +
            fmt(accepted) +
            "; signed-out event_page_viewed " +
            fmt(signedOutPublic) +
            "; member read " +
            fmt(memberRead) +
            "; rows " +
            (rows.ok ? JSON.stringify(written) : fmt(rows)),
        );
      });

      // 2. History: one row per change of the three columns, none for a save that changes none of
      // them, and no update or delete (1295). live_arms holds select only, so the refusal it meets is
      // the grant's; the append-only triggers are read from the catalog.
      await inTransaction(client, async () => {
        const count = async () => {
          await actAsSelf(client);
          const r = await attempt(
            client,
            "select count(*)::int as n from public.member_profile_history where member_id = $1::uuid",
            [member.id],
          );
          return r.ok ? r.rows[0].n : null;
        };
        const before = await count();
        await actAs(client, member.id);
        const move = await attempt(
          client,
          "update public.members set current_country = 'Kenya', current_place = 'Nairobi' where id = $1::uuid",
          [member.id],
        );
        const afterMove = await count();
        await actAs(client, member.id);
        const same = await attempt(
          client,
          "update public.members set headline = coalesce(headline, '') where id = $1::uuid",
          [member.id],
        );
        const afterSame = await count();
        await actAsSelf(client);
        const upd = await attempt(
          client,
          "update public.member_profile_history set source = 'change' where member_id = $1::uuid",
          [member.id],
        );
        const del = await attempt(
          client,
          "delete from public.member_profile_history where member_id = $1::uuid",
          [member.id],
        );
        const trg = await attempt(
          client,
          "select tgname from pg_trigger where not tgisinternal and tgrelid = 'public.member_profile_history'::regclass order by 1",
        );
        const have = trg.ok ? trg.rows.map((r) => r.tgname) : [];
        record(
          names.mobilHistory,
          move.ok &&
            same.ok &&
            before !== null &&
            afterMove === before + 1 &&
            afterSame === afterMove &&
            !upd.ok &&
            upd.code === "42501" &&
            !del.ok &&
            del.code === "42501" &&
            have.includes("member_profile_history_append_only") &&
            have.includes("member_profile_history_no_truncate"),
          "rows " +
            before +
            " -> " +
            afterMove +
            " after the move -> " +
            afterSame +
            " after a same-value save; update " +
            fmt(upd) +
            "; delete " +
            fmt(del) +
            "; triggers " +
            (trg.ok ? have.join(", ") : fmt(trg)),
        );
      });

      // 3. Which countries are African (1295): every public.countries name that world_countries
      // carries reads true, and a non-member reads false. Both tables are the member's to read.
      await inTransaction(client, async () => {
        await actAs(client, member.id);
        const au = await attempt(
          client,
          "select count(*)::int as members, count(*) filter (where w.is_african)::int as flagged, string_agg(c.name, ', ') filter (where not w.is_african) as missed from public.countries c join public.world_countries w on w.name = c.name",
        );
        const us = await attempt(
          client,
          "select is_african from public.world_countries where name = 'United States'",
        );
        const flagged = await attempt(
          client,
          "select count(*)::int as n from public.world_countries where is_african",
        );
        const r = au.ok ? au.rows[0] : null;
        record(
          names.mobilAfrican,
          !!r &&
            r.members === 54 &&
            r.flagged === 54 &&
            us.ok &&
            us.rows[0] &&
            us.rows[0].is_african === false &&
            flagged.ok &&
            flagged.rows[0].n === 54,
          (r
            ? r.flagged +
              " of " +
              r.members +
              " matched members flagged" +
              (r.missed ? ", missed " + r.missed : "")
            : fmt(au)) +
            "; United States " +
            (us.ok && us.rows[0] ? String(us.rows[0].is_african) : fmt(us)) +
            "; flagged in all " +
            (flagged.ok ? flagged.rows[0].n : fmt(flagged)) +
            " (the Sahrawi Arab Democratic Republic has no world_countries row under ruling 142)",
        );
      });

      // 4. The derivation on the seeded data (1284, 1294, 1296): Engaging intro rows for the test
      // accounts' accepted introductions, nothing keyed on an RSVP, follow, save or heart, and a
      // re-run that writes or changes nothing.
      await inTransaction(client, async () => {
        await actAsSelf(client);
        const read = async () =>
          attempt(
            client,
            "select act_key, depth, source, member_side, member_stance::text as member_stance, counterparty_side, direction, bridging from public.mobilization_ledger where definition_version = 1 order by act_key",
          );
        const before = await read();
        const rerun = await attempt(
          client,
          "select private.derive_mobilization_v1(null::timestamptz, null::timestamptz) as n",
        );
        const after = await read();
        const rows = before.ok ? before.rows : [];
        const intros = rows.filter((r) => r.act_key.startsWith("intro:"));
        const forbidden = rows.filter((r) => /^(rsvp|follow|save|heart|reaction):/.test(r.act_key));
        const prefixes = [...new Set(rows.map((r) => r.act_key.split(":")[0]))];
        record(
          names.mobilDerive,
          before.ok &&
            intros.length > 0 &&
            intros.every(
              (r) =>
                r.depth === "engaging" &&
                r.source === "counterparty" &&
                r.member_side &&
                r.member_stance &&
                r.counterparty_side &&
                r.direction &&
                typeof r.bridging === "boolean",
            ) &&
            forbidden.length === 0 &&
            rerun.ok &&
            rerun.rows[0].n === 0 &&
            after.ok &&
            JSON.stringify(after.rows) === JSON.stringify(rows),
          (before.ok
            ? rows.length +
              " row(s) on the test accounts, prefixes " +
              JSON.stringify(prefixes) +
              ", intro rows " +
              intros.length
            : fmt(before)) +
            "; re-run wrote " +
            (rerun.ok ? rerun.rows[0].n : fmt(rerun)) +
            (after.ok && before.ok && JSON.stringify(after.rows) !== JSON.stringify(rows)
              ? "; rows changed"
              : ""),
        );
      });

      // 5. Side and stance as they were (1295): member-test lives in Accra, so continent with their
      // own stance; after a move to London the same moment reads diaspora, and a moment before the
      // move still reads continent, because the side is read from the history and not from the row.
      await inTransaction(client, async () => {
        const sideAt = async (at) => {
          await actAsSelf(client);
          const r = await attempt(
            client,
            "select private.member_side($1::uuid, " +
              at +
              ") as side, (private.profile_at($1::uuid, " +
              at +
              ")).stance::text as stance, (private.profile_at($1::uuid, " +
              at +
              ")).current_place as place",
            [member.id],
          );
          return r.ok ? r.rows[0] : r;
        };
        // The member's own stance and place come from profile_view, the one read projection: since
        // Fix PR 01 (212 to 216) authenticated holds no column select on members for any of the three.
        await actAs(client, member.id);
        const own = await attempt(client, "select public.profile_view() -> 'member' as m");
        const home = own.ok && own.rows[0] && own.rows[0].m ? own.rows[0].m : null;
        const accra = await sideAt("now()");
        await actAs(client, member.id);
        const move = await attempt(
          client,
          "update public.members set current_country = 'United Kingdom', current_place = 'London' where id = $1::uuid",
          [member.id],
        );
        const london = await sideAt("now()");
        const earlier = await sideAt("now() - interval '1 minute'");
        record(
          names.mobilSide,
          !!home &&
            home.current_place === "Accra" &&
            accra.side === "continent" &&
            accra.stance === home.stance &&
            move.ok &&
            london.side === "diaspora" &&
            london.stance === home.stance &&
            earlier.side === "continent",
          "home " +
            (home
              ? home.current_place + ", " + home.current_country + ", " + home.stance
              : fmt(own)) +
            "; now " +
            JSON.stringify(accra) +
            "; after the move " +
            JSON.stringify(london) +
            "; a minute before " +
            JSON.stringify(earlier),
        );
      });

      // 6. The four jobs with their schedules (1179), through the definer the migration grants
      // live_arms, because cron.job is supabase_admin's.
      await inTransaction(client, async () => {
        await actAsSelf(client);
        const jobs = await attempt(
          client,
          "select jobname, schedule, active from private.mobilization_jobs() order by jobname",
        );
        const want = {
          dna_mobilization_derive_hourly: "7 * * * *",
          dna_surface_events_partition_monthly: "10 2 20 * *",
          dna_surface_events_retention_daily: "35 3 * * *",
          dna_surface_events_rollup_hourly: "12 * * * *",
        };
        const have = jobs.ok
          ? Object.fromEntries(jobs.rows.map((j) => [j.jobname, j.schedule]))
          : {};
        record(
          names.mobilCron,
          jobs.ok &&
            jobs.rows.length === 4 &&
            Object.entries(want).every(([n, s]) => have[n] === s) &&
            jobs.rows.every((j) => j.active === true),
          jobs.ok
            ? jobs.rows
                .map((j) => j.jobname + " " + j.schedule + (j.active ? "" : " (inactive)"))
                .join("; ")
            : fmt(jobs),
        );
      });

      // 7. The catalogue (1299, 1300): the seven tables this migration made carry a real treatment,
      // and every table in public, partitions excepted, has a row.
      await inTransaction(client, async () => {
        await actAsSelf(client);
        const made = [
          "admin_catalogue",
          "member_profile_history",
          "mobilization_ledger",
          "partner_acts",
          "surface_event_kinds",
          "surface_event_rollups",
          "surface_events",
        ];
        const rows = await attempt(
          client,
          "select table_name, admin_treatment, dia_treatment from public.admin_catalogue where schema_name = 'public' and table_name = any($1::text[]) order by table_name",
          [made],
        );
        const missing = await attempt(
          client,
          "select string_agg(c.relname, ', ' order by c.relname) as t from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relispartition and not exists (select 1 from public.admin_catalogue a where a.schema_name = 'public' and a.table_name = c.relname)",
        );
        const treated = rows.ok ? rows.rows : [];
        record(
          names.mobilCatalogue,
          rows.ok &&
            treated.length === made.length &&
            treated.every((r) => r.admin_treatment !== "unreviewed") &&
            missing.ok &&
            missing.rows[0].t === null,
          (rows.ok
            ? treated
                .map((r) => r.table_name + ":" + r.admin_treatment + "/" + r.dia_treatment)
                .join(", ")
            : fmt(rows)) +
            "; without a row: " +
            (missing.ok ? missing.rows[0].t || "none" : fmt(missing)),
        );
      });
    }

    // ------------------------------------------------------------------------------------------
    // Brief 14 41-A (rulings 1330 to 1353, 1368 to 1373; 20261002130000 to 20261002130800; handoff
    // 41-A). Messenger's schema and server. Every arm opens with the same presence probe so that
    // before the apply the block reports UNPROVEN as a whole (G143, 228). The arms act as the two
    // test accounts and, for a third member, as the admin persona live_arms_admin_member() answers
    // (382), through the public.messenger_* wrappers a client calls; live_arms reads threads,
    // thread_members, messages and requests under policies confined to the test accounts. Each arm
    // is its own rolled-back transaction (269): the request, the thread, the block, the group and
    // the rate-limit hits are all gone before the next arm begins.
    // ------------------------------------------------------------------------------------------
    const MESSENGER_SEND =
      "public.messenger_send(uuid, uuid, text, public.message_kind, uuid, uuid, uuid[], jsonb)";
    const messengerPresent = async () => {
      await actAsSelf(client);
      const present = await client.query("select to_regprocedure($1) is not null as ok", [
        MESSENGER_SEND,
      ]);
      return !!present.rows[0] && present.rows[0].ok === true;
    };
    // A client id minted here, as the app mints it, so no arm has to leave the member's role for it.
    const uuid = () => crypto.randomUUID();
    const send = (thread, clientId, body) =>
      attempt(client, "select id, seq, body from public.messenger_send($1::uuid, $2::uuid, $3)", [
        thread,
        clientId,
        body,
      ]);
    /** owner-test asks member-test, member-test accepts; answers the thread id or the refusal. */
    const openPair = async () => {
      await actAs(client, owner.id);
      const req = await attempt(
        client,
        "select id, state from public.messenger_request_send($1::uuid, $2)",
        [member.id, "A request from the live arms"],
      );
      if (!req.ok) return { ok: false, step: "request", r: req };
      await actAs(client, member.id);
      const acc = await attempt(client, "select public.messenger_request_accept($1::uuid) as t", [
        req.rows[0].id,
      ]);
      if (!acc.ok) return { ok: false, step: "accept", r: acc };
      return { ok: true, thread: acc.rows[0].t, request: req.rows[0] };
    };
    if (!(await messengerPresent())) {
      for (const n of armsOf("messenger"))
        skip(
          n,
          "the 41-A migrations (20261002130000 to 20261002130800) are not on the project yet",
        );
    } else {
      // 1. The request and the accept (1330, 1341).
      await inTransaction(client, async () => {
        const pair = await openPair();
        let detail = pair.ok ? "accepted" : pair.step + " " + fmt(pair.r);
        let ok = false;
        if (pair.ok) {
          const first = await attempt(
            client,
            "select seq, body, author_name from public.messenger_messages_view where thread_id = $1::uuid order by seq",
            [pair.thread],
          );
          await actAs(client, owner.id);
          const again = await attempt(
            client,
            "select public.messenger_open_one_to_one($1::uuid) as t",
            [member.id],
          );
          await actAsSelf(client);
          const rows = await attempt(
            client,
            "select member_id, state from public.thread_members where thread_id = $1::uuid order by member_id",
            [pair.thread],
          );
          const active = rows.ok ? rows.rows.filter((r) => r.state === "active").length : -1;
          ok =
            pair.request.state === "pending" &&
            first.ok &&
            first.rows.length === 1 &&
            Number(first.rows[0].seq) === 1 &&
            first.rows[0].body === "A request from the live arms" &&
            first.rows[0].author_name === owner.name &&
            again.ok &&
            again.rows[0].t === pair.thread &&
            active === 2;
          detail +=
            "; seq 1 " +
            (first.ok ? JSON.stringify(first.rows[0]) : fmt(first)) +
            "; reopen " +
            (again.ok
              ? again.rows[0].t === pair.thread
                ? "same thread"
                : "other thread"
              : fmt(again)) +
            "; active rows " +
            active;
        }
        record(names.messenger, ok, detail);
      });

      // 2. A third member reads none of it (1116, 1349).
      await inTransaction(client, async () => {
        const third = await attempt(client, "select public.live_arms_admin_member() as id");
        const thirdId = third.ok && third.rows[0] ? third.rows[0].id : null;
        if (!thirdId) {
          skip(names.messengerThird, "live_arms_admin_member() answered no third member");
          return;
        }
        const pair = await openPair();
        if (!pair.ok) {
          record(names.messengerThird, false, pair.step + " " + fmt(pair.r));
          return;
        }
        await actAs(client, owner.id);
        await send(pair.thread, uuid(), "Only for the pair");
        await actAs(client, thirdId);
        const msgs = await attempt(
          client,
          "select count(*)::int as n from public.messages where thread_id = $1::uuid",
          [pair.thread],
        );
        const list = await attempt(
          client,
          "select count(*)::int as n from public.messenger_threads_view where thread_id = $1::uuid",
          [pair.thread],
        );
        await actAs(client, member.id);
        const own = await attempt(
          client,
          "select count(*)::int as n from public.messages where thread_id = $1::uuid",
          [pair.thread],
        );
        record(
          names.messengerThird,
          msgs.ok &&
            msgs.rows[0].n === 0 &&
            list.ok &&
            list.rows[0].n === 0 &&
            own.ok &&
            own.rows[0].n === 2,
          "third reads " +
            (msgs.ok ? msgs.rows[0].n : fmt(msgs)) +
            " messages and lists " +
            (list.ok ? list.rows[0].n : fmt(list)) +
            "; member-test reads " +
            (own.ok ? own.rows[0].n : fmt(own)),
        );
      });

      // 3. A block closes the pair's thread both ways (1349).
      await inTransaction(client, async () => {
        const pair = await openPair();
        if (!pair.ok) {
          record(names.messengerBlocked, false, pair.step + " " + fmt(pair.r));
          return;
        }
        await actAs(client, owner.id);
        await send(pair.thread, uuid(), "Before the block");
        await actAs(client, member.id);
        const before = await attempt(
          client,
          "select count(*)::int as n from public.messages where thread_id = $1::uuid",
          [pair.thread],
        );
        const block = await attempt(
          client,
          "insert into public.member_blocks (blocker_id, blocked_id) values ($1::uuid, $2::uuid)",
          [member.id, owner.id],
        );
        await actAs(client, owner.id);
        const after = await attempt(
          client,
          "select count(*)::int as n from public.messages where thread_id = $1::uuid",
          [pair.thread],
        );
        const refused = await send(pair.thread, uuid(), "After the block");
        record(
          names.messengerBlocked,
          before.ok &&
            before.rows[0].n === 2 &&
            block.ok &&
            after.ok &&
            after.rows[0].n === 0 &&
            !refused.ok &&
            refused.message === "blocked",
          "before " +
            (before.ok ? before.rows[0].n : fmt(before)) +
            "; block " +
            fmt(block) +
            "; after " +
            (after.ok ? after.rows[0].n : fmt(after)) +
            "; send " +
            fmt(refused),
        );
      });

      // 4. History off: the late joiner sees nothing before joined_seq (1342).
      await inTransaction(client, async () => {
        const third = await attempt(client, "select public.live_arms_admin_member() as id");
        const thirdId = third.ok && third.rows[0] ? third.rows[0].id : null;
        if (!thirdId) {
          skip(names.messengerHistory, "live_arms_admin_member() answered no third member");
          return;
        }
        await actAs(client, owner.id);
        const group = await attempt(
          client,
          "select public.messenger_thread_create_group($1, array[$2::uuid, $3::uuid]) as t",
          ["Live arms group", member.id, thirdId],
        );
        if (!group.ok) {
          record(names.messengerHistory, false, "create " + fmt(group));
          return;
        }
        const g = group.rows[0].t;
        await actAs(client, member.id);
        const acceptEarly = await attempt(
          client,
          "select public.messenger_thread_invite_accept($1::uuid)",
          [g],
        );
        await actAs(client, owner.id);
        const early = await send(g, uuid(), "Before the third joined");
        await actAs(client, thirdId);
        const invited = await attempt(
          client,
          "select invited from public.messenger_threads_view where thread_id = $1::uuid",
          [g],
        );
        const acceptLate = await attempt(
          client,
          "select public.messenger_thread_invite_accept($1::uuid)",
          [g],
        );
        const none = await attempt(
          client,
          "select count(*)::int as n from public.messenger_messages_view where thread_id = $1::uuid",
          [g],
        );
        await actAs(client, owner.id);
        const late = await send(g, uuid(), "After the third joined");
        await actAs(client, thirdId);
        const one = await attempt(
          client,
          "select seq from public.messenger_messages_view where thread_id = $1::uuid order by seq",
          [g],
        );
        await actAs(client, member.id);
        const both = await attempt(
          client,
          "select count(*)::int as n from public.messenger_messages_view where thread_id = $1::uuid",
          [g],
        );
        record(
          names.messengerHistory,
          acceptEarly.ok &&
            early.ok &&
            invited.ok &&
            invited.rows.length === 1 &&
            invited.rows[0].invited === true &&
            acceptLate.ok &&
            none.ok &&
            none.rows[0].n === 0 &&
            late.ok &&
            one.ok &&
            one.rows.length === 1 &&
            Number(one.rows[0].seq) === 2 &&
            both.ok &&
            both.rows[0].n === 2,
          "invited " +
            (invited.ok ? JSON.stringify(invited.rows) : fmt(invited)) +
            "; late joiner before " +
            (none.ok ? none.rows[0].n : fmt(none)) +
            ", after " +
            (one.ok ? JSON.stringify(one.rows.map((r) => Number(r.seq))) : fmt(one)) +
            "; early member " +
            (both.ok ? both.rows[0].n : fmt(both)),
        );
      });

      // 5. Idempotent send, and dense seq (1351).
      await inTransaction(client, async () => {
        const pair = await openPair();
        if (!pair.ok) {
          record(names.messengerIdempotent, false, pair.step + " " + fmt(pair.r));
          record(names.messengerSeq, false, pair.step + " " + fmt(pair.r));
          return;
        }
        await actAs(client, owner.id);
        const cid = uuid();
        const first = await send(pair.thread, cid, "First body");
        const again = await send(pair.thread, cid, "A replay with another body");
        const next = await send(pair.thread, uuid(), "Second body");
        record(
          names.messengerIdempotent,
          first.ok &&
            again.ok &&
            first.rows[0].id === again.rows[0].id &&
            again.rows[0].body === "First body",
          "first " +
            fmt(first) +
            "; replay " +
            (again.ok ? JSON.stringify(again.rows[0]) : fmt(again)),
        );
        record(
          names.messengerSeq,
          first.ok && next.ok && Number(first.rows[0].seq) === 2 && Number(next.rows[0].seq) === 3,
          "seq " +
            (first.ok ? first.rows[0].seq : fmt(first)) +
            " then " +
            (next.ok ? next.rows[0].seq : fmt(next)),
        );
      });

      // 6. The cap (1332). The refusal needs 256 active members and the project holds far fewer, so
      // it is unproven here (228) and was exercised on a local replay of the chain; what the
      // project can prove is the trigger's presence and shape.
      await inTransaction(client, async () => {
        await actAsSelf(client);
        const members = await attempt(client, "select count(*)::int as n from public.members");
        const n = members.ok ? members.rows[0].n : null;
        skip(
          names.messengerCap,
          "live_arms reads " +
            (n === null ? "an unknown number of" : n) +
            " member rows (its policy admits the two test accounts) and the refusal needs 257 distinct members a rolled-back fixture cannot mint (241, 269); exercised on a local replay of the chain instead",
        );
        const trig = await attempt(
          client,
          "select t.tgname, t.tgtype, p.proname, position('256' in p.prosrc) > 0 as names_cap from pg_trigger t join pg_proc p on p.oid = t.tgfoid where t.tgrelid = 'public.thread_members'::regclass and t.tgname = 'on_thread_members_cap' and not t.tgisinternal",
        );
        const row = trig.ok && trig.rows[0];
        // tgtype bit 1 is row, bit 2 is before, bit 4 is insert, bit 16 is update.
        const type = row ? Number(row.tgtype) : 0;
        record(
          names.messengerCapTrigger,
          !!row &&
            (type & 1) === 1 &&
            (type & 2) === 2 &&
            (type & 4) === 4 &&
            (type & 16) === 16 &&
            row.proname === "thread_members_cap" &&
            row.names_cap === true,
          row ? row.tgname + " type " + type + " -> " + row.proname : fmt(trig),
        );
      });

      // 7. Ticks (1345).
      await inTransaction(client, async () => {
        const pair = await openPair();
        if (!pair.ok) {
          record(names.messengerTick, false, pair.step + " " + fmt(pair.r));
          return;
        }
        await actAs(client, owner.id);
        const sent = await send(pair.thread, uuid(), "Tick me");
        const tick = (label) =>
          attempt(
            client,
            "select tick from public.messenger_messages_view where message_id = $1::uuid",
            [sent.ok ? sent.rows[0].id : null],
          ).then((r) => ({ label, v: r.ok && r.rows[0] ? Number(r.rows[0].tick) : fmt(r) }));
        await actAs(client, owner.id);
        const stored = await tick("stored");
        await actAs(client, member.id);
        await attempt(client, "select public.messenger_read_to($1::uuid, $2::bigint)", [
          pair.thread,
          2,
        ]);
        await actAs(client, owner.id);
        const readOff = await tick("read with receipts off");
        await attempt(client, "select public.messenger_settings_set(true, null, null)");
        const oneOn = await tick("only the author on");
        await actAs(client, member.id);
        await attempt(client, "select public.messenger_settings_set(true, null, null)");
        await actAs(client, owner.id);
        const bothOn = await tick("both on");
        record(
          names.messengerTick,
          sent.ok && stored.v === 1 && readOff.v === 2 && oneOn.v === 2 && bothOn.v === 3,
          [stored, readOff, oneOn, bothOn].map((t) => t.label + " " + t.v).join("; "),
        );
      });

      // 8. Search inside scope (1338, 1347).
      await inTransaction(client, async () => {
        const third = await attempt(client, "select public.live_arms_admin_member() as id");
        const thirdId = third.ok && third.rows[0] ? third.rows[0].id : null;
        if (!thirdId) {
          skip(names.messengerSearch, "live_arms_admin_member() answered no third member");
          return;
        }
        await actAs(client, owner.id);
        const group = await attempt(
          client,
          "select public.messenger_thread_create_group($1, array[$2::uuid, $3::uuid]) as t",
          ["Search group", member.id, thirdId],
        );
        if (!group.ok) {
          record(names.messengerSearch, false, "create " + fmt(group));
          return;
        }
        const g = group.rows[0].t;
        await actAs(client, member.id);
        await attempt(client, "select public.messenger_thread_invite_accept($1::uuid)", [g]);
        await actAs(client, owner.id);
        await send(g, uuid(), "The quokka word appears here");
        await actAs(client, member.id);
        const found = await attempt(
          client,
          "select thread_id, seq, headline from public.messenger_search($1)",
          ["quokka"],
        );
        await actAs(client, thirdId);
        const outside = await attempt(
          client,
          "select count(*)::int as n from public.messenger_search($1)",
          ["quokka"],
        );
        await actAs(client, member.id);
        await attempt(client, "select public.messenger_thread_leave($1::uuid)", [g]);
        const gone = await attempt(
          client,
          "select count(*)::int as n from public.messenger_search($1)",
          ["quokka"],
        );
        record(
          names.messengerSearch,
          found.ok &&
            found.rows.length === 1 &&
            found.rows[0].thread_id === g &&
            Number(found.rows[0].seq) === 1 &&
            outside.ok &&
            outside.rows[0].n === 0 &&
            gone.ok &&
            gone.rows[0].n === 0,
          "member " +
            (found.ok
              ? JSON.stringify(found.rows.map((r) => [Number(r.seq), r.headline]))
              : fmt(found)) +
            "; invited third " +
            (outside.ok ? outside.rows[0].n : fmt(outside)) +
            "; after leaving " +
            (gone.ok ? gone.rows[0].n : fmt(gone)),
        );
      });

      // 9. The ceiling (1353): thirty answered, the 31st refused, inside one rolled-back minute.
      await inTransaction(client, async () => {
        await actAs(client, member.id);
        const answers = [];
        for (let i = 0; i < 31; i++) {
          const r = await attempt(client, "select public.rate_limit_check('message_send') as ok");
          answers.push(r.ok ? r.rows[0].ok : fmt(r));
        }
        const first30 = answers.slice(0, 30).every((a) => a === true);
        record(
          names.messengerRate,
          first30 && answers[30] === false,
          "first thirty " +
            (first30 ? "answered" : JSON.stringify(answers.slice(0, 30))) +
            "; 31st " +
            answers[30],
        );
      });

      // 10. The publication stays empty (1351).
      await inTransaction(client, async () => {
        await actAsSelf(client);
        const pub = await attempt(
          client,
          "select count(*)::int as n from pg_publication_tables where pubname = 'supabase_realtime'",
        );
        record(
          names.messengerPublication,
          pub.ok && pub.rows[0].n === 0,
          pub.ok ? "tables " + pub.rows[0].n : fmt(pub),
        );
      });

      // 11. The realtime.messages policy's predicate, and the insert refusal (1351). realtime.messages
      // is partitioned by day on the project, and a row for a day with no partition is refused by
      // tuple routing (23514) before row security is consulted, so the refusal is proven two ways:
      // the catalog holds no insert policy for a client role, and the insert itself does not land,
      // whichever of the two refusals answers first.
      await inTransaction(client, async () => {
        await actAsSelf(client);
        const policy = await attempt(
          client,
          "select qual from pg_policies where schemaname = 'realtime' and tablename = 'messages' and policyname = 'messenger_topics_select'",
        );
        const writers = await attempt(
          client,
          "select count(*)::int as n from pg_policies where schemaname = 'realtime' and tablename = 'messages' and cmd in ('INSERT', 'ALL') and (roles::text[] && array['anon', 'authenticated', 'public'])",
        );
        await actAs(client, owner.id);
        const self = await attempt(client, "select private.messenger_topic_allowed($1) as ok", [
          "inbox:" + owner.id,
        ]);
        const other = await attempt(client, "select private.messenger_topic_allowed($1) as ok", [
          "inbox:" + member.id,
        ]);
        const insert = await attempt(
          client,
          "insert into realtime.messages (topic, extension, payload, event, private) values ($1, 'broadcast', '{}'::jsonb, 'x', true)",
          ["inbox:" + owner.id],
        );
        record(
          names.messengerRealtime,
          policy.ok &&
            policy.rows.length === 1 &&
            /messenger_topic_allowed/.test(policy.rows[0].qual) &&
            self.ok &&
            self.rows[0].ok === true &&
            other.ok &&
            other.rows[0].ok === false &&
            writers.ok &&
            writers.rows[0].n === 0 &&
            !insert.ok &&
            (insert.code === "42501" || insert.code === "23514"),
          "policy " +
            (policy.ok ? policy.rows.length + " row(s)" : fmt(policy)) +
            "; client insert policies " +
            (writers.ok ? writers.rows[0].n : fmt(writers)) +
            "; self " +
            (self.ok ? self.rows[0].ok : fmt(self)) +
            "; other " +
            (other.ok ? other.rows[0].ok : fmt(other)) +
            "; insert " +
            fmt(insert),
        );
      });

      // 12. The four vocabularies (1331, 1348, 1349, 1370).
      await inTransaction(client, async () => {
        await actAs(client, member.id);
        const v = await attempt(client, "select public.vocabularies() as v");
        const j = v.ok ? v.rows[0].v : null;
        const len = (k) => (j && Array.isArray(j[k]) ? j[k].length : -1);
        const values = (k) => (j && Array.isArray(j[k]) ? j[k].map((x) => x.value) : []);
        record(
          names.messengerVocab,
          len("thread_kinds") === 7 &&
            len("message_mute_durations") === 3 &&
            len("message_report_reasons") === 6 &&
            len("message_reaction_kinds") === 5 &&
            JSON.stringify(values("message_reaction_kinds")) ===
              JSON.stringify(["agree", "thanks", "noted", "well_done", "sorry_to_hear"]),
          v.ok
            ? "thread_kinds " +
                len("thread_kinds") +
                ", mute " +
                len("message_mute_durations") +
                ", reasons " +
                len("message_report_reasons") +
                ", reactions " +
                values("message_reaction_kinds").join(" ")
            : fmt(v),
        );
      });

      // 13. No client write grant on any new table, and every one in the catalogue (1116, 1299).
      await inTransaction(client, async () => {
        await actAsSelf(client);
        const made = [
          "threads",
          "thread_members",
          "messages",
          "message_reactions",
          "message_mentions",
          "message_requests",
          "message_reports",
          "message_view_audit",
          "member_messaging_settings",
          "messenger_dia_dismissals",
          "thread_kinds",
          "message_mute_durations",
          "message_report_reasons",
          "message_reaction_kinds",
        ];
        const grants = await attempt(
          client,
          "select string_agg(table_name || ':' || grantee || ':' || privilege_type, ', ') as g from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon', 'authenticated') and privilege_type in ('INSERT', 'UPDATE', 'DELETE') and table_name = any($1::text[])",
          [made],
        );
        const rows = await attempt(
          client,
          "select count(*)::int as n from public.admin_catalogue where schema_name = 'public' and table_name = any($1::text[])",
          [made],
        );
        record(
          names.messengerGrants,
          grants.ok && grants.rows[0].g === null && rows.ok && rows.rows[0].n === made.length,
          "write grants " +
            (grants.ok ? grants.rows[0].g || "none" : fmt(grants)) +
            "; catalogue rows " +
            (rows.ok ? rows.rows[0].n + "/" + made.length : fmt(rows)),
        );
      });
    }
  } finally {
    await client.end().catch(() => {});
  }
}

module.exports = { runLiveDbArms, clientConfig };
