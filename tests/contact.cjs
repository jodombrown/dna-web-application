// Ruling 387: company email addresses come from one module, src/lib/contact.ts, mirrored for Deno at
// supabase/functions/_shared/contact.ts, and security.txt is served at /.well-known/security.txt.
// Three arms, each with its own fixture:
//
//   parity    the two modules export identical values (the mirror is only acceptable while this holds);
//   scan      no company email literal appears anywhere in the tree but those two files;
//   security  the deployed /.well-known/security.txt serves as text/plain with Contact and a future Expires.
//
// The scan and parity arms need no deployment. The security arm asserts against BASE, the deployed
// preview, never the local source, so it proves the hosting path; without BASE it reports unproven
// (ruling 228), never passing. ARMS=parity,scan or ARMS=security runs a subset.
// Usage: BASE=https://<preview>.dna-web-application.pages.dev node tests/contact.cjs
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..");
const CLIENT = "src/lib/contact.ts";
const MIRROR = "supabase/functions/_shared/contact.ts";
const ALLOWLIST = new Set([CLIENT, MIRROR]);
const BASE = (process.env.BASE || "").replace(/\/$/, "");
const ARMS = new Set(
  (process.env.ARMS || "parity,scan,security")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean),
);

const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  (" + detail + ")" : ""));
};
const unproven = [];
const skip = (name, why) => {
  unproven.push({ name, why });
  console.log("UNPROVEN " + name + "  (" + why + ")");
};

/** Evaluates one of the two constants modules. Both are plain TypeScript with no imports. */
function loadModule(rel) {
  const source = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: rel,
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, { module, exports: module.exports }, { filename: rel });
  return module.exports;
}

/** Everything the two modules must agree on, as one comparable value. Functions compare by output. */
function snapshot(m) {
  return {
    CONTACT: m.CONTACT,
    CONTACT_ADDRESSES: m.CONTACT_ADDRESSES,
    AUTH_SENDER: m.AUTH_SENDER,
    NOTIFICATION_SENDER: m.NOTIFICATION_SENDER,
    SENDER_DISPLAY_NAME: m.SENDER_DISPLAY_NAME,
    SECURITY_TXT_EXPIRES: m.SECURITY_TXT_EXPIRES,
    SECURITY_TXT_PATH: m.SECURITY_TXT_PATH,
    securityTxt: m.securityTxt(),
    fromHeader: [m.fromHeader(m.AUTH_SENDER), m.fromHeader(m.NOTIFICATION_SENDER)],
    surfaceKeys: Object.keys(m.CONTACT).filter((k) => m.isSurfaceKey(k)),
    publicKeys: Object.keys(m.CONTACT).filter((k) => m.isPublicKey(k)),
  };
}

function parity() {
  let client, mirror;
  try {
    client = loadModule(CLIENT);
    mirror = loadModule(MIRROR);
  } catch (e) {
    record("parity: both constants modules load", false, String(e.message || e));
    return null;
  }
  record("parity: both constants modules load", true);

  const a = JSON.stringify(snapshot(client), null, 1);
  const b = JSON.stringify(snapshot(mirror), null, 1);
  let detail = "";
  if (a !== b) {
    const al = a.split("\n");
    const bl = b.split("\n");
    const i = al.findIndex((line, n) => line !== bl[n]);
    detail = `first difference at line ${i + 1}: client ${JSON.stringify(al[i])} vs mirror ${JSON.stringify(bl[i])}`;
  }
  record("parity: client and mirror export identical values", a === b, detail);

  // The directory's shape, checked on the client module (the mirror is identical by the arm above).
  const entries = Object.entries(client.CONTACT);
  const byStatus = (s) => entries.filter(([, e]) => e.status === s).map(([k]) => k);
  record(
    "parity: nineteen addresses, two reserved, one retired",
    entries.length === 19 && byStatus("reserved").length === 2 && byStatus("retired").length === 1,
    `${entries.length} entries; reserved ${byStatus("reserved").join(",")}; retired ${byStatus("retired").join(",")}`,
  );
  const domain = client.CONTACT.security.address.split("@")[1];
  record(
    "parity: every address is on the root domain, never the app subdomain",
    entries.every(([, e]) => e.address.endsWith("@" + domain)),
    domain,
  );
  record("parity: addresses are unique", new Set(client.CONTACT_ADDRESSES).size === entries.length);
  record(
    "parity: reserved and retired addresses are published nowhere",
    entries
      .filter(([, e]) => e.status !== "live")
      .every(([k, e]) =>
        e.status === "retired" ? e.published.length === 0 : !client.isSurfaceKey(k),
      ),
  );
  record(
    "parity: both senders carry Reply-To support@",
    client.AUTH_SENDER.replyTo === client.CONTACT.support.address &&
      client.NOTIFICATION_SENDER.replyTo === client.CONTACT.support.address &&
      client.AUTH_SENDER.from === client.CONTACT.authSender.address &&
      client.NOTIFICATION_SENDER.from === client.CONTACT.notificationSender.address,
  );
  record(
    "parity: the retired sender is not a sender pairing",
    client.AUTH_SENDER.from !== client.CONTACT.legacySender.address &&
      client.NOTIFICATION_SENDER.from !== client.CONTACT.legacySender.address,
  );
  return client;
}

/** Every file in the working tree that git would carry: tracked plus untracked, minus ignored. */
function treeFiles() {
  const out = execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 },
  );
  return out
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter((f) => fs.existsSync(path.join(ROOT, f)) && fs.statSync(path.join(ROOT, f)).isFile());
}

function isBinary(buf) {
  const n = Math.min(buf.length, 8000);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true;
  return false;
}

function scan(client) {
  // The domain comes from the module so this file never spells an address itself. Any subdomain
  // counts: an address on the app subdomain is the defect ruling 387 names.
  const domain = client
    ? client.CONTACT.security.address.split("@")[1]
    : loadModule(CLIENT).CONTACT.security.address.split("@")[1];
  const re = new RegExp(
    "[A-Za-z0-9._%+-]+@(?:[a-z0-9-]+\\.)*" + domain.replace(/\./g, "\\."),
    "gi",
  );

  for (const rel of ALLOWLIST) {
    const exists = fs.existsSync(path.join(ROOT, rel));
    record(`scan: allowlisted ${rel} exists`, exists);
    if (exists) {
      const hits = fs.readFileSync(path.join(ROOT, rel), "utf8").match(re) || [];
      record(
        `scan: ${rel} carries the directory's addresses`,
        hits.length >= 19,
        `${hits.length} hits`,
      );
    }
  }

  const hits = [];
  for (const rel of treeFiles()) {
    if (ALLOWLIST.has(rel)) continue;
    const buf = fs.readFileSync(path.join(ROOT, rel));
    if (isBinary(buf)) continue;
    const text = buf.toString("utf8");
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      const m = line.match(re);
      if (m) hits.push(`${rel}:${i + 1}: ${m.join(", ")}`);
    });
  }
  record(
    "scan: no company email literal outside the two constants files",
    hits.length === 0,
    hits.length
      ? `${hits.length} hit(s):\n    ` + hits.join("\n    ")
      : "whole tree, allowlist of two",
  );
}

async function fetchWithRetry(url, tries = 6, delayMs = 10000) {
  let last;
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      last = { status: res.status, text: await res.text(), headers: res.headers };
      if (res.status === 200) return last;
    } catch (e) {
      last = { status: 0, text: "", headers: new Headers(), error: String(e.message || e) };
    }
    if (i < tries) await new Promise((r) => setTimeout(r, delayMs));
  }
  return last;
}

/** RFC 9116 is `Field: value` lines; comments start with #. Repeated fields collect. */
function parseSecurityTxt(text) {
  const fields = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf(":");
    if (i <= 0) return { fields, malformed: line };
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    fields.set(key, [...(fields.get(key) || []), value]);
  }
  return { fields, malformed: null };
}

async function security(client) {
  const m = client || loadModule(CLIENT);
  const name = "security: deployed /.well-known/security.txt";
  if (!BASE) {
    skip(name, "BASE not set; the arm asserts against the deployed preview, not the local file");
    return;
  }
  const url = BASE + m.SECURITY_TXT_PATH;
  const res = await fetchWithRetry(url);
  record(
    `${name} serves 200`,
    res.status === 200,
    `${url} -> ${res.status}${res.error ? " " + res.error : ""}`,
  );
  if (res.status !== 200) return;

  const type = res.headers.get("content-type") || "";
  record(
    "security: content-type is text/plain",
    /^text\/plain\b/i.test(type),
    type || "no content-type",
  );

  const { fields, malformed } = parseSecurityTxt(res.text);
  record("security: every line parses as Field: value", malformed === null, malformed || "");

  const contact = fields.get("Contact") || [];
  record(
    "security: Contact is the directory's security address",
    contact.length === 1 && contact[0] === "mailto:" + m.CONTACT.security.address,
    contact.join(", ") || "no Contact",
  );

  const expires = fields.get("Expires") || [];
  const when = expires.length === 1 ? Date.parse(expires[0]) : NaN;
  record(
    "security: exactly one Expires, ISO 8601, in the future at run time",
    expires.length === 1 && Number.isFinite(when) && when > Date.now(),
    expires.join(", ") || "no Expires",
  );
  record(
    "security: Expires matches the module (one place to renew)",
    expires.length === 1 && expires[0] === m.SECURITY_TXT_EXPIRES,
  );
  record("security: no Encryption line (there is no key to point at)", !fields.has("Encryption"));
  // The retired and reserved addresses never reach a public surface.
  const leaked = m.CONTACT_ADDRESSES.filter(
    (a) => a !== m.CONTACT.security.address && res.text.includes(a),
  );
  record("security: no other address in the served file", leaked.length === 0, leaked.join(", "));
}

(async () => {
  let client = null;
  if (ARMS.has("parity")) client = parity();
  if (ARMS.has("scan")) scan(client);
  if (ARMS.has("security")) await security(client);

  const fails = results.filter((r) => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} contact checks passed`);
  // Ruling 228: unproven is its own outcome, counted apart and never folded into passing.
  if (unproven.length) {
    console.log(`${unproven.length} arm(s) unproven, not passing:`);
    for (const u of unproven) console.log(`  - ${u.name}: ${u.why}`);
  }
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
