// Ruling 200 diagnostic. Not part of the matrix and not a pass criterion: it loops the Profile
// owner flow in one engine, one theme and one viewport until the WebKit web process dies, and
// captures what died. Precedent for instrumenting this defect rather than re-running it is the
// instrumentation commit 483fb91 named in ruling 200's table.
//
// Two arms, chosen by ARM:
//   control  the flow exactly as the matrix runs it.
//   probe    the same flow with `color-scheme: light` forced on every element, and nothing else
//            changed: the dark tokens, [data-theme="dark"] and the context's dark preference all
//            stay. G5 names `color-scheme: dark` on native form controls as the only property that
//            is both dark-only and owner-only, so this is the single-variable test of that claim.
//            It is a probe injected into the running page, not a fix, not a repo style change and
//            not a quarantine.
//
// Usage: BASE=<deployed url> ARM=control LOOPS=40 node tests/webkit-crash-loop.cjs
const { webkit } = require("playwright");
const M = require("./matrix.cjs");
const P = require("./profile.cjs");

const ARM = process.env.ARM === "probe" ? "probe" : "control";
const LOOPS = Number(process.env.LOOPS || 40);
const VP = process.env.ONLY ? JSON.parse(process.env.ONLY) : [820, 1180];
const THEME = process.env.THEME || "dark";
const CRASH = /WEB PROCESS CRASHED/;

/**
 * tests/profile.cjs destructures `launch` from matrix.cjs at module load, and `launch` calls
 * `browserType.launch(opts)` on whatever object it is handed. So an object with a `launch` method
 * is a drop-in engine, and the probe's style injection can be attached to every context the flow
 * opens without profile.cjs knowing about it or the flow itself being altered.
 */
const engine = {
  async launch(opts) {
    const browser = await webkit.launch(opts);
    if (ARM === "probe") {
      const newContext = browser.newContext.bind(browser);
      browser.newContext = async (o) => {
        const ctx = await newContext(o);
        await ctx.addInitScript(() => {
          const add = () => {
            const s = document.createElement("style");
            s.setAttribute("data-ruling-200-probe", "");
            s.textContent = "*, *::before, *::after { color-scheme: light !important; }";
            document.documentElement.appendChild(s);
          };
          if (document.documentElement) add();
          else document.addEventListener("readystatechange", add, { once: true });
        });
        return ctx;
      };
    }
    return browser;
  },
};

(async () => {
  console.log(
    `ruling 200 loop: arm=${ARM} engine=webkit viewport=${VP.join("x")} theme=${THEME} loops=${LOOPS} base=${M.BASE}`,
  );
  let seen = 0;
  const crashedAt = [];
  for (let i = 1; i <= LOOPS; i++) {
    const before = M.results.length;
    const t0 = Date.now();
    try {
      await P.runOwner(engine, "webkit", VP, THEME);
    } catch (e) {
      // A dead web process can surface as a throw out of the flow's own teardown.
      M.results.push({ name: `loop ${i} threw`, ok: false, detail: String(e).slice(0, 600) });
    }
    const added = M.results.slice(before);
    const crashed = added.some((r) => !r.ok && CRASH.test(r.detail || ""));
    const failed = added.filter((r) => !r.ok);
    if (crashed) {
      seen++;
      crashedAt.push(i);
      console.log(`LOOP ${i}: WEB PROCESS CRASHED after ${Date.now() - t0}ms`);
      for (const f of failed) console.log(`   ${f.name} :: ${(f.detail || "").slice(0, 900)}`);
    } else {
      console.log(
        `LOOP ${i}: no crash (${Date.now() - t0}ms, ${failed.length} non-crash check failures)`,
      );
    }
  }
  console.log(
    `RESULT arm=${ARM} loops=${LOOPS} crashes=${seen}` +
      (crashedAt.length ? ` at iterations ${crashedAt.join(",")}` : ""),
  );
  // The loop always exits 0: a crash is the observation this script exists to make, not its failure.
  process.exit(0);
})();
