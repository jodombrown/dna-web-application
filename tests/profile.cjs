// Brief 3 profile flows for the responsive matrix (ruling 61): the three views plus editing mode at
// /m/:handle, with the Supabase surface mocked by tests/matrix.cjs so the real client code paths
// run against a deterministic projection of the seeded persona. The eleven targeted checks that
// need a browser (4 to 11) are covered here; checks 1 to 3 are also re-run against the live
// project in the closing report.
// Usage: BASE=https://<preview>.dna-web-application.pages.dev SPECIAL=profile WEBKIT=1 node tests/matrix.cjs
const path = require("path");
const M = require("./matrix.cjs");

const { launch, makeMockDb, seedPosts, mockSupabase, signIn, record, shot, noOverflow, BASE } = M;
const HANDLE = "thandiwe-dube";
const COUNT_RE = /\b\d+\s+(connections?|followers?|mutuals?|following)\b/i;
const CONNECTIONS_ONLY = ["dubepower.co.za", "thandiwedube", "dube.power"];
const ANCHORED_ONLY = ["Clinics that need a site survey", "Find collaborators"];
/** Attesters on the seeded persona who do not share their own profile (ruling 141). */
const UNSHARED_THIRD_PARTIES = ["Kwame Mensah", "Adaeze Nwosu"];

/** What the public page rendered (section ids), kept per run so check 5 can compare owner's View as public with it. */
const seenPublic = new Map();

async function newPage(browserType, [w, h], theme, opts = {}) {
  const browser = await launch(browserType);
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: w <= 1024,
    isMobile: w < 1024,
    deviceScaleFactor: 1,
    colorScheme: theme,
  });
  const page = await ctx.newPage();
  const db = makeMockDb();
  seedPosts(db, 2);
  Object.assign(db.profile, opts.profile || {});
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
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      !/fonts\.g|ERR_CONNECTION_RESET|ERR_NAME_NOT_RESOLVED|ERR_FAILED|406|400/.test(m.text()) &&
      // WebKit's wording for a mocked fetch cancelled by the navigation away from Feed.
      !(/supabase\.co/.test(m.text()) && /access control checks|cancelled/i.test(m.text()))
    )
      errors.push(m.text());
  });
  return { browser, page, db, errors };
}

async function openProfile(page, search = "") {
  // Let the page being left finish its fetches: WebKit reports a fetch cancelled by navigation as
  // a console error, which would count against the profile.
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.goto(BASE + "/m/" + HANDLE + search, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="profile"]:not([data-view="loading"])', {
    timeout: 20000,
  });
  await page.waitForTimeout(250);
}

/**
 * Click after centring the target inside its scroll container. WebKit's own scroll-into-view can
 * leave a control beneath the sticky header or the bottom dock at compact widths, where Playwright
 * then waits on "visible, enabled and stable" until it times out.
 */
async function tap(page, selector) {
  const loc = typeof selector === "string" ? page.locator(selector).first() : selector;
  await loc.waitFor({ state: "visible", timeout: 30000 });
  await loc.evaluate((el) =>
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" }),
  );
  // The masthead may condense on that scroll; let its 300ms height transition finish.
  await page.waitForTimeout(400);
  await loc.click({ timeout: 15000 });
}

/** Flip a Strand Switch by its label with a DOM click (the input is 0 by 0 and the label's hit test
 * is what WebKit keeps retrying); the change handler and the save path are what the check covers. */
async function toggle(page, labelText) {
  const loc = page.locator("label", { hasText: labelText }).first();
  await loc.waitFor({ state: "visible", timeout: 30000 });
  await loc.evaluate((el) => {
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    el.click();
  });
}

/** Page state for a failure detail: URL, view and edit flags, open sections, the toast text. */
async function pageState(page) {
  try {
    return await page.evaluate(() => {
      const root = document.querySelector('[data-testid="profile"]');
      const saves = [...document.querySelectorAll('[data-testid^="section-"]')].filter((n) =>
        [...n.querySelectorAll("button")].some((b) => b.textContent.trim() === "Save"),
      );
      return JSON.stringify({
        url: location.href,
        view: root && root.getAttribute("data-view"),
        edit: root && root.getAttribute("data-edit"),
        open: saves.map((n) => n.getAttribute("data-testid")),
        editBar: !!document.querySelector('[data-testid="edit-bar"]'),
        toast: (document.querySelector('[role="status"]') || {}).textContent || "",
      });
    });
  } catch (e) {
    return "state unavailable: " + String(e).slice(0, 80);
  }
}

const sectionIds = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="section-"]')].map((n) =>
      n.getAttribute("data-testid").slice("section-".length),
    ),
  );

const scroller = (page) =>
  page.evaluate(() => {
    const col = document.querySelector('[data-testid="profile"]');
    const sc = col && col.closest("[data-scroller]");
    return sc ? sc.getAttribute("data-scroller") : null;
  });

async function scrollTo(page, y) {
  await page.evaluate((y) => {
    const col = document.querySelector('[data-testid="profile"]');
    const sc = col && col.closest("[data-scroller]");
    if (sc) sc.scrollTop = y;
  }, y);
  await page.waitForTimeout(250);
}

/** Check 7 at the current scroll position: the masthead state, and the portrait not covered by the app header or the condensed row. */
async function condenseState(page) {
  return page.evaluate(() => {
    const mast = document.querySelector('[data-testid="masthead"]');
    const portrait = document.querySelector('[data-testid="portrait"]');
    const cover = document.querySelector('[data-testid="cover"]');
    const header = document.querySelector("[data-app-header]");
    const condensedRow = document.querySelector('[data-testid="masthead-condensed"]');
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, width: r.width, height: r.height };
    };
    // Whether any sticky/fixed element other than the portrait's own masthead overlaps the portrait.
    const p = portrait && portrait.getBoundingClientRect();
    let covered = false;
    if (p && p.height > 0) {
      const cx = p.left + p.width / 2;
      const cy = p.top + p.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      covered = !!hit && !portrait.contains(hit) && !hit.contains(portrait);
      if (
        covered &&
        (hit.closest('[data-testid="masthead"]') ||
          hit.closest('[data-testid="masthead-condensed"]'))
      )
        covered = false;
    }
    return {
      condensed: mast && mast.getAttribute("data-condensed"),
      condensedRow: !!condensedRow && condensedRow.getBoundingClientRect().height > 0,
      portrait: box(portrait),
      cover: box(cover),
      header: box(header),
      covered,
    };
  });
}

async function runOwner(browserType, bname, vp, theme) {
  const [w, h] = vp;
  const tag = `${bname}-${w}x${h}-${theme} profile owner`;
  const { browser, page, db, errors } = await newPage(browserType, vp, theme, {
    profile: { mode: "owner" },
  });
  try {
    await signIn(page);
    await openProfile(page);
    const view = await page.getAttribute('[data-testid="profile"]', "data-view");
    record(tag + ": owner view", view === "owner", "view=" + view);
    await shot(page, `${bname}-${w}x${h}-${theme}-b3-owner`);
    await noOverflow(page, tag);
    record(
      tag + ": Edit profile, Edit name and headline, View as public, two switches",
      (await page.locator('[data-testid="edit-profile"]').count()) === 1 &&
        (await page.locator('[data-testid="edit-core"]').count()) === 1 &&
        (await page.locator('[data-testid="view-as-public"]').count()) === 1 &&
        (await page.locator('[role="switch"]').count()) === 2,
    );
    record(
      tag + ": badges row with its audience select, per-section selects",
      (await page.locator('[data-testid="badges"]').count()) === 1 &&
        (await page
          .locator(
            '[data-testid="badges"] select, [data-testid="badges"] [aria-label*="Who can see"]',
          )
          .count()) >= 0 &&
        (await page.locator('[data-testid^="section-"] select').count()) >= 8,
    );
    const ids = await sectionIds(page);
    record(
      tag + ": all sections present for the owner (empty ones show their act)",
      [
        "about",
        "segment",
        "origin",
        "where",
        "work",
        "skills",
        "languages",
        "intent",
        "links",
        "convene",
        "collaborate",
        "contribute",
        "convey",
      ].every((x) => ids.includes(x)),
      ids.join(","),
    );
    record(
      tag + ": empty Convey section shows the act that fills it",
      (await page.locator('[data-testid="section-convey"] button').count()) >= 1,
    );
    const text = await page.locator("body").innerText();
    record(
      tag + ": no count of connections, followers or mutuals (check 10)",
      !COUNT_RE.test(text),
      (text.match(COUNT_RE) || [])[0],
    );
    record(tag + ": no completion score", !/\b\d{1,3}\s?%/.test(text) && !/complete/i.test(text));
    record(
      tag + ": no Message action (ruling 117)",
      (await page.getByRole("button", { name: /^Message$/ }).count()) === 0,
    );
    record(
      tag + ": no mate masie on Profile",
      (await page.locator('img[src*="mate-masie"], [data-adinkra="mate-masie"]').count()) === 0,
    );
    record(
      tag + ": local time line renders",
      (await page.locator('[data-testid="local-time"]').count()) >= 1,
    );

    // Check 7: condensing.
    const sc = await scroller(page);
    record(tag + ": profile column lives in a scroll container", !!sc, String(sc));
    const s0 = await condenseState(page);
    record(
      tag + ": masthead not condensed at rest, portrait uncovered",
      s0.condensed === "0" && !s0.covered,
      JSON.stringify(s0),
    );
    await scrollTo(page, 600);
    const s1 = await condenseState(page);
    record(
      tag + ": masthead condenses to the identity row past 120px (check 7)",
      s1.condensed === "1" && s1.condensedRow,
      JSON.stringify(s1),
    );
    await shot(page, `${bname}-${w}x${h}-${theme}-b3-owner-condensed`);
    await noOverflow(page, tag + " condensed");
    await scrollTo(page, 0);
    const s2 = await condenseState(page);
    record(
      tag + ": masthead restores at the top",
      s2.condensed === "0" && !s2.covered,
      JSON.stringify(s2),
    );

    // Switches and visibility save through their own RPC calls.
    const before = db.profile.saves.length;
    await toggle(page, "Share my profile");
    await page.waitForTimeout(600);
    record(
      tag + ": Share switch saves via save_profile_section",
      db.profile.saves.includes("switches"),
      db.profile.saves.slice(before).join(","),
    );
    await toggle(page, "Share my profile");
    await page.waitForTimeout(600);

    // Editing mode (check 6).
    await tap(page, '[data-testid="edit-profile"]');
    await page.waitForSelector('[data-testid="profile"][data-edit="1"]');
    await page.waitForTimeout(300);
    const saveButtons = await page
      .locator('[data-testid^="section-"] button:has-text("Save")')
      .count();
    record(
      tag + ": edit mode opens every editable section at once (check 6)",
      saveButtons >= 10,
      "save buttons " + saveButtons,
    );
    record(
      tag + ": sticky Done bar",
      (await page.locator('[data-testid="edit-bar"]').count()) === 1,
    );
    await scrollTo(page, 700);
    const barBox = await page.locator('[data-testid="edit-bar"]').boundingBox();
    const s3 = await condenseState(page);
    record(
      tag + ": Done bar stays on screen while scrolling",
      !!barBox && barBox.y >= 0 && barBox.y + barBox.height <= h + 1,
      JSON.stringify(barBox),
    );
    record(
      tag + ": edit mode exempt from condensing (check 7)",
      s3.condensed === "0",
      JSON.stringify(s3),
    );
    await scrollTo(page, 0);
    await shot(page, `${bname}-${w}x${h}-${theme}-b3-owner-edit`);
    await noOverflow(page, tag + " edit");
    // One failing save leaves the others intact: about fails at the server, where saves alone; in
    // edit mode every section stays open, the failed draft keeps its text, the saved one refetches.
    db.profile.failSection = "about";
    await page.waitForSelector('[data-testid="profile"][data-edit="1"]');
    const about = page.locator('[data-testid="section-about"]');
    await about.locator("textarea").fill("Edited about text for the matrix run.");
    await tap(page, about.locator('button:has-text("Save")'));
    await page.waitForTimeout(900);
    const aboutStillEditing =
      (await about.locator('button:has-text("Save")').count()) === 1 &&
      (await about.locator("textarea").inputValue()) === "Edited about text for the matrix run.";
    await page.waitForSelector('[data-testid="profile"][data-edit="1"]');
    const where = page.locator('[data-testid="section-where"]');
    await where.locator('button:has-text("Save")').waitFor({ state: "attached", timeout: 30000 });
    await where.locator("input").first().fill("Cape Town, SAST");
    await tap(page, where.locator('button:has-text("Save")'));
    await page.waitForTimeout(900);
    const whereSaved =
      db.profile.saves.includes("where") &&
      (await where.locator("input").first().inputValue()) === "Cape Town, SAST";
    const othersIntact =
      (await page.locator('[data-testid^="section-"] button:has-text("Save")').count()) ===
      saveButtons;
    record(
      tag + ": a failed save on one section leaves the others intact; each saves alone (check 6)",
      aboutStillEditing && whereSaved && othersIntact && !db.profile.saves.includes("about"),
      JSON.stringify({ aboutStillEditing, whereSaved, othersIntact, saves: db.profile.saves }),
    );
    db.profile.failSection = null;
    await tap(page, '[data-testid="edit-done"]');
    await page.waitForSelector('[data-testid="profile"][data-edit="0"]');
    record(tag + ": Done leaves edit mode", true);
    const seenWhere = await page.locator('[data-testid="section-where"]').innerText();
    record(
      tag + ": the saved section shows its new value after refetch",
      /Cape Town/.test(seenWhere),
      seenWhere.slice(0, 80),
    );

    // Check 5: View as public renders exactly what the signed-out page renders.
    await tap(page, '[data-testid="view-as-public"]');
    await page.waitForSelector('[data-testid="as-public-banner"]', { timeout: 15000 });
    await page.waitForTimeout(400);
    const pubIds = await sectionIds(page);
    const html = await page.content();
    record(
      tag + ": View as public shows the public page with the banner",
      (await page.locator('[data-testid="public-page"]').count()) === 1,
    );
    record(
      tag + ": View as public carries no connections-only or anchored content",
      !CONNECTIONS_ONLY.some((t) => html.includes(t)) &&
        !ANCHORED_ONLY.some((t) => html.includes(t)),
    );
    seenPublic.set(`${bname}-${w}x${h}-${theme}-owner`, pubIds.join(","));
    const pubRun = seenPublic.get(`${bname}-${w}x${h}-${theme}-anon`);
    if (pubRun !== undefined)
      record(
        tag + ": View as public matches the signed-out page section for section (check 5)",
        pubRun === pubIds.join(","),
        pubRun + " vs " + pubIds.join(","),
      );
    await shot(page, `${bname}-${w}x${h}-${theme}-b3-owner-as-public`);
    await noOverflow(page, tag + " as public");
    await tap(page, page.getByRole("button", { name: /Back to your profile/ }));
    await page.waitForSelector('[data-testid="profile"][data-view="owner"]');
    record(tag + ": no page errors", errors.length === 0, errors.join(" | ").slice(0, 300));
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 1200) + " | " + (await pageState(page)));
    await shot(page, `${bname}-${w}x${h}-${theme}-b3-owner-FAIL`).catch(() => {});
  }
  await browser.close();
}

async function runVisitor(browserType, bname, vp, theme, mode) {
  const [w, h] = vp;
  const tag = `${bname}-${w}x${h}-${theme} profile visitor ${mode}`;
  const rel = mode === "connected" ? "connected" : "none";
  const { browser, page, db, errors } = await newPage(browserType, vp, theme, {
    profile: { mode, rel },
  });
  try {
    await signIn(page);
    await openProfile(page);
    const view = await page.getAttribute('[data-testid="profile"]', "data-view");
    record(tag + ": member view", view === "member", "view=" + view);
    await shot(page, `${bname}-${w}x${h}-${theme}-b3-visitor-${mode}`);
    await noOverflow(page, tag);
    const ids = await sectionIds(page);
    const text = await page.locator("body").innerText();
    record(
      tag + ": no owner tools",
      (await page
        .locator('[data-testid="edit-profile"], [role="switch"], [data-testid="view-as-public"]')
        .count()) === 0,
    );
    record(
      tag + ": no count of connections, followers or mutuals (check 10)",
      !COUNT_RE.test(text),
      (text.match(COUNT_RE) || [])[0],
    );
    record(
      tag + ": no Message action",
      (await page.getByRole("button", { name: /^Message$/ }).count()) === 0,
    );
    record(
      tag + ": badges shown to a member",
      (await page.locator('[data-testid="badges"]').count()) === 1,
    );
    record(tag + ": empty sections absent for a visitor", !ids.includes("convey"), ids.join(","));
    if (mode === "connected") {
      record(
        tag + ": Connected pill, Follow toggle",
        (await page.locator('[data-testid="connected"]').count()) === 1 &&
          (await page.locator('[data-testid="follow"]').count()) === 1,
      );
      record(tag + ": connections-only Links visible to a connection", ids.includes("links"));
      record(
        tag + ": anchored Intent visible (event host shares an attested event)",
        ids.includes("intent"),
      );
      const n = (text.match(/Lerato Khumalo/g) || []).length;
      record(tag + ": mutuals appear once, as names (check 10)", n === 1, "occurrences " + n);
      record(
        tag + ": DIA line present",
        (await page.locator('[data-testid="dia-line"]').count()) === 1,
      );
      record(
        tag + ": a signed-in member still sees attesters by name",
        /Attested by Kwame Mensah, host/.test(text),
      );
      await tap(page, '[data-testid="follow"]');
      await page.waitForTimeout(700);
      record(
        tag + ": Follow writes member_follows and flips to Following",
        db.profile.follows[0] === "on" &&
          (await page.locator('[data-testid="follow"]').getAttribute("aria-pressed")) === "true",
      );
    }
    if (mode === "anchor") {
      record(
        tag + ": anchored Intent visible to a Space-role sharer (check 4)",
        ids.includes("intent"),
        ids.join(","),
      );
      record(
        tag + ": connections-only Links hidden from a non-connection",
        !ids.includes("links"),
        ids.join(","),
      );
      record(
        tag + ": Connect with action for a non-connection",
        (await page.locator('[data-testid="connect-with"]').count()) === 1,
      );
    }
    if (mode === "stranger") {
      record(
        tag + ": anchored Intent hidden from a stranger (check 4)",
        !ids.includes("intent"),
        ids.join(","),
      );
      record(
        tag + ": connections-only Links hidden from a stranger",
        !ids.includes("links"),
        ids.join(","),
      );
      const html = await page.content();
      record(
        tag + ": connections-only and anchored content absent from the DOM",
        !CONNECTIONS_ONLY.some((t) => html.includes(t)) &&
          !ANCHORED_ONLY.some((t) => html.includes(t)),
      );
      // Relationship states: none -> Connect with opens the composer; sent; received (Accept / Decline).
      await tap(page, '[data-testid="connect-with"]');
      const dialog = page.locator('section[role="dialog"][aria-label="Compose"]');
      await dialog.waitFor({ timeout: 10000 });
      record(
        tag + ": Connect with opens the composer seeded for a connect post",
        (await dialog.count()) === 1,
      );
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      db.profile.rel = "sent";
      await openProfile(page);
      record(
        tag + ": Request sent state",
        (await page.getByRole("button", { name: "Request sent" }).count()) === 1,
      );
      await tap(page, page.getByRole("button", { name: "Request sent" }));
      await page.waitForTimeout(800);
      record(
        tag + ": withdraw returns to Connect with",
        db.profile.requests.includes("PATCH") &&
          (await page.locator('[data-testid="connect-with"]').count()) === 1,
        db.profile.requests.join(","),
      );
      db.profile.rel = "received";
      await openProfile(page);
      record(
        tag + ": received state shows Accept and Decline",
        (await page.getByRole("button", { name: "Accept" }).count()) === 1 &&
          (await page.getByRole("button", { name: "Decline" }).count()) === 1,
      );
      await tap(page, page.getByRole("button", { name: "Accept" }));
      await page.waitForTimeout(900);
      record(
        tag + ": Accept becomes Connected",
        (await page.locator('[data-testid="connected"]').count()) === 1,
      );
      await shot(page, `${bname}-${w}x${h}-${theme}-b3-visitor-connected-after-accept`);
    }
    await scrollTo(page, 600);
    const s1 = await condenseState(page);
    record(
      tag + ": masthead condenses on scroll (check 7)",
      s1.condensed === "1" && s1.condensedRow,
      JSON.stringify(s1),
    );
    await noOverflow(page, tag + " condensed");
    record(tag + ": no page errors", errors.length === 0, errors.join(" | ").slice(0, 300));
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 1200) + " | " + (await pageState(page)));
    await shot(page, `${bname}-${w}x${h}-${theme}-b3-visitor-${mode}-FAIL`).catch(() => {});
  }
  await browser.close();
}

async function runPublic(browserType, bname, vp, theme) {
  const [w, h] = vp;
  const tag = `${bname}-${w}x${h}-${theme} profile public`;
  const compact = w < 744;
  const expanded = w > 1024;
  const { browser, page, errors } = await newPage(browserType, vp, theme, {
    profile: { mode: "stranger", switches: { shared: true, private: false } },
  });
  try {
    await openProfile(page);
    const view = await page.getAttribute('[data-testid="profile"]', "data-view");
    record(tag + ": anonymous view", view === "anon", "view=" + view);
    await shot(page, `${bname}-${w}x${h}-${theme}-b3-public`);
    await noOverflow(page, tag);
    const ids = await sectionIds(page);
    seenPublic.set(`${bname}-${w}x${h}-${theme}-anon`, ids.join(","));
    const html = await page.content();
    record(
      tag + ": public page chrome, no shell",
      (await page.locator('[data-testid="public-page"]').count()) === 1 &&
        (await page.locator("[data-app-header]").count()) === 0,
    );
    record(
      tag + ": core row plus Everyone sections only (check 1)",
      ids.includes("about") &&
        ids.includes("work") &&
        !ids.includes("links") &&
        !ids.includes("intent"),
      ids.join(","),
    );
    record(
      tag + ": no connections-only or anchored content in the DOM (check 1)",
      !CONNECTIONS_ONLY.some((t) => html.includes(t)) &&
        !ANCHORED_ONLY.some((t) => html.includes(t)),
    );
    record(
      tag + ": noindex on the public profile (check 11)",
      (await page.locator('meta[name="robots"][content="noindex"]').count()) >= 1,
    );
    record(
      tag + ": no badges row, no relationship actions for the public",
      (await page.locator('[data-testid="badges"], [data-testid="relationship"]').count()) === 0,
    );
    const text = await page.locator("body").innerText();
    record(
      tag + ": no count of connections, followers or mutuals (check 10)",
      !COUNT_RE.test(text),
      (text.match(COUNT_RE) || [])[0],
    );
    record(
      tag + ": third parties render as roles, never by name (ruling 141)",
      !UNSHARED_THIRD_PARTIES.some((n) => html.includes(n)) &&
        /Attested by the host/.test(text) &&
        !/Attested by the host,/.test(text),
      (text.match(/Attested by [^·\n]+/) || [])[0],
    );
    record(
      tag + ": five-C close with C deck and Join DNA",
      (await page.locator('[data-testid="c-deck"] [data-testid^="c-card-"]').count()) === 5 &&
        (await page.locator('[data-testid="join-dna"]').count()) === 1,
    );
    if (expanded) {
      const col = await page.locator('[data-testid="public-column"]').boundingBox();
      record(
        tag + ": 960 column centred, no rails (check 9)",
        !!col &&
          Math.round(col.width) === 960 &&
          Math.abs(col.x - (w - 960) / 2) <= 2 &&
          (await page.locator("[data-scroller='left'], [data-scroller='right']").count()) === 0,
        JSON.stringify(col),
      );
    } else {
      // Check 8: the C row snap-scrolls; tap opens the bottom sheet; type fills the column.
      const deck = await page.evaluate(() => {
        const d = document.querySelector('[data-testid="c-deck"]');
        const cs = getComputedStyle(d);
        return {
          snap: cs.scrollSnapType,
          overflowX: cs.overflowX,
          scrollWidth: d.scrollWidth,
          clientWidth: d.clientWidth,
        };
      });
      record(
        tag + ": five-C row snap-scrolls (check 8)",
        /x/.test(deck.snap) && deck.scrollWidth > deck.clientWidth,
        JSON.stringify(deck),
      );
      await page.locator('[data-testid="c-deck"]').evaluate((d) => d.scrollTo({ left: 0 }));
      await tap(page, '[data-testid="c-card-convene"]');
      await page.waitForSelector('[data-testid="c-sheet"]', { timeout: 10000 });
      await page.waitForTimeout(500);
      const sheet = await page.locator('[data-testid="c-sheet"]').boundingBox();
      const dialog = await page.locator('[role="dialog"]').last().boundingBox();
      record(
        tag + ": tap opens the sheet and the type fills the column (check 8)",
        !!sheet &&
          !!dialog &&
          sheet.width >= (compact ? w - 48 : 480) &&
          dialog.y + dialog.height >= h - 2,
        JSON.stringify({ sheet, dialog }),
      );
      record(
        tag + ": attestation rail in the sheet",
        (await page.locator('[data-testid="c-sheet"] [data-testid="attestation-rail"]').count()) ===
          1,
      );
      await shot(page, `${bname}-${w}x${h}-${theme}-b3-public-sheet`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    }
    await scrollTo(page, 600);
    const s1 = await condenseState(page);
    record(
      tag + ": masthead condenses on scroll (check 7)",
      s1.condensed === "1" && s1.condensedRow,
      JSON.stringify(s1),
    );
    await shot(page, `${bname}-${w}x${h}-${theme}-b3-public-condensed`);
    await noOverflow(page, tag + " condensed");
    await scrollTo(page, 0);
    record(tag + ": no page errors", errors.length === 0, errors.join(" | ").slice(0, 300));
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 1200) + " | " + (await pageState(page)));
    await shot(page, `${bname}-${w}x${h}-${theme}-b3-public-FAIL`).catch(() => {});
  }
  await browser.close();
}

async function runGate(browserType, bname, vp, theme) {
  const [w, h] = vp;
  const tag = `${bname}-${w}x${h}-${theme} profile share off`;
  const { browser, page, errors } = await newPage(browserType, vp, theme, {
    profile: { mode: "stranger", switches: { shared: false, private: false } },
  });
  try {
    await openProfile(page);
    const view = await page.getAttribute('[data-testid="profile"]', "data-view");
    const html = await page.content();
    record(
      tag + ": members-only prompt with Sign in and Join DNA (check 2)",
      view === "gate" &&
        (await page.getByRole("button", { name: "Sign in" }).count()) >= 1 &&
        (await page.getByRole("button", { name: "Join DNA" }).count()) >= 1,
      "view=" + view,
    );
    record(
      tag + ": no profile data in the response (check 2)",
      !html.includes("Thandiwe") && !html.includes("Solar engineer"),
    );
    await shot(page, `${bname}-${w}x${h}-${theme}-b3-gate`);
    await noOverflow(page, tag);
    await tap(page, page.getByRole("button", { name: "Join DNA" }));
    await page.waitForTimeout(1500);
    record(
      tag + ": Join DNA leads to sign-up",
      /\/sign-in\?join=(1|true)$/.test(page.url()),
      page.url(),
    );
    record(tag + ": no page errors", errors.length === 0, errors.join(" | ").slice(0, 300));
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 1200) + " | " + (await pageState(page)));
  }
  await browser.close();
}

/** One viewport, one theme: public, gate, owner, and the three visitor personas. */
async function runProfile(browserType, bname, vp, theme) {
  const full = M.FULL_PREVIEW_AT.has(vp[0]) || process.env.SPECIAL;
  await runPublic(browserType, bname, vp, theme);
  await runGate(browserType, bname, vp, theme);
  await runOwner(browserType, bname, vp, theme);
  if (full) {
    await runVisitor(browserType, bname, vp, theme, "connected");
    await runVisitor(browserType, bname, vp, theme, "anchor");
    await runVisitor(browserType, bname, vp, theme, "stranger");
  }
}

module.exports = { runProfile, runOwner, runVisitor, runPublic, runGate };
