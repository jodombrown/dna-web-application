// Brief 9, the Discovery Dashboard, as handoff 32-B rebuilds it (items 1 to 7 and 12, with Addenda 1
// and 3): B9-SPEC's exit check in the browser, against BASE with the Supabase surface mocked by
// tests/matrix.cjs, so the real client runs against a deterministic `convene_discovery`. One arm per
// engine, viewport and theme, at the matrix's widths plus 1440 and 1600, where the pane and the rail
// are read at three expanded widths (Done Means 3):
//
//   full density   the nine lanes in convene_lanes order, each named from the vocabulary in the
//                  display face at 22, none without items; every card PostCard's discovery face at
//                  320 with 16:9 media and a title clamped to two lines whose height is held; the
//                  reason row in words on the four relationship lanes and empty on the other five;
//                  the where line; no digit outside the when line; See all on six lanes and not on
//                  This weekend, New this week or Near your homes; the LensBar's five lenses with
//                  labels and icons and no trailing seat; the homes line; no right column; the rail
//                  collapsed at first load with nothing written; the facet set and order with its
//                  words and no Donation; the rail's toggle written per band, never at compact.
//   menu           Share, Copy link, Save or Saved, Add to calendar only when going, a rule, Follow
//                  or Following, Subscribe or Subscribed, a rule, Not this; absent items absent and
//                  none disabled; Not this takes the card out of its lane with the toast, and it
//                  stays out on reload.
//   pane           at expanded the title opens the event page as the Pane over the lanes, the rail
//                  its 64 strip, no right column, the card ringed; Previous and Next step through
//                  the lane in its visible order past a dismissal; Escape returns to Discovery.
//                  Below expanded the title is a route to the page with its Back row.
//   below density  the Communities lane is its heading and DIA's one sentence, only with `suggest`.
//   no homes       the homes line and the Home axis are absent (1050).
//   error          the one alert, and Try again re-reads.
//   /collaborate   still the C stub.
//
// `runDiscoveryFacets`, on four viewports (Addendum 1's Done Means 6 and item 12's facet rows):
//
//   redirects      /convene/soon, /convene/online and /convene/near land on /convene with the
//                  when, the format or nothing, keeping the rest of the query (item 1).
//   donation       a price of donation in the URL never reaches the projection (1095).
//   place          the combobox offers places by kind, a pick narrows the lanes to it, Near reads
//                  "While you are in {city}", and the chosen place is a chip that removes it.
//   ladders        one ladder per home on a two-home fixture, the region rung absent for a home
//                  with no region; each rung narrows and Anywhere clears the home (1110).
//   writes         Follow, Subscribe, Save and Add to calendar through their existing paths.
//   rail memory    a toggle survives a reload at its band and leaves the other band collapsed
//                  (1111), and compact writes nothing.
//
// `runDiscoveryPlace` (handoff 31-D: 1063, 1065, 1067), on its own viewports: the lens kept behind
// the pane with no second read, the column and a lane restored on Back, and hover intent.
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
  UID,
  VOCAB,
  DISCOVERY_SECTIONS,
  DISCOVERY_LENSES,
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

/** The matrix's widths plus 1440 and 1600: the pane and the rail at three expanded widths. */
const DISCOVERY_VIEWPORTS = [...M.VIEWPORTS, [1440, 900], [1600, 1000]];

const KWAME = {
  id: "00000000-0000-4000-8000-0000000000f2",
  name: "Kwame Mensah",
  handle: "kwame-mensah",
};
const ADAEZE = {
  id: "00000000-0000-4000-8000-0000000000f6",
  name: "Adaeze Nwosu",
  handle: "adaeze-nwosu",
};
const SEFA = { id: "00000000-0000-4000-8000-0000000000f5", name: "Sefa Owusu" };
const NGOZI = { id: "00000000-0000-4000-8000-0000000000f7", name: "Ngozi Eze" };
const LOADED = eventId("loaded");
const CURATED_LINE = "A weaver and a data engineer read the same cloth two ways.";
const LONG_TITLE =
  "After the harvest: an evening of stories from growers, buyers and the people who finance the season in between";

/** Addendum 1's two-home fixture: Accra holds a stored region, Nairobi none (1110). */
const H1 = "00000000-0000-4000-8000-0000000000a1";
const H2 = "00000000-0000-4000-8000-0000000000a2";
const HOMES = [
  { id: H1, city: "Accra", place_name: "Accra", region: "Greater Accra", country: "Ghana" },
  { id: H2, city: "Nairobi", place_name: "Nairobi", region: null, country: "Kenya" },
];

/** What convene_places() answers, in its own order: cities, regions, countries, each by name. */
const PLACES = [
  { id: "city|ghana|accra", kind: "city", name: "Accra", country: "Ghana" },
  { id: "city|ghana|kumasi", kind: "city", name: "Kumasi", country: "Ghana" },
  { id: "city|united kingdom|london", kind: "city", name: "London", country: "United Kingdom" },
  { id: "city|ghana|madina", kind: "city", name: "Madina", country: "Ghana" },
  { id: "city|kenya|nairobi", kind: "city", name: "Nairobi", country: "Kenya" },
  { id: "city|ghana|tema", kind: "city", name: "Tema", country: "Ghana" },
  { id: "region|ghana|ashanti", kind: "region", name: "Ashanti", country: "Ghana" },
  { id: "region|ghana|greater accra", kind: "region", name: "Greater Accra", country: "Ghana" },
  { id: "country|ghana", kind: "country", name: "Ghana", country: "Ghana" },
  { id: "country|kenya", kind: "country", name: "Kenya", country: "Kenya" },
  {
    id: "country|united kingdom",
    kind: "country",
    name: "United Kingdom",
    country: "United Kingdom",
  },
];

/** Where each fixture city sits, as convene_places() ids and the region it falls in. */
const CITY = {
  Accra: { country: "Ghana", region: "Greater Accra" },
  Madina: { country: "Ghana", region: "Greater Accra" },
  Tema: { country: "Ghana", region: "Greater Accra" },
  Kumasi: { country: "Ghana", region: "Ashanti" },
  Nairobi: { country: "Kenya", region: null },
  London: { country: "United Kingdom", region: null },
};
function placeIds(cities) {
  const out = new Set();
  for (const c of cities) {
    const at = CITY[c];
    const country = at.country.toLowerCase();
    out.add("city|" + country + "|" + c.toLowerCase());
    if (at.region) out.add("region|" + country + "|" + at.region.toLowerCase());
    out.add("country|" + country);
  }
  return [...out];
}

/** One published Convene event with its post, in the shape the Feed's hydration reads. */
function seedEvent(db, key, { title, mode, days, cities = [], family = null, host = KWAME }) {
  const id = eventId("discovery-" + key);
  const postId = "post-d-" + key;
  // `days: null` is an event with no date yet: a window only, which has no calendar file.
  const starts = days === null ? null : new Date(Date.now() + days * 86400e3);
  if (starts) starts.setUTCHours(18, 0, 0, 0);
  db.posts.unshift({
    id: postId,
    author_kind: "member",
    author_id: host.id,
    created_by: host.id,
    author_name: host.name,
    author_handle: host.handle,
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
    host_member_id: host.id,
    title,
    starts_at: starts ? starts.toISOString() : null,
    ends_at: null,
    doors_at: null,
    when_text: "An evening",
    mode,
    family,
    ticket_kind: "free",
    space_id: null,
    status: "published",
    timezone:
      mode === "virtual" ? "UTC" : cities[0] === "Nairobi" ? "Africa/Nairobi" : "Africa/Accra",
    time_confirmed: true,
    date_confirmed: true,
    expected_window_start: null,
    expected_window_end: null,
    window_basis: starts ? null : "October",
    delivery_intent: null,
    cancelled_at: null,
    cancelled_reason: null,
    slug: "discovery-" + key,
    created_at: new Date().toISOString(),
  });
  cities.forEach((city, i) =>
    db.event_delivery.push({
      id: "d-d-" + key + "-" + i,
      event_id: id,
      kind: "physical",
      position: i,
      place_id: "dXJuOm1ieHBvaTpmcm9udC1yb29t" + i,
      place_name: "Front Room",
      place_text: null,
      city,
      region: CITY[city].region,
      country: CITY[city].country,
    }),
  );
  if (mode !== "in_person")
    db.event_delivery.push({
      id: "d-d-" + key + "-link",
      event_id: id,
      kind: "meeting_link",
      position: cities.length,
      url: "https://meet.example/" + key,
    });
  return {
    event_id: id,
    post_id: postId,
    starts_at: starts ? starts.toISOString() : null,
    mode,
    cities,
    family,
  };
}

/**
 * The corpus every arm reads: the Brief 10 page's loaded event and nine more. `rungs` is the nearest
 * rung each home reaches the event at (1110), which the mock narrows by as the projection does.
 */
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
      cities: ["Accra"],
      family: null,
    },
    supper: seedEvent(db, "supper", {
      title: "Corridor Suppers",
      mode: "in_person",
      days: 5,
      cities: ["Accra"],
      family: "small_social",
    }),
    madina: seedEvent(db, "madina", {
      title: "A market morning in Madina",
      mode: "in_person",
      days: 6,
      cities: ["Madina"],
      family: "small_social",
    }),
    tema: seedEvent(db, "tema", {
      title: "Harbour talks",
      mode: "in_person",
      days: 7,
      cities: ["Tema"],
      family: "professional_economic",
    }),
    kumasi: seedEvent(db, "kumasi", {
      title: "Kente weavers at home",
      mode: "in_person",
      days: 18,
      cities: ["Kumasi"],
      family: "culture_arts",
    }),
    table: seedEvent(db, "table", {
      title: "A long table in Westlands",
      mode: "hybrid",
      days: 9,
      cities: ["Nairobi"],
      family: "culture_arts",
    }),
    cloth: seedEvent(db, "cloth", {
      title: "Kente and code",
      mode: "hybrid",
      days: 12,
      cities: ["Accra", "London"],
      family: "culture_arts",
    }),
    readers: seedEvent(db, "readers", {
      title: "Six readers, one room",
      mode: "virtual",
      days: 3,
      family: "learning_dialogue",
    }),
    stream: seedEvent(db, "stream", {
      title: "Founders on the stream",
      mode: "virtual",
      days: 16,
      family: "learning_dialogue",
      host: ADAEZE,
    }),
    harvest: seedEvent(db, "harvest", {
      title: LONG_TITLE,
      mode: "virtual",
      days: 22,
      family: "giving_cause",
    }),
    undated: seedEvent(db, "undated", {
      title: "A supper in Kilimani",
      mode: "in_person",
      days: null,
      cities: ["Nairobi"],
      family: "small_social",
    }),
  };
  const rungs = {
    loaded: { [H1]: "in" },
    supper: { [H1]: "in" },
    cloth: { [H1]: "in" },
    madina: { [H1]: "around" },
    tema: { [H1]: "region" },
    kumasi: { [H1]: "country" },
    table: { [H2]: "in" },
    undated: { [H2]: "in" },
  };
  for (const [k, e] of Object.entries(E)) {
    e.places = placeIds(e.cities);
    e.rungs = rungs[k] || {};
  }
  // Every card opens a loaded page, so the pane and the route read the page and never not-found.
  for (const e of Object.values(E))
    if (!db.attend.pages[e.event_id])
      db.attend.pages[e.event_id] = {
        ...loadedPage,
        event: { ...loadedPage.event, id: e.event_id, slug: "discovery-" + e.event_id },
      };
  return E;
}

const item = (e, reason) => ({
  event_id: e.event_id,
  post_id: e.post_id,
  reason,
  _places: e.places,
  _rungs: e.rungs,
});

/**
 * Full density (632, 1092): all nine lanes. The member follows Kwame Mensah and Culture and arts,
 * is going to Corridor Suppers, which they have saved, and to an undated supper in Kilimani.
 */
function fullDensity(E) {
  const soon = (e) => item(e, { kind: "soon", starts_at: e.starts_at, mode: e.mode });
  return {
    sections: {
      soon: [E.readers, E.supper, E.madina, E.cloth].map(soon),
      weekend: [E.supper, E.tema].map((e) =>
        item(e, { kind: "weekend", starts_at: e.starts_at, mode: e.mode }),
      ),
      online: [E.readers, E.stream, E.harvest, E.cloth].map((e) =>
        item(e, { kind: "online", starts_at: e.starts_at, mode: e.mode }),
      ),
      fresh: [E.kumasi, E.table, E.undated].map((e) =>
        item(e, { kind: "fresh", published_at: new Date(Date.now() - 86400e3).toISOString() }),
      ),
      curated: [E.loaded, E.cloth].map((e) =>
        item(e, { kind: "curated", editor: SEFA, line: CURATED_LINE }),
      ),
      follow: [E.supper, E.table].map((e) =>
        item(e, { kind: "follow", host: { id: KWAME.id, name: KWAME.name } }),
      ),
      taste: [E.cloth, E.table].map((e) =>
        item(e, { kind: "taste", family: "culture_arts", label: "Culture and arts" }),
      ),
      near: [
        item(E.supper, { kind: "near", home: { id: H1, city: "Accra" } }),
        item(E.madina, { kind: "near", home: { id: H1, city: "Accra" } }),
        item(E.table, { kind: "near", home: { id: H2, city: "Nairobi" } }),
      ],
      network: [
        item(E.cloth, { kind: "network", host: { id: ADAEZE.id, name: ADAEZE.name } }),
        item(E.stream, { kind: "network", going: [ADAEZE, NGOZI] }),
      ],
    },
    follows: [{ ...KWAME, avatar_path: null }],
    subscriptions: [{ family: "culture_arts", label: "Culture and arts" }],
    suggest: null,
  };
}

/** Below density, day one (632, 650): three lanes and the Communities lane's sentence. */
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

function setAnswer(db, answer, homes = HOMES) {
  Object.assign(db.discovery, answer, { homes, fail: false });
}

/** The fixture state every arm starts from: full density, the places, going and saved. */
function seedDiscovery(db) {
  seedPosts(db, 1);
  const E = seedCorpus(db);
  setAnswer(db, fullDensity(E));
  db.discovery.places = PLACES;
  db.discovery.going = [E.supper.event_id, E.undated.event_id];
  db.saves.push({
    member_id: UID,
    post_id: E.supper.post_id,
    created_at: new Date().toISOString(),
  });
  return E;
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
    acceptDownloads: true,
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

const tierOf = (w) => (w < 640 ? "compact" : w > 1024 ? "expanded" : "medium");
const RAIL = '[data-scroller="left"] nav[aria-label="Browse"]';
const SHEET = '[role="dialog"][aria-label="Browse"]';
const lastCall = (db) => db.discovery.calls[db.discovery.calls.length - 1] || {};

/** Opens the rail (medium and up) or the Sheet (compact) and answers the scope its axes are in. */
async function openRail(page, tier) {
  if (tier === "compact") {
    await page.locator('[data-testid="browse"]').click();
    await page.locator(SHEET).waitFor({ timeout: 10000 });
    await page.locator(`${SHEET} [data-axis-id]`).first().waitFor({ timeout: 10000 });
    return SHEET;
  }
  await page.locator(`${RAIL} button[aria-label="Show browse"]`).click();
  await page.locator(`${RAIL} [data-axis-id]`).first().waitFor({ timeout: 10000 });
  return RAIL;
}

async function closeRail(page, tier) {
  if (tier === "compact") {
    await page.keyboard.press("Escape");
    await page.locator(SHEET).waitFor({ state: "detached", timeout: 10000 });
    return;
  }
  await page.locator(`${RAIL} button[aria-label="Collapse browse"]`).click();
  await page.locator(`${RAIL} button[aria-label="Show browse"]`).waitFor({ timeout: 10000 });
}

/** The rail as the part draws it: each axis's id, display, heading and the words it offers. */
function readAxes(page, scope) {
  return page.evaluate((scope) => {
    const root = document.querySelector(scope);
    if (!root) return [];
    return Array.from(root.querySelectorAll("[data-axis-id]")).map((a) => {
      const text = (el) => (el.textContent || "").trim();
      const display = a.getAttribute("data-display");
      const heading = a.querySelector('[id^="facet-"]');
      let options = [];
      if (display === "segment")
        options = Array.from(a.querySelectorAll('[role="radio"]')).map(text);
      else if (display === "checklist")
        options = Array.from(a.querySelectorAll('[role="checkbox"]')).map(text);
      else if (display === "ladders")
        options = Array.from(a.querySelectorAll("[data-ladder]")).map((l) =>
          Array.from(l.querySelectorAll("[data-option]")).map(text).join("|"),
        );
      else if (display === "combobox")
        options = [a.querySelector("input")?.getAttribute("placeholder") || ""];
      return {
        id: a.getAttribute("data-axis-id"),
        display,
        label: heading ? text(heading) : "",
        options,
      };
    });
  }, scope);
}

/** Every lane's event ids in DOM order, keyed by lane. */
function laneItems(page) {
  return page.evaluate(() => {
    const out = {};
    for (const l of document.querySelectorAll("[data-discovery] [data-lanes] > [data-lane]"))
      out[l.getAttribute("data-lane")] = Array.from(
        l.querySelectorAll("[data-discovery-item]"),
      ).map((e) => e.getAttribute("data-discovery-item"));
    return out;
  });
}

async function laneIds(page) {
  return page.$$eval("[data-discovery] [data-lanes] > [data-lane]", (els) =>
    els.map((e) => e.getAttribute("data-lane")),
  );
}

const cardSel = (e, lane) => `[data-discovery-item="${e.event_id}"][data-section="${lane}"]`;

/** Opens a card's menu and answers its entries in order: labels, "|" for a rule, and any disabled. */
async function readMenu(page, card) {
  await page.locator(`${card} button[aria-label="More"]`).click();
  const menu = page.locator('[role="menu"][data-menu]');
  await menu.waitFor({ timeout: 10000 });
  const read = await menu.evaluate((m) =>
    Array.from(m.children).map((c) =>
      c.getAttribute("role") === "separator"
        ? { label: "|", disabled: false }
        : {
            label: (c.textContent || "").trim(),
            disabled:
              c.hasAttribute("disabled") ||
              c.getAttribute("aria-disabled") === "true" ||
              !!c.querySelector("[disabled],[aria-disabled=true]"),
          },
    ),
  );
  return read;
}

async function closeMenu(page) {
  await page.keyboard.press("Escape");
  await page
    .locator('[role="menu"][data-menu]')
    .waitFor({ state: "detached", timeout: 10000 })
    .catch(() => undefined);
}

async function menuSelect(page, card, label) {
  await page.locator(`${card} button[aria-label="More"]`).click();
  const menu = page.locator('[role="menu"][data-menu]');
  await menu.waitFor({ timeout: 10000 });
  await menu.getByRole("menuitem", { name: label, exact: true }).click();
  await menu.waitFor({ state: "detached", timeout: 10000 }).catch(() => undefined);
}

/** The text of the surface and its columns with every card's when line taken out. */
async function digitsOutsideWhen(page) {
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
    let text = parts.join("\n");
    for (const w of document.querySelectorAll('[data-discovery] [data-row="when"]')) {
      const t = (w.innerText || "").trim();
      if (t) text = text.replace(t, "");
    }
    const m = text.match(/[^\d]{0,24}\d[^\d]{0,24}/);
    return m ? m[0].replace(/\s+/g, " ") : "";
  });
}

/** Waits until the last projection call satisfies `pred` and the lanes have settled on it. */
/** Polls the lanes until `ok(ids)` holds for every item id shown, or 10s pass; answers the ids. */
async function lanesUntil(page, ok) {
  let ids = [];
  for (let t = 0; t < 100; t++) {
    ids = Object.values(await laneItems(page)).flat();
    if (ok(ids)) break;
    await page.waitForTimeout(100);
  }
  return ids;
}

async function settled(page, db, pred) {
  const start = Date.now();
  while (!pred(lastCall(db)) && Date.now() - start < 10000) await page.waitForTimeout(100);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(300);
  return pred(lastCall(db));
}

async function runDiscovery(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-discovery`;
  M.armStart(tag);
  const tier = tierOf(w);
  const db = makeMockDb();
  const E = seedDiscovery(db);
  const { browser, page, errors } = await context(browserType, [w, h], theme, db);
  try {
    await signIn(page);
    await openDiscovery(page);

    // Item 3 (1092, 1105): the nine lanes in convene_lanes order, each named from the vocabulary.
    const order = await laneIds(page);
    record(
      tag + " full: the lanes are the nine in convene_lanes order (1092, 1105)",
      order.join(",") === DISCOVERY_SECTIONS.join(","),
      order.join(","),
    );
    const emptyLanes = await page.$$eval("[data-discovery] [data-lanes] > [data-lane]", (els) =>
      els
        .filter((e) => e.querySelectorAll("[data-discovery-item]").length === 0)
        .map((e) => e.getAttribute("data-lane")),
    );
    record(
      tag + " full: no lane renders without items, and no sentence without suggest (632, 650)",
      emptyLanes.length === 0 &&
        !(await page.locator("[data-discovery]").innerText()).includes("You follow no host yet"),
      emptyLanes.join(","),
    );
    const heads = await page.$$eval("[data-discovery] [data-lanes] > [data-lane] h2", (els) =>
      els.map((e) => {
        const cs = getComputedStyle(e);
        return { text: e.textContent.trim(), size: cs.fontSize, face: cs.fontFamily };
      }),
    );
    const display = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim(),
    );
    record(
      tag + " full: each lane's h2 is its convene_lanes name in the display face at 22",
      heads.map((x) => x.text).join("|") === VOCAB.convene_lanes.map((l) => l.name).join("|") &&
        heads.every(
          (x) =>
            x.size === "22px" &&
            x.face.split(",")[0].replace(/"/g, "").trim() ===
              display.split(",")[0].replace(/"/g, "").trim(),
        ),
      JSON.stringify(heads.slice(0, 2)),
    );

    // Item 4 (1076 to 1079): every card PostCard's discovery face, and no DIA line above it (1096).
    const faces = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll("[data-discovery-item]"));
      return {
        items: items.length,
        discovery: items.filter(
          (e) =>
            e.querySelectorAll('article[data-presentation="discovery"]').length === 1 &&
            e.querySelectorAll("article").length === 1,
        ).length,
        feed: document.querySelectorAll("[data-discovery] article[data-c]").length,
        dia: document.querySelectorAll("[data-discovery] [data-lanes] [data-dia]").length,
      };
    });
    record(
      tag + " full: every item is one discovery-face PostCard, no feed face and no DIA line (1096)",
      faces.items > 0 && faces.discovery === faces.items && faces.feed === 0 && faces.dia === 0,
      JSON.stringify(faces),
    );
    const geo = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-discovery-item] article")).map((a) => {
        const m = a.querySelector("[data-media]");
        return {
          w: a.getBoundingClientRect().width,
          mw: m ? m.clientWidth : 0,
          mh: m ? m.clientHeight : 0,
        };
      }),
    );
    const badGeo = geo.filter(
      (g) => Math.abs(g.w - 320) > 0.6 || !g.mh || Math.abs(g.mw / g.mh - 16 / 9) > 0.02,
    );
    record(
      tag + " full: every card is 320 wide with its media at 16:9 (1077, 1087)",
      geo.length > 0 && badGeo.length === 0,
      JSON.stringify(badGeo.slice(0, 2)),
    );
    const clamp = await page.evaluate(
      (ids) => {
        const read = (id) => {
          const h3 = document.querySelector(`[data-discovery-item="${id}"] article h3`);
          const b = h3 && h3.querySelector("[data-card-open]");
          if (!h3 || !b) return null;
          const cs = getComputedStyle(b);
          return {
            h3: Math.round(h3.getBoundingClientRect().height * 10) / 10,
            clamp: cs.webkitLineClamp || cs.getPropertyValue("-webkit-line-clamp"),
            clipped: b.scrollHeight > b.clientHeight + 1,
          };
        };
        return { long: read(ids[0]), short: read(ids[1]) };
      },
      [E.harvest.event_id, E.supper.event_id],
    );
    record(
      tag + " full: the title clamps to two lines and holds two lines' height (1087)",
      !!clamp.long &&
        !!clamp.short &&
        clamp.long.clamp === "2" &&
        clamp.long.clipped &&
        Math.abs(clamp.long.h3 - 55) <= 1 &&
        Math.abs(clamp.short.h3 - 55) <= 1,
      JSON.stringify(clamp),
    );
    const reasons = await page.evaluate(() => {
      const out = {};
      for (const l of document.querySelectorAll("[data-discovery] [data-lanes] > [data-lane]")) {
        const rows = Array.from(l.querySelectorAll('[data-row="reason"]'));
        out[l.getAttribute("data-lane")] = rows.map((r) => ({
          text: (r.textContent || "").trim(),
          hidden: r.getAttribute("aria-hidden") === "true",
          h: Math.round(r.getBoundingClientRect().height),
        }));
      }
      return out;
    });
    const speaks = ["follow", "taste", "curated", "network"];
    const firstReason = (lane, n = 0) =>
      reasons[lane] && reasons[lane][n] ? reasons[lane][n].text : "";
    const quiet = Object.entries(reasons)
      .filter(([lane]) => !speaks.includes(lane))
      .flatMap(([lane, rows]) => rows.filter((r) => r.text || !r.hidden).map(() => lane));
    const heights = new Set(Object.values(reasons).flatMap((rows) => rows.map((r) => r.h)));
    record(
      tag +
        " full: the reason row speaks on the four relationship lanes only, its height held (1096)",
      firstReason("follow") === "Because you follow Kwame Mensah." &&
        firstReason("taste") === "Because you follow culture and arts." &&
        firstReason("curated") === "Curated by Sefa Owusu." &&
        firstReason("network", 0) === "Adaeze Nwosu, a connection, is hosting." &&
        firstReason("network", 1) === "Adaeze Nwosu and Ngozi Eze are going." &&
        quiet.length === 0 &&
        heights.size === 1,
      JSON.stringify({ quiet, heights: [...heights], follow: firstReason("follow") }),
    );
    const where = await page.evaluate(
      (ids) => {
        const read = (id) =>
          (
            document.querySelector(`[data-discovery-item="${id}"] [data-row="where"]`)
              ?.textContent || ""
          ).trim();
        return ids.map(read);
      },
      [E.supper.event_id, E.readers.event_id, E.cloth.event_id],
    );
    record(
      tag + " full: the where line reads the format and the places (item 4)",
      where[0] === "In person · Accra" &&
        where[1] === "Online" &&
        where[2] === "Hybrid · Accra and London",
      where.join(" / "),
    );
    const digits = await digitsOutsideWhen(page);
    record(
      tag + " full: no digit anywhere but a card's when line (guardrail)",
      digits === "",
      digits,
    );

    // Lanes (item 3): sideways rows of 320 cards with a 12 gap.
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
        gap: cs.columnGap,
        overflowX: cs.overflowX,
        snap: cs.scrollSnapType,
        scrolls: row.scrollWidth > row.clientWidth && moved,
      };
    });
    record(
      tag + " full: a lane is a sideways row, gap 12, that scrolls on its own",
      !!laneGeo &&
        laneGeo.gap === "12px" &&
        laneGeo.overflowX === "auto" &&
        /^x(?: proximity)?$/.test(laneGeo.snap) &&
        laneGeo.scrolls,
      JSON.stringify(laneGeo),
    );
    const seeAll = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-discovery] [data-lanes] > [data-lane]")).map(
        (l) => {
          const a = l.querySelector("a[data-see-all]");
          return { lane: l.getAttribute("data-lane"), href: a ? a.getAttribute("href") : null };
        },
      ),
    );
    const hrefOf = (lane) => {
      const s = seeAll.find((x) => x.lane === lane);
      return s && s.href ? new URL(s.href, "https://x.invalid") : null;
    };
    const soonTo = hrefOf("soon");
    const onlineTo = hrefOf("online");
    record(
      tag + " full: See all on six lanes to their targets, none on the other three (1092, 1112)",
      !!soonTo &&
        soonTo.pathname === "/convene" &&
        soonTo.searchParams.get("when") === "two_weeks" &&
        !!onlineTo &&
        onlineTo.pathname === "/convene" &&
        onlineTo.searchParams.get("format") === "online,hybrid" &&
        ["curated", "follow", "taste", "network"].every(
          (l) => hrefOf(l) && hrefOf(l).pathname === "/convene/" + l,
        ) &&
        ["weekend", "fresh", "near"].every((l) => !hrefOf(l)),
      JSON.stringify(seeAll),
    );

    // Item 7: the LensBar's five lenses, labels always, icons at every tier, no trailing seat.
    const bar = await page.evaluate((compact) => {
      const t = document.querySelector(
        (compact ? "[data-discovery] [data-lens-anchor] " : "[data-layout-top] ") +
          '[role="tablist"][aria-label="Convene lens"]',
      );
      if (!t) return null;
      const tabs = Array.from(t.querySelectorAll('[role="tab"]'));
      return {
        mode: t.getAttribute("data-lensbar"),
        words: tabs.map((x) => (x.textContent || "").trim()),
        names: tabs.map((x) => (x.getAttribute("aria-label") || "").split(":")[0]),
        clipped: tabs.filter((x) => x.scrollWidth > x.clientWidth + 1).length,
        // Strand's Icon is a currentColor mask on an aria-hidden span, not an svg.
        icons: tabs.filter((x) =>
          Array.from(x.querySelectorAll('span[aria-hidden="true"]')).some((i) =>
            /icons\//.test(i.style.maskImage || i.style.webkitMaskImage || i.style.mask || ""),
          ),
        ).length,
        trailing: !!(t.parentElement && t.parentElement.querySelector("[data-lensbar-trailing]")),
        row: !!t.closest("[data-lensbar-row]"),
      };
    }, tier === "compact");
    // Item 7: labels and icons where five of each fit; at compact they do not (G104), and the bar's
    // own fit test answers icon-first, as correction 25 draws it. Every lens is named either way.
    const shorts = VOCAB.convene_lenses.map((l) => l.short).join("|");
    record(
      tag +
        (tier === "compact"
          ? " compact: the LensBar's five lenses icon-first by its fit test, each named, none clipped (G104)"
          : " full: the LensBar's five lenses with labels and icons, no seat after them (1093)"),
      !!bar &&
        bar.mode === (tier === "compact" ? "icon-first" : "labels") &&
        (tier === "compact" || bar.words.join("|") === shorts) &&
        bar.names.join("|") === shorts &&
        bar.icons === VOCAB.convene_lenses.length &&
        bar.clipped === 0 &&
        !bar.trailing &&
        !bar.row,
      JSON.stringify(bar),
    );
    record(
      tag + " full: the homes line reads Accra and Nairobi (690)",
      (await page.locator("[data-homes-line]").innerText()).trim() === "Accra and Nairobi",
    );
    record(
      tag + " full: no right column (item 7)",
      (await page.locator('[data-scroller="right"]').count()) === 0,
    );

    // Item 7 (1094, 1111): collapsed at first load at every width, and nothing written on load.
    const first = await page.evaluate((rail) => {
      const nav = document.querySelector(rail);
      return {
        left: document.querySelectorAll('[data-scroller="left"]').length,
        width: nav ? Math.round(nav.getBoundingClientRect().width) : null,
        expand: !!(nav && nav.querySelector('button[aria-label="Show browse"]')),
        axes: nav ? nav.querySelectorAll("[data-axis-id]").length : 0,
        canvas: document.querySelector("[data-canvas]")?.getAttribute("data-rail") ?? null,
        pill: !!document.querySelector('[data-discovery] [data-testid="browse"]'),
      };
    }, RAIL);
    record(
      tag +
        (tier === "compact"
          ? " compact: Browse is the pill and no rail, nothing written on load (1094)"
          : " " +
            tier +
            ": the rail is its collapsed 64 strip at first load, nothing written (1094)"),
      db.discovery.railWrites.length === 0 &&
        (tier === "compact"
          ? first.left === 0 && first.pill
          : first.width === 64 && first.expand && first.axes === 0 && first.canvas === "collapsed"),
      JSON.stringify(first),
    );

    // Item 2 (1095, 1110): the facet set and its order, each axis in its display with its words.
    const scope = await openRail(page, tier);
    const axes = await readAxes(page, scope);
    record(
      tag + " rail: Format, Price, When, Topics, Home and Place, in that order and display",
      axes.map((a) => `${a.id}:${a.display}:${a.label}`).join(",") ===
        [
          "format:segment:Format",
          "price:segment:Price",
          "when:segment:When",
          "family:checklist:Topics",
          "home:ladders:Home",
          "place:combobox:Place",
        ].join(","),
      axes.map((a) => `${a.id}:${a.display}:${a.label}`).join(","),
    );
    const words = Object.fromEntries(axes.map((a) => [a.id, a.options]));
    const railText = await page.locator(scope).innerText();
    record(
      tag + " rail: Format, Price and When led by Any, and no Donation (1095)",
      (words.format || []).join("|") === "Any|In person|Online|Hybrid" &&
        (words.price || []).join("|") === "Any|Free|Paid" &&
        (words.when || []).join("|") === "Any|Next two weeks|This month|Later" &&
        !/donation/i.test(railText),
      JSON.stringify({ format: words.format, price: words.price, when: words.when }),
    );
    record(
      tag + " rail: Topics are the families, Home a ladder per home, Place a combobox; no count",
      (words.family || []).join("|") === VOCAB.convene_families.map((f) => f.label).join("|") &&
        (words.home || []).length === 2 &&
        (words.place || [])[0] === "Anywhere in the world" &&
        !/\d/.test(railText),
      JSON.stringify({ home: words.home, place: words.place }),
    );
    await closeRail(page, tier);
    // The collapsed strip renders from the optimistic state; the second write reaches the mock after.
    for (let t = 0; tier !== "compact" && db.discovery.railWrites.length < 2 && t < 100; t++)
      await page.waitForTimeout(50);
    const writes = db.discovery.railWrites.map(
      (r) => `${r.surface}:${r.width_band}:${r.collapsed}`,
    );
    const band =
      tier === "compact" ? null : tier === "medium" ? "medium" : w >= 1440 ? "wide" : "expanded";
    record(
      tag +
        (tier === "compact"
          ? " compact: the Sheet opens and closes and writes nothing (1111)"
          : " " + tier + ": each toggle writes the member's row for its band (1111)"),
      tier === "compact"
        ? writes.length === 0
        : writes.join(",") === `discovery:${band}:false,discovery:${band}:true`,
      writes.join(","),
    );
    if (tier === "compact") {
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
      await page.evaluate(() => {
        const sc = document.querySelector('[data-scroller="feed"]');
        sc.scrollTop = 0;
        sc.dispatchEvent(new Event("scroll"));
      });
    }
    await noOverflow(page, tag + " full");
    await shot(page, `${tag}-01-full`);

    // Item 5 (1097): the menu's items in the ruled order; an item that does not apply is absent.
    const going = await readMenu(page, cardSel(E.supper, "follow"));
    await closeMenu(page);
    const expect = [
      "Share",
      "Copy link",
      "Saved",
      "Add to calendar",
      "|",
      "Following Kwame Mensah",
      "Subscribe to Small social gatherings",
      "|",
      "Not this",
    ];
    record(
      tag +
        " menu: Share, Copy link, Saved, Add to calendar, Following, Subscribe, Not this (1097)",
      going.map((x) => x.label).join(",") === expect.join(",") && going.every((x) => !x.disabled),
      going.map((x) => x.label + (x.disabled ? "(disabled)" : "")).join(","),
    );
    const plain = await readMenu(page, cardSel(E.loaded, "curated"));
    await closeMenu(page);
    const other = await readMenu(page, cardSel(E.stream, "network"));
    await closeMenu(page);
    const undated = await readMenu(page, cardSel(E.undated, "fresh"));
    await closeMenu(page);
    record(
      tag +
        " menu: Add to calendar absent when not going or undated, Subscribe absent with no topic, none disabled",
      plain.map((x) => x.label).join(",") ===
        "Share,Copy link,Save,|,Following Kwame Mensah,|,Not this" &&
        other.map((x) => x.label).join(",") ===
          "Share,Copy link,Save,|,Follow Adaeze Nwosu,Subscribe to Learning and dialogue,|,Not this" &&
        undated.map((x) => x.label).join(",") ===
          "Share,Copy link,Save,|,Following Kwame Mensah,Subscribe to Small social gatherings,|,Not this" &&
        [...plain, ...other, ...undated].every((x) => !x.disabled),
      [plain, other, undated].map((m) => m.map((x) => x.label).join(",")).join(" / "),
    );

    // Not this (1044, 1105): out of its lane at once with the toast. No reload before the pane, so
    // the projection still carries the card and only the surface's own skip can step past it; the
    // dismissal's persistence is read on reload after the pane.
    await menuSelect(page, cardSel(E.madina, "soon"), "Not this");
    await page.locator(cardSel(E.madina, "soon")).waitFor({ state: "detached", timeout: 10000 });
    const toast = (await page.locator('[role="status"]').allInnerTexts()).join(" ");

    // A card's title: the pane at expanded (688, 1047), the page's own route below it (1023).
    await page.locator(`${cardSel(E.supper, "soon")} [data-card-open]`).click();
    await page.waitForURL((u) => u.pathname === "/convene/events/" + E.supper.event_id, {
      timeout: 10000,
    });
    await page.waitForSelector('[data-event-page][data-event-state="loaded"]', { timeout: 15000 });
    if (tier === "expanded") {
      await page.waitForTimeout(300);
      const pane = await page.evaluate((id) => {
        const nav = document.querySelector('[data-scroller="left"] nav[aria-label="Browse"]');
        return {
          open: !!document.querySelector('[data-discovery][data-pane-open="1"]'),
          rail: nav ? Math.round(nav.getBoundingClientRect().width) : null,
          col: document.querySelector("[data-canvas]")?.getAttribute("data-rail"),
          right: document.querySelectorAll('[data-scroller="right"]').length,
          lanes: document.querySelectorAll("[data-discovery] [data-lanes] [data-lane]").length,
          back: document.querySelectorAll("[data-event-page] [data-back-row]").length,
          ring: Array.from(
            document.querySelectorAll("[data-discovery-item] article[data-selected]"),
          ).map((a) => {
            const s = a.closest("[data-discovery-item]");
            return (
              s.getAttribute("data-section") + ":" + (s.getAttribute("data-discovery-item") === id)
            );
          }),
          expand: !!document.querySelector(
            'button[aria-label="Back to Discovery and show browse"]',
          ),
        };
      }, E.supper.event_id);
      record(
        tag +
          " pane: the event page in the Pane, the 64 strip, no right column, the card ringed in its lane (1083)",
        pane.open &&
          pane.rail === 64 &&
          pane.col === "collapsed" &&
          pane.right === 0 &&
          pane.lanes > 0 &&
          pane.back === 0 &&
          pane.expand &&
          pane.ring.join(",") === "soon:true",
        JSON.stringify(pane),
      );
      // Stepping (1083, 1044): Happening soon reads readers, supper, madina, cloth as the projection
      // answered it; madina was dismissed in this session, so the surface steps supper to cloth.
      const stepTo = async (label, id) => {
        await page.locator(`[data-pane-cluster] button[aria-label="${label}"]`).click();
        await page.waitForURL((u) => u.pathname === "/convene/events/" + id, { timeout: 10000 });
        await page.waitForSelector(`${cardSel({ event_id: id }, "soon")} article[data-selected]`, {
          timeout: 10000,
        });
      };
      const disabled = (label) =>
        page
          .locator(`[data-pane-cluster] button[aria-label="${label}"]`)
          .getAttribute("aria-disabled");
      await stepTo("Next event", E.cloth.event_id);
      const endNext = await disabled("Next event");
      await stepTo("Previous event", E.supper.event_id);
      await stepTo("Previous event", E.readers.event_id);
      const endPrev = await disabled("Previous event");
      record(
        tag +
          " pane: Next and Previous step the lane in its visible order past a dismissal, the ends refused",
        endNext === "true" && endPrev === "true",
        `next end ${endNext}, previous end ${endPrev}`,
      );
      // G78: the page reserves the pane's close row, so its first block starts below the control.
      const g78 = await page.evaluate(() => {
        const close = document.querySelector('button[aria-label="Back to Discovery"]');
        const firstBlock = document.querySelector("[data-event-page]")?.firstElementChild;
        if (!close || !firstBlock) return null;
        return {
          close: Math.round(close.getBoundingClientRect().bottom),
          first: Math.round(firstBlock.getBoundingClientRect().top),
        };
      });
      record(
        tag + " pane: the page's first block starts below the pane's close control (G78)",
        !!g78 && g78.first >= g78.close,
        JSON.stringify(g78),
      );
      // 719: Escape fires only while focus is within the pane, so focus goes there first.
      await page.getByRole("button", { name: "Back to Discovery", exact: true }).focus();
      await page.keyboard.press("Escape");
      await page.waitForURL((u) => u.pathname === "/convene", { timeout: 10000 });
      await page.waitForTimeout(300);
      record(
        tag + " pane: Escape returns to Discovery with the rail as the member left it (719, 1111)",
        (await page.locator(`${RAIL} button[aria-label="Show browse"]`).count()) === 1 &&
          (await page.locator('[data-discovery][data-pane-open="1"]').count()) === 0,
      );
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
    } else {
      record(
        tag + " " + tier + ": a card's title is a route to the event page with its Back row (1023)",
        (await page.locator("[data-discovery]").count()) === 0 &&
          (await page.locator("[data-event-page] [data-back-row]").count()) === 1,
      );
    }
    await openDiscovery(page);
    record(
      tag + " menu: Not this takes the card out of its lane with the toast, and out on reload",
      toast.includes("Fewer like this in your lanes.") &&
        db.discovery.dismissals.some(
          (d) => d.p_event === E.madina.event_id && d.p_section === "soon",
        ) &&
        (await page.locator(cardSel(E.madina, "soon")).count()) === 0 &&
        (await page.locator(cardSel(E.madina, "near")).count()) === 1,
      toast,
    );

    // Below density (632, 650): the Communities lane is its heading and one sentence, only with
    // suggest, in its own place in convene_lanes order (1092).
    setAnswer(db, belowDensity(E));
    await openDiscovery(page);
    const below = await laneIds(page);
    const firstLane = page.locator('[data-discovery] [data-lane="follow"]');
    const sentence = await firstLane.locator('[data-dia="done"]').allInnerTexts();
    record(
      tag +
        " below: the Communities lane is its heading and DIA's one sentence, in its place in the lanes' order",
      below.join(",") === "online,curated,follow,network" &&
        (await firstLane.locator("h2").innerText()).trim() === "From communities you follow" &&
        sentence.length === 1 &&
        sentence[0].startsWith(
          "You follow no host yet. Kwame Mensah hosts Corridor Suppers in Accra; follow them and their events start here.",
        ) &&
        (await firstLane.locator("[data-discovery-item]").count()) === 0 &&
        // 1053: plain text, the host's name unlinked.
        (await firstLane.locator('[data-dia="done"] a').count()) === 0,
      below.join(",") + " | " + sentence.join(" / "),
    );
    await shot(page, `${tag}-02-below`);

    // No homes (1050): no homes line, no Home axis.
    setAnswer(db, fullDensity(E), []);
    await openDiscovery(page);
    const noHomes = await openRail(page, tier);
    const axesNoHome = (await readAxes(page, noHomes)).map((a) => a.id);
    await closeRail(page, tier);
    record(
      tag + " no homes: the homes line and the Home axis are absent (1050)",
      (await page.locator("[data-homes-line]").count()) === 0 &&
        axesNoHome.join(",") === "format,price,when,family,place",
      axesNoHome.join(","),
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
 * The facet, ladder, write and rail-memory arms (items 1, 2, 6 and 12; Addendum 1's Done Means 6),
 * one per tier plus the wide band, one theme each, alternating: nothing here reads a colour.
 */
const FACET_VIEWPORTS = [
  [[390, 844], "light"],
  [[820, 1180], "dark"],
  [[1280, 800], "light"],
  [[1440, 900], "dark"],
];

async function runDiscoveryFacets(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-discovery-facets`;
  M.armStart(tag);
  const tier = tierOf(w);
  const db = makeMockDb();
  const E = seedDiscovery(db);
  const { browser, page, errors } = await context(browserType, [w, h], theme, db);
  const here = () => new URL(page.url());
  try {
    await signIn(page);

    // Item 1: the three retired lens paths land on /convene, keeping the rest of the query.
    for (const [from, check, want] of [
      [
        "/convene/soon?family=culture_arts",
        (u) =>
          u.searchParams.get("when") === "two_weeks" &&
          u.searchParams.get("family") === "culture_arts",
        "when=two_weeks with the family kept",
      ],
      [
        "/convene/online?price=free",
        (u) =>
          u.searchParams.get("format") === "online,hybrid" &&
          u.searchParams.get("price") === "free",
        "format=online,hybrid with the price kept",
      ],
      ["/convene/near", (u) => [...u.searchParams.keys()].length === 0, "no query"],
    ]) {
      await openDiscovery(page, from);
      const u = here();
      record(
        tag + ` redirect: ${from.split("?")[0]} lands on /convene with ${want} (item 1)`,
        u.pathname === "/convene" &&
          check(u) &&
          (await page.locator('[data-discovery][data-lens="all"]').count()) === 1,
        u.pathname + u.search,
      );
    }

    // 1095: Donation is gone. A price of donation never reaches the projection.
    const before = db.discovery.calls.length;
    await openDiscovery(page, "/convene?price=donation,free");
    await settled(page, db, (c) => Array.isArray(c.p_price));
    const sent = db.discovery.calls.slice(before);
    record(
      tag + " donation: a price of donation in the URL is never sent; free still is (1095)",
      sent.length > 0 &&
        sent.every((c) => !(c.p_price || []).includes("donation")) &&
        (lastCall(db).p_price || []).join(",") === "free",
      JSON.stringify(sent.map((c) => c.p_price)),
    );

    // Place (1095): typed, offered by kind, picked, narrowing, and removed as a chip.
    await openDiscovery(page);
    let scope = await openRail(page, tier);
    const field = page.locator(`${scope} [data-axis-id="place"] input`);
    await field.click();
    await field.fill("acc");
    await page.locator(`${scope} [data-axis-id="place"] [role="option"]`).first().waitFor({
      timeout: 10000,
    });
    const offered = await page.$$eval(`${scope} [data-axis-id="place"] [role="option"]`, (els) =>
      els.map((e) => (e.innerText || "").replace(/\s+/g, " ").trim()),
    );
    record(
      tag + " place: typing offers each place with its kind, and no count (1095)",
      offered.join("|") === "Accra City, Ghana|Greater Accra Region, Ghana",
      offered.join("|"),
    );
    await page
      .locator(`${scope} [data-axis-id="place"] [role="option"][data-value="city|ghana|accra"]`)
      .click();
    await page.waitForURL((u) => u.searchParams.get("place") === "city|ghana|accra", {
      timeout: 10000,
    });
    const picked = await settled(
      page,
      db,
      (c) => (c.p_places || []).join(",") === "city|ghana|accra",
    );
    record(
      tag + " place: a pick goes into the query and p_places, and is a removable chip",
      picked &&
        (await page
          .locator(`${scope} [data-axis-id="place"] button[data-chosen="city|ghana|accra"]`)
          .getAttribute("aria-label")) === "Remove Accra",
      JSON.stringify(lastCall(db)),
    );
    if (tier === "compact") await closeRail(page, tier);
    await page.waitForFunction(
      () =>
        document.querySelector('[data-discovery] [data-lane="near"] h2')?.textContent?.trim() ===
        "While you are in Accra",
      null,
      { timeout: 10000 },
    );
    const accraIds = new Set(
      Object.values(E)
        .filter((e) => e.places.includes("city|ghana|accra"))
        .map((e) => e.event_id),
    );
    // The heading is the URL's; the cards are the answer's, which lands after it.
    await lanesUntil(page, (ids) => ids.length > 0 && ids.every((id) => accraIds.has(id)));
    const inAccra = await laneItems(page);
    const strays = Object.values(inAccra)
      .flat()
      .filter((id) => !accraIds.has(id));
    record(
      tag + " place: the lanes narrow to Accra and Near reads While you are in Accra (1095)",
      strays.length === 0 &&
        Object.keys(inAccra).includes("near") &&
        !Object.keys(inAccra).includes("fresh"),
      JSON.stringify({ lanes: Object.keys(inAccra), strays }),
    );
    if (tier === "compact") scope = await openRail(page, tier);
    await page
      .locator(`${scope} [data-axis-id="place"] button[data-chosen="city|ghana|accra"]`)
      .click();
    await page.waitForURL((u) => !u.searchParams.has("place"), { timeout: 10000 });
    const cleared = await settled(page, db, (c) => !c.p_places);
    record(
      tag + " place: removing the chip takes the place out of the query and the projection",
      cleared,
      JSON.stringify(lastCall(db)),
    );

    // Home (1110): a ladder per home; each rung narrows and Anywhere clears the home.
    const ladders = await page.evaluate(
      (scope) =>
        Array.from(document.querySelectorAll(`${scope} [data-axis-id="home"] [data-ladder]`)).map(
          (l) => ({
            id: l.getAttribute("data-ladder"),
            rungs: Array.from(l.querySelectorAll("[data-option]")).map((b) => b.textContent.trim()),
          }),
        ),
      scope,
    );
    record(
      tag +
        " home: one ladder per home in order, the region rung only where a region is stored (1110)",
      JSON.stringify(ladders) ===
        JSON.stringify([
          { id: H1, rungs: ["In Accra", "Around Accra", "Greater Accra", "Ghana", "Anywhere"] },
          { id: H2, rungs: ["In Nairobi", "Around Nairobi", "Kenya", "Anywhere"] },
        ]),
      JSON.stringify(ladders),
    );
    const RUNG = ["in", "around", "region", "country"];
    for (const rung of RUNG) {
      await page
        .locator(
          `${scope} [data-axis-id="home"] [data-ladder="${H1}"] [data-option="${H1}:${rung}"]`,
        )
        .click();
      await page.waitForURL(
        (u) =>
          u.searchParams.get("home") === H1 &&
          (rung === "in" ? !u.searchParams.has("rung") : u.searchParams.get("rung") === rung),
        { timeout: 10000 },
      );
      const ok = await settled(page, db, (c) => c.p_home === H1 && c.p_home_rung === rung);
      const want = new Set(
        Object.values(E)
          .filter((e) => e.rungs[H1] && RUNG.indexOf(e.rungs[H1]) <= RUNG.indexOf(rung))
          .map((e) => e.event_id),
      );
      const shown = new Set(
        await lanesUntil(
          page,
          (ids) => new Set(ids).size === want.size && ids.every((id) => want.has(id)),
        ),
      );
      const checked = await page
        .locator(`${scope} [data-axis-id="home"] [data-option="${H1}:${rung}"]`)
        .getAttribute("aria-checked");
      record(
        tag + ` home: ${rung} sends p_home with p_home_rung ${rung} and narrows to it (1110)`,
        ok &&
          checked === "true" &&
          shown.size === want.size &&
          [...shown].every((id) => want.has(id)),
        JSON.stringify({ call: lastCall(db), shown: shown.size, want: want.size }),
      );
    }
    await page
      .locator(`${scope} [data-axis-id="home"] [data-ladder="${H1}"] [data-option="anywhere"]`)
      .click();
    await page.waitForURL((u) => !u.searchParams.has("home") && !u.searchParams.has("rung"), {
      timeout: 10000,
    });
    record(
      tag + " home: Anywhere clears the home and the rung, and sends neither (1110)",
      await settled(page, db, (c) => c.p_home === undefined && c.p_home_rung === undefined),
      JSON.stringify(lastCall(db)),
    );
    await closeRail(page, tier);

    // Item 6: every menu act through its existing path, and the word flips.
    await menuSelect(page, cardSel(E.stream, "network"), "Follow Adaeze Nwosu");
    await menuSelect(page, cardSel(E.readers, "online"), "Subscribe to Learning and dialogue");
    await menuSelect(page, cardSel(E.readers, "online"), "Save");
    const flipped = await readMenu(page, cardSel(E.stream, "network"));
    await closeMenu(page);
    const readersMenu = await readMenu(page, cardSel(E.readers, "online"));
    await closeMenu(page);
    record(
      tag +
        " writes: Follow, Subscribe and Save go through set_follow, set_subscription and post_saves",
      db.profile.follows.includes("on") &&
        db.discovery.subscriptionWrites.some(
          (x) => x.p_family === "learning_dialogue" && x.p_on === true,
        ) &&
        db.saves.some((s) => s.post_id === E.readers.post_id) &&
        flipped.some((x) => x.label === "Following Adaeze Nwosu") &&
        readersMenu.some((x) => x.label === "Subscribed to Learning and dialogue") &&
        readersMenu.some((x) => x.label === "Saved"),
      flipped.map((x) => x.label).join(",") + " / " + readersMenu.map((x) => x.label).join(","),
    );
    // The handler is attached as the waiter is made, so a failed menu path cannot leave it
    // rejecting with nothing to catch it.
    const download = page.waitForEvent("download", { timeout: 15000 }).then(
      (d) => d.suggestedFilename(),
      (e) => "no download: " + String(e).slice(0, 80),
    );
    await menuSelect(page, cardSel(E.supper, "follow"), "Add to calendar");
    const file = await download;
    record(
      tag + " writes: Add to calendar downloads the event page's .ics (1097)",
      /\.ics$/.test(file),
      file,
    );

    // 1111: the rail's state per member per band, read on load and written on toggle only.
    if (tier === "compact") {
      db.discovery.rail.push({ surface: "discovery", width_band: "wide", collapsed: false });
      await openDiscovery(page);
      await openRail(page, tier);
      await closeRail(page, tier);
      record(
        tag + " memory: compact opens no Sheet on load and writes nothing on toggle (1111)",
        db.discovery.railWrites.length === 0 && (await page.locator(SHEET).count()) === 0,
        JSON.stringify(db.discovery.railWrites),
      );
    } else {
      const band = tier === "medium" ? "medium" : w >= 1440 ? "wide" : "expanded";
      // The Place and Home rows above opened and collapsed the rail; memory is read from here on.
      db.discovery.railWrites.length = 0;
      await openDiscovery(page);
      await page.locator(`${RAIL} button[aria-label="Show browse"]`).click();
      await page.locator(`${RAIL} [data-axis-id]`).first().waitFor({ timeout: 10000 });
      // The rail renders open from the optimistic state; the write reaches the mock after it.
      for (let t = 0; db.discovery.railWrites.length < 1 && t < 100; t++)
        await page.waitForTimeout(50);
      await openDiscovery(page);
      await page.waitForTimeout(400);
      const open = await page.locator(`${RAIL} [data-axis-id]`).count();
      record(
        tag + ` memory: the rail opened at ${band} is open after a reload (1111)`,
        open > 0 &&
          db.discovery.railWrites.length === 1 &&
          db.discovery.railWrites[0].width_band === band &&
          db.discovery.railWrites[0].collapsed === false,
        JSON.stringify(db.discovery.railWrites),
      );
      if (tier === "expanded") {
        const other = w >= 1440 ? [1280, 800] : [1440, 900];
        await page.setViewportSize({ width: other[0], height: other[1] });
        await page.waitForTimeout(600);
        const strip = await page.evaluate((rail) => {
          const nav = document.querySelector(rail);
          return nav ? Math.round(nav.getBoundingClientRect().width) : null;
        }, RAIL);
        await page.setViewportSize({ width: w, height: h });
        await page.waitForTimeout(600);
        const back = await page.locator(`${RAIL} [data-axis-id]`).count();
        record(
          tag +
            ` memory: at ${other[0]} the other band stays collapsed, and ${w} is open again (1111)`,
          strip === 64 && back > 0 && db.discovery.railWrites.length === 1,
          `strip ${strip}, back ${back}, writes ${db.discovery.railWrites.length}`,
        );
      }
    }

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
  const tier = tierOf(w);
  const db = makeMockDb();
  const E = seedDiscovery(db);
  const { browser, page, errors } = await context(browserType, [w, h], theme, db);
  try {
    await signIn(page);

    // Intent (1067): at expanded with a pointer the event page is read on hover, before any click;
    // at compact on touch it is not. The hover is a real mouse move onto the card.
    if (w === 1280 || w === 390) {
      await openDiscovery(page);
      const card = page.locator(`${cardSel(E.loaded, "curated")} article`).first();
      await card.scrollIntoViewIfNeeded();
      const before = db.attend.reads.length;
      await card.hover();
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
      // Lens kept (1063): from a lens with one facet set, the pane opens over that lens with no
      // second Discovery read, and the pane's close returns to the lens with the facet in the query.
      await openDiscovery(page, "/convene/curated?format=hybrid");
      await page.waitForSelector('[data-discovery][data-lens="curated"] [data-discovery-item]', {
        timeout: 20000,
      });
      await page.waitForTimeout(300);
      const reads = db.discovery.calls.length;
      await page.locator("[data-discovery-item] [data-card-open]").first().click();
      await page.waitForURL((u) => u.pathname.startsWith("/convene/events/"), { timeout: 10000 });
      await page.waitForSelector('[data-discovery][data-pane-open="1"] [data-event-page]', {
        timeout: 20000,
      });
      await page.waitForTimeout(600);
      const behind = await page.locator("[data-discovery]").getAttribute("data-lens");
      record(
        tag + " lens: the pane keeps the lens it opened from behind it, no second read (1063)",
        behind === "curated" && db.discovery.calls.length === reads,
        `lens ${behind} reads ${reads} -> ${db.discovery.calls.length}`,
      );
      await page.locator('button[aria-label="Back to Discovery"]').click();
      await page.waitForURL((u) => !u.pathname.startsWith("/convene/events/"), { timeout: 10000 });
      const back = new URL(page.url());
      record(
        tag + " lens: closing the pane returns to that lens with the facet in the query (1063)",
        back.pathname === "/convene/curated" &&
          back.searchParams.get("format") === "hybrid" &&
          (await page.locator('[data-discovery][data-lens="curated"]').count()) === 1 &&
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
      await second.locator("[data-card-open]").click();
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
  runDiscoveryFacets,
  runDiscoveryPlace,
  FACET_VIEWPORTS,
  PLACE_VIEWPORTS,
  DISCOVERY_VIEWPORTS,
  DISCOVERY_LENSES,
  __seedDiscovery: seedDiscovery,
  __seedCorpus: seedCorpus,
  __full: fullDensity,
};
