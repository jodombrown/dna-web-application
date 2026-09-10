// Brief 4A, the block control, and ruling 198's blocked-party view (B4A-SPEC.md sections 4, 5, 7,
// 8, 9 and 11). The row policy itself is verified in SQL against the live project with a real block
// in place; this is the surface half.
//
// Four arms:
//   runBlock    B4A section 7's enumeration: what the blocked party's page renders and does not,
//               and that nothing on it names a block, a restriction or a reason.
//   runBlocker  B4A section 7's Done Means 5: the blocker's own view of the member they blocked.
//   runBlockFlow  the control end to end on a stranger: menu, both sheets verbatim, block, unblock,
//               and ruling 211's "unblocking restores nothing".
//   runBlockFocus  B4A section 11 and ruling 222, verified on the built page rather than assumed
//               from Strand's Sheet, which does not manage focus today.
//
// Usage: BASE=https://<preview>.dna-web-application.pages.dev SPECIAL=block node tests/matrix.cjs
const M = require("./matrix.cjs");

const { launch, makeMockDb, seedPosts, mockSupabase, signIn, record, noOverflow, shot, BASE } = M;
const HANDLE = "thandiwe-dube";
/** Strings only a connection or an Anchored viewer may see on the seeded persona. */
const CONNECTIONS_ONLY = ["dubepower.co.za", "thandiwedube", "dube.power"];
const ANCHORED_ONLY = ["Clinics that need a site survey", "Find collaborators"];
/** Attesters who do not share their own profile: a role, never a name (ruling 141). */
const UNSHARED_THIRD_PARTIES = ["Kwame Mensah", "Adaeze Nwosu"];
/** B4A section 9, verbatim. Order is ruling 180's: heading, consequences, note, then actions. */
const BLOCK_SHEET = {
  heading: "Block Thandiwe Dube",
  consequences: [
    "Thandiwe will not find you or reach you on DNA.",
    "Thandiwe will see only what a signed-out visitor sees of your profile.",
    "Your connection and any follow between you end.",
  ],
  note: "Thandiwe is not told. You can undo this from Thandiwe’s profile.",
  confirm: "Block Thandiwe",
};
const UNBLOCK_SHEET = {
  heading: "Unblock Thandiwe Dube",
  consequences: [
    "Thandiwe can find you and reach you on DNA again, and sees your profile as any member does.",
    "Your connection and follow do not come back. They must be re-made.",
  ],
  note: "Thandiwe is not told.",
  confirm: "Unblock Thandiwe",
};
const RAIL_EMPTY = "Nothing in common yet. Connections and Spaces you share appear here.";

async function open(browserType, [w, h], theme, profile) {
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
  Object.assign(db.profile, profile);
  await page.addInitScript(
    ({ theme }) => {
      try {
        localStorage.setItem("dna.theme", theme);
      } catch {}
    },
    { theme },
  );
  await mockSupabase(page, db);
  await signIn(page);
  await page.goto(BASE + "/m/" + HANDLE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="profile"]', { timeout: 15000 });
  await page.waitForTimeout(600);
  return { browser, page, db };
}

/** Click at the top of the column, where the action row is, clear of the sticky masthead. */
async function press(page, selector) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: "visible", timeout: 15000 });
  await loc.click({ timeout: 15000 });
  await page.waitForTimeout(350);
}

const dialogText = (page) => page.locator('section[role="dialog"]').innerText();
const activeTestId = (page) =>
  page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? null);
const activeTag = (page) => page.evaluate(() => document.activeElement?.tagName ?? null);
/** The overflow's one item, read with the menu open, then closed again. */
async function menuItem(page) {
  await press(page, '[data-testid="block-menu-trigger"]');
  const items = page.locator('[data-testid="block-menu"] [role="menuitem"]');
  const n = await items.count();
  const label = n === 1 ? await items.innerText() : "";
  return { n, label };
}

// ---------------------------------------------------------------------------
// B4A section 7: what the blocked party sees on the profile of the member who blocked them.
// ---------------------------------------------------------------------------
async function runBlock(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-blocked`;
  const expanded = w >= 1024;
  const { browser, page } = await open(browserType, [w, h], theme, {
    mode: "blocked",
    rel: "connected",
    switches: { shared: false, private: false },
  });
  try {
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
    // B4A section 4, row 4: the action row holds the overflow and nothing else, and its one item
    // reads Block. The blocked party keeps it because blocking is symmetric in availability: they
    // may block back. It never reads anything that discloses the other party's block.
    record(
      tag + ": the action row holds only the overflow",
      (await page.locator('[data-testid="block-control"]').count()) === 1,
    );
    const item = await menuItem(page);
    record(
      tag + ": the overflow's one item reads Block, not Unblock",
      item.n === 1 && item.label === "Block Thandiwe",
      `${item.n} item(s): ${item.label}`,
    );
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    // Item 2: the lowest audience scope, which is the public projection.
    record(
      tag + ": no connections-scoped or anchored-scoped section",
      !CONNECTIONS_ONLY.some((t) => text.includes(t)) &&
        !ANCHORED_ONLY.some((t) => text.includes(t)),
    );
    record(
      tag + ": no mutual name and no DIA line",
      (await page.locator('[data-testid="mutuals"]').count()) === 0 &&
        (await page.locator('[data-testid="dia-line"]').count()) === 0 &&
        !text.includes("is a connection you share") &&
        !text.includes("which you hosted"),
    );
    record(
      tag + ": third parties render as a role, never a name",
      !UNSHARED_THIRD_PARTIES.some((t) => text.includes(t)) && text.includes("the host"),
    );
    if (expanded) {
      const rail = page.locator('aside[data-scroller="left"]').first();
      const railText = await rail.innerText();
      record(
        tag + ": the rail carries In common at its empty state, verbatim",
        /in common/i.test(railText) && railText.includes(RAIL_EMPTY),
        railText.replace(/\n/g, " | ").slice(0, 160),
      );
    }
    // The block itself is not a thing the surface says.
    record(
      tag + ": the surface says nothing about a block",
      !/block/i.test(await page.locator('[data-testid="profile"]').innerText()),
      JSON.stringify((text.match(/.{0,40}block.{0,40}/i) || [])[0] || ""),
    );
    await shot(page, tag);
    await noOverflow(page, tag + ": blocked profile");
  } catch (e) {
    record(tag + ": flow completed", false, String(e).slice(0, 200));
  }
  await browser.close();
}

// ---------------------------------------------------------------------------
// B4A section 7, Done Means 5: the blocker's own view of the member they blocked. A block does not
// drop the blocker's scope, so ruling 220's anchor still admits Anchored sections, and the mutuals
// line, the rail rows and the DIA line stay. The connection edge is revoked, so Connections
// sections are gone. The action row holds the overflow, reading Unblock.
// ---------------------------------------------------------------------------
async function runBlocker(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-blocker`;
  const expanded = w >= 1024;
  const { browser, page } = await open(browserType, [w, h], theme, {
    mode: "blocker",
    rel: "none",
  });
  try {
    const text = await page.locator('[data-testid="profile"]').innerText();
    record(tag + ": the profile opens", text.includes("Thandiwe Dube"));
    record(
      tag + ": no Connect action and no Follow",
      (await page.locator('[data-testid="connect-with"]').count()) === 0 &&
        (await page.locator('[data-testid="follow"]').count()) === 0 &&
        (await page.locator('[data-testid="relationship"]').count()) === 0,
    );
    const item = await menuItem(page);
    record(
      tag + ": the overflow's one item reads Unblock",
      item.n === 1 && item.label === "Unblock Thandiwe",
      `${item.n} item(s): ${item.label}`,
    );
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    record(
      tag + ": Connections-scoped sections are gone, the edge having been revoked",
      !CONNECTIONS_ONLY.some((t) => text.includes(t)),
      (await page.locator('[data-testid="sections"]').innerText()).slice(0, 120),
    );
    record(
      tag + ": Anchored sections remain (ruling 220)",
      (await page.locator('[data-testid="section-intent"]').count()) === 1,
    );
    record(
      tag + ": the DIA line still renders for the blocker",
      (await page.locator('[data-testid="dia-line"]').count()) === 1,
    );
    if (expanded) {
      const railText = await page.locator('aside[data-scroller="left"]').first().innerText();
      record(
        tag + ": the rail still carries the shared rows",
        railText.includes("Lerato Khumalo") && railText.includes("Diaspora health workers"),
        railText.replace(/\n/g, " | ").slice(0, 160),
      );
    } else {
      record(
        tag + ": the mutuals line still renders for the blocker",
        (await page.locator('[data-testid="mutuals"]').count()) === 1,
      );
    }
    record(
      tag + ": no banner, chip or copy naming a block",
      !/block/i.test(await page.locator('[data-testid="profile"]').innerText()),
    );
    await shot(page, tag);
    await noOverflow(page, tag + ": blocker profile");
  } catch (e) {
    record(tag + ": flow completed", false, String(e).slice(0, 200));
  }
  await browser.close();
}

// ---------------------------------------------------------------------------
// The control end to end: both sheets verbatim, the write, and ruling 211.
// ---------------------------------------------------------------------------
async function runBlockFlow(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-block-flow`;
  const { browser, page, db } = await open(browserType, [w, h], theme, {
    mode: "stranger",
    rel: "none",
  });
  try {
    record(
      tag + ": a stranger gets Connect, Follow and the overflow",
      (await page.locator('[data-testid="connect-with"]').count()) === 1 &&
        (await page.locator('[data-testid="follow"]').count()) === 1 &&
        (await page.locator('[data-testid="block-control"]').count()) === 1,
    );
    // B4A section 4: selecting the item closes the menu and opens the sheet.
    await press(page, '[data-testid="block-menu-trigger"]');
    await press(page, '[data-testid="block-menu-item"]');
    await page.waitForSelector('section[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(400);
    record(
      tag + ": the menu closes when the sheet opens",
      (await page.locator('[data-testid="block-menu"]').count()) === 0,
    );
    let sheet = await dialogText(page);
    record(
      tag + ": the Block sheet is labelled Block Thandiwe",
      (await page.locator('section[role="dialog"]').getAttribute("aria-label")) ===
        "Block Thandiwe",
    );
    record(
      tag + ": Block sheet copy is verbatim and in order (ruling 180)",
      sheet.indexOf(BLOCK_SHEET.heading) === 0 &&
        BLOCK_SHEET.consequences.every(
          (c, i) =>
            sheet.includes(c) &&
            (i === 0 || sheet.indexOf(c) > sheet.indexOf(BLOCK_SHEET.consequences[i - 1])),
        ) &&
        sheet.indexOf(BLOCK_SHEET.note) >
          sheet.indexOf(BLOCK_SHEET.consequences[BLOCK_SHEET.consequences.length - 1]) &&
        sheet.indexOf("Cancel") > sheet.indexOf(BLOCK_SHEET.note) &&
        sheet.lastIndexOf(BLOCK_SHEET.confirm) > sheet.indexOf("Cancel"),
      sheet.replace(/\n/g, " | ").slice(0, 300),
    );
    // B4A sections 5 and 13: no numerals on either sheet, and no count of anything.
    record(tag + ": no numeral anywhere on the Block sheet", !/[0-9]/.test(sheet), sheet);
    await shot(page, tag + "-block-sheet");
    await noOverflow(page, tag + " block sheet");
    // Cancel returns to the profile unchanged.
    await press(page, '[data-testid="block-cancel"]');
    await page.waitForTimeout(500);
    record(
      tag + ": Cancel closes the sheet and changes nothing",
      (await page.locator('section[role="dialog"]').count()) === 0 &&
        db.profile.blocks.length === 0 &&
        (await page.locator('[data-testid="connect-with"]').count()) === 1,
      db.profile.blocks.join(","),
    );
    // Confirm.
    await press(page, '[data-testid="block-menu-trigger"]');
    await press(page, '[data-testid="block-menu-item"]');
    await page.waitForSelector('section[role="dialog"]', { timeout: 10000 });
    await press(page, '[data-testid="block-confirm"]');
    await page.waitForTimeout(900);
    record(
      tag + ": the confirm writes member_blocks and the sheet closes",
      db.profile.blocks[0] === "block" &&
        (await page.locator('section[role="dialog"]').count()) === 0,
      db.profile.blocks.join(","),
    );
    record(
      tag + ": no toast, no banner, no inline confirmation line",
      !/blocked|you have blocked/i.test(await page.locator("body").innerText()),
    );
    record(
      tag + ": the profile re-renders as an own block: overflow only",
      (await page.locator('[data-testid="block-control"]').count()) === 1 &&
        (await page.locator('[data-testid="connect-with"]').count()) === 0 &&
        (await page.locator('[data-testid="follow"]').count()) === 0,
    );
    // Unblock.
    await press(page, '[data-testid="block-menu-trigger"]');
    await press(page, '[data-testid="block-menu-item"]');
    await page.waitForSelector('section[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(400);
    sheet = await dialogText(page);
    record(
      tag + ": Unblock sheet copy is verbatim and in order",
      sheet.indexOf(UNBLOCK_SHEET.heading) === 0 &&
        UNBLOCK_SHEET.consequences.every((c) => sheet.includes(c)) &&
        sheet.indexOf(UNBLOCK_SHEET.consequences[1]) >
          sheet.indexOf(UNBLOCK_SHEET.consequences[0]) &&
        sheet.indexOf(UNBLOCK_SHEET.note) > sheet.indexOf(UNBLOCK_SHEET.consequences[1]) &&
        sheet.indexOf("Cancel") > sheet.indexOf(UNBLOCK_SHEET.note) &&
        sheet.lastIndexOf(UNBLOCK_SHEET.confirm) > sheet.indexOf("Cancel"),
      sheet.replace(/\n/g, " | ").slice(0, 300),
    );
    record(tag + ": no numeral anywhere on the Unblock sheet", !/[0-9]/.test(sheet), sheet);
    await shot(page, tag + "-unblock-sheet");
    await press(page, '[data-testid="block-confirm"]');
    await page.waitForTimeout(900);
    // Ruling 211: unblocking restores nothing. The pair comes back as strangers, not as
    // connections, and the overflow reads Block again.
    record(
      tag + ": unblock writes the delete and restores no edge (ruling 211)",
      db.profile.blocks.join(",") === "block,unblock" &&
        (await page.locator('[data-testid="connect-with"]').count()) === 1 &&
        (await page.locator('[data-testid="follow"]').count()) === 1 &&
        (await page.locator('[data-testid="connected"]').count()) === 0,
      db.profile.blocks.join(","),
    );
    const back = await menuItem(page);
    record(
      tag + ": the overflow reads Block again",
      back.n === 1 && back.label === "Block Thandiwe",
      back.label,
    );
    await noOverflow(page, tag + " after unblock");
  } catch (e) {
    record(tag + ": flow completed", false, String(e).slice(0, 300));
    await shot(page, tag + "-FAIL").catch(() => {});
  }
  await browser.close();
}

// ---------------------------------------------------------------------------
// B4A section 11 and ruling 222, verified on the built page. Strand's Sheet does not manage focus
// today and the amendment has not landed, so none of this is inherited from the component.
// ---------------------------------------------------------------------------
async function runBlockFocus(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-block-focus`;
  const { browser, page } = await open(browserType, [w, h], theme, {
    mode: "stranger",
    rel: "none",
  });
  try {
    // Touch targets: the trigger, the item and both sheet buttons are 44 tall.
    const boxOf = async (sel) => (await page.locator(sel).first().boundingBox()) || { height: 0 };
    record(
      tag + ": the trigger is a 44 target",
      Math.round((await boxOf('[data-testid="block-menu-trigger"]')).height) >= 44,
    );
    await press(page, '[data-testid="block-menu-trigger"]');
    record(
      tag + ": the menu item is a 44 target and takes focus on open",
      Math.round((await boxOf('[data-testid="block-menu-item"]')).height) >= 44 &&
        (await activeTestId(page)) === "block-menu-item",
      String(await activeTestId(page)),
    );
    // A pointer down outside closes the menu (B4A section 4).
    await page.mouse.click(2, 2);
    await page.waitForTimeout(300);
    record(
      tag + ": a pointer down outside closes the menu",
      (await page.locator('[data-testid="block-menu"]').count()) === 0,
    );
    await press(page, '[data-testid="block-menu-trigger"]');
    await press(page, '[data-testid="block-menu-item"]');
    await page.waitForSelector('section[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(500);
    // Ruling 222: focus lands on the heading, so the first thing read is what will happen, and the
    // destructive button is never the default target.
    record(
      tag + ": focus lands on the sheet heading, not the danger button",
      (await activeTag(page)) === "H2" && (await activeTestId(page)) === null,
      `${await activeTag(page)} ${await activeTestId(page)}`,
    );
    record(
      tag + ": both sheet buttons are 44 targets",
      Math.round((await boxOf('[data-testid="block-cancel"]')).height) >= 44 &&
        Math.round((await boxOf('[data-testid="block-confirm"]')).height) >= 44,
    );
    // The Tab trap: from the last control, Tab returns to the first inside the dialog.
    await page.locator('[data-testid="block-confirm"]').focus();
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);
    record(
      tag + ": Tab is trapped inside the sheet",
      (await activeTestId(page)) === "block-cancel",
      String(await activeTestId(page)),
    );
    // Esc dismisses and returns focus to the ellipsis trigger.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    record(
      tag + ": Esc closes the sheet and returns focus to the trigger",
      (await page.locator('section[role="dialog"]').count()) === 0 &&
        (await activeTestId(page)) === "block-menu-trigger",
      String(await activeTestId(page)),
    );
  } catch (e) {
    record(tag + ": flow completed", false, String(e).slice(0, 300));
    await shot(page, tag + "-FAIL").catch(() => {});
  }
  await browser.close();
}

module.exports = { runBlock, runBlocker, runBlockFlow, runBlockFocus };
