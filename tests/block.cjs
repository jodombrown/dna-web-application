// Ruling 198: what a blocked member sees on the profile of the member who blocked them, in the
// browser. The row policy itself is verified in SQL against the live project with a real block in
// place (closing report); this is the surface half: the page loads, and it carries none of the
// actions, sections or third-party names a visitor would get.
// Usage: BASE=https://<preview>.dna-web-application.pages.dev SPECIAL=block node tests/matrix.cjs
const M = require("./matrix.cjs");

const { launch, makeMockDb, seedPosts, mockSupabase, signIn, record, noOverflow, BASE } = M;
const HANDLE = "thandiwe-dube";
/** Strings only a connection or an Anchored viewer may see on the seeded persona. */
const CONNECTIONS_ONLY = ["dubepower.co.za", "thandiwedube", "dube.power"];
const ANCHORED_ONLY = ["Clinics that need a site survey", "Find collaborators"];
/** Attesters who do not share their own profile: a role, never a name (ruling 141). */
const UNSHARED_THIRD_PARTIES = ["Kwame Mensah", "Adaeze Nwosu"];

async function runBlock(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-blocked`;
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
  db.profile.mode = "blocked";
  db.profile.rel = "connected";
  db.profile.switches = { shared: false, private: false };
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
    await page.goto(BASE + "/m/" + HANDLE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="profile"]', { timeout: 15000 });
    await page.waitForTimeout(600);
    const text = await page.locator('[data-testid="profile"]').innerText();

    // Item 4: the shell still loads, even though this profile is not shared publicly. Hiding it
    // would disclose the block and be circumvented by signing out.
    record(tag + ": the profile still opens", text.includes("Thandiwe Dube"));
    // Item 1: no Connect action, no Follow, in either direction.
    record(
      tag + ": no Connect action and no Follow",
      (await page.locator('[data-testid="connect-with"]').count()) === 0 &&
        (await page.locator('[data-testid="follow"]').count()) === 0 &&
        (await page.locator('[data-testid="relationship"]').count()) === 0,
    );
    // Item 2: the lowest audience scope, which is the public projection.
    record(
      tag + ": no connections-scoped or anchored-scoped section",
      !CONNECTIONS_ONLY.some((t) => text.includes(t)) &&
        !ANCHORED_ONLY.some((t) => text.includes(t)),
    );
    record(
      tag + ": no mutual name and no DIA line",
      (await page.locator('[data-testid="mutuals"]').count()) === 0 &&
        !text.includes("is a connection you share") &&
        !text.includes("which you hosted"),
    );
    record(
      tag + ": third parties render as a role, never a name",
      !UNSHARED_THIRD_PARTIES.some((t) => text.includes(t)) && text.includes("the host"),
    );
    // The block itself is not a thing the surface says.
    record(
      tag + ": the surface says nothing about a block",
      !/block/i.test(text),
      JSON.stringify((text.match(/.{0,40}block.{0,40}/i) || [])[0] || ""),
    );
    await noOverflow(page, tag + ": blocked profile");
  } catch (e) {
    record(tag + ": flow completed", false, String(e).slice(0, 200));
  }
  await browser.close();
}

module.exports = { runBlock };
