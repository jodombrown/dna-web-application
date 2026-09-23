// Brief 9, the Discovery Dashboard (handoff 31-B item 15): B9-SPEC section 7's exit check in the
// browser, against BASE with the Supabase surface mocked by tests/matrix.cjs, so the real client runs
// against a deterministic `convene_discovery`. One arm per engine, viewport and theme, at the matrix's
// widths plus 1440, the width the right column exists at (730):
//
//   full density   section order is convene_lenses order in the DOM; no section renders without
//                  items; every card is the Feed's PostCard at rest with one DiaLine in words above it;
//                  no digit outside a date or a time; a lane is 320 per card and scrolls on its own;
//                  the LensBar's tabs are the vocabulary's rows; the homes line; the Browse control in
//                  its tier's form; the right column at 1440 and not at 1280.
//   dismissal      `Not this?` takes the item out of its section at once and it stays out on reload.
//   pane           at expanded a card opens the event page as the Pane over the lanes: the rail is 64
//                  wide, the right column is absent, no DIA line renders, and Escape inside it returns
//                  to /convene. Below expanded the card is a route to the page with its Back row.
//   below density  the first section is its heading and one DiaLine sentence, only with `suggest`.
//   no homes       the homes line and the Home axis are absent (1050).
//   error          the one alert, and Try again re-reads.
//   /collaborate   still the C stub (item 2).
//   open link      every card's open control is an a[href] to the member event path (1067).
//
// Handoff 31-D (1063, 1065, 1067, 1068), in `runDiscoveryPlace` on its own viewports:
//
//   lens kept      at 1280 and 1440, from a lens with a facet, the pane keeps that lens behind it
//                  with no second Discovery read, and closing returns to the lens with the facet.
//   place kept     at 390 and 820, Back from an event opened out of a scrolled column and a
//                  sideways lane names Discovery and restores both within 2px.
//   intent         at 1280 with a pointer, hover intent reads the event page before any click; at
//                  390 with touch it does not.
//
// Usage: BASE=https://<preview>.dna-web-application.pages.dev SPECIAL=discovery node tests/matrix.cjs
const M = require("./matrix.cjs");
const { seedAttend, seedAttendCard } = require("./event.cjs");

const {
  launch,
  makeMockDb,
  seedPosts,
  mockSupabase,
  signIn,
  record,
  shot,
  noOverflow,
  eventId,
  BASE,
  SB,
  VOCAB,
  DISCOVERY_SECTIONS,
} = M;

const SB_RE = SB.replace(/\./g, "\\.");
const CANCELLED_MOCK_FETCH = new RegExp(
  `(?:^|[\\s/])${SB_RE}\\S*\\s+due to access control checks\\.?$`,
);
/**
 * Console errors that are the sandbox's and not the app's, as tests/connect.cjs reads them: the
 * aborted font host, a network reset, and the refusals the mock answers on purpose. Anything else
 * the console reports is an error the arm fails on, which is how a render loop (React's "Maximum
 * update depth exceeded", logged and not thrown) reaches a check at all.
 */
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

/** The matrix's widths plus 1440, where the right column exists (730) and 1280 where it does not. */
const DISCOVERY_VIEWPORTS = [...M.VIEWPORTS, [1440, 900]];

const KWAME = {
  id: "00000000-0000-4000-8000-0000000000f2",
  name: "Kwame Mensah",
  handle: "kwame-mensah",
};
const SEFA = { id: "00000000-0000-4000-8000-0000000000f5", name: "Sefa Owusu" };
const ADAEZE = { id: "00000000-0000-4000-8000-0000000000f6", name: "Adaeze Nwosu" };
const NGOZI = { id: "00000000-0000-4000-8000-0000000000f7", name: "Ngozi Eze" };
const LOADED = eventId("loaded");
const CURATED_LINE = "A weaver and a data engineer read the same cloth two ways.";

/** One published Convene event with its post, in the shape the Feed's hydration reads. */
function seedEvent(db, key, { title, mode, days, city }) {
  const id = eventId("discovery-" + key);
  const postId = "post-d-" + key;
  const starts = new Date(Date.now() + days * 86400e3);
  starts.setUTCHours(18, 0, 0, 0);
  db.posts.unshift({
    id: postId,
    author_kind: "member",
    author_id: KWAME.id,
    created_by: KWAME.id,
    author_name: KWAME.name,
    author_handle: KWAME.handle,
    author_avatar_path: null,
    c_category: "convene",
    body: "An evening for members who want to meet the people behind the work. Come as you are, bring one person who should be in the room.",
    anchor_kind: null,
    anchor_id: null,
    created_object_kind: "event",
    created_object_id: id,
    audience: "everyone",
    status: "published",
    published_at: new Date(Date.now() - 3600e3).toISOString(),
    created_at: new Date(Date.now() - 3600e3).toISOString(),
  });
  db.events.push({
    id,
    host_member_id: KWAME.id,
    title,
    starts_at: starts.toISOString(),
    ends_at: null,
    doors_at: null,
    when_text: "An evening",
    mode,
    ticket_kind: "free",
    space_id: null,
    status: "published",
    timezone: mode === "virtual" ? "UTC" : city === "Nairobi" ? "Africa/Nairobi" : "Africa/Accra",
    time_confirmed: true,
    date_confirmed: true,
    expected_window_start: null,
    expected_window_end: null,
    window_basis: null,
    delivery_intent: null,
    cancelled_at: null,
    cancelled_reason: null,
    slug: "discovery-" + key,
    created_at: new Date().toISOString(),
  });
  if (mode !== "virtual")
    db.event_delivery.push({
      id: "d-d-" + key,
      event_id: id,
      kind: "physical",
      position: 0,
      place_id: "dXJuOm1ieHBvaTpmcm9udC1yb29t",
      place_name: "Front Room",
      place_text: null,
      city,
      country: city === "Nairobi" ? "Kenya" : "Ghana",
    });
  if (mode !== "in_person")
    db.event_delivery.push({
      id: "d-d-" + key + "-link",
      event_id: id,
      kind: "meeting_link",
      position: 1,
      url: "https://meet.example/" + key,
    });
  return { event_id: id, post_id: postId, starts_at: starts.toISOString(), mode };
}

/** The corpus every arm reads: the Brief 10 page's loaded event, and six more. */
function seedCorpus(db) {
  seedAttend(db);
  seedAttendCard(db);
  const loadedPage = db.attend.pages[LOADED];
  const E = {
    loaded: {
      event_id: LOADED,
      post_id: "post-e-loaded",
      starts_at: loadedPage.event.starts_at,
      mode: "in_person",
    },
    supper: seedEvent(db, "supper", {
      title: "Corridor Suppers",
      mode: "in_person",
      days: 5,
      city: "Accra",
    }),
    table: seedEvent(db, "table", {
      title: "A long table in Westlands",
      mode: "hybrid",
      days: 9,
      city: "Nairobi",
    }),
    cloth: seedEvent(db, "cloth", {
      title: "Kente and code",
      mode: "hybrid",
      days: 12,
      city: "Accra",
    }),
    readers: seedEvent(db, "readers", { title: "Six readers, one room", mode: "virtual", days: 3 }),
    stream: seedEvent(db, "stream", { title: "Founders on the stream", mode: "virtual", days: 16 }),
    harvest: seedEvent(db, "harvest", { title: "After the harvest", mode: "virtual", days: 22 }),
  };
  return E;
}

const item = (e, reason) => ({ event_id: e.event_id, post_id: e.post_id, reason });

/** Full density (632): all seven sections, the member following one host and one family. */
function fullDensity(E) {
  return {
    sections: {
      follow: [
        item(E.supper, { kind: "follow", host: { id: KWAME.id, name: KWAME.name } }),
        item(E.table, { kind: "follow", host: { id: KWAME.id, name: KWAME.name } }),
      ],
      taste: [
        item(E.cloth, { kind: "taste", family: "culture_arts", label: "Culture and arts" }),
        item(E.table, { kind: "taste", family: "culture_arts", label: "Culture and arts" }),
      ],
      soon: [
        item(E.readers, { kind: "soon", starts_at: E.readers.starts_at, mode: "virtual" }),
        item(E.supper, { kind: "soon", starts_at: E.supper.starts_at, mode: "in_person" }),
      ],
      online: [E.readers, E.stream, E.harvest, E.cloth].map((e) =>
        item(e, { kind: "online", starts_at: e.starts_at, mode: e.mode }),
      ),
      curated: [
        item(E.loaded, { kind: "curated", editor: SEFA, line: CURATED_LINE }),
        item(E.cloth, { kind: "curated", editor: SEFA, line: CURATED_LINE }),
      ],
      near: [
        item(E.supper, { kind: "near", home: { id: "h1", city: "Accra" } }),
        item(E.table, { kind: "near", home: { id: "h2", city: "Nairobi" } }),
      ],
      network: [
        item(E.cloth, { kind: "network", host: ADAEZE }),
        item(E.stream, { kind: "network", going: [ADAEZE, NGOZI] }),
      ],
    },
    follows: [{ ...KWAME, avatar_path: null }],
    subscriptions: [{ family: "culture_arts", label: "Culture and arts" }],
    suggest: null,
  };
}

/** Below density, day one (632, 650): three lanes and the first section's sentence. */
function belowDensity(E) {
  const full = fullDensity(E);
  return {
    sections: {
      online: full.sections.online.slice(0, 2),
      curated: full.sections.curated.slice(0, 1),
      network: full.sections.network.slice(0, 1),
    },
    follows: [],
    subscriptions: [],
    suggest: {
      host: { ...KWAME },
      event_id: E.supper.event_id,
      title: "Corridor Suppers",
      city: "Accra",
    },
  };
}

function setAnswer(db, answer, homes = null) {
  Object.assign(db.discovery, answer, { homes, fail: false });
}

async function context(browserType, [w, h], theme, db) {
  const browser = await launch(browserType);
  const touch = w <= 1024;
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: touch,
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

async function openDiscovery(page, path = "/convene") {
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

/** Rendered text of the surface and its columns, with every date and time taken out. */
async function digitsOutsideDates(page) {
  return page.evaluate(() => {
    const parts = [
      '[data-scroller="feed"]',
      '[data-scroller="left"]',
      '[data-scroller="right"]',
      "[data-layout-top]",
    ]
      .map((s) => document.querySelector(s))
      .filter(Boolean)
      .map((el) => el.innerText || "");
    const date =
      /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?: \d{4})?\b/g;
    const time = /\b\d{1,2}:\d{2}\b/g;
    const text = parts.join("\n").replace(date, "").replace(time, "");
    const m = text.match(/[^\d]{0,24}\d[^\d]{0,24}/);
    return m ? m[0].replace(/\s+/g, " ") : "";
  });
}

async function laneIds(page) {
  return page.$$eval("[data-discovery] [data-lanes] > [data-lane]", (els) =>
    els.map((e) => e.getAttribute("data-lane")),
  );
}

async function runDiscovery(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-discovery`;
  M.armStart(tag);
  const tier = w < 640 ? "compact" : w > 1024 ? "expanded" : "medium";
  const db = makeMockDb();
  seedPosts(db, 1);
  const E = seedCorpus(db);
  setAnswer(db, fullDensity(E));
  const { browser, page, errors } = await context(browserType, [w, h], theme, db);
  try {
    await signIn(page);
    await openDiscovery(page);

    // Section order is convene_lenses order in the DOM (631), and every section renders with items.
    const order = await laneIds(page);
    record(
      tag + " full: the lanes are the seven sections in convene_lenses order (631)",
      order.join(",") === DISCOVERY_SECTIONS.join(","),
      order.join(","),
    );
    const emptyLanes = await page.$$eval("[data-discovery] [data-lanes] > [data-lane]", (els) =>
      els
        .filter((e) => e.querySelectorAll("[data-discovery-item]").length === 0)
        .map((e) => e.getAttribute("data-lane")),
    );
    record(
      tag + " full: no section renders without items, and no sentence without suggest (632, 650)",
      emptyLanes.length === 0 &&
        !(await page.locator("[data-discovery]").innerText()).includes("You follow no host yet"),
      emptyLanes.join(","),
    );
    const names = await page.$$eval("[data-discovery] [data-lanes] > [data-lane] h2", (els) =>
      els.map((e) => e.textContent.trim()),
    );
    record(
      tag + " full: each lane's heading is its convene_lenses name",
      names.join("|") ===
        VOCAB.convene_lenses
          .filter((l) => l.value !== "all")
          .map((l) => l.name)
          .join("|"),
      names.join("|"),
    );

    // Every card is the Feed's PostCard at rest, one DiaLine in words above each (581, 660).
    const cards = await page.$$eval("[data-discovery-item]", (els) =>
      els.map((e) => ({
        articles: e.querySelectorAll("article[data-c]").length,
        c: e.querySelector("article[data-c]")?.getAttribute("data-c"),
        rest: e.querySelector("article[data-c]")?.getAttribute("data-expanded"),
        dia: e.querySelectorAll('[data-dia="done"]').length,
      })),
    );
    record(
      tag + " full: every item is one Convene PostCard at rest under one DiaLine",
      cards.length > 0 &&
        cards.every((c) => c.articles === 1 && c.c === "convene" && c.rest === "0" && c.dia === 1),
      JSON.stringify(cards.slice(0, 3)),
    );
    const lineOf = (section, n = 0) =>
      page
        .locator(`[data-discovery-item][data-section="${section}"]`)
        .nth(n)
        .locator('[data-dia="done"]')
        .innerText();
    const lines = {
      follow: await lineOf("follow"),
      taste: await lineOf("taste"),
      soonOnline: await lineOf("soon", 0),
      soonInPerson: await lineOf("soon", 1),
      online: await lineOf("online"),
      curated: await lineOf("curated"),
      near: await lineOf("near"),
      hosting: await lineOf("network", 0),
      going: await lineOf("network", 1),
    };
    const date =
      /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?: \d{4})?/;
    record(
      tag + " full: DIA's line reads each reason in words (1049)",
      lines.follow.startsWith("Because you follow Kwame Mensah.") &&
        lines.taste.startsWith("Because you follow culture and arts.") &&
        date.test(lines.soonOnline) &&
        /, online\./.test(lines.soonOnline) &&
        date.test(lines.soonInPerson) &&
        !/online/.test(lines.soonInPerson) &&
        /^Online, (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) /.test(lines.online) &&
        lines.curated.startsWith("Sefa Owusu picked this: " + CURATED_LINE) &&
        lines.near.startsWith("Near Accra.") &&
        lines.hosting.startsWith("Adaeze Nwosu, a connection, is hosting.") &&
        lines.going.startsWith("Adaeze Nwosu and Ngozi Eze are going."),
      JSON.stringify(lines),
    );
    const digits = await digitsOutsideDates(page);
    record(tag + " full: no digit outside a date or a time (guardrail)", digits === "", digits);

    // Lanes (685, 731): a card is --lane-card-width wide and the row scrolls on its own.
    const laneGeo = await page.evaluate(() => {
      const row = document.querySelector('[data-lane="online"] [data-lane-row]');
      const slot = row && row.querySelector("[data-discovery-item]");
      if (!row || !slot) return null;
      const cs = getComputedStyle(row);
      const before = row.scrollLeft;
      row.scrollLeft = 200;
      const moved = row.scrollLeft > before;
      row.scrollLeft = before;
      return {
        width: slot.getBoundingClientRect().width,
        overflowX: cs.overflowX,
        snap: cs.scrollSnapType,
        scrolls: row.scrollWidth > row.clientWidth && moved,
      };
    });
    record(
      tag + " full: a lane card is 320 wide and the lane scrolls horizontally with proximity snap",
      !!laneGeo &&
        Math.abs(laneGeo.width - 320) < 0.6 &&
        laneGeo.overflowX === "auto" &&
        // `x proximity` serialises as `x`: proximity is the initial strictness.
        /^x(?: proximity)?$/.test(laneGeo.snap) &&
        laneGeo.scrolls,
      JSON.stringify(laneGeo),
    );

    // The LensBar's tabs are the vocabulary's rows (693), and at medium and above it is its own row
    // above the columns (946).
    const tabs = await page
      .locator('[role="tablist"][aria-label="Convene lens"]')
      .first()
      .locator('[role="tab"]')
      .count();
    record(
      tag + " full: the Convene LensBar carries one tab per convene_lenses row",
      tabs === VOCAB.convene_lenses.length,
      String(tabs),
    );
    record(
      tag + " full: the homes line reads Accra and Nairobi (690)",
      (await page.locator("[data-homes-line]").innerText()).trim() === "Accra and Nairobi",
    );

    if (tier === "compact") {
      // The FacetRail through Sheet from the Browse pill: five axes, no numeral (586).
      await page.locator('[data-testid="browse"]').click();
      const dialog = page.locator('[role="dialog"][aria-label="Browse"]');
      await dialog.waitFor({ timeout: 10000 });
      const groups = await dialog.locator('[role="group"]').count();
      const text = await dialog.innerText();
      record(
        tag + " compact: the Browse pill opens the FacetRail dialog, five axes and no numeral",
        groups === 5 && !/\d/.test(text) && !(await page.locator("[data-scroller=left]").count()),
        `groups ${groups} digit ${/\d/.test(text)}`,
      );
      await dialog.getByRole("button", { name: "Online", exact: true }).click();
      await page.waitForURL((u) => u.searchParams.get("format") === "online", { timeout: 10000 });
      const sent = db.discovery.calls[db.discovery.calls.length - 1] || {};
      record(
        tag + " compact: a facet goes into the query and the projection re-reads with it",
        Array.isArray(sent.p_format) && sent.p_format.join(",") === "online",
        JSON.stringify(sent),
      );
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "detached", timeout: 10000 }).catch(() => undefined);
      record(
        tag + " compact: the applied facet is a removable Chip in the first row",
        (await page.locator("[data-first-row] [data-applied-facets]").innerText()).includes(
          "Online",
        ),
      );
      await openDiscovery(page);
      // 947: past 72px the header takes the lens bar and the in-content bar keeps its space hidden.
      await page.evaluate(() => {
        const sc = document.querySelector('[data-scroller="feed"]');
        sc.scrollTop = 400;
        sc.dispatchEvent(new Event("scroll"));
      });
      await page.waitForFunction(
        () =>
          getComputedStyle(document.querySelector("[data-discovery] [data-lens-anchor]"))
            .visibility === "hidden",
        null,
        { timeout: 10000 },
      );
      record(
        tag + " compact: past 72px the header holds the Convene lens bar (947)",
        (await page.locator('[data-app-header] [role="tablist"] [role="tab"]').count()) ===
          VOCAB.convene_lenses.length,
      );
    } else {
      const rail = await page.evaluate(() => {
        const left = document.querySelector('[data-scroller="left"]');
        const main = document.querySelector('[data-scroller="feed"]');
        const nav = left && left.querySelector('nav[aria-label="Browse"]');
        return {
          nav: !!nav,
          groups: nav ? nav.querySelectorAll('[role="group"]').length : 0,
          apart: !!left && !!main && left !== main && !left.contains(main) && !main.contains(left),
          leftY: left ? getComputedStyle(left).overflowY : "",
          mainY: main ? getComputedStyle(main).overflowY : "",
          top: !!document.querySelector('[data-layout-top] [role="tablist"]'),
          mode: document
            .querySelector('[data-layout-top] [role="tablist"]')
            ?.getAttribute("data-lensbar"),
        };
      });
      record(
        tag + " " + tier + ": nav[aria-label=Browse] is in the left column, five axes (586)",
        rail.nav && rail.groups === 5,
        JSON.stringify(rail),
      );
      record(
        tag +
          " " +
          tier +
          ": rail and lanes scroll on their own under a full-width lens row (945, 946)",
        rail.apart && rail.leftY === "auto" && rail.mainY === "auto" && rail.top,
        JSON.stringify(rail),
      );
      if (tier === "expanded") {
        record(
          tag + " expanded: the lens row reads labels (946)",
          rail.mode === "labels",
          String(rail.mode),
        );
        const right = await page.locator('[data-scroller="right"]').count();
        const follow = right > 0 ? await page.locator('[data-scroller="right"]').innerText() : "";
        record(
          tag +
            " expanded: the right column " +
            (w >= 1440 ? "exists at 1440" : "is absent below 1440") +
            " (730)",
          w >= 1440
            ? right === 1 && follow.includes("Kwame Mensah") && follow.includes("Culture and arts")
            : right === 0,
          `right ${right}`,
        );
      }
    }
    // 1067: every card's open is a real link to the member event path, one per card.
    const opens = await page.$$eval("[data-discovery-item]", (els) =>
      els.map((e) => {
        const a = e.querySelector("[data-read-more]");
        return {
          id: e.getAttribute("data-discovery-item"),
          tag: a ? a.tagName : null,
          href: a ? a.getAttribute("href") : null,
        };
      }),
    );
    const badOpen = opens.filter(
      (o) => o.tag !== "A" || o.href !== "/convene/events/" + encodeURIComponent(o.id),
    );
    record(
      tag + " full: every card's open control is an a[href] to the member event path (1067)",
      opens.length > 0 && badOpen.length === 0,
      JSON.stringify(badOpen.slice(0, 2)),
    );
    await noOverflow(page, tag + " full");
    await shot(page, `${tag}-01-full`);

    // Not this? (1044): out of that section at once, and still out after a reload.
    await openDiscovery(page);
    const target = page.locator(
      `[data-discovery-item="${E.cloth.event_id}"][data-section="curated"]`,
    );
    await target.getByRole("button", { name: "Not this?" }).click();
    await target.waitFor({ state: "detached", timeout: 10000 });
    await openDiscovery(page);
    record(
      tag + " dismissal: the item leaves its section and is absent after reload (1044)",
      db.discovery.dismissals.some(
        (d) => d.p_event === E.cloth.event_id && d.p_section === "curated",
      ) &&
        (await page
          .locator(`[data-discovery-item="${E.cloth.event_id}"][data-section="curated"]`)
          .count()) === 0 &&
        (await page
          .locator(`[data-discovery-item="${E.cloth.event_id}"][data-section="online"]`)
          .count()) === 1,
    );

    // A card's Read more: the pane at expanded (688, 1047), the page's own route below it (1023).
    await page
      .locator(`[data-discovery-item="${LOADED}"][data-section="curated"] [data-read-more]`)
      .click();
    await page.waitForURL((u) => u.pathname === "/convene/events/" + LOADED, { timeout: 10000 });
    await page.waitForSelector('[data-event-page][data-event-state="loaded"]', { timeout: 15000 });
    if (tier === "expanded") {
      const pane = await page.evaluate(() => {
        const nav = document.querySelector('[data-scroller="left"] nav[aria-label="Browse"]');
        return {
          open: !!document.querySelector('[data-discovery][data-pane-open="1"]'),
          rail: nav ? Math.round(nav.getBoundingClientRect().width) : null,
          col: document.querySelector("[data-canvas]")?.getAttribute("data-rail"),
          right: document.querySelectorAll('[data-scroller="right"]').length,
          dia: document.querySelectorAll("[data-discovery] [data-dia]").length,
          lanes: document.querySelectorAll("[data-discovery] [data-lanes] [data-lane]").length,
          back: document.querySelectorAll("[data-event-page] [data-back-row]").length,
          expand: !!document.querySelector(
            'button[aria-label="Back to Discovery and show browse"]',
          ),
        };
      });
      record(
        tag + " pane: the event page in the Pane, rail 64, no right column, no DIA line (688, 612)",
        pane.open &&
          pane.rail === 64 &&
          pane.col === "collapsed" &&
          pane.right === 0 &&
          pane.dia === 0 &&
          pane.lanes > 0 &&
          pane.back === 0 &&
          pane.expand,
        JSON.stringify(pane),
      );
      // 719: Escape fires only while focus is within the pane, so focus goes there first.
      await page.getByRole("button", { name: "Back to Discovery", exact: true }).focus();
      await page.keyboard.press("Escape");
      await page.waitForURL((u) => u.pathname === "/convene", { timeout: 10000 });
      // 1047: a cold arrival at the event's address is the same pane, whatever the member came from.
      await page.goto(BASE + "/convene/events/" + LOADED, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-discovery][data-pane-open="1"] [data-event-page]', {
        timeout: 20000,
      });
      record(
        tag + " pane: a cold arrival at /convene/events/{id} is the pane on Discovery (1047)",
        (await page.locator("[data-event-page] [data-back-row]").count()) === 0 &&
          (await page.locator("[data-discovery] [data-lanes] [data-lane]").count()) > 0,
      );
      await page.getByRole("button", { name: "Back to Discovery", exact: true }).click();
      await page.waitForURL((u) => u.pathname === "/convene", { timeout: 10000 });
      record(
        tag + " pane: Escape inside the pane returns to Discovery with the rail restored (719)",
        (await page
          .locator('[data-scroller="left"] nav[aria-label="Browse"] [role="group"]')
          .count()) === 5,
      );
    } else {
      record(
        tag + " " + tier + ": a card is a route to the event page with its Back row (1023)",
        (await page.locator("[data-discovery]").count()) === 0 &&
          (await page.locator("[data-event-page] [data-back-row]").count()) === 1,
      );
    }

    // Below density (632, 650): the first section is its heading and one DiaLine, only with suggest.
    setAnswer(db, belowDensity(E));
    await openDiscovery(page);
    const below = await laneIds(page);
    const firstLane = page.locator('[data-discovery] [data-lane="follow"]');
    const sentence = await firstLane.locator('[data-dia="done"]').allInnerTexts();
    record(
      tag +
        " below: the first section is its heading and one DiaLine sentence, then the three lanes",
      below.join(",") === "follow,online,curated,network" &&
        (await firstLane.locator("h2").innerText()).trim() === "From communities you follow" &&
        sentence.length === 1 &&
        sentence[0].startsWith(
          "You follow no host yet. Kwame Mensah hosts Corridor Suppers in Accra; follow them and their events start here.",
        ) &&
        (await firstLane.locator("[data-discovery-item]").count()) === 0,
      below.join(",") + " | " + sentence.join(" / "),
    );
    await shot(page, `${tag}-02-below`);

    // No homes (1050): no homes line, no Home axis.
    setAnswer(db, fullDensity(E), []);
    await openDiscovery(page);
    let axes;
    if (tier === "compact") {
      await page.locator('[data-testid="browse"]').click();
      const dialog = page.locator('[role="dialog"][aria-label="Browse"]');
      await dialog.waitFor({ timeout: 10000 });
      axes = await dialog.locator('[role="group"]').count();
      await page.keyboard.press("Escape");
    } else {
      axes = await page
        .locator('[data-scroller="left"] nav[aria-label="Browse"] [role="group"]')
        .count();
    }
    record(
      tag + " no homes: the homes line and the Home axis are absent (1050)",
      (await page.locator("[data-homes-line]").count()) === 0 && axes === 4,
      `axes ${axes}`,
    );

    // The one alert, and Try again re-reads.
    db.discovery.fail = true;
    await page.goto(BASE + "/convene", { waitUntil: "networkidle" });
    const alert = page.locator('[data-discovery] [role="alert"]');
    await alert.waitFor({ timeout: 20000 });
    const alertText = await alert.innerText();
    db.discovery.fail = false;
    await alert.getByRole("button", { name: "Try again" }).click();
    await page.waitForSelector("[data-discovery] [data-lanes] [data-lane]", { timeout: 20000 });
    record(
      tag + " error: Convene could not load, and Try again re-reads the lanes",
      alertText.includes("Convene could not load.") &&
        alertText.includes("Check your connection and try again."),
      alertText,
    );

    // /convene no longer matches the stub route; the other Cs still do (item 2).
    await page.goto(BASE + "/collaborate", { waitUntil: "networkidle" });
    await page.locator('[data-testid="c-stub"][data-c="collaborate"]').waitFor({ timeout: 15000 });
    record(tag + " /collaborate still renders the C stub", true);

    record(tag + " no page errors", errors.length === 0, errors.join(" | ").slice(0, 300));
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 400));
  } finally {
    await browser.close();
  }
}

/**
 * Handoff 31-D's viewports: the two expanded widths the lens is kept at behind the pane, and the two
 * widths below expanded where Back restores the column and the lane. One theme each, alternating,
 * because nothing here reads a colour; the full density arm above covers both themes at every width.
 */
const PLACE_VIEWPORTS = [
  [[390, 844], "light"],
  [[820, 1180], "dark"],
  [[1280, 800], "light"],
  [[1440, 900], "dark"],
];

/** The Feed's hover-intent hold is 80ms (PostCard, ruling 84); the arm waits well past it. */
const INTENT_WAIT_MS = 600;

async function runDiscoveryPlace(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-discovery-place`;
  M.armStart(tag);
  const tier = w < 640 ? "compact" : w > 1024 ? "expanded" : "medium";
  const db = makeMockDb();
  seedPosts(db, 1);
  const E = seedCorpus(db);
  setAnswer(db, fullDensity(E));
  // Every card opens a loaded page here, so the arm reads the place and never the not-found state.
  const loaded = db.attend.pages[LOADED];
  for (const e of Object.values(E))
    if (!db.attend.pages[e.event_id])
      db.attend.pages[e.event_id] = {
        ...loaded,
        event: { ...loaded.event, id: e.event_id, slug: "discovery-" + e.event_id },
      };
  const { browser, page, errors } = await context(browserType, [w, h], theme, db);
  try {
    await signIn(page);

    // Intent (1067): at expanded with a pointer the event page is read on hover, before any click;
    // at compact on touch it is not. The hover is a real mouse move onto the card's open link.
    if (w === 1280 || w === 390) {
      await openDiscovery(page);
      const link = page
        .locator(`[data-discovery-item="${LOADED}"][data-section="curated"] [data-read-more]`)
        .first();
      await link.scrollIntoViewIfNeeded();
      const before = db.attend.reads.length;
      await link.hover();
      await page.waitForTimeout(INTENT_WAIT_MS);
      const read = db.attend.reads.slice(before).includes(LOADED);
      record(
        tag +
          (tier === "expanded"
            ? " intent: hovering a card at expanded with a pointer reads the event page before any click (1067)"
            : " intent: no hover read at compact on touch (1067)"),
        tier === "expanded" ? read : !read,
        JSON.stringify(db.attend.reads.slice(before)),
      );
    }

    if (tier === "expanded") {
      // Lens kept (1063): from a lens with one facet set, the pane opens over that lens with no second
      // Discovery read, and the pane's close returns to the lens with the facet in the query.
      await openDiscovery(page, "/convene/online?format=hybrid");
      await page.waitForSelector('[data-discovery][data-lens="online"] [data-discovery-item]', {
        timeout: 20000,
      });
      await page.waitForTimeout(300);
      const reads = db.discovery.calls.length;
      await page.locator("[data-discovery-item] [data-read-more]").first().click();
      await page.waitForURL((u) => u.pathname.startsWith("/convene/events/"), { timeout: 10000 });
      await page.waitForSelector('[data-discovery][data-pane-open="1"] [data-event-page]', {
        timeout: 20000,
      });
      await page.waitForTimeout(600);
      const behind = await page.locator("[data-discovery]").getAttribute("data-lens");
      record(
        tag + " lens: the pane keeps the lens it opened from behind it, no second read (1063)",
        behind === "online" && db.discovery.calls.length === reads,
        `lens ${behind} reads ${reads} -> ${db.discovery.calls.length}`,
      );
      await page.locator('button[aria-label="Back to Discovery"]').click();
      await page.waitForURL((u) => !u.pathname.startsWith("/convene/events/"), { timeout: 10000 });
      const back = new URL(page.url());
      record(
        tag + " lens: closing the pane returns to that lens with the facet in the query (1063)",
        back.pathname === "/convene/online" &&
          back.searchParams.get("format") === "hybrid" &&
          (await page.locator('[data-discovery][data-lens="online"]').count()) === 1 &&
          (await page.locator('[data-discovery][data-pane-open="1"]').count()) === 0,
        back.pathname + back.search,
      );
    } else {
      // Place kept (1065): scroll the column, scroll one lane sideways, open an event from it; Back
      // names Discovery and restores both.
      await openDiscovery(page);
      const lane = '[data-lane="online"] [data-lane-row]';
      await page.evaluate((sel) => {
        const row = document.querySelector(sel);
        row.scrollIntoView({ block: "center" });
        row.scrollLeft = row.firstElementChild.getBoundingClientRect().width + 12;
      }, lane);
      await page.waitForTimeout(500);
      const measure = (sel) =>
        page.evaluate((sel) => {
          const col = document.querySelector('[data-scroller="feed"]');
          const row = document.querySelector(sel);
          return { col: col ? col.scrollTop : null, lane: row ? row.scrollLeft : null };
        }, sel);
      const was = await measure(lane);
      const second = page.locator(`${lane} > [data-discovery-item]`).nth(1);
      await second.locator("[data-read-more]").click();
      await page.waitForURL((u) => u.pathname.startsWith("/convene/events/"), { timeout: 10000 });
      await page.waitForSelector('[data-event-page][data-event-state="loaded"] [data-back-row]', {
        timeout: 20000,
      });
      const label = (await page.locator("[data-event-page] [data-back-row]").innerText()).trim();
      record(
        tag + " place: the event page's Back row reads Discovery (1065)",
        label === "Discovery",
        label,
      );
      await page.locator("[data-event-page] [data-back-row]").click();
      await page.waitForURL((u) => u.pathname === "/convene", { timeout: 10000 });
      await page.waitForSelector(lane, { timeout: 20000 });
      await page.waitForTimeout(600);
      const now = await measure(lane);
      record(
        tag + " place: Back restores the column's scroll and the lane's position within 2px (1065)",
        was.col > 0 &&
          was.lane > 0 &&
          Math.abs(now.col - was.col) <= 2 &&
          Math.abs(now.lane - was.lane) <= 2,
        JSON.stringify({ was, now }),
      );
    }

    record(tag + " no page errors", errors.length === 0, errors.join(" | ").slice(0, 300));
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 400));
  } finally {
    await browser.close();
  }
}

module.exports = {
  runDiscovery,
  runDiscoveryPlace,
  PLACE_VIEWPORTS,
  DISCOVERY_VIEWPORTS,
  __seedCorpus: seedCorpus,
  __full: fullDensity,
};
