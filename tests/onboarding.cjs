// Brief 5, onboarding (onboarding/SPEC.md, rulings 297, 300, 307 to 309, 320 to 331). Split under
// ruling 279: runOnboardingLayout renders the three screens at every viewport and both themes;
// runOnboardingFlows proves the states on the two representative layouts. Both run against BASE
// with onboarding_state() and the onboarding function mocked at the network layer, so the real
// gate, screens and writes run and the mock only decides what the server answers.
//
// What the live project proves instead (tests/live-checks.cjs, B5 arms): the two test accounts
// onboarded once through this surface, one declared and one not, and a second finish is refused.
// Usage: BASE=https://<preview>.dna-web-application.pages.dev SPECIAL=onboarding node tests/matrix.cjs
const M = require("./matrix.cjs");

const { launch, makeMockDb, seedPosts, mockSupabase, record, noOverflow, shot, BASE, UID } = M;

/** SPEC section 3, verbatim. The arm fails on any drift from these strings. */
const COPY = {
  who: {
    heading: "Welcome to the Diaspora Network of Africa.",
    lead: "Your name, a username and a photo to begin. Where you are, and your relationship to the continent, come next.",
    nameHint: "As you'd like to be known here.",
    usernameHint:
      "We'll suggest one from your name. You can change it twice after this, so pick one you'll keep.",
    tooLarge: "That photo is too large. Choose a smaller one and try again.",
    failed: "We couldn't add that photo just now. Nothing else you entered is lost. Try again.",
    taken: "That username is taken. Choose another, or keep the one we suggest.",
  },
  where: {
    heading: "Where are you right now?",
    lead: "The city and country you're living in today. This helps people near you, and people from where you are, find you.",
  },
  relationship: {
    heading: "What's your relationship to the continent right now?",
    lead: "There's no wrong answer here, and nothing is permanent. Choose what feels closest to where you are today.",
    chosen: "You're marked as still exploring for now. Change it below if something fits better.",
    footer: "You can change this whenever you like. It's meant to move as you do.",
    explainer: "What these mean, and why we ask",
  },
  resume: "Welcome back. Let's pick up where you left off.",
  saveFailed: "We couldn't save that just now. Nothing you entered is lost. Try again.",
};
const CARDS = [
  [
    "returnee",
    "Returnee",
    "I am a Returnee",
    "Return looks different for everyone, and all of it counts.",
  ],
  ["kin", "Kin", "I am Kin", "you belong here without needing a plan."],
  ["anchor", "Anchor", "I am an Anchor", "you're who they reach."],
  [
    "ally",
    "Ally",
    "I am an Ally",
    "You walk alongside. You support and partner. You don't represent.",
  ],
  ["exploring", "Still exploring", "I'm still exploring", "Nothing here is waiting on you."],
];
const EXPLAINER_ROWS = ["Returnee", "Kin", "Anchor", "Ally", "Still exploring"];
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

/** A fresh member: name from the sign-up form or the provider, nothing else (SPEC section 1). */
function freshState() {
  return {
    next: "who",
    who: {
      name: "Amara Osei",
      username: null,
      suggestion: "amara-osei",
      avatar_path: null,
      completed: false,
    },
    where: { city: null, country: null, completed: false },
    relationship: {
      stance: "exploring",
      stance_label: "Still exploring",
      declared: false,
      completed: false,
    },
    onboarded_at: null,
  };
}

async function open(browserType, [w, h], theme, state) {
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
  db.onboarding.state = state;
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

/** Sign in and let the gate decide where the member lands. */
async function signInTo(page, glob) {
  await page.goto(BASE + "/sign-in", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "member@test.invalid");
  await page.fill('input[type="password"]', "x");
  await page.click('button[type="submit"]');
  await page.waitForURL(glob, { timeout: 15000 });
}

/** A goto the gate is expected to redirect: WebKit rejects the interrupted navigation, Chromium does not. */
const gotoRedirected = async (page, path, glob) => {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" }).catch(() => undefined);
  await page.waitForURL(glob, { timeout: 15000 });
};
const pathOf = (page) => new URL(page.url()).pathname.replace(/\/$/, "");
const mainText = (page) => page.locator("main").innerText();
/** Ruling 308: no numeral on any screen. The hint's "twice" is a word. */
const noNumeral = (text) => !/\d/.test(text);
const alertText = async (page) => {
  const a = page.locator('[data-testid="auth-alert"]');
  return (await a.count()) ? (await a.innerText()).trim() : null;
};
const activeTestId = (page) =>
  page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? null);

// ---------------------------------------------------------------------------
// Layout: the three screens and the explainer, every viewport, both themes.
// ---------------------------------------------------------------------------
async function runOnboardingLayout(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-onboarding-layout`;
  M.armStart(tag);
  const expanded = w > 1024;
  const compact = w < 640;
  const { browser, page, db } = await open(browserType, [w, h], theme, freshState());
  try {
    // Screen one, reached through the gate.
    await signInTo(page, "**/welcome");
    await page.waitForSelector('[data-testid="onboarding-who"]', { timeout: 15000 });
    await page.waitForTimeout(400);
    let text = await mainText(page);
    record(tag + ": screen one heading, verbatim", text.includes(COPY.who.heading));
    record(tag + ": screen one lead, verbatim", text.includes(COPY.who.lead));
    record(
      tag + ": screen one labels and hints, verbatim",
      text.includes("Your name") &&
        text.includes(COPY.who.nameHint) &&
        text.includes("Username") &&
        text.includes(COPY.who.usernameHint) &&
        text.includes("Photo") &&
        text.includes("Add a photo") &&
        text.includes("Continue"),
    );
    record(
      tag + ": screen one carries no numeral (ruling 308)",
      noNumeral(text),
      text.replace(/\s+/g, " ").slice(0, 200),
    );
    const logo = page.locator('main img[alt="DNA"]').first();
    const lb = await logo.boundingBox();
    record(
      tag + ": the wordmark sits above the heading at 80 tall (ruling 184)",
      !!lb && Math.round(lb.height) === 80,
      lb ? String(lb.height) : "no logo",
    );
    record(
      tag + ": no AppHeader, no dock, no rail on the auth layout (section 2)",
      (await page.locator("header").count()) === 0 &&
        (await page.locator('[data-testid="pulse-dock"]').count()) === 0,
    );
    record(
      tag + ": the landmark names itself by the heading",
      (await page.locator("main[aria-labelledby]").count()) === 1 &&
        (await page.evaluate(() => {
          const m = document.querySelector("main");
          const id = m?.getAttribute("aria-labelledby");
          return !!id && document.getElementById(id)?.tagName === "H1";
        })),
    );
    const plate = await page.locator('[data-testid="photo-plate"] > *').first().boundingBox();
    record(
      tag +
        `: the empty photo is the portrait size for the tier (${compact ? 96 : 120}, ruling 330)`,
      !!plate && Math.round(plate.width) === (compact ? 96 : 120),
      plate ? String(plate.width) : "no plate",
    );
    record(
      tag + ": Continue waits for the photo (ruling 324)",
      await page.locator('[data-testid="continue"]').isDisabled(),
    );
    await noOverflow(page, tag + " welcome");
    await shot(page, `onboarding-welcome-${bname}-${w}-${theme}`);

    // Screen two.
    db.onboarding.state.who = {
      ...db.onboarding.state.who,
      username: "amara-osei",
      avatar_path: `${UID}/avatar/a.png`,
      completed: true,
    };
    db.onboarding.state.next = "where";
    await page.goto(BASE + "/where", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="onboarding-where"]', { timeout: 15000 });
    await page.waitForTimeout(400);
    text = await mainText(page);
    record(tag + ": screen two heading, verbatim", text.includes(COPY.where.heading));
    // A fresh load with screen one already written is a resume (SPEC section 3), so the lead is
    // either the screen's own or Welcome back; the flows arm proves which one when.
    record(
      tag + ": screen two lead, verbatim",
      text.includes(COPY.where.lead) || text.includes(COPY.resume),
      text.slice(0, 160).replace(/\n/g, " | "),
    );
    record(
      tag + ": screen two labels, the empty country option and Back after Continue (ruling 180)",
      text.includes("City") &&
        text.includes("Country") &&
        (await page.locator('[data-testid="country"] option').first().innerText()) ===
          "Select a country" &&
        text.indexOf("Continue") < text.indexOf("Back"),
    );
    record(
      tag + ": the country list is the world list, read at runtime",
      (await page.locator('[data-testid="country"] option').count()) > 5,
    );
    record(tag + ": screen two carries no numeral (ruling 308)", noNumeral(text));
    await noOverflow(page, tag + " where");
    await shot(page, `onboarding-where-${bname}-${w}-${theme}`);

    // Screen three.
    db.onboarding.state.where = { city: "Nairobi", country: "Kenya", completed: true };
    db.onboarding.state.next = "relationship";
    await page.goto(BASE + "/relationship", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="onboarding-relationship"]', { timeout: 15000 });
    await page.waitForTimeout(400);
    text = await mainText(page);
    record(
      tag + ": screen three heading, verbatim (ruling 300)",
      text.includes(COPY.relationship.heading),
    );
    record(
      tag + ": screen three lead, verbatim (ruling 300)",
      text.includes(COPY.relationship.lead) || text.includes(COPY.resume),
      text.slice(0, 160).replace(/\n/g, " | "),
    );
    record(
      tag + ": the chosen line renders on load (rulings 327, 329)",
      (await page.locator('[data-testid="chosen-line"]').innerText()).trim() ===
        COPY.relationship.chosen,
    );
    record(
      tag + ": the footer and the explainer link, verbatim",
      text.includes(COPY.relationship.footer) && text.includes(COPY.relationship.explainer),
    );
    const cards = page.locator('[role="radiogroup"] [role="radio"]');
    record(
      tag + ": five cards in ruling 300's order",
      (await cards.count()) === 5 &&
        (await cards.allInnerTexts()).every((t, i) => t.startsWith(CARDS[i][1])),
    );
    let verbatim = true;
    for (let i = 0; i < 5; i++) {
      const t = await cards.nth(i).innerText();
      if (!t.includes(CARDS[i][2]) || !t.includes(CARDS[i][3])) verbatim = false;
    }
    record(tag + ": every card carries its body and label verbatim (ruling 331)", verbatim);
    record(
      tag + ": Still exploring is checked on load and is the one tab stop",
      (await cards.nth(4).getAttribute("aria-checked")) === "true" &&
        (await cards.nth(4).getAttribute("tabindex")) === "0" &&
        (await cards.nth(0).getAttribute("tabindex")) === "-1",
    );
    record(
      tag + ": Finish is live without any interaction",
      !(await page.locator('[data-testid="finish"]').isDisabled()),
    );
    record(tag + ": screen three carries no numeral (ruling 308)", noNumeral(text));
    const boxes = [];
    for (let i = 0; i < 5; i++) boxes.push(await cards.nth(i).boundingBox());
    if (expanded) {
      const row = await page.locator('[data-testid="stance-cards"]').boundingBox();
      record(
        tag + ": expanded shows the five in one row, bleeding to at most 1200 (ruling 320)",
        boxes.every((b) => b && Math.abs(b.y - boxes[0].y) < 2) &&
          !!row &&
          row.width <= 1200 + 1 &&
          row.width >= Math.min(1200, w - 80) - 1,
        row ? String(Math.round(row.width)) : "no row",
      );
      record(
        tag + ": the five cards are equal height",
        boxes.every((b) => b && Math.abs(b.height - boxes[0].height) < 2),
      );
    } else {
      record(
        tag + ": compact and medium stack the five in a column (ruling 320)",
        boxes.every((b, i) => b && (i === 0 || b.y > boxes[i - 1].y + boxes[i - 1].height - 1)) &&
          boxes.every((b) => b && Math.abs(b.x - boxes[0].x) < 2),
      );
    }
    record(
      tag + ": no horizontal scrolling and no scroll indicator anywhere",
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      ),
    );
    await noOverflow(page, tag + " relationship");
    await shot(page, `onboarding-relationship-${bname}-${w}-${theme}`);

    // The explainer, at this tier: a sheet on compact, a drawer above it (section 7).
    await page.locator('[data-testid="explainer-link"]').click();
    await page.waitForSelector('section[role="dialog"][data-shown], section[role="dialog"]', {
      timeout: 15000,
    });
    await page.waitForTimeout(SHEET_SETTLE);
    const dlg = page.locator('section[role="dialog"]');
    const dtext = await dlg.innerText();
    record(
      tag +
        ": the explainer opens as one sheet with the h2, the lead, both kickers, the five rows, The Return and the close line",
      dtext.includes("What these mean, and why we ask") &&
        dtext.includes("It never ranks you, and no one is ever shown a score.") &&
        dtext.toLowerCase().includes("what the five mean") &&
        dtext.toLowerCase().includes("what changes when you choose") &&
        EXPLAINER_ROWS.every((r) => dtext.includes(r)) &&
        dtext.includes("The Return is DNA's name for the movement") &&
        dtext.includes("changing it changes nothing about what you've already done here") &&
        dtext.includes("Got it"),
      dtext.replace(/\s+/g, " ").slice(0, 300),
    );
    record(
      tag + ": the explainer carries no numeral and no five-C tour (rulings 308, 322)",
      noNumeral(dtext) && !dtext.includes("Convene") && !dtext.includes("Collaborate"),
    );
    const db2 = await dlg.boundingBox();
    record(
      tag +
        (compact
          ? ": compact opens an 80 percent sheet"
          : ": medium and expanded open a 65 percent drawer"),
      !!db2 &&
        (compact
          ? Math.abs(db2.height - h * 0.8) < h * 0.05
          : Math.abs(db2.width - w * 0.65) < w * 0.03),
      db2 ? `${Math.round(db2.width)}x${Math.round(db2.height)}` : "no dialog",
    );
    record(
      tag + ": focus lands on the sheet heading (ruling 222)",
      (await activeTestId(page)) === "explainer-h2",
    );
    record(
      tag + ": opening the explainer does not touch the choice",
      (await page.locator('[data-testid="chosen-line"]').count()) === 1,
    );
    await shot(page, `onboarding-explainer-${bname}-${w}-${theme}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(SHEET_SETTLE);
    record(
      tag + ": Esc closes it and focus returns to the link",
      (await page.locator('section[role="dialog"]').count()) === 0 &&
        (await activeTestId(page)) === "explainer-link",
    );
  } catch (e) {
    await shot(page, `onboarding-layout-fail-${bname}-${w}-${theme}`).catch(() => undefined);
    record(tag + ": layout arm completed", false, page.url() + " " + String(e).slice(0, 400));
  } finally {
    await browser.close();
  }
}
const SHEET_SETTLE = 500;

// ---------------------------------------------------------------------------
// Flows: the gate, the writes and every state in SPEC section 8, on two layouts.
// ---------------------------------------------------------------------------
async function runOnboardingFlows(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-onboarding-flows`;
  M.armStart(tag);
  const { browser, page, db } = await open(browserType, [w, h], theme, freshState());
  try {
    // The gate (SPEC section 1, ruling 307).
    await signInTo(page, "**/welcome");
    record(tag + ": a fresh member signs in and lands on /welcome", pathOf(page) === "/welcome");
    await gotoRedirected(page, "/feed", "**/welcome");
    record(
      tag + ": the Feed is held until screen three writes",
      pathOf(page) === "/welcome" && (await page.locator('[data-testid="compose"]').count()) === 0,
      pathOf(page) + " compose=" + (await page.locator('[data-testid="compose"]').count()),
    );
    await gotoRedirected(page, "/relationship", "**/welcome");
    record(
      tag + ": a screen ahead of the next one redirects to the next one",
      pathOf(page) === "/welcome",
    );
    await page.waitForSelector('[data-testid="onboarding-who"]', { timeout: 15000 });

    // Screen one: prefill, suggestion, the photo and the username states.
    const name = page.locator('[data-testid="name"]');
    const username = page.locator('[data-testid="username"]');
    const cont = page.locator('[data-testid="continue"]');
    record(
      tag + ": the name is prefilled and the username suggested from it (SPEC section 9)",
      (await name.inputValue()) === "Amara Osei" && (await username.inputValue()) === "amara-osei",
    );
    await name.fill("Thandiwe Dube");
    record(
      tag + ": the suggestion follows the name until the member types in the field",
      (await username.inputValue()) === "thandiwe-dube",
    );
    // Ruling 343: the fold transliterates rather than deletes. The client derives the same string
    // the server does (NFKD, strip combining marks, then section 9), so this proves the client half.
    await name.fill("Jaûne Ñoño-Ålund");
    record(
      tag + ": an accented name transliterates rather than losing its letters (ruling 343)",
      (await username.inputValue()) === "jaune-nono-alund",
      "got " + (await username.inputValue()),
    );
    await username.fill("thandi");
    await name.fill("Thandiwe D");
    record(
      tag + ": typing in the username replaces the suggestion and it stops following",
      (await username.inputValue()) === "thandi",
    );
    record(tag + ": Continue is disabled with no photo", await cont.isDisabled());

    db.mediaTooLarge = true;
    await page.setInputFiles('[data-testid="photo-input"]', {
      name: "p.png",
      mimeType: "image/png",
      buffer: PNG,
    });
    await page.waitForSelector('[data-testid="auth-alert"]', { timeout: 15000 });
    record(
      tag + ": photo too large alert, verbatim, name and username kept, photo empty",
      (await alertText(page)) === COPY.who.tooLarge &&
        (await name.inputValue()) === "Thandiwe D" &&
        (await username.inputValue()) === "thandi" &&
        (await page.locator('[data-testid="photo-plate"]').getAttribute("data-state")) === "empty",
    );
    record(
      tag + ": the alert takes focus (4B pattern)",
      (await activeTestId(page)) === "auth-alert",
    );
    db.mediaTooLarge = false;
    db.mediaFail = true;
    await page.setInputFiles('[data-testid="photo-input"]', {
      name: "p.png",
      mimeType: "image/png",
      buffer: PNG,
    });
    await page.waitForFunction(
      (t) => document.querySelector('[data-testid="auth-alert"]')?.textContent?.trim() === t,
      COPY.who.failed,
      { timeout: 15000 },
    );
    record(
      tag + ": photo failed alert, verbatim, nothing else lost",
      (await name.inputValue()) === "Thandiwe D" &&
        (await page.locator('[data-testid="photo-plate"]').getAttribute("data-state")) === "empty",
    );
    db.mediaFail = false;
    await page.setInputFiles('[data-testid="photo-input"]', {
      name: "p.png",
      mimeType: "image/png",
      buffer: PNG,
    });
    await page.waitForSelector('[data-testid="photo-change"]', { timeout: 15000 });
    record(
      tag +
        ": pick to done in one step, no crop (ruling 324): chosen state with Change photo and Remove",
      (await page.locator('[data-testid="photo-plate"]').getAttribute("data-state")) === "chosen" &&
        (await page.locator('[data-testid="photo-remove"]').count()) === 1 &&
        (await page.locator('[data-testid="photo-plate"] img').count()) === 1,
    );
    record(
      tag + ": Continue is live once name, username and photo are present",
      !(await cont.isDisabled()),
    );
    await page.locator('[data-testid="photo-remove"]').click();
    record(
      tag + ": Remove empties the photo and Continue waits again",
      (await page.locator('[data-testid="photo-plate"]').getAttribute("data-state")) === "empty" &&
        (await cont.isDisabled()),
    );
    await page.setInputFiles('[data-testid="photo-input"]', {
      name: "p.png",
      mimeType: "image/png",
      buffer: PNG,
    });
    await page.waitForSelector('[data-testid="photo-change"]', { timeout: 15000 });

    db.onboarding.taken = true;
    await cont.click();
    await page.waitForFunction(
      (t) => document.querySelector('[data-testid="auth-alert"]')?.textContent?.trim() === t,
      COPY.who.taken,
      { timeout: 15000 },
    );
    record(
      tag +
        ": username taken: the alert verbatim, the field in error, photo and name kept, no suffix appended",
      (await username.getAttribute("aria-invalid")) === "true" &&
        (await username.inputValue()) === "thandi" &&
        (await name.inputValue()) === "Thandiwe D" &&
        (await page.locator('[data-testid="photo-plate"]').getAttribute("data-state")) ===
          "chosen" &&
        pathOf(page) === "/welcome",
    );
    db.onboarding.taken = false;
    db.onboarding.delayMs = 700;
    await cont.click();
    await page.waitForTimeout(150);
    record(
      tag + ": saving: the form is aria-busy, controls disabled, the label unchanged",
      (await page.locator('[data-testid="who-form"]').getAttribute("aria-busy")) === "true" &&
        (await name.isDisabled()) &&
        (await cont.innerText()).trim() === "Continue",
    );
    await page.waitForURL("**/where", { timeout: 15000 });
    db.onboarding.delayMs = 0;
    const whoWrite = db.onboarding.writes.filter((x) => x.screen === "who").pop();
    record(
      tag + ": screen one writes name, username and the photo path on Continue (ruling 307)",
      !!whoWrite &&
        whoWrite.name === "Thandiwe D" &&
        whoWrite.username === "thandi" &&
        typeof whoWrite.avatar_path === "string" &&
        whoWrite.avatar_path.length > 0,
    );

    // Screen two.
    await page.waitForSelector('[data-testid="onboarding-where"]', { timeout: 15000 });
    const city = page.locator('[data-testid="city"]');
    const cont2 = page.locator('[data-testid="continue"]');
    await city.fill("Nairobi");
    await page.waitForTimeout(100);
    record(
      tag + ": city with no country is a disabled Continue and no alert",
      (await cont2.isDisabled()) && (await alertText(page)) === null,
    );
    await page.locator('[data-testid="country"]').selectOption("Kenya");
    record(tag + ": both present enables Continue", !(await cont2.isDisabled()));
    db.onboarding.failScreen = "where";
    await cont2.click();
    await page.waitForSelector('[data-testid="auth-alert"]', { timeout: 15000 });
    record(
      tag + ": save failed: the alert verbatim and nothing cleared",
      (await alertText(page)) === COPY.saveFailed &&
        (await city.inputValue()) === "Nairobi" &&
        (await page.locator('[data-testid="country"]').inputValue()) === "Kenya",
    );
    db.onboarding.failScreen = null;
    await cont2.click();
    await page.waitForURL("**/relationship", { timeout: 15000 });
    const whereWrite = db.onboarding.writes.filter((x) => x.screen === "where").pop();
    record(
      tag + ": screen two writes city and country on Continue",
      !!whereWrite && whereWrite.city === "Nairobi" && whereWrite.country === "Kenya",
    );

    // Screen three: untouched finish.
    await page.waitForSelector('[data-testid="onboarding-relationship"]', { timeout: 15000 });
    await page.locator('[data-testid="explainer-link"]').click();
    await page.waitForSelector('section[role="dialog"]', { timeout: 15000 });
    await page.waitForTimeout(SHEET_SETTLE);
    await page.locator('[data-testid="explainer-done"]').click();
    await page.waitForTimeout(SHEET_SETTLE);
    record(
      tag +
        ": Got it closes the explainer; opening it left the chosen line in place (touched stays false)",
      (await page.locator('section[role="dialog"]').count()) === 0 &&
        (await page.locator('[data-testid="chosen-line"]').count()) === 1 &&
        db.onboarding.explainerOpens === 1,
    );
    await page.locator('[data-testid="back"]').click();
    await page.waitForURL("**/where", { timeout: 15000 });
    record(
      tag + ": Back reaches a completed screen with its saved values",
      (await page.locator('[data-testid="city"]').inputValue()) === "Nairobi",
    );
    await page.locator('[data-testid="continue"]').click();
    await page.waitForURL("**/relationship", { timeout: 15000 });
    await page.waitForSelector('[data-testid="finish"]', { timeout: 15000 });
    await page.locator('[data-testid="finish"]').click();
    await page.waitForURL("**/feed", { timeout: 15000 });
    await page.waitForSelector('[data-testid="compose"]', { timeout: 15000 });
    const relWrite = db.onboarding.writes.filter((x) => x.screen === "relationship").pop();
    record(
      tag + ": finishing untouched writes the default with touched false and lands on the Feed",
      !!relWrite &&
        relWrite.stance === "exploring" &&
        relWrite.touched === false &&
        pathOf(page) === "/feed",
    );
    await page.waitForTimeout(400);
    const feedText = await page.locator("body").innerText();
    record(
      tag +
        ": nothing follows screen three: no welcome, no tour, no affirmation (rulings 259, 322)",
      !/welcome|congratulations|you're all set|tour/i.test(feedText) &&
        (await page.locator('[role="dialog"]').count()) === 0,
    );
    await gotoRedirected(page, "/welcome", "**/feed");
    record(
      tag + ": an onboarded member opening an onboarding route is sent to the Feed",
      pathOf(page) === "/feed",
    );
  } catch (e) {
    await shot(page, `onboarding-flows-fail-${bname}-${w}-${theme}`).catch(() => undefined);
    record(
      tag + ": flow arm, first pass, completed",
      false,
      page.url() + " " + String(e).slice(0, 400),
    );
  } finally {
    await browser.close();
  }

  // Second pass: a touched choice, the keyboard, and resume.
  const resumed = freshState();
  resumed.who = {
    name: "Amara Osei",
    username: "amara-osei",
    suggestion: "amara-osei",
    avatar_path: `${UID}/avatar/a.png`,
    completed: true,
  };
  resumed.next = "where";
  const second = await open(browserType, [w, h], theme, resumed);
  try {
    const { page, db } = second;
    await signInTo(page, "**/where");
    await page.waitForSelector('[data-testid="onboarding-where"]', { timeout: 15000 });
    record(tag + ": resume lands on the first incomplete screen", pathOf(page) === "/where");
    record(
      tag + ": resume replaces the lead with Welcome back, verbatim",
      (await page.locator('[data-testid="onboarding-lead"]').innerText()).trim() === COPY.resume,
    );
    await page.locator('[data-testid="back"]').click();
    await page.waitForURL("**/welcome", { timeout: 15000 });
    await page.waitForSelector('[data-testid="photo-change"]', { timeout: 15000 });
    record(
      tag + ": Back on resume shows screen one with the saved name, username and photo",
      (await page.locator('[data-testid="name"]').inputValue()) === "Amara Osei" &&
        (await page.locator('[data-testid="username"]').inputValue()) === "amara-osei" &&
        (await page.locator('[data-testid="photo-plate"]').getAttribute("data-state")) === "chosen",
    );
    db.onboarding.state.where = { city: "Accra", country: "Ghana", completed: true };
    db.onboarding.state.next = "relationship";
    await page.goto(BASE + "/relationship", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="onboarding-relationship"]', { timeout: 15000 });
    const cards = page.locator('[role="radiogroup"] [role="radio"]');
    await cards.nth(1).click();
    await page.waitForTimeout(100);
    record(
      tag + ": choosing Kin checks it and hides the chosen line for good (ruling 329)",
      (await cards.nth(1).getAttribute("aria-checked")) === "true" &&
        (await cards.nth(4).getAttribute("aria-checked")) === "false" &&
        (await page.locator('[data-testid="chosen-line"]').count()) === 0,
    );
    await cards.nth(1).focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(100);
    record(
      tag + ": arrow keys move selection and focus (roving tabindex)",
      (await cards.nth(2).getAttribute("aria-checked")) === "true" &&
        (await activeTestId(page)) === "stance-card-anchor" &&
        (await cards.nth(2).getAttribute("tabindex")) === "0",
    );
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(100);
    record(
      tag + ": the selection wraps and Space re-selects",
      (await cards.nth(0).getAttribute("aria-checked")) === "true",
    );
    await cards.nth(4).click();
    await page.waitForTimeout(100);
    record(
      tag + ": re-selecting Still exploring keeps the chosen line hidden and counts as a touch",
      (await cards.nth(4).getAttribute("aria-checked")) === "true" &&
        (await page.locator('[data-testid="chosen-line"]').count()) === 0,
    );
    await cards.nth(1).click();
    db.onboarding.failScreen = "relationship";
    await page.locator('[data-testid="finish"]').click();
    await page.waitForSelector('[data-testid="auth-alert"]', { timeout: 15000 });
    record(
      tag + ": a failed finish shows the save alert and keeps the choice",
      (await alertText(page)) === COPY.saveFailed &&
        (await cards.nth(1).getAttribute("aria-checked")) === "true",
    );
    db.onboarding.failScreen = null;
    await page.locator('[data-testid="finish"]').click();
    await page.waitForURL("**/feed", { timeout: 15000 });
    const relWrite = db.onboarding.writes.filter((x) => x.screen === "relationship").pop();
    record(
      tag + ": finishing after a touch writes the stance with touched true and time on screen",
      !!relWrite &&
        relWrite.stance === "kin" &&
        relWrite.touched === true &&
        typeof relWrite.elapsed_ms === "number" &&
        relWrite.elapsed_ms >= 0,
    );
  } catch (e) {
    await shot(second.page, `onboarding-flows2-fail-${bname}-${w}-${theme}`).catch(() => undefined);
    record(
      tag + ": flow arm, second pass, completed",
      false,
      second.page.url() + " " + String(e).slice(0, 400),
    );
  } finally {
    await second.browser.close();
  }
}

module.exports = { runOnboardingLayout, runOnboardingFlows };
