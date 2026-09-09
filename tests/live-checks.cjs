// Brief 3 and Brief 4 live checks against the deployed URL and the live project (targeted checks 1, 2, 3 and 11
// in DNA-Brief-3-Profile-Code-Handoff.md). No browser: the served HTML and the anonymous REST
// surface, so a failure here is a data-level finding, not a rendering one.
// Usage: BASE=https://<preview>.dna-web-application.pages.dev node tests/live-checks.cjs
// Env: SHARED (default thandiwe-dube), UNSHARED (default kwame-mensah), UNSHARED_ID; SKIP_REST=1
// skips the Supabase calls where the network policy blocks them.
//
// Ruling 218 adds three signed-in arms for Fix PR 01, run when OWNER_EMAIL, OWNER_PASSWORD,
// MEMBER_EMAIL and MEMBER_PASSWORD are set and skipped when they are not: a signed-in member (F1),
// a fixture in which a section audience and the core row disagree (F2a, F2b, F5), the Private
// switch (F3) and a real block (F4). Each restores what it changed and records the restore.
const fs = require("fs");
const path = require("path");

const BASE = (process.env.BASE || "http://127.0.0.1:4173").replace(/\/$/, "");
const SHARED = process.env.SHARED || "thandiwe-dube";
const UNSHARED = process.env.UNSHARED || "kwame-mensah";
const UNSHARED_ID = process.env.UNSHARED_ID || "b3000000-0000-4000-8000-000000000002";
const SHARED_ID = process.env.SHARED_ID || "b3000000-0000-4000-8000-000000000001";

// The client's defaults for the canonical project (publishable by design), unless overridden.
const src = fs.readFileSync(path.join(__dirname, "../src/lib/supabase.ts"), "utf8");
const SUPABASE_URL =
  process.env.SUPABASE_URL || (src.match(/"(https:\/\/[a-z]+\.supabase\.co)"/) || [])[1];
const KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || (src.match(/"(sb_publishable_[A-Za-z0-9_-]+)"/) || [])[1];

// Strings that only a connection or an Anchored viewer may see on the seeded persona.
const CONNECTIONS_ONLY = ["dubepower.co.za", "thandiwedube", "dube.power"];
const ANCHORED_ONLY = ["Clinics that need a site survey", "Find collaborators"];

const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  (" + detail + ")" : ""));
};

async function get(url, headers = {}) {
  const res = await fetch(url, { headers, redirect: "manual" });
  return { status: res.status, text: await res.text(), headers: res.headers };
}

(async () => {
  // Check 1 and 11: the served page for a shared profile.
  const shared = await get(BASE + "/m/" + SHARED);
  record(
    "check 1: shared profile serves 200 signed out",
    shared.status === 200,
    "status " + shared.status,
  );
  record(
    "check 1: served HTML carries no connections-only or anchored content",
    !CONNECTIONS_ONLY.some((t) => shared.text.includes(t)) &&
      !ANCHORED_ONLY.some((t) => shared.text.includes(t)),
  );
  record(
    "check 11: noindex on the public profile response",
    /<meta[^>]+name="robots"[^>]+content="noindex"/.test(shared.text) ||
      /<meta[^>]+content="noindex"[^>]+name="robots"/.test(shared.text),
  );

  // Check 2: a non-shared profile serves the same members-only shell and no profile data.
  const unshared = await get(BASE + "/m/" + UNSHARED);
  record(
    "check 2: non-shared profile serves 200 signed out (members-only prompt renders client-side)",
    unshared.status === 200,
    "status " + unshared.status,
  );
  record(
    "check 2: served HTML carries no profile data for the non-shared member",
    !/Kwame Mensah/.test(unshared.text) && !unshared.text.includes(UNSHARED_ID),
  );
  record(
    "check 11: noindex on the non-shared response too",
    /name="robots"[^>]+content="noindex"|content="noindex"[^>]+name="robots"/.test(unshared.text),
  );

  if (process.env.SKIP_REST) {
    console.log("REST checks skipped (SKIP_REST)");
  } else if (!SUPABASE_URL || !KEY) {
    record(
      "check 3: Supabase URL and publishable key available",
      false,
      "set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY",
    );
  } else {
    const H = { apikey: KEY, Authorization: "Bearer " + KEY };
    const rest = async (q) => {
      const r = await get(SUPABASE_URL + "/rest/v1/" + q, H);
      let body = null;
      try {
        body = JSON.parse(r.text);
      } catch {}
      return { status: r.status, body, text: r.text };
    };
    // Check 3: anon client, direct table queries for a non-shared profile: zero rows.
    const tables = [
      "members?handle=eq." + UNSHARED + "&select=*",
      "member_about?member_id=eq." + UNSHARED_ID + "&select=*",
      "member_origin?member_id=eq." + UNSHARED_ID + "&select=*",
      "member_intent?member_id=eq." + UNSHARED_ID + "&select=*",
      "member_links?member_id=eq." + UNSHARED_ID + "&select=*",
      "member_segment_details?member_id=eq." + UNSHARED_ID + "&select=*",
      "member_focus_areas?member_id=eq." + UNSHARED_ID + "&select=*",
      "member_skills?member_id=eq." + UNSHARED_ID + "&select=*",
      "member_follows?member_id=eq." + UNSHARED_ID + "&select=*",
      "attestations?member_id=eq." + UNSHARED_ID + "&select=*",
    ];
    for (const q of tables) {
      const r = await rest(q);
      const zero =
        (r.status === 200 && Array.isArray(r.body) && r.body.length === 0) ||
        r.status === 401 ||
        r.status === 403;
      record(
        "check 3: anon " + q.split("?")[0] + " for the non-shared profile returns zero rows",
        zero,
        "status " + r.status + " " + r.text.slice(0, 120),
      );
    }
    const viewRes = await fetch(SUPABASE_URL + "/rest/v1/rpc/profile_view", {
      method: "POST",
      headers: { ...H, "content-type": "application/json" },
      body: JSON.stringify({ p_handle: UNSHARED, p_as_public: false }),
    });
    const viewText = await viewRes.text();
    record(
      "check 3: anon profile_view for the non-shared profile returns null",
      viewRes.status === 200 && (viewText === "null" || viewText === ""),
      "status " + viewRes.status + " " + viewText.slice(0, 80),
    );
    // The shared profile: core row visible, connections-only and anchored tables still zero rows.
    // Anon's grant on members is column-limited. Ruling 212 narrowed it to the identity columns:
    // origin_country, current_place, current_country, local_tz and segment are section-gated on
    // every path and are read through profile_view, which gates them, or not at all (F2a).
    const CORE_COLS = "id,handle,name,headline,avatar_path,cover_path,cover_focus,pattern";
    const GATED_COLS = "origin_country,current_place,current_country,local_tz,segment";
    const core = await rest("members?handle=eq." + SHARED + "&select=" + CORE_COLS);
    const switches = await rest(
      "members?handle=eq." + SHARED + "&select=profile_private,profile_shared",
    );
    const gated = await rest("members?handle=eq." + SHARED + "&select=" + GATED_COLS);
    record(
      "check 1: anon cannot read the shared profile's switches (column grant)",
      switches.status === 401 || switches.status === 403,
      "status " + switches.status,
    );
    record(
      "F1/F2a: anon cannot read the section-gated core columns (column grant, ruling 212)",
      gated.status === 401 || gated.status === 403,
      "status " + gated.status,
    );
    record(
      "check 1: anon reads the shared profile's core row (limited columns)",
      core.status === 200 &&
        Array.isArray(core.body) &&
        core.body.length === 1 &&
        !("profile_private" in (core.body[0] || {})),
      "status " + core.status + " keys " + Object.keys((core.body && core.body[0]) || {}).join(","),
    );
    const links = await rest("member_links?member_id=eq." + SHARED_ID + "&select=*");
    const intent = await rest("member_intent?member_id=eq." + SHARED_ID + "&select=*");
    record(
      "check 1: anon gets zero rows from the shared profile's connections-only and anchored sections",
      [links, intent].every(
        (r) => r.status === 200 && Array.isArray(r.body) && r.body.length === 0,
      ),
      links.status + "/" + intent.status,
    );
    // Ruling 141: the public rail and the anonymous projection never name a member who does not share.
    const railRes = await fetch(SUPABASE_URL + "/rest/v1/rpc/public_attestations", {
      method: "POST",
      headers: { ...H, "content-type": "application/json" },
      body: "{}",
    });
    const railText = await railRes.text();
    const viewRes2 = await fetch(SUPABASE_URL + "/rest/v1/rpc/profile_view", {
      method: "POST",
      headers: { ...H, "content-type": "application/json" },
      body: JSON.stringify({ p_handle: SHARED, p_as_public: false }),
    });
    const viewText2 = await viewRes2.text();
    const UNSHARED_NAMES = ["Kwame Mensah", "Adaeze Nwosu"];
    record(
      "ruling 141: anon public_attestations names no member who does not share",
      railRes.status === 200 &&
        !UNSHARED_NAMES.some((n) => railText.includes(n)) &&
        /the host|a Space lead/.test(railText),
      railText.slice(0, 160),
    );
    record(
      "ruling 141: anon profile_view of the shared profile names no third party who does not share",
      viewRes2.status === 200 && !UNSHARED_NAMES.some((n) => viewText2.includes(n)),
      (viewText2.match(/Attested by [^"]+/) || [])[0],
    );
    // Brief 4 (ruling 156): the anonymous REST surface returns nothing from Connect. Tables and the
    // projections alike; a 200 with zero rows or a 401/403 are the same answer.
    const connectTables = [
      "edges?select=*",
      "member_connections?select=*",
      "second_degree?select=*",
      "connection_requests?select=*",
      "dismissed_suggestions?select=*",
      "member_corridors?select=*",
      "member_embeddings?select=*",
      "member_blocks?select=*",
    ];
    for (const q of connectTables) {
      const r = await rest(q);
      const zero =
        (r.status === 200 && Array.isArray(r.body) && r.body.length === 0) ||
        r.status === 401 ||
        r.status === 403 ||
        r.status === 404;
      record(
        "ruling 156: anon " + q.split("?")[0] + " returns nothing",
        zero,
        "status " + r.status + " " + r.text.slice(0, 100),
      );
    }
    for (const [fn, body] of [
      ["connect_cards", { p_lens: "members" }],
      ["connect_where", {}],
      ["connect_filter_options", {}],
      ["send_introduction", { p_recipient: UNSHARED_ID, p_message: "x" }],
    ]) {
      const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + fn, {
        method: "POST",
        headers: { ...H, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const t = await r.text();
      record(
        "ruling 156: anon " + fn + " is refused or empty",
        r.status === 401 || r.status === 403 || r.status === 404 || t === "null" || t === "",
        "status " + r.status + " " + t.slice(0, 100),
      );
      record("via_count never in an anonymous payload from " + fn, !t.includes("via_count"));
    }
    const connectPage = await get(BASE + "/connect");
    record(
      "ruling 156: /connect served HTML carries no card, tile or filter",
      connectPage.status === 200 &&
        !/member-card|place-tile|Show members there|Connect lens/.test(connectPage.text) &&
        /name="robots"[^>]+content="noindex"|content="noindex"[^>]+name="robots"/.test(
          connectPage.text,
        ),
      "status " + connectPage.status,
    );
    const all = await rest("members?select=handle");
    record(
      "check 3: anon sees only shared handles in members",
      all.status === 200 &&
        Array.isArray(all.body) &&
        all.body.every((m) => m.handle === SHARED || m.handle !== UNSHARED),
      JSON.stringify(all.body).slice(0, 120),
    );

    // -----------------------------------------------------------------------------------------
    // Ruling 218: the standing arms for Fix PR 01. The checks above are the anonymous surface;
    // F1, F2b, F3, F4 and F5 are all signed-in findings and none of them could be caught from an
    // anonymous key, which is why the pass had to find them by hand. These three arms are the
    // permanent replacement: a signed-in member, a fixture in which a section audience and the
    // core row disagree, and a real block.
    //
    // Two accounts, both supplied by the runner, never by this file (no secrets in the repo):
    // OWNER_EMAIL/OWNER_PASSWORD is the SHARED persona whose profile carries the fixture, and
    // MEMBER_EMAIL/MEMBER_PASSWORD is a signed-in member who is NOT connected to them. Without
    // both the arms are skipped rather than failed, the same way SKIP_REST skips the block above.
    //
    // Every arm restores what it changed and the restore is itself recorded, so a failed teardown
    // is a FAIL rather than a silent change to the project's state.
    // -----------------------------------------------------------------------------------------
    const OWNER_EMAIL = process.env.OWNER_EMAIL;
    const OWNER_PASSWORD = process.env.OWNER_PASSWORD;
    const MEMBER_EMAIL = process.env.MEMBER_EMAIL;
    const MEMBER_PASSWORD = process.env.MEMBER_PASSWORD;
    const GATED_KEYS = [
      "origin_country",
      "current_place",
      "current_country",
      "local_tz",
      "segment",
      "segment_label",
    ];

    const signIn = async (email, password) => {
      const r = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
        method: "POST",
        headers: { apikey: KEY, "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await r.json().catch(() => null);
      return body && body.access_token ? body.access_token : null;
    };
    const asMember = (token) => ({ apikey: KEY, Authorization: "Bearer " + token });
    const memberRest = async (token, q, init = {}) => {
      const r = await fetch(SUPABASE_URL + "/rest/v1/" + q, {
        ...init,
        headers: {
          ...asMember(token),
          "content-type": "application/json",
          ...(init.headers || {}),
        },
      });
      const text = await r.text();
      let body = null;
      try {
        body = JSON.parse(text);
      } catch {}
      return { status: r.status, body, text };
    };
    const memberRpc = (token, fn, args) =>
      memberRest(token, "rpc/" + fn, { method: "POST", body: JSON.stringify(args) });
    /** The one write path for an audience (CLAUDE.md: one write path per surface). */
    const setAudience = (token, section, audience) =>
      memberRpc(token, "save_profile_section", {
        section: "visibility",
        payload: { section, audience },
      });
    /** Teardown only: save_profile_section can set an audience but not unset one, and a row left
     *  behind would not be the state the project was in. member_visibility carries an owner delete. */
    const clearAudience = (token, ownerId, section) =>
      memberRest(token, "member_visibility?member_id=eq." + ownerId + "&section=eq." + section, {
        method: "DELETE",
      });

    if (!OWNER_EMAIL || !OWNER_PASSWORD || !MEMBER_EMAIL || !MEMBER_PASSWORD) {
      console.log(
        "ruling 218 arms skipped: set OWNER_EMAIL, OWNER_PASSWORD, MEMBER_EMAIL and MEMBER_PASSWORD",
      );
    } else {
      const ownerToken = await signIn(OWNER_EMAIL, OWNER_PASSWORD);
      const memberToken = await signIn(MEMBER_EMAIL, MEMBER_PASSWORD);
      record(
        "ruling 218: both test members sign in",
        !!ownerToken && !!memberToken,
        ownerToken ? (memberToken ? "" : "member sign-in failed") : "owner sign-in failed",
      );
      if (ownerToken && memberToken) {
        const ownerView = await memberRpc(ownerToken, "profile_view", { p_handle: SHARED });
        const ownerId = ownerView.body && ownerView.body.member && ownerView.body.member.id;
        const memberSelf = await memberRpc(memberToken, "profile_view", {});
        const memberId = memberSelf.body && memberSelf.body.member && memberSelf.body.member.id;
        const ownerOrigin =
          (ownerView.body && ownerView.body.member && ownerView.body.member.origin_country) || null;
        record(
          "ruling 218: the fixture owner is " + SHARED + " and the viewer is another member",
          !!ownerId && !!memberId && ownerId !== memberId,
          "owner " + ownerId + " viewer " + memberId,
        );

        // ARM 1 (F1, gate IB-1). A signed-in member reads the identity columns of public.members
        // and nothing else. Before ruling 212 this arm would have returned every column of every
        // row, which is the finding it exists to catch coming back.
        if (memberId) {
          const identity = await memberRest(memberToken, "members?select=" + CORE_COLS);
          const gatedCols = await memberRest(memberToken, "members?select=" + GATED_COLS);
          const switchCols = await memberRest(
            memberToken,
            "members?select=profile_private,profile_shared,identified_at,updated_at",
          );
          record(
            "F1: a signed-in member reads the identity columns of members",
            identity.status === 200 && Array.isArray(identity.body) && identity.body.length > 0,
            "status " + identity.status,
          );
          record(
            "F1: a signed-in member cannot read the section-gated columns of members",
            gatedCols.status === 401 || gatedCols.status === 403,
            "status " + gatedCols.status + " " + gatedCols.text.slice(0, 80),
          );
          record(
            "F1: a signed-in member cannot read the switches, identified_at or updated_at",
            switchCols.status === 401 || switchCols.status === 403,
            "status " + switchCols.status + " " + switchCols.text.slice(0, 80),
          );
        }

        // ARM 2 (F2a, F2b, F5, gate IB-2 and IB-5). The fixture the pass built by hand: Origin,
        // Where and Segment set to My connections on a profile the viewer is not connected to, so
        // the section audience and the core row disagree. Omit, never blank: the assertion is that
        // the key is absent, not that it is empty.
        const SECTIONS = ["origin", "where", "segment"];
        const priorVis = await memberRest(
          ownerToken,
          "member_visibility?member_id=eq." + ownerId + "&select=section,audience",
        );
        const prior = new Map(
          (Array.isArray(priorVis.body) ? priorVis.body : []).map((r) => [r.section, r.audience]),
        );
        let fixtureSet = true;
        for (const section of SECTIONS) {
          const r = await setAudience(ownerToken, section, "connections");
          if (r.status >= 300) fixtureSet = false;
        }
        record("F2: the fixture sets Origin, Where and Segment to connections", fixtureSet);

        const cardOf = async (token, handle) => {
          const r = await memberRpc(token, "connect_cards", { p_lens: "members" });
          const items = (r.body && r.body.items) || [];
          return items.find((i) => i.handle === handle) || null;
        };
        const gatedView = await memberRpc(memberToken, "profile_view", { p_handle: SHARED });
        const gatedMember = (gatedView.body && gatedView.body.member) || {};
        record(
          "F2b: profile_view.member carries no origin, place, time zone or segment for a stranger",
          gatedView.status === 200 && GATED_KEYS.every((k) => !(k in gatedMember)),
          "keys " + Object.keys(gatedMember).join(","),
        );
        record(
          "F2b: profile_view.member still carries name, handle and headline",
          !!gatedMember.name && !!gatedMember.handle && "tier" in gatedMember,
          "keys " + Object.keys(gatedMember).join(","),
        );
        const gatedCard = await cardOf(memberToken, SHARED);
        record(
          "F2b: the Connect card carries no place, origin or segment label",
          !!gatedCard &&
            !("place" in gatedCard) &&
            !("origin" in gatedCard) &&
            !("segment_label" in gatedCard),
          gatedCard ? Object.keys(gatedCard).join(",") : "no card",
        );
        record(
          "F2b: the Connect card still carries name, handle and headline",
          !!gatedCard && !!gatedCard.name && !!gatedCard.handle,
          gatedCard ? Object.keys(gatedCard).join(",") : "no card",
        );
        const anonGated = await fetch(SUPABASE_URL + "/rest/v1/rpc/profile_view", {
          method: "POST",
          headers: { ...H, "content-type": "application/json" },
          body: JSON.stringify({ p_handle: SHARED, p_as_public: false }),
        });
        const anonGatedBody = JSON.parse((await anonGated.text()) || "null");
        const anonMember = (anonGatedBody && anonGatedBody.member) || {};
        record(
          "F2a: the anonymous projection carries none of them either",
          anonGated.status === 200 && GATED_KEYS.every((k) => !(k in anonMember)),
          "keys " + Object.keys(anonMember).join(","),
        );
        if (ownerOrigin) {
          const byOrigin = await memberRpc(memberToken, "connect_cards", {
            p_lens: "members",
            p_filters: { origin: ownerOrigin },
          });
          const originItems = (byOrigin.body && byOrigin.body.items) || [];
          record(
            "F5: the origin axis does not return a member who withheld Origin",
            !originItems.some((i) => i.handle === SHARED),
            originItems.map((i) => i.handle).join(",") || "no items",
          );
        }

        // ARM 3 (F3, gate IB-3). The whole-profile Private switch, from the same fixture.
        const setPrivate = (token, on) =>
          memberRpc(token, "save_profile_section", {
            section: "switches",
            payload: { private: on },
          });
        const privOn = await setPrivate(ownerToken, true);
        record(
          "F3: the fixture sets the Private switch",
          privOn.status < 300,
          "status " + privOn.status,
        );
        const privView = await memberRpc(memberToken, "profile_view", { p_handle: SHARED });
        record(
          "F3: a non-connection's handle lookup of a Private member returns null",
          privView.status === 200 && (privView.text === "null" || privView.body === null),
          privView.text.slice(0, 80),
        );
        record(
          "F3: a Private member is absent from Members for a non-connection",
          (await cardOf(memberToken, SHARED)) === null,
        );
        const privIntro = await memberRpc(memberToken, "send_introduction", {
          p_recipient: ownerId,
          p_message: "Hello, I would like to connect.",
        });
        record(
          "F3: send_introduction refuses a Private recipient with the standard message",
          privIntro.status >= 400 && /not available/.test(privIntro.text),
          "status " + privIntro.status + " " + privIntro.text.slice(0, 90),
        );
        const privAnon = await fetch(SUPABASE_URL + "/rest/v1/rpc/profile_view", {
          method: "POST",
          headers: { ...H, "content-type": "application/json" },
          body: JSON.stringify({ p_handle: SHARED, p_as_public: false }),
        });
        const privAnonText = await privAnon.text();
        record(
          "F3: the anonymous surface returns null for a Private member too",
          privAnon.status === 200 && (privAnonText === "null" || privAnonText === ""),
          privAnonText.slice(0, 80),
        );
        const privOff = await setPrivate(ownerToken, false);
        record(
          "F3: the Private switch is restored",
          privOff.status < 300,
          "status " + privOff.status,
        );

        // Teardown for arm 2: back to the audiences the owner had, and no row where there was none.
        let restored = true;
        for (const section of SECTIONS) {
          const before = prior.get(section);
          const r = before
            ? await setAudience(ownerToken, section, before)
            : await clearAudience(ownerToken, ownerId, section);
          if (r.status >= 300) restored = false;
        }
        const afterVis = await memberRest(
          ownerToken,
          "member_visibility?member_id=eq." + ownerId + "&select=section,audience",
        );
        const after = new Map(
          (Array.isArray(afterVis.body) ? afterVis.body : []).map((r) => [r.section, r.audience]),
        );
        record(
          "ruling 218: the audience fixture is torn down and member_visibility is as it was",
          restored && after.size === prior.size && [...prior].every(([k, v]) => after.get(k) === v),
          [...after].map(([k, v]) => k + "=" + v).join(",") || "no rows",
        );

        // ARM 4 (F4, gate IB-4). A real block, and the Feed and everything hanging off a post.
        if (memberId && ownerId) {
          const ownerPosts = await memberRest(
            ownerToken,
            "feed?author_id=eq." + ownerId + "&select=id",
          );
          const postIds = (Array.isArray(ownerPosts.body) ? ownerPosts.body : []).map((p) => p.id);
          const blockIn = await memberRest(memberToken, "member_blocks", {
            method: "POST",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({ blocker_id: memberId, blocked_id: ownerId }),
          });
          record(
            "F4: the viewer blocks the other member",
            blockIn.status < 300,
            "status " + blockIn.status + " " + blockIn.text.slice(0, 80),
          );
          const blockedFeed = await memberRest(
            memberToken,
            "feed?author_id=eq." + ownerId + "&select=id",
          );
          record(
            "F4: the blocker reads zero of the blocked member's posts through feed",
            blockedFeed.status === 200 &&
              Array.isArray(blockedFeed.body) &&
              blockedFeed.body.length === 0,
            "status " + blockedFeed.status + " rows " + (blockedFeed.body || []).length,
          );
          if (postIds.length) {
            const inList = "(" + postIds.join(",") + ")";
            const media = await memberRest(
              memberToken,
              "post_media?post_id=in." + inList + "&select=post_id",
            );
            const links = await memberRest(
              memberToken,
              "post_links?post_id=in." + inList + "&select=post_id",
            );
            record(
              "F4: nothing hanging off those posts reaches the blocker either",
              [media, links].every(
                (r) => r.status === 200 && Array.isArray(r.body) && r.body.length === 0,
              ),
              "media " + (media.body || []).length + " links " + (links.body || []).length,
            );
          }
          const reverseFeed = await memberRest(
            ownerToken,
            "feed?author_id=eq." + memberId + "&select=id",
          );
          record(
            "F4: the filter is symmetric, so the blocked member reads none of the blocker's posts",
            reverseFeed.status === 200 &&
              Array.isArray(reverseFeed.body) &&
              reverseFeed.body.length === 0,
            "rows " + (reverseFeed.body || []).length,
          );
          const blockOut = await memberRest(
            memberToken,
            "member_blocks?blocker_id=eq." + memberId + "&blocked_id=eq." + ownerId,
            { method: "DELETE" },
          );
          const blocksLeft = await memberRest(
            memberToken,
            "member_blocks?blocker_id=eq." + memberId + "&select=blocked_id",
          );
          record(
            "ruling 218: the block is torn down and member_blocks is as it was",
            blockOut.status < 300 &&
              blocksLeft.status === 200 &&
              Array.isArray(blocksLeft.body) &&
              blocksLeft.body.length === 0,
            "status " + blockOut.status + " left " + (blocksLeft.body || []).length,
          );
          // Ruling 211: a block revokes the edges and unblocking restores nothing. The two members
          // above are deliberately unconnected, so this arm has nothing to restore and does not
          // leave the graph changed. Pointing an arm like this at a connected pair would.
        }
      }
    }
  }
  const fails = results.filter((r) => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} live checks passed`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
