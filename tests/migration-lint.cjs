// Ruling 466 in the harness rather than by assertion: a migration file is never amended after it is
// applied, and a change is a new file with a new version. Seventeen of the drift rows Fix PR 02
// repaired were all that shape, which is why this is a gate and not a habit.
//
// The boundary is discovered, never hardcoded. Two readings, both keyed on the 14-digit version
// rather than on the path:
//
//   base   every file matching ^\d{14}_.+\.sql$ anywhere in the tree at the merge base with the
//          default branch, with its blob hash;
//   head   the same at HEAD.
//
// A version present at the base and at HEAD with a different content hash is an amendment: FAIL, by
// name. A version present at the base and absent from HEAD entirely is a removal: FAIL. A version
// that only moved to another directory is neither, and passes, which is what the G17 baseline PR
// (rulings 539, 543) performs: it relocates the historical files out of the directory the drift arm
// scans. Keying on version and searching the whole tree is what lets that PR land without editing
// this lint, and it is why there is no date and no file list in here.
//
// A new version at HEAD always passes: that is how ruling 466 says a change is made.
// Two files carrying the same version at HEAD fail, because Supabase matches by version only.
//
// Ruling 228: if the base cannot be resolved (no remote, a shallow clone with no merge base) the
// lint reports UNPROVEN and exits 0. Nothing was measured, and that is not a pass.
//
// Usage: node tests/migration-lint.cjs
//   MIGRATION_LINT_BASE=<ref>  compare against this ref instead of the discovered default branch.
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const VERSIONED = /(^|\/)(\d{14})_[^/]+\.sql$/;

const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  (" + detail + ")" : ""));
};
const unproven = (why) => {
  console.log("UNPROVEN migration lint (ruling 466)  (" + why + ")");
  process.exit(0);
};

function git(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}
function gitOrNull(args) {
  try {
    return git(args).trim();
  } catch {
    return null;
  }
}

/**
 * Every versioned migration in one tree, as version -> { path, hash }. `git ls-tree -r` gives the
 * blob hash, so nothing is read twice and a move with no edit is visibly the same object.
 */
function treeOf(ref) {
  const out = gitOrNull(["ls-tree", "-r", ref]);
  if (out === null) return null;
  const found = new Map();
  const duplicates = [];
  for (const line of out.split("\n")) {
    if (!line) continue;
    // <mode> blob <hash>\t<path>
    const tab = line.indexOf("\t");
    if (tab < 0) continue;
    const file = line.slice(tab + 1);
    const m = VERSIONED.exec(file);
    if (!m) continue;
    const parts = line.slice(0, tab).split(/\s+/);
    if (parts[1] !== "blob") continue;
    const version = m[2];
    if (found.has(version)) duplicates.push(`${version}: ${found.get(version).path} and ${file}`);
    else found.set(version, { path: file, hash: parts[2] });
  }
  return { found, duplicates };
}

/** The ref the change is measured against: the merge base with the default branch. */
function baseRef() {
  if (process.env.MIGRATION_LINT_BASE) return process.env.MIGRATION_LINT_BASE;
  // The default branch as the remote itself reports it, then the conventional name. Discovered, so
  // a repository that renames its default branch needs no edit here.
  const symbolic = gitOrNull(["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"]);
  const candidates = [];
  if (symbolic) candidates.push(symbolic.replace(/^refs\/remotes\//, ""));
  candidates.push("origin/main", "origin/master");
  for (const ref of candidates) {
    if (gitOrNull(["rev-parse", "--verify", "--quiet", ref]) === null) continue;
    const mb = gitOrNull(["merge-base", "HEAD", ref]);
    if (mb) return mb;
  }
  return null;
}

const base = baseRef();
if (base === null)
  unproven(
    "no merge base with a default branch is reachable from this checkout; set MIGRATION_LINT_BASE",
  );

const head = treeOf("HEAD");
const old = treeOf(base);
if (!head || !old) unproven("git could not read one of the two trees");

console.log(`base ${base.slice(0, 12)}: ${old.found.size} versioned migrations`);
console.log(`HEAD: ${head.found.size} versioned migrations`);

// One version, one file. Supabase matches by version only, so two files sharing one is ambiguous
// before it is anything else.
record(
  "one file per version at HEAD",
  head.duplicates.length === 0,
  head.duplicates.join("; ") || "no duplicate versions",
);

let amended = 0;
let removed = 0;
let moved = 0;
for (const [version, was] of old.found) {
  const now = head.found.get(version);
  if (!now) {
    removed++;
    record(
      `${version} still exists in the tree`,
      false,
      `applied as ${was.path} and now absent; ruling 466 makes a change a new migration, never a removal`,
    );
    continue;
  }
  if (now.hash !== was.hash) {
    amended++;
    record(
      `${version} is byte-identical to the applied file`,
      false,
      `${was.path} -> ${now.path} changed content; add a new migration instead (ruling 466)`,
    );
    continue;
  }
  if (now.path !== was.path) {
    moved++;
    console.log(`  moved, content unchanged: ${version} ${was.path} -> ${now.path}`);
  }
}

const added = [...head.found.keys()].filter((v) => !old.found.has(v));
for (const v of added) console.log(`  new migration: ${v} ${head.found.get(v).path}`);

record(
  "no applied migration file was amended",
  amended === 0,
  amended ? `${amended} amended` : `${old.found.size} unchanged`,
);
record(
  "no applied migration file was removed",
  removed === 0,
  removed ? `${removed} removed` : "none",
);

console.log(
  `\n${added.length} new, ${moved} moved, ${amended} amended, ${removed} removed, ` +
    `measured against ${base.slice(0, 12)}`,
);
const fails = results.filter((r) => !r.ok);
console.log(`${results.length - fails.length}/${results.length} migration lint checks passed`);
process.exit(fails.length ? 1 : 0);
