// Handoff 32-A item 5 (rulings 755, 556, 627): the mount arms. Strand compile v1790212533284400
// changes six parts this app binds (Pane, PostCard, FacetRail, LensBar, Select, Input) and adds
// Menu. Every new prop defaults to 92fbdc3's rendering, so each page that binds a changed part gets
// one arm per route: it opens the page, waits for the gate the page's own suite already waits on,
// then reads the part the page binds and asserts it is mounted in its default configuration — no
// new prop's marker, the floors and tracks the part had, and the structure a caller depends on.
// Where a correction is not gated on a prop and 844 ported it anyway, the arm reads the ported
// rendering and says so in the check's name (FacetRail's wrapping chip, Pane's markers, Select's
// focus rendering, which Chat ratified under 1085).
//
// The set is item 5's table as corrected against the tree (555), with Chat's rulings on it:
//   - /convene/events/$id at expanded binds Discovery's Pane, collapsed FacetRail, LensBar and the
//     list's PostCards, and was missing from the table.
//   - ComposerShell is mounted once, in src/routes/_shell.tsx, on every shell route; its Input, its
//     Select (ConveneForm) and its preview PostCard are read from /feed and from /connect.
//   - The header's LensBar renders only where a surface registers one (Feed, and Discovery at
//     compact) and only once the centre column has scrolled; the shell arm reads its absence on the
//     other shell routes, and the Feed and Discovery arms read it where it renders.
//   - /relationship renders neither a Select nor an Input; its arm reads that.
//
// One cell per tier, so each part's tiered form is read once: compact 390 light, medium 820 dark,
// expanded 1280 light. Every arm emits a fixed number of checks for its key, and the page-error
// check is recorded after the flow so a thrown flow still emits it (ruling 228's count).
const M = require("./matrix.cjs");
const { seedAttend, seedGuest } = require("./event.cjs");
const { __seedCorpus: seedCorpus, __full: fullDensity } = require("./discovery.cjs");

const { launch, makeMockDb, seedPosts, mockSupabase, signIn, record, eventId, BASE, SB, VOCAB } = M;

const MOUNT_CELLS = [
  [[390, 844], "light"],
  [[820, 1180], "dark"],
  [[1280, 800], "light"],
];

const SB_RE = SB.replace(/\./g, "\\.");
const CANCELLED_MOCK_FETCH = new RegExp(
  `(?:^|[\\s/])${SB_RE}\\S*\\s+due to access control checks\\.?$`,
);
/** As tests/discovery.cjs reads them: the sandbox's refusals, never the app's. */
const IGNORED_CONSOLE = new RegExp(
  [
    "fonts\\.g",
    "ERR_CONNECTION_RESET",
    "ERR_NAME_NOT_RESOLVED",
    "ERR_FAILED",
    "\\b(?:400|406|500)\\b",
    CANCELLED_MOCK_FETCH.source,
  ].join("|"),
);
const HANDLE = "thandiwe-dube";
/** tests/event.cjs's public page, seeded by seedGuest. */
const SLUG = "corridor-suppers-accra-3f2a1b";
/** matrix.cjs's Convene sample: DIA reads it as an event and fills the form. */
const CONVENE =
  "We are hosting a Diaspora Builders Dinner in Nairobi on Thu 16 Oct at 19:00. Doors at 18:30. Free for members, bring one person who should be in the room.";

async function context(browserType, [w, h], theme, db) {
  const browser = await launch(browserType);
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: w <= 1024,
    isMobile: w < 1024,
    deviceScaleFactor: 1,
    colorScheme: theme,
  });
  const page = await ctx.newPage();
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
  page.on("pageerror", (e) => {
    const text = String(e);
    if (!CANCELLED_MOCK_FETCH.test(text)) errors.push(text);
  });
  page.on("console", (m) => {
    if (m.type() === "error" && !IGNORED_CONSOLE.test(m.text())) errors.push(m.text());
  });
  return { browser, page, errors };
}

const discoveryDb = () => {
  const db = makeMockDb();
  seedPosts(db, 1);
  const E = seedCorpus(db);
  Object.assign(db.discovery, fullDensity(E), { homes: null, fail: false });
  return db;
};

async function openDiscovery(page, path) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-discovery]", { timeout: 20000 });
  await page.waitForFunction(
    () =>
      !!document.querySelector("[data-discovery] [data-lanes], [data-lens-list], [role=alert]") &&
      !document.querySelector('[role="status"][aria-label="Loading Convene"]'),
    null,
    { timeout: 20000 },
  );
}

async function openConnect(page) {
  await page.goto(BASE + "/connect", { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="connect"]', { timeout: 20000 });
  await page.waitForFunction(
    () => !document.querySelector('[role="status"][aria-label^="Loading"]'),
    null,
    { timeout: 20000 },
  );
  await page.waitForTimeout(250);
}

async function openProfile(page, search = "") {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.goto(BASE + "/m/" + HANDLE + search, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="profile"]:not([data-view="loading"])', {
    timeout: 20000,
  });
  await page.waitForTimeout(250);
}

async function hydrated(page) {
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-theme"), null, {
    timeout: 15000,
  });
}

/** Centre the target in its scroller before a click, clear of the sticky bars (connect.cjs's tap). */
async function tap(page, loc) {
  await loc.waitFor({ state: "visible", timeout: 20000 });
  for (let i = 0; i < 4; i++) {
    const clear = await loc.evaluate((el) => {
      const sc = el.closest('[data-scroller="feed"]') || document.scrollingElement;
      const r = el.getBoundingClientRect();
      sc.scrollTop += r.top - Math.min(260, window.innerHeight - 180);
      const b = el.getBoundingClientRect();
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return !!hit && (hit === el || el.contains(hit));
    });
    await page.waitForTimeout(120);
    if (clear) break;
  }
  await loc.click({ timeout: 15000 });
}

async function sheetSettled(page, selector) {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return !!el && getComputedStyle(el).transform === "none";
    },
    selector,
    { timeout: 10000, polling: "raf" },
  );
}

async function scrollCentre(page, y) {
  await page.evaluate((top) => {
    const sc = document.querySelector('[data-scroller="feed"]');
    if (!sc) return;
    sc.scrollTop = top;
    sc.dispatchEvent(new Event("scroll"));
  }, y);
  await page.waitForTimeout(400);
}

// ---- The readers. Each returns { ok, detail } over every node its selector finds, and is not ok
// on an empty set, so an arm cannot pass on a part that did not mount. ----

/**
 * Input at rest (correction 25 §5 absent): not a combobox, no listbox, its line (if any) tied by
 * aria-describedby, the field the part's own child as at 92fbdc3 (Chat's ruling on 25 §5: the
 * compile's wrappers render only for the combobox and the leading glyph), the 44 floor and the 1px
 * edge. The field is the one a label[for] names.
 */
function readInputs(page, scope) {
  return page.evaluate((scope) => {
    const roots = Array.from(document.querySelectorAll(scope));
    const fields = roots.flatMap((r) =>
      Array.from(r.querySelectorAll("input, textarea")).filter(
        (el) =>
          !/^(checkbox|radio|file|hidden|password|submit|button)$/i.test(el.type || "") &&
          el.id &&
          document.querySelector(`label[for="${el.id}"]`),
      ),
    );
    const bad = [];
    for (const el of fields) {
      const cs = getComputedStyle(el);
      const root = el.parentElement;
      const rs = root ? getComputedStyle(root) : null;
      const label = document.querySelector(`label[for="${el.id}"]`);
      const desc = el.getAttribute("aria-describedby");
      const line = desc ? document.getElementById(desc) : null;
      const why = [];
      if (el.getAttribute("role") === "combobox" || el.hasAttribute("aria-expanded"))
        why.push("combobox");
      if (el.hasAttribute("aria-controls") || el.hasAttribute("aria-autocomplete"))
        why.push("combobox ARIA");
      if (document.getElementById(el.id + "-list")) why.push("listbox");
      if (!root || rs.display !== "flex" || rs.flexDirection !== "column" || rs.rowGap !== "6px")
        why.push("field is not the part's own child");
      if (label && label.parentElement !== root) why.push("label is not the field's sibling");
      if (desc && (!line || line.parentElement !== root || !line.textContent.trim()))
        why.push("describedby names no line");
      if (!["true", "false"].includes(el.getAttribute("aria-invalid") || ""))
        why.push("aria-invalid " + el.getAttribute("aria-invalid"));
      if (el.getBoundingClientRect().height < 44) why.push("under the 44 floor");
      if (cs.borderTopWidth !== "1px") why.push("edge " + cs.borderTopWidth);
      if (!el.matches("textarea") && cs.paddingLeft !== "14px") why.push("pad " + cs.paddingLeft);
      if (why.length) bad.push((el.id || el.name) + ": " + why.join(", "));
    }
    return {
      ok: fields.length > 0 && bad.length === 0,
      detail: `${fields.length} field(s)` + (bad.length ? "; " + bad.join(" | ") : ""),
    };
  }, scope);
}

/** Select at rest (24 §5 absent): not invalid, a line only if described, the 44 floor, the 1px
 *  edge and the chevron's 40 pad. */
function readSelects(page, scope) {
  return page.evaluate((scope) => {
    // The select a label[for] names inside the part's own column: a native select another part
    // draws is not read as this one.
    const els = Array.from(document.querySelectorAll(scope)).filter((el) => {
      const root = el.parentElement && el.parentElement.parentElement;
      const label = el.id && document.querySelector(`label[for="${el.id}"]`);
      return (
        !!root && !!label && label.parentElement === root && getComputedStyle(root).rowGap === "6px"
      );
    });
    const bad = [];
    for (const el of els) {
      const cs = getComputedStyle(el);
      const why = [];
      if (el.getAttribute("aria-invalid") === "true") why.push("invalid");
      const desc = el.getAttribute("aria-describedby");
      if (desc && !document.getElementById(desc)) why.push("describedby names no line");
      if (el.getBoundingClientRect().height < 44) why.push("under the 44 floor");
      if (cs.borderTopWidth !== "1px") why.push("edge " + cs.borderTopWidth);
      if (cs.paddingRight !== "40px") why.push("pad " + cs.paddingRight);
      if (why.length) bad.push((el.id || el.name || "select") + ": " + why.join(", "));
    }
    return {
      ok: els.length > 0 && bad.length === 0,
      detail: `${els.length} select(s)` + (bad.length ? "; " + bad.join(" | ") : ""),
    };
  }, scope);
}

/** PostCard's feed face (25 §1 and 23 §2 absent): no presentation marker, not selected, no
 *  aria-current, no ring, the 1.5px identity frame. */
function readCards(page, scope) {
  return page.evaluate((scope) => {
    const els = Array.from(document.querySelectorAll(scope));
    const bad = [];
    for (const el of els) {
      const cs = getComputedStyle(el);
      const why = [];
      if (el.hasAttribute("data-presentation")) why.push("presentation " + el.dataset.presentation);
      if (el.hasAttribute("data-selected")) why.push("data-selected");
      if (el.hasAttribute("aria-current")) why.push("aria-current");
      if (cs.boxShadow !== "none") why.push("shadow " + cs.boxShadow);
      // The inline 1.5px: a display at DPR 1 computes it to 1px (correction 23's own readout).
      if (!el.style.border.startsWith("1.5px ")) why.push("frame " + el.style.border);
      if (why.length) bad.push(why.join(", "));
    }
    return {
      ok: els.length > 0 && bad.length === 0,
      detail: `${els.length} card(s)` + (bad.length ? "; " + bad.join(" | ") : ""),
    };
  }, scope);
}

/** LensBar with no trailing seat (25 §4 absent): no row and no seat, the tablist the wrapper's own
 *  child (tests/matrix.cjs reads its parent for the probe), every child of the tablist a tab, and
 *  the 52 track. */
function readLens(page, selector, tabs) {
  return page.evaluate(
    ({ selector, tabs }) => {
      const els = Array.from(document.querySelectorAll(selector));
      const bad = [];
      for (const t of els) {
        const why = [];
        const kids = Array.from(t.children);
        if (kids.length !== tabs) why.push(kids.length + " children");
        if (kids.some((k) => k.getAttribute("role") !== "tab")) why.push("a child that is no tab");
        if (t.closest("[data-lensbar-row]")) why.push("a trailing row");
        if (t.parentElement && t.parentElement.querySelector("[data-lensbar-trailing]"))
          why.push("a trailing seat");
        if (Math.round(t.getBoundingClientRect().height) !== 52)
          why.push("track " + t.getBoundingClientRect().height);
        if (why.length) bad.push(why.join(", "));
      }
      return {
        ok: els.length === 1 && bad.length === 0,
        detail: `${els.length} bar(s)` + (bad.length ? "; " + bad.join(" | ") : ""),
      };
    },
    { selector, tabs },
  );
}

/** FacetRail's rail form, 24 and 25 with no new axis field: every axis a multi group of chips, the
 *  heading its label alone, and the chips wrapping inside the nav (24 §2, ported under 844). */
function readRail(page, selector) {
  return page.evaluate((selector) => {
    const nav = document.querySelector(selector);
    if (!nav) return { ok: false, detail: "no rail" };
    const why = [];
    const groups = Array.from(nav.querySelectorAll("[data-axis-id]"));
    if (!groups.length) why.push("no axis");
    for (const g of groups) {
      if (g.getAttribute("role") !== "group")
        why.push(g.dataset.axisId + " role " + g.getAttribute("role"));
      if (g.dataset.display !== "chips")
        why.push(g.dataset.axisId + " display " + g.dataset.display);
      if (g.dataset.select !== "multi") why.push(g.dataset.axisId + " select " + g.dataset.select);
    }
    const chips = Array.from(nav.querySelectorAll("[data-option]"));
    if (!chips.length) why.push("no chip");
    const box = nav.getBoundingClientRect();
    const cs = getComputedStyle(nav);
    const right = box.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
    for (const c of chips) {
      const s = getComputedStyle(c);
      if (s.whiteSpace === "nowrap") why.push(c.dataset.option + " nowrap");
      if (c.hasAttribute("role")) why.push(c.dataset.option + " role " + c.getAttribute("role"));
      if (!c.hasAttribute("aria-pressed")) why.push(c.dataset.option + " no aria-pressed");
      if (c.getBoundingClientRect().right > right + 0.5)
        why.push(c.dataset.option + " past the pad");
    }
    if (nav.scrollWidth > nav.clientWidth)
      why.push(`scrolls ${nav.scrollWidth}/${nav.clientWidth}`);
    const heading = nav.querySelector("[data-heading]");
    if (heading) {
      if (heading.querySelector("[data-heading-action]")) why.push("a heading action");
      if (heading.children.length !== 1 || heading.children[0].tagName !== "H2")
        why.push("heading holds more than its label");
    }
    return {
      ok: why.length === 0,
      detail:
        `${groups.length} axes, ${chips.length} chips` + (why.length ? "; " + why.join(" | ") : ""),
    };
  }, selector);
}

// ---- The arms. ----

/** Tag, gate, reads, and the page-error check recorded after the flow, whatever it did. */
async function arm(tag, open, body) {
  M.armStart(tag);
  let session = null;
  try {
    session = await open();
    await body(session);
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 400));
  } finally {
    const errors = session ? session.errors : ["the page never opened"];
    record(
      tag + " no page errors",
      errors.length === 0,
      errors.slice(0, 3).join(" | ").slice(0, 300),
    );
    if (session) await session.browser.close().catch(() => {});
  }
}

async function runMountFeed(bt, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-mount-feed`;
  const header = w <= 1024;
  await arm(
    tag,
    async () => {
      const db = makeMockDb();
      seedPosts(db, 8);
      const s = await context(bt, [w, h], theme, db);
      await signIn(s.page);
      await s.page.locator("[data-feed] article[data-c]").first().waitFor({ timeout: 15000 });
      return s;
    },
    async ({ page }) => {
      const lens = await readLens(page, '[data-feed] [role="tablist"][aria-label="Lens"]', 5);
      record(
        tag + " LensBar in the column: five tabs, no trailing seat, the 52 track",
        lens.ok,
        lens.detail,
      );
      const cards = await readCards(page, "[data-feed] article[data-c]");
      record(
        tag + " PostCard: every card the feed face, unselected, no ring, 1.5px frame",
        cards.ok,
        cards.detail,
      );
      await scrollCentre(page, 400);
      const sel = '[data-app-header] [role="tablist"][aria-label="Lens"]';
      if (header) {
        const hl = await readLens(page, sel, 5);
        record(
          tag + " header LensBar once scrolled: five tabs, no trailing seat, the 52 track",
          hl.ok,
          hl.detail,
        );
      } else {
        const n = await page.locator(sel).count();
        record(tag + " header holds no LensBar at expanded", n === 0, n + " bar(s)");
      }
    },
  );
}

async function runMountPost(bt, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-mount-post`;
  await arm(
    tag,
    async () => {
      const db = makeMockDb();
      seedPosts(db, 8);
      const s = await context(bt, [w, h], theme, db);
      await signIn(s.page);
      await s.page.locator("[data-feed] article[data-c]").first().waitFor({ timeout: 15000 });
      return s;
    },
    async ({ page }) => {
      // The in-place form (ruling 105): Read more on the Feed opens /posts/$id in the column.
      const card = page
        .locator("[data-feed] article[data-c]")
        .filter({ has: page.locator("[data-read-more]") })
        .first();
      await tap(page, card.locator("[data-read-more]"));
      await page.waitForURL("**/posts/**", { timeout: 15000 });
      await page.locator("[data-feed] [data-show-less]").first().waitFor({ timeout: 15000 });
      const open = await readCards(page, '[data-feed] article[data-c][data-expanded="1"]');
      record(
        tag + " in place: the open card is the feed face, unselected, no ring",
        open.ok,
        open.detail,
      );
      const lens = await readLens(page, '[data-feed] [role="tablist"][aria-label="Lens"]', 5);
      record(
        tag + " in place: LensBar stays in the column with no trailing seat",
        lens.ok,
        lens.detail,
      );
      // The direct form: a document load of /posts/$id renders the one card and no lens bar.
      await page.goto(BASE + "/posts/seed-1", { waitUntil: "networkidle" });
      await page.locator('[data-direct-post="seed-1"] article[data-c]').waitFor({ timeout: 15000 });
      const direct = await readCards(page, '[data-direct-post="seed-1"] article[data-c]');
      record(
        tag + " direct: the card is the feed face, unselected, no ring",
        direct.ok,
        direct.detail,
      );
    },
  );
}

/** ComposerShell's one mount, read from a route: ConveneForm's Inputs and Select, the link Input
 *  and the preview PostCard (Chat's ruling: /feed and /connect). */
async function runMountComposer(bt, bname, [w, h], theme, route) {
  const tag = `${bname}-${w}x${h}-${theme}-mount-composer-${route}`;
  await arm(
    tag,
    async () => {
      const db = makeMockDb();
      seedPosts(db, 3);
      const s = await context(bt, [w, h], theme, db);
      await signIn(s.page);
      if (route === "connect") await openConnect(s.page);
      return s;
    },
    async ({ page }) => {
      // The shell's own opener: `c` anywhere outside a field (src/routes/_shell.tsx).
      await page
        .locator("body")
        .click({ position: { x: 1, y: 1 } })
        .catch(() => {});
      await page.keyboard.press("c");
      const dialog = page.locator('section[role="dialog"][aria-label="Compose"]');
      await dialog.waitFor({ timeout: 10000 });
      await sheetSettled(page, 'section[role="dialog"][aria-label="Compose"]');
      record(tag + " gate: the composer opens on /" + route, (await dialog.count()) === 1);
      await dialog.locator('textarea[aria-label="What is going on with you"]').fill(CONVENE);
      await dialog.locator('[data-dia="done"]').waitFor({ timeout: 8000 });
      await dialog.locator('[role="radio"][aria-label^="Host an Event"]').click();
      await dialog
        .locator('[role="radiogroup"][aria-label="Format"] [role="radio"]', {
          hasText: "In person",
        })
        .click();
      await page.waitForTimeout(200);
      const inputs = await readInputs(page, 'section[aria-label="Compose"] [data-convene-form]');
      record(
        tag + " ConveneForm: every Input at rest, no combobox, the part's own structure",
        inputs.ok,
        inputs.detail,
      );
      const selects = await readSelects(
        page,
        'section[aria-label="Compose"] select[data-convene="country"]',
      );
      record(tag + " ConveneForm: the country Select at rest", selects.ok, selects.detail);
      const preview = await readCards(
        page,
        "section[aria-label=\"Compose\"] article[aria-label='Preview of your post']",
      );
      record(
        tag + " preview: the PostCard is the feed face, unselected, no ring",
        preview.ok,
        preview.detail,
      );
      await dialog.getByRole("button", { name: "Add a link" }).click();
      await dialog.locator('input[placeholder="https://"]').waitFor({ timeout: 8000 });
      const link = await readInputs(page, 'section[aria-label="Compose"]');
      const linkOnly = await page.evaluate(() => {
        const el = document.querySelector(
          'section[aria-label="Compose"] input[placeholder="https://"]',
        );
        return (
          !!el &&
          el.getAttribute("role") === null &&
          !el.hasAttribute("aria-expanded") &&
          el.parentElement &&
          getComputedStyle(el.parentElement).rowGap === "6px"
        );
      });
      record(
        tag + " link: the link Input at rest, no combobox, the part's own structure",
        link.ok && linkOnly,
        link.detail,
      );
    },
  );
}

async function runMountConvene(bt, bname, [w, h], theme, path) {
  const lensArm = path !== "/convene";
  const tag = `${bname}-${w}x${h}-${theme}-mount-${lensArm ? "lens" : "convene"}`;
  const compact = w < 640;
  const tabs = VOCAB.convene_lenses.length;
  await arm(
    tag,
    async () => {
      const s = await context(bt, [w, h], theme, discoveryDb());
      await signIn(s.page);
      await openDiscovery(s.page, path);
      if (lensArm)
        await s.page.waitForSelector('[data-discovery][data-lens="online"] [data-discovery-item]', {
          timeout: 20000,
        });
      return s;
    },
    async ({ page }) => {
      const where = compact ? "[data-discovery] [data-lens-anchor]" : "[data-layout-top]";
      const lens = await readLens(
        page,
        `${where} [role="tablist"][aria-label="Convene lens"]`,
        tabs,
      );
      record(
        tag + " LensBar: every lens a tab, no trailing seat, the 52 track",
        lens.ok,
        lens.detail,
      );
      if (lensArm) {
        const on = await page
          .locator(`${where} [role="tab"][data-lens="online"][aria-selected="true"]`)
          .count();
        record(tag + " LensBar: the route's lens is the selected tab", on === 1, on + " selected");
      }
      const cards = await readCards(page, "[data-discovery-item] article[data-c]");
      record(
        tag + " PostCard: every card in the corpus the feed face, unselected, no ring",
        cards.ok,
        cards.detail,
      );
      if (compact) {
        await tap(page, page.locator('[data-testid="browse"]'));
        const dialog = '[role="dialog"][aria-label="Browse"]';
        await page.locator(dialog).waitFor({ timeout: 10000 });
        await page.waitForTimeout(400);
        const rail = await readRail(page, dialog);
        record(
          tag + " FacetRail in the compact Sheet: multi chip groups that wrap, no new axis field",
          rail.ok,
          rail.detail,
        );
        // The chips' 24 §2 height pushes the lower axes past the sheet at compact, so the part
        // draws the scrolling body this repository's Sheet lacks (G30): its last axis is reachable.
        const reach = await page.evaluate(async (sel) => {
          const d = document.querySelector(sel);
          const body = d && d.querySelector("[data-sheet-body]");
          const groups = d ? d.querySelectorAll("[data-axis-id]") : [];
          const last = groups[groups.length - 1];
          if (!body || !last) return { ok: false, detail: "no body or no axis" };
          body.scrollTop = body.scrollHeight;
          await new Promise((r) => setTimeout(r, 200));
          const b = body.getBoundingClientRect();
          const l = last.getBoundingClientRect();
          return {
            ok: l.top >= b.top - 0.5 && l.bottom <= b.bottom + 0.5,
            detail: `last axis ${Math.round(l.top)}-${Math.round(l.bottom)} in ${Math.round(b.top)}-${Math.round(b.bottom)}, ${body.scrollHeight}/${body.clientHeight}`,
          };
        }, dialog);
        record(
          tag + " FacetRail in the compact Sheet: the body scrolls its last axis into reach",
          reach.ok,
          reach.detail,
        );
        await page.keyboard.press("Escape");
        await page.locator(dialog).waitFor({ state: "detached", timeout: 10000 });
        await scrollCentre(page, 400);
        await page.waitForFunction(
          () =>
            getComputedStyle(document.querySelector("[data-discovery] [data-lens-anchor]"))
              .visibility === "hidden",
          null,
          { timeout: 10000 },
        );
        const hl = await readLens(page, '[data-app-header] [role="tablist"]', tabs);
        record(
          tag + " header LensBar once scrolled at compact: no trailing seat, the 52 track",
          hl.ok,
          hl.detail,
        );
      } else {
        const rail = await readRail(page, '[data-scroller="left"] nav[aria-label="Browse"]');
        record(
          tag +
            " FacetRail: multi chip groups that wrap inside the nav, the heading its label alone",
          rail.ok,
          rail.detail,
        );
        const pin = await page.evaluate(() => {
          const nav = document.querySelector('[data-scroller="left"] nav[aria-label="Browse"]');
          const pinEl = nav && nav.querySelector("[data-heading-pin]");
          if (!nav || !pinEl) return { ok: false, detail: "no pin" };
          const s = getComputedStyle(nav);
          return {
            ok:
              pinEl.parentElement === nav &&
              s.overflowY === "auto" &&
              !pinEl.hasAttribute("data-scrolled"),
            detail: `overflowY ${s.overflowY}, scrolled ${pinEl.hasAttribute("data-scrolled")}`,
          };
        });
        record(
          tag + " FacetRail: its own scroller with the heading pinned and at rest (25 §3)",
          pin.ok,
          pin.detail,
        );
      }
    },
  );
}

async function runMountEvent(bt, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-mount-event`;
  const tabs = VOCAB.convene_lenses.length;
  await arm(
    tag,
    async () => {
      const s = await context(bt, [w, h], theme, discoveryDb());
      await signIn(s.page);
      await s.page.goto(BASE + "/convene/events/" + eventId("loaded"), {
        waitUntil: "networkidle",
      });
      await s.page.waitForSelector('[data-discovery][data-pane-open="1"] [data-event-page]', {
        timeout: 20000,
      });
      await s.page.waitForTimeout(400);
      return s;
    },
    async ({ page }) => {
      const pane = await page.evaluate(() => {
        const list = document.querySelector("[data-discovery] [data-pane-list]");
        const grid = list && list.parentElement;
        const section = grid && grid.children[1];
        if (!list || !grid || !section) return { ok: false, detail: "no pane grid" };
        const g = getComputedStyle(grid);
        const s = getComputedStyle(section);
        const tracks = g.gridTemplateColumns.split(" ");
        const cluster = section.querySelector("[data-pane-cluster]");
        const buttons = cluster ? Array.from(cluster.querySelectorAll("button")) : [];
        const why = [];
        if (grid.getAttribute("data-pane-open") !== "true")
          why.push("open " + grid.getAttribute("data-pane-open"));
        if (grid.children[0] !== list) why.push("list is not the first child");
        if (tracks[0] !== "360px" || !(parseFloat(tracks[1]) > 0))
          why.push("tracks " + g.gridTemplateColumns);
        if (
          section.tagName !== "SECTION" ||
          section.hasAttribute("inert") ||
          section.hasAttribute("aria-hidden")
        )
          why.push("section closed");
        if (s.opacity !== "1" || s.visibility !== "visible")
          why.push(`fade ${s.opacity} ${s.visibility}`);
        if (buttons.length !== 1 || buttons[0].getAttribute("aria-label") !== "Back to Discovery")
          why.push("cluster " + buttons.map((b) => b.getAttribute("aria-label")).join(","));
        if (section.querySelector("[data-step]")) why.push("a stepping control");
        return {
          ok: why.length === 0,
          detail: g.gridTemplateColumns + (why.length ? "; " + why.join(" | ") : ""),
        };
      });
      record(
        tag + " Pane: open by default, the 360 list track, one close control and no step pair",
        pane.ok,
        pane.detail,
      );
      const strip = await page.evaluate(() => {
        const nav = document.querySelector('[data-scroller="left"] nav[aria-label="Browse"]');
        if (!nav) return { ok: false, detail: "no strip" };
        const items = nav.querySelectorAll('[role="listitem"]').length;
        const expand = nav.querySelector('button[aria-label="Back to Discovery and show browse"]');
        const wd = Math.round(nav.getBoundingClientRect().width);
        return { ok: wd === 64 && !!expand && items > 0, detail: `width ${wd}, ${items} squares` };
      });
      record(tag + " FacetRail: the collapsed 64 strip beside the pane", strip.ok, strip.detail);
      const lens = await readLens(
        page,
        '[data-layout-top] [role="tablist"][aria-label="Convene lens"]',
        tabs,
      );
      record(tag + " LensBar above the pane: no trailing seat, the 52 track", lens.ok, lens.detail);
      const cards = await readCards(page, "[data-pane-list] article[data-c]");
      record(
        tag + " PostCard in the pane's list: the feed face, unselected, no ring",
        cards.ok,
        cards.detail,
      );
    },
  );
}

async function runMountConnect(bt, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-mount-connect`;
  const expanded = w > 1024;
  await arm(
    tag,
    async () => {
      const db = makeMockDb();
      seedPosts(db, 1);
      const s = await context(bt, [w, h], theme, db);
      await signIn(s.page);
      await openConnect(s.page);
      return s;
    },
    async ({ page }) => {
      const lens = await readLens(page, '[role="tablist"][aria-label="Connect lens"]', 4);
      record(tag + " LensBar: four tabs, no trailing seat, the 52 track", lens.ok, lens.detail);
      if (expanded) {
        const sel = await readSelects(page, 'aside[aria-label="Filters"] select');
        record(tag + " Select: every filter at rest", sel.ok, sel.detail);
      } else {
        await tap(page, page.locator('[data-testid="open-filters"]'));
        const dialog = '[role="dialog"][aria-label="Filters"]';
        await page.locator(dialog).waitFor({ timeout: 10000 });
        await page.waitForTimeout(400);
        const sel = await readSelects(page, dialog + " select");
        record(tag + " Select: every filter in the sheet at rest", sel.ok, sel.detail);
        await page.keyboard.press("Escape");
        await page.locator(dialog).waitFor({ state: "detached", timeout: 10000 });
      }
      await tap(
        page,
        page
          .locator(
            '[role="tablist"][aria-label="Connect lens"] [role="tab"][aria-label^="Suggested:"]',
          )
          .first(),
      );
      const card = page
        .locator('[data-testid="lens-suggested"] [data-testid="member-card"]')
        .first();
      await card.waitFor({ timeout: 15000 });
      await tap(page, card.getByRole("button", { name: "Connect", exact: true }));
      const dialog = '[role="dialog"][aria-label^="Introduce yourself to"]';
      await page.locator(dialog).waitFor({ timeout: 10000 });
      const intro = await readInputs(page, dialog);
      record(
        tag + " IntroSheet: the message Input at rest, the part's own structure",
        intro.ok,
        intro.detail,
      );
    },
  );
}

async function runMountProfile(bt, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-mount-profile`;
  await arm(
    tag,
    async () => {
      const db = makeMockDb();
      seedPosts(db, 2);
      const s = await context(bt, [w, h], theme, db);
      await signIn(s.page);
      await openProfile(s.page);
      return s;
    },
    async (s) => {
      const { page } = s;
      await tap(page, page.locator('[data-testid="edit-profile"]'));
      await page.waitForSelector('[data-testid="profile"][data-edit="1"]', { timeout: 15000 });
      await page.waitForTimeout(300);
      const stance = await readSelects(page, '[data-testid="section-stance"] select');
      record(tag + " StanceBlock: its Selects at rest", stance.ok, stance.detail);
      const selects = await readSelects(
        page,
        '[data-testid="profile"] [data-testid^="section-"] select',
      );
      record(tag + " ProfileSurface: every section Select at rest", selects.ok, selects.detail);
      const inputs = await readInputs(page, '[data-testid="profile"]');
      record(
        tag +
          " ProfileSurface and StanceBlock: every Input at rest, hints tied, the part's own structure",
        inputs.ok,
        inputs.detail,
      );
      // The visitor's IntroSheet, a stranger's view of the same profile.
      const db = makeMockDb();
      seedPosts(db, 2);
      db.profile.mode = "stranger";
      const v = await context(bt, [w, h], theme, db);
      try {
        await signIn(v.page);
        await openProfile(v.page);
        await tap(v.page, v.page.locator('[data-testid="connect-with"]'));
        const dialog = '[role="dialog"][aria-label^="Introduce yourself to"]';
        await v.page.locator(dialog).waitFor({ timeout: 10000 });
        const intro = await readInputs(v.page, dialog);
        record(tag + " visitor IntroSheet: the message Input at rest", intro.ok, intro.detail);
      } finally {
        s.errors.push(...v.errors);
        await v.browser.close().catch(() => {});
      }
    },
  );
}

const freshState = () => ({
  next: "who",
  who: { name: "", username: null, suggestion: null, avatar_path: null, completed: false },
  where: { city: null, country: null, completed: false },
  relationship: {
    stance: "exploring",
    stance_label: "Still exploring",
    declared: false,
    completed: false,
  },
  onboarded_at: null,
});

async function signInTo(page, glob) {
  await page.goto(BASE + "/sign-in", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "member@test.invalid");
  await page.fill('input[type="password"]', "x");
  await page.click('button[type="submit"]');
  await page.waitForURL(glob, { timeout: 15000 });
}

async function runMountOnboarding(bt, bname, [w, h], theme, screen) {
  const tag = `${bname}-${w}x${h}-${theme}-mount-${screen}`;
  await arm(
    tag,
    async () => {
      const db = makeMockDb();
      seedPosts(db, 1);
      db.onboarding.state = freshState();
      const s = await context(bt, [w, h], theme, db);
      await signInTo(s.page, "**/welcome");
      await s.page.waitForSelector('[data-testid="onboarding-who"]', { timeout: 15000 });
      if (screen !== "welcome") {
        const st = db.onboarding.state;
        st.who = {
          name: "Amara Osei",
          username: "amara",
          suggestion: null,
          avatar_path: null,
          completed: true,
        };
        st.next = "where";
        if (screen === "relationship") {
          st.where = { city: "Nairobi", country: "Kenya", completed: true };
          st.next = "relationship";
        }
        await s.page.goto(BASE + "/" + screen, { waitUntil: "domcontentloaded" });
        await s.page.waitForSelector(`[data-testid="onboarding-${screen}"]`, { timeout: 15000 });
      }
      await s.page.waitForTimeout(400);
      return s;
    },
    async ({ page }) => {
      if (screen === "welcome") {
        const inputs = await readInputs(page, '[data-testid="onboarding-who"]');
        record(
          tag + " the name and username Inputs at rest, the part's own structure",
          inputs.ok,
          inputs.detail,
        );
      } else if (screen === "where") {
        const inputs = await readInputs(page, '[data-testid="onboarding-where"]');
        record(tag + " the city Input at rest, the part's own structure", inputs.ok, inputs.detail);
        const sel = await readSelects(page, 'select[data-testid="country"]');
        record(tag + " the country Select at rest", sel.ok, sel.detail);
        // 24 §5 as ratified (1085): Select takes Input's focus rendering, --surface and --ink.
        const focus = await page.evaluate(async () => {
          const el = document.querySelector('select[data-testid="country"]');
          // Resolve the four tokens the way the select resolves them, on a probe with a real edge.
          const probe = document.createElement("div");
          probe.style.border = "1px solid";
          document.body.appendChild(probe);
          const tok = (v, prop) => {
            probe.style[prop] = v;
            return getComputedStyle(probe)[prop];
          };
          const want = {
            surface: tok("var(--surface)", "backgroundColor"),
            sunken: tok("var(--bg-sunken)", "backgroundColor"),
            ink: tok("var(--ink)", "borderTopColor"),
            line: tok("var(--line)", "borderTopColor"),
          };
          probe.remove();
          const read = () => {
            const s = getComputedStyle(el);
            return { bg: s.backgroundColor, edge: s.borderTopColor };
          };
          const rest = read();
          el.focus();
          await new Promise((r) => setTimeout(r, 350));
          const on = read();
          el.blur();
          await new Promise((r) => setTimeout(r, 350));
          const off = read();
          const ok =
            rest.bg === want.sunken &&
            on.bg === want.surface &&
            on.edge === want.ink &&
            off.bg === want.sunken &&
            off.edge === want.line;
          return { ok, detail: JSON.stringify({ rest, on, off, want }) };
        });
        record(
          tag + " the Select takes Input's focus rendering and returns at rest (1085)",
          focus.ok,
          focus.detail.slice(0, 300),
        );
      } else {
        const found = await page.evaluate(() => {
          const main = document.querySelector('[data-testid="onboarding-relationship"]');
          return {
            selects: main.querySelectorAll("select").length,
            fields: main.querySelectorAll(
              'textarea, input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"])',
            ).length,
          };
        });
        record(
          tag + " renders no Select and no Input (item 5's table said it did; 555)",
          found.selects === 0 && found.fields === 0,
          JSON.stringify(found),
        );
      }
    },
  );
}

async function runMountGuest(bt, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-mount-guest`;
  await arm(
    tag,
    async () => {
      const db = makeMockDb();
      seedPosts(db, 1);
      seedAttend(db);
      seedGuest(db);
      const s = await context(bt, [w, h], theme, db);
      // Signed out, on a page of the deployment, then a client navigation (tests/event.cjs's
      // clientGo): a document request would render on the server, which the mock cannot reach.
      await s.page.goto(BASE + "/sign-in", { waitUntil: "networkidle" });
      await s.page.evaluate((p) => {
        window.history.pushState({}, "", p);
        window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
      }, "/e/" + SLUG);
      await s.page.waitForSelector(`[data-public-event="${SLUG}"]`, { timeout: 15000 });
      await s.page.locator("[data-guest-rsvp]").waitFor({ timeout: 10000 });
      return s;
    },
    async ({ page }) => {
      await page.click('[data-testid="guest-going"]');
      const dialog = 'section[role="dialog"][aria-label="I am going"]';
      await page.locator(dialog).waitFor({ timeout: 8000 });
      const inputs = await readInputs(page, dialog);
      record(
        tag + " GuestSheet: the email Input at rest, the part's own structure",
        inputs.ok,
        inputs.detail,
      );
    },
  );
}

async function runMountAuth(bt, bname, [w, h], theme, route) {
  const tag = `${bname}-${w}x${h}-${theme}-mount-${route}`;
  await arm(
    tag,
    async () => {
      const db = makeMockDb();
      seedPosts(db, 1);
      const s = await context(bt, [w, h], theme, db);
      await s.page.goto(BASE + "/" + route, { waitUntil: "domcontentloaded" });
      await s.page.waitForSelector(
        route === "reset" ? '[data-testid="reset-request"]' : 'button[type="submit"]',
        { timeout: 15000 },
      );
      await hydrated(s.page);
      return s;
    },
    async ({ page }) => {
      const inputs = await readInputs(page, "body");
      record(tag + " the email Input at rest, the part's own structure", inputs.ok, inputs.detail);
    },
  );
}

/** Item 5's first row, read on the live view: the header's LensBar is AppHeader's only where a
 *  surface registers one, so the shell routes that register none show none once scrolled. */
async function runMountShell(bt, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-mount-shell`;
  const routes = [
    ["/connect", '[data-testid="connect"]'],
    ["/m/" + HANDLE, '[data-testid="profile"]:not([data-view="loading"])'],
    ["/password", '[data-testid="password"]'],
    ["/collaborate", '[data-testid="c-stub"]'],
  ];
  await arm(
    tag,
    async () => {
      const db = makeMockDb();
      seedPosts(db, 2);
      const s = await context(bt, [w, h], theme, db);
      await signIn(s.page);
      return s;
    },
    async ({ page }) => {
      for (const [path, gate] of routes) {
        await page.goto(BASE + path, { waitUntil: "networkidle" });
        await page.waitForSelector(gate, { timeout: 20000 });
        await scrollCentre(page, 400);
        const n = await page.locator('[data-app-header] [role="tablist"]').count();
        record(
          tag + ` ${path}: the header holds no LensBar (no surface registers one)`,
          n === 0,
          n + " bar(s)",
        );
      }
    },
  );
}

async function runMount(bt, bname, vp, theme) {
  await runMountFeed(bt, bname, vp, theme);
  await runMountPost(bt, bname, vp, theme);
  await runMountComposer(bt, bname, vp, theme, "feed");
  await runMountComposer(bt, bname, vp, theme, "connect");
  await runMountConvene(bt, bname, vp, theme, "/convene");
  await runMountConvene(bt, bname, vp, theme, "/convene/online");
  // At expanded /convene/events/$id is Discovery with the pane (1047); below it is Brief 10's own
  // route, which binds none of the changed parts.
  if (vp[0] > 1024) await runMountEvent(bt, bname, vp, theme);
  await runMountConnect(bt, bname, vp, theme);
  await runMountProfile(bt, bname, vp, theme);
  await runMountOnboarding(bt, bname, vp, theme, "welcome");
  await runMountOnboarding(bt, bname, vp, theme, "where");
  await runMountOnboarding(bt, bname, vp, theme, "relationship");
  await runMountGuest(bt, bname, vp, theme);
  await runMountAuth(bt, bname, vp, theme, "sign-in");
  await runMountAuth(bt, bname, vp, theme, "reset");
  await runMountShell(bt, bname, vp, theme);
}

module.exports = { runMount, MOUNT_CELLS };
