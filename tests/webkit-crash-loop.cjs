// Ruling 200 diagnostic. Not part of the matrix and not a pass criterion: it loops the Profile
// owner flow in one engine until the WebKit web process dies, and captures what died. Precedent for
// instrumenting this defect rather than re-running it is the instrumentation commit 483fb91 named
// in ruling 200's table.
//
// Theme is not a variable. Run 62's second attempt crashed at `webkit-1536x960-light`, the sole
// failure of 5990 checks, which broke the "every sighting is dark" constant ruling 200 was written
// around. The two themes differ by `color-scheme` and nothing else on any compositing property
// (docs/GAPS.md G5, finding 1), so a crash in one was always possible in the other. THEME=both
// alternates per iteration and is the default, because restricting to one theme only halves the
// at-risk population.
//
// Arms, chosen by ARM and PROBE:
//   ARM=control                the flow exactly as the matrix runs it.
//   ARM=probe PROBE=appearance the same flow with every form control taken off the engine's native
//                              form-control paint path via `appearance: none`. Native-appearance
//                              controls are the only element class that exists in the owner view
//                              and in no other view (G5, finding 2), and they are what survives the
//                              light sighting. This is the live suspect.
//   ARM=probe PROBE=color-scheme  forces `color-scheme: light`. Kept because it is cheap, and
//                              because the light sighting predicts it makes no difference; a run
//                              where it does would mean the light sighting has a second cause.
//
// A probe is injected into the running page. It changes no product code, no repo style and no pass
// criterion, and it is not a quarantine.
//
// Usage: BASE=<deployed url> ARM=control LOOPS=40 node tests/webkit-crash-loop.cjs
const { webkit } = require("playwright");
const M = require("./matrix.cjs");
const P = require("./profile.cjs");

const ARM = process.env.ARM === "probe" ? "probe" : "control";
const PROBE = process.env.PROBE === "color-scheme" ? "color-scheme" : "appearance";
const LOOPS = Number(process.env.LOOPS || 40);
const VP = process.env.ONLY ? JSON.parse(process.env.ONLY) : [1536, 960];
const THEME = process.env.THEME || "both";
const CRASH = /WEB PROCESS CRASHED|Target crashed/;

const CSS = {
  appearance:
    "select, input, textarea, button, ::-webkit-inner-spin-button, ::-webkit-search-decoration" +
    " { appearance: none !important; -webkit-appearance: none !important; }",
  "color-scheme": "*, *::before, *::after { color-scheme: light !important; }",
};

/**
 * tests/profile.cjs destructures `launch` from matrix.cjs at module load, and `launch` calls
 * `browserType.launch(opts)` on whatever object it is handed. So an object with a `launch` method
 * is a drop-in engine, and a probe can be attached to every context the flow opens without
 * profile.cjs knowing about it or the flow itself being altered.
 */
const engine = {
  async launch(opts) {
    const browser = await webkit.launch(opts);
    if (ARM !== "probe") return browser;
    const css = CSS[PROBE];
    const newContext = browser.newContext.bind(browser);
    browser.newContext = async (o) => {
      const ctx = await newContext(o);
      await ctx.addInitScript((text) => {
        const add = () => {
          const s = document.createElement("style");
          s.setAttribute("data-ruling-200-probe", "");
          s.textContent = text;
          document.documentElement.appendChild(s);
        };
        if (document.documentElement) add();
        else document.addEventListener("readystatechange", add, { once: true });
      }, css);
      return ctx;
    };
    return browser;
  },
};

(async () => {
  const label = ARM === "probe" ? `probe:${PROBE}` : "control";
  console.log(
    `ruling 200 loop: arm=${label} engine=webkit viewport=${VP.join("x")} theme=${THEME} loops=${LOOPS} base=${M.BASE}`,
  );
  let seen = 0;
  const crashedAt = [];
  for (let i = 1; i <= LOOPS; i++) {
    const theme = THEME === "both" ? (i % 2 ? "dark" : "light") : THEME;
    const before = M.results.length;
    const t0 = Date.now();
    try {
      await P.runOwner(engine, "webkit", VP, theme);
    } catch (e) {
      // A dead web process can surface as a throw out of the flow's own teardown.
      M.results.push({ name: `loop ${i} threw`, ok: false, detail: String(e).slice(0, 600) });
    }
    const added = M.results.slice(before);
    const failed = added.filter((r) => !r.ok);
    const crashed = failed.some((r) => CRASH.test(r.detail || ""));
    if (crashed) {
      seen++;
      crashedAt.push(`${i}:${theme}`);
      console.log(`LOOP ${i} (${theme}): WEB PROCESS CRASHED after ${Date.now() - t0}ms`);
      for (const f of failed) console.log(`   ${f.name} :: ${(f.detail || "").slice(0, 900)}`);
    } else {
      console.log(
        `LOOP ${i} (${theme}): no crash (${Date.now() - t0}ms, ${failed.length} non-crash check failures)`,
      );
    }
  }
  console.log(
    `RESULT arm=${label} loops=${LOOPS} crashes=${seen}` +
      (crashedAt.length ? ` at ${crashedAt.join(",")}` : ""),
  );
  // The loop always exits 0: a crash is the observation this script exists to make, not its failure.
  process.exit(0);
})();
