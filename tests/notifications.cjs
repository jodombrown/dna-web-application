// The notification contract in the source (handoff 55-A; rulings 1318, 1319, 490, 194). Static: it
// needs no browser and no deployment, because what it enforces is a source contract. The database
// half (the one writer, the policies, the dot) is proved by the live arms in tests/live-db.cjs.
//
// The kind vocabulary is public.notification_kinds, seeded by migration and served by vocabularies()
// (1318). So the kinds this check knows are read out of the migrations' own seed, never listed here.
//
// Three arms, each as the handoff names it:
//   sentence   every kind the seed marks renders has a sentence in the row part's parts(), so no row
//              the database renders reads blank (and none renders without its destination words);
//   writer     no file in src/ or supabase/functions/ writes public.notifications directly: no
//              insert, upsert or delete through the client, no SQL insert, and the one client update
//              sets read_at alone (the member's own column grant; markRead). Rows are written by
//              private.notify inside each engine's write function (1319);
//   no array   no client array or object of notification kinds exists in src/: the kinds are the
//              vocabulary's, and NOTIFICATION_REGISTRY, KIND_C and DESTINATION are gone (N4).
//
// Usage: node tests/notifications.cjs
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..");
const ROW = "src/components/strand/NotificationListItem.tsx";
const MIGRATIONS = "supabase/migrations";

const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  (" + detail + ")" : ""));
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** Every file under a directory, relative to the root, filtered by extension. */
function walk(rel, exts) {
  const out = [];
  const visit = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) visit(p);
      else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
    }
  };
  visit(rel);
  return out;
}

/**
 * The row part's module exports. React and the sibling modules are stubbed because parts() is plain
 * data and the component itself never runs.
 */
function loadRow() {
  const { outputText } = ts.transpileModule(read(ROW), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: ROW,
  });
  const stub = new Proxy({}, { get: (_t, key) => (key === "__esModule" ? true : () => null) });
  const module = { exports: {} };
  vm.runInNewContext(
    outputText,
    { module, exports: module.exports, require: () => stub },
    { filename: ROW },
  );
  return module.exports;
}

/**
 * The seed: every `insert into public.notification_kinds (...) values (...)` in the migrations, in
 * version order, a later row for a kind replacing an earlier one. Returns [{ kind, renders,
 * destination }] or null when no seed is found.
 */
function seededKinds() {
  const files = fs
    .readdirSync(path.join(ROOT, MIGRATIONS))
    .filter((f) => /^\d{14}_.*\.sql$/.test(f))
    .sort();
  const kinds = new Map();
  let found = false;
  for (const f of files) {
    const sql = read(path.join(MIGRATIONS, f));
    const re = /insert\s+into\s+public\.notification_kinds\s*\(([^)]*)\)\s*values\s*([\s\S]*?);/gi;
    let m;
    while ((m = re.exec(sql))) {
      found = true;
      const cols = m[1].split(",").map((c) => c.trim());
      const tuples = m[2].match(/\((?:[^()']|'(?:[^']|'')*')*\)/g) || [];
      for (const t of tuples) {
        const vals = [...t.slice(1, -1).matchAll(/\s*('(?:[^']|'')*'|[^,]+)\s*(?:,|$)/g)].map((v) =>
          v[1].trim(),
        );
        const at = (col) => vals[cols.indexOf(col)];
        const str = (v) => (v && v.startsWith("'") ? v.slice(1, -1).replace(/''/g, "'") : null);
        const kind = str(at("kind"));
        if (!kind) continue;
        kinds.set(kind, {
          kind,
          renders: at("renders") === "true",
          destination: str(at("destination")),
        });
      }
    }
  }
  return found ? [...kinds.values()] : null;
}

// sentence -----------------------------------------------------------------------------------------
const row = loadRow();
const seed = seededKinds();
record("sentence: the row part exports hasSentence", typeof row.hasSentence === "function");
if (!seed) {
  record("sentence: the notification_kinds seed is read from the migrations", false);
} else {
  record(
    "sentence: the notification_kinds seed is read from the migrations",
    seed.length > 0,
    seed.map((k) => k.kind + (k.renders ? "*" : "")).join(", ") + "  (* renders)",
  );
  for (const k of seed.filter((x) => x.renders)) {
    record(
      `sentence: ${k.kind} renders and has a sentence in parts()`,
      typeof row.hasSentence === "function" && row.hasSentence(k.kind) === true,
    );
    record(
      `sentence: ${k.kind} renders with its destination in words (490)`,
      typeof k.destination === "string" && k.destination.trim() !== "",
      String(k.destination),
    );
  }
  for (const k of seed.filter((x) => !x.renders))
    console.log(`  held (renders false in the seed): ${k.kind}`);
}

// writer -------------------------------------------------------------------------------------------
const sources = [...walk("src", [".ts", ".tsx"]), ...walk("supabase/functions", [".ts"])].filter(
  (f) => !f.endsWith("database.types.ts"),
);
const writes = [];
const updates = [];
for (const f of sources) {
  const text = read(f);
  if (/insert\s+into\s+(public\.)?notifications\b/i.test(text)) writes.push(f + " (SQL insert)");
  const re = /\.from\(\s*["']notifications["']\s*\)([\s\S]{0,200})/g;
  let m;
  while ((m = re.exec(text))) {
    const chain = m[1];
    const verb = /^\s*\.(insert|upsert|delete|update)\s*\(/.exec(chain);
    if (!verb) continue;
    if (verb[1] !== "update") writes.push(f + " (." + verb[1] + ")");
    else {
      const arg = /^\s*\.update\(\s*\{([^}]*)\}/.exec(chain);
      const keys = arg
        ? arg[1]
            .split(",")
            .map((x) => x.split(":")[0].trim())
            .filter(Boolean)
        : [];
      updates.push(f);
      if (keys.join(",") !== "read_at")
        writes.push(f + " (.update of " + (keys.join(",") || "?") + ")");
    }
  }
}
record(
  "writer: no file in src/ or supabase/functions/ inserts, upserts or deletes notifications, and the one client update sets read_at alone",
  writes.length === 0,
  writes.length ? writes.join("; ") : "read_at updates: " + (updates.join(", ") || "none"),
);

// no array -----------------------------------------------------------------------------------------
const kindNames = (seed || []).map((k) => k.kind);
const clientFiles = walk("src", [".ts", ".tsx"]).filter((f) => !f.endsWith("database.types.ts"));
const arrays = [];
const retired = [];
for (const f of clientFiles) {
  const text = read(f);
  for (const name of ["NOTIFICATION_REGISTRY", "KIND_C", "DESTINATION"])
    if (new RegExp("\\b" + name + "\\b").test(text)) retired.push(f + ": " + name);
  if (kindNames.length < 2) continue;
  const alt = kindNames.join("|");
  // An array literal naming two or more kinds, or an object keyed by two or more kinds.
  const asArray = new RegExp(
    "\\[[^\\]]*[\"'](" + alt + ")[\"'][^\\]]*[\"'](" + alt + ")[\"']",
    "s",
  );
  // A key starts a line or follows { or , so a switch's `case "kind":` is not one.
  const asKey = new RegExp("(?:^|[{,])\\s*[\"']?(" + alt + ")[\"']?\\s*:", "gm");
  if (asArray.test(text)) arrays.push(f + " (array)");
  if ((text.match(asKey) || []).length >= 2) arrays.push(f + " (object keyed by kind)");
}
record(
  "no array: NOTIFICATION_REGISTRY, KIND_C and DESTINATION are gone from src/",
  retired.length === 0,
  retired.join("; "),
);
record(
  "no array: no client array or object of notification kinds exists in src/",
  kindNames.length >= 2 && arrays.length === 0,
  kindNames.length < 2 ? "the seed did not load" : arrays.join("; "),
);

const fails = results.filter((r) => !r.ok);
console.log(`\n${results.length - fails.length}/${results.length} notification checks passed`);
if (fails.length) for (const f of fails) console.log(`  FAILED: ${f.name}`);
process.exit(fails.length ? 1 : 0);
