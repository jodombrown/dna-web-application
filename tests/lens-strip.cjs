// Fix PR 09 (G225): the lens strip's shape and its cue, on Feed, Connect and Convene, in both themes.
//
// Ruling 1515 (W84): where the bar renders as the strip, the rounded track is the scroller, at its
// column's width, and the seat never scrolls. Per cell the arm reads the track's four computed corner
// radii (equal and not zero, at the strip's start and at its end), that the track's border box lies
// inside its column's content box at both edges (the column is the seat, whose content box the fit
// test prices), that the track is what scrolls (`scrollLeft` moves between start and end) while the
// seat's `scrollLeft` stays 0, and that the active lens is inside the track's view after mount and
// after every lens change.
//
// Ruling 1575 (W85): a fade at each end of the track while a seat on that side is out of view, none
// on a side with nothing hidden, none at all where the strip fits. At the strip's start the end fade
// only, at its end the start fade only, in the middle both. The fade's ground is the track's own
// (`--bg-sunken`, read from the track's computed background), it takes no pointer and carries no
// name, and a tap where a fade lies selects the seat under it.
//
// The compact widths read all three surfaces. At 820 the medium bar is justified and fits, so the
// arm first reads that it shows no fade, then forces the Feed's and Connect's column narrower than
// the words (the seat's width, which the fit test observes) so the bar falls back to 1504's strip,
// and reads the strip there. Convene's medium row is not a strip (1170) and is not read at 820.
//
// Every cell prints a `CUE` line with the active lens first and with it last (930): whether the strip
// overflows, which element clips it, and the trailing and leading visible seats' clipped widths. On
// the code before this PR the clipping element was the seat; after it, the track.
const M = require("./matrix.cjs");

const SURFACES = [
  { id: "feed", path: "/feed", label: "Lens", root: "[data-feed]" },
  { id: "connect", path: "/connect", label: "Connect lens", root: '[data-testid="connect"]' },
  { id: "convene", path: "/convene", label: "Convene lens", root: "[data-discovery]" },
];

/** The forced column at medium: narrower than any of the Feed's or Connect's lens sets at 820. */
const FORCED_COLUMN = 300;

/** Everything the arm reads about one bar, in one evaluate. */
function readStrip(page, s) {
  return page.evaluate(
    ({ root, label }) => {
      const track = document.querySelector(
        `${root} [data-lens-seat] [role="tablist"][aria-label="${label}"]`,
      );
      if (!track) return null;
      const seat = track.closest("[data-lens-seat]");
      const tcs = getComputedStyle(track);
      const scs = getComputedStyle(seat);
      const tr = track.getBoundingClientRect();
      const sr = seat.getBoundingClientRect();
      const content = {
        left: sr.left + parseFloat(scs.borderLeftWidth) + parseFloat(scs.paddingLeft),
        right: sr.right - parseFloat(scs.borderRightWidth) - parseFloat(scs.paddingRight),
      };
      const fade = (side) => {
        const el =
          track.parentElement && track.parentElement.querySelector(`[data-lens-fade="${side}"]`);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          on: el.getAttribute("data-on") === "1",
          opacity: +parseFloat(cs.opacity).toFixed(2),
          image: cs.backgroundImage,
          pointer: cs.pointerEvents,
          hidden: el.getAttribute("aria-hidden"),
          text: (el.textContent || "").trim(),
          rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
        };
      };
      const tabs = [...track.querySelectorAll('[role="tab"]')].map((t) => {
        const r = t.getBoundingClientRect();
        return {
          id: t.getAttribute("data-lens"),
          on: t.getAttribute("aria-selected") === "true",
          left: r.left,
          right: r.right,
        };
      });
      return {
        radii: [
          tcs.borderTopLeftRadius,
          tcs.borderTopRightRadius,
          tcs.borderBottomLeftRadius,
          tcs.borderBottomRightRadius,
        ],
        ground: tcs.backgroundColor,
        track: { left: tr.left, right: tr.right, top: tr.top, bottom: tr.bottom },
        column: content,
        sw: track.scrollWidth,
        cw: track.clientWidth,
        sl: track.scrollLeft,
        seatSl: seat.scrollLeft,
        seatSw: seat.scrollWidth,
        seatCw: seat.clientWidth,
        tabs,
        start: fade("start"),
        end: fade("end"),
      };
    },
    { root: s.root, label: s.label },
  );
}

/** Scrolls the track (and, on the code before this PR, the seat) to a fraction of its range. */
function scrollStrip(page, s, at) {
  return page.evaluate(
    ({ root, label, at }) => {
      const track = document.querySelector(
        `${root} [data-lens-seat] [role="tablist"][aria-label="${label}"]`,
      );
      if (!track) return;
      const seat = track.closest("[data-lens-seat]");
      for (const el of [track, seat]) {
        const max = el.scrollWidth - el.clientWidth;
        if (max > 0) el.scrollLeft = Math.round(max * at);
      }
    },
    { root: s.root, label: s.label, at },
  );
}

/** The CUE reading (930): the clipping element and the visible seats' clipped widths. */
function cue(page, s) {
  return page.evaluate(
    ({ root, label }) => {
      const track = document.querySelector(
        `${root} [data-lens-seat] [role="tablist"][aria-label="${label}"]`,
      );
      if (!track) return null;
      const seat = track.closest("[data-lens-seat]");
      const clips = (el) =>
        el.scrollWidth > el.clientWidth + 1 &&
        /auto|scroll|hidden|clip/.test(getComputedStyle(el).overflowX);
      const clip = clips(track) ? track : clips(seat) ? seat : null;
      const box = (clip || track).getBoundingClientRect();
      const seen = [...track.querySelectorAll('[role="tab"]')].map((t) => {
        const r = t.getBoundingClientRect();
        const visible = Math.max(0, Math.min(r.right, box.right) - Math.max(r.left, box.left));
        return { id: t.getAttribute("data-lens"), w: r.width, visible };
      });
      const shown = seen.filter((t) => t.visible > 0.5);
      const lead = shown[0];
      const trail = shown[shown.length - 1];
      return {
        overflow: !!clip,
        scroller: clip === track ? "track" : clip === seat ? "seat" : "none",
        leading: lead ? +(lead.w - lead.visible).toFixed(1) : null,
        trailing: trail ? +(trail.w - trail.visible).toFixed(1) : null,
        lead: lead ? lead.id : null,
        trail: trail ? trail.id : null,
      };
    },
    { root: s.root, label: s.label },
  );
}

const tabIn = (r) => {
  const a = r && r.tabs.find((t) => t.on);
  return !!a && a.left >= r.track.left - 1 && a.right <= r.track.right + 1;
};
const overflows = (r) => !!r && r.sw > r.cw + 1;
const shows = (f) => !!f && f.on && f.opacity > 0.5;
const absent = (f) => !f || (!f.on && f.opacity < 0.05);

async function runLensStrip(browserType, bname, [w, h]) {
  const tag = `${bname}-${w}x${h}-lens-strip`;
  M.armStart(tag);
  const medium = w >= 640;
  for (const theme of M.THEMES) {
    const browser = await M.launch(browserType);
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      hasTouch: true,
      isMobile: w < 1024,
      deviceScaleFactor: 1,
      colorScheme: theme,
    });
    const page = await ctx.newPage();
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("dna.theme", t);
      } catch {}
    }, theme);
    const db = M.makeMockDb();
    M.seedPosts(db, 8);
    require("./discovery.cjs").__seedDiscovery(db);
    await M.mockSupabase(page, db);
    // Ruling 357, as runLensSeat reads it: a mocked REST fetch a navigation cancels is WebKit's.
    const cancelled = new RegExp(
      `(?:^|[\\s/])${M.SB.replace(/\./g, "\\.")}\\S*\\s+due to access control checks\\.?$`,
    );
    const errors = [];
    page.on("pageerror", (e) => {
      const text = String(e);
      if (!cancelled.test(text)) errors.push(text);
    });
    const open = async (s) => {
      await page.goto(M.BASE + s.path, { waitUntil: "networkidle" });
      await page.locator(s.root).first().waitFor({ timeout: 20000 });
      await page
        .locator(`${s.root} [data-lens-seat] [role="tablist"][aria-label="${s.label}"]`)
        .first()
        .waitFor({ timeout: 20000 });
      await page.evaluate(async () => {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
      });
      await page.waitForTimeout(300);
    };
    const settle = () => page.waitForTimeout(450);
    const inPage = (s, id) =>
      page.locator(
        `${s.root} [data-lens-seat] [role="tablist"][aria-label="${s.label}"] [role="tab"]` +
          (id ? `[data-lens="${id}"]` : ""),
      );
    try {
      await M.signIn(page);
      const surfaces = medium ? SURFACES.slice(0, 2) : SURFACES;
      for (const s of surfaces) {
        const cell = `${tag} ${theme} ${s.id}`;
        await open(s);
        if (medium && s.id === "feed") {
          // The justified bar fits its column at 820: a strip that fits shows no fade.
          const fits = await readStrip(page, s);
          record(
            `${cell}: the justified bar fits its column and shows no fade (1575)`,
            !!fits && !overflows(fits) && absent(fits.start) && absent(fits.end),
            JSON.stringify(fits && { sw: fits.sw, cw: fits.cw, start: fits.start, end: fits.end }),
          );
        }
        if (medium) {
          await page.addStyleTag({
            content: `[data-lens-seat]{width:${FORCED_COLUMN}px !important;max-width:${FORCED_COLUMN}px !important}`,
          });
          await settle();
        }
        // The CUE table (930), with the active lens first and with it last.
        const ids = await inPage(s).evaluateAll((els) =>
          els.map((e) => e.getAttribute("data-lens")),
        );
        for (const [which, id] of [
          ["first", ids[0]],
          ["last", ids[ids.length - 1]],
        ]) {
          await inPage(s, id).click();
          await settle();
          const c = await cue(page, s);
          console.log(
            `CUE ${bname} ${w} ${theme} ${s.id} active=${which} overflow=${c && c.overflow} scroller=${c && c.scroller} ` +
              `trailing=${c && c.trail}:${c && c.trailing}px leading=${c && c.lead}:${c && c.leading}px`,
          );
        }
        await inPage(s, ids[0]).click();
        await settle();

        // Ruling 1515. The strip at its start and at its end.
        await scrollStrip(page, s, 0);
        await settle();
        const a = await readStrip(page, s);
        await scrollStrip(page, s, 1);
        await settle();
        const z = await readStrip(page, s);
        const round = (r) =>
          !!r && r.radii.every((v) => v === r.radii[0]) && parseFloat(r.radii[0]) > 0;
        record(
          `${cell}: the track's four corners are equal and not zero at the strip's start and its end (1515)`,
          round(a) && round(z),
          JSON.stringify({ start: a && a.radii, end: z && z.radii }),
        );
        const inside = (r) =>
          !!r && r.track.left >= r.column.left - 0.5 && r.track.right <= r.column.right + 0.5;
        record(
          `${cell}: the track's border box lies inside its column's content box at both edges (1515)`,
          inside(a) && inside(z),
          JSON.stringify({ start: a && { track: a.track, column: a.column }, end: z && z.track }),
        );
        const scrolls = overflows(a)
          ? z.sl > a.sl + 1 && a.seatSl === 0 && z.seatSl === 0
          : !!a && a.seatSl === 0 && !!z && z.seatSl === 0 && a.seatSw <= a.seatCw + 1;
        record(
          `${cell}: the track is the strip's scroller and the seat's scrollLeft stays 0 (1515)`,
          !!a && !!z && scrolls,
          JSON.stringify({
            sw: a && a.sw,
            cw: a && a.cw,
            start: a && { sl: a.sl, seat: a.seatSl, seatSw: a.seatSw, seatCw: a.seatCw },
            end: z && { sl: z.sl, seat: z.seatSl },
          }),
        );

        // Ruling 1575. The fade at each end, by the strip's own geometry. Whether the strip overflows
        // is read on whichever element clips it, so the code before this PR, where the seat clipped
        // a track as wide as its words, reads as a strip that owes fades and shows none.
        const over = overflows(a) || (!!a && a.seatSw > a.seatCw + 1);
        record(
          `${cell}: at the strip's start the end fade only, and neither where the strip fits (1575)`,
          over ? absent(a.start) && shows(a.end) : !!a && absent(a.start) && absent(a.end),
          JSON.stringify({ over, start: a && a.start, end: a && a.end }),
        );
        record(
          `${cell}: at the strip's end the start fade only, and neither where the strip fits (1575)`,
          over ? shows(z.start) && absent(z.end) : !!z && absent(z.start) && absent(z.end),
          JSON.stringify({ over, start: z && z.start, end: z && z.end }),
        );
        await scrollStrip(page, s, 0.5);
        await settle();
        const m = await readStrip(page, s);
        record(
          `${cell}: in the strip's middle both fades, and neither where the strip fits (1575)`,
          over ? !!m && shows(m.start) && shows(m.end) : !!m && absent(m.start) && absent(m.end),
          JSON.stringify({ over, sl: m && m.sl, start: m && m.start, end: m && m.end }),
        );
        const rgbIn = (img, ground) => {
          const n = (ground.match(/[\d.]+/g) || []).slice(0, 3).join(",");
          return (img.match(/rgba?\([^)]*\)/g) || []).some(
            (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).join(",") === n,
          );
        };
        const faded = (f) =>
          !!f &&
          rgbIn(f.image, m.ground) &&
          f.pointer === "none" &&
          f.hidden === "true" &&
          f.text === "";
        record(
          `${cell}: each fade is drawn in the track's own ground, takes no pointer and carries no name (1575)`,
          !!m && faded(m.start) && faded(m.end),
          JSON.stringify({ ground: m && m.ground, start: m && m.start, end: m && m.end }),
        );
        // A tap where the end fade lies, at the strip's start, selects the seat under it.
        await scrollStrip(page, s, 0);
        await settle();
        const b = await readStrip(page, s);
        if (over && b && b.end) {
          // A point under the fade and inside a seat: the fade's centre, or the nearest point to it
          // that is not in the 2px gap between two seats.
          const f = b.end.rect;
          const mid = Math.round((f.left + f.right) / 2);
          const xs = [0, -2, 2, -4, 4, -6, 6, -8, 8].map((d) => mid + d);
          const x =
            xs.find(
              (v) =>
                v > f.left &&
                v < f.right &&
                b.tabs.some((t) => t.left + 1 <= v && t.right - 1 >= v),
            ) ?? mid;
          const y = Math.round((f.top + f.bottom) / 2);
          const under = b.tabs.find((t) => t.left <= x && t.right >= x);
          await page.touchscreen.tap(x, y);
          await settle();
          const after = await readStrip(page, s);
          const on = after && after.tabs.find((t) => t.on);
          record(
            `${cell}: a tap where a fade lies selects the seat under it, and where nothing is hidden no fade covers a seat (1575)`,
            !!under && !!on && on.id === under.id,
            JSON.stringify({ at: [x, y], under: under && under.id, selected: on && on.id }),
          );
        } else {
          const covered =
            !!b &&
            [b.start, b.end].some(
              (f) => shows(f) && b.tabs.some((t) => t.right > f.rect.left && t.left < f.rect.right),
            );
          record(
            `${cell}: a tap where a fade lies selects the seat under it, and where nothing is hidden no fade covers a seat (1575)`,
            !!b && !over && !covered,
            JSON.stringify({ over, start: b && b.start, end: b && b.end }),
          );
        }

        // The active lens in the track's view after mount and after every lens change.
        await open(s);
        if (medium) {
          await page.addStyleTag({
            content: `[data-lens-seat]{width:${FORCED_COLUMN}px !important;max-width:${FORCED_COLUMN}px !important}`,
          });
          await settle();
        }
        const seen = [];
        const mount = await readStrip(page, s);
        seen.push({ at: "mount", ok: tabIn(mount) });
        for (const id of [...ids.slice(1), ids[0]]) {
          await inPage(s, id).click();
          await settle();
          const r = await readStrip(page, s);
          seen.push({ at: id, ok: tabIn(r), active: r && (r.tabs.find((t) => t.on) || {}).id });
        }
        record(
          `${cell}: the active lens is inside the track's view after mount and after every lens change (1515, 1465)`,
          seen.every((x) => x.ok),
          JSON.stringify(seen),
        );
      }
    } catch (e) {
      record(`${tag} ${theme} flow`, false, String(e).slice(0, 300));
      await M.shot(page, `${tag}-${theme}-ERROR`).catch(() => {});
    }
    record(
      `${tag} ${theme} no page errors`,
      errors.length === 0,
      errors.slice(0, 3).join(" | ").slice(0, 300),
    );
    await browser.close();
  }
}

const record = (...a) => M.record(...a);

/** The widths this arm runs at: the three compact widths and the medium fallback at 820. */
const LENS_STRIP_WIDTHS = [360, 390, 430, 820];

module.exports = { runLensStrip, LENS_STRIP_WIDTHS };
