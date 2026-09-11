// Rulings 193 and 194: the three merged surfaces that held a hardcoded vocabulary now read one at
// runtime, and a vocabulary that fails to load renders an empty control rather than a stale literal.
// Both halves are checked in the browser against BASE, with the vocabulary read served in one pass
// and forced to fail in the other (db.failVocab), because reading the code proves neither.
//
// Surfaces: the Composer's Contribute instrument (Brief 1), the Feed's instrument row on a Need
// (Brief 2), and Profile's Return timeline select in edit mode (Brief 3).
// Usage: BASE=https://<preview>.dna-web-application.pages.dev SPECIAL=vocab node tests/matrix.cjs
const M = require("./matrix.cjs");

const { launch, makeMockDb, seedPosts, mockSupabase, signIn, record, BASE, UID } = M;
const HANDLE = "thandiwe-dube";
const NEED_TITLE = "Site survey for the Kisumu clinic";

/** A published Need, so the Feed renders the instrument row without going through the composer. */
function seedNeed(db) {
  db.opportunities.push({
    id: "o-vocab",
    receiver_member_id: UID,
    title: NEED_TITLE,
    instrument: "in_kind",
    need: "Two days of survey work, on site.",
    by_date: null,
    by_text: "Before the rains",
    space_id: null,
    event_id: null,
    created_at: new Date().toISOString(),
  });
  db.posts.unshift({
    id: "post-vocab",
    author_kind: "member",
    author_id: UID,
    created_by: UID,
    c_category: "contribute",
    body: "Posting this one as a Need.",
    anchor_kind: null,
    anchor_id: null,
    created_object_kind: "opportunity",
    created_object_id: "o-vocab",
    audience: "everyone",
    status: "published",
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });
}

async function runVocabulary(browserType, bname, [w, h], theme, fail) {
  const tag = `${bname}-${w}x${h}-${theme}-vocab-${fail ? "failed" : "served"}`;
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
  seedPosts(db, 1);
  seedNeed(db);
  db.failVocab = fail;
  await page.addInitScript(
    ({ theme }) => {
      try {
        localStorage.setItem("dna.theme", theme);
      } catch {}
    },
    { theme },
  );
  await mockSupabase(page, db);
  try {
    await signIn(page);

    // Feed (Brief 2): the Need's instrument row is the vocabulary's label, or it is absent.
    const card = page.locator("article").filter({ hasText: NEED_TITLE }).first();
    await card.waitFor({ timeout: 15000 });
    const cardText = await card.textContent();
    record(
      tag + ": Feed Need card instrument row",
      fail
        ? !cardText.includes("In-kind") && !cardText.includes("in_kind")
        : cardText.includes("In-kind"),
      JSON.stringify(cardText.slice(0, 140)),
    );
    record(
      tag + ": Feed card renders the Need either way (the row goes, the card stays)",
      cardText.includes(NEED_TITLE),
    );

    // Composer (Brief 1): the Contribute instrument options.
    await page.locator('[data-testid="compose"]').first().click();
    const dialog = page.locator('section[role="dialog"][aria-label="Compose"]');
    await dialog.waitFor({ timeout: 10000 });
    await dialog.getByRole("radio", { name: "Post a Need (Contribute)" }).click();
    const instrument = dialog.locator('[role="radiogroup"][aria-label="Instrument"]');
    // Attached, not visible: a radiogroup with no options has no box, which is the point.
    await instrument.waitFor({ state: "attached", timeout: 5000 });
    const options = await instrument.locator('[role="radio"]').allTextContents();
    record(
      tag + ": Composer instrument options",
      fail
        ? options.length === 0
        : options.length === 3 && options.join("|") === "Time|Skills|In-kind",
      JSON.stringify(options),
    );
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // Profile (Brief 3): the Return timeline select in edit mode. "Choose" is the select's own
    // placeholder, not a vocabulary value, so an unloaded vocabulary leaves exactly that one option.
    await page.goto(BASE + "/m/" + HANDLE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="edit-profile"]', { timeout: 15000 });
    await page.locator('[data-testid="edit-profile"]').first().click();
    await page.waitForSelector('[data-testid="profile"][data-edit="1"]', { timeout: 10000 });
    const select = page.locator("select").filter({ hasText: "Choose" }).first();
    await select.waitFor({ timeout: 10000 });
    const timeline = (await select.locator("option").allTextContents()).filter(
      (t) => t !== "Choose",
    );
    record(
      tag + ": Profile Return timeline options",
      fail ? timeline.length === 0 : timeline.length === 4 && timeline[0] === "Already back",
      JSON.stringify(timeline),
    );
  } catch (e) {
    record(tag + ": flow completed", false, String(e).slice(0, 200));
  }
  await browser.close();
}

module.exports = { runVocabulary };
