// Brief 14, handoff 41-C item 5 (SPEC 41-14 "Arms"; rulings 61, 228, 292, 317): the Messenger
// surfaces. Three arms.
//
// `runMessengerLayout` is the responsive matrix at the three labeled frames plus 360 (390, 820,
// 1280 and 360), both themes, touch below 1024 and pointer above, against the shared mock
// (tests/messenger-mock.cjs, EXTRACTION-41-14 section 6 shaped as the 41-A projections answer it):
// the header's Messages control and its placement (the 360 compact row is a Done Means line,
// because the prototype did not build 360), the list, the requests, the Pane or the route, the
// thread's parts, the doctrine (no count, nothing in browser storage) and no overflow.
//
// `runMessengerFlows` drives every write the surfaces make against the same mock, at the compact
// touch cell and the expanded pointer cell, and reads both the screen and the wrapper the surface
// called: the receipts sheet once, the pin cap's 1371 toast, mark unread, mute, archive, DIA's
// Dismiss, search with a date bound opening at the message, send, react, edit, delete, a lead's
// pin, the blocked line, the media notice once, the rate-limit line, report, accept.
//
// `runMessengerLive` is SPEC 41-14's Playwright arm against the deployment with the two seeded
// accounts for real (ruling 218): owner-test in the browser, member-test as a second context, in the
// "41-B media arm" group 41-B's arm keeps. Every check is named in LIVE_CHECKS and emitted exactly
// once, in order (317); a check the flow never reached is UNPROVEN, and a run without the account
// secrets emits every check UNPROVEN with the one reason (228). What it leaves on the project: the
// messages it sends, each deleted for everyone by the arm itself, and the thread's settings put
// back as it found them.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const M = require("./matrix.cjs");

const { launch, makeMockDb, mockSupabase, record, unproven, hydrated, BASE, OUT } = M;

const IGNORED_CONSOLE = new RegExp(
  [
    "fonts\\.g",
    "ERR_CONNECTION_RESET",
    "ERR_NAME_NOT_RESOLVED",
    "ERR_FAILED",
    "\\b(?:400|406)\\b",
    // The mock serves REST and RPC, never the Realtime socket: the join is refused or the socket
    // cannot open, which is the network's line and not the page's.
    "realtime\\/v1\\/websocket",
    "WebSocket",
  ].join("|"),
);

/** The 1371 toast, override 1 of SPEC 41-14. */
const PIN_CAP = "Unpin a conversation to pin this one.";

function armCheck(tag, list) {
  const emitted = new Set();
  const check = (label, ok, detail = "") => {
    if (!list.includes(label)) throw new Error("undeclared check: " + label);
    if (emitted.has(label)) return;
    emitted.add(label);
    record(`${tag} | ${label}`, !!ok, detail);
  };
  const rest = (why) => {
    for (const label of list) {
      if (emitted.has(label)) continue;
      emitted.add(label);
      unproven(`${tag} | ${label}`, why);
    }
  };
  return { check, rest };
}

async function newPage(browserType, [w, h], theme, prepare) {
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
  const db = makeMockDb();
  if (prepare) prepare(db);
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
    if (m.type() === "error" && !IGNORED_CONSOLE.test(m.text()))
      errors.push(`${m.location().url || "(no url)"} ${m.text()}`.slice(0, 300));
  });
  return { browser, page, db, errors, touch };
}

async function signInMock(page) {
  await page.goto(BASE + "/sign-in", { waitUntil: "networkidle" });
  await hydrated(page);
  await page.fill('input[type="email"]', "member@test.invalid");
  await page.fill('input[type="password"]', "x");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/feed", { timeout: 15000 });
}

async function openMessages(page) {
  await page.goto(BASE + "/messages", { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="thread-list"] [data-thread-row]', { timeout: 15000 });
  await page.waitForTimeout(300);
}

/** Every localStorage and sessionStorage key the page holds that names the Messenger (1351). */
async function messengerStorage(page) {
  return page.evaluate(() => {
    const keys = [];
    for (const s of [localStorage, sessionStorage])
      for (let i = 0; i < s.length; i++) keys.push(s.key(i) || "");
    return keys.filter((k) => /messag|thread|b14|dia\.|draft:m/i.test(k));
  });
}

// ---------------------------------------------------------------------------------------------------
// 1. The responsive matrix.
// ---------------------------------------------------------------------------------------------------

const LAYOUT_CHECKS = [
  "the Messages control sits after the bell and before the avatar on the header's one row (1334; 360 compact placement)",
  "the control is named New messages with the 8px dot while an unmuted, unarchived thread is unread, and carries aria-current on /messages (82, 1344)",
  "at expanded the header's side tracks are 200 with the control passed, and below expanded the row has no grid (5.1)",
  "the list reads Messages, Mark all read, the search field and the filters toggle (1.3)",
  "Requests renders the caps line, DIA's line with Dismiss and two cards, each with Accept, Decline and Block, and Declined behind one control (1.4, 1341, 1350)",
  "seven live rows render, the muted row reads Muted, the pinned rows read Pinned, and Archived sits behind one control (1.3, 1339, 1348)",
  "no row, card or line on the list carries a numeral outside a time (69, 82, guardrail 3)",
  "at expanded the Pane beside the list shows its empty state; below it the list keeps the dock (1047, 1368)",
  "opening a row reaches /messages/{thread}: ringed in the Pane at expanded, its own route on Pane's bar with Back to Messages, the subtitle and no dock below (1023, 1368, 1369)",
  "the thread reads day separators, a quote, a reaction as word and name, edited, a deleted line, and ticks named Sent or Delivered with receipts off (1336, 1343, 1345, 1370)",
  "the composer sits inside the viewport with Attach, the field and the mic (1.6, 1368)",
  "a group thread reads the pinned strip and the collapsed blocked line (1349, 1371)",
  "nothing the Messenger holds is in localStorage or sessionStorage (1351)",
  "no horizontal overflow on the list or the thread (61)",
  "no page error (316)",
];

async function runMessengerLayout(browserType, bname, vp, theme) {
  const [w, h] = vp;
  const tag = `${bname}-${w}x${h}-${theme}-messenger`;
  M.armStart(tag);
  const { check, rest } = armCheck(tag, LAYOUT_CHECKS);
  const expanded = w > 1024;
  let browser;
  try {
    const opened = await newPage(browserType, vp, theme);
    browser = opened.browser;
    const { page, db, errors } = opened;
    await signInMock(page);
    await openMessages(page);

    const head = await page.evaluate(() => {
      const r = (s) => document.querySelector(s)?.getBoundingClientRect() || null;
      const b = r('[data-testid="bell"]');
      const m = r('[data-testid="messages"]');
      const a = r('[data-testid="avatar"]');
      const row = document.querySelector("[data-app-header] > div");
      return {
        b,
        m,
        a,
        grid: row ? getComputedStyle(row).gridTemplateColumns : "",
        display: row ? getComputedStyle(row).display : "",
        label: document.querySelector('[data-testid="messages"]')?.getAttribute("aria-label"),
        current: document.querySelector('[data-testid="messages"]')?.getAttribute("aria-current"),
        dot: !!document.querySelector('[data-testid="messages-dot"]'),
        dotSize: (() => {
          const d = document.querySelector('[data-testid="messages-dot"]');
          return d ? getComputedStyle(d).width : "";
        })(),
      };
    });
    const sameRow =
      head.b &&
      head.m &&
      head.a &&
      Math.abs(head.b.top - head.m.top) < 4 &&
      Math.abs(head.m.top - head.a.top) < 8;
    check(
      LAYOUT_CHECKS[0],
      sameRow && head.b.right <= head.m.left + 1 && head.m.right <= head.a.left + 1,
      JSON.stringify({ b: head.b, m: head.m, a: head.a }),
    );
    check(
      LAYOUT_CHECKS[1],
      head.label === "New messages" &&
        head.dot &&
        head.dotSize === "8px" &&
        head.current === "page",
      JSON.stringify(head),
    );
    check(
      LAYOUT_CHECKS[2],
      expanded
        ? head.display === "grid" && /^200px .+ 200px$/.test(head.grid)
        : head.display !== "grid",
      head.display + " " + head.grid,
    );

    const list = await page.evaluate(() => {
      const t = (s) => document.querySelector(s)?.textContent?.trim() || "";
      const req = document.querySelector('[data-testid="requests"]');
      const cards = [
        ...document.querySelectorAll(
          '[data-testid="requests"] [data-request-card]:not([data-declined])',
        ),
      ];
      const rows = [...document.querySelectorAll('[data-testid="thread-list"] [data-thread-row]')];
      return {
        h1: t("h1"),
        markAll: !!document.querySelector('[data-testid="mark-all-read"]'),
        search: document
          .querySelector('[data-testid="message-search"]')
          ?.getAttribute("placeholder"),
        filters: document
          .querySelector('[data-testid="search-filters"]')
          ?.getAttribute("aria-label"),
        caps: req ? req.textContent.includes("Requests") : false,
        dia: req
          ? [...req.querySelectorAll('[data-dia="done"] button')].map((b) => b.textContent.trim())
          : [],
        cards: cards.map((c) => [...c.querySelectorAll("button")].map((b) => b.textContent.trim())),
        declined: t('[data-testid="declined-toggle"]'),
        rows: rows.map((r) => r.textContent),
        archived: t('[data-testid="archived-toggle"]'),
        listText: [
          document.querySelector('[data-testid="requests"]'),
          document.querySelector('[data-testid="thread-list"]'),
        ]
          .map((n) => n?.innerText || "")
          .join("\n"),
        pane: document.querySelector("[data-pane-open]")?.textContent || "",
        dock: !!document.querySelector('[data-pulse="dock"]'),
      };
    });
    check(
      LAYOUT_CHECKS[3],
      list.h1 === "Messages" &&
        list.markAll &&
        list.search === "Search messages" &&
        list.filters === "Filters",
      JSON.stringify({
        h1: list.h1,
        markAll: list.markAll,
        search: list.search,
        filters: list.filters,
      }),
    );
    check(
      LAYOUT_CHECKS[4],
      list.caps &&
        list.dia.includes("Dismiss") &&
        list.cards.length === 2 &&
        list.cards.every((b) => b.join(",") === "Accept,Decline,Block") &&
        list.declined === "Declined",
      JSON.stringify({ dia: list.dia, cards: list.cards, declined: list.declined }),
    );
    check(
      LAYOUT_CHECKS[5],
      list.rows.length === 7 &&
        list.rows.filter((r) => r.includes("Muted")).length === 1 &&
        list.rows.filter((r) => r.includes("Pinned")).length === 2 &&
        list.archived === "Archived",
      list.rows.length + " rows; archived " + list.archived,
    );
    // Times are the one numeral a list may carry; the fixture's list renders words for every time.
    check(
      LAYOUT_CHECKS[6],
      !/\d/.test(list.listText),
      list.listText.match(/.{0,30}\d.{0,30}/)?.[0] || "",
    );
    check(
      LAYOUT_CHECKS[7],
      expanded
        ? list.pane.includes("Open a conversation to read it here.") &&
            list.pane.includes("The list stays where it is.")
        : list.dock && !list.pane,
      expanded ? list.pane.slice(0, 120) : "dock " + list.dock,
    );
    const listOverflow = await M.measureWidth(page);

    // Open Kofi's thread.
    await page.locator("[data-thread-row] [data-thread-open]").first().click();
    await page.waitForURL("**/messages/" + db.messenger.ids.kofi, { timeout: 10000 });
    await page.waitForSelector("[data-messenger-thread] [data-msg]", { timeout: 10000 });
    await page.waitForTimeout(400);
    const th = await page.evaluate((exp) => {
      const sel = document.querySelector('[data-thread-row][data-selected="true"]');
      const back = document.querySelector('button[aria-label="Back to Messages"]');
      const sub =
        document.querySelector("[data-pane-subtitle]")?.textContent ||
        document.querySelector("[data-thread-header]")?.textContent ||
        "";
      const comp = document.querySelector("[data-message-composer]")?.getBoundingClientRect();
      return {
        selected: !!sel && getComputedStyle(sel).outlineStyle !== "none",
        back: !!back,
        sub,
        dock: !!document.querySelector('[data-pulse="dock"]'),
        days: [...document.querySelectorAll("[data-day-separator]")].map((d) =>
          d.getAttribute("aria-label"),
        ),
        quote: !!document.querySelector("[data-quote]"),
        reaction: [...document.querySelectorAll("[data-reaction]")].map((r) =>
          r.getAttribute("aria-label"),
        ),
        edited: !!document.querySelector("[data-edited]"),
        deleted: [...document.querySelectorAll('[data-deleted="1"]')].map((d) => d.textContent),
        ticks: [...document.querySelectorAll("[data-ticks]")].map((t) =>
          t.getAttribute("aria-label"),
        ),
        compBottom: comp ? comp.bottom : -1,
        compH: window.innerHeight,
        attach: !!document.querySelector('[data-testid="attach"]'),
        field: !!document.querySelector('[data-testid="message-field"]'),
        mic: !!document.querySelector('[data-testid="record"]'),
        exp,
      };
    }, expanded);
    check(
      LAYOUT_CHECKS[8],
      expanded
        ? th.selected && th.sub.includes("Cold chain logistics, Tema")
        : th.back && th.sub.includes("Cold chain logistics, Tema") && !th.dock,
      JSON.stringify({
        selected: th.selected,
        back: th.back,
        sub: th.sub.slice(0, 60),
        dock: th.dock,
      }),
    );
    check(
      LAYOUT_CHECKS[9],
      th.days.includes("Yesterday") &&
        th.days.includes("Today") &&
        th.quote &&
        th.reaction.includes("Agree, Kofi") &&
        th.edited &&
        th.deleted.some((t) => t.includes("This message was deleted")) &&
        th.ticks.length > 0 &&
        th.ticks.every((t) => t === "Sent" || t === "Delivered"),
      JSON.stringify({ days: th.days, reaction: th.reaction, ticks: th.ticks }),
    );
    check(
      LAYOUT_CHECKS[10],
      th.attach && th.field && th.mic && th.compBottom > 0 && th.compBottom <= th.compH + 1,
      JSON.stringify({ bottom: th.compBottom, h: th.compH }),
    );
    const threadOverflow = await M.measureWidth(page);
    await M.shot(page, `${tag}-thread`);

    // The group.
    await page.goto(BASE + "/messages/" + db.messenger.ids.group, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-messenger-thread] [data-msg]", { timeout: 10000 });
    const grp = await page.evaluate(() => ({
      strip: document.querySelector("[data-pinned-strip]")?.textContent || "",
      blocked: document.querySelector("[data-blocked-line] button")?.textContent || "",
    }));
    check(
      LAYOUT_CHECKS[11],
      grp.strip.includes("Pinned") &&
        grp.strip.includes("Nana: Who is coming") &&
        grp.blocked === "Blocked message",
      JSON.stringify(grp),
    );
    const keys = await messengerStorage(page);
    check(LAYOUT_CHECKS[12], keys.length === 0, keys.join(","));
    check(
      LAYOUT_CHECKS[13],
      listOverflow.ok && threadOverflow.ok,
      [listOverflow.detail, threadOverflow.detail].filter(Boolean).join("; "),
    );
    check(LAYOUT_CHECKS[14], errors.length === 0, errors.slice(0, 3).join(" | "));
  } catch (e) {
    record(`${tag} flow`, false, String(e).slice(0, 600));
  } finally {
    rest("the flow ended before this check ran");
    if (browser) await browser.close().catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------------------------------
// 2. The flows, against the mock.
// ---------------------------------------------------------------------------------------------------

const FLOW_CHECKS = [
  "the receipts sheet opens once while receipts_chosen_at is null, Off selected, and Continue writes messenger_settings_set(false) (1345)",
  "after the choice the sheet does not open again (1345)",
  "a third pin is taken, and a fourth is refused with the 1371 toast (1335, 1371)",
  "Mark as unread writes messenger_mark_unread and the row reads unread (1344)",
  "Mute for 8 hours writes messenger_mute with eight_hours and the row reads Muted (1348)",
  "Archive writes messenger_archive, the row leaves the list and returns under Archived with its note (1339)",
  "DIA's Dismiss writes messenger_dia_dismiss with the signal's key and the line goes (1350, 1373)",
  "a search with a During date bound calls messenger_search with the day's bounds and its result opens the thread at the message, ringed (1338, 1347, 1373)",
  "a send writes messenger_send with a client_id, the bubble lands with one tick named Sent, and the field clears (1336, 1351)",
  "React offers the five words, and a pick writes messenger_react and reads as the word and you (1370)",
  "Edit writes messenger_edit and the bubble reads edited (1343)",
  "Delete for everyone writes messenger_delete and the bubble reads This message was deleted (1343)",
  "a lead's Pin writes messenger_pin_message and the pinned strip names it (1371)",
  "the blocked line expands to the member's name, blocked (1349)",
  "the media notice shows once before the first upload and OK writes messenger_settings_set(media_notice_seen) (1346)",
  "a rate-limited send reads the extraction's line, with no number, and disables the field (1353)",
  "Report writes messenger_report with the reason and reads the plain confirmation (1349, 1350)",
  "Accept writes messenger_request_accept, toasts, and opens the new thread (1341)",
  "nothing the Messenger holds is in localStorage or sessionStorage (1351)",
  "no page error (316)",
];

function writesOf(db, fn) {
  return db.messenger.writes.filter((w) => w.fn === fn);
}

/** Opens a row's or a bubble's menu: the ellipsis on pointer, a 450 ms press on touch. */
async function openMenu(page, container, touch, label) {
  if (touch) {
    const target = (await container.locator("[data-bubble]").count())
      ? container.locator("[data-bubble]").first()
      : container;
    await target.dispatchEvent("pointerdown", { button: 0, pointerType: "touch", isPrimary: true });
    await page.waitForTimeout(560);
    await target.dispatchEvent("pointerup", { button: 0, pointerType: "touch", isPrimary: true });
  } else {
    await container.hover();
    await container.locator(`button[aria-label="${label}"]`).first().click();
  }
  await page.waitForSelector('[role="menu"]', { timeout: 5000 });
}

async function pick(page, label) {
  await page.locator(`[role="menu"] [role="menuitem"]:has-text("${label}")`).first().click();
  await page.waitForTimeout(350);
}

async function toastText(page) {
  return page
    .locator('[role="status"]')
    .allTextContents()
    .then((t) => t.join(" | "))
    .catch(() => "");
}

async function runMessengerFlows(browserType, bname, vp, theme) {
  const [w, h] = vp;
  const tag = `${bname}-${w}x${h}-${theme}-messenger flows`;
  M.armStart(tag);
  const { check, rest } = armCheck(tag, FLOW_CHECKS);
  let browser;
  try {
    const opened = await newPage(browserType, vp, theme, (db) => {
      db.messenger.firstOpen = true;
    });
    browser = opened.browser;
    const { page, db, errors, touch } = opened;
    const Mx = db.messenger;
    const rowOf = (name) =>
      page.locator(`[data-thread-row]:has([data-thread-name]:text-is("${name}"))`).first();
    await signInMock(page);
    await page.goto(BASE + "/messages", { waitUntil: "networkidle" });

    // 1, 2. Receipts, once.
    const sheet = await page
      .waitForSelector('[data-testid="receipts-sheet"]', { timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    const off = await page
      .locator('[data-testid="receipts-sheet"] [role="radio"][aria-checked="true"]')
      .textContent()
      .catch(() => "");
    if (sheet) await page.click('[data-testid="receipts-continue"]');
    await page.waitForTimeout(400);
    const set = writesOf(db, "messenger_settings_set").at(-1);
    check(
      FLOW_CHECKS[0],
      sheet && off === "Off" && !!set && set.body.p_receipts === false,
      JSON.stringify({ sheet, off, set: set?.body }),
    );
    await openMessages(page);
    const again = await page.locator('[data-testid="receipts-sheet"]').count();
    check(FLOW_CHECKS[1], again === 0, "sheets " + again);

    // 3. Pins: two pinned in the fixture; Nana is the third, Corridor Suppers the refused fourth.
    await openMenu(page, rowOf("Nana Adjei"), touch, "Actions for Nana Adjei");
    await pick(page, "Pin");
    const third =
      writesOf(db, "messenger_pin_thread").length === 1 &&
      Mx.threads.filter((t) => t.pinned).length === 3;
    await openMenu(
      page,
      rowOf("Corridor Suppers: Accra"),
      touch,
      "Actions for Corridor Suppers: Accra",
    );
    await pick(page, "Pin");
    const toast1 = await toastText(page);
    check(FLOW_CHECKS[2], third && toast1.includes(PIN_CAP), toast1.slice(0, 200));

    // 4. Mark as unread on Kofi.
    await openMenu(page, rowOf("Kofi Boateng"), touch, "Actions for Kofi Boateng");
    await pick(page, "Mark as unread");
    await page.waitForTimeout(300);
    const unread = await rowOf("Kofi Boateng").getAttribute("data-unread");
    check(
      FLOW_CHECKS[3],
      writesOf(db, "messenger_mark_unread").length === 1 && unread === "1",
      "data-unread " + unread,
    );

    // 5. Mute Kofi for 8 hours.
    await openMenu(page, rowOf("Kofi Boateng"), touch, "Actions for Kofi Boateng");
    await pick(page, "Mute for 8 hours");
    await page.waitForTimeout(300);
    const mute = writesOf(db, "messenger_mute").at(-1);
    const mutedText = await rowOf("Kofi Boateng").textContent();
    check(
      FLOW_CHECKS[4],
      !!mute && mute.body.p_duration === "eight_hours" && mutedText.includes("Muted"),
      JSON.stringify(mute?.body),
    );

    // 6. Archive Kwame.
    await openMenu(page, rowOf("Kwame Mensah"), touch, "Actions for Kwame Mensah");
    await pick(page, "Archive");
    await page.waitForTimeout(300);
    const live = await page
      .locator('[data-testid="thread-list"] [data-thread-name]:text-is("Kwame Mensah")')
      .count();
    await page.click('[data-testid="archived-toggle"]');
    await page.waitForTimeout(200);
    const archivedRows = await page
      .locator('[aria-label="Archived"] [data-thread-name]')
      .allTextContents();
    const note = await page
      .getByText("An archived conversation comes back to the list when a new message arrives.")
      .count();
    check(
      FLOW_CHECKS[5],
      writesOf(db, "messenger_archive").length === 1 &&
        live === 0 &&
        archivedRows.includes("Kwame Mensah") &&
        note === 1,
      JSON.stringify({ live, archivedRows, note }),
    );

    // 7. DIA's Dismiss on the request line.
    await page
      .locator('[data-testid="requests"] [data-dia="done"] button:has-text("Dismiss")')
      .click();
    await page.waitForTimeout(400);
    const dis = writesOf(db, "messenger_dia_dismiss").at(-1);
    const lineGone =
      (await page.locator('[data-testid="requests"] [data-dia="done"]').count()) === 0;
    check(
      FLOW_CHECKS[6],
      !!dis && dis.body.p_key.startsWith("request:") && lineGone,
      JSON.stringify(dis?.body),
    );

    // 8. Search with a During bound, then open the result.
    await page.fill(
      '[data-testid="message-search"] input, input[placeholder="Search messages"]',
      "port signed",
    );
    await page.click('[data-testid="search-filters"]');
    const today = await page.evaluate(() => {
      const d = new Date();
      return (
        d.getFullYear() +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(d.getDate()).padStart(2, "0")
      );
    });
    await page.fill('input[data-search-date="during"]', today);
    await page.waitForSelector("[data-search-result]", { timeout: 8000 }).catch(() => undefined);
    const call = writesOf(db, "messenger_search").at(-1);
    const resCount = await page.locator("[data-search-result]").count();
    if (resCount) await page.locator("[data-search-result]").first().click();
    await page.waitForURL("**/messages/" + Mx.ids.kofi, { timeout: 8000 }).catch(() => undefined);
    await page.waitForTimeout(500);
    const ringed = await page.evaluate(() =>
      [...document.querySelectorAll("[data-msg] [data-bubble]")].some(
        (b) => getComputedStyle(b).outlineStyle === "solid",
      ),
    );
    check(
      FLOW_CHECKS[7],
      !!call && !!call.body.p_after && !!call.body.p_before && resCount === 1 && ringed,
      JSON.stringify({ args: call?.body, resCount, ringed }),
    );

    // 9. Send.
    await page.goto(BASE + "/messages/" + Mx.ids.kofi, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="message-field"]', { timeout: 8000 });
    await page.fill('[data-testid="message-field"]', "Sent from the arm.");
    await page.click('[data-testid="send"]');
    await page.waitForTimeout(600);
    const sent = writesOf(db, "messenger_send").at(-1);
    const landed = page.locator('[data-msg]:has-text("Sent from the arm.")').last();
    const tick = await landed
      .locator("[data-ticks]")
      .getAttribute("aria-label")
      .catch(() => "");
    const cleared = await page.inputValue('[data-testid="message-field"]').catch(() => "x");
    check(
      FLOW_CHECKS[8],
      !!sent && /^[0-9a-f-]{36}$/.test(sent.body.p_client_id) && tick === "Sent" && cleared === "",
      JSON.stringify({ client: sent?.body.p_client_id, tick, cleared }),
    );

    // 10. React to Kofi's first message with Thanks.
    const kofiFirst = page
      .locator('[data-msg]:has-text("The buyer from Tema came through.")')
      .first();
    if (touch) {
      await openMenu(page, kofiFirst, true, "");
      await pick(page, "React");
    } else {
      await kofiFirst.hover();
      await kofiFirst.locator('[data-cluster] button:has-text("React")').click();
    }
    const words = await page.locator("[data-picker] button").allTextContents();
    await page.locator('[data-picker] button:has-text("Thanks")').click();
    await page.waitForTimeout(500);
    const r = writesOf(db, "messenger_react").at(-1);
    const shown = await kofiFirst.locator("[data-reaction]").allTextContents();
    check(
      FLOW_CHECKS[9],
      ["Agree", "Thanks", "Noted", "Well done", "Sorry to hear"].every((x) => words.includes(x)) &&
        !!r &&
        r.body.p_reaction === "thanks" &&
        shown.includes("Thanks, you"),
      JSON.stringify({ words, r: r?.body, shown }),
    );

    // 11. Edit the message just sent.
    await openMenu(page, landed, touch, "Message actions");
    await pick(page, "Edit");
    const editing = await page.getByText("Editing", { exact: true }).count();
    await page.fill('[data-testid="message-field"]', "Sent from the arm, edited.");
    await page.click('[data-testid="send"]');
    await page.waitForTimeout(500);
    const ed = writesOf(db, "messenger_edit").at(-1);
    const editedRow = page.locator('[data-msg]:has-text("Sent from the arm, edited.")').last();
    check(
      FLOW_CHECKS[10],
      editing === 1 && !!ed && (await editedRow.locator("[data-edited]").count()) === 1,
      JSON.stringify({ editing, ed: ed?.body }),
    );

    // 12. Delete it for everyone.
    await openMenu(page, editedRow, touch, "Message actions");
    await pick(page, "Delete for everyone");
    await page.waitForTimeout(500);
    const del = writesOf(db, "messenger_delete").at(-1);
    const deletedLines = await page.locator('[data-deleted="1"]').allTextContents();
    check(
      FLOW_CHECKS[11],
      !!del && deletedLines.filter((t) => t.includes("This message was deleted")).length === 2,
      JSON.stringify({ del: del?.body, deletedLines: deletedLines.length }),
    );

    // 13, 14. The group: pin Ama's message as its lead, and expand the blocked line.
    await page.goto(BASE + "/messages/" + Mx.ids.group, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-messenger-thread] [data-msg]", { timeout: 8000 });
    const ama = page.locator('[data-msg]:has-text("can you confirm the room?")').first();
    await openMenu(page, ama, touch, "Message actions");
    await pick(page, "Pin");
    await page.waitForTimeout(600);
    const pin = writesOf(db, "messenger_pin_message").at(-1);
    const strip = await page
      .locator("[data-pinned-strip]")
      .textContent()
      .catch(() => "");
    check(
      FLOW_CHECKS[12],
      !!pin && strip.includes("Ama: @Amara Osei can you confirm the room?"),
      strip,
    );
    await page.locator("[data-blocked-line] button").click();
    const blk = await page.locator("[data-blocked-line]").textContent();
    check(
      FLOW_CHECKS[13],
      blk.includes("Hide blocked message") && blk.includes("Yaa Mensah, blocked"),
      blk,
    );

    // 15. The media notice, once, on the first attach.
    Mx.settings.media_notice_seen_at = null;
    await page.goto(BASE + "/messages/" + Mx.ids.kofi, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="message-field"]', { timeout: 8000 });
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    await page
      .locator('input[type="file"][accept="image/*"]')
      .setInputFiles({ name: "arm.png", mimeType: "image/png", buffer: png });
    await page.waitForTimeout(300);
    const notice = await page
      .locator("[data-media-notice]")
      .textContent()
      .catch(() => "");
    if (notice) await page.locator('[data-media-notice] button:has-text("OK")').click();
    await page.waitForTimeout(300);
    const seen = writesOf(db, "messenger_settings_set").filter(
      (x) => x.body.p_media_notice_seen === true,
    ).length;
    check(
      FLOW_CHECKS[14],
      notice.includes("Location and camera data are removed from what you send.") && seen === 1,
      JSON.stringify({ notice, seen }),
    );
    await page
      .locator('[data-strip] button[aria-label="Remove"]')
      .first()
      .click()
      .catch(() => undefined);

    // 16. Rate limited.
    Mx.fail = "send";
    await page.fill('[data-testid="message-field"]', "Too quick.");
    await page.click('[data-testid="send"]');
    await page.waitForTimeout(500);
    const limitLine = await page
      .locator("[data-rate-limited]")
      .textContent()
      .catch(() => "");
    const disabled = await page
      .locator('[data-testid="message-field"]')
      .isDisabled()
      .catch(() => false);
    check(
      FLOW_CHECKS[15],
      limitLine === "You are sending quickly. Wait a moment before the next message." &&
        !/\d/.test(limitLine) &&
        disabled,
      JSON.stringify({ limitLine, disabled }),
    );
    Mx.fail = null;

    // 17. Report Kofi's message.
    const kofiMsg = page.locator('[data-msg]:has-text("Yes, the port signed off.")').first();
    await openMenu(page, kofiMsg, touch, "Message actions");
    await pick(page, "Report");
    await page.waitForSelector('[data-testid="report-sheet"]', { timeout: 5000 });
    await page.locator('[data-testid="report-sheet"] select').selectOption("spam_or_scam");
    await page.click('[data-testid="report-submit"]');
    await page
      .waitForSelector('[data-testid="report-done"]', { timeout: 5000 })
      .catch(() => undefined);
    const rep = writesOf(db, "messenger_report").at(-1);
    const done = await page
      .locator('[data-testid="report-done"]')
      .textContent()
      .catch(() => "");
    check(
      FLOW_CHECKS[16],
      !!rep &&
        rep.body.p_reason === "spam_or_scam" &&
        done.includes(
          "Thank you. Someone will look at this one message and nothing else from the conversation. Kofi is not told.",
        ),
      JSON.stringify({ rep: rep?.body, done: done.slice(0, 140) }),
    );
    await page.keyboard.press("Escape");

    // 18. Accept Femi's request.
    await openMessages(page);
    await page
      .locator('[data-request-card]:has-text("Femi Adeyemi") button:has-text("Accept")')
      .click();
    await page.waitForURL(/\/messages\/[0-9a-f-]{36}$/, { timeout: 8000 }).catch(() => undefined);
    const acc = writesOf(db, "messenger_request_accept").at(-1);
    const t2 = await toastText(page);
    check(
      FLOW_CHECKS[17],
      !!acc && t2.includes("Accepted. You can reply now.") && !page.url().endsWith("/messages"),
      JSON.stringify({ acc: acc?.body, url: page.url() }),
    );

    const keys = await messengerStorage(page);
    check(FLOW_CHECKS[18], keys.length === 0, keys.join(","));
    check(FLOW_CHECKS[19], errors.length === 0, errors.slice(0, 3).join(" | "));
  } catch (e) {
    record(`${tag} flow`, false, String(e).slice(0, 600));
  } finally {
    rest("the flow ended before this check ran");
    if (browser) await browser.close().catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------------------------------
// 3. The deployment, with the two seeded accounts.
// ---------------------------------------------------------------------------------------------------

const src = fs.readFileSync(path.join(__dirname, "../src/lib/supabase.ts"), "utf8");
const SUPABASE_URL =
  process.env.SUPABASE_URL || (src.match(/"(https:\/\/[a-z]+\.supabase\.co)"/) || [])[1];
const KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || (src.match(/"(sb_publishable_[A-Za-z0-9_-]+)"/) || [])[1];
const GROUP = "41-B media arm";

const LIVE_CHECKS = [
  "owner-test and member-test sign in on the deployment (218)",
  "the group renders as a row on /messages and its thread opens at /messages/{thread} (1047, 1023)",
  "a text send lands with one tick named Sent (1336)",
  "it turns to two ticks once member-test's client, open on the thread, acknowledges it (1336, 1351)",
  "member-test's Messages control carries the dot while the message is unread (82, 1344)",
  "a reaction reads as the word and the name (1370)",
  "an edit reads edited (1343)",
  "a pin reads in the pinned strip (1371)",
  "Mark as unread lights the row (1344)",
  "Mute for 8 hours reads Muted on the row, and Unmute takes it off (1348)",
  "an archived thread returns to the list when a new message arrives (1339)",
  "search with a During date bound opens the thread at the message (1338, 1347)",
  "the receipts sheet opens exactly while receipts_chosen_at is null (1345)",
  "the media notice opens exactly while media_notice_seen_at is null (1346)",
  "an image sent through 41-B's route renders in the bubble (1346)",
  "a voice note recorded in the composer renders with the player (1346)",
  "a delete for everyone reads This message was deleted (1343)",
  "nothing the Messenger holds is in browser storage (1351)",
];

async function liveSignIn(page, email, password) {
  await page.goto(BASE + "/sign-in", { waitUntil: "networkidle" });
  await hydrated(page);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(feed|welcome|messages)/, { timeout: 25000 });
}

/** A synthetic microphone so MediaRecorder records real bytes in either engine (WebM Opus, MP4 AAC). */
async function syntheticMic(ctx) {
  await ctx.addInitScript(() => {
    const md = navigator.mediaDevices;
    if (!md) return;
    md.getUserMedia = async () => {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ac.createOscillator();
      osc.frequency.value = 330;
      const dest = ac.createMediaStreamDestination();
      osc.connect(dest);
      osc.start();
      return dest.stream;
    };
  });
}

async function runMessengerLive(browserType, bname) {
  const tag = `${bname}-messenger-live`;
  M.armStart(tag);
  const { check, rest } = armCheck(tag, LIVE_CHECKS);
  const { MEMBER_EMAIL, MEMBER_PASSWORD, OWNER_EMAIL, OWNER_PASSWORD } = process.env;
  if (!MEMBER_EMAIL || !MEMBER_PASSWORD || !OWNER_EMAIL || !OWNER_PASSWORD) {
    rest("MEMBER_* and OWNER_* are not set, so no account can sign in");
    return;
  }
  if (!SUPABASE_URL || !KEY) {
    rest("the Supabase URL or publishable key could not be read from src/lib/supabase.ts");
    return;
  }
  let browser;
  const sent = [];
  let ownerToken = null;
  let threadId = null;
  const rpc = async (token, fn, args) => {
    const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + fn, {
      method: "POST",
      headers: {
        apikey: KEY,
        Authorization: "Bearer " + token,
        "content-type": "application/json",
      },
      body: JSON.stringify(args),
    });
    const text = await r.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {}
    return { status: r.status, body, text };
  };
  const token = async (email, password) => {
    const r = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: KEY, "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const b = await r.json().catch(() => null);
    return b && b.access_token ? b.access_token : null;
  };
  try {
    ownerToken = await token(OWNER_EMAIL, OWNER_PASSWORD);
    const memberToken = await token(MEMBER_EMAIL, MEMBER_PASSWORD);
    browser = await launch(browserType);
    const ownerCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await syntheticMic(ownerCtx);
    const memberCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ownerCtx.newPage();
    const peer = await memberCtx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message || e)));
    await liveSignIn(page, OWNER_EMAIL, OWNER_PASSWORD);
    await liveSignIn(peer, MEMBER_EMAIL, MEMBER_PASSWORD);
    check(LIVE_CHECKS[0], !!ownerToken && !!memberToken, ownerToken ? "" : "owner token missing");

    // The thread, as 41-B's arm keeps it.
    const settingsBefore = await rpc(ownerToken, "messenger_settings", {});
    const r = await fetch(
      SUPABASE_URL +
        "/rest/v1/messenger_threads_view?select=thread_id,archived,muted,pinned&kind=eq.community_group&role=eq.lead&name=eq." +
        encodeURIComponent(GROUP) +
        "&order=created_at.asc&limit=1",
      { headers: { apikey: KEY, Authorization: "Bearer " + ownerToken } },
    );
    const rows = await r.json().catch(() => []);
    threadId = Array.isArray(rows) && rows[0] ? rows[0].thread_id : null;
    if (!threadId) {
      rest(
        "41-B's group thread was not found; tests/messenger-media.cjs creates it on its first run",
      );
      return;
    }
    if (rows[0].archived) await rpc(ownerToken, "messenger_unarchive", { p_thread: threadId });
    if (rows[0].muted) await rpc(ownerToken, "messenger_mute", { p_thread: threadId });

    // 13. The receipts sheet: open exactly while the setting is unchosen.
    await page.goto(BASE + "/messages", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const chosen = settingsBefore.body && settingsBefore.body.receipts_chosen_at;
    const sheetShown = (await page.locator('[data-testid="receipts-sheet"]').count()) > 0;
    check(
      LIVE_CHECKS[12],
      sheetShown === !chosen,
      `chosen ${chosen ? "yes" : "no"}; sheet ${sheetShown}`,
    );
    if (sheetShown) {
      await page.click('[data-testid="receipts-continue"]');
      await page.waitForTimeout(800);
    }

    // 2. The row and the thread.
    const row = page
      .locator(`[data-thread-row]:has([data-thread-name]:text-is("${GROUP}"))`)
      .first();
    await row.waitFor({ timeout: 15000 });
    await row.locator("[data-thread-open]").click();
    await page.waitForURL("**/messages/" + threadId, { timeout: 15000 });
    await page.waitForSelector('[data-testid="message-field"]', { timeout: 15000 });
    check(LIVE_CHECKS[1], page.url().endsWith("/messages/" + threadId));

    // 3, 4, 5. A send, its first tick, the peer's dot, then the second tick.
    const words = "41-C arm " + crypto.randomUUID().slice(0, 8);
    await page.fill('[data-testid="message-field"]', words);
    await page.click('[data-testid="send"]');
    const mine = page.locator(`[data-msg]:has-text("${words}")`).last();
    await mine.waitFor({ timeout: 15000 });
    const id = await mine.getAttribute("data-msg");
    if (id) sent.push(id);
    const first = await mine.locator("[data-ticks]").getAttribute("aria-label");
    check(LIVE_CHECKS[2], first === "Sent", "tick " + first);
    await peer.goto(BASE + "/messages", { waitUntil: "networkidle" });
    await peer.waitForTimeout(1500);
    const dot = await peer.locator('[data-testid="messages-dot"]').count();
    check(LIVE_CHECKS[4], dot === 1, "dot " + dot);
    await peer.goto(BASE + "/messages/" + threadId, { waitUntil: "networkidle" });
    await peer.locator(`[data-msg]:has-text("${words}")`).waitFor({ timeout: 15000 });
    // The peer's cursors are debounced two seconds; then the owner's page reads the row again.
    await peer.waitForTimeout(3500);
    let second = "";
    for (let i = 0; i < 6 && second !== "Delivered" && second !== "Read"; i++) {
      await page.waitForTimeout(2000);
      second =
        (await mine
          .locator("[data-ticks]")
          .getAttribute("aria-label")
          .catch(() => "")) || "";
      if (i === 3) await page.reload({ waitUntil: "networkidle" });
    }
    check(LIVE_CHECKS[3], second === "Delivered" || second === "Read", "tick " + second);

    // 6. React.
    await mine.hover();
    await mine.locator('[data-cluster] button:has-text("React")').click();
    await page.locator('[data-picker] button:has-text("Noted")').click();
    await page.waitForTimeout(1500);
    const reacts = await mine.locator("[data-reaction]").allTextContents();
    check(
      LIVE_CHECKS[5],
      reacts.some((t) => t.startsWith("Noted, ")),
      reacts.join(","),
    );

    // 7. Edit.
    await mine.hover();
    await mine.locator('button[aria-label="Message actions"]').click();
    await page.locator('[role="menuitem"]:has-text("Edit")').click();
    await page.fill('[data-testid="message-field"]', words + " edited");
    await page.click('[data-testid="send"]');
    await page.waitForTimeout(1500);
    check(LIVE_CHECKS[6], (await mine.locator("[data-edited]").count()) === 1);

    // 8. Pin (owner-test leads the group).
    await mine.hover();
    await mine.locator('button[aria-label="Message actions"]').click();
    await page.locator('[role="menuitem"]:has-text("Pin")').first().click();
    await page.waitForTimeout(1500);
    const strip = await page
      .locator("[data-pinned-strip]")
      .textContent()
      .catch(() => "");
    check(LIVE_CHECKS[7], strip.includes(words), strip.slice(0, 120));

    // 9, 10, 11. Row acts from the list.
    await page.goto(BASE + "/messages", { waitUntil: "networkidle" });
    const lrow = page
      .locator(`[data-thread-row]:has([data-thread-name]:text-is("${GROUP}"))`)
      .first();
    await lrow.waitFor({ timeout: 15000 });
    const act = async (label) => {
      await lrow.hover();
      await lrow.locator(`button[aria-label="Actions for ${GROUP}"]`).click();
      await page.locator(`[role="menuitem"]:has-text("${label}")`).first().click();
      await page.waitForTimeout(1500);
    };
    await act("Mark as unread");
    check(LIVE_CHECKS[8], (await lrow.getAttribute("data-unread")) === "1");
    await act("Mute for 8 hours");
    const mutedNow = (await lrow.textContent()).includes("Muted");
    await act("Unmute");
    const unmuted = !(await lrow.textContent()).includes("Muted");
    check(LIVE_CHECKS[9], mutedNow && unmuted, `muted ${mutedNow} unmuted ${unmuted}`);
    await act("Archive");
    const gone =
      (await page
        .locator(`[data-testid="thread-list"] [data-thread-name]:text-is("${GROUP}")`)
        .count()) === 0;
    const back = await rpc(memberToken, "messenger_send", {
      p_thread: threadId,
      p_client_id: crypto.randomUUID(),
      p_body: "41-C arm, from member-test",
    });
    if (back.body && back.body.id) sent.push({ id: back.body.id, token: memberToken });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const returned =
      (await page
        .locator(`[data-testid="thread-list"] [data-thread-name]:text-is("${GROUP}")`)
        .count()) === 1;
    check(
      LIVE_CHECKS[10],
      gone && returned,
      `gone ${gone} returned ${returned} send ${back.status}`,
    );

    // 12. Search with a During bound.
    await page.fill('input[placeholder="Search messages"]', words.split(" ").pop());
    await page.click('[data-testid="search-filters"]');
    const today = await page.evaluate(() => {
      const d = new Date();
      return (
        d.getFullYear() +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(d.getDate()).padStart(2, "0")
      );
    });
    await page.fill('input[data-search-date="during"]', today);
    await page.locator("[data-search-result]").first().waitFor({ timeout: 15000 });
    await page.locator("[data-search-result]").first().click();
    await page.waitForURL("**/messages/" + threadId, { timeout: 15000 });
    await page.waitForTimeout(1200);
    const ringed = await page.evaluate(() =>
      [...document.querySelectorAll("[data-msg] [data-bubble]")].some(
        (b) => getComputedStyle(b).outlineStyle === "solid",
      ),
    );
    check(LIVE_CHECKS[11], ringed);

    // 14, 15. The media notice and an image.
    const seenBefore = settingsBefore.body && settingsBefore.body.media_notice_seen_at;
    const jpeg = Buffer.from(
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
      "base64",
    );
    await page
      .locator('input[type="file"][accept="image/*"]')
      .setInputFiles({ name: "arm.jpg", mimeType: "image/jpeg", buffer: jpeg });
    await page.waitForTimeout(500);
    const noticeShown = (await page.locator("[data-media-notice]").count()) > 0;
    check(
      LIVE_CHECKS[13],
      noticeShown === !seenBefore,
      `seen ${seenBefore ? "yes" : "no"}; notice ${noticeShown}`,
    );
    if (noticeShown) await page.locator('[data-media-notice] button:has-text("OK")').click();
    await page.click('[data-testid="send"]');
    let img = 0;
    for (let i = 0; i < 10 && !img; i++) {
      await page.waitForTimeout(1500);
      img = await page.evaluate(
        () =>
          [...document.querySelectorAll('[data-msg][data-own="1"] img')].filter(
            (i) => i.src.startsWith("blob:") && i.naturalWidth > 0,
          ).length,
      );
    }
    check(LIVE_CHECKS[14], img > 0, "rendered images " + img);

    // 16. A voice note from the synthetic microphone.
    await page.click('[data-testid="record"]');
    await page.waitForTimeout(2600);
    await page.click('[data-testid="record"]');
    await page.waitForTimeout(800);
    await page.click('[data-testid="send"]').catch(() => undefined);
    let player = 0;
    for (let i = 0; i < 10 && !player; i++) {
      await page.waitForTimeout(1500);
      player = await page.locator('[data-msg][data-own="1"] [data-voice-player]').count();
    }
    check(LIVE_CHECKS[15], player > 0, "players " + player);

    // 17. Delete for everyone, the text message.
    await page.goto(BASE + "/messages/" + threadId, { waitUntil: "networkidle" });
    const m2 = page.locator(`[data-msg="${id}"]`);
    await m2.waitFor({ timeout: 15000 });
    await m2.hover();
    await m2.locator('button[aria-label="Message actions"]').click();
    await page.locator('[role="menuitem"]:has-text("Delete for everyone")').click();
    await page.waitForTimeout(1500);
    const delText = await page
      .locator(`[data-msg="${id}"]`)
      .textContent()
      .catch(() => "");
    check(LIVE_CHECKS[16], delText.includes("This message was deleted"), delText.slice(0, 80));

    const keys = await messengerStorage(page);
    check(
      LIVE_CHECKS[17],
      keys.length === 0 && errors.length === 0,
      keys.join(",") + " " + errors.slice(0, 2).join(" | "),
    );
  } catch (e) {
    record(`${tag} flow`, false, String(e).slice(0, 600));
  } finally {
    rest("the flow ended before this check ran");
    // Put the thread back: every message this run sent, deleted for everyone by its author, and
    // the owner's own cursors and acts left as an ordinary read.
    if (ownerToken && threadId) {
      const own = await fetch(
        SUPABASE_URL +
          "/rest/v1/messenger_messages_view?select=message_id,deleted,own,body&thread_id=eq." +
          threadId +
          "&own=is.true&deleted=is.false",
        { headers: { apikey: KEY, Authorization: "Bearer " + ownerToken } },
      )
        .then((r) => r.json())
        .catch(() => []);
      for (const m of Array.isArray(own) ? own : [])
        await rpc(ownerToken, "messenger_delete", { p_message: m.message_id }).catch(
          () => undefined,
        );
      for (const s of sent)
        if (typeof s === "object")
          await rpc(s.token, "messenger_delete", { p_message: s.id }).catch(() => undefined);
      await rpc(ownerToken, "messenger_unarchive", { p_thread: threadId }).catch(() => undefined);
      await rpc(ownerToken, "messenger_mute", { p_thread: threadId }).catch(() => undefined);
    }
    if (browser) await browser.close().catch(() => undefined);
  }
}

/** The layout cells: SPEC 41-14's 360, 390, 820 and 1280, each in both themes. */
const LAYOUT_CELLS = [
  [360, 800],
  [390, 844],
  [820, 1180],
  [1280, 800],
];
/** The flow cells: compact on touch, expanded on pointer. */
const FLOW_CELLS = [
  [[390, 844], "light"],
  [[1280, 800], "dark"],
];

module.exports = {
  runMessengerLayout,
  runMessengerFlows,
  runMessengerLive,
  LAYOUT_CELLS,
  FLOW_CELLS,
  LAYOUT_CHECKS,
  FLOW_CHECKS,
  LIVE_CHECKS,
};
