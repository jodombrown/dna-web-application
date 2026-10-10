// Handoff 45-B (Brief 12 12B): the Overview's page arms on the admin preview, ADMIN_BASE, and the
// drawer's focus return (ruling 1366, arm C-a). The admin app's real code paths run against a
// backend this file controls at the network layer, as tests/auth.cjs does for the member app's
// auth surfaces: the session is the shared mock's, admin_session_state answers an admin at aal2,
// and the five projections answer fixtures whose figures are the extraction's placeholders, so the
// words the page writes from them can be read against the extraction's own lines. The founder's
// real aal2 path, and the figures the live project holds, are the device check (61) and Chat's
// Done Means reading, never this arm. Each arm reports unproven without the host (228).
//
//   overview       at 1280 light and 390 dark: every block in the data state, the not-connected
//                  parts as 1362 to 1364 word them (arm B-b's page half), Time to first act's empty
//                  sentence with no member counted (arm B-a's page half), the partial line, DIA's
//                  statements with their block links, then the grain switched to Year re-reads the
//                  projections and every change reads No comparison.
//   overview error at 1280 light: the mobilization projection forced to fail renders its cards in
//                  MeasureCard's error state with Try again while the levers render; Try again
//                  with the projection answering again renders the corridor table (SPEC arm 7).
//   drawer focus   at 390 and 820 (arm C-a, 1366): open the drawer, press Escape, and focus is on
//                  the opener.
//
// Usage: ADMIN_BASE=https://<id>.dna-admin.pages.dev SPECIAL=admin node tests/matrix.cjs
const M = require("./matrix.cjs");

const { launch, record, noOverflow, hydrated, SB, JWT, UID } = M;

const ADMIN_BASE = (process.env.ADMIN_BASE || "").replace(/\/$/, "");

const USER = {
  id: UID,
  aud: "authenticated",
  role: "authenticated",
  email: "founder@test.invalid",
  user_metadata: { full_name: "Jaûne Odombrown" },
  app_metadata: { provider: "email" },
  // A verified TOTP factor, so the console's factor read says the code step is enrolled.
  factors: [
    {
      id: "f1",
      factor_type: "totp",
      status: "verified",
      friendly_name: "DNA Admin",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
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

/** The zone's offset from UTC at a moment, in minutes, read from the runtime. */
function offsetMinutes(at, tz) {
  const p = {};
  for (const x of new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at))
    p[x.type] = x.value;
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return Math.round((local - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

/**
 * The window the fixtures describe: this week so far, Monday 00:00 in the zone the call names (the
 * company reporting zone, handoff 45-D), to now, against last week; at Year, from 1 January.
 */
function windowFor(grain, compare, tz = "UTC") {
  const now = new Date();
  const off = offsetMinutes(now, tz);
  const local = new Date(now.getTime() + off * 60000);
  local.setUTCHours(0, 0, 0, 0);
  const dow = (local.getUTCDay() + 6) % 7;
  local.setUTCDate(local.getUTCDate() - dow);
  if (grain === "year") local.setUTCMonth(0, 1);
  const start = new Date(local.getTime() - offsetMinutes(local, tz) * 60000);
  const elapsed = now.getTime() - start.getTime();
  const cmpStart = new Date(start.getTime() - (grain === "year" ? 366 : 7) * 86400000);
  const first = new Date(start.getTime() - 40 * 86400000);
  const hasCmp = grain !== "year" && compare === "previous";
  const points = grain === "year" ? 10 : 4;
  const step = Math.max(1, Math.floor(elapsed / points));
  const series = (vals) =>
    vals
      .slice(0, points)
      .map((v, i) => ({ start: new Date(start.getTime() + i * step).toISOString(), value: v }));
  return {
    grain,
    compare,
    tz,
    now: now.toISOString(),
    period: { start: start.toISOString(), end: now.toISOString() },
    comparison: hasCmp
      ? { start: cmpStart.toISOString(), end: new Date(cmpStart.getTime() + elapsed).toISOString() }
      : null,
    comparison_reason: hasCmp ? null : "before_first_record",
    first_record: first.toISOString(),
    bucket: grain === "year" ? "1 mon" : "1 day",
    series,
    hasCmp,
  };
}

/** The five projections' answers for a grain, comparison and zone: the extraction's placeholder figures. */
function fixtures(grain, compare, tz) {
  const w = windowFor(grain, compare, tz);
  const { series, hasCmp } = w;
  const cmp = (v) => (hasCmp ? v : null);
  const base = {
    grain: w.grain,
    compare: w.compare,
    tz: w.tz,
    now: w.now,
    period: w.period,
    comparison: w.comparison,
    comparison_reason: w.comparison_reason,
    first_record: w.first_record,
    bucket: w.bucket,
    definition_version: 1,
  };
  const measure = (v, c, s) => ({ value: v, comparison: cmp(c), series: series(s) });
  return {
    admin_overview_window: {
      ...base,
      rollups_refreshed_at: null,
      ledger_derived_at: w.now,
      refreshed_at: w.now,
    },
    admin_overview_mobilization: {
      ...base,
      acts: 157,
      mobilized: measure(112, 94, [96, 101, 107, 112, 112, 112, 112, 112, 112, 112]),
      bridging: measure(41, 32, [8, 11, 10, 12, 9, 7, 12, 10, 8, 11]),
      depth: {
        points: series([30, 38, 41, 48, 40, 36, 44, 39, 41, 46]).map((p, i) => ({
          start: p.start,
          engaging: p.value,
          leading: [4, 6, 5, 8, 6, 5, 7, 6, 5, 8][i],
          collaborating: null,
          contributing: null,
        })),
        not_measurable: ["collaborating", "contributing"],
      },
      direction: [
        { key: "diaspora_to_continent", value: 38 },
        { key: "continent_to_diaspora", value: 19 },
        { key: "diaspora_to_diaspora", value: 71 },
        { key: "continent_to_continent", value: 29 },
      ],
      source: [
        { key: "counterparty", status: "connected", value: 141 },
        { key: "partner", status: "not_connected", value: null },
        { key: "dna_system", status: "not_connected", value: null },
      ],
      corridors: [
        {
          id: "acc-lon",
          label: "Accra to London",
          status: "active",
          acts: 34,
          mobilized: 27,
          bridging: 14,
        },
        {
          id: "lag-hou",
          label: "Lagos to Houston",
          status: "active",
          acts: 29,
          mobilized: 22,
          bridging: 9,
        },
      ],
      outside_corridor: 36,
    },
    admin_overview_levers: {
      ...base,
      invites: { value: null, status: "not_connected" },
      // 1615 (handoff 58-12C2): Started from members.created_at, the drop-off by step; a tie
      // between two screens, so the line joins them through the one joiner (1619).
      onboarding: {
        completed: measure(29, 22, [6, 8, 7, 8, 6, 7, 9, 8, 7, 9]),
        started: { ...measure(41, 35, [8, 9, 10, 11, 8, 9, 12, 10, 9, 11]), status: "connected" },
        drop_off: { status: "connected", by_step: { who: 3, where: 5, relationship: 5 } },
      },
      // Arm B-a's page half: nobody onboarded in the period has an act yet.
      time_to_first_act: {
        status: "connected",
        value: null,
        comparison: null,
        members_counted: 0,
        members_onboarded: 3,
      },
      introductions: {
        sent: measure(58, 49, [12, 15, 14, 17, 13, 12, 16, 14, 13, 15]),
        accepted: { value: 33, comparison: cmp(26) },
        answer_days: { value: 1.8, comparison: cmp(2.4) },
      },
      rsvp_going: measure(141, 118, [30, 36, 35, 40, 33, 31, 38, 36, 34, 37]),
      events: { held: measure(6, 4, [1, 2, 1, 2, 1, 2, 1, 2, 1, 2]), filled: { value: 2 } },
      attestations: {
        ...measure(128, 104, [28, 33, 31, 36, 30, 29, 34, 31, 30, 33]),
        by_context: { event_attendance: 97, hosting: 23, other: 8 },
        other_kinds: ["opportunity/Space lead"],
      },
      posts: {
        ...measure(58, 47, [12, 15, 14, 17, 13, 12, 16, 14, 13, 15]),
        by_c: { convey: 27, convene: 19, connect: 12, collaborate: 0, contribute: 0 },
        system: 3,
      },
      story_led: { value: null, status: "not_connected" },
    },
    admin_overview_network: {
      tz: w.tz,
      as_of: w.now,
      registered: 1284,
      admitted: { value: null, status: "not_connected" },
      joined: 640,
      by_side: [
        { side: "diaspora", value: 418 },
        { side: "continent", value: 222 },
      ],
      by_stance: [
        { stance: "kin", label: "Kin", value: 240 },
        { stance: "exploring", label: "Still exploring", value: 124 },
        { stance: "anchor", label: "Anchor", value: 118 },
        { stance: "ally", label: "Ally", value: 97 },
        { stance: "returnee", label: "Returnee", value: 61 },
      ],
      corridors: [
        {
          id: "acc-lon",
          label: "Accra to London",
          status: "active",
          joined_members: 120,
          connections: 170,
          density: 1.42,
          threshold: 1.0,
        },
        {
          id: "add-was",
          label: "Addis Ababa to Washington",
          status: "active",
          joined_members: 50,
          connections: 32,
          density: 0.64,
          threshold: null,
        },
      ],
    },
    admin_overview_company: {
      partnerships: { status: "not_connected" },
      newsletter: { status: "not_connected" },
      revenue: { status: "not_connected" },
      chapters: { status: "not_connected" },
    },
  };
}

const DIA = [
  {
    text: "Mobilized members rose this period, and most of the rise sits in Engaging acts after the events in Accra.",
    block: "Mobilization",
  },
  {
    text: "Bridging acts rose in the Accra to London corridor after those events; the other corridors held steady.",
    block: "By corridor",
  },
  {
    text: "Introductions were answered faster than the period before, which may explain part of the rise in accepted introductions.",
    block: "The levers",
  },
];

/** The vocabularies the admin reads (1177, 1392), as public.vocabularies() serves them. */
const VOCAB = {
  platform_role_kinds: [
    { value: "admin", label: "Admin" },
    { value: "editor", label: "Editor" },
    { value: "analyst", label: "Analyst" },
  ],
  admin_appearances: [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ],
  overview_grains: [
    { value: "now", label: "Now" },
    { value: "hour", label: "Hour" },
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "quarter", label: "Quarter" },
    { value: "year", label: "Year" },
  ],
  overview_comparisons: [
    { value: "previous", label: "Previous period" },
    { value: "last_year", label: "Same period last year" },
  ],
  reporting_zones: [
    {
      value: "America/Los_Angeles",
      name: "Pacific time",
      city: "Los Angeles",
      abbreviation: "PST",
    },
    { value: "America/New_York", name: "Eastern time", city: "New York", abbreviation: "EST" },
    { value: "Africa/Accra", name: "Greenwich time", city: "Accra", abbreviation: "GMT" },
    { value: "Europe/London", name: "UK time", city: "London", abbreviation: "GMT" },
    { value: "Africa/Lagos", name: "West Africa time", city: "Lagos", abbreviation: "WAT" },
    {
      value: "Africa/Johannesburg",
      name: "South Africa time",
      city: "Johannesburg",
      abbreviation: "SAST",
    },
    { value: "Africa/Nairobi", name: "East Africa time", city: "Nairobi", abbreviation: "EAT" },
  ],
};

/**
 * The Settings rows a mocked account holds, made once per page from `state`: `state.staff` and
 * `state.org` override the columns' defaults, the company zone defaulting to Africa/Accra so the
 * Overview's arms read GMT whatever the runner's zone.
 */
function settingsOf(state) {
  if (!state.settingsRows)
    state.settingsRows = {
      staff: {
        appearance: "system",
        reading_zone: null,
        default_grain: "week",
        default_compare: "previous",
        ...(state.staff || {}),
      },
      org: { reporting_zone: "Africa/Accra", dia_note: true, ...(state.org || {}) },
      history: [
        {
          id: 2,
          at: new Date(Date.now() - 3 * 86400000).toISOString(),
          setting: "dia_note",
          before: false,
          after: true,
          by: "Jaûne Odombrown",
        },
      ],
      reads: [
        {
          id: 1,
          at: new Date(Date.now() - 3600000).toISOString(),
          projection: "admin_overview_levers",
          page: "Overview",
          block: "The levers",
        },
      ],
      sessions: [
        {
          id: "s-current",
          user_agent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
          last_active_at: new Date().toISOString(),
          current: true,
        },
        {
          id: "s-phone",
          user_agent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
          last_active_at: new Date(Date.now() - 2 * 3600000).toISOString(),
          current: false,
        },
      ],
    };
  return state.settingsRows;
}

/**
 * The backend, at the network layer. `state.fail` names a projection that answers 500; `state.calls`
 * records every projection call with its arguments.
 */
async function mockAdmin(page, state) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.route(`**/${SB}/**`, async (route) => {
    try {
      await handle(route, state);
    } catch (e) {
      console.log("ADMIN MOCK ERROR", String(e).slice(0, 160));
      await route.abort().catch(() => undefined);
    }
  });
}

async function handle(route, state) {
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
  if (p === "/auth/v1/factors") return json([]);
  if (p === "/rest/v1/rpc/admin_session_state")
    return json({ holds_role: true, aal: "aal2", roles: state.roles || ["admin", "editor"] });
  if (p === "/rest/v1/rpc/claim_guest_registrations") return json({ claimed: 0 });
  if (p === "/rest/v1/rpc/vocabularies") return json(VOCAB);
  // Handoff 45-D: the Settings reads and writes, against `state.staff` and `state.org`.
  // `state.failNext` names a write that answers 500 once; `state.writes` records every write.
  const settings = settingsOf(state);
  if (
    p.startsWith("/rest/v1/rpc/admin_") &&
    /_settings_|_read_log|_change_history|_my_sessions/.test(p)
  ) {
    const fn = p.slice("/rest/v1/rpc/".length);
    const body = req.postDataJSON() || {};
    (state.settingsCalls = state.settingsCalls || []).push(fn);
    if (state.failNext === fn) {
      state.failNext = null;
      return json({ code: "XX000", message: "forced" }, 500);
    }
    if (fn === "admin_staff_settings_read") return json(settings.staff);
    if (fn === "admin_org_settings_read") return json(settings.org);
    if (fn === "admin_staff_settings_save") {
      (state.writes = state.writes || []).push({ fn, patch: body.p_patch });
      Object.assign(settings.staff, body.p_patch || {});
      return json(settings.staff);
    }
    if (fn === "admin_org_settings_save") {
      (state.writes = state.writes || []).push({ fn, patch: body.p_patch });
      if (!(state.roles || ["admin"]).includes("admin"))
        return json({ code: "42501", message: "admin at aal2 required" }, 403);
      for (const [k, v] of Object.entries(body.p_patch || {}))
        if (settings.org[k] !== v) {
          settings.history.unshift({
            id: settings.history.length + 100,
            at: new Date().toISOString(),
            setting: k,
            before: settings.org[k],
            after: v,
            by: "Jaûne Odombrown",
          });
          settings.org[k] = v;
        }
      return json(settings.org);
    }
    if (fn === "admin_read_log") {
      settings.reads.unshift({
        id: settings.reads.length + 1,
        at: new Date().toISOString(),
        projection: "admin_read_log",
        page: "Settings",
        block: "Your read log",
      });
      return json({ entries: state.emptyLogs ? [] : settings.reads, next: null });
    }
    if (fn === "admin_change_history")
      return json({ entries: state.emptyLogs ? [] : settings.history, next: null });
    if (fn === "admin_my_sessions") return json(settings.sessions);
  }
  if (p === "/rest/v1/members") return json({ handle: "founder", name: "Jaûne Odombrown" });
  if (p.startsWith("/rest/v1/rpc/admin_overview_")) {
    const fn = p.slice("/rest/v1/rpc/".length);
    const body = req.postDataJSON() || {};
    state.calls.push({ fn, ...body });
    if (state.fail === fn) return json({ code: "XX000", message: "forced" }, 500);
    const grain = body.p_grain || state.grain || "week";
    const compare = body.p_compare || state.compare || "previous";
    const fx = fixtures(grain, compare, body.p_tz || "UTC")[fn];
    await new Promise((r) => setTimeout(r, 60));
    return fx ? json(fx) : json({ code: "42883", message: "unknown" }, 404);
  }
  if (p === "/functions/v1/admin-dia-note") {
    const body = req.postDataJSON() || {};
    state.dia.push(body);
    return json({ statements: state.diaEmpty ? [] : DIA });
  }
  return json([]);
}

async function adminContext(browserType, [w, h], theme) {
  const browser = await launch(browserType);
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: w <= 1024,
    isMobile: w < 1024,
    deviceScaleFactor: 1,
    colorScheme: theme,
    timezoneId: "UTC",
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
  return { browser, page };
}

async function openOverview(page, state) {
  await mockAdmin(page, state);
  await page.goto(ADMIN_BASE + "/sign-in", { waitUntil: "networkidle" });
  await hydrated(page);
  await page.fill('input[type="email"]', "founder@test.invalid");
  await page.fill('input[type="password"]', "x");
  await page.click('button[type="submit"]');
  await page.waitForSelector('[data-testid="admin-overview"]', { timeout: 20000 });
}

const text = async (page, sel) =>
  (
    await page
      .locator(sel)
      .first()
      .innerText()
      .catch(() => "")
  )
    .replace(/\s+/g, " ")
    .trim();

/** Arm: the Overview in the data state, then Year. */
async function runAdminOverview(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-admin overview`;
  M.armStart(tag);
  if (!ADMIN_BASE) {
    M.unproven(tag, "ADMIN_BASE is not set, so there is no admin deployment to read");
    return;
  }
  const { browser, page } = await adminContext(browserType, [w, h], theme);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const state = { calls: [], dia: [], fail: null };
  try {
    await openOverview(page, state);
    // Every block has answered: no card, and not the note, is still role status with aria-busy.
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="admin-overview"] [aria-busy="true"]'),
      null,
      { timeout: 20000 },
    );
    await page.waitForSelector('[data-testid="overview-dia"] button[aria-label^="Go to"]', {
      timeout: 20000,
    });
    const body = await text(page, "body");
    record(
      `${tag} | the shell binds ConsoleShell`,
      (await page.locator("[data-console-shell]").count()) === 1,
    );
    record(
      `${tag} | the bar carries the staff name and the role's label`,
      body.includes("Jaûne Odombrown") && (w < 640 || /ADMIN/.test(body)),
    );
    record(`${tag} | h1 reads Overview`, (await text(page, "h1")) === "Overview");
    const win = await text(page, '[data-testid="overview-window"]');
    record(
      `${tag} | the window line names this week so far and last week at the same point`,
      /^This week so far, .+ against last week, .+ at the same point in the week\./.test(win),
      win.slice(0, 160),
    );
    record(
      `${tag} | the definition line names the version and the refresh in the company zone`,
      /Mobilization Definition v1\. Last refreshed .+, \d\d:\d\d (UTC|GMT)\./.test(win),
      win.slice(-120),
    );
    record(
      `${tag} | the partial line names the two unconnected sources`,
      win.includes(
        "Two sources are not yet connected: partner confirmations and DNA system confirmations.",
      ),
    );
    const mob = await text(page, '[data-testid="overview-mobilization"]');
    record(
      `${tag} | Mobilized Members reads 112, Up 18 from 94`,
      /112/.test(mob) && mob.includes("Up 18 from 94"),
      mob.slice(0, 200),
    );
    record(
      `${tag} | Bridging acts reads 41, Up 9 from 32`,
      mob.includes("41") && mob.includes("Up 9 from 32"),
    );
    record(
      `${tag} | Depth names the two not-yet kinds`,
      mob.includes("Collaborating") &&
        mob.includes("Not yet measurable") &&
        mob.includes(
          "Collaborating and Contributing arrive with the Spaces and Contribute engines.",
        ),
    );
    record(
      `${tag} | Source shows two sources not yet connected with the partial note`,
      (mob.match(/Not yet connected/g) || []).length >= 2 &&
        mob.includes("Partner confirmations arrive with the Relationships console."),
    );
    const corr = await text(page, '[data-testid="overview-corridors"]');
    record(
      `${tag} | By corridor sorts by Acts high to low and carries the outside count`,
      (await page
        .locator('[data-testid="overview-corridors"] th[aria-sort="descending"]')
        .count()) === 1 &&
        corr.includes("Accra to London") &&
        corr.includes("36 acts in this period happened outside any corridor."),
      corr.slice(-160),
    );
    const lev = await text(page, '[data-testid="overview-levers"]');
    record(
      `${tag} | nine lever cards`,
      (await page.locator('[data-testid="overview-levers"] section').count()) === 9,
    );
    record(
      `${tag} | Invites is not yet connected (1363)`,
      /Invites Not yet connected\./i.test(lev),
      lev.slice(0, 120),
    );
    record(
      `${tag} | Onboarding reads Completed, Started and the drop-off line with its tie joined (1364, 1615, 1619)`,
      lev.includes("29 completed") &&
        lev.includes("41 started in this period.") &&
        lev.includes(
          "Most who have not finished stopped at Where you are and Your relationship to the continent.",
        ),
      lev.slice(lev.indexOf("Onboarding"), lev.indexOf("Onboarding") + 220),
    );
    record(
      `${tag} | Time to first act with nobody counted reads its empty sentence (1365, B-a)`,
      lev.includes("No new member has had a first act yet."),
    );
    record(
      `${tag} | Introductions carry accepted and the time to answer in words`,
      lev.includes("33 accepted, up 7 from 26") &&
        lev.includes("Typical time to answer 1.8 days, down from 2.4"),
    );
    record(
      `${tag} | RSVP going carries the Intent tag`,
      /Intent/i.test(lev) && lev.includes("A plan to attend."),
    );
    record(
      `${tag} | Attestations and Posts by C carry their lines`,
      lev.includes("97 event attendance") && lev.includes("Convey 27, Convene 19, Connect 12"),
    );
    record(
      `${tag} | Story-led acts reads its not-connected sentence`,
      lev.includes("Attribution arrives with the behaviour log. Not yet connected."),
    );
    const net = await text(page, '[data-testid="overview-network"]');
    record(
      `${tag} | three numbers with Admitted replaced by Not yet connected (1362)`,
      net.includes("1,284 Registered") &&
        net.includes("Not yet connected. Admitted Passed the invite boundary.") &&
        net.includes("640 Joined"),
      net.slice(0, 220),
    );
    record(
      `${tag} | side and stance are two breakdowns with the vocabulary's labels`,
      net.includes("Diaspora side") &&
        net.includes("Still exploring") &&
        net.includes("Two breakdowns of the same joined members."),
    );
    record(
      `${tag} | density reads against its threshold, and No threshold set where none is`,
      net.includes("1.42 against 1.00, above") && net.includes("0.64. No threshold set"),
      net.slice(-300),
    );
    const co = await text(page, '[data-testid="overview-company"]');
    record(
      `${tag} | the four company lines read their sentences`,
      co.includes("Nothing here yet. Fills from the Relationships console") &&
        co.includes("Fills from the business track once chapters are defined."),
    );
    const dia = await text(page, '[data-testid="overview-dia"]');
    record(
      `${tag} | DIA's note shows the statements with block links and the doctrine line`,
      dia.includes(DIA[0].text) &&
        (await page
          .locator('[data-testid="overview-dia"] button[aria-label="Go to By corridor"]')
          .count()) === 1 &&
        dia.includes("The numbers above are the record."),
    );
    record(
      `${tag} | DIA was asked with the grain, comparison and zone`,
      state.dia.length >= 1 && state.dia[0].grain === "week" && state.dia[0].tz === "Africa/Accra",
      JSON.stringify(state.dia[0]),
    );
    // A block link scrolls the page column, not the window.
    const before = await page.evaluate(
      () => document.querySelector('[data-testid="admin-overview"]').scrollTop,
    );
    await page.click('[data-testid="overview-dia"] button[aria-label="Go to The levers"]');
    await page.waitForTimeout(700);
    const after = await page.evaluate(
      () => document.querySelector('[data-testid="admin-overview"]').scrollTop,
    );
    record(
      `${tag} | a block link scrolls the page column to the block`,
      after !== before && after > 0,
      `${before} -> ${after}`,
    );
    await noOverflow(page, `${tag} |`);

    // Year: every projection is read again, and with no comparison every change reads No comparison.
    const callsBefore = state.calls.length;
    await page.click(
      '[role="radiogroup"][aria-label="Time grain"] [role="radio"]:has-text("Year")',
    );
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="admin-overview"]').getAttribute("data-grain") ===
        "year",
    );
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="admin-overview"] [aria-busy="true"]'),
      null,
      { timeout: 20000 },
    );
    await page
      .waitForFunction(
        () =>
          /so far/.test(document.querySelector('[data-testid="overview-window"]').innerText) &&
          /No comparison/.test(
            document.querySelector('[data-testid="overview-mobilization"]').innerText,
          ),
        null,
        { timeout: 15000 },
      )
      .catch(() => undefined);
    const yearCalls = state.calls.slice(callsBefore);
    record(
      `${tag} | Year re-reads the five projections with p_grain year`,
      yearCalls.length === 5 && yearCalls.filter((c) => c.p_grain === "year").length === 3,
      yearCalls
        .map((c) => c.fn.replace("admin_overview_", "") + ":" + (c.p_grain || "-"))
        .join(","),
    );
    const winY = await text(page, '[data-testid="overview-window"]');
    const mobY = await text(page, '[data-testid="overview-mobilization"]');
    record(
      `${tag} | at Year the window names the reason there is no comparison and every change reads No comparison`,
      /^\d{4} so far, .+ DNA opened in \w+ \d{4}, so there is no previous year to compare\./.test(
        winY,
      ) && (mobY.match(/No comparison/g) || []).length >= 2,
      winY.slice(0, 160),
    );
    record(`${tag} | no page errors`, errors.length === 0, errors.join(" | ").slice(0, 200));
  } catch (e) {
    record(`${tag} flow`, false, String(e).slice(0, 200));
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/** Arm: one projection forced to fail renders that block's error state and the rest of the page. */
async function runAdminOverviewError(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-admin overview error`;
  M.armStart(tag);
  if (!ADMIN_BASE) {
    M.unproven(tag, "ADMIN_BASE is not set, so there is no admin deployment to read");
    return;
  }
  const { browser, page } = await adminContext(browserType, [w, h], theme);
  const state = { calls: [], dia: [], fail: "admin_overview_mobilization", diaEmpty: true };
  try {
    await openOverview(page, state);
    await page.waitForSelector('[data-testid="overview-corridors"] [role="alert"]', {
      timeout: 20000,
    });
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="admin-overview"] [aria-busy="true"]'),
      null,
      { timeout: 20000 },
    );
    const corr = await text(page, '[data-testid="overview-corridors"]');
    record(
      `${tag} | By corridor renders MeasureCard's error state with Try again`,
      corr.includes("By corridor could not load.") &&
        corr.includes(
          "The mobilization projection did not answer. The rest of the page is current.",
        ) &&
        (await page
          .locator('[data-testid="overview-corridors"] button:has-text("Try again")')
          .count()) === 1,
      corr.slice(0, 200),
    );
    record(
      `${tag} | every card of the failed block is in the error state and no other is`,
      (await page.locator('[data-testid="overview-mobilization"] [role="alert"]').count()) === 6 &&
        (await page.locator('[data-testid="overview-levers"] [role="alert"]').count()) === 0 &&
        (await page.locator('[data-testid="overview-network"] [role="alert"]').count()) === 0,
    );
    const lev = await text(page, '[data-testid="overview-levers"]');
    record(
      `${tag} | the levers render their data meanwhile`,
      lev.includes("29 completed") && lev.includes("58 sent"),
    );
    const dia = await text(page, '[data-testid="overview-dia"]');
    record(
      `${tag} | DIA with no statement renders its empty sentence`,
      dia.includes("DIA has nothing to add for this period."),
    );
    state.fail = null;
    const mobCalls = () => state.calls.filter((c) => c.fn === "admin_overview_mobilization").length;
    const callsBefore = mobCalls();
    await page.click('[data-testid="overview-corridors"] button:has-text("Try again")');
    await page.waitForSelector('[data-testid="overview-corridors"] table', { timeout: 20000 });
    const again = await text(page, '[data-testid="overview-corridors"]');
    record(
      `${tag} | Try again re-reads the projection and renders the table`,
      again.includes("Accra to London") && mobCalls() === callsBefore + 1,
      `${callsBefore} -> ${mobCalls()}`,
    );
  } catch (e) {
    record(`${tag} flow`, false, String(e).slice(0, 200));
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/** Arm C-a (1366): the drawer returns focus to its opener on Escape. */
async function runAdminDrawerFocus(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-admin drawer focus`;
  M.armStart(tag);
  if (!ADMIN_BASE) {
    M.unproven(tag, "ADMIN_BASE is not set, so there is no admin deployment to read");
    return;
  }
  const { browser, page } = await adminContext(browserType, [w, h], theme);
  const state = { calls: [], dia: [], fail: null, diaEmpty: true };
  try {
    await openOverview(page, state);
    const opener = page.locator('button[aria-label="Open navigation"]');
    record(`${tag} | the bar carries the opener below expanded`, (await opener.count()) === 1);
    await opener.focus();
    await opener.click();
    await page.waitForSelector("dialog[open]", { timeout: 10000 });
    const inside = await page.evaluate(() => {
      const d = document.querySelector("dialog[open]");
      return (
        !!d &&
        d.contains(document.activeElement) &&
        document.activeElement.getAttribute("aria-label")
      );
    });
    record(`${tag} | opening moves focus into the drawer`, inside === "Close", String(inside));
    await page.keyboard.press("Escape");
    await page
      .waitForFunction(() => !document.querySelector("dialog[open]"), null, { timeout: 5000 })
      .catch(() => undefined);
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => {
      const a = document.activeElement;
      return a ? a.tagName + ":" + (a.getAttribute("aria-label") || "") : "none";
    });
    record(
      `${tag} | after Escape focus is on the opener (1366)`,
      after === "BUTTON:Open navigation",
      after,
    );
    record(`${tag} | the drawer is closed`, (await page.locator("dialog[open]").count()) === 0);
  } catch (e) {
    record(`${tag} flow`, false, String(e).slice(0, 200));
  } finally {
    await browser.close().catch(() => undefined);
  }
}

module.exports = {
  runAdminOverview,
  runAdminOverviewError,
  runAdminDrawerFocus,
  openOverview,
  mockAdmin,
  text,
  VOCAB,
};
