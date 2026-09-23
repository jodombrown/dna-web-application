// Brief 10 (handoff 30-C item 13): the member's event page and its sheets, in the browser against
// BASE with the Supabase surface mocked at the network layer (the shared mock in tests/matrix.cjs).
// Two arms per engine:
//
//   runEvent       every viewport and both themes: the page's states (loaded, past, cancelled, full,
//                  not found, error) at that cell, SPEC section 3's order, no digit outside a date,
//                  a time or the door line (guardrail 1), and no horizontal overflow.
//   runEventFlows  the two representative layouts: the first RSVP with two radiogroups and the
//                  default written (1030), a later answer with one radiogroup and an override, the
//                  withdrawal, the at-capacity and error states, Share with the code for a public
//                  event only, add to calendar once going, the invitation notice and sheet without
//                  the profile line (1027), the card's speakers row and its hook into the page, and
//                  the notification row's destination.
//   runGuest       the two representative layouts (handoff 30-D item 14.3): the public page's guest
//                  path against the mock's guest-rsvp. The affordance only for a free event that is
//                  neither cancelled nor over, the Guest sheet's six states in the SPEC's words, the
//                  link arrival with the address replaced, no attendee anywhere (626), and Create an
//                  account landing on the one sign-up flow with the address prefilled.
//
// Usage: BASE=https://<preview>.dna-web-application.pages.dev SPECIAL=event node tests/matrix.cjs
const fs = require("fs");
const M = require("./matrix.cjs");

const {
  launch,
  makeMockDb,
  seedPosts,
  mockSupabase,
  signIn,
  record,
  unproven,
  eventId,
  shot,
  noOverflow,
  BASE,
  UID,
  SB,
} = M;

/**
 * Ruling 357, as tests/profile.cjs and tests/connect.cjs already apply it: WebKit words a fetch the
 * navigation cancelled as an access-control denial ("… due to access control checks."), and
 * Playwright delivers it as a page error. Every request to the mocked Supabase origin is fulfilled
 * in-process with access-control-allow-origin: *, so a real denial cannot happen there. Only this
 * wording, and only for that origin, is ignored; any other page error still fails the check. Seen
 * on run 35792037361 in two event arms whose flows navigate away from the Feed while its card
 * hydration is still in flight.
 */
const SB_RE = SB.replace(/\./g, "\\.");
const CANCELLED_MOCK_FETCH = new RegExp(
  `(?:^|[\\s/])${SB_RE}\\S*\\s+due to access control checks\\.?$`,
);

/** The mocked events' ids: UUIDs, because the page's read refuses anything else (item 11.1). */
const EV = { loaded: eventId("loaded"), private: eventId("private") };

const HOST = "00000000-0000-4000-8000-0000000000f2";
const SLUG = "corridor-suppers-accra-3f2a1b";
const TITLE = "Corridor Suppers: Accra";

function person(id, name, handle) {
  return { id, name, handle, avatar_path: null };
}

/** The projection's answer for one event, in the shape src/lib/event-page.ts reads (1023). */
function attendPage(kind) {
  const past = kind === "past";
  const cancelled = kind === "cancelled";
  const starts = new Date(Date.now() + (past ? -3 : 20) * 86400e3);
  starts.setUTCHours(19, 0, 0, 0);
  const ends = new Date(starts.getTime() + 3 * 3600e3);
  const doors = new Date(starts.getTime() - 30 * 60e3);
  const id = eventId(kind);
  const going = [
    {
      ...person("m-adaeze", "Adaeze Nwosu", "adaeze-nwosu"),
      you: false,
      connection: true,
      shared: false,
    },
    { ...person("m-ngozi", "Ngozi Eze", "ngozi-eze"), you: false, connection: true, shared: false },
    {
      ...person("m-thandiwe", "Thandiwe Dube", "thandiwe-dube"),
      you: false,
      connection: true,
      shared: false,
    },
    {
      ...person("m-sefa", "Sefa Owusu", "sefa-owusu"),
      you: false,
      connection: false,
      shared: true,
    },
    {
      ...person("m-folake", "Folake Adeyemi", "folake-adeyemi"),
      you: false,
      connection: false,
      shared: false,
    },
    {
      ...person("m-wanjiru", "Wanjiru Kamau", "wanjiru-kamau"),
      you: false,
      connection: false,
      shared: false,
    },
  ].map((g) => ({
    member_id: g.id,
    name: g.name,
    handle: g.handle,
    avatar_path: null,
    you: g.you,
    connection: g.connection,
    shared: g.shared,
  }));
  return {
    event: {
      id,
      slug: kind === "private" ? "corridor-suppers-private-9c0d1e" : SLUG,
      title: TITLE,
      status: cancelled ? "cancelled" : "published",
      cancelled,
      cancelled_reason: cancelled
        ? "The venue is no longer available. Everyone registered has been told by email, and the next supper will be posted here."
        : null,
      past,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      doors_at: doors.toISOString(),
      timezone: "Africa/Accra",
      when_text: "Thursday at seven",
      date_confirmed: true,
      time_confirmed: true,
      expected_window_start: null,
      expected_window_end: null,
      window_basis: null,
      mode: "in_person",
      ticket_kind: "free",
      delivery_intent:
        "In the room, at a long table. Doors at 18:30; the meal is served at 19:30 and the conversation runs until the last person leaves.",
      full: kind === "full",
      public: kind !== "private",
    },
    post: {
      id: "post-" + id,
      body: "A long table for members in the Accra to Los Angeles agriculture corridor. Growers, buyers, cold chain people and the ones financing them. One conversation, no panel.\n\nFood is Ghanaian and shared. Come with one thing you need and one thing you can offer.",
      audience: kind === "private" ? "connections" : "everyone",
      published_at: new Date(Date.now() - 7200e3).toISOString(),
    },
    presented_by: { kind: "space", id: "s-suppers", name: "Corridor Suppers" },
    media: cancelled
      ? []
      : [{ position: 0, storage_path: "seed/" + kind + ".jpg", width: 1200, height: 800 }],
    host: person(HOST, "Kwame Mensah", "kwame-mensah"),
    place: {
      place_name: "Front Room",
      place_text: null,
      city: "Accra",
      region: "Greater Accra",
      country: "Ghana",
      lng: -0.1747,
      lat: 5.5559,
      map_link: null,
    },
    meeting_url: null,
    door_withheld: kind === "loaded",
    viewer: {
      is_host: false,
      registration: null,
      default_audience: "connections",
      has_default: false,
    },
    invitations:
      kind === "loaded"
        ? [
            {
              party_id: "party-1",
              role: "moderator",
              label: "Moderator",
              verb: "moderate",
              status: "invited",
            },
          ]
        : [],
    speakers: cancelled
      ? []
      : [
          {
            party_id: "p-thandiwe",
            member_id: "m-thandiwe",
            name: "Thandiwe Dube",
            handle: "thandiwe-dube",
            avatar_path: null,
            role: "speaker",
            label: "Speaker",
          },
          {
            party_id: "p-ngozi",
            member_id: "m-ngozi",
            name: "Ngozi Eze",
            handle: "ngozi-eze",
            avatar_path: null,
            role: "speaker",
            label: "Speaker",
          },
        ],
    partners: [],
    going: cancelled || kind === "full" ? null : going,
    calendar: {
      uid: id,
      title: TITLE,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      timezone: "Africa/Accra",
      location: "Front Room, Accra, Ghana",
      url: null,
      description: TITLE + ". Presented by Corridor Suppers.",
    },
  };
}

function seedAttend(db) {
  for (const kind of ["loaded", "past", "cancelled", "full", "private"])
    db.attend.pages[eventId(kind)] = attendPage(kind);
  db.attend.parties.push({
    id: "party-1",
    event_id: EV.loaded,
    role: "moderator",
    status: "invited",
  });
}

/** A Convene card in the Feed for the loaded event, so the card's row and hook can be read. */
function seedAttendCard(db) {
  const pg = db.attend.pages[EV.loaded];
  db.posts.unshift({
    id: "post-e-loaded",
    author_kind: "member",
    author_id: HOST,
    created_by: HOST,
    author_name: "Kwame Mensah",
    author_handle: "kwame-mensah",
    author_avatar_path: null,
    c_category: "convene",
    body: pg.post.body,
    anchor_kind: null,
    anchor_id: null,
    created_object_kind: "event",
    created_object_id: EV.loaded,
    audience: "everyone",
    status: "published",
    published_at: pg.post.published_at,
    created_at: pg.post.published_at,
  });
  db.events.push({
    id: EV.loaded,
    host_member_id: HOST,
    title: TITLE,
    starts_at: pg.event.starts_at,
    ends_at: pg.event.ends_at,
    doors_at: pg.event.doors_at,
    when_text: pg.event.when_text,
    mode: "in_person",
    ticket_kind: "free",
    space_id: null,
    status: "published",
    timezone: "Africa/Accra",
    time_confirmed: true,
    date_confirmed: true,
    expected_window_start: null,
    expected_window_end: null,
    window_basis: null,
    delivery_intent: pg.event.delivery_intent,
    cancelled_at: null,
    cancelled_reason: null,
    slug: SLUG,
    created_at: new Date().toISOString(),
  });
  db.event_delivery.push({
    id: "d-e-loaded",
    event_id: EV.loaded,
    kind: "physical",
    position: 0,
    place_id: "dXJuOm1ieHBvaTpmcm9udC1yb29t",
    place_name: "Front Room",
    place_text: null,
    city: "Accra",
    country: "Ghana",
  });
  for (const sp of pg.speakers) db.attend.speakers.push({ event_id: EV.loaded, ...sp });
}

async function context(browserType, [w, h], theme, db) {
  const browser = await launch(browserType);
  const touch = w < 1024;
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: touch,
    isMobile: touch,
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
  return { browser, page, errors };
}

const eventPath = (kind) => BASE + "/convene/events/" + eventId(kind);
const state = (page) => page.locator("[data-event-page]").getAttribute("data-event-state");

async function open(page, kind, want) {
  await page.goto(eventPath(kind), { waitUntil: "networkidle" });
  await page.waitForSelector(`[data-event-page][data-event-state="${want}"]`, { timeout: 15000 });
}

/**
 * Handoff 31-B item 12 (1047, 1023): at expanded the page is the content of Discovery's Pane, whose
 * own `Back to Discovery` is the way back, so the page carries no Back row; below expanded it is its
 * own route with a Back row. Every arrival here is a document load, which carries no origin in
 * history state, so the row names Discovery (handoff 31-D, 1065). True when the page is in the form
 * its tier owes.
 */
async function pageForm(page, w, label = "Discovery") {
  if (w > 1024)
    return (
      (await page.locator('[data-discovery][data-pane-open="1"] [data-event-page]').count()) ===
        1 && (await page.locator("[data-back-row]").count()) === 0
    );
  return (await page.locator("[data-back-row]").textContent()).trim() === label;
}

/** Guardrail 1: the page's text outside the date, time and door rows carries no digit. */
async function digitsOutsideFacts(page) {
  return page.evaluate(() => {
    const root = document.querySelector("[data-event-page]");
    if (!root) return "no page";
    const clone = root.cloneNode(true);
    for (const el of clone.querySelectorAll("[data-fact], [data-event-cancelled-line]"))
      el.remove();
    const text = clone.textContent || "";
    const m = text.match(/[^\d]{0,20}\d[^\d]{0,20}/);
    return m ? m[0] : "";
  });
}

async function runEvent(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-event`;
  M.armStart(tag);
  const db = makeMockDb();
  seedPosts(db, 1);
  seedAttend(db);
  const { browser, page, errors } = await context(browserType, [w, h], theme, db);
  try {
    await signIn(page);

    // Loaded, in SPEC section 3's order.
    await open(page, "loaded", "loaded");
    const order = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll(
          "[data-event-invitation],[data-event-kicker],[data-event-title],[data-event-presenter],[data-event-facts],[data-event-rsvp],[data-event-body],[data-event-speakers],[data-event-going],[data-event-going-list],[data-event-share-row]",
        ),
      ).map((el) =>
        el.hasAttribute("data-event-invitation")
          ? "invitation"
          : [...el.attributes].find((a) => a.name.startsWith("data-event-")).name.slice(11),
      ),
    );
    record(
      tag + " loaded: SPEC 3's order, invitation to share row",
      order.join(",") ===
        "invitation,kicker,title,presenter,facts,rsvp,body,speakers,going,going-list,share-row",
      order.join(","),
    );
    record(
      tag +
        " loaded: the pane on Discovery at expanded, the Back row naming Discovery below it; the kicker reads Event",
      (await pageForm(page, w)) &&
        (await page.locator("[data-event-kicker]").textContent()).trim() === "Event",
    );
    // Handoff 31-D (1065): a cold arrival's Back row names Discovery and navigates to /convene.
    if (w === 390) {
      await page.locator("[data-event-page] [data-back-row]").click();
      await page.waitForURL((u) => u.pathname === "/convene", { timeout: 10000 }).catch(() => {});
      record(
        tag + " cold: the Back row reads Discovery and navigates to /convene (1065)",
        new URL(page.url()).pathname === "/convene" &&
          (await page.locator("[data-discovery]").count()) === 1,
        page.url(),
      );
      await open(page, "loaded", "loaded");
    }
    const facts = page.locator("[data-event-facts]");
    record(
      tag +
        " loaded: when carries the doors time, where the place, intent the withheld line (1025, 1032)",
      /Doors 18:30, the time at the place/.test(
        await facts.locator('[data-fact="when"]').textContent(),
      ) &&
        /Front Room, Accra/.test(await facts.locator('[data-fact="where"]').textContent()) &&
        (await facts.locator("[data-event-door-withheld]").count()) === 1 &&
        (await facts.locator("[data-event-door]").count()) === 0,
    );
    record(
      tag + " loaded: I am going and Not going, Free., and the calendar line before an answer",
      (await page.locator('[data-event-rsvp][data-rsvp-state="open"]').count()) === 1 &&
        (await page.locator('[data-testid="rsvp-going"]').count()) === 1 &&
        (await page.locator('[data-testid="rsvp-not-going"]').count()) === 1 &&
        /Free\./.test(await page.locator("[data-event-rsvp]").textContent()) &&
        /Add to calendar appears once you are going\./.test(
          await page.locator("[data-event-share-row]").textContent(),
        ) &&
        (await page.locator('[data-testid="event-calendar"]').count()) === 0,
    );
    const goingText = await page.locator("[data-event-going]").textContent();
    record(
      tag +
        " loaded: Going is three names and others; the list marks Connection and Shared (739), no numeral",
      /^Going/.test(goingText.trim()) &&
        /Adaeze Nwosu, Ngozi Eze, Thandiwe Dube are going, and others/.test(goingText) &&
        (await page.locator('[data-going-row="connection"]').count()) === 3 &&
        (await page.locator('[data-going-row="shared"]').count()) === 1 &&
        (await page.locator('[data-going-row="member"]').count()) === 2 &&
        /Names appear only as each member chose to be seen\./.test(
          await page.locator("[data-event-going-list]").textContent(),
        ),
      goingText.slice(0, 120),
    );
    record(
      tag + " loaded: two accepted speakers, none pending (678)",
      (await page.locator('[data-event-speakers] [data-speaker="accepted"]').count()) === 2 &&
        (await page.locator('[data-event-speakers] [data-speaker="pending"]').count()) === 0,
    );
    const digits = await digitsOutsideFacts(page);
    record(
      tag + " loaded: no digit outside a date, a time or the door line (guardrail 1)",
      digits === "",
      digits,
    );
    record(
      tag + " loaded: the column sits at or under --content-max",
      (await page
        .locator("[data-event-page]")
        .evaluate((el) => el.getBoundingClientRect().width)) <= 680.5,
    );
    await noOverflow(page, tag + " loaded");
    await shot(page, `${tag}-01-loaded`);

    // Past: the past when line, This event has happened, Went, no attestation block (item 6.7).
    await open(page, "past", "past");
    const pastText = await page.locator("[data-event-page]").textContent();
    record(
      tag + " past: Happened line, This event has happened., Went and Who was there, no Say so",
      /Happened/.test(await page.locator('[data-fact="when"]').textContent()) &&
        pastText.includes("This event has happened.") &&
        /Went/.test(await page.locator("[data-event-going]").textContent()) &&
        pastText.includes("Who was there") &&
        !pastText.includes("Say so") &&
        (await page.locator('[data-testid="rsvp-going"]').count()) === 0,
    );

    // Cancelled: the full treatment (643): no img, no RSVP control, no Going row.
    await open(page, "cancelled", "cancelled");
    const cText = await page.locator("[data-event-page]").textContent();
    record(
      tag +
        " cancelled: kicker Event cancelled, struck title, the reason, no img, no RSVP, no Going",
      (await page.locator("[data-event-kicker]").textContent()).trim() === "Event cancelled" &&
        (
          await page
            .locator("[data-event-title]")
            .evaluate((el) => getComputedStyle(el).textDecorationLine)
        ).includes("line-through") &&
        cText.includes("The venue is no longer available.") &&
        cText.includes("told by email") &&
        (await page.locator("[data-event-page] img").count()) === 0 &&
        (await page.locator("[data-event-rsvp]").count()) === 0 &&
        (await page.locator("[data-event-going]").count()) === 0 &&
        (await page.locator("[data-event-facts]").count()) === 0,
      cText.slice(0, 160),
    );
    await shot(page, `${tag}-02-cancelled`);

    // At capacity, in words (623).
    await open(page, "full", "full");
    const fText = await page.locator("[data-event-rsvp]").textContent();
    record(
      tag + " full: This event is full over The host has no more room., no I am going",
      fText.includes("This event is full") &&
        fText.includes("The host has no more room.") &&
        (await page.locator('[data-testid="rsvp-going"]').count()) === 0,
      fText,
    );

    // Not found: null from the projection is the EmptyState.
    await open(page, "missing", "not-found");
    record(
      tag + " not found: EmptyState with a way back to Discovery (1065)",
      (await page.locator("[data-event-page] [data-empty-state]").count()) === 1 &&
        (await page
          .locator("[data-event-page] [data-empty-state]")
          .getByRole("button", { name: "Back to Discovery", exact: true })
          .count()) === 1 &&
        /This event is not available\./.test(await page.locator("[data-event-page]").textContent()),
    );

    // Error: the read failed; Try again re-reads.
    db.attend.fail = true;
    await open(page, "loaded", "error");
    db.attend.fail = false;
    await page.getByRole("button", { name: "Try again" }).click();
    await page.waitForSelector('[data-event-page][data-event-state="loaded"]', { timeout: 15000 });
    record(
      tag + " error: EmptyState, and Try again re-reads to loaded",
      (await state(page)) === "loaded",
    );

    record(tag + " no page errors", errors.length === 0, errors.join(" | ").slice(0, 300));
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 400));
  } finally {
    await browser.close();
  }
}

async function runEventFlows(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-event-flows`;
  M.armStart(tag);
  const db = makeMockDb();
  seedPosts(db, 1);
  seedAttend(db);
  seedAttendCard(db);
  const { browser, page, errors } = await context(browserType, [w, h], theme, db);
  const dialog = (label) => page.locator(`section[role="dialog"][aria-label="${label}"]`);
  const radios = (dlg) => dlg.locator('[role="radiogroup"]');
  const toast = async (text) => {
    await page.locator('[role="status"]', { hasText: text }).waitFor({ timeout: 8000 });
    return true;
  };
  try {
    await signIn(page);

    // The card: the speakers row at this tier, and the expanded card's hook into the page.
    const card = page.locator('[data-post-id="post-e-loaded"] article');
    await card.waitFor({ timeout: 10000 });
    record(
      tag + " card: the speakers row with two accepted pills (679)",
      (await card.locator("[data-card-speakers] [data-speaker]").count()) === 2 &&
        /Thandiwe Dube/.test(await card.locator("[data-card-speakers]").textContent()),
    );
    await card.locator("[data-read-more]").first().click();
    await page.waitForURL("**/posts/post-e-loaded**", { timeout: 10000 });
    const hook = page.locator('[data-post-id="post-e-loaded"] [data-hook="event"]');
    await hook.waitFor({ timeout: 10000 });
    const hookHref = await hook.getAttribute("href");
    // The hook is a plain anchor, so the tap is a document navigation. On run 301 WebKit's touch
    // context at 390 dark dropped that one tap while the expanded card was still settling and the
    // fifteen checks behind it never ran; the click is tried and, if the URL has not moved, the
    // anchor's own href is followed, with which path taken named in the detail. The assertion is
    // the same either way: the hook targets the page and the page opens with its Back row.
    await page.waitForLoadState("networkidle").catch(() => {});
    await hook.scrollIntoViewIfNeeded().catch(() => {});
    let via = "click";
    await hook.click();
    try {
      await page.waitForURL("**/convene/events/" + EV.loaded + "**", { timeout: 8000 });
    } catch {
      via = "href";
      await page.goto(BASE + hookHref, { waitUntil: "networkidle" });
    }
    await page.waitForSelector('[data-event-page][data-event-state="loaded"]', { timeout: 15000 });
    // Handoff 30-D item 11.3 (ruling 1036): when the tap did not navigate and the href was followed,
    // the tap is UNPROVEN with that reason, never PASS; the founder checks it once on a real iPhone.
    // The href assertion beneath stands on its own either way.
    if (via === "click")
      record(tag + " card: the expanded card's Event hook tap navigates to the page", true);
    else
      unproven(
        tag + " card: the expanded card's Event hook tap navigates to the page",
        "the tap did not move the URL within 8s and the anchor's href was followed instead (ruling 1036)",
      );
    record(
      tag +
        " card: the expanded card's Event hook targets the page, in its tier's form (1047, 1023)",
      hookHref === "/convene/events/" + EV.loaded &&
        page.url().includes("/convene/events/" + EV.loaded) &&
        // A tap carries the Feed as its origin (1065, 1067); a followed href is a document load.
        (await pageForm(page, w, via === "click" ? "Feed" : "Discovery")),
      "via " + via,
    );
    // 1065: from the Feed, the way back names Feed and returns to the expanded card, then forward.
    if (via === "click") {
      const back =
        w > 1024
          ? page.locator('button[aria-label="Back to Feed"]')
          : page.locator("[data-event-page] [data-back-row]");
      await back.click();
      await page
        .waitForURL((u) => u.pathname === "/posts/post-e-loaded", { timeout: 10000 })
        .catch(() => {});
      record(
        tag + " card: from the Feed the way back names Feed and returns to its card (1065)",
        new URL(page.url()).pathname === "/posts/post-e-loaded" &&
          (await page.locator('[data-post-id="post-e-loaded"] [data-hook="event"]').count()) === 1,
        page.url(),
      );
      await page.goForward();
      await page.waitForSelector('[data-event-page][data-event-state="loaded"]', {
        timeout: 15000,
      });
    } else
      unproven(
        tag + " card: from the Feed the way back names Feed and returns to its card (1065)",
        "the tap did not navigate and the href was followed, which carries no origin (ruling 1036)",
      );

    // First RSVP (1030): two radiogroups, My connections preselected, the default written.
    await page.click('[data-testid="rsvp-going"]');
    let dlg = dialog("Are you going?");
    await dlg.waitFor({ timeout: 8000 });
    record(
      tag + " first RSVP: two radiogroups, connections preselected, the once line",
      (await radios(dlg).count()) === 2 &&
        (await dlg
          .locator(
            '[role="radiogroup"][aria-label="Who can see you are going"] [role="radio"][aria-checked="true"]',
          )
          .textContent()) === "My connections" &&
        /You choose this once; it becomes your default/.test(await dlg.textContent()),
    );
    await dlg.locator('[role="radio"]', { hasText: "Anyone on DNA" }).click();
    await dlg.locator('[data-testid="rsvp-confirm"]').click();
    await toast("You are going. The door is on the page and in your email.");
    await page.waitForSelector('[data-event-rsvp][data-rsvp-state="going"]', { timeout: 10000 });
    const first = db.attend.rsvps[0];
    record(
      tag +
        " first RSVP: rsvp_event carried going and the chosen scope, the default was set, the pill and calendar follow",
      first &&
        first.p_status === "going" &&
        first.p_audience_override === "everyone" &&
        db.attend.pages[EV.loaded].viewer.has_default === true &&
        db.attend.pages[EV.loaded].viewer.registration.audience_override === null &&
        (await page.locator("[data-rsvp-pill]").textContent()).includes("You are going") &&
        (await page.locator('[data-testid="event-calendar"]').count()) === 1,
      JSON.stringify(first),
    );

    // Add to calendar: one .ics with the event's UID and UTC times (item 9.2).
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }),
      page.click('[data-testid="event-calendar"]'),
    ]);
    const icsPath = await download.path();
    const ics = icsPath ? fs.readFileSync(icsPath, "utf8") : "";
    record(
      tag + " calendar: a .ics named for the slug, with the UID, a UTC start and the location",
      download.suggestedFilename() === SLUG + ".ics" &&
        ics.includes("BEGIN:VCALENDAR") &&
        ics.includes("UID:" + EV.loaded) &&
        /DTSTART:\d{8}T\d{6}Z/.test(ics) &&
        ics.includes("LOCATION:Front Room\\, Accra\\, Ghana"),
      download.suggestedFilename() + " " + ics.slice(0, 80).replace(/\r?\n/g, " "),
    );

    // A later answer: one radiogroup, the default's line, the override revealed and sent.
    await page.click('[data-testid="rsvp-change"]');
    dlg = dialog("Change your answer");
    await dlg.waitFor({ timeout: 8000 });
    const oneGroup = (await radios(dlg).count()) === 1;
    const defaultLine = /Visible to anyone on DNA\./.test(await dlg.textContent());
    await dlg.locator('[data-testid="rsvp-override"]').click();
    const twoAfter = (await radios(dlg).count()) === 2;
    await dlg
      .locator('[role="radio"]', { hasText: "People I share a Space or event with" })
      .click();
    await dlg.locator('[data-testid="rsvp-confirm"]').click();
    await toast("You are going. The door is on the page and in your email.");
    const second = db.attend.rsvps[1];
    record(
      tag +
        " later RSVP: one radiogroup and the default's line, Change for this event reveals the second, the override is sent",
      oneGroup && defaultLine && twoAfter && second && second.p_audience_override === "anchored",
      JSON.stringify(second),
    );

    // Withdraw: the inline confirm, then not_going.
    await page.click('[data-testid="rsvp-change"]');
    dlg = dialog("Change your answer");
    await dlg.waitFor({ timeout: 8000 });
    await dlg.locator('[data-testid="rsvp-withdraw"]').click();
    const confirmShown = (await dlg.locator("[data-rsvp-withdraw]").count()) === 1;
    await dlg.locator("[data-rsvp-withdraw] button", { hasText: "Withdraw" }).click();
    await toast("Withdrawn. Your name is off the list.");
    await page.waitForSelector('[data-event-rsvp][data-rsvp-state="not-going"]', {
      timeout: 10000,
    });
    const third = db.attend.rsvps[2];
    record(
      tag + " withdraw: the inline confirm, then not_going, then You said not going.",
      confirmShown &&
        third &&
        third.p_status === "not_going" &&
        /You said not going\./.test(await page.locator("[data-event-rsvp]").textContent()),
    );

    // At capacity from the server, then the SPEC's one error line.
    db.attend.rsvpFail = "This event is full.";
    await page.click('[data-testid="rsvp-change"]');
    dlg = dialog("Change your answer");
    await dlg.waitFor({ timeout: 8000 });
    await dlg.locator('[role="radio"]', { hasText: "Going" }).first().click();
    await dlg.locator('[data-testid="rsvp-confirm"]').click();
    await dialog("This event is full").waitFor({ timeout: 8000 });
    record(
      tag +
        " at capacity: the server's This event is full. becomes the full state with one line and Close",
      (await dialog("This event is full").locator("[data-rsvp-full]").textContent()).trim() ===
        "The host has no more room.",
    );
    await dialog("This event is full")
      .locator("[data-sheet-actions] button", { hasText: "Close" })
      .click();
    db.attend.rsvpFail = "something else went wrong";
    await page.click('[data-testid="rsvp-change"]');
    dlg = dialog("Change your answer");
    await dlg.waitFor({ timeout: 8000 });
    await dlg.locator('[data-testid="rsvp-confirm"]').click();
    await dlg.locator("[data-sheet-error]").waitFor({ timeout: 8000 });
    record(
      tag + " error: every other failure is the SPEC's error line",
      (await dlg.locator("[data-sheet-error]").textContent()).trim() ===
        "Could not save your answer. Check your connection and try again.",
    );
    db.attend.rsvpFail = null;
    await page.keyboard.press("Escape");
    await dlg.waitFor({ state: "detached", timeout: 8000 });

    // Share: the public URL and the code for a public event (1028); no code for a private one.
    await page.click('[data-testid="event-share"]');
    let share = dialog("Share this event");
    await share.waitFor({ timeout: 8000 });
    await share.locator('[data-share-code] img[src^="data:image"]').waitFor({ timeout: 8000 });
    const origin = new URL(BASE).origin;
    record(
      tag + " share: the public URL, the code labelled as a page link that admits nobody",
      (await share.locator("[data-share-url]").textContent()).includes(origin + "/e/" + SLUG) &&
        /Page link, as a code/.test(await share.textContent()) &&
        /It is not a ticket and admits nobody\./.test(await share.textContent()),
    );
    await share.getByRole("button", { name: "Done" }).click();
    await share.waitFor({ state: "detached", timeout: 8000 });
    await open(page, "private", "loaded");
    await page.click('[data-testid="event-share"]');
    share = dialog("Share this event");
    await share.waitFor({ timeout: 8000 });
    record(
      tag + " share: a connections event carries the member link and no code",
      (await share.locator("[data-share-url]").textContent()).includes(
        origin + "/convene/events/" + EV.private,
      ) && (await share.locator("[data-share-code]").count()) === 0,
    );
    await share.getByRole("button", { name: "Done" }).click();
    await share.waitFor({ state: "detached", timeout: 8000 });

    // The invitation notice and sheet (736, 1027): no profile line, Accept answers, the row leaves.
    await open(page, "loaded", "loaded");
    const notice = page.locator('[data-event-invitation] [data-kind="role_invitation"]');
    record(
      tag +
        " invitation: the notice renders through role_invitation with the host's sentence and Respond",
      (await notice.count()) === 1 &&
        /Kwame Mensah invited you to moderate this event\./.test(await notice.textContent()) &&
        (await notice.locator('[data-testid="notification-respond"]').count()) === 1,
    );
    await notice.locator('[data-testid="notification-respond"]').click();
    const inv = dialog("Moderate " + TITLE + "?");
    await inv.waitFor({ timeout: 8000 });
    const invText = await inv.textContent();
    record(
      tag +
        " invitation sheet: the title, the when and place rows, Decline and Accept, no Brief 7 line (1027)",
      /invited you to moderate this event\./.test(invText) &&
        /Front Room, Accra/.test(invText) &&
        !/Your profile lists the role/.test(invText) &&
        (await inv.locator('[data-testid="invitation-decline"]').count()) === 1,
      invText.slice(0, 160),
    );
    await inv.locator('[data-testid="invitation-accept"]').click();
    await inv.waitFor({ state: "detached", timeout: 8000 });
    await page.waitForFunction(
      () => document.querySelectorAll("[data-event-invitation]").length === 0,
      null,
      { timeout: 10000 },
    );
    record(
      tag +
        " invitation: respond_to_event_role carried accept, and the accepted row stops rendering (1027)",
      db.attend.responses.length === 1 &&
        db.attend.responses[0].p_party === "party-1" &&
        db.attend.responses[0].p_accept === true,
    );

    // The notification row: its destination in words, and Respond opening the event page.
    db.attend.parties = [
      { id: "party-2", event_id: EV.loaded, role: "moderator", status: "invited" },
    ];
    db.notifications.push({
      id: "n-role",
      recipient_member_id: UID,
      kind: "role_invitation",
      c_category: "convene",
      actor_kind: "member",
      actor_id: HOST,
      object_kind: "event_party",
      object_id: "party-2",
      read_at: null,
      created_at: new Date(Date.now() - 5 * 60e3).toISOString(),
    });
    await page.goto(BASE + "/feed", { waitUntil: "networkidle" });
    await page
      .getByRole("button", { name: /Notifications/ })
      .first()
      .click();
    const row = page.locator('[data-kind="role_invitation"]');
    await row.waitFor({ timeout: 10000 });
    record(
      tag + " notification: the row names Opens the event and carries Respond",
      (await row.getAttribute("data-destination")) === "Opens the event" &&
        /invited you to moderate this event\./.test(await row.textContent()) &&
        (await row.locator('[data-testid="notification-respond"]').count()) === 1,
    );
    await row.locator('[data-testid="notification-respond"]').click();
    await page.waitForURL("**/convene/events/" + EV.loaded + "**", { timeout: 10000 });
    record(
      tag + " notification: Respond opens the event page and marks the row read",
      page.url().includes("/convene/events/" + EV.loaded) && db.reads.includes("n-role"),
    );

    record(tag + " no page errors", errors.length === 0, errors.join(" | ").slice(0, 300));
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 400));
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------------------------
// Handoff 30-D: the public page's guest path (B10-SPEC sections 3.7 and 4; rulings 532, 626, 1026,
// 1034), against the mock's guest-rsvp and event_public_page.
// ---------------------------------------------------------------------------------------------

const PAID_SLUG = "corridor-suppers-paid-7d8e9f";
const PAST_SLUG = "corridor-suppers-past-1a2b3c";
const GUEST_TOKEN = "guest-link-token-one";
const GUEST_TOKEN_2 = "guest-link-token-two";
const GUEST_EMAIL = "guest@example.com";
const GUEST_EMAIL_2 = "second.guest@example.com";
const GUEST_FREE_LINE = "Free. You will be asked for an email so the door can reach you.";
const GUEST_FIELD_LINE = "One email address, so the door can reach you. Nothing else is asked.";

/** The public projection's answer for a slug, in the shape src/lib/event-public.ts reads (1028). */
function publicPage(kind, overrides = {}) {
  const pg = attendPage(kind);
  const { id: _id, status: _status, full: _full, public: _public, ...event } = pg.event;
  return {
    event: { ...event, ...overrides },
    body: pg.post.body,
    presented_by: { kind: pg.presented_by.kind, name: pg.presented_by.name },
    host: { name: pg.host.name },
    media: [],
    place: {
      place_name: pg.place.place_name,
      place_text: pg.place.place_text,
      city: pg.place.city,
      region: pg.place.region,
      country: pg.place.country,
    },
    speakers: pg.speakers.map((sp) => ({
      party_id: sp.party_id,
      name: sp.name,
      role: sp.role,
      label: sp.label,
      has_photo: false,
    })),
    pending_roles: [],
    partners: [],
  };
}

function seedGuest(db) {
  db.attend.publicPages[SLUG] = publicPage("loaded");
  db.attend.publicPages[PAID_SLUG] = publicPage("loaded", { slug: PAID_SLUG, ticket_kind: "paid" });
  db.attend.publicPages[PAST_SLUG] = publicPage("past", { slug: PAST_SLUG });
  db.attend.guest.tokens[GUEST_TOKEN] = GUEST_EMAIL;
  db.attend.guest.tokens[GUEST_TOKEN_2] = GUEST_EMAIL_2;
}

/**
 * A client-side navigation to a public page. The route's loader runs in the browser on a client
 * navigation and reads event_public_page through the mock; a document request would render on the
 * server against the project, which the mock cannot reach. The router listens to popstate.
 */
async function clientGo(page, path) {
  await page.evaluate((p) => {
    window.history.pushState({}, "", p);
    window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
  }, path);
}

/**
 * The names the member page's going list carries and the public projection does not; none may
 * reach the guest's page (626). Thandiwe Dube and Ngozi Eze are accepted speakers as well, which
 * the public page shows by design (678), so they are not in this list.
 */
const ATTENDEE_NAMES = ["Adaeze Nwosu", "Sefa Owusu", "Folake Adeyemi", "Wanjiru Kamau"];

async function runGuest(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-guest`;
  M.armStart(tag);
  const db = makeMockDb();
  seedPosts(db, 1);
  seedAttend(db);
  seedGuest(db);
  const { browser, page, errors } = await context(browserType, [w, h], theme, db);
  const dialog = (label) => page.locator(`section[role="dialog"][aria-label="${label}"]`);
  const rsvp = () => page.locator("[data-guest-rsvp]");
  const rsvpState = () => rsvp().getAttribute("data-rsvp-state");
  const openPublic = async (slug, query = "") => {
    await clientGo(page, "/e/" + slug + query);
    await page.waitForSelector(`[data-public-event="${slug}"]`, { timeout: 15000 });
  };
  const g = db.attend.guest;
  try {
    // Signed out, on a page of the deployment, so the router is live for a client navigation.
    await page.goto(BASE + "/sign-in", { waitUntil: "networkidle" });

    // 1. The affordance, only where item 8.1 says: free, neither cancelled nor over.
    await openPublic(SLUG);
    await rsvp().waitFor({ timeout: 10000 });
    record(
      tag + " affordance: I am going with the Free line for a free upcoming event",
      (await rsvpState()) === "open" &&
        (await page.locator('[data-testid="guest-going"]').textContent()).trim() === "I am going" &&
        (await rsvp().textContent()).includes(GUEST_FREE_LINE),
    );
    await openPublic(PAID_SLUG);
    record(
      tag + " affordance: absent on a paid event (Pass 4's)",
      (await rsvp().count()) === 0 &&
        (await page.locator('[data-testid="guest-going"]').count()) === 0,
    );
    await openPublic(PAST_SLUG);
    record(
      tag + " affordance: absent on an event that has happened",
      (await rsvp().count()) === 0 &&
        (await page.locator('[data-testid="guest-going"]').count()) === 0,
    );

    // 2. Email: one Input, the field line, Send me a link.
    await openPublic(SLUG);
    await page.click('[data-testid="guest-going"]');
    let dlg = dialog("I am going");
    await dlg.waitFor({ timeout: 8000 });
    record(
      tag + " email: I am going, one email Input, the field line and Send me a link",
      (await dlg.locator('input[type="email"]').count()) === 1 &&
        (await dlg.textContent()).includes(GUEST_FIELD_LINE) &&
        (await dlg.locator('[data-testid="guest-send"]').textContent()).trim() === "Send me a link",
    );
    await noOverflow(page, tag + " email sheet");
    await shot(page, tag + "-email");
    await dlg.locator('input[type="email"]').fill("nope");
    await dlg.locator('[data-testid="guest-send"]').click();
    await dlg.locator("text=That is not an email address.").waitFor({ timeout: 8000 });
    record(
      tag + " email: the database's own sentence renders under the field and the state stands",
      (await page.locator('[data-guest-sheet="email"]').count()) === 1,
    );
    await dlg.locator('input[type="email"]').fill(GUEST_EMAIL);
    await dlg.locator('[data-testid="guest-send"]').click();
    dlg = dialog("Check your email");
    await dlg.waitFor({ timeout: 8000 });
    const sentText = await dlg.textContent();
    record(
      tag + " sent: Check your email, the address, it signs you in for this event only, Done",
      sentText.includes(GUEST_EMAIL) &&
        sentText.includes("it signs you in for this event only") &&
        (await dlg.locator('[data-testid="guest-done"]').count()) === 1 &&
        g.requests.length === 2 &&
        g.requests[1].slug === SLUG &&
        g.requests[1].email === GUEST_EMAIL,
      "requests " + JSON.stringify(g.requests.map((r) => r.email)),
    );
    await dlg.locator('[data-testid="guest-done"]').click();
    await dlg.waitFor({ state: "hidden", timeout: 8000 });
    record(
      tag + " sent: Done closes the sheet and the affordance stands",
      (await rsvpState()) === "open",
    );

    // 3. Arriving with ?g=: opened once from the browser, the address replaced, Returned.
    await openPublic(SLUG, "?g=" + GUEST_TOKEN);
    dlg = dialog("You are going");
    await dlg.waitFor({ timeout: 10000 });
    record(
      tag + " link: the address is replaced with the clean /e/{slug} and open was called once",
      page.url().endsWith("/e/" + SLUG) &&
        !page.url().includes("g=") &&
        g.answers.filter((a) => a.action === "open").length === 1,
      page.url(),
    );
    record(
      tag + " returned: You are going and Continue",
      (await dlg.locator('[data-testid="guest-continue"]').textContent()).trim() === "Continue",
    );
    await shot(page, tag + "-returned");
    await dlg.locator('[data-testid="guest-continue"]').click();
    dlg = dialog("Keep this with an account?");
    await dlg.waitFor({ timeout: 8000 });
    record(
      tag + " conversion: the once-only offer with Continue as a guest and Create an account",
      (await dlg.locator('[data-testid="guest-stay"]').textContent()).trim() ===
        "Continue as a guest" &&
        (await dlg.locator('[data-testid="guest-create-account"]').textContent()).trim() ===
          "Create an account",
    );
    await dlg.locator('[data-testid="guest-stay"]').click();
    await dlg.waitFor({ state: "hidden", timeout: 8000 });
    record(
      tag + " page: You are going. and Change once the guest has answered",
      (await rsvpState()) === "going" &&
        (await rsvp().textContent()).includes("You are going.") &&
        (await page.locator('[data-testid="guest-change"]').count()) === 1,
    );
    const pageText = await page.locator("[data-public-event]").textContent();
    record(
      tag + " page: no attendee anywhere on the guest's page (626)",
      ATTENDEE_NAMES.every((n) => !pageText.includes(n)) &&
        (await page.locator("[data-going-row], [data-event-going]").count()) === 0,
    );

    // 4. Existing: Change, Keep it | Withdraw, and I am going again.
    await page.click('[data-testid="guest-change"]');
    dlg = dialog("You already said you are going");
    await dlg.waitFor({ timeout: 8000 });
    record(
      tag + " existing: You already said you are going with Keep it and Withdraw",
      (await dlg.locator('[data-testid="guest-keep"]').count()) === 1 &&
        (await dlg.locator('[data-testid="guest-withdraw"][data-destructive]').count()) === 1,
    );
    await dlg.locator('[data-testid="guest-withdraw"]').click();
    dlg = dialog("You are not going");
    await dlg.waitFor({ timeout: 8000 });
    record(
      tag + " existing: Withdraw sends not_going and the sheet offers I am going again",
      g.answers[g.answers.length - 1].action === "not_going" &&
        (await dlg.locator('[data-testid="guest-going-again"]').textContent()).trim() ===
          "I am going",
    );
    await dlg.locator('[data-testid="guest-going-again"]').click();
    await dlg.waitFor({ state: "hidden", timeout: 8000 });
    record(
      tag +
        " existing: I am going again sends going and, the offer spent, closes on You are going.",
      g.answers[g.answers.length - 1].action === "going" &&
        (await rsvpState()) === "going" &&
        (await rsvp().textContent()).includes("You are going."),
    );
    await openPublic(SLUG, "?g=" + GUEST_TOKEN);
    dlg = dialog("You already said you are going");
    await dlg.waitFor({ timeout: 10000 });
    record(
      tag + " link: a second open reports the row as existing and makes no second offer",
      g.answers.filter((a) => a.action === "open").length === 2,
    );
    await dlg.locator('[data-testid="guest-keep"]').click();
    await dlg.waitFor({ state: "hidden", timeout: 8000 });

    // 5. Expired: a tampered link.
    await openPublic(SLUG, "?g=not-a-link-anyone-minted");
    dlg = dialog("This link has expired");
    await dlg.waitFor({ timeout: 10000 });
    record(
      tag + " expired: This link has expired, the email field and Send a new link",
      (await dlg.locator('input[type="email"]').count()) === 1 &&
        (await dlg.locator('[data-testid="guest-send"]').textContent()).trim() ===
          "Send a new link",
    );
    await dlg.locator('input[type="email"]').fill(GUEST_EMAIL);
    await dlg.locator('[data-testid="guest-send"]').click();
    dlg = dialog("Check your email");
    await dlg.waitFor({ timeout: 8000 });
    record(
      tag + " expired: Send a new link asks for one and lands on Sent",
      g.requests[g.requests.length - 1].email === GUEST_EMAIL,
    );
    await dlg.locator('[data-testid="guest-done"]').click();
    await dlg.waitFor({ state: "hidden", timeout: 8000 });

    // 6. Create an account: the one sign-up flow, the address prefilled (item 8.5).
    g.row = null;
    g.offered = false;
    await openPublic(SLUG, "?g=" + GUEST_TOKEN_2);
    dlg = dialog("You are going");
    await dlg.waitFor({ timeout: 10000 });
    await dlg.locator('[data-testid="guest-continue"]').click();
    dlg = dialog("Keep this with an account?");
    await dlg.waitFor({ timeout: 8000 });
    await dlg.locator('[data-testid="guest-create-account"]').click();
    await page.waitForURL("**/sign-in?**", { timeout: 15000 });
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    const url = new URL(page.url());
    record(
      tag + " create an account: the existing sign-up flow opens with the address prefilled",
      url.pathname === "/sign-in" &&
        // The route's validateSearch reads join=1 as true and the router re-serialises it.
        ["1", "true"].includes(url.searchParams.get("join")) &&
        url.searchParams.get("email") === GUEST_EMAIL_2 &&
        (await page.locator('input[type="email"]').inputValue()) === GUEST_EMAIL_2 &&
        (await page.locator("h1").first().textContent()).trim() === "Create your account",
      page.url(),
    );

    record(tag + " no page errors", errors.length === 0, errors.join(" | ").slice(0, 300));
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 400));
  } finally {
    await browser.close();
  }
}

module.exports = {
  runEvent,
  runEventFlows,
  runGuest,
  attendPage,
  seedAttend,
  seedAttendCard,
  seedGuest,
  publicPage,
};
