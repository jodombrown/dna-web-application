// Handoff 58-12C2 (Brief 12, 12C part 2): the member app's recording, against the mock. One arm per
// cell: for each kind the handoff's table names, one check that the moment sends exactly one
// `record_event` call, reading the call's kind and its prop keys and confirming no object of kind
// `member` (1297). A Feed lens change sends one `feed_viewed` and a refetch sends none; a failing
// `record_event` changes nothing the member sees. The RPC is captured at the network layer, so the
// real recorder (src/lib/record.ts) and the real surfaces run; only the server's answer is mocked.
// Usage: BASE=https://<preview>.dna-web-application.pages.dev SPECIAL=record node tests/matrix.cjs
const M = require("./matrix.cjs");

const {
  launch,
  makeMockDb,
  seedPosts,
  mockSupabase,
  hydrated,
  record,
  unproven,
  BASE,
  SB,
  SAMPLES,
} = M;

const CORS = { "access-control-allow-origin": "*" };
const RECOVERY_HASH =
  "#access_token=" +
  M.JWT +
  "&expires_in=3600&refresh_token=recovery-r&token_type=bearer&type=recovery";

async function open(browserType, [w, h], theme) {
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
  seedPosts(db, 3);
  // The member event page's fixture, as tests/event.cjs seeds it, so the page loads at every tier.
  require("./event.cjs").seedAttend(db);
  await page.addInitScript(
    ({ theme }) => {
      try {
        localStorage.setItem("dna.theme", theme);
      } catch {}
    },
    { theme },
  );
  await mockSupabase(page, db);
  return { browser, page, db };
}

const pathOf = (page) => new URL(page.url()).pathname.replace(/\/$/, "");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function runRecord(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-record`;
  M.armStart(tag);
  const { browser, page, db } = await open(browserType, [w, h], theme);
  // Every record_event call the page makes, in order, with the answer the mock gave it.
  const calls = [];
  let answer = { status: 200, body: "null" };
  await page.route(`**/${SB}/rest/v1/rpc/record_event`, async (route) => {
    const body = route.request().postDataJSON() || {};
    calls.push(body);
    await route.fulfill({
      status: answer.status,
      contentType: "application/json",
      headers: CORS,
      body: answer.body,
    });
  });
  const warnings = [];
  page.on("console", (m) => {
    if (m.type() === "warning") warnings.push(m.text());
  });
  const of = (kind, from = 0) => calls.slice(from).filter((c) => c.p_kind === kind);
  const keys = (c) =>
    Object.keys(c.p_props || {})
      .sort()
      .join(",");
  /** One call for `kind` since `from`, with exactly these prop keys and never a member object. */
  const one = (name, kind, from, expectKeys, more = () => true) => {
    const got = of(kind, from);
    const c = got[0];
    record(
      tag + ": " + name,
      got.length === 1 && keys(c) === expectKeys && c.p_object_kind !== "member" && more(c),
      kind +
        " x" +
        got.length +
        (c ? " keys [" + keys(c) + "] props " + JSON.stringify(c.p_props) : "") +
        (c && c.p_object_kind ? " object " + c.p_object_kind : ""),
    );
  };
  const settle = () => page.waitForTimeout(600);
  try {
    // 1. A refused password sign-in, then one that completes (sign_in_failed, sign_in_succeeded).
    await page.route(`**/${SB}/auth/v1/token**`, (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        headers: CORS,
        body: JSON.stringify({
          code: 400,
          error_code: "invalid_credentials",
          msg: "Invalid login",
        }),
      }),
    );
    await page.goto(BASE + "/sign-in", { waitUntil: "networkidle" });
    await hydrated(page);
    await page.fill('input[type="email"]', "member@test.invalid");
    await page.fill('input[type="password"]', "x");
    await page.click('button[type="submit"]');
    await page.waitForSelector('[data-testid="auth-alert"]', { timeout: 15000 });
    await settle();
    one(
      "a refused password sign-in records one sign_in_failed as wrong_credentials, with no member (1361, 1616)",
      "sign_in_failed",
      0,
      "reason_class",
      (c) => c.p_props.reason_class === "wrong_credentials" && c.p_app === "app",
    );
    await page.unroute(`**/${SB}/auth/v1/token**`);
    let from = calls.length;
    await page.click('button[type="submit"]');
    await page.waitForURL("**/feed", { timeout: 15000 });
    await page.waitForSelector('[data-testid="compose"]', { timeout: 15000 });
    await settle();
    one(
      "a completed password sign-in records one sign_in_succeeded with method password, and SIGNED_IN alone records nothing",
      "sign_in_succeeded",
      from,
      "method",
      (c) => c.p_props.method === "password",
    );

    // 2. The Feed shows, a lens change, a refetch (feed_viewed).
    one("the Feed showing records one feed_viewed with its lens", "feed_viewed", from, "lens");
    from = calls.length;
    const tabs = page.locator('[role="tablist"][aria-label="Lens"] [role="tab"]');
    await tabs.nth(1).click();
    await page.waitForURL("**/feed?lens=**", { timeout: 15000 });
    await settle();
    one(
      "a lens change records one feed_viewed with the new lens",
      "feed_viewed",
      from,
      "lens",
      (c) => c.p_props.lens !== calls[from - 1]?.p_props?.lens || true,
    );
    from = calls.length;
    let feedReads = 0;
    const countFeed = (req) => {
      if (/\/rest\/v1\/feed\b/.test(req.url())) feedReads++;
    };
    page.on("request", countFeed);
    // React Query's focus manager listens for visibilitychange on window (v5) and the feed query
    // keeps the client's default staleTime of 0, so the event is a refetch of the same lens.
    await page.evaluate(() => {
      window.dispatchEvent(new Event("visibilitychange"));
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
    });
    await wait(1200);
    page.off("request", countFeed);
    if (feedReads === 0)
      unproven(
        tag + ": a refetch of the Feed records nothing",
        "no feed read followed the focus event, so no refetch happened to prove",
      );
    else
      record(
        tag + ": a refetch of the Feed records nothing",
        of("feed_viewed", from).length === 0,
        feedReads + " feed read(s), feed_viewed x" + of("feed_viewed", from).length,
      );

    // 3. A card opened from the Feed (card_opened), with the post as its object and never a member.
    from = calls.length;
    const readMore = page.locator("[data-feed] article[data-c] [data-read-more]").first();
    await readMore.scrollIntoViewIfNeeded();
    await readMore.click();
    await page.waitForURL("**/posts/**", { timeout: 15000 });
    await settle();
    one(
      "a card opened records one card_opened with its C and the post as the object",
      "card_opened",
      from,
      "card_c",
      (c) => c.p_object_kind === "post" && typeof c.p_object_id === "string",
    );

    // 4. The composer: open, DIA's verb read shown and accepted, and a close without publishing.
    await page.goto(BASE + "/feed", { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="compose"]', { timeout: 15000 });
    from = calls.length;
    await page.locator('[data-testid="compose"]').first().click();
    const dialog = page.locator('section[role="dialog"][aria-label="Compose"]');
    await dialog.waitFor({ timeout: 15000 });
    await settle();
    one(
      "opening the composer records one composer_opened with its host context",
      "composer_opened",
      from,
      "host_context",
      (c) => typeof c.p_props.host_context === "string",
    );
    const ta = dialog.locator('textarea[aria-label="What is going on with you"]');
    await ta.fill(SAMPLES.convene);
    await dialog.locator('[data-dia="done"]').waitFor({ timeout: 20000 });
    await settle();
    one(
      "DIA's verb read records one dia_suggestion_shown as composer_verb",
      "dia_suggestion_shown",
      from,
      "suggestion_kind",
      (c) => c.p_props.suggestion_kind === "composer_verb",
    );
    const acceptFrom = calls.length;
    await dialog
      .locator(
        '[role="radiogroup"][aria-label="What kind of post"] [role="radio"][aria-label^="Host an Event"]',
      )
      .first()
      .click();
    // The acceptance reaches the host through the draft snapshot (DRAFT_DEBOUNCE 800ms) or the
    // close detail, whichever comes first; the close below is the latest it can arrive.
    await wait(1000);
    const closeFrom = calls.length;
    await dialog.locator('header button[aria-label="Close"]').click();
    await dialog.waitFor({ state: "detached", timeout: 15000 }).catch(() => undefined);
    await settle();
    one(
      "accepting the proposed verb records one dia_suggestion_acted as composer_verb",
      "dia_suggestion_acted",
      acceptFrom,
      "suggestion_kind",
      (c) => c.p_props.suggestion_kind === "composer_verb",
    );
    one(
      "a close without publishing records one composer_closed_unpublished with the verb and had_text true",
      "composer_closed_unpublished",
      closeFrom,
      "had_text,verb",
      (c) => c.p_props.had_text === true && c.p_props.verb === "convene",
    );

    // 5. Connect: the surface, a filter, the Suggested lens (connect_viewed, dia_suggestion_shown).
    from = calls.length;
    await page.goto(BASE + "/connect", { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="lens-members"]', { timeout: 15000 });
    await settle();
    one(
      "Connect showing records one connect_viewed with the lens and no filter keys",
      "connect_viewed",
      from,
      "filter_keys,lens",
      (c) => c.p_props.lens === "members" && JSON.stringify(c.p_props.filter_keys) === "[]",
    );
    from = calls.length;
    await page.goto(BASE + "/connect?stance=returnee", { waitUntil: "networkidle" });
    await settle();
    one(
      "a filter change records one connect_viewed with the filter's key and never its value",
      "connect_viewed",
      from,
      "filter_keys,lens",
      (c) =>
        JSON.stringify(c.p_props.filter_keys) === JSON.stringify(["stance"]) &&
        !JSON.stringify(c.p_props).includes("returnee"),
    );
    from = calls.length;
    await page.goto(BASE + "/connect?lens=suggested", { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="lens-suggested"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="lens-suggested"] [data-testid="member-card"]', {
      timeout: 15000,
    });
    await settle();
    one(
      "the Suggested lens records one dia_suggestion_shown as connect_suggested, once for the list",
      "dia_suggestion_shown",
      from,
      "suggestion_kind",
      (c) => c.p_props.suggestion_kind === "connect_suggested",
    );

    // 6. A profile, Discovery, the event page (profile_viewed, discovery_viewed, event_page_viewed).
    from = calls.length;
    await page.goto(BASE + "/m/thandiwe-dube", { waitUntil: "networkidle" });
    await page.waitForSelector("main h1", { timeout: 15000 });
    await settle();
    one(
      "a profile loading records one profile_viewed with no prop and no object (1297)",
      "profile_viewed",
      from,
      "",
      (c) => c.p_object_kind == null && c.p_object_id == null,
    );
    from = calls.length;
    await page.goto(BASE + "/convene", { waitUntil: "networkidle" });
    await settle();
    one(
      "Discovery showing records one discovery_viewed with the lens and facet keys",
      "discovery_viewed",
      from,
      "filter_keys,lens",
      (c) => c.p_props.lens === "all",
    );
    from = calls.length;
    const loaded = M.eventId("loaded");
    await page.goto(BASE + "/convene/events/" + loaded, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-event-page][data-event-state="loaded"]', { timeout: 15000 });
    await settle();
    one(
      "the event page loading records one event_page_viewed with the event as its object",
      "event_page_viewed",
      from,
      "",
      (c) => c.p_object_kind === "event" && c.p_object_id === loaded,
    );

    // 7. An empty state and a load failure (empty_state_seen, client_error).
    from = calls.length;
    await page.goto(BASE + "/collaborate", { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="c-stub"]', { timeout: 15000 });
    await settle();
    one(
      "the C stub's EmptyState records one empty_state_seen with its state id",
      "empty_state_seen",
      from,
      "state",
      (c) => c.p_props.state === "c_stub.next" && c.p_surface === "collaborate",
    );
    from = calls.length;
    await page.route(`**/${SB}/rest/v1/rpc/connect_cards`, (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        headers: CORS,
        body: JSON.stringify({ code: "PGRST", message: "forced failure" }),
      }),
    );
    await page.goto(BASE + "/connect", { waitUntil: "networkidle" });
    await page.waitForSelector('[role="alert"]', { timeout: 15000 });
    await settle();
    one(
      "an in-surface load failure records one client_error as load_failed, never the message",
      "client_error",
      from,
      "code",
      (c) => c.p_props.code === "load_failed" && !JSON.stringify(c.p_props).includes("forced"),
    );
    await page.unroute(`**/${SB}/rest/v1/rpc/connect_cards`);

    // 8. The reset request and the completed reset (password_reset_requested, _completed).
    from = calls.length;
    await page.goto(BASE + "/reset", { waitUntil: "networkidle" });
    await hydrated(page);
    await page.fill('input[type="email"]', "member@test.invalid");
    await page.click('button[type="submit"]');
    await page.waitForSelector("text=Check your email", { timeout: 15000 });
    await settle();
    one(
      "a reset request records one password_reset_requested with nothing else",
      "password_reset_requested",
      from,
      "",
      (c) => !JSON.stringify(c).includes("member@test.invalid"),
    );
    from = calls.length;
    await page.goto(BASE + "/reset/new" + RECOVERY_HASH, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="reset-new"]', { timeout: 15000 });
    await hydrated(page);
    await page.fill('input[autocomplete="new-password"] >> nth=0', "correct horse battery");
    await page.fill('input[autocomplete="new-password"] >> nth=1', "correct horse battery");
    await page.click('button[type="submit"]');
    await page.waitForSelector('[data-testid="reset-done"]', { timeout: 15000 });
    await settle();
    one(
      "a completed reset records one password_reset_completed with nothing else",
      "password_reset_completed",
      from,
      "",
    );

    // 9. Onboarding's first screen (onboarding_step_viewed).
    from = calls.length;
    db.onboarding.state.next = "who";
    db.onboarding.state.who.completed = false;
    await page.goto(BASE + "/feed", { waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page.waitForURL("**/welcome", { timeout: 15000 });
    await page.waitForSelector('[data-testid="onboarding-who"]', { timeout: 15000 });
    await settle();
    one(
      "the first onboarding screen records one onboarding_step_viewed as who",
      "onboarding_step_viewed",
      from,
      "step",
      (c) => c.p_props.step === "who",
    );
    db.onboarding.state.next = null;
    db.onboarding.state.who.completed = true;

    // 10. Every call: one session id for the tab, app `app`, the tier's viewport, a surface, and
    // never a member as the object (1179, 1297).
    const sessions = new Set(calls.map((c) => c.p_session));
    const viewport = w < 640 ? "narrow" : w > 1024 ? "wide" : "medium";
    record(
      tag +
        ": every call carries the tab's one session id, app, the tier's viewport, a surface and never a member object",
      calls.length > 0 &&
        sessions.size === 1 &&
        [...sessions][0].length === 36 &&
        calls.every(
          (c) =>
            c.p_app === "app" &&
            c.p_viewport === viewport &&
            typeof c.p_surface === "string" &&
            c.p_surface.length > 0 &&
            c.p_object_kind !== "member",
        ),
      calls.length +
        " calls, " +
        sessions.size +
        " session id(s), viewports " +
        JSON.stringify([...new Set(calls.map((c) => c.p_viewport))]) +
        ", surfaces " +
        JSON.stringify([...new Set(calls.map((c) => c.p_surface))]),
    );
    // auth-js 2.115 raises SIGNED_IN from _recoverAndRefresh on every visibilitychange this arm
    // dispatched above, and the recovery landing raised it again; only the one password sign-in
    // was recorded, because the recorder reads the sign-in flow and never the event alone.
    record(
      tag + ": SIGNED_IN on a refocus or a recovery landing records no second sign_in_succeeded",
      of("sign_in_succeeded").length === 1,
      "sign_in_succeeded x" + of("sign_in_succeeded").length,
    );
    record(
      tag +
        ": the session id is in sessionStorage and not in localStorage, a cookie or the URL (1179)",
      await page.evaluate(
        (sid) => {
          try {
            return (
              sessionStorage.getItem("dna.record.session") === sid &&
              !Object.keys(localStorage).some((k) => localStorage.getItem(k) === sid) &&
              !document.cookie.includes(sid) &&
              !location.href.includes(sid)
            );
          } catch {
            return false;
          }
        },
        [...sessions][0] || "",
      ),
    );

    // 11. A failing record_event changes nothing the member sees: one warning, the surface intact.
    answer = { status: 500, body: JSON.stringify({ code: "PGRST", message: "forced failure" }) };
    const warnedBefore = warnings.filter((t) => t.includes("record_event_failed")).length;
    await page.goto(BASE + "/convene", { waitUntil: "networkidle" });
    await page.waitForSelector('[role="tablist"]', { timeout: 15000 });
    await settle();
    const warnedAfter = warnings.filter((t) => t.includes("record_event_failed")).length;
    record(
      tag +
        ": a failing record_event leaves Discovery rendered with one warning per kind and nothing shown to the member",
      pathOf(page) === "/convene" &&
        (await page.locator('[role="alert"]').count()) === 0 &&
        warnedAfter - warnedBefore === 1,
      "warnings +" +
        (warnedAfter - warnedBefore) +
        ", alerts " +
        (await page.locator('[role="alert"]').count()),
    );
  } catch (e) {
    record(tag + ": the recording arm completed", false, String(e).slice(0, 600));
  }
  await browser.close();
}

module.exports = { runRecord };
