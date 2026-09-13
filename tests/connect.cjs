// Brief 4 Connect flows for the responsive matrix (ruling 61): the four lenses, the two sheets, the
// rails and the relationship permutations at /connect, with the Supabase surface mocked by
// tests/matrix.cjs so the real client code paths run against a deterministic projection. The named
// checks that need a browser are here: filters change Members only (ruling 173); main precedes the
// rails and a card's name precedes its actions (rulings 174, 180); the Corridor axis renders now
// that corridors has its row (rulings 154, 436); no number reaches the client except the character counter and
// dates. The RLS persona matrix runs in SQL against the live project (closing report).
// Usage: BASE=https://<preview>.dna-web-application.pages.dev SPECIAL=connect WEBKIT=1 node tests/matrix.cjs
const M = require("./matrix.cjs");

const { launch, makeMockDb, seedPosts, mockSupabase, signIn, record, shot, noOverflow, BASE, SB } =
  M;
const SB_RE = SB.replace(/\./g, "\\.");
const CANCELLED_MOCK_FETCH = new RegExp(
  `(?:^|[\\s/])${SB_RE}\\S*\\s+due to access control checks\\.?$`,
);
const IGNORED_CONSOLE = new RegExp(
  [
    "fonts\\.g",
    "ERR_CONNECTION_RESET",
    "ERR_NAME_NOT_RESOLVED",
    "ERR_FAILED",
    "\\b(?:400|406)\\b",
    CANCELLED_MOCK_FETCH.source,
  ].join("|"),
);
/** Digits that are allowed on the surface: none, except inside a date. A card never carries one. */
const NUMERAL = /\d/;

async function newPage(browserType, [w, h], theme, connect = {}) {
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
  seedPosts(db, 1);
  Object.assign(db.connect, connect);
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
    if (!IGNORED_CONSOLE.test(String(e.message || e))) errors.push(String(e.message || e));
  });
  page.on("console", (m) => {
    if (m.type() === "error" && !IGNORED_CONSOLE.test(m.text())) errors.push(m.text());
  });
  return { browser, page, db, errors };
}

async function openConnect(page, search = "") {
  await page.goto(BASE + "/connect" + search, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="connect"]', { timeout: 20000 });
  await page.waitForFunction(
    () => !document.querySelector('[role="status"][aria-label^="Loading"]'),
    null,
    {
      timeout: 20000,
    },
  );
  await page.waitForTimeout(250);
}

async function tap(page, selector) {
  const loc = typeof selector === "string" ? page.locator(selector).first() : selector;
  await loc.waitFor({ state: "visible", timeout: 20000 });
  // Place the control below the sticky lens bar and above the dock, then confirm the hit test lands
  // on it before clicking: a control under the sticky bar keeps Playwright retrying until timeout.
  for (let i = 0; i < 4; i++) {
    const clear = await loc.evaluate((el) => {
      const sc = el.closest('[data-scroller="feed"]') || document.scrollingElement;
      const r = el.getBoundingClientRect();
      const target = Math.min(260, window.innerHeight - 180);
      sc.scrollTop += r.top - target;
      const b = el.getBoundingClientRect();
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return !!hit && (hit === el || el.contains(hit));
    });
    await page.waitForTimeout(120);
    if (clear) break;
  }
  await loc.click({ timeout: 15000 });
}

async function lensTab(page, label) {
  // Icon-only below expanded: match the folded accessible name, "{label}: {scope}".
  return page
    .locator(`[role="tablist"][aria-label="Connect lens"] [role="tab"][aria-label^="${label}:"]`)
    .first();
}

async function runConnect(browserType, bname, vp, theme) {
  const [w] = vp;
  const tag = `${bname} ${w}x${vp[1]} ${theme} connect`;
  M.armStart(tag);
  const compact = w < 640;
  const expanded = w > 1024;
  const wide = w >= 1440;
  const { browser, page, db, errors } = await newPage(browserType, vp, theme);
  try {
    await signIn(page);
    await openConnect(page);

    // Lens bar: four seats, no Messages, the accessible name folds the scope in (ruling 102).
    const tabs = page.locator('[role="tablist"][aria-label="Connect lens"] [role="tab"]');
    record(
      tag + ": four lenses, no Messages seat",
      (await tabs.count()) === 4 && !(await tabs.allTextContents()).join(" ").includes("Messages"),
    );
    record(
      tag + ": Members lens named with its scope",
      (await tabs.first().getAttribute("aria-label")) ===
        "Members: Every member you can reach, found by attribute.",
    );

    // Ground (ruling 181): the lens column sits on --bg-sunken, cards on --surface with no shadow.
    const ground = await page.evaluate((exp) => {
      const el = exp
        ? document.querySelector("main")
        : document.querySelector('[data-scroller="feed"]');
      return getComputedStyle(el).backgroundColor;
    }, expanded);
    const sunken = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--bg-sunken").trim(),
    );
    const sunkenRgb = await page.evaluate((c) => {
      const s = document.createElement("span");
      s.style.color = c;
      document.body.appendChild(s);
      const v = getComputedStyle(s).color;
      s.remove();
      return v;
    }, sunken);
    record(tag + ": lens column on --bg-sunken", ground === sunkenRgb, ground + " vs " + sunkenRgb);
    const cards = page.locator('[data-testid="member-card"]');
    record(
      tag + ": Members renders the cohort",
      (await cards.count()) === 6,
      String(await cards.count()),
    );
    const cardStyle = await cards.first().evaluate((el) => {
      const cs = getComputedStyle(el);
      // A data attribute, not the serialised inline style: WebKit writes grid-area as longhands.
      const portrait = el.querySelector('[data-testid="portrait"]');
      return {
        shadow: cs.boxShadow,
        radius: cs.borderRadius,
        portrait: portrait ? portrait.getBoundingClientRect().width : 0,
      };
    });
    record(
      tag + ": card carries no resting shadow, radius 16",
      cardStyle.shadow === "none" && cardStyle.radius === "16px",
      JSON.stringify(cardStyle),
    );
    record(
      tag + ": portrait is " + (compact ? 96 : 120),
      Math.round(cardStyle.portrait) === (compact ? 96 : 120),
      String(cardStyle.portrait),
    );

    // Ruling 180: the name precedes the actions in source order on every card.
    const order = await cards.first().evaluate((el) => {
      const name = el.querySelector(".strand-mc-name");
      const actions = el.querySelector('[data-testid="card-actions"]');
      return name && actions
        ? name.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING
        : 0;
    });
    record(tag + ": name precedes actions in the DOM (ruling 180)", order !== 0);

    // Ruling 174: main precedes both rails; keyboard order reaches the first card before any filter.
    if (expanded) {
      const domOrder = await page.evaluate(() => {
        const main = document.querySelector("main");
        const left = document.querySelector('[data-scroller="left"]');
        return main && left
          ? !!(main.compareDocumentPosition(left) & Node.DOCUMENT_POSITION_FOLLOWING)
          : false;
      });
      record(tag + ": main precedes the rails in the DOM (ruling 174)", domOrder);
      record(
        tag + ": left rail is the Filters landmark on Members",
        (await page.locator('aside[aria-label="Filters"]').count()) === 1,
      );
      record(
        tag + ": right rail DIA suggests only at 1440 (ruling 160)",
        (await page.locator('aside[aria-label="DIA suggests"]').count()) === (wide ? 1 : 0),
      );
      const controls = page.locator('aside[aria-label="Filters"] select');
      record(
        tag +
          ": ten axes, the Corridor axis included now that corridors has a row (rulings 154, 436)",
        (await controls.count()) === 10,
        String(await controls.count()),
      );
      record(
        tag + ": the Corridor control carries the one corridor and no count",
        (await page.locator('select[data-filter="corridor"]').count()) === 1 &&
          (await page.locator('select[data-filter="corridor"] option').allTextContents())
            .join("|")
            .includes("Los Angeles to Accra"),
      );
    } else {
      record(
        tag + ": no rail landmark below expanded",
        (await page.locator("aside").count()) === 0,
      );
    }

    // Relationship permutations (SPEC section 4 matrix).
    const relOf = async (name) =>
      page.locator(`[data-testid="member-card"][aria-label="${name}"]`).first();
    const kwame = await relOf("Kwame Mensah");
    record(
      tag + ": received shows Accept and Decline",
      (await kwame.getByRole("button", { name: "Accept" }).count()) === 1 &&
        (await kwame.getByRole("button", { name: "Decline" }).count()) === 1,
    );
    const yusuf = await relOf("Yusuf Diallo");
    const pendingActions = (await yusuf.locator('[data-testid="card-actions"]').innerText()).trim();
    record(
      tag + ": sent reads Pending, never declined",
      (await yusuf.getByText("Pending", { exact: true }).count()) === 1 &&
        !/declin/i.test(await yusuf.innerText()),
    );
    const lerato = await relOf("Lerato Khumalo");
    record(
      tag + ": connected pill and no mutuals line",
      (await lerato.getByText("Connected", { exact: true }).count()) === 1 &&
        (await lerato.locator('[data-testid="mutuals"]').count()) === 0,
    );
    // Ruling 214, amending 168: a decline inside the window and a request still waiting are the
    // same card. The sender compares the two and learns nothing, which is what ruling 157 asks for.
    // Follow and Following are the viewer's own follow state, not the relationship, so the two
    // cards are compared with that one label removed and everything else has to match.
    const relationshipOnly = (t) =>
      t
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && l !== "Follow" && l !== "Following")
        .join("|");
    const thandiwe = await relOf("Thandiwe Dube");
    const windowText = (await thandiwe.locator('[data-testid="card-actions"]').innerText()).trim();
    record(
      tag + ": window renders identically to sent (ruling 214)",
      relationshipOnly(windowText) === relationshipOnly(pendingActions) &&
        /Pending/.test(windowText) &&
        !/declin/i.test(windowText) &&
        !/Connect/.test(windowText),
      relationshipOnly(windowText) + " vs " + relationshipOnly(pendingActions),
    );
    const adaeze = await relOf("Adaeze Nwosu");
    record(
      tag + ": mutuals as names, never a count (ruling 120)",
      /Kwame Mensah and Lerato Khumalo are connections you share|Lerato Khumalo and Kwame Mensah are connections you share/.test(
        await adaeze.innerText(),
      ),
    );
    record(
      tag + ": two chips at most on Members (ruling 178)",
      (await adaeze
        .locator("span")
        .filter({ hasText: /^(Healthcare & Wellness|Project Management|West Africa)$/ })
        .count()) === 2,
    );
    record(
      tag + ": Continental heritage omitted from the meta line",
      !/Continental/.test(await lerato.innerText()),
    );
    const allText = await page.locator('[data-testid="lens-members"]').innerText();
    record(
      tag + ": no numeral on any card",
      !NUMERAL.test(allText),
      (allText.match(/\d[^\n]{0,20}/) || [""])[0],
    );
    await noOverflow(page, tag + " members");
    await shot(page, `connect-members-${bname}-${w}-${theme}`);

    // Filters change Members only (ruling 173) and live in the URL (ruling 84).
    if (expanded) {
      await page.locator('select[data-filter="stance"]').selectOption("returnee");
    } else {
      await tap(page, '[data-testid="open-filters"]');
      await page.waitForSelector('[role="dialog"][aria-label="Filters"]');
      record(
        tag + ": filters sheet carries the Corridor control (rulings 154, 436)",
        (await page.locator('[role="dialog"] select[data-filter="corridor"]').count()) === 1,
      );
      await page.locator('[role="dialog"] select[data-filter="stance"]').selectOption("returnee");
      await tap(page, '[data-testid="show-members"]');
      await page.waitForTimeout(400);
    }
    await page.waitForFunction(() => location.search.includes("stance=returnee"), null, {
      timeout: 10000,
    });
    await page.waitForTimeout(500);
    record(
      tag + ": stance filter narrows Members",
      (await cards.count()) === 2,
      String(await cards.count()),
    );
    record(
      tag + ": applied filter renders as a removable chip",
      (await page.locator('[data-testid="filter-row"]').getByText("Returnee").count()) === 1,
    );
    await tap(page, await lensTab(page, "Suggested"));
    await page.waitForFunction(
      () =>
        location.search.includes("lens=suggested") && location.search.includes("stance=returnee"),
      null,
      { timeout: 10000 },
    );
    await page.waitForFunction(
      () => !document.querySelector('[role="status"][aria-label^="Loading"]'),
      null,
      { timeout: 20000 },
    );
    await page.waitForTimeout(300);
    const sugCards = page.locator('[data-testid="lens-suggested"] [data-testid="member-card"]');
    record(
      tag + ": Suggested ignores the filter (ruling 173)",
      (await sugCards.count()) === 2,
      String(await sugCards.count()),
    );
    record(
      tag + ": every suggestion carries its reason and Dismiss",
      (await page.locator('[data-testid="reason"]').count()) === 2 &&
        (await page.getByRole("button", { name: "Dismiss" }).count()) === 2,
    );
    record(
      tag + ": no chips on Suggested (ruling 178)",
      (await sugCards
        .first()
        .locator("span")
        .filter({ hasText: /^Healthcare & Wellness$/ })
        .count()) === 0,
    );
    if (expanded) {
      record(
        tag + ": no left landmark on Suggested (rulings 167, 170)",
        (await page.locator('[data-scroller="left"]').evaluate((el) => el.tagName)) === "DIV",
      );
      record(
        tag + ": the reserved column keeps its width",
        (await page.locator('[data-scroller="left"]').boundingBox()).width === 260,
      );
    }
    await shot(page, `connect-suggested-${bname}-${w}-${theme}`);

    // Dismiss removes the card and persists (ruling 113).
    await tap(
      page,
      sugCards.filter({ hasText: "Ngozi Okafor" }).getByRole("button", { name: "Dismiss" }),
    );
    await page.waitForTimeout(500);
    record(
      tag + ": Dismiss removes the card and writes dismiss_suggestion",
      (await sugCards.count()) === 1 &&
        db.connect.writes.some((x) => x.startsWith("dismiss_suggestion")),
    );

    // Intro sheet (SPEC section 7): single shot, never empty, counter as words.
    await tap(page, sugCards.first().getByRole("button", { name: "Connect", exact: true }));
    const dialog = page.locator('[role="dialog"][aria-label="Introduce yourself to Adaeze Nwosu"]');
    await dialog.waitFor({ state: "visible", timeout: 10000 });
    const sendBtn = dialog.getByRole("button", { name: "Send introduction" });
    record(
      tag + ": Send disabled while the message is empty (ruling 119)",
      await sendBtn.isDisabled(),
    );
    record(
      tag + ": counter reads as words",
      (await dialog.getByText("300 characters left").count()) === 1,
    );
    await dialog
      .locator("textarea")
      .fill(
        "Hello Adaeze, we met at the clinics session and I would like to compare notes on Enugu.",
      );
    await page.waitForTimeout(200);
    record(
      tag + ": counter counts down",
      (await dialog.getByText(/^\d+ characters left$/).count()) === 1 &&
        !(await sendBtn.isDisabled()),
    );
    await tap(page, sendBtn);
    await page.waitForTimeout(700);
    record(
      tag + ": send writes send_introduction and toasts",
      db.connect.writes.some((x) => x.startsWith("send_introduction")) &&
        (await page.getByText("Your introduction is with Adaeze.").count()) === 1,
    );
    record(
      tag + ": the card reads Pending after sending",
      (await sugCards.first().getByText("Pending", { exact: true }).count()) === 1,
    );
    record(tag + ": sheet closed", (await dialog.count()) === 0);

    // My Network: four titled sections, request message, accept and decline.
    await tap(page, await lensTab(page, "My Network"));
    await page.waitForFunction(
      () => !document.querySelector('[role="status"][aria-label^="Loading"]'),
      null,
      { timeout: 20000 },
    );
    await page.waitForTimeout(300);
    const headers = await page.locator('[data-testid="lens-network"] h2').allTextContents();
    record(
      tag + ": four sections in order",
      headers.join("|") === "Requests|Sent|Connections|Following",
      headers.join("|"),
    );
    const req = page.locator('[data-section="requests"] [data-testid="member-card"]').first();
    record(
      tag + ": the request shows the sender's message",
      (await req.locator("blockquote").count()) === 1,
    );
    if (expanded && !wide)
      record(
        tag + ": left rail carries DIA on My Network at 1280 (ruling 167)",
        (await page.locator('aside[aria-label="DIA suggests"]').count()) === 1,
      );
    await shot(page, `connect-network-${bname}-${w}-${theme}`);
    await tap(page, req.getByRole("button", { name: "Accept" }));
    await page.waitForTimeout(600);
    record(
      tag + ": Accept toasts and writes respond_to_request",
      db.connect.writes.some(
        (x) => x.startsWith("respond_to_request") && x.includes('"p_accept":true'),
      ) && (await page.getByText("You and Kwame are connected.").count()) === 1,
    );
    const followBtn = page
      .locator('[data-section="connections"] [data-testid="member-card"]')
      .first()
      .getByRole("button", { name: /^Follow(ing)?$/ });
    const before = await followBtn.getAttribute("aria-pressed");
    await tap(page, followBtn);
    await page.waitForTimeout(500);
    record(
      tag + ": Follow toggles silently with aria-pressed",
      (await followBtn.getAttribute("aria-pressed")) !== before &&
        db.connect.writes.some((x) => x.startsWith("set_follow")),
    );

    // Where: tiles, groups, caption, no map, no count; pick sets the location filter.
    await tap(page, await lensTab(page, "Where"));
    await page.waitForFunction(
      () => !document.querySelector('[role="status"][aria-label^="Loading"]'),
      null,
      { timeout: 20000 },
    );
    await page.waitForTimeout(300);
    const tiles = page.locator('[data-testid="place-tile"]');
    record(
      tag + ": eight tiles in two groups",
      (await tiles.count()) === 8 &&
        (await page.locator('[data-testid="lens-where"] h2').allTextContents()).join("|") ===
          "On the continent|In the diaspora",
    );
    record(
      tag + ": tile named for its act",
      (await tiles.first().getAttribute("aria-label")) === "Ghana. Show members there.",
    );
    const whereText = await page.locator('[data-testid="lens-where"]').innerText();
    record(
      tag + ": Where carries no numeral and no map",
      !NUMERAL.test(whereText) && !/\bmap\b/i.test(whereText),
    );
    const cols = await page.evaluate(
      () =>
        getComputedStyle(
          document.querySelector('[data-testid="place-tile"]').parentElement,
        ).gridTemplateColumns.split(" ").length,
    );
    record(
      tag + ": tile grid " + (compact ? 2 : 4) + " across",
      cols === (compact ? 2 : 4),
      String(cols),
    );
    await shot(page, `connect-where-${bname}-${w}-${theme}`);
    await tap(page, tiles.first());
    await page.waitForFunction(
      () => location.search.includes("location=Ghana") && !location.search.includes("lens="),
      null,
      { timeout: 10000 },
    );
    record(tag + ": picking a tile opens Members filtered to that country", true);
    await noOverflow(page, tag + " where");
    record(tag + ": no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  } catch (e) {
    record(tag + ": flow completed", false, String(e && e.message ? e.message : e).slice(0, 300));
  } finally {
    await browser.close();
  }

  // Empty states (ruling 164): Where below the floor, Members with nobody, DIA silent.
  const e2 = await newPage(browserType, vp, theme, {
    whereEmpty: true,
    membersEmpty: true,
    suggestFail: true,
  });
  try {
    await signIn(e2.page);
    await openConnect(e2.page, "?lens=where");
    record(
      tag + ": Where empty state",
      (await e2.page.getByText("No country has reached the floor yet.").count()) === 1,
    );
    await openConnect(e2.page, "?lens=suggested");
    record(
      tag + ": Suggested empty when DIA has no reason (ruling 153)",
      (await e2.page.getByText("No suggestions with a real reason yet.").count()) === 1,
    );
    await openConnect(e2.page, "");
    record(
      tag + ": Members empty state",
      (await e2.page.getByText("Nobody here yet.").count()) === 1,
    );
    await openConnect(e2.page, "?stance=ally");
    record(
      tag + ": filtered empty offers Clear filters (ruling 164)",
      (await e2.page.getByText("Nobody matches these filters.").count()) === 1 &&
        (await e2.page.getByRole("button", { name: "Clear filters" }).count()) === 1,
    );
    if (expanded && wide)
      record(
        tag + ": DIA rail shows its honest empty line",
        (await e2.page
          .locator('aside[aria-label="DIA suggests"]')
          .getByText(/DIA has nothing to suggest yet/)
          .count()) === 1,
      );
    await shot(e2.page, `connect-empty-${bname}-${w}-${theme}`);
  } catch (e) {
    record(
      tag + ": empty-state flow completed",
      false,
      String(e && e.message ? e.message : e).slice(0, 300),
    );
  } finally {
    await e2.browser.close();
  }
}

module.exports = { runConnect };
