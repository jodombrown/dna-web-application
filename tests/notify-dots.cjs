// Handoff 55-A (39-A) item "the matrix arm": the bell's dot and Connect's for-you dot on the deployed
// preview, at every viewport of the matrix in both themes (ruling 61), with the Supabase surface
// mocked by tests/matrix.cjs so the real client paths run against the migrations' answers.
//
// As member-test after owner-test sends an introduction (the mock's request row and pending flag):
//   - the bell shows its dot, and Connect's slot reads "for you" in the header or the dock (1481);
//   - opening the panel clears the bell's dot while the row keeps its unread weight (1322, 1521);
//   - the row reads "{name} wants to connect." under its destination words (461, 490);
//   - the row opens My Network with its Requests section in view (1482), and marks itself read;
//   - Connect's for-you dot stays until My Network opens, then clears (1522).
// Nine checks per cell, the invitation row (Fix PR 10 item 8) among them.
//
// Usage: BASE=https://<id>.dna-web-application.pages.dev SPECIAL=notify WEBKIT=1 node tests/matrix.cjs
const M = require("./matrix.cjs");

const { launch, makeMockDb, seedPosts, mockSupabase, signIn, record, shot, BASE } = M;

const REQUEST = {
  id: "n-request",
  recipient_member_id: M.UID,
  kind: "connection_request",
  c_category: "connect",
  actor_kind: "member",
  actor_id: "c4000000-0000-4000-8000-000000000003",
  object_kind: "connection_request",
  object_id: "cr-55a",
  read_at: null,
  seen_at: null,
  created_at: new Date(Date.now() - 2 * 60e3).toISOString(),
};

/** Connect's slot in whichever bar the tier shows: the header row at expanded, the dock below it. */
async function connectSlotLabel(page) {
  return await page.evaluate(() => {
    const slots = Array.from(document.querySelectorAll('button[data-c="connect"]'));
    const shown = slots.find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
    });
    return shown ? shown.getAttribute("aria-label") || "" : null;
  });
}

async function runNotifyDots(browserType, bname, [w, h], theme) {
  const tag = `${bname} ${w}x${h} ${theme} notify`;
  M.armStart(tag);
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
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  try {
    await signIn(page);
    await page.waitForTimeout(600);
    const quiet = await connectSlotLabel(page);
    record(
      tag + ": before a request, no bell dot and Connect's slot carries no state",
      (await page.locator('[data-testid="bell-dot"]').count()) === 0 &&
        quiet !== null &&
        !/for you/.test(quiet),
      "connect slot " + JSON.stringify(quiet),
    );

    // owner-test's introduction arrives: its row for member-test and the pending request.
    db.membersById[REQUEST.actor_id] = {
      id: REQUEST.actor_id,
      name: "Kwame Mensah",
      handle: "kwame-mensah",
    };
    db.notifications.push({ ...REQUEST });
    db.connect.pending = true;
    // Fix PR 10 item 8 (1637, 1623): Esi's group invitation arrives beside it, its thread in the
    // Messenger's own projection so the row's group name hydrates through messenger_threads_view.
    const mock = require("./messenger-mock.cjs");
    db.messenger.threads.unshift(mock.invitedGroupThread());
    db.notifications.push(mock.invitedGroupNotification());
    db.membersById[mock.members.esi.id] = {
      id: mock.members.esi.id,
      name: mock.members.esi.name,
      handle: "esi-owusu",
    };
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('[data-testid="bell-dot"]').waitFor({ timeout: 15000 });
    record(
      tag + ": the bell shows its dot after a request, a dot and never a numeral",
      (await page.locator('[data-testid="bell"]').textContent()).trim() === "" &&
        (await page.locator('[data-testid="bell-dot"]').count()) === 1,
    );
    await page
      .waitForFunction(
        () =>
          Array.from(document.querySelectorAll('button[data-c="connect"]')).some((el) =>
            /for you/.test(el.getAttribute("aria-label") || ""),
          ),
        null,
        { timeout: 15000 },
      )
      .catch(() => undefined);
    const pending = await connectSlotLabel(page);
    record(
      tag + ": Connect's slot carries the for-you dot (1481)",
      pending !== null && /for you/.test(pending),
      "connect slot " + JSON.stringify(pending),
    );

    await page.click('[data-testid="bell"]');
    const list = page.locator('[role="dialog"][aria-label="Notifications"]');
    await list.waitFor({ timeout: 10000 });
    const row = list.locator('button[data-kind="connection_request"]');
    await row.waitFor({ timeout: 10000 });
    const text = ((await row.textContent()) || "").replace(/\s+/g, " ");
    record(
      tag + ': the row reads "{name} wants to connect." under its destination words',
      text.includes("Kwame Mensah wants to connect.") &&
        (await row.getAttribute("data-destination")) === "Opens My Network, Requests" &&
        (await row.locator("[data-destination-line]").innerText()) ===
          "Opens My Network, Requests" &&
        (await row.locator('[role="img"][aria-label="Connect"]').count()) === 1,
      text.slice(0, 120),
    );
    const invite = list.locator('button[data-kind="thread_invitation"]');
    await invite.waitFor({ timeout: 10000 });
    const inviteText = ((await invite.textContent()) || "").replace(/\s+/g, " ");
    record(
      tag +
        ': the invitation row reads "{name} invited you to {group}." under Opens the group, marked Connect (1637, 1636, 1623)',
      inviteText.includes("Esi Owusu invited you to Tema cold chain.") &&
        (await invite.getAttribute("data-destination")) === "Opens the group" &&
        (await invite.locator("[data-destination-line]").innerText()) === "Opens the group" &&
        (await invite.locator('[role="img"][aria-label="Connect"]').count()) === 1,
      inviteText.slice(0, 120),
    );
    await page
      .locator('[data-testid="bell-dot"]')
      .waitFor({ state: "detached", timeout: 10000 })
      .catch(() => undefined);
    record(
      tag + ": opening the panel clears the bell's dot while the row keeps its unread weight",
      (await page.locator('[data-testid="bell-dot"]').count()) === 0 &&
        (await row.getAttribute("data-unread")) === "1" &&
        db.notifications.every((n) => !!n.seen_at),
    );
    await page.waitForTimeout(300);
    await shot(page, `${tag.replace(/ /g, "-")}-panel`);

    await row.click();
    await page.waitForURL((u) => u.pathname === "/connect", { timeout: 15000 });
    const requests = page.locator('[data-section="requests"]');
    await requests.waitFor({ timeout: 20000 });
    await page.waitForTimeout(400);
    const inView = await requests.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight };
    });
    record(
      tag + ": the row opens My Network with Requests in view (1482) and marks itself read",
      new URL(page.url()).searchParams.get("lens") === "network" &&
        inView.top >= 0 &&
        inView.top < inView.vh &&
        db.reads.includes(REQUEST.id),
      JSON.stringify(inView) + " reads " + JSON.stringify(db.reads),
    );
    await page
      .waitForFunction(
        () => {
          const slots = Array.from(document.querySelectorAll('button[data-c="connect"]'));
          return (
            slots.length > 0 &&
            slots.every((el) => !/for you/.test(el.getAttribute("aria-label") || ""))
          );
        },
        null,
        { timeout: 15000 },
      )
      .catch(() => undefined);
    const cleared = await connectSlotLabel(page);
    record(
      tag + ": Connect's for-you dot clears once My Network opens (1522)",
      cleared !== null && !/for you/.test(cleared) && db.connect.surfaceSeen.includes("my_network"),
      "connect slot " +
        JSON.stringify(cleared) +
        " marks " +
        JSON.stringify(db.connect.surfaceSeen),
    );
    await shot(page, `${tag.replace(/ /g, "-")}-my-network`);

    record(tag + ": no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  } catch (e) {
    record(tag + ": flow completed", false, String(e && e.message ? e.message : e).slice(0, 300));
  } finally {
    await browser.close();
  }
}

module.exports = { runNotifyDots };

if (require.main === module) {
  console.log(
    "Run through tests/matrix.cjs: BASE=" + BASE + " SPECIAL=notify node tests/matrix.cjs",
  );
}
