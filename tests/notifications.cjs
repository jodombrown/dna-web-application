// Ruling 485's notification destination check, settled by ruling 547. Static: it needs no browser
// and no deployment, because the contract it enforces is a source contract.
//
// The contract: every kind in the registry resolves to a destination, in words, and to the C glyph of
// the engine that wrote the row. Ruling 547 keeps a kind out of the registry until its destination
// has a surface, rather than listing exemptions: an exemption list is a second place where the
// contract lives and it outlives the reason it was written. So this check has no allowlist. What it
// has instead is a report of the database's own notification_kind values that the registry does not
// hold, named one by one, so a suppressed kind is visible rather than silently missing.
//
// Five arms:
//   registry     the registry parses, is not empty, and every row carries a C and a destination;
//   words        every registry kind has a sentence in the row component, so no row renders blank;
//   derived      DESTINATION and KIND_C are derived from the registry, not written a second time;
//   suppressed   the database enum values the registry does not hold, named (report, never a pass);
//   grounded     the read path drops a row whose kind the registry does not hold, and the bell's
//                dot is raised by the same rule, so nothing sends a member to an empty list.
//
// Usage: node tests/notifications.cjs
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..");
const ROW = "src/components/strand/NotificationListItem.tsx";
const READ = "src/lib/notifications.ts";
const TYPES = "src/lib/database.types.ts";
const C_SET = new Set(["connect", "convene", "collaborate", "contribute", "convey"]);

const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  (" + detail + ")" : ""));
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/**
 * Evaluates the row component for its module-level exports. The registry and the two maps derived
 * from it are plain data, so the component itself never runs; React and the two sibling modules are
 * stubbed because nothing this check reads touches them.
 */
function loadRow() {
  const source = read(ROW);
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: ROW,
  });
  const stub = new Proxy(
    {},
    {
      get: (_t, key) => (key === "__esModule" ? true : () => null),
    },
  );
  const module = { exports: {} };
  vm.runInNewContext(
    outputText,
    { module, exports: module.exports, require: () => stub },
    { filename: ROW },
  );
  return module.exports;
}

/** The database's own notification_kind values, from the generated types. */
function enumKinds() {
  const source = read(TYPES);
  const m = source.match(/notification_kind:\s*\[([^\]]*)\]/);
  if (!m) return null;
  return [...m[1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]);
}

const row = loadRow();
const registry = row.NOTIFICATION_REGISTRY;
const kinds = registry ? Object.keys(registry) : [];

// registry
record("registry: NOTIFICATION_REGISTRY is exported and holds at least one kind", kinds.length > 0);
for (const kind of kinds) {
  const entry = registry[kind];
  record(
    `registry: ${kind} resolves to a destination in words`,
    typeof entry.destination === "string" && entry.destination.trim().length > 0,
    String(entry && entry.destination),
  );
  record(`registry: ${kind} resolves to a C`, C_SET.has(entry.c), String(entry && entry.c));
}

// words: a kind in the registry that the row component has no sentence for would render an empty
// line under a destination, which reads as a broken row rather than a suppressed one.
const rowSource = read(ROW);
for (const kind of kinds)
  record(
    `words: ${kind} has a sentence in the row component`,
    rowSource.includes(`case "${kind}":`),
  );

// derived: one source. A second literal map keyed by kind is how the two fell out of step before.
record(
  "derived: DESTINATION is derived from the registry",
  Object.keys(row.DESTINATION || {}).join(",") === kinds.join(",") &&
    kinds.every((k) => row.DESTINATION[k] === registry[k].destination),
);
record(
  "derived: KIND_C is derived from the registry",
  Object.keys(row.KIND_C || {}).join(",") === kinds.join(",") &&
    kinds.every((k) => row.KIND_C[k] === registry[k].c),
);
// One source, proved by counting: a kind appears as an object key exactly once in the whole file,
// which is its registry row. A second map keyed by kind is how the glyph and the destination fell
// out of step before, and it is the shape ruling 547 refuses.
for (const kind of kinds) {
  const asKey = rowSource.match(new RegExp("(^|[\\s{,])" + kind + "\\s*:", "g")) || [];
  record(
    `derived: ${kind} is an object key exactly once (one source, no second map)`,
    asKey.length === 1,
    asKey.length + " occurrence(s)",
  );
}

// suppressed: the report ruling 547 puts in place of an exemption list.
const dbKinds = enumKinds();
if (dbKinds === null) {
  record("suppressed: notification_kind read from the generated types", false);
} else {
  record("suppressed: notification_kind read from the generated types", true, dbKinds.join(", "));
  const held = dbKinds.filter((k) => kinds.includes(k));
  const out = dbKinds.filter((k) => !kinds.includes(k));
  console.log(
    `  registry holds ${held.length} of ${dbKinds.length} database kinds: ${held.join(", ") || "none"}`,
  );
  for (const k of out) console.log(`  suppressed (no surface for its destination yet, G19): ${k}`);
  // A registry kind the database enum does not carry is not a defect: connection_request is written
  // by Connect's own path and the enum has not caught up. Named, not failed.
  for (const k of kinds.filter((x) => !dbKinds.includes(x)))
    console.log(`  in the registry, not yet in the database enum: ${k}`);
}

// grounded: the read path is where a suppressed row stops.
const readSource = read(READ);
record(
  "grounded: loadNotifications drops a row the registry does not hold",
  /\.filter\(\(r\) => isRenderedKind\(r\.kind\)\)/.test(readSource),
);
record(
  "grounded: hasUnread raises the dot by the same rule",
  /\.some\(\(r\) => isRenderedKind\(r\.kind\)\)/.test(readSource),
);

const fails = results.filter((r) => !r.ok);
console.log(`\n${results.length - fails.length}/${results.length} notification checks passed`);
if (fails.length) for (const f of fails) console.log(`  FAILED: ${f.name}`);
process.exit(fails.length ? 1 : 0);
