// Brief 5, Done Means 8: the two ruling 218 test accounts complete onboarding once, through the
// real surface on the deployed URL, rather than the live arms learning to bypass the gate. Run
// from .github/workflows/onboard-test-accounts.yml with the same secrets the live arms use.
//
// Owner Test touches a card (Returnee, the stance they already carry) so stance_declared_at is set;
// Member Test finishes without touching so it stays null and the default stands. Both keep the
// username they already have, which is the derived suggestion, so username_changes stays 0 and
// every handle the live arms read by name is unchanged. Neither uploads a photo: both accounts
// already carry an avatar path, which the screen shows in its chosen state.
//
// Idempotent: an account whose gate is already closed is reported and left alone.
// Usage: BASE=https://<deployment> OWNER_EMAIL=… OWNER_PASSWORD=… MEMBER_EMAIL=… MEMBER_PASSWORD=… node tests/onboard-test-accounts.cjs
const { chromium } = require("playwright");

const BASE = (process.env.BASE || "").replace(/\/$/, "");
if (!BASE) {
  console.log("BASE is required");
  process.exit(2);
}
const ACCOUNTS = [
  {
    label: "Owner Test",
    email: process.env.OWNER_EMAIL,
    password: process.env.OWNER_PASSWORD,
    touch: "returnee",
  },
  {
    label: "Member Test",
    email: process.env.MEMBER_EMAIL,
    password: process.env.MEMBER_PASSWORD,
    touch: null,
  },
];

const pathOf = (page) => new URL(page.url()).pathname.replace(/\/$/, "");

async function onboard(browser, acct) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const out = { label: acct.label, steps: [] };
  try {
    await page.goto(BASE + "/sign-in", { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', acct.email);
    await page.fill('input[type="password"]', acct.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(feed|welcome|where|relationship)(\?|$)/, { timeout: 30000 });
    await page.waitForTimeout(800);
    let at = pathOf(page);
    out.steps.push("landed on " + at);
    if (at === "/feed") {
      out.result = "already onboarded: the gate sent this account to the Feed";
      return out;
    }
    if (at === "/welcome") {
      await page.waitForSelector('[data-testid="who-form"]', { timeout: 30000 });
      const name = await page.locator('[data-testid="name"]').inputValue();
      const username = await page.locator('[data-testid="username"]').inputValue();
      const photo = await page.locator('[data-testid="photo-plate"]').getAttribute("data-state");
      out.steps.push(`screen one: name "${name}" username "${username}" photo ${photo}`);
      if (photo !== "chosen")
        throw new Error(
          "screen one: no photo on this account; upload one by hand first (ruling 324)",
        );
      await page.locator('[data-testid="continue"]').click();
      await page.waitForURL(/\/(where|relationship)(\?|$)/, { timeout: 30000 });
      at = pathOf(page);
      out.steps.push("screen one written, now at " + at);
    }
    if (at === "/where") {
      await page.waitForSelector('[data-testid="where-form"]', { timeout: 30000 });
      const city = await page.locator('[data-testid="city"]').inputValue();
      if (!city) await page.locator('[data-testid="city"]').fill("Accra");
      const country = await page.locator('[data-testid="country"]').inputValue();
      if (!country) await page.locator('[data-testid="country"]').selectOption("Ghana");
      await page.locator('[data-testid="continue"]').click();
      await page.waitForURL(/\/relationship(\?|$)/, { timeout: 30000 });
      out.steps.push("screen two written");
    }
    await page.waitForSelector('[data-testid="relationship-form"]', { timeout: 30000 });
    if (acct.touch) {
      await page.locator('[data-testid="stance-card-' + acct.touch + '"]').click();
      out.steps.push("screen three: touched " + acct.touch);
    } else out.steps.push("screen three: left untouched");
    await page.locator('[data-testid="finish"]').click();
    await page.waitForURL(/\/feed(\?|$)/, { timeout: 30000 });
    out.result = "onboarded through the surface, landed on the Feed";
    return out;
  } catch (e) {
    out.result = "FAILED at " + pathOf(page) + ": " + String(e).slice(0, 300);
    return out;
  } finally {
    await ctx.close();
  }
}

(async () => {
  const missing = ACCOUNTS.filter((a) => !a.email || !a.password).map((a) => a.label);
  if (missing.length) {
    console.log("credentials missing for " + missing.join(", "));
    process.exit(2);
  }
  const browser = await chromium.launch(
    process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  );
  let failed = false;
  for (const acct of ACCOUNTS) {
    const r = await onboard(browser, acct);
    console.log(`${r.label}: ${r.result}`);
    for (const s of r.steps) console.log("  - " + s);
    if (/^FAILED/.test(r.result)) failed = true;
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
