// Brief 3 live checks against the deployed URL and the live project (targeted checks 1, 2, 3 and 11
// in DNA-Brief-3-Profile-Code-Handoff.md). No browser: the served HTML and the anonymous REST
// surface, so a failure here is a data-level finding, not a rendering one.
// Usage: BASE=https://<preview>.dna-web-application.pages.dev node tests/live-checks.cjs
// Env: SHARED (default thandiwe-dube), UNSHARED (default kwame-mensah), UNSHARED_ID; SKIP_REST=1
// skips the Supabase calls where the network policy blocks them.
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
      "member_focus?member_id=eq." + UNSHARED_ID + "&select=*",
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
    const core = await rest("members?handle=eq." + SHARED + "&select=*");
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
    const all = await rest("members?select=handle");
    record(
      "check 3: anon sees only shared handles in members",
      all.status === 200 &&
        Array.isArray(all.body) &&
        all.body.every((m) => m.handle === SHARED || m.handle !== UNSHARED),
      JSON.stringify(all.body).slice(0, 120),
    );
  }
  const fails = results.filter((r) => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} live checks passed`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
