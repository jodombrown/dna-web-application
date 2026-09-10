// Brief 4B (rulings 230 to 236, 240): the auth surfaces in the browser. Points at BASE with the
// Supabase auth endpoints mocked at the network layer on top of the shared mock, so the real client
// code paths run against a backend whose answers this file controls. Backend behaviour that no
// browser can reach — identity linking across two providers (ruling 234) — lives in
// tests/auth-identity.cjs and is reported there.
// Usage: BASE=https://<preview>.dna-web-application.pages.dev SPECIAL=auth node tests/matrix.cjs
const M = require("./matrix.cjs");

const {
  launch,
  makeMockDb,
  seedPosts,
  mockSupabase,
  signIn,
  record,
  noOverflow,
  BASE,
  SB,
  JWT,
  UID,
} = M;

const RECOVERY_USER = {
  id: UID,
  aud: "authenticated",
  role: "authenticated",
  email: "member@test.invalid",
  user_metadata: { full_name: "Amara Osei" },
  app_metadata: { provider: "email" },
  created_at: new Date().toISOString(),
};
const RECOVERY_SESSION = {
  access_token: JWT,
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: "recovery-r",
  user: RECOVERY_USER,
};
/** A live recovery fragment, the shape GoTrue redirects with in the implicit flow. */
const RECOVERY_HASH =
  "#access_token=" +
  JWT +
  "&expires_in=3600&refresh_token=recovery-r&token_type=bearer&type=recovery";
const EXPIRED_HASH =
  "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";

/**
 * Auth endpoints on top of the shared mock. Playwright matches the most recently registered route
 * first, so these win over mockSupabase's generic handler without editing it.
 */
async function mockAuth(page, auth) {
  await page.route(`**/${SB}/auth/v1/**`, async (route) => {
    try {
      await handleAuth(route, auth);
    } catch (e) {
      // Never let a handler failure escape as an uncaught rejection: that ends the process and the
      // run reports nothing at all rather than one failed check.
      console.log("AUTH MOCK ERROR", String(e).slice(0, 160));
      await route.abort().catch(() => undefined);
    }
  });
}

async function handleAuth(route, auth) {
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
  if (p === "/auth/v1/recover") {
    auth.recoverCalls.push({ body: req.postDataJSON(), at: Date.now() });
    if (auth.recoverDelay) await new Promise((r) => setTimeout(r, auth.recoverDelay));
    // The two answers a known and an unknown address could plausibly produce. Neither may reach
    // the surface (ruling 156 applied to auth).
    return auth.recoverFails
      ? json({ code: 400, error_code: "validation_failed", msg: "no such user" }, 400)
      : json({});
  }
  if (p === "/auth/v1/signup") {
    auth.signupCalls.push(req.postDataJSON());
    if (auth.signupWeak)
      return json(
        {
          code: 422,
          error_code: "weak_password",
          msg: "Password is known to be weak and easy to guess, please choose a different one.",
          weak_password: { reasons: ["pwned"] },
        },
        422,
      );
    // Confirm-email on: no session either way, and for an address that already exists GoTrue
    // returns an obfuscated user rather than an error.
    return json({ ...RECOVERY_USER, identities: auth.signupExisting ? [] : [{ id: "i1" }] });
  }
  if (p === "/auth/v1/token") {
    const body = req.postDataJSON() || {};
    auth.tokenCalls.push(body);
    if (auth.wrongCurrent && body.password === auth.wrongCurrent)
      return json({ code: 400, error_code: "invalid_credentials", msg: "Invalid login" }, 400);
    return json(RECOVERY_SESSION);
  }
  if (p === "/auth/v1/user" && method === "PUT") {
    auth.updateCalls.push(req.postDataJSON());
    if (auth.updateWeak)
      return json(
        {
          code: 422,
          error_code: "weak_password",
          msg: "Password is known to be weak and easy to guess, please choose a different one.",
          weak_password: { reasons: ["pwned"] },
        },
        422,
      );
    return json(RECOVERY_USER);
  }
  if (p === "/auth/v1/user") return json(RECOVERY_USER);
  if (p === "/auth/v1/logout") {
    auth.logoutScopes.push(url.searchParams.get("scope") || "global");
    return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
  }
  if (p === "/auth/v1/authorize") {
    // The provider round trip, cancelled: the member closes the window and the provider sends
    // them back to redirect_to with an access_denied fragment. Served as a document that
    // redirects itself rather than a 302, because route.fulfill refuses a redirect status in
    // WebKit and the refusal escapes the handler as an uncaught exception.
    const back = url.searchParams.get("redirect_to") || BASE + "/sign-in";
    const to = back + "#error=access_denied&error_description=The+user+cancelled";
    return route.fulfill({
      status: 200,
      contentType: "text/html",
      headers: { "access-control-allow-origin": "*" },
      body: `<!doctype html><meta charset="utf-8"><title>provider</title><script>location.replace(${JSON.stringify(
        to,
      )})</script>`,
    });
  }
  return json({});
}

function makeAuth() {
  return {
    recoverCalls: [],
    signupCalls: [],
    tokenCalls: [],
    updateCalls: [],
    logoutScopes: [],
    recoverFails: false,
    recoverDelay: 0,
    signupExisting: false,
    signupWeak: false,
    updateWeak: false,
    wrongCurrent: null,
  };
}

/**
 * Wait for hydration before touching a control. Every auth route calls useTheme, which stamps
 * data-theme on the document element in an effect, so the attribute's arrival is the client taking
 * over from the server-rendered markup.
 */
async function hydrated(page) {
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-theme"), null, {
    timeout: 15000,
  });
}

/**
 * Ruling 301: what the recovery arm was looking at when it gave up.
 *
 * The arm has failed only in WebKit, and in Chromium never: runs 113, 115 attempt 2, 116, 117 and
 * 119, at three viewport and theme pairs. Every one of those failures recorded nothing but the
 * selector it timed out on, which is why the cause is unestablished rather than merely unfixed.
 * Three different endings present as the same missing element: a stage that never left `form`
 * because the submit was rejected, a stage that flipped to `expired` because updateUser answered
 * with an error, and a submit whose promise never settled. This tells them apart when it next fires.
 *
 * It records; it does not rescue. The arm stays red (ruling 206).
 */
async function recoveryState(page, auth) {
  const state = { url: "unavailable", rendered: [], alert: "", busy: null };
  try {
    state.url = page.url();
    for (const id of ["reset-new", "reset-done", "reset-expired", "auth-alert", "compose"])
      if ((await page.locator(`[data-testid="${id}"]`).count()) > 0) state.rendered.push(id);
    if (state.rendered.includes("auth-alert"))
      state.alert = (await page.locator('[data-testid="auth-alert"]').innerText()).slice(0, 140);
    state.busy = await page
      .getAttribute('[data-testid="reset-new"]', "aria-busy")
      .catch(() => null);
  } catch (e) {
    // A dead web process cannot answer; ruling 274's flag on the record says which case this is.
    state.url = "state unavailable: " + String(e).slice(0, 140);
  }
  return (
    JSON.stringify(state) +
    ` | updateUser calls ${auth.updateCalls.length} | logout scopes ${JSON.stringify(auth.logoutScopes)}`
  );
}

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
  seedPosts(db, 1);
  const auth = makeAuth();
  await page.addInitScript(
    ({ theme }) => {
      try {
        localStorage.setItem("dna.theme", theme);
      } catch {}
    },
    { theme },
  );
  await mockSupabase(page, db);
  await mockAuth(page, auth);
  return { browser, page, db, auth };
}

/** The reset "sent" state for one server answer, with the markup and the time it took to reveal. */
async function sentState(browserType, vp, theme, tune) {
  const { browser, page, auth } = await open(browserType, vp, theme);
  tune(auth);
  await page.goto(BASE + "/reset", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="reset-request"]');
  await hydrated(page);
  await page.fill('input[type="email"]', "same@test.invalid");
  const started = Date.now();
  await page.click('button[type="submit"]');
  await page.waitForSelector('[data-testid="check-email"]', { timeout: 15000 });
  const elapsed = Date.now() - started;
  const html = await page.locator('[data-testid="check-email"]').evaluate((el) => el.outerHTML);
  await browser.close();
  return { html, elapsed, calls: auth.recoverCalls.length };
}

/**
 * The responsive half (ruling 61): every new surface rendered at every viewport and both themes,
 * with the additions in place and no horizontal overflow. One browser, four navigations, so it is
 * cheap enough to run across the whole matrix. The state flows live in runAuthFlows, which runs on
 * the two representative layouts the way tests/block.cjs and tests/vocabulary.cjs do.
 */
async function runAuthLayout(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-auth`;
  M.armStart(tag + " layout");
  {
    const { browser, page } = await open(browserType, [w, h], theme);
    try {
      await page.goto(BASE + "/sign-in", { waitUntil: "domcontentloaded" });
      await page.waitForSelector('button[type="submit"]');
      await hydrated(page);
      const order = await page.evaluate(() => {
        const form = document.querySelector("form");
        const marks = [
          ['input[type="password"]', "password"],
          ['[data-testid="forgot-password"]', "forgot"],
          ['button[type="submit"]', "submit"],
          ['[role="separator"]', "separator"],
          ['[data-testid="provider-google"]', "google"],
          ['[data-testid="provider-linkedin_oidc"]', "linkedin"],
        ];
        const nodes = marks
          .map(([sel, name]) => [form.querySelector(sel), name])
          .filter(([el]) => el);
        const all = Array.from(form.querySelectorAll("*"));
        return nodes
          .sort((a, b) => all.indexOf(a[0]) - all.indexOf(b[0]))
          .map(([, name]) => name)
          .join(">");
      });
      record(
        tag + ": sign-in additions in DOM order after the Password field",
        order === "password>forgot>submit>separator>google>linkedin",
        order,
      );
      record(
        tag + ": the separator names itself",
        (await page.locator('[role="separator"][aria-label="Or"]').count()) === 1,
      );
      record(
        tag + ": provider marks are decorative and the label carries the name",
        (await page.locator('[data-testid="provider-google"] img[alt=""]').count()) === 1 &&
          (await page.locator('[data-testid="provider-google"]').innerText()).includes("Google"),
      );
      record(
        tag + ": a visually hidden h1 names the surface",
        (await page.locator("h1").innerText()).trim() === "Sign in",
      );
      // The Sign in page above the Password field is unchanged: logo, Email, Password, in that order.
      const above = await page.evaluate(() => {
        const form = document.querySelector("form");
        return Array.from(form.querySelectorAll("img, input"))
          .map((el) => (el.tagName === "IMG" ? "logo" : el.getAttribute("type")))
          .join(">");
      });
      record(
        tag + ": nothing above the Password field moved",
        above.startsWith("logo>email>password"),
        above,
      );
      await noOverflow(page, tag + ": sign-in");

      // The reset request surface.
      await page.goto(BASE + "/reset", { waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-testid="reset-request"]');
      await hydrated(page);
      record(
        tag + ": /reset names itself",
        (await page.locator("h1").innerText()).trim() === "Reset your password",
      );
      await noOverflow(page, tag + ": reset request");

      // The reset landing in the state members actually hit.
      await page.goto(BASE + "/reset/new" + EXPIRED_HASH, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-testid="reset-expired"]', { timeout: 15000 });
      await hydrated(page);
      await noOverflow(page, tag + ": reset landing expired");

      // The signed-in change-password surface, inside the shell. The shared signIn waits for the
      // shell to finish mounting; navigating on the bare waitForURL raced the shell's own
      // navigation in WebKit and lost the goto.
      await signIn(page);
      await page.goto(BASE + "/password", { waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-testid="password"]', { timeout: 15000 });
      await hydrated(page);
      record(
        tag + ": /password renders in the shell content column",
        (await page.locator("header").count()) > 0 &&
          (await page.locator("h1").innerText()).trim() === "Change your password",
      );
      await noOverflow(page, tag + ": change password");
    } catch (e) {
      record(tag + ": layout pass completed", false, String(e).slice(0, 200));
    }
    await browser.close();
  }
}

/**
 * The state flows: the two identities the brief names, ruling 240's gate, and every error state.
 * Backend-shaped rather than layout-shaped, so they run on the two representative layouts.
 */
async function runAuthFlows(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-auth`;
  M.armStart(tag + " flows");

  // 2. The alert block takes focus, and the offending fields carry the border and nothing else.
  {
    const { browser, page } = await open(browserType, [w, h], theme);
    try {
      await page.goto(BASE + "/sign-in", { waitUntil: "domcontentloaded" });
      await hydrated(page);
      await page.fill('input[type="email"]', "not-an-address");
      await page.fill('input[type="password"]', "whatever-long-enough");
      await page.click('button[type="submit"]');
      await page.waitForSelector('[data-testid="auth-alert"]');
      const focused = await page.evaluate(
        () => document.activeElement?.getAttribute("data-testid") === "auth-alert",
      );
      record(tag + ": the alert takes focus when it appears", focused);
      record(
        tag + ": the alert is the only place the message appears",
        (await page.getByText("Enter an email address, like name@example.com.").count()) === 1,
      );
      record(
        tag + ": the malformed address flags the Email field",
        (await page.locator('input[type="email"][aria-invalid="true"]').count()) === 1 &&
          (await page.locator('input[type="password"][aria-invalid="true"]').count()) === 0,
      );
    } catch (e) {
      record(tag + ": alert flow completed", false, String(e).slice(0, 200));
    }
    await browser.close();
  }

  // 3. Provider cancelled is a status line and moves no focus.
  {
    const { browser, page } = await open(browserType, [w, h], theme);
    try {
      await page.goto(BASE + "/sign-in", { waitUntil: "domcontentloaded" });
      await hydrated(page);
      await page.click('[data-testid="provider-google"]');
      await page.waitForSelector('[data-testid="auth-status"]', { timeout: 15000 });
      const text = await page.locator('[data-testid="auth-status"]').innerText();
      record(
        tag + ": provider cancelled renders as a status line",
        text.startsWith("You closed the Google window before finishing."),
        text.slice(0, 60),
      );
      record(
        tag + ": provider cancelled is not an alert and moves no focus",
        (await page.locator('[data-testid="auth-alert"]').count()) === 0 &&
          (await page.evaluate(
            () => document.activeElement?.getAttribute("data-testid") !== "auth-status",
          )),
      );
      await noOverflow(page, tag + ": provider cancelled");
    } catch (e) {
      record(tag + ": provider cancelled flow completed", false, String(e).slice(0, 200));
    }
    await browser.close();
  }

  // 4. The two reset "sent" states, byte-identical and revealed at the same moment. The address is
  //    the same in both runs; only the server's answer differs, so any difference in the markup or
  //    the timing would be a difference the surface derived from the answer.
  {
    try {
      const known = await sentState(browserType, [w, h], theme, () => {});
      const unknown = await sentState(browserType, [w, h], theme, (a) => {
        a.recoverFails = true;
        a.recoverDelay = 1500;
      });
      record(
        tag + ": the two reset sent states are byte-identical",
        known.html === unknown.html,
        known.html === unknown.html ? "" : "markup differs",
      );
      record(
        tag + ": both requests actually reached the server",
        known.calls === 1 && unknown.calls === 1,
        `${known.calls} / ${unknown.calls}`,
      );
      // The reveal is a fixed delay, so a 1500ms answer and an instant one land together.
      record(
        tag + ": the reveal does not time the answer",
        Math.abs(known.elapsed - unknown.elapsed) < 600,
        `${known.elapsed}ms vs ${unknown.elapsed}ms`,
      );
    } catch (e) {
      record(tag + ": reset sent parity flow completed", false, String(e).slice(0, 200));
    }
  }

  // 5. Ruling 240: a valid recovery token never reaches the Feed. It lands on the Site URL, which is
  //    the state the ruling was observed in, and the app still renders /reset/new.
  {
    const { browser, page, auth } = await open(browserType, [w, h], theme);
    try {
      await page.goto(BASE + "/" + RECOVERY_HASH, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-testid="reset-new"]', { timeout: 15000 });
      await hydrated(page);
      record(
        tag + ": a recovery token on the Site URL renders /reset/new",
        new URL(page.url()).pathname.replace(/\/$/, "") === "/reset/new",
        page.url(),
      );
      record(
        tag + ": the Feed never rendered",
        (await page.locator('[data-testid="compose"]').count()) === 0,
      );
      // The gate holds: a signed-in recovery session cannot walk to the Feed.
      await page.goto(BASE + "/feed", { waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-testid="reset-new"]', { timeout: 15000 });
      await hydrated(page);
      record(
        tag + ": the recovery session is held at /reset/new",
        new URL(page.url()).pathname.replace(/\/$/, "") === "/reset/new",
        page.url(),
      );

      await page.fill('input[autocomplete="new-password"] >> nth=0', "correct horse battery");
      await page.fill('input[autocomplete="new-password"] >> nth=1', "correct horse stapler");
      await page.click('button[type="submit"]');
      await page.waitForSelector('[data-testid="auth-alert"]');
      record(
        tag + ": mismatched passwords flag Confirm and nothing else",
        (await page.locator('[data-testid="auth-alert"]').innerText()).startsWith(
          "The two passwords do not match.",
        ),
      );

      await page.fill('input[autocomplete="new-password"] >> nth=1', "correct horse battery");
      await page.click('button[type="submit"]');
      await page.waitForSelector('[data-testid="reset-done"]', { timeout: 15000 });
      record(
        tag + ": setting the password signs out other devices",
        auth.logoutScopes.includes("others"),
        JSON.stringify(auth.logoutScopes),
      );
      record(
        tag + ": the success state says so",
        (await page.locator('[data-testid="reset-done"]').innerText()).includes(
          "Any other device signed in with the old password has been signed out.",
        ),
      );
      await page.click('[data-testid="continue-to-dna"]');
      await page.waitForSelector('[data-testid="compose"]', { timeout: 15000 });
      record(
        tag + ": Continue to DNA reaches the Feed once a password is set",
        new URL(page.url()).pathname === "/feed",
        page.url(),
      );
      await noOverflow(page, tag + ": reset landing");
    } catch (e) {
      // Ruling 301, and ruling 206: red, with enough recorded to classify the next firing.
      record(
        tag + ": recovery landing flow completed",
        false,
        String(e).slice(0, 400) + " | " + (await recoveryState(page, auth)),
      );
    }
    await browser.close();
  }

  // 6. The state members actually hit: a used or expired link.
  {
    const { browser, page } = await open(browserType, [w, h], theme);
    try {
      await page.goto(BASE + "/reset/new" + EXPIRED_HASH, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-testid="reset-expired"]', { timeout: 15000 });
      await hydrated(page);
      const text = await page.locator('[data-testid="reset-expired"]').innerText();
      record(
        tag + ": an expired link says nothing changed",
        text.includes("This link no longer works") &&
          text.includes("Nothing about your account has changed."),
      );
      await page.click('[data-testid="request-new-link"]');
      await page.waitForSelector('[data-testid="reset-request"]', { timeout: 15000 });
      record(
        tag + ": Request a new link returns to /reset",
        new URL(page.url()).pathname === "/reset",
        page.url(),
      );
      await noOverflow(page, tag + ": expired link");
    } catch (e) {
      record(tag + ": expired link flow completed", false, String(e).slice(0, 200));
    }
    await browser.close();
  }

  // 7. Sign-up: the "Check your email" state is the same whether or not the address has an account.
  {
    const shots = [];
    for (const existing of [false, true]) {
      const { browser, page, auth } = await open(browserType, [w, h], theme);
      try {
        auth.signupExisting = existing;
        await page.goto(BASE + "/sign-in?join=1", { waitUntil: "domcontentloaded" });
        await page.waitForSelector('input[autocomplete="name"]');
        await hydrated(page);
        await page.fill('input[autocomplete="name"]', "Amara Osei");
        await page.fill('input[type="email"]', "same@test.invalid");
        await page.fill('input[type="password"]', "correct horse battery");
        await page.click('button[type="submit"]');
        await page.waitForSelector('[data-testid="check-email"]', { timeout: 15000 });
        shots.push(
          await page.locator('[data-testid="check-email"]').evaluate((el) => el.outerHTML),
        );
      } catch (e) {
        record(tag + ": sign-up check-email flow completed", false, String(e).slice(0, 200));
      }
      await browser.close();
    }
    record(
      tag + ": the sign-up Check your email state is identical either way",
      shots.length === 2 && shots[0] === shots[1],
    );
  }

  // 8. Sign-up refuses a breached password by name (ruling 231).
  {
    const { browser, page, auth } = await open(browserType, [w, h], theme);
    try {
      auth.signupWeak = true;
      await page.goto(BASE + "/sign-in?join=1", { waitUntil: "domcontentloaded" });
      await page.waitForSelector('input[autocomplete="name"]');
      await hydrated(page);
      await page.fill('input[autocomplete="name"]', "Amara Osei");
      await page.fill('input[type="email"]', "same@test.invalid");
      await page.fill('input[type="password"]', "password123456");
      await page.click('button[type="submit"]');
      await page.waitForSelector('[data-testid="auth-alert"]');
      record(
        tag + ": a breached password is named as one",
        (await page.locator('[data-testid="auth-alert"]').innerText()).startsWith(
          "This password appears in a known data breach",
        ),
      );
      record(
        tag + ": a refused password does not reach Check your email",
        (await page.locator('[data-testid="check-email"]').count()) === 0,
      );
    } catch (e) {
      record(tag + ": breached password flow completed", false, String(e).slice(0, 200));
    }
    await browser.close();
  }

  // 9. /password, signed in and inside the shell.
  {
    const { browser, page, auth } = await open(browserType, [w, h], theme);
    try {
      auth.wrongCurrent = "not-my-password";
      await signIn(page);
      await page.goto(BASE + "/password", { waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-testid="password"]', { timeout: 15000 });
      await hydrated(page);
      record(
        tag + ": /password renders inside the shell",
        (await page.locator("header").count()) > 0,
      );
      await page.fill('input[autocomplete="current-password"]', "not-my-password");
      await page.fill('input[autocomplete="new-password"] >> nth=0', "correct horse battery");
      await page.fill('input[autocomplete="new-password"] >> nth=1', "correct horse battery");
      await page.click('button[type="submit"]');
      await page.waitForSelector('[data-testid="auth-alert"]');
      record(
        tag + ": the wrong current password is named and only that field is flagged",
        (await page.locator('[data-testid="auth-alert"]').innerText()).startsWith(
          "That is not your current password.",
        ) &&
          (await page
            .locator('input[autocomplete="current-password"][aria-invalid="true"]')
            .count()) === 1,
      );
      await page.fill('input[autocomplete="current-password"]', "my-real-password");
      await page.click('button[type="submit"]');
      await page.waitForSelector('[data-testid="password-done"]', { timeout: 15000 });
      record(
        tag + ": changing the password signs out other devices",
        auth.logoutScopes.includes("others"),
        JSON.stringify(auth.logoutScopes),
      );
      record(
        tag + ": the member stays signed in here",
        (await page.locator('[data-testid="password-done"]').innerText()).includes(
          "You stay signed in here.",
        ),
      );
      await noOverflow(page, tag + ": change password");
    } catch (e) {
      record(tag + ": change password flow completed", false, String(e).slice(0, 200));
    }
    await browser.close();
  }
}

module.exports = { runAuthLayout, runAuthFlows };
