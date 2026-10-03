// Handoff 45-C arms 4 and 5 (rulings 1378, 1379): admin-dia-note's prompt and its preview origin,
// read off supabase/functions/admin-dia-note/index.ts. Static: the function is deployed by Chat
// after the run, never by this job.
//
//   prompt   SYSTEM names Direction, Depth and Source as part of Mobilization and says a statement
//            about them names Mobilization; SYSTEM carries the joined-members sentence; BLOCKS is
//            the array it was at c859d54, because the page's block links depend on it (1301).
//   origin   ADMIN_PREVIEW answers the origin of the admin deployment this run's deploy-admin job
//            reported (ADMIN_BASE), and refuses https://example.pages.dev. Without ADMIN_BASE the
//            arm is unproven (228) and the script exits 1.
//
// ARMS=prompt or ARMS=origin runs one.
// Usage: ADMIN_BASE=https://<id>.dna-admin-1oz.pages.dev node tests/admin-dia-note.cjs
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "supabase/functions/admin-dia-note/index.ts");
const ARMS = new Set((process.env.ARMS || "prompt,origin").split(",").map((a) => a.trim()));
const ADMIN_BASE = (process.env.ADMIN_BASE || "").replace(/\/$/, "");

/** BLOCKS at c859d54, the merge of #90, byte for byte. */
const BLOCKS_C859D54 =
  'const BLOCKS = ["Mobilization", "By corridor", "Source", "The levers", "The network", "Controls"];';

let failed = 0;
let unproven = 0;
const record = (name, ok, detail = "") => {
  if (!ok) failed++;
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  (" + detail + ")" : ""));
};

const src = fs.readFileSync(FILE, "utf8");

if (ARMS.has("prompt")) {
  const m = src.match(/const SYSTEM = `([\s\S]*?)`;/);
  const system = m ? m[1] : "";
  record("prompt | SYSTEM is found", !!system);
  const lines = system.split("\n");
  const mob = lines.find((l) =>
    /Direction, Depth and Source are part of the Mobilization block/.test(l),
  );
  record("prompt | SYSTEM names Direction, Depth and Source as part of Mobilization (1378)", !!mob);
  record(
    "prompt | and says a statement about any of them names Mobilization",
    !!mob && /statement about direction, depth or source names Mobilization/i.test(mob),
    mob || "",
  );
  const net = lines.find((l) => /The network block describes all joined members as of now/.test(l));
  record("prompt | SYSTEM says the network block describes all joined members as of now", !!net);
  record(
    "prompt | and that a statement about it never calls them new, recent or joiners in the period",
    !!net && /never calls them new, recent or joiners in the period/.test(net),
    net || "",
  );
  const blocks = src.split("\n").filter((l) => l.startsWith("const BLOCKS = "));
  record(
    "prompt | BLOCKS is unchanged from c859d54",
    blocks.length === 1 && blocks[0] === BLOCKS_C859D54,
    blocks.join(" | "),
  );
}

if (ARMS.has("origin")) {
  const m = src.match(/^const ADMIN_PREVIEW = \/(.+)\/([a-z]*);$/m);
  record("origin | ADMIN_PREVIEW is a regular expression literal", !!m);
  if (m) {
    const re = new RegExp(m[1], m[2]);
    if (!ADMIN_BASE) {
      unproven++;
      console.log(
        "UNPROVEN origin | ADMIN_PREVIEW answers this run's admin deployment  (ADMIN_BASE is not set, so no deploy-admin job reported a host; 228)",
      );
    } else {
      const origin = new URL(ADMIN_BASE).origin;
      record(
        `origin | ADMIN_PREVIEW answers this run's admin deployment, ${origin} (1379)`,
        re.test(origin),
      );
    }
    record(
      "origin | ADMIN_PREVIEW refuses https://example.pages.dev",
      !re.test("https://example.pages.dev"),
    );
    record(
      "origin | ADMIN_PREVIEW refuses a host that only ends in the admin subdomain",
      !re.test("https://evil.example.com/x.dna-admin-1oz.pages.dev") &&
        !re.test("https://x.dna-admin-1oz.pages.dev.example.com"),
    );
  }
}

console.log(`admin-dia-note: ${failed} failed, ${unproven} unproven`);
process.exit(failed || unproven ? 1 : 0);
