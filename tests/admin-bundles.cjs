// Handoff 40-B section 6, arm 4: the two apps' built bundles contain nothing of each other. The
// member app's output (dist/) carries no admin read and no admin copy, and the admin app's output
// (admin/dist/) carries no member route: Brief 12's guardrail 1 ("nothing admin is reachable from,
// or shipped in, the member app") and the mirror of it. Static, read from the build output in the
// job that produced it, so each half runs in its own deploy job.
// Usage: node tests/admin-bundles.cjs member|admin
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const which = process.argv[2];

const HALVES = {
  member: {
    dir: "dist",
    // The admin read, the admin title and the refusal heading: each exists only under admin/.
    forbidden: ["admin_session_state", "DNA Admin", "No admin access"],
    // Handoff 40-D arm 3 (Strand compile v1790885781186000, ruling 1309): the seven Strand admin
    // parts are exported from src/components/strand and the member app imports none of them. The
    // production build minifies identifiers, so a part's name survives only inside a string the
    // part itself carries (StackedBars and DiaNote name themselves in a console warning; the other
    // five do not), and a name alone would pass on a bundle that shipped the part. Each part is
    // therefore paired with strings read off its own rendering, an attribute name or a sentence
    // that exists in no member surface, and the arm first checks every pairing against the part's
    // source in src/components/strand, so a marker that stops being the part's text fails by name
    // rather than passing on nothing.
    parts: {
      ConsoleShell: ["data-console-shell", "Open navigation"],
      MeasureCard: ["Not yet connected."],
      Sparkline: ["non-scaling-stroke"],
      StackedBars: ["StackedBars: at most two series"],
      BarList: ["Not yet connected"],
      DataTable: ["a column heading to sort."],
      DiaNote: ["DIA suggests what might explain a change", "Loading DIA's note"],
    },
  },
  admin: {
    dir: path.join("admin", "dist"),
    // A projection Connect reads, a projection Profile reads, the sign-up heading and a provider
    // button label: each exists only in a member route or a member surface.
    forbidden: ["connect_cards", "profile_view", "Create your account", "Continue with Google"],
  },
};

const half = HALVES[which];
if (!half) {
  console.error("usage: node tests/admin-bundles.cjs member|admin");
  process.exit(2);
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|mjs|cjs|css|html|json)$/.test(e.name)) out.push(p);
  }
  return out;
}

const dir = path.join(ROOT, half.dir);
if (!fs.existsSync(dir)) {
  // Ruling 228: no output is not a pass.
  console.log(`UNPROVEN ${which} bundle: ${half.dir} does not exist; build it first`);
  process.exit(1);
}
const files = walk(dir);
let failed = 0;
const parts = half.parts || {};
for (const [part, markers] of Object.entries(parts)) {
  const src = fs.readFileSync(path.join(ROOT, "src/components/strand", part + ".tsx"), "utf8");
  const stale = markers.filter((m) => !src.includes(m));
  if (stale.length) {
    failed++;
    console.log(
      `FAIL ${part}'s marker ${stale.map((m) => JSON.stringify(m)).join(", ")} is not in src/components/strand/${part}.tsx`,
    );
  } else
    console.log(
      `PASS ${part}'s ${markers.length} marker(s) read off src/components/strand/${part}.tsx`,
    );
}
const needles = [
  ...half.forbidden,
  ...Object.entries(parts).flatMap(([part, markers]) => [part, ...markers]),
];
for (const needle of needles) {
  const hits = files.filter((f) => fs.readFileSync(f, "utf8").includes(needle));
  if (hits.length) {
    failed++;
    console.log(
      `FAIL ${which} bundle carries "${needle}" in ${hits.map((h) => path.relative(ROOT, h)).join(", ")}`,
    );
  } else console.log(`PASS ${which} bundle carries no "${needle}" (${files.length} files read)`);
}
process.exit(failed ? 1 : 0);
