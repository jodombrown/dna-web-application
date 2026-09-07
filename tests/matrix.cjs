// Responsive test matrix (ruling 61) for the shell, Feed, notifications and composer (B2.1: one-row
// header, three scroll containers, in-place expansion, the ten targeted checks). Points at
// BASE (a deployed Pages URL or a local server) with every Supabase endpoint mocked at the network
// layer, so the real client code paths run against a deterministic backend. Backend behaviour
// (RLS, the feed view) is verified separately in SQL against the live project.
// Usage: BASE=https://b2-shell-feed.dna-web-application.pages.dev WEBKIT=1 node tests/matrix.cjs
// Env: ONLY='[390,844]' runs one viewport; SPECIAL=publish,keyboard,silence,shell,targeted runs flows only.
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE || "http://127.0.0.1:4173";
const OUT = process.env.OUT || path.join(__dirname, "matrix-out");
fs.mkdirSync(OUT, { recursive: true });
const SB = "dgspjevjoblujcoljvkn.supabase.co";
const VIEWPORTS = [
  [360, 800],
  [390, 844],
  [430, 932],
  [744, 1133],
  [820, 1180],
  [1024, 1366],
  [1366, 1024],
  [1280, 800],
  [1536, 960],
];
const FULL_PREVIEW_AT = new Set([390, 820, 1280]);
const THEMES = ["light", "dark"];
const UID = "00000000-0000-4000-8000-0000000000e1";
const KENTE = fs.readFileSync(path.join(__dirname, "../public/strand/patterns/kente-pattern.svg"));

function b64url(o) {
  return Buffer.from(JSON.stringify(o))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
const JWT =
  b64url({ alg: "HS256", typ: "JWT" }) +
  "." +
  b64url({
    sub: UID,
    role: "authenticated",
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600 * 24,
    email: "member@test.invalid",
  }) +
  ".sig";
const USER = {
  id: UID,
  aud: "authenticated",
  role: "authenticated",
  email: "member@test.invalid",
  user_metadata: { full_name: "Amara Osei" },
  app_metadata: { provider: "email" },
  created_at: new Date().toISOString(),
};
const SESSION = {
  access_token: JWT,
  token_type: "bearer",
  expires_in: 86400,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
  refresh_token: "r",
  user: USER,
};

const SAMPLES = {
  convene:
    "We are hosting a Diaspora Builders Dinner in Nairobi on Thu 16 Oct at 19:00. Doors at 18:30. Free for members, bring one person who should be in the room.",
  connect:
    "Can someone introduce me to Kwame Mensah at the Accra fintech hub? I am building a savings product for market traders and he has done this before.",
  collaborate:
    "Starting a Space for diaspora health workers who want to run short clinics back home. Looking for two coordinators and one person who knows Kenyan licensing.",
  contribute:
    "We need a volunteer accountant to review the cooperative books before the audit by 30 Nov. Two evenings, remote is fine.",
  convey:
    "Three intros that changed a harvest. I wrote down how a cassava cooperative in Oyo found its first buyer through two members in Houston.",
  untyped:
    "Back in Nairobi after three weeks in Houston. The jet lag is winning and the mangoes are not.",
};
const INFER = {
  convene: {
    verb: "convene",
    confidence: 0.95,
    fields: {
      title: "Diaspora Builders Dinner",
      date: "Thu 16 Oct",
      time: "19:00",
      place: "Nairobi",
      ticket: "Free",
    },
    latency_ms: 900,
  },
  connect: {
    verb: "connect",
    confidence: 0.94,
    fields: {
      who: "Kwame Mensah at the Accra fintech hub",
      why: "I am building a savings product for market traders and he has done this before",
    },
    latency_ms: 900,
  },
  collaborate: {
    verb: "collaborate",
    confidence: 0.92,
    fields: {
      title: "Space for diaspora health workers",
      category: "Health",
      roles: "two coordinators and one person who knows Kenyan licensing",
    },
    latency_ms: 900,
  },
  contribute: {
    verb: "contribute",
    confidence: 0.93,
    fields: {
      title: "Volunteer accountant",
      instrument: "Skills",
      need: "review the cooperative books before the audit",
      by: "30 Nov",
    },
    latency_ms: 900,
  },
  convey: {
    verb: "convey",
    confidence: 0.78,
    fields: { title: "Three intros that changed a harvest" },
    latency_ms: 900,
  },
};

function makeMockDb() {
  const db = {
    posts: [],
    events: [],
    spaces: [
      {
        id: "s1",
        title: "Nairobi chapter",
        owner_member_id: UID,
        category: null,
        description: null,
        roles_sought: [],
        status: "active",
        created_at: new Date().toISOString(),
      },
    ],
    opportunities: [],
    connection_requests: [],
    stories: [],
    post_media: [],
    post_links: [],
    notifications: [],
    saves: [],
    reactions: [],
    drafts: new Map(),
    rpcPayloads: [],
    inferCalls: 0,
    reads: [],
  };
  return db;
}

const LONG =
  "Back in Nairobi after three weeks in Houston. The jet lag is winning and the mangoes are not. " +
  "Three intros changed the trip: a cooperative in Oyo found its first buyer through two members, " +
  "a clinic coordinator agreed to run a weekend session in Kisumu, and a fintech founder in Accra " +
  "opened his books to a savings product for market traders. Writing the long version tonight, " +
  "because the short version does not do the people justice.\n\nMore soon, with names once they agree.";

/** Seed n published untyped posts, newest first, alternating authors so Mine and My Network differ. */
function seedPosts(db, n) {
  for (let i = 0; i < n; i++) {
    const mineRow = i % 2 === 0;
    db.posts.push({
      id: "seed-" + i,
      author_kind: "member",
      author_id: mineRow ? UID : "00000000-0000-4000-8000-0000000000f2",
      created_by: mineRow ? UID : "00000000-0000-4000-8000-0000000000f2",
      c_category: "convey",
      body: i + 1 + ". " + LONG,
      anchor_kind: null,
      anchor_id: null,
      created_object_kind: null,
      created_object_id: null,
      audience: "everyone",
      status: "published",
      published_at: new Date(Date.now() - i * 3600e3).toISOString(),
      created_at: new Date(Date.now() - i * 3600e3).toISOString(),
    });
  }
}

async function mockSupabase(page, db, opts = {}) {
  // Google Fonts are not reachable from this sandbox; abort so the check for page errors stays meaningful.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.route(`**/${SB}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const method = req.method();
    const json = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(body),
      });
    if (method === "OPTIONS")
      return route.fulfill({
        status: 200,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "*",
        },
      });
    if (p.startsWith("/auth/v1/token")) return json(SESSION);
    if (p === "/auth/v1/user") return json(USER);
    if (p === "/auth/v1/logout") return json({}, 204);
    if (p === "/functions/v1/dia-compose-read") {
      db.inferCalls++;
      const body = req.postDataJSON();
      await new Promise((r) => setTimeout(r, opts.inferDelay ?? 900));
      if (opts.silent) return json(null);
      const key = Object.keys(SAMPLES).find(
        (k) => k !== "untyped" && body.text.startsWith(SAMPLES[k].slice(0, 30)),
      );
      return json(key ? INFER[key] : null);
    }
    if (p === "/functions/v1/link-unfurl") {
      await new Promise((r) => setTimeout(r, 400));
      return json({
        url: req.postDataJSON().url,
        title: "Nairobi to host continental builders summit",
        description: null,
        image_url: null,
      });
    }
    if (p === "/functions/v1/media-upload") {
      await new Promise((r) => setTimeout(r, 300));
      return json({
        storage_path: `${UID}/p1/${db.post_media.length + 1}.png`,
        width: 1200,
        height: 800,
      });
    }
    if (p.startsWith("/storage/v1/object/sign/"))
      return json({ signedURL: "/object/sign/post-media/x.svg?token=t" });
    if (p.startsWith("/storage/v1/object/sign") || p.includes("/object/sign/"))
      return route.fulfill({ status: 200, contentType: "image/svg+xml", body: KENTE });
    if (p === "/rest/v1/rpc/publish_post") {
      const payload = req.postDataJSON().payload;
      db.rpcPayloads.push(payload);
      const id = payload.id;
      let kind = null,
        oid = null;
      const f = payload.fields || {};
      const title = f.title || payload.body.split("\n")[0].slice(0, 80) || "Untitled";
      if (payload.verb === "convene") {
        oid = "e" + id;
        kind = "event";
        db.events.push({
          id: oid,
          host_member_id: UID,
          title,
          starts_at: payload.starts_at,
          ends_at: null,
          when_text: [f.date, f.time].filter(Boolean).join("\n"),
          mode: f.hybrid ? "hybrid" : "in_person",
          location: f.place ? { text: f.place } : null,
          virtual_url: null,
          ticket_kind: (f.ticket || "Free").toLowerCase(),
          space_id: payload.anchor?.kind === "space" ? payload.anchor.id : null,
          created_at: new Date().toISOString(),
        });
      }
      if (payload.verb === "collaborate") {
        oid = "sp" + id;
        kind = "space";
        db.spaces.push({
          id: oid,
          title,
          owner_member_id: UID,
          category: f.category || null,
          description: payload.body,
          roles_sought: (f.roles || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          status: "active",
          created_at: new Date().toISOString(),
        });
      }
      if (payload.verb === "contribute") {
        oid = "o" + id;
        kind = "opportunity";
        db.opportunities.push({
          id: oid,
          receiver_member_id: UID,
          title,
          instrument: { Skills: "skills", "In-kind": "in_kind" }[f.instrument] || "time",
          need: f.need || payload.body,
          by_date: payload.by_date,
          by_text: f.by || "",
          space_id: null,
          event_id: null,
          created_at: new Date().toISOString(),
        });
      }
      if (payload.verb === "connect") {
        oid = "c" + id;
        kind = "connection_request";
        db.connection_requests.push({
          id: oid,
          from_member_id: UID,
          to_member_id: null,
          to_name: f.who || "",
          why: f.why || payload.body,
          status: "pending",
          created_at: new Date().toISOString(),
        });
      }
      if (payload.verb === "convey") {
        oid = "st" + id;
        kind = "story";
        db.stories.push({
          id: oid,
          author_member_id: UID,
          title,
          body: payload.body,
          origin_kind: null,
          origin_id: null,
          created_at: new Date().toISOString(),
        });
      }
      db.posts.unshift({
        id,
        author_kind: payload.author_kind,
        author_id: payload.author_id,
        created_by: UID,
        c_category: payload.verb || "convey",
        body: payload.body,
        anchor_kind: payload.anchor?.kind ?? null,
        anchor_id: payload.anchor?.id ?? null,
        created_object_kind: kind,
        created_object_id: oid,
        audience: payload.audience,
        status: "published",
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
      (payload.media || []).forEach((m, i) =>
        db.post_media.push({
          id: "m" + i + id,
          post_id: id,
          storage_path: m.storage_path,
          width: m.width,
          height: m.height,
          position: m.position,
          created_at: new Date().toISOString(),
        }),
      );
      if (payload.link)
        db.post_links.push({
          id: "l" + id,
          post_id: id,
          url: payload.link.url,
          title: payload.link.title,
          description: payload.link.description,
          image_url: payload.link.image_url,
          fetched_at: null,
          created_at: new Date().toISOString(),
        });
      db.drafts.clear();
      return json(id);
    }
    if (p.startsWith("/rest/v1/")) {
      const table = p.slice("/rest/v1/".length);
      const inIds = (param) => {
        const v = url.searchParams.get(param);
        if (!v) return null;
        const m = v.match(/^in\.\((.*)\)$/);
        return m ? m[1].split(",").map((s) => s.replace(/^"|"$/g, "")) : null;
      };
      if (table === "post_drafts") {
        (db.log = db.log || []).push(
          method + " " + p + url.search + " accept=" + (req.headers()["accept"] || ""),
        );
        if (method === "GET") {
          const d = db.drafts.get(url.searchParams.get("host_context")?.replace("eq.", ""));
          const single = (req.headers()["accept"] || "").includes("object");
          if (single)
            return d
              ? json({ payload: d })
              : json({ code: "PGRST116", details: "0 rows", hint: null, message: "no rows" }, 406);
          return json(d ? [{ payload: d }] : []);
        }
        if (method === "POST") {
          const b = req.postDataJSON();
          const row = Array.isArray(b) ? b[0] : b;
          db.drafts.set(row.host_context, row.payload);
          return json([row], 201);
        }
        if (method === "DELETE") {
          db.drafts.delete(url.searchParams.get("host_context")?.replace("eq.", ""));
          return json([], 200);
        }
      }
      const eqOf = (param) => url.searchParams.get(param)?.replace(/^eq\./, "") ?? null;
      const single = (req.headers()["accept"] || "").includes("object");
      const one = (rows) =>
        rows[0]
          ? json(rows[0])
          : json({ code: "PGRST116", details: "0 rows", hint: null, message: "no rows" }, 406);
      if (table === "feed") {
        let rows = db.posts.filter((p) => p.status === "published");
        const ids = inIds("id");
        if (ids) rows = rows.filter((p) => ids.includes(p.id));
        const id = eqOf("id");
        if (id) rows = rows.filter((p) => p.id === id);
        const or = url.searchParams.get("or") || "";
        if (or.includes("created_by")) rows = rows.filter((p) => p.author_id === UID);
        else if (or.includes("author_kind"))
          rows = rows.filter((p) => or.includes('"' + p.author_id + '"'));
        return single ? one(rows) : json(rows);
      }
      if (table === "post_saves" || table === "post_reactions") {
        const list = table === "post_saves" ? db.saves : db.reactions;
        if (method === "POST") {
          const b = req.postDataJSON();
          const row = Array.isArray(b) ? b[0] : b;
          list.push({ ...row, created_at: new Date().toISOString() });
          return json([row], 201);
        }
        if (method === "DELETE") {
          const pid = eqOf("post_id");
          const keep = list.filter((r) => r.post_id !== pid);
          list.length = 0;
          list.push(...keep);
          return json([], 200);
        }
        const ids = inIds("post_id");
        return json(list.filter((r) => !ids || ids.includes(r.post_id)));
      }
      if (table === "notifications") {
        if (method === "PATCH") {
          const id = eqOf("id");
          db.reads.push(id);
          db.notifications.forEach((n) => {
            if (n.id === id) n.read_at = new Date().toISOString();
          });
          return json([], 204);
        }
        let rows = db.notifications.slice();
        if (url.searchParams.get("read_at") === "is.null") rows = rows.filter((n) => !n.read_at);
        return json(rows);
      }
      if (table === "space_roles") return json([{ space_id: "s1" }]);
      if (table === "spaces") {
        const ids = inIds("id");
        return json(ids ? db.spaces.filter((s) => ids.includes(s.id)) : db.spaces);
      }
      if (table === "posts") return json(db.posts);
      if (table === "post_media") {
        const ids = inIds("post_id");
        return json(db.post_media.filter((m) => !ids || ids.includes(m.post_id)));
      }
      if (table === "post_links") {
        const ids = inIds("post_id");
        return json(db.post_links.filter((m) => !ids || ids.includes(m.post_id)));
      }
      for (const t of ["events", "opportunities", "connection_requests", "stories"])
        if (table === t) {
          const ids = inIds("id");
          if (!ids && url.searchParams.has("starts_at")) return json([]);
          if (!ids && t === "connection_requests") return json([]);
          return json(db[t].filter((r) => !ids || ids.includes(r.id)));
        }
      return json([]);
    }
    return json(null, 404);
  });
}

// CHROME_PATH points Chromium at a preinstalled binary (sandboxes without a Playwright download).
function launch(browserType) {
  const opts =
    browserType === chromium && process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {};
  return browserType.launch(opts);
}

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) console.log("FAIL", name, detail);
}

async function noOverflow(page, label) {
  const { sw, iw } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth,
  }));
  record(label + " no horizontal overflow", sw <= iw, `scrollWidth ${sw} > innerWidth ${iw}`);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name + ".png"), fullPage: false });
}

async function signIn(page) {
  await page.goto(BASE + "/sign-in", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "member@test.invalid");
  await page.fill('input[type="password"]', "x");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/feed", { timeout: 15000 });
  await page.waitForSelector('[data-testid="compose"]');
}

async function runViewport(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}`;
  const isTouch = w < 1024 || w === 1024;
  const browser = await launch(browserType);
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: isTouch,
    isMobile: w < 1024,
    deviceScaleFactor: 1,
    colorScheme: theme,
  });
  const page = await ctx.newPage();
  const db = makeMockDb();
  seedPosts(db, 3);
  await page.addInitScript(
    ({ theme }) => {
      try {
        localStorage.setItem("dna.theme", theme);
      } catch {}
    },
    { theme },
  );
  if (process.env.HIDE)
    await page.addInitScript((css) => {
      const st = document.createElement("style");
      st.textContent = css;
      document.addEventListener("DOMContentLoaded", () => document.head.appendChild(st));
    }, process.env.HIDE);
  await mockSupabase(page, db);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      !/fonts\.g|ERR_CONNECTION_RESET|ERR_NAME_NOT_RESOLVED|ERR_FAILED/.test(m.text())
    )
      errors.push(m.text());
  });
  try {
    await signIn(page);
    record(tag + " theme attribute", (await page.getAttribute("html", "data-theme")) === theme);
    await shot(page, `${tag}-00-feed`);
    await noOverflow(page, tag + " feed");
    if (process.env.DEBUG)
      console.log(
        "DEBUG nav:",
        JSON.stringify(
          await page.evaluate(() =>
            [...document.querySelectorAll('nav[aria-label="Pulse"]')].map((n) => ({
              h: n.style.height,
              w: n.getBoundingClientRect().width,
              sw: n.scrollWidth,
              items: [...n.children].map((c) => Math.round(c.getBoundingClientRect().width)),
              parentW: n.parentElement.getBoundingClientRect().width,
              parentSW: n.parentElement.scrollWidth,
            })),
          ),
        ),
      );
    if (process.env.DEBUG)
      console.log(
        "DEBUG wide:",
        JSON.stringify(
          await page.evaluate(() => {
            const out = { innerWidth: window.innerWidth, wide: [] };
            for (const el of document.querySelectorAll("body *")) {
              const r = el.getBoundingClientRect();
              if (r.right > 821)
                out.wide.push([
                  el.tagName,
                  Math.round(r.width),
                  Math.round(r.right),
                  (el.getAttribute("aria-label") || el.textContent || "").slice(0, 25),
                ]);
            }
            return out;
          }),
        ),
      );

    record(
      tag + " shell: one header, one Pulse nav, five slots",
      (await page.locator("[data-app-header]").count()) === 1 &&
        (await page.locator('nav[aria-label="Pulse"]').count()) === 1 &&
        (await page.locator('nav[aria-label="Pulse"] button').count()) === 5,
    );
    const navPos = await page.evaluate(
      () => getComputedStyle(document.querySelector('nav[aria-label="Pulse"]')).position,
    );
    const headBox = await page.locator("[data-app-header]").boundingBox();
    record(
      tag +
        (w > 1024
          ? " expanded: one-row header with the five Cs inline and the Home icon (rulings 99, 106)"
          : " compact/medium: bottom dock, no Home icon, logo is Home"),
      w > 1024
        ? (await page.locator('[data-app-header] nav[data-pulse="inline"]').count()) === 1 &&
            (await page.locator('[data-app-header] [data-testid="home-item"]').count()) === 1 &&
            headBox.height <= 66
        : navPos === "fixed" &&
            (await page.locator('[data-testid="home-item"]').count()) === 0 &&
            (await page.locator('[data-testid="home"]').getAttribute("href")) === "/feed",
      `nav ${navPos} header height ${headBox && headBox.height}`,
    );
    record(
      tag +
        (w > 1024
          ? " header: logo, bell, avatar; composer entry in the Feed column"
          : " header: logo Home, composer entry, bell, avatar; no theme or sign-out controls"),
      (await page.locator('[data-app-header] img[alt="DNA"]').count()) === 1 &&
        (await page.locator('[data-testid="compose"]').count()) === 1 &&
        (await page.locator('[data-testid="compose"]').textContent()).includes(
          "What is going on with you?",
        ) &&
        (await page
          .locator((w > 1024 ? "[data-feed] " : "[data-app-header] ") + '[data-testid="compose"]')
          .count()) === 1 &&
        (await page.locator('[data-app-header] [data-testid="bell"]').count()) === 1 &&
        (await page.locator('[data-app-header] [aria-label="Your profile"]').count()) === 1 &&
        (await page.locator('[data-app-header] [aria-label="Sign out"]').count()) === 0,
    );
    record(
      tag + " lens bar with five lenses, All selected",
      (await page.locator('[role="tablist"][aria-label="Lens"] [role="tab"]').count()) === 5 &&
        (await page
          .locator('[role="tablist"][aria-label="Lens"] [role="tab"][aria-selected="true"]')
          .getAttribute("data-lens")) === "all",
    );
    record(
      tag + " feed cards in feed mode: react, respond, save, share, no counts",
      (await page.locator("main article[data-c]").count()) === 3 &&
        (await page.locator('main article [data-testid="react"]').count()) === 3 &&
        (await page.locator('main article [data-testid="respond"]').count()) === 3 &&
        (await page.locator('main article [data-testid="save"]').count()) === 3 &&
        (await page.locator('main article [data-testid="share"]').count()) === 3 &&
        !/\b\d+ (likes|reactions|saves)\b/i.test(await page.locator("main").textContent()),
    );
    if (w > 1024) {
      const rails = await page.locator("[data-rail-widget]").count();
      record(
        tag + (w >= 1440 ? " three regions, both rails grounded-or-empty" : " left rail only"),
        w >= 1440 ? rails === 4 : rails === 3,
        "rail widgets " + rails,
      );
    } else {
      record(
        tag + " no rails below 1024",
        (await page.locator("[data-rail-widget]").count()) === 0,
      );
    }
    // Open from the header pill: empty state.
    await page.click('[data-testid="compose"]');
    const dialog = page.locator('section[role="dialog"][aria-label="Compose"]');
    await dialog.waitFor({ timeout: 10000 });
    await page.waitForTimeout(500); // let the 300ms slide (after two frames) settle before measuring
    record(tag + " composer opens from the header pill", true);
    if (process.env.DEBUG)
      console.log(
        "DEBUG wide2:",
        JSON.stringify(
          await page.evaluate(() => {
            const out = { innerWidth: window.innerWidth, wide: [] };
            for (const el of document.querySelectorAll("body *")) {
              const r = el.getBoundingClientRect();
              if (r.right > window.innerWidth + 1)
                out.wide.push([
                  el.tagName,
                  Math.round(r.width),
                  Math.round(r.right),
                  (el.getAttribute("aria-label") || el.textContent || "").slice(0, 25),
                ]);
            }
            return out;
          }),
        ),
      );
    record(
      tag + " five verb chips visible",
      (await dialog
        .locator('[role="radiogroup"][aria-label="What kind of post"] [role="radio"]')
        .count()) === 5,
    );
    record(
      tag + " empty: no DiaLine, no preview, publish disabled",
      (await dialog.locator("[data-dia]").count()) === 0 &&
        (await dialog.locator("article[aria-label='Preview of your post']").count()) === 0 &&
        (await dialog.getByRole("button", { name: "Publish" }).isDisabled()),
    );
    // Drawer geometry (ruling 106): 80% bottom sheet under 640, 65% right drawer 640 to 1024,
    // min(1000, 100%) drawer above.
    const box = await dialog.boundingBox();
    record(
      tag +
        (w > 1024
          ? " drawer at min(1000, 100%)"
          : w >= 640
            ? " medium: 65% right drawer"
            : " compact: 80% bottom sheet"),
      w > 1024
        ? Math.abs(box.width - Math.min(1000, w)) < 2
        : w >= 640
          ? Math.abs(box.width - 0.65 * w) < 2 && Math.abs(box.x + box.width - w) < 2
          : Math.abs(box.width - w) < 2 && Math.abs(box.height - 0.8 * h) < 2,
      `box ${JSON.stringify(box)}`,
    );
    const pub = dialog.getByRole("button", { name: "Publish" });
    const pb = await pub.boundingBox();
    const geo = await page.evaluate(() => {
      const s = document.querySelector('section[role="dialog"][aria-label="Compose"]');
      const r = s.getBoundingClientRect();
      const scrim = s.parentElement.getBoundingClientRect();
      return {
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth,
        sectionBottom: r.bottom,
        sectionTop: r.top,
        scrimBottom: scrim.bottom,
        vv: window.visualViewport && window.visualViewport.height,
      };
    });
    record(
      tag + " publish within viewport",
      pb && pb.y + pb.height <= geo.innerHeight + 1,
      JSON.stringify({ pb, geo }),
    );
    await shot(page, `${tag}-01-empty`);
    await noOverflow(page, tag + " empty");

    // Thinking then populated (Convene sample).
    const ta = dialog.locator('textarea[aria-label="What is going on with you"]');
    await ta.fill(SAMPLES.convene);
    await dialog.locator('[data-dia="thinking"]').waitFor({ timeout: 3000 });
    record(tag + " thinking state after 700ms debounce", true);
    await shot(page, `${tag}-02-thinking`);
    await dialog.locator('[data-dia="done"]').waitFor({ timeout: 5000 });
    record(
      tag + " populated: chip selected + DIA line",
      (await dialog
        .locator('[role="radio"][aria-label^="Host an Event"][aria-checked="true"]')
        .count()) === 1 &&
        (await dialog.locator('[data-dia="done"]').textContent()).includes(
          "DIA read this as an Event.",
        ),
    );
    record(
      tag + " populated: DIA tags on filled fields",
      (await dialog.locator("label", { hasText: "DIA" }).count()) >= 3,
    );
    const preview = dialog.locator("article[aria-label='Preview of your post']");
    record(
      tag + " populated: preview card assembled as convene",
      (await preview.getAttribute("data-c")) === "convene" &&
        (await preview.textContent()).includes("Diaspora Builders Dinner"),
    );
    record(tag + " publish enabled with content", !(await pub.isDisabled()));
    await shot(page, `${tag}-03-populated`);
    await noOverflow(page, tag + " populated");

    // Member edits a DIA field: tag disappears; re-inference must not overwrite it.
    const titleInput = dialog.locator("label", { hasText: "Title" }).locator("..").locator("input");
    await titleInput.fill("Builders Dinner, Nairobi");
    record(
      tag + " member edit removes DIA tag on that field",
      (await dialog
        .locator("label", { hasText: "Title" })
        .locator("span", { hasText: "DIA" })
        .count()) === 0,
    );
    record(
      tag + " member-written field shows pen glyph in preview",
      (await preview.locator("h3").textContent()).includes("Builders Dinner, Nairobi"),
    );

    // Not this? clears DIA fields, keeps member ones, returns to untyped Convey.
    await dialog.getByRole("button", { name: "Not this?" }).click();
    record(
      tag + " Not this? -> untyped convey, no DiaLine",
      (await dialog.locator("[data-dia]").count()) === 0 &&
        (await preview.getAttribute("data-c")) === "convey" &&
        (await preview.locator("h3").count()) === 0,
    );
    // Six previews via chips.
    for (const v of ["connect", "convene", "collaborate", "contribute", "convey"]) {
      if (!FULL_PREVIEW_AT.has(w) && v !== "contribute") continue;
      await ta.fill(SAMPLES[v]);
      const act = {
        connect: "Make an Intro",
        convene: "Host an Event",
        collaborate: "Start a Space",
        contribute: "Post a Need",
        convey: "Share a Story",
      }[v];
      await dialog.locator(`[role="radio"][aria-label^="${act}"]`).click();
      record(
        tag + ` chip override -> ${v} preview, no DiaLine`,
        (await preview.getAttribute("data-c")) === v &&
          (await dialog.locator("[data-dia]").count()) === 0,
      );
      await page.waitForTimeout(150);
      await shot(page, `${tag}-04-preview-${v}`);
      await noOverflow(page, tag + " preview " + v);
    }
    await dialog.locator('[role="radio"][aria-label^="Post a Need"]').click();
    // Audience pills.
    await dialog
      .locator('[role="radiogroup"][aria-label="Who sees this"] [role="radio"]', {
        hasText: "My connections",
      })
      .click();
    record(
      tag + " audience pill -> preview meta",
      (await preview.textContent()).includes("My connections"),
    );
    // Close keeps draft (Esc), reopen restores.
    await page.keyboard.press("Escape");
    await page.waitForSelector('section[role="dialog"][aria-label="Compose"]', {
      state: "detached",
    });
    record(tag + " Esc closes; draft persisted server-side", db.drafts.size === 1);
    await page.keyboard.press("c");
    await dialog.waitFor({ timeout: 10000 });
    if (process.env.DEBUG)
      console.log(
        "DEBUG restore:",
        JSON.stringify({
          value: (await ta.inputValue()).slice(0, 40),
          drafted: await dialog.getByText("Draft saved").count(),
          drafts: [...db.drafts.entries()].map(([k, v]) => [
            k,
            typeof v,
            v && v.text && v.text.slice(0, 30),
          ]),
          log: db.log,
        }),
      );
    record(
      tag + " c keypress opens composer with restored draft",
      /^(Three intros|We need a volunteer)/.test(await ta.inputValue()) &&
        (await dialog.getByText("Draft saved").count()) === 1,
    );
    await page.keyboard.press("Escape");
    await page.waitForSelector('section[role="dialog"][aria-label="Compose"]', {
      state: "detached",
    });
    // Empty-state action opens the same composer (Mine lens has no posts by this member? it has; use a member-less lens).
    db.posts.length = 0;
    await page.click('[role="tablist"][aria-label="Lens"] [data-lens="mine"]');
    await page.waitForURL("**/feed?lens=mine");
    await page.locator('[data-testid="feed-empty"][data-lens="mine"]').waitFor({ timeout: 10000 });
    await shot(page, `${tag}-05-empty-mine`);
    await page.locator('[data-testid="feed-empty"] button', { hasText: "Share a Story" }).click();
    await dialog.waitFor({ timeout: 10000 });
    record(tag + " empty-state action opens the composer", true);
    await page.keyboard.press("Escape");
    await page.waitForSelector('section[role="dialog"][aria-label="Compose"]', {
      state: "detached",
    });
    db.drafts.clear();
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 300));
    await shot(page, `${tag}-ERROR`).catch(() => {});
  }
  record(
    tag + " no page errors",
    errors.length === 0,
    errors.slice(0, 3).join(" | ").slice(0, 300),
  );
  await browser.close();
}

// End-to-end publish (once per tier) including link unfurl, image attach, and the feed card via the router.
async function runPublish(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-publish`;
  const browser = await launch(browserType);
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: w < 1024,
    isMobile: w < 1024,
    colorScheme: theme,
  });
  const page = await ctx.newPage();
  const db = makeMockDb();
  await page.addInitScript(
    ({ theme }) => {
      try {
        localStorage.setItem("dna.theme", theme);
      } catch {}
    },
    { theme },
  );
  await mockSupabase(page, db);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    await signIn(page);
    await page.click('[data-testid="compose"]');
    const dialog = page.locator('section[role="dialog"][aria-label="Compose"]');
    await dialog.waitFor();
    await dialog.locator('textarea[aria-label="What is going on with you"]').fill(SAMPLES.convene);
    await dialog.locator('[data-dia="done"]').waitFor({ timeout: 5000 });
    // Link.
    await dialog.getByRole("button", { name: "Add a link" }).click();
    await dialog.locator('input[placeholder="https://"]').fill("https://nation.africa/summit");
    await page.keyboard.press("Enter");
    record(
      tag + " link shows domain immediately",
      (await dialog.textContent()).includes("nation.africa"),
    );
    await dialog
      .getByText("Nairobi to host continental builders summit")
      .first()
      .waitFor({ timeout: 3000 });
    record(
      tag + " link unfurls into card",
      (await dialog.locator("article[aria-label='Preview of your post']").textContent()).includes(
        "Nairobi to host continental builders summit",
      ),
    );
    // Images (picker path on touch, direct input on pointer): set files on the hidden input.
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64",
    );
    const fileInput = dialog.locator('input[type="file"]:not([capture])');
    await fileInput.setInputFiles([
      { name: "a.png", mimeType: "image/png", buffer: png },
      { name: "b.png", mimeType: "image/png", buffer: png },
    ]);
    await page.waitForTimeout(600);
    record(
      tag + " two thumbnails after attach",
      (await dialog.getByRole("button", { name: "Remove image" }).count()) === 2,
    );
    record(
      tag + " gallery in preview",
      (await dialog.locator("article[aria-label='Preview of your post'] img").count()) >= 2,
    );
    await fileInput.setInputFiles([
      { name: "c.png", mimeType: "image/png", buffer: png },
      { name: "d.png", mimeType: "image/png", buffer: png },
      { name: "e.png", mimeType: "image/png", buffer: png },
    ]);
    await page.waitForTimeout(600);
    record(
      tag + " fifth image truncated to cap of four",
      (await dialog.getByRole("button", { name: "Remove image" }).count()) === 4 &&
        (await dialog.getByRole("button", { name: "Add an image" }).isDisabled()),
    );
    await page.screenshot({ path: path.join(OUT, `${tag}-05-attached.png`) });
    // Publish.
    await dialog.getByRole("button", { name: "Publish" }).click();
    await page.waitForSelector('section[role="dialog"][aria-label="Compose"]', {
      state: "detached",
      timeout: 10000,
    });
    record(tag + " composer closes on publish, no navigation", page.url().endsWith("/feed"));
    const payload = db.rpcPayloads[0];
    record(
      tag + " RPC payload: one c_category via verb, media x4, link, dia record",
      payload &&
        payload.verb === "convene" &&
        payload.media.length === 4 &&
        payload.link.url.includes("nation.africa") &&
        payload.dia &&
        payload.dia.verb === "convene" &&
        payload.dia.accepted === true &&
        typeof payload.starts_at === "string" &&
        payload.starts_at.length > 0,
      JSON.stringify(payload).slice(0, 300),
    );
    await page.getByText("Published. It is in the Feed.").waitFor({ timeout: 3000 });
    const card = page.locator("main article[data-c='convene']").first();
    await card.waitFor({ timeout: 10000 });
    record(
      tag + " feed card rendered by the router with kicker Event, title, its own act, icon actions",
      (await card.textContent()).includes("Event") &&
        (await card.textContent()).includes("Diaspora Builders Dinner") &&
        (await card.textContent()).includes("Get a ticket") &&
        (await card.locator('[data-testid="react"]').count()) === 1 &&
        (await card.locator('[data-testid="respond"]').count()) === 1,
    );
    record(
      tag + " feed card carries media and link",
      (await card.locator("img").count()) >= 4 &&
        (await card.textContent()).includes("nation.africa"),
    );
    await page.screenshot({ path: path.join(OUT, `${tag}-06-published.png`) });
    // Untyped publish. The published sheet slides out over 300ms; wait for it to leave so the
    // locator below binds to the new composer.
    await page.waitForSelector('section[role="dialog"][aria-label="Compose"]', {
      state: "detached",
      timeout: 10000,
    });
    await page.keyboard.press("c");
    await dialog.waitFor();
    await dialog.locator('textarea[aria-label="What is going on with you"]').fill(SAMPLES.untyped);
    await page.waitForTimeout(1900);
    if (process.env.DEBUG) {
      await page.screenshot({ path: path.join(OUT, `${tag}-DEBUG-untyped.png`) });
      console.log(
        "DEBUG untyped:",
        JSON.stringify({
          dia: await dialog.locator("[data-dia]").count(),
          preview: await dialog.locator("article[aria-label='Preview of your post']").count(),
          c: await dialog
            .locator("article[aria-label='Preview of your post']")
            .getAttribute("data-c")
            .catch(() => "none"),
          disabled: await dialog.getByRole("button", { name: "Publish" }).isDisabled(),
          text: (
            await dialog.locator('textarea[aria-label="What is going on with you"]').inputValue()
          ).slice(0, 30),
          drafts: db.drafts.size,
          infer: db.inferCalls,
        }),
      );
    }
    record(
      tag + " silence: untyped text -> no DiaLine, convey preview, no kicker",
      (await dialog.locator("[data-dia]").count()) === 0 &&
        (await dialog
          .locator("article[aria-label='Preview of your post']")
          .getAttribute("data-c")) === "convey",
    );
    await dialog.getByRole("button", { name: "Publish" }).click();
    await page.waitForSelector('section[role="dialog"][aria-label="Compose"]', {
      state: "detached",
      timeout: 10000,
    });
    const p2 = db.rpcPayloads[1];
    record(
      tag + " untyped publish: verb null (convey, no object)",
      p2 &&
        p2.verb === null &&
        db.posts[0].c_category === "convey" &&
        db.posts[0].created_object_kind === null,
    );
    await page.locator("main article[data-c='convey']").first().waitFor({ timeout: 10000 });
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 300));
    await page.screenshot({ path: path.join(OUT, `${tag}-ERROR.png`) }).catch(() => {});
  }
  record(tag + " no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
}

// Shell, Feed lenses, quick-look overlay, notifications: one run per viewport, light theme.
async function runShell(browserType, bname, [w, h]) {
  const tag = `${bname}-${w}x${h}-shell`;
  const browser = await launch(browserType);
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: w < 1024,
    isMobile: w < 1024,
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const db = makeMockDb();
  seedPosts(db, 8);
  await mockSupabase(page, db);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    await signIn(page);
    const stamp = await page.getAttribute("html", "data-shell");
    record(tag + " shell mount stamp set", !!stamp);
    // Lens in the URL, back-button safe.
    await page.click('[role="tablist"][aria-label="Lens"] [data-lens="saved"]');
    await page.waitForURL("**/feed?lens=saved");
    await page.locator('[data-testid="feed-empty"][data-lens="saved"]').waitFor({ timeout: 10000 });
    record(
      tag + " Saved lens: ?lens=saved, honest empty state, scope line",
      (await page.locator("[data-lens-scope]").textContent()).includes("saved"),
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('[data-testid="feed-empty"][data-lens="saved"]').waitFor({ timeout: 15000 });
    record(tag + " lens survives refresh", page.url().includes("lens=saved"));
    const stamp2 = await page.getAttribute("html", "data-shell");
    await page.click('[role="tablist"][aria-label="Lens"] [data-lens="mine"]');
    await page.waitForURL("**/feed?lens=mine");
    await page.locator("[data-feed] article[data-c]").first().waitFor({ timeout: 10000 });
    record(
      tag + " Mine lens: only this member's posts",
      (await page.locator("[data-feed] article[data-c]").count()) === 4,
    );
    await page.goBack();
    await page.waitForURL("**/feed?lens=saved");
    await page.goBack();
    await page.waitForURL((u) => u.pathname === "/feed" && !u.search);
    await page.locator("[data-feed] article[data-c]").first().waitFor({ timeout: 10000 });
    record(
      tag + " back button restores All (no ?lens) with all posts",
      (await page.locator("[data-feed] article[data-c]").count()) === 8 &&
        (await page
          .locator('[role="tablist"][aria-label="Lens"] [role="tab"][aria-selected="true"]')
          .getAttribute("data-lens")) === "all",
    );
    record(
      tag + " shell did not remount across lens changes",
      (await page.getAttribute("html", "data-shell")) === stamp2,
    );
    // For You renders identically to All.
    await page.click('[role="tablist"][aria-label="Lens"] [data-lens="for-you"]');
    await page.waitForURL("**/feed?lens=for-you");
    await page.waitForTimeout(300);
    record(
      tag + " For You identical to All",
      (await page.locator("[data-feed] article[data-c]").count()) === 8,
    );
    await page.click('[role="tablist"][aria-label="Lens"] [data-lens="all"]');
    await page.waitForURL((u) => u.pathname === "/feed" && !u.search);
    await page.waitForTimeout(300);
    // Save and React: existence toggles, no counts.
    const first = page.locator("[data-feed] article[data-c]").nth(0);
    await first.locator('[data-testid="save"]').click();
    await page.waitForTimeout(400);
    await first.locator('[data-testid="react"]').click();
    await page.waitForTimeout(400);
    record(
      tag + " Save and React toggle own rows (aria-pressed), no count rendered",
      db.saves.length === 1 &&
        db.reactions.length === 1 &&
        (await first.locator('[data-testid="save"]').getAttribute("aria-pressed")) === "true" &&
        (await first.locator('[data-testid="react"]').getAttribute("aria-pressed")) === "true",
    );
    // Read more expands the same card in place at /posts/:id; the Feed column's scroll is untouched.
    const scrollTop = () =>
      page.evaluate(() => document.querySelector('[data-scroller="feed"]').scrollTop);
    const third = page.locator("[data-feed] article[data-c]").nth(5);
    await third.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const before = await scrollTop();
    record(tag + " scrolled before opening", before > 0, "scrollTop " + before);
    const readMore = third.locator("[data-read-more]");
    record(tag + " long body clamped with Read more", (await readMore.count()) === 1);
    await readMore.click();
    await page.waitForURL("**/posts/seed-5");
    await third.locator("[data-show-less]").waitFor({ timeout: 10000 });
    await page.waitForTimeout(300);
    const during = await scrollTop();
    record(
      tag + " expanded in place: same card, real route, no dialog, scroll unchanged",
      (await page.locator("[data-feed] article[data-c]").count()) === 8 &&
        (await third.getAttribute("data-expanded")) === "1" &&
        (await third.locator("[data-read-more]").count()) === 0 &&
        (await page.locator('[role="dialog"]').count()) === 0 &&
        (await page.locator("[data-feed] article[data-expanded='1']").count()) === 1 &&
        Math.abs(during - before) <= 1,
      `before ${before} during ${during}`,
    );
    record(
      tag + " expansion: shell not remounted",
      (await page.getAttribute("html", "data-shell")) === stamp2,
    );
    await shot(page, `${tag}-expanded`);
    await noOverflow(page, tag + " expanded");
    await page.goBack();
    await page.waitForURL((u) => u.pathname === "/feed");
    await third.locator("[data-read-more]").waitFor({ timeout: 10000 });
    await page.waitForTimeout(300);
    const after = await scrollTop();
    record(
      tag + " back button collapses; scroll identical",
      (await third.getAttribute("data-expanded")) === "0" && Math.abs(after - before) <= 1,
      `before ${before} after ${after}`,
    );
    // Respond expands too; Show less collapses and pops the URL.
    const respond = third.locator('[data-testid="respond"]');
    await respond.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const before2 = await scrollTop();
    await respond.click();
    await page.waitForURL("**/posts/seed-5");
    await third.locator("[data-show-less]").waitFor({ timeout: 10000 });
    await third.locator("[data-show-less]").click();
    await page.waitForURL((u) => u.pathname === "/feed");
    await page.waitForTimeout(300);
    const after2 = await scrollTop();
    record(
      tag + " Respond expands; Show less collapses and returns the URL; scroll identical",
      (await third.getAttribute("data-expanded")) === "0" && Math.abs(after2 - before2) <= 1,
      `before ${before2} after ${after2}`,
    );
    // Direct load of /posts/:id renders the expanded card as page content with Back to Feed.
    await page.goto(BASE + "/posts/seed-1", { waitUntil: "networkidle" });
    const direct = page.locator('[data-direct-post="seed-1"]');
    await direct.locator("article[data-c]").waitFor({ timeout: 15000 });
    record(
      tag + " direct /posts/:id: shell, expanded card as page content, Back to Feed, no dialog",
      (await page.locator("[data-app-header]").count()) === 1 &&
        (await direct.locator("article[data-c]").count()) === 1 &&
        (await direct.locator("[data-read-more]").count()) === 0 &&
        (await direct.locator("[data-show-less]").count()) === 0 &&
        (await page.locator('[data-testid="back-to-feed"]').count()) === 1 &&
        (await page.locator('[role="dialog"]').count()) === 0 &&
        (await page.locator("[data-sheet-scrim]").count()) === 0,
    );
    await shot(page, `${tag}-direct`);
    await page.click('[data-testid="back-to-feed"]');
    await page.waitForURL((u) => u.pathname === "/feed");
    await page.locator("[data-feed] article[data-c]").first().waitFor({ timeout: 10000 });
    record(tag + " Back to Feed from the direct view lands on Feed", true);
    // Five C stubs render inside the same shell; Home returns to Feed; no remount.
    const stampBefore = await page.getAttribute("html", "data-shell");
    await page.locator('nav[aria-label="Pulse"] button', { hasText: "Connect" }).click();
    await page.waitForURL("**/connect");
    await page.locator('[data-testid="c-stub"][data-c="connect"]').waitFor({ timeout: 10000 });
    record(
      tag + " /connect: stub inside the shell, Connect active, no remount",
      (await page.locator('[data-testid="c-stub"]').textContent()).includes("Connect is next") &&
        (
          await page.locator('nav[aria-label="Pulse"] [aria-current="page"]').textContent()
        ).includes("Connect") &&
        (await page.getAttribute("html", "data-shell")) === stampBefore &&
        (await page.locator("[data-app-header]").count()) === 1,
    );
    await shot(page, `${tag}-stub`);
    await noOverflow(page, tag + " stub");
    await page.click('[data-testid="to-feed"]');
    await page.waitForURL((u) => u.pathname === "/feed");
    record(
      tag + " stub's Feed link returns Home without remount",
      (await page.getAttribute("html", "data-shell")) === stampBefore,
    );
    // Notifications: no dot without rows, empty list; dot with a real unread row; opening marks read.
    record(
      tag + " bell: no dot without a real unread row",
      (await page.locator('[data-testid="bell-dot"]').count()) === 0,
    );
    await page.click('[data-testid="bell"]');
    const list = page.locator('[role="dialog"][aria-label="Notifications"]');
    await list.waitFor({ timeout: 10000 });
    await list.locator('[data-testid="notifications-empty"]').waitFor({ timeout: 10000 });
    record(tag + " bell opens the list with an honest empty state", true);
    await page.waitForTimeout(300);
    await shot(page, `${tag}-notifications-empty`);
    await page.keyboard.press("Escape");
    await page.waitForSelector('[role="dialog"][aria-label="Notifications"]', {
      state: "detached",
    });
    db.notifications.push({
      id: "n1",
      recipient_member_id: UID,
      kind: "connection_accepted",
      c_category: "connect",
      actor_kind: null,
      actor_id: null,
      object_kind: null,
      object_id: null,
      read_at: null,
      created_at: new Date(Date.now() - 5 * 60e3).toISOString(),
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('[data-testid="bell-dot"]').waitFor({ timeout: 15000 });
    record(
      tag + " bell: a dot, never a numeral, once an unread row exists",
      (await page.locator('[data-testid="bell"]').textContent()).trim() === "" &&
        (await page.locator('[data-testid="bell-dot"]').count()) === 1,
    );
    await page.click('[data-testid="bell"]');
    await list.waitFor({ timeout: 10000 });
    const row = list.locator('button[data-kind="connection_accepted"]');
    await row.waitFor({ timeout: 10000 });
    record(
      tag + " list shows the real row with the Connect glyph, spec copy, and unread state",
      (await row.getAttribute("data-unread")) === "1" &&
        (await row.locator('[role="img"][aria-label="Connect"]').count()) === 1 &&
        (await row.textContent()).includes("accepted your intro."),
    );
    await page.waitForTimeout(300);
    await shot(page, `${tag}-notifications`);
    await row.click();
    await page.waitForTimeout(600);
    record(
      tag + " opening a row marks it read (read_at only) and the dot goes",
      db.reads.length === 1 &&
        db.reads[0] === "n1" &&
        (await page.locator('[data-testid="bell-dot"]').count()) === 0 &&
        (await row.getAttribute("data-unread")) === null,
    );
    await page.keyboard.press("Escape");
    // c keypress opens the composer from the shell.
    await page.waitForSelector('[role="dialog"][aria-label="Notifications"]', {
      state: "detached",
    });
    await page.keyboard.press("c");
    await page.locator('section[role="dialog"][aria-label="Compose"]').waitFor({ timeout: 10000 });
    record(tag + " c keypress opens the one composer from the shell", true);
    await page.keyboard.press("Escape");
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 300));
    await shot(page, `${tag}-ERROR`).catch(() => {});
  }
  record(
    tag + " no page errors",
    errors.length === 0,
    errors.slice(0, 3).join(" | ").slice(0, 300),
  );
  await browser.close();
}

// The ten targeted checks of the B2.1 refinement handoff, per tier. Touch scroll capture and the
// drag-armed state are driven with synthetic events (a real finger or file drag cannot be scripted),
// so each asserts the event-level outcome: defaultPrevented on touchmove, the armed DOM before drop.
async function runTargeted(browserType, bname, [w, h]) {
  const tier = w < 640 ? "compact" : w > 1024 ? "expanded" : "medium";
  const tag = `${bname}-${w}x${h}-targeted`;
  const browser = await launch(browserType);
  // Pointer context: check 2 needs a file drag, which only the pointer mode arms; every other
  // check reads the same on either input mode.
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: false,
    isMobile: false,
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const db = makeMockDb();
  seedPosts(db, 10);
  await mockSupabase(page, db);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const feedTop = () =>
    page.evaluate(() => document.querySelector('[data-scroller="feed"]').scrollTop);
  const setFeedTop = (y) =>
    page.evaluate((y) => {
      document.querySelector('[data-scroller="feed"]').scrollTop = y;
    }, y);
  const centre = () => page.locator("[data-app-header]").getAttribute("data-centre");
  const dialog = page.locator('section[role="dialog"][aria-label="Compose"]');
  const closeComposer = async () => {
    await page.keyboard.press("Escape");
    await page.waitForSelector('section[role="dialog"][aria-label="Compose"]', {
      state: "detached",
    });
  };
  try {
    await signIn(page);
    await page.locator("[data-feed] article[data-c]").nth(9).waitFor({ timeout: 15000 });

    // 1. Scroll capture: wheel and touchmove inside the open composer never move the Feed.
    await setFeedTop(160);
    await page.waitForTimeout(100);
    const feedBefore = await feedTop();
    if (tier === "expanded") await page.click("[data-feed] [data-testid='compose']");
    else
      await page.click(
        '[data-testid="compose-floating"], [data-app-header] [data-testid="compose"]',
      );
    await dialog.waitFor({ timeout: 10000 });
    await page.waitForTimeout(400);
    const ta = dialog.locator('textarea[aria-label="What is going on with you"]');
    await ta.fill(
      Array.from({ length: 40 }, (_, i) => `Line ${i + 1} of a long draft.`).join("\n"),
    );
    await page.waitForTimeout(100);
    const taBox = await ta.boundingBox();
    await page.mouse.move(taBox.x + taBox.width / 2, taBox.y + taBox.height / 2);
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 400);
    await page.waitForTimeout(200);
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -400);
    await page.waitForTimeout(200);
    const scrimBox = await page.locator("[data-sheet-scrim]").boundingBox();
    await page.mouse.move(scrimBox.x + 8, scrimBox.y + 8);
    for (let i = 0; i < 4; i++) await page.mouse.wheel(0, 300);
    await page.waitForTimeout(200);
    const touchPrevented = await page.evaluate(() => {
      const ta = document.querySelector('section[role="dialog"] textarea');
      const mk = (target) => {
        const e = new Event("touchmove", { bubbles: true, cancelable: true });
        target.dispatchEvent(e);
        return e.defaultPrevented;
      };
      const scrim = document.querySelector("[data-sheet-scrim]");
      const dlg = document.querySelector('section[role="dialog"]');
      const region = dlg.querySelector(
        "div[style*='overflow-y: auto'], div[style*='overflow-y:auto']",
      );
      const edge = region || dlg;
      edge.scrollTop = edge.scrollHeight;
      return {
        scrim: mk(scrim),
        textareaAtEnd: ((ta.scrollTop = ta.scrollHeight), mk(ta)),
        header: mk(dlg.querySelector("header")),
      };
    });
    const feedAfterWheel = await feedTop();
    record(
      tag +
        " 1. composer open: wheel over the textarea, at its end, and over the scrim; touchmove on scrim and chrome cancelled; Feed did not move",
      feedAfterWheel === feedBefore && touchPrevented.scrim && touchPrevented.header,
      `feed ${feedBefore} -> ${feedAfterWheel} touch ${JSON.stringify(touchPrevented)}`,
    );

    // 2. Armed drop state before the drop lands; drop adds; leaving clears.
    if (tier !== "medium") {
      await ta.fill("");
      const armedSteps = await page.evaluate(async () => {
        const col = document.querySelector("[data-drop-target]");
        const dt = new DataTransfer();
        dt.items.add(new File([new Uint8Array([137, 80, 78, 71])], "a.png", { type: "image/png" }));
        const fire = (type) =>
          col.dispatchEvent(
            new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }),
          );
        const tick = () => new Promise((r) => setTimeout(r, 60));
        fire("dragenter");
        fire("dragover");
        await tick();
        const armedText = (document.querySelector("[data-drop-armed]") || {}).textContent || "";
        const armedAttr = col.getAttribute("data-armed");
        fire("dragleave");
        await tick();
        const afterLeave = col.getAttribute("data-armed");
        fire("dragenter");
        fire("dragover");
        await tick();
        const reArmed = col.getAttribute("data-armed");
        fire("drop");
        await tick();
        const afterDrop = col.getAttribute("data-armed");
        return { armedText, armedAttr, afterLeave, reArmed, afterDrop };
      });
      await page.waitForTimeout(600);
      const thumbs = await dialog.locator("img[alt='']").count();
      record(
        tag +
          " 2. drag over the fields arms (dashed C frame, tint, copy) before release; leaving clears; drop adds the image",
        armedSteps.armedAttr === "1" &&
          /Drop to add up to 4 images/.test(armedSteps.armedText) &&
          armedSteps.afterLeave === "0" &&
          armedSteps.reArmed === "1" &&
          armedSteps.afterDrop === "0" &&
          thumbs >= 1,
        JSON.stringify({ ...armedSteps, thumbs }),
      );
    }
    await closeComposer();

    if (tier !== "expanded") {
      // 3. Header swap at 72px, both directions, and a fast double crossing.
      await setFeedTop(0);
      await page.waitForTimeout(150);
      const atTop = await centre();
      const bellTop = await page.locator('[data-app-header] [data-testid="bell"]').count();
      await setFeedTop(120);
      await page.waitForTimeout(150);
      const past = await centre();
      const bellPast = await page.locator('[data-app-header] [data-testid="bell"]').count();
      const inFlowHidden = await page.evaluate(
        () => getComputedStyle(document.querySelector("[data-feed] [data-lens-anchor]")).visibility,
      );
      await setFeedTop(0);
      await page.waitForTimeout(150);
      const backTop = await centre();
      const bellBack = await page.locator('[data-app-header] [data-testid="bell"]').count();
      // Fast flick: cross the threshold twice inside one frame, ending above it.
      await page.evaluate(() => {
        const sc = document.querySelector('[data-scroller="feed"]');
        sc.scrollTop = 300;
        sc.scrollTop = 20;
        sc.scrollTop = 400;
        sc.scrollTop = 0;
      });
      await page.waitForTimeout(250);
      const flick1 = await centre();
      await page.evaluate(() => {
        const sc = document.querySelector('[data-scroller="feed"]');
        sc.scrollTop = 10;
        sc.scrollTop = 500;
        sc.scrollTop = 30;
        sc.scrollTop = 260;
      });
      await page.waitForTimeout(250);
      const flick2 = await centre();
      const headerH = (await page.locator("[data-app-header]").boundingBox()).height;
      record(
        tag +
          " 3. past 72px the header pill swaps to LensBar" +
          (tier === "compact" ? " and the bell leaves" : ", bell stays") +
          "; back above they return; fast flick settles on the final side; header stays one row",
        atTop === "compose" &&
          bellTop === 1 &&
          past === "lens" &&
          bellPast === (tier === "compact" ? 0 : 1) &&
          inFlowHidden === "hidden" &&
          backTop === "compose" &&
          bellBack === 1 &&
          flick1 === "compose" &&
          flick2 === "lens" &&
          headerH <= 58,
        JSON.stringify({ atTop, past, bellPast, inFlowHidden, backTop, flick1, flick2, headerH }),
      );

      // 4. Floating composer entry: shows while scrolling, hides 2.5s after, opens the composer.
      await setFeedTop(0);
      await page.waitForTimeout(150);
      const fab = page.locator("[data-fab]");
      const fabAtTop = await fab.getAttribute("data-shown");
      await setFeedTop(200);
      await page.waitForTimeout(350);
      const fabMoving = await fab.getAttribute("data-shown");
      const fabKind = await fab.getAttribute("data-fab");
      await page.waitForTimeout(2900);
      const fabIdle = await fab.getAttribute("data-shown");
      await setFeedTop(260);
      await page.waitForTimeout(350);
      const fabAgain = await fab.getAttribute("data-shown");
      await page.click('[data-testid="compose-floating"]');
      await dialog.waitFor({ timeout: 10000 });
      await page.waitForTimeout(350);
      const fabWhileOpen = await fab.count();
      await closeComposer();
      record(
        tag +
          " 4. floating entry (" +
          fabKind +
          ") appears while scrolling, hides ~2.5s after, reappears on the next scroll, opens the composer, absent while it is open",
        fabAtTop === "0" &&
          fabMoving === "1" &&
          fabKind === (tier === "compact" ? "handle" : "tab") &&
          fabIdle === "0" &&
          fabAgain === "1" &&
          fabWhileOpen === 0,
        JSON.stringify({ fabAtTop, fabMoving, fabKind, fabIdle, fabAgain, fabWhileOpen }),
      );
    } else {
      // 5. Independent column scroll.
      await setFeedTop(0);
      await page.waitForTimeout(100);
      const railTops = () =>
        page.evaluate(() =>
          [...document.querySelectorAll("[data-scroller]")].map((el) => [
            el.getAttribute("data-scroller"),
            el.scrollTop,
          ]),
        );
      const mainBox = await page.locator('[data-scroller="feed"]').boundingBox();
      await page.mouse.move(mainBox.x + mainBox.width / 2, mainBox.y + mainBox.height / 2);
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(300);
      const afterFeedWheel = await railTops();
      const leftBox = await page.locator('[data-scroller="left"]').boundingBox();
      await page.mouse.move(leftBox.x + leftBox.width / 2, leftBox.y + leftBox.height / 2);
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(300);
      const afterRailWheel = await railTops();
      const feedMoved = afterFeedWheel.find((r) => r[0] === "feed")[1];
      const feedAfterRail = afterRailWheel.find((r) => r[0] === "feed")[1];
      const railsStill = afterFeedWheel.filter((r) => r[0] !== "feed").every((r) => r[1] === 0);
      const scrollers = afterFeedWheel.length;
      record(
        tag +
          " 5. wheel over the Feed moves only the Feed; wheel over a rail leaves the Feed put (" +
          scrollers +
          " scroll containers)",
        feedMoved > 0 &&
          railsStill &&
          feedAfterRail === feedMoved &&
          scrollers === (w >= 1440 ? 3 : 2),
        JSON.stringify({ afterFeedWheel, afterRailWheel }),
      );

      // 6. Sticky block: control and LensBar pin together once the greeting has left; nothing paints over them.
      await setFeedTop(0);
      await page.waitForTimeout(150);
      const geo0 = await page.evaluate(() => {
        const g = document.querySelector("[data-greeting]").getBoundingClientRect();
        const sc = document.querySelector('[data-scroller="feed"]').getBoundingClientRect();
        return {
          greetBottom: g.bottom - sc.top,
          stuck: document.querySelector("[data-compose-wrap]").getAttribute("data-stuck"),
        };
      });
      await setFeedTop(Math.ceil(geo0.greetBottom) + 8);
      await page.waitForTimeout(250);
      const probe = () =>
        page.evaluate(() => {
          const sc = document.querySelector('[data-scroller="feed"]').getBoundingClientRect();
          const wrap = document.querySelector("[data-compose-wrap]");
          const wb = wrap.getBoundingClientRect();
          const lens = document.querySelector("[data-feed] [data-lens-anchor]");
          const lb = lens.getBoundingClientRect();
          const hits = [];
          for (const y of [
            wb.top + 2,
            wb.top + 30,
            wb.bottom - 2,
            lb.top + 2,
            lb.top + 20,
            lb.bottom - 2,
          ]) {
            const el = document.elementFromPoint(sc.left + sc.width / 2, y);
            hits.push(!!el && (wrap.contains(el) || lens.contains(el)));
          }
          return {
            stuck: wrap.getAttribute("data-stuck"),
            wrapTop: Math.round(wb.top - sc.top),
            wrapH: Math.round(wb.height),
            lensTop: Math.round(lb.top - sc.top),
            hits,
            articleAbove: [...document.querySelectorAll("[data-feed] article")].some(
              (a) =>
                a.getBoundingClientRect().top < lb.bottom - 1 &&
                a.getBoundingClientRect().bottom > sc.top &&
                getComputedStyle(a).zIndex !== "auto",
            ),
          };
        });
      const g1 = await probe();
      await setFeedTop((await feedTop()) + 700);
      await page.waitForTimeout(250);
      const g2 = await probe();
      await setFeedTop((await feedTop()) + 900);
      await page.waitForTimeout(250);
      const g3 = await probe();
      const pinned = (g) =>
        g.stuck === "1" &&
        g.wrapTop === 0 &&
        g.lensTop === g.wrapH &&
        g.hits.every(Boolean) &&
        !g.articleAbove;
      record(
        tag +
          " 6. once the greeting leaves, control and LensBar pin as one block at the column top; no post paints above or through it while scrolling",
        geo0.stuck === "0" && pinned(g1) && pinned(g2) && pinned(g3),
        JSON.stringify({ geo0, g1, g2, g3 }),
      );
    }

    // 7. Read more expands in place; Show less and browser back collapse; scroll unchanged.
    await setFeedTop(0);
    await page.waitForTimeout(150);
    const card = page.locator("[data-feed] article[data-c]").nth(3);
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const t0 = await feedTop();
    await card.locator("[data-read-more]").click();
    await page.waitForURL("**/posts/seed-3");
    await card.locator("[data-show-less]").waitFor({ timeout: 10000 });
    await page.waitForTimeout(250);
    const t1 = await feedTop();
    const expandedCount = await page.locator("[data-feed] article[data-expanded='1']").count();
    await card.locator("[data-show-less]").click();
    await page.waitForURL((u) => u.pathname === "/feed");
    await card.locator("[data-read-more]").waitFor({ timeout: 10000 });
    await page.waitForTimeout(250);
    const t2 = await feedTop();
    await card.locator("[data-read-more]").click();
    await page.waitForURL("**/posts/seed-3");
    await card.locator("[data-show-less]").waitFor({ timeout: 10000 });
    await page.goBack();
    await page.waitForURL((u) => u.pathname === "/feed");
    await card.locator("[data-read-more]").waitFor({ timeout: 10000 });
    await page.waitForTimeout(250);
    const t3 = await feedTop();
    record(
      tag +
        " 7. Read more expands the same card in place at /posts/:id with scroll unchanged; Show less and browser back collapse it and return the URL",
      expandedCount === 1 && t1 === t0 && t2 === t0 && t3 === t0 && page.url().endsWith("/feed"),
      JSON.stringify({ t0, t1, t2, t3, expandedCount, url: page.url() }),
    );

    // 8. Fresh tab on /posts/:id: expanded card as page content, Back to Feed, no modal, no scrim.
    const fresh = await ctx.newPage();
    await mockSupabase(fresh, db);
    await fresh.goto(BASE + "/posts/seed-2", { waitUntil: "networkidle" });
    const direct = fresh.locator('[data-direct-post="seed-2"]');
    await direct.locator("article[data-c]").waitFor({ timeout: 15000 });
    const bodyClamped = await direct.locator("article[data-c] [data-read-more]").count();
    record(
      tag +
        " 8. fresh tab on /posts/:id renders the expanded card as page content with Back to Feed; no dialog, no scrim",
      (await direct.locator("article[data-c]").count()) === 1 &&
        bodyClamped === 0 &&
        (await fresh.locator('[data-testid="back-to-feed"]').count()) === 1 &&
        (await fresh.locator('[role="dialog"]').count()) === 0 &&
        (await fresh.locator("[data-sheet-scrim]").count()) === 0 &&
        (await fresh.locator("[data-feed] [data-lens-anchor]").count()) === 0,
    );
    await shot(fresh, `${tag}-direct`);
    await fresh.close();

    // 9. Active lens tap toggles the descriptor; switching lenses never moves the bar.
    await setFeedTop(0);
    await page.waitForTimeout(150);
    const bar = page.locator('[data-feed] [role="tablist"][aria-label="Lens"]');
    const scope0 = await page.locator("[data-feed] [data-lens-scope]").getAttribute("data-open");
    await bar.locator('[data-lens="all"]').click();
    await page.waitForTimeout(250);
    const scope1 = await page.locator("[data-feed] [data-lens-scope]").getAttribute("data-open");
    await bar.locator('[data-lens="all"]').click();
    await page.waitForTimeout(250);
    const scope2 = await page.locator("[data-feed] [data-lens-scope]").getAttribute("data-open");
    const y0 = (await bar.boundingBox()).y;
    await bar.locator('[data-lens="mine"]').click();
    await page.waitForURL("**/feed?lens=mine");
    await page.locator("[data-feed] article[data-c]").first().waitFor({ timeout: 10000 });
    await page.waitForTimeout(300);
    const y1 = (await bar.boundingBox()).y;
    await bar.locator('[data-lens="saved"]').click();
    await page.waitForURL("**/feed?lens=saved");
    await page.locator('[data-testid="feed-empty"][data-lens="saved"]').waitFor({ timeout: 10000 });
    await page.waitForTimeout(300);
    const y2 = (await bar.boundingBox()).y;
    let pinnedLens = { ok: true };
    if (tier === "expanded") {
      // From the pinned bar too: the bar stays where it is and the header/column do not jump.
      await bar.locator('[data-lens="all"]').click();
      await page.waitForURL((u) => u.pathname === "/feed" && !u.search);
      await page.locator("[data-feed] article[data-c]").nth(9).waitFor({ timeout: 10000 });
      await setFeedTop(600);
      await page.waitForTimeout(300);
      const py0 = (await bar.boundingBox()).y;
      await bar.locator('[data-lens="mine"]').click();
      await page.waitForURL("**/feed?lens=mine");
      await page.locator("[data-feed] article[data-c]").first().waitFor({ timeout: 10000 });
      await page.waitForTimeout(400);
      const py1 = (await bar.boundingBox()).y;
      const stuckAfter = await page.locator("[data-compose-wrap]").getAttribute("data-stuck");
      pinnedLens = { ok: Math.abs(py1 - py0) <= 1 && stuckAfter === "1", py0, py1, stuckAfter };
    } else {
      // From the header slot: the header stays in lens mode and the bar does not move.
      await bar.locator('[data-lens="all"]').click();
      await page.waitForURL((u) => u.pathname === "/feed" && !u.search);
      await page.locator("[data-feed] article[data-c]").nth(9).waitFor({ timeout: 10000 });
      await setFeedTop(400);
      await page.waitForTimeout(300);
      const hb = page.locator('[data-app-header] [role="tablist"][aria-label="Lens"]');
      const py0 = (await hb.boundingBox()).y;
      await hb.locator('[data-lens="mine"]').click();
      await page.waitForURL("**/feed?lens=mine");
      await page.locator("[data-feed] article[data-c]").first().waitFor({ timeout: 10000 });
      await page.waitForTimeout(400);
      const py1 = (await hb.boundingBox()).y;
      const still = await centre();
      pinnedLens = { ok: Math.abs(py1 - py0) <= 1 && still === "lens", py0, py1, still };
    }
    record(
      tag +
        " 9. tapping the active lens toggles the descriptor; switching lenses (in flow and from the pinned or header bar) never moves the bar",
      scope1 !== scope0 && scope2 === scope0 && y0 === y1 && y1 === y2 && pinnedLens.ok,
      JSON.stringify({ scope0, scope1, scope2, y0, y1, y2, pinnedLens }),
    );

    // 10. Header row per tier.
    const head = await page.evaluate(() => {
      const h = document.querySelector("[data-app-header]");
      const slots = [...h.querySelectorAll('nav[data-pulse="inline"] button')].map((b) =>
        b.getBoundingClientRect(),
      );
      const gaps = slots.slice(1).map((r, i) => Math.round(r.left - slots[i].right));
      return {
        height: h.getBoundingClientRect().height,
        slots: slots.length,
        gaps,
        even: gaps.length === 4 && Math.max(...gaps) - Math.min(...gaps) <= 2,
        home: !!h.querySelector('[data-testid="home-item"]'),
        homeIsIcon: !!h.querySelector('[data-testid="home-item"] span[style*="house.svg"]'),
        logoHref: h.querySelector('[data-testid="home"]').getAttribute("href"),
        rows: [...h.querySelectorAll("nav")].length,
      };
    });
    record(
      tag +
        (tier === "expanded"
          ? " 10. expanded header is one row: logo, five Cs spread evenly, Home icon, bell, avatar"
          : " 10. " + tier + " header has no Home icon; the logo goes Home"),
      tier === "expanded"
        ? head.height <= 66 &&
            head.slots === 5 &&
            head.even &&
            head.home &&
            head.homeIsIcon &&
            head.rows === 1
        : !head.home && head.logoHref === "/feed" && head.slots === 0,
      JSON.stringify(head),
    );
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 400));
    await shot(page, `${tag}-ERROR`).catch(() => {});
  }
  record(
    tag + " no page errors",
    errors.length === 0,
    errors.slice(0, 3).join(" | ").slice(0, 300),
  );
  await browser.close();
}

const TARGETED_VIEWPORTS = [
  [390, 844],
  [820, 1180],
  [1280, 800],
  [1536, 960],
];

// Silence when DIA times out or errors: identical to no DIA.
async function runSilence(browserType, bname) {
  const tag = `${bname}-390x844-light-silence`;
  const browser = await launch(browserType);
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  const db = makeMockDb();
  await mockSupabase(page, db, { inferDelay: 5000 });
  try {
    await signIn(page);
    await page.click('[data-testid="compose"]');
    const dialog = page.locator('section[role="dialog"][aria-label="Compose"]');
    await dialog.waitFor();
    await dialog.locator('textarea[aria-label="What is going on with you"]').fill(SAMPLES.convene);
    await dialog.locator('[data-dia="thinking"]').waitFor({ timeout: 3000 });
    await page.waitForTimeout(3800); // budget is 3.5 s (ruling 74)
    record(
      tag + " timeout past 3.5s -> silence, untyped convey, no chip",
      (await dialog.locator("[data-dia]").count()) === 0 &&
        (await dialog.locator('[role="radio"][aria-checked="true"]').count()) ===
          1 /* audience pill only */ &&
        (await dialog
          .locator("article[aria-label='Preview of your post']")
          .getAttribute("data-c")) === "convey",
    );
    await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
    // Short text: no inference at all.
    db.inferCalls = 0;
    await dialog.locator('textarea[aria-label="What is going on with you"]').fill("Hi all");
    await page.waitForTimeout(1200);
    record(tag + " under 8 characters: no inference call", db.inferCalls === 0);
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 300));
  }
  await browser.close();
}

// iOS keyboard surrogate: shrink visualViewport and check data-kb and Publish placement.
async function runKeyboard(browserType, bname) {
  const tag = `${bname}-390x844-keyboard`;
  const browser = await launch(browserType);
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const target = new EventTarget();
    const fake = {
      height: window.innerHeight,
      width: window.innerWidth,
      offsetTop: 0,
      offsetLeft: 0,
      pageTop: 0,
      pageLeft: 0,
      scale: 1,
      addEventListener: (...a) => target.addEventListener(...a),
      removeEventListener: (...a) => target.removeEventListener(...a),
      dispatchEvent: (e) => target.dispatchEvent(e),
    };
    Object.defineProperty(window, "visualViewport", { value: fake, configurable: true });
    window.__setKeyboard = (kb) => {
      fake.height = window.innerHeight - kb;
      target.dispatchEvent(new Event("resize"));
    };
  });
  const db = makeMockDb();
  await mockSupabase(page, db);
  try {
    await signIn(page);
    await page.click('[data-testid="compose"]');
    const dialog = page.locator('section[role="dialog"][aria-label="Compose"]');
    await dialog.waitFor();
    await page.waitForTimeout(500); // the 300ms slide must finish before geometry is measured
    record(tag + " no data-kb before keyboard", (await dialog.getAttribute("data-kb")) === null);
    await dialog.locator('textarea[aria-label="What is going on with you"]').focus();
    await page.evaluate(() => window.__setKeyboard(336));
    await page.waitForTimeout(100);
    record(
      tag + " data-kb=1 while keyboard tracking active",
      (await dialog.getAttribute("data-kb")) === "1",
    );
    const pb = await dialog.getByRole("button", { name: "Publish" }).boundingBox();
    record(
      tag + " Publish stays above the keyboard",
      pb && pb.y + pb.height <= 844 - 336 + 1,
      JSON.stringify(pb),
    );
    await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
    await page.evaluate(() => window.__setKeyboard(0));
    await page.waitForTimeout(100);
    record(tag + " restores on keyboard dismiss", (await dialog.getAttribute("data-kb")) === null);
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 300));
  }
  await browser.close();
}

module.exports = { launch, makeMockDb, seedPosts, mockSupabase, signIn, BASE };

if (require.main === module)
  (async () => {
    const only = process.env.ONLY ? JSON.parse(process.env.ONLY) : null;
    if (process.env.SPECIAL) {
      const specialEngines = [["chromium", chromium]];
      if (process.env.WEBKIT === "1") specialEngines.push(["webkit", webkit]);
      for (const [bname, bt] of specialEngines) {
        if (process.env.SPECIAL.includes("publish"))
          await runPublish(bt, bname, [390, 844], "light");
        if (process.env.SPECIAL.includes("keyboard")) await runKeyboard(bt, bname);
        if (process.env.SPECIAL.includes("silence")) await runSilence(bt, bname);
        if (process.env.SPECIAL.includes("shell"))
          for (const vp of process.env.ONLY ? [JSON.parse(process.env.ONLY)] : VIEWPORTS)
            await runShell(bt, bname, vp);
        if (process.env.SPECIAL.includes("targeted"))
          for (const vp of process.env.ONLY ? [JSON.parse(process.env.ONLY)] : TARGETED_VIEWPORTS)
            await runTargeted(bt, bname, vp);
      }
      const fails = results.filter((r) => !r.ok);
      console.log(`${results.length - fails.length}/${results.length} checks passed`);
      fails.forEach((f) => console.log("FAIL:", f.name, f.detail));
      process.exit(fails.length ? 1 : 0);
    }
    const engines = [["chromium", chromium]];
    if (process.env.WEBKIT === "1") engines.push(["webkit", webkit]);
    for (const [bname, bt] of engines) {
      for (const vp of only ? [only] : VIEWPORTS) {
        for (const theme of only ? [process.env.THEME || "light"] : THEMES)
          await runViewport(bt, bname, vp, theme);
        await runShell(bt, bname, vp);
      }
      if (only) {
        const fails = results.filter((r) => !r.ok);
        console.log(`${results.length - fails.length}/${results.length} checks passed`);
        fails.forEach((f) => console.log("FAIL:", f.name, f.detail));
        process.exit(fails.length ? 1 : 0);
      }
      await runPublish(bt, bname, [390, 844], "light");
      await runPublish(bt, bname, [1280, 800], "dark");
      await runSilence(bt, bname);
      await runKeyboard(bt, bname);
      for (const vp of TARGETED_VIEWPORTS) await runTargeted(bt, bname, vp);
    }
    const fails = results.filter((r) => !r.ok);
    fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
    console.log(`\n${results.length - fails.length}/${results.length} checks passed`);
    fails.forEach((f) => console.log("FAIL:", f.name, f.detail));
    process.exit(fails.length ? 1 : 0);
  })();
