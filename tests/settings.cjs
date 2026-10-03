// Handoff 45-D (Brief 12, admin Settings): the page arms on the admin preview, ADMIN_BASE. The admin
// app's real code paths run against a backend tests/overview.cjs controls at the network layer, as
// the Overview's arms do: the session is the shared mock's at aal2, and the Settings reads and
// writes answer from a per-page state, so a save that fails, a role that reads only, and a company
// zone or reading zone the arm chose can each be set. What the database itself refuses is
// tests/live-db.cjs's arms 1 to 4; the founder's real aal2 path is the device check (61) and Chat's
// Done Means reading, never this arm. Each arm reports unproven without the host (228).
//
//   admin settings     arm 5, at 390 dark (touch, admin), 820 light (touch, analyst), 1280 light
//                      (pointer, admin) and 1280 dark (pointer, analyst): Settings is the last row of
//                      the navigation and opens from it; Personal and Organization render as drawn;
//                      the read log names Settings, Your read log; the sessions table carries no
//                      aria-sort and marks this device; a failed save reverts and Retry keeps it;
//                      the analyst reads Organization with every control disabled; the admin's
//                      company-zone sheet opens on the current zone with Confirm disabled (1415),
//                      and a change appears at the top of the history with its before and after.
//   admin zone         arm 6, at 1280 light on a device in Los Angeles: with the company zone
//                      Africa/Accra and no reading zone every projection and DIA are read in
//                      Accra and the week starts on Accra's Monday; with a reading zone of
//                      Africa/Nairobi the days stay, the clock moves to EAT, and the window line
//                      carries the extraction's sentence (1411).
//   admin dia off      arm 7, at 390 light: with DIA's note off for the company the Overview renders
//                      no note block and makes no call to admin-dia-note.
//   admin appearance   arm 8, at 390 and 1280 on a light device with the account set to Dark: after
//                      the first load the copy is kept, and on the next load the attribute is dark
//                      before <body> is parsed, so the first paint is dark (1393).
//
// Usage: ADMIN_BASE=https://<id>.dna-admin-1oz.pages.dev SPECIAL=admin node tests/matrix.cjs
const M = require("./matrix.cjs");
const { openOverview, text } = require("./overview.cjs");

const { launch, record, noOverflow, hydrated } = M;
const ADMIN_BASE = (process.env.ADMIN_BASE || "").replace(/\/$/, "");

async function context(browserType, [w, h], theme, timezoneId = "UTC") {
  const browser = await launch(browserType);
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: w <= 1024,
    isMobile: w < 1024,
    deviceScaleFactor: 1,
    colorScheme: theme,
    timezoneId,
  });
  const page = await ctx.newPage();
  return { browser, page };
}

/** Settings from the navigation: the left list above 1024, the drawer below it. */
async function openSettings(page, w) {
  if (w <= 1024) {
    await page.click('button[aria-label="Open navigation"]');
    await page.waitForSelector("dialog[open]", { timeout: 10000 });
    await page.locator("dialog[open] button", { hasText: "Settings" }).first().click();
  } else {
    await page.locator("[data-console-shell] button", { hasText: "Settings" }).first().click();
  }
  await page.waitForSelector('[data-testid="admin-settings"]', { timeout: 20000 });
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="settings-loading"]'),
    null,
    { timeout: 20000 },
  );
}

const settled = (page, testid, phase) =>
  page
    .waitForFunction(
      ([t, ph]) => {
        const el = document.querySelector(`[data-testid="${t}"]`);
        return !!el && el.getAttribute("data-phase") === ph;
      },
      [testid, phase],
      { timeout: 10000 },
    )
    .then(() => true)
    .catch(() => false);

/** Arm 5: the Settings page at one width, theme and role. */
async function runAdminSettings(browserType, bname, [w, h], theme, role) {
  const tag = `${bname}-${w}x${h}-${theme}-admin settings ${role}`;
  M.armStart(tag);
  if (!ADMIN_BASE) {
    M.unproven(tag, "ADMIN_BASE is not set, so there is no admin deployment to read");
    return;
  }
  const admin = role === "admin";
  const { browser, page } = await context(browserType, [w, h], theme);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const state = {
    calls: [],
    dia: [],
    fail: null,
    diaEmpty: true,
    roles: admin ? ["admin"] : ["analyst"],
    org: { reporting_zone: "America/Los_Angeles" },
  };
  try {
    await openOverview(page, state);
    if (w <= 1024) {
      await page.click('button[aria-label="Open navigation"]');
      await page.waitForSelector("dialog[open]", { timeout: 10000 });
    }
    const navRows = await page
      .locator((w <= 1024 ? "dialog[open]" : "[data-console-shell]") + " li > button")
      .allInnerTexts();
    const last = (navRows[navRows.length - 1] || "").split("\n")[0].trim();
    record(
      `${tag} | Settings is the last navigation row and always available (1410)`,
      last === "Settings" && !/Not yet/i.test(navRows[navRows.length - 1] || ""),
      `${navRows.length} rows, last ${last}`,
    );
    if (w <= 1024) {
      await page.keyboard.press("Escape");
      await page
        .waitForFunction(() => !document.querySelector("dialog[open]"), null, { timeout: 5000 })
        .catch(() => undefined);
    }
    await openSettings(page, w);
    record(
      `${tag} | Settings opens from the navigation`,
      (await text(page, "h1")) === "Settings" &&
        new URL(page.url()).pathname.replace(/\/$/, "") === "/settings",
      page.url(),
    );
    const tabs = await page.locator('[role="tab"]').allInnerTexts();
    record(
      `${tag} | Tabs read Personal and Organization, Personal chosen`,
      tabs.join(",") === "Personal,Organization" &&
        (await page.getAttribute('[role="tab"]:has-text("Personal")', "aria-selected")) === "true",
      tabs.join(","),
    );

    // Personal.
    const personal = await text(page, '[data-testid="settings-personal"]');
    record(
      `${tag} | Personal carries its line and every card as drawn`,
      personal.startsWith(
        "Only you change these. They are kept on your account and hold on every device.",
      ) &&
        personal.includes("Appearance") &&
        personal.includes("Reading time zone") &&
        personal.includes("The Overview opens to") &&
        personal.includes("Sign-in security") &&
        personal.includes("Your read log"),
    );
    const appearanceOpts = await page
      .locator('[role="radiogroup"][aria-label="Appearance"] [role="radio"]')
      .allInnerTexts();
    const grainOpts = await page
      .locator('[role="radiogroup"][aria-label="Default time grain"] [role="radio"]')
      .allInnerTexts();
    record(
      `${tag} | Appearance and the grains are the vocabularies' (1392)`,
      appearanceOpts.join(",") === "System,Light,Dark" &&
        grainOpts.join(",") === "Now,Hour,Day,Week,Month,Quarter,Year",
      appearanceOpts.join(",") + " | " + grainOpts.join(","),
    );
    record(
      `${tag} | the zone line names the company zone in full`,
      /You read in the company reporting zone, Pacific time, Los Angeles, P[DS]T\. You may choose your own zone instead\./.test(
        personal,
      ),
      personal.slice(0, 400),
    );
    record(
      `${tag} | two-factor is required text, not a switch`,
      personal.includes("Required for every staff account. It cannot be turned off.") &&
        (await page.locator('[data-testid="settings-security"] [role="switch"]').count()) === 0,
    );
    const sessions = await text(page, '[data-testid="settings-sessions"]');
    record(
      `${tag} | sessions mark this device, Active now, and carry no aria-sort`,
      sessions.includes("Chrome on macOS, this device") &&
        sessions.includes("Active now") &&
        sessions.includes("Safari on iPhone") &&
        (await page.locator('[data-testid="settings-sessions"] th[aria-sort]').count()) === 0,
      sessions.slice(0, 200),
    );
    const log = await text(page, '[data-testid="settings-read-log"]');
    record(
      `${tag} | the read log reads Settings, Your read log under Today, newest first`,
      /TODAY, \w{3} \d{1,2} \w{3}/i.test(log) &&
        log.indexOf("Settings, Your read log") > -1 &&
        log.indexOf("Settings, Your read log") < log.indexOf("Overview, The levers") &&
        log.includes("Every entry is a page or a block. Times in Los Angeles, P"),
      log.slice(0, 240),
    );

    // A failed personal save reverts and says so; Retry keeps it (§2c).
    state.failNext = "admin_staff_settings_save";
    await page.click(
      '[role="radiogroup"][aria-label="Default time grain"] [role="radio"]:has-text("Month")',
    );
    const failedShown = await settled(page, "status-opens", "failed");
    const statusFailed = await text(page, '[data-testid="status-opens"]');
    const reverted = await page.getAttribute(
      '[role="radiogroup"][aria-label="Default time grain"] [role="radio"]:has-text("Week")',
      "aria-checked",
    );
    record(
      `${tag} | a failed save reverts to Week and says the Overview still opens to Week`,
      failedShown &&
        statusFailed.includes("Not saved. The Overview still opens to Week.") &&
        reverted === "true",
      statusFailed,
    );
    await page.click('[data-testid="status-opens"] button:has-text("Retry")');
    const savedShown = await settled(page, "status-opens", "saved");
    record(
      `${tag} | Retry saves it, Saved shows, and Month is chosen`,
      savedShown &&
        (await page.getAttribute(
          '[role="radiogroup"][aria-label="Default time grain"] [role="radio"]:has-text("Month")',
          "aria-checked",
        )) === "true" &&
        (state.writes || []).some((x) => x.patch && x.patch.default_grain === "month"),
    );
    await noOverflow(page, `${tag} | Personal`);

    // Organization.
    await page.click('[role="tab"]:has-text("Organization")');
    await page.waitForSelector('[data-testid="settings-org"]', { timeout: 10000 });
    await page
      .waitForSelector('[data-testid="settings-history"] table, [data-testid="history-empty"]', {
        timeout: 10000,
      })
      .catch(() => undefined);
    const org = await text(page, '[data-testid="settings-org"]');
    const changeBtn = page.locator('button:has-text("Change the company zone")');
    const sw = page.locator('[data-testid="settings-dia"] [role="switch"]');
    record(
      `${tag} | Organization reads ${admin ? "for an admin" : "only, for an analyst"} (1412)`,
      admin
        ? org.startsWith(
            "Shared by every staff member. Each change is recorded in the history below.",
          ) &&
            (await changeBtn.isEnabled()) &&
            (await sw.isEnabled())
        : org.startsWith("An admin changes these. You can read them.") &&
            !(await changeBtn.isEnabled()) &&
            !(await sw.isEnabled()),
      org.slice(0, 120),
    );
    record(
      `${tag} | the company zone shows as text for every role, with the fixed policies`,
      /Pacific time, Los Angeles, P[DS]T/.test(await text(page, '[data-testid="company-zone"]')) &&
        org.includes("Two-factor sign-in is required") &&
        org.includes("Every read of the admin is logged"),
    );
    record(
      `${tag} | the history table carries no aria-sort`,
      (await page.locator('[data-testid="settings-history"] th[aria-sort]').count()) === 0 &&
        (await page.locator('[data-testid="settings-history"] table').count()) === 1,
    );
    if (admin) {
      await changeBtn.click();
      await page.waitForSelector('[data-testid="sheet-zone"]', { timeout: 10000 });
      await page.waitForTimeout(400);
      const confirm = page.locator('[role="dialog"] button:has-text("Change the zone")');
      const sheet1 = await text(page, '[data-testid="sheet-zone"]');
      record(
        `${tag} | the zone sheet opens on the current zone with Confirm disabled (1415)`,
        (await confirm.count()) === 1 &&
          !(await confirm.isEnabled()) &&
          sheet1.includes("This is the company zone now. Choose another zone to change it.") &&
          (await page.inputValue('[data-testid="sheet-zone-select"]')) === "America/Los_Angeles",
        sheet1.slice(0, 200),
      );
      await page.selectOption('[data-testid="sheet-zone-select"]', "Africa/Lagos");
      const go = page.locator('[role="dialog"] button:has-text("Change to Lagos, WAT")');
      const sheet2 = await text(page, '[data-testid="sheet-zone"]');
      record(
        `${tag} | choosing Lagos says who it affects and enables Change to Lagos, WAT`,
        (await go.count()) === 1 &&
          (await go.isEnabled()) &&
          sheet2.includes(
            "Every staff member's Overview will move to Lagos, WAT days and weeks, starting from the next refresh.",
          ) &&
          (await page.locator('[role="dialog"] button:has-text("Keep Pacific time")').count()) ===
            1,
        sheet2.slice(0, 220),
      );
      await go.click();
      const saved = await settled(page, "status-company", "saved");
      const top = await page
        .locator('[data-testid="settings-history"] tbody tr')
        .first()
        .innerText()
        .catch(() => "");
      record(
        `${tag} | the change saves and heads the history with its before and after`,
        saved &&
          /West Africa time, Lagos, WAT/.test(await text(page, '[data-testid="company-zone"]')) &&
          /Company reporting zone/.test(top) &&
          /Pacific time, Los Angeles, P[DS]T/.test(top) &&
          /West Africa time, Lagos, WAT/.test(top) &&
          /Jaûne Odombrown/.test(top),
        top.replace(/\s+/g, " "),
      );
    } else {
      await changeBtn.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(400);
      record(
        `${tag} | the disabled Change opens no sheet for an analyst`,
        (await page.locator('[data-testid="sheet-zone"]').count()) === 0,
      );
      await sw.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(300);
      record(
        `${tag} | the disabled switch writes nothing for an analyst`,
        !(state.writes || []).some((x) => x.fn === "admin_org_settings_save"),
      );
      record(`${tag} | and DIA's note still reads on`, await sw.isChecked());
    }
    await noOverflow(page, `${tag} | Organization`);
    record(`${tag} | no page errors`, errors.length === 0, errors.join(" | ").slice(0, 200));
  } catch (e) {
    record(`${tag} flow`, false, String(e).slice(0, 200));
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/** Arm 6: the Overview reads the company zone, and a reading zone moves only the clock (1394, 1411). */
async function runAdminOverviewZone(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-admin zone`;
  M.armStart(tag);
  if (!ADMIN_BASE) {
    M.unproven(tag, "ADMIN_BASE is not set, so there is no admin deployment to read");
    return;
  }
  // The device sits in Los Angeles, so nothing the page writes can come from the device's zone.
  for (const reading of [null, "Africa/Nairobi"]) {
    const { browser, page } = await context(browserType, [w, h], theme, "America/Los_Angeles");
    const state = {
      calls: [],
      dia: [],
      fail: null,
      diaEmpty: true,
      org: { reporting_zone: "Africa/Accra" },
      staff: { reading_zone: reading },
    };
    const label = reading ? "with a reading zone of Nairobi" : "with no reading zone";
    try {
      await openOverview(page, state);
      await page.waitForFunction(
        () => !document.querySelector('[data-testid="admin-overview"] [aria-busy="true"]'),
        null,
        { timeout: 20000 },
      );
      const win = await text(page, '[data-testid="overview-window"]');
      const periodCalls = state.calls.filter((c) => c.p_tz !== undefined);
      // Accra's Monday this week, written as the page writes it.
      const now = new Date();
      const accra = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Accra" }));
      const monday = new Date(accra);
      monday.setDate(accra.getDate() - ((accra.getDay() + 6) % 7));
      const mondayWords =
        "Mon " + monday.getDate() + " " + monday.toLocaleString("en-GB", { month: "short" });
      record(
        `${tag} | ${label}: every projection and DIA are read in Africa/Accra`,
        periodCalls.length >= 4 &&
          periodCalls.every((c) => c.p_tz === "Africa/Accra") &&
          state.dia.every((d) => d.tz === "Africa/Accra"),
        periodCalls.map((c) => c.p_tz).join(","),
      );
      record(
        `${tag} | ${label}: the week starts on Accra's Monday`,
        win.startsWith("This week so far, " + mondayWords.replace("Sept", "Sep")),
        win.slice(0, 120),
      );
      if (!reading)
        record(
          `${tag} | ${label}: the clock is GMT and no own-zone sentence shows`,
          /Last refreshed .+, \d\d:\d\d GMT\./.test(win) &&
            (await page.locator('[data-testid="overview-own-zone"]').count()) === 0,
          win.slice(-160),
        );
      else
        record(
          `${tag} | ${label}: the clock moves to EAT and the window line says so (1411)`,
          /Last refreshed .+, \d\d:\d\d EAT\./.test(win) &&
            win.includes(
              "Times are in your own zone, Nairobi, EAT. Days and weeks follow the company reporting zone, Accra, GMT.",
            ),
          win.slice(-220),
        );
    } catch (e) {
      record(`${tag} ${label} flow`, false, String(e).slice(0, 200));
    } finally {
      await browser.close().catch(() => undefined);
    }
  }
}

/** Arm 7: DIA's note off for the company. */
async function runAdminDiaOff(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-admin dia off`;
  M.armStart(tag);
  if (!ADMIN_BASE) {
    M.unproven(tag, "ADMIN_BASE is not set, so there is no admin deployment to read");
    return;
  }
  const { browser, page } = await context(browserType, [w, h], theme);
  const state = { calls: [], dia: [], fail: null, org: { dia_note: false } };
  try {
    await openOverview(page, state);
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="admin-overview"] [aria-busy="true"]'),
      null,
      { timeout: 20000 },
    );
    await page.waitForTimeout(1500);
    record(
      `${tag} | the Overview renders every block but the note`,
      (await page.locator('[data-testid="overview-levers"]').count()) === 1 &&
        (await page.locator('[data-testid="overview-dia"]').count()) === 0,
    );
    record(
      `${tag} | and makes no call to admin-dia-note`,
      state.dia.length === 0,
      String(state.dia.length),
    );
  } catch (e) {
    record(`${tag} flow`, false, String(e).slice(0, 200));
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/** Arm 8: the account's Dark on a light device paints dark from the second load on (1393). */
async function runAdminAppearance(browserType, bname, [w, h]) {
  const tag = `${bname}-${w}x${h}-light-admin appearance`;
  M.armStart(tag);
  if (!ADMIN_BASE) {
    M.unproven(tag, "ADMIN_BASE is not set, so there is no admin deployment to read");
    return;
  }
  const { browser, page } = await context(browserType, [w, h], "light");
  const state = { calls: [], dia: [], fail: null, diaEmpty: true, staff: { appearance: "dark" } };
  try {
    await page.addInitScript(() => {
      window.__themeAtBody = "unseen";
      new MutationObserver((list, obs) => {
        for (const m of list)
          for (const n of m.addedNodes)
            if (n.nodeName === "BODY") {
              window.__themeAtBody = document.documentElement.getAttribute("data-theme");
              obs.disconnect();
              return;
            }
      }).observe(document, { childList: true, subtree: true });
    });
    await openOverview(page, state);
    await page
      .waitForFunction(() => document.documentElement.getAttribute("data-theme") === "dark", null, {
        timeout: 10000,
      })
      .catch(() => undefined);
    const first = await page.evaluate(() => ({
      theme: document.documentElement.getAttribute("data-theme"),
      copy: localStorage.getItem("dna.admin.appearance"),
    }));
    record(
      `${tag} | after the first load the account's Dark applies and is kept on this device`,
      first.theme === "dark" && first.copy === "dark",
      JSON.stringify(first),
    );
    await page.reload({ waitUntil: "networkidle" });
    await hydrated(page);
    const atBody = await page.evaluate(() => window.__themeAtBody);
    record(
      `${tag} | on the next load data-theme is dark before <body> is parsed, so the first paint is dark`,
      atBody === "dark",
      String(atBody),
    );
    // System again: the device decides, at once.
    await page.waitForSelector('[data-testid="admin-shell"]', { timeout: 20000 });
    if (w <= 1024) {
      await page.click('button[aria-label="Open navigation"]');
      await page.waitForSelector("dialog[open]", { timeout: 10000 });
      await page.locator("dialog[open] button", { hasText: "Settings" }).first().click();
    } else
      await page.locator("[data-console-shell] button", { hasText: "Settings" }).first().click();
    await page.waitForSelector('[data-testid="settings-appearance"]', { timeout: 20000 });
    await page.click(
      '[role="radiogroup"][aria-label="Appearance"] [role="radio"]:has-text("System")',
    );
    await page
      .waitForFunction(
        () => document.documentElement.getAttribute("data-theme") === "light",
        null,
        {
          timeout: 5000,
        },
      )
      .catch(() => undefined);
    const system = await page.evaluate(() => ({
      theme: document.documentElement.getAttribute("data-theme"),
      copy: localStorage.getItem("dna.admin.appearance"),
    }));
    record(
      `${tag} | choosing System follows the light device at once and keeps no copy`,
      system.theme === "light" && system.copy === null,
      JSON.stringify(system),
    );
  } catch (e) {
    record(`${tag} flow`, false, String(e).slice(0, 200));
  } finally {
    await browser.close().catch(() => undefined);
  }
}

module.exports = { runAdminSettings, runAdminOverviewZone, runAdminDiaOff, runAdminAppearance };
