// Ruling 466 in the harness rather than by assertion: a migration file is never amended after it is
// applied, and a change is a new file with a new version. Seventeen of the drift rows Fix PR 02
// repaired were all that shape, which is why this is a gate and not a habit.
//
// The boundary is discovered, never hardcoded. Two readings, both keyed on the 14-digit version
// rather than on the path:
//
//   base   every file matching ^\d{14}_.+\.sql$ anywhere in the tree at the merge base with the
//          default branch, with its blob hash;
//   head   the same as it stands in the working tree, hashed the way git hashes a blob, so an
//          amendment is caught before it is committed as well as after.
//
// A version present at the base and in the working tree with a different content hash is an amendment:
// FAIL, by name. A version present at the base and absent from the tree entirely is a removal: FAIL. A
// version that only moved to another directory is neither, and passes, which is what the G17 baseline PR
// (rulings 539, 543) performs: it relocates the historical files out of the directory the drift arm
// scans. Keying on version and searching the whole tree is what lets that PR land without editing
// this lint, and it is why there is no date and no file list in here.
//
// A new version in the working tree always passes: that is how ruling 466 says a change is made.
// Two files carrying the same version fail, because Supabase matches by version only.
//
// Ruling 228: if the base cannot be resolved (no remote, a shallow clone with no merge base) the
// lint reports UNPROVEN and exits 0. Nothing was measured, and that is not a pass.
//
// Usage: node tests/migration-lint.cjs
//   MIGRATION_LINT_BASE=<ref>  compare against this ref instead of the discovered default branch.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const VERSIONED = /(^|\/)(\d{14})_[^/]+\.sql$/;

// Ruling 564. `add column c <type> default (...)` does not leave existing rows alone: since Postgres 11
// a default that is not volatile takes the fast path instead of rewriting the table, so the expression
// is evaluated once, stored as the column's missing value, and read back by every pre-existing row.
// `now()` is STABLE, which is how 20260913220000_r482_485_introduction_expiry_purge.sql stamped one
// timestamp onto all ten connection_requests rows while its own header said the column was nullable
// with no backfill (ruling 563). Splitting it leaves existing rows null:
//
//   alter table t add column c timestamptz;
//   alter table t alter column c set default (now() + ...);
//
// A linter cannot read intent, so this does not try to. Either split the statement, or keep the single
// statement and write the marker above it declaring that reaching existing rows is meant. The marker is
// what stops a legitimate backfill from being a false positive, because a guardrail that cries wolf is
// a guardrail somebody deletes.
//
// `not null default` is exempt: reaching every existing row is what makes the constraint hold, so the
// single statement is right there. b4_connect_tables (`message text not null default ''`) and
// b5_stance_onboarding (`username_changes smallint not null default 0`) are both that shape.
//
// Only versions added in this change are scanned. An applied migration is never amended (ruling 466),
// so flagging one would be a gate nobody can pass, 20260913220000 being the example.
const BACKFILL_MARKER = /ruling\s*564[^\n]*backfill\s+intended/i;
const ADD_COLUMN = /\badd\s+column\s+(?:if\s+not\s+exists\s+)?("[^"]+"|[a-z_][a-z0-9_$]*)/gi;

/** Blank the inside of dollar-quoted bodies, keeping newlines so line numbers still line up. */
function blankDollarQuoted(sql) {
  return sql.replace(/\$([a-z_]*)\$[\s\S]*?\$\1\$/gi, (body) => body.replace(/[^\n]/g, " "));
}

/** The clause at `from`, ending at the first comma or semicolon outside parentheses. */
function clauseAt(sql, from) {
  let depth = 0;
  for (let i = from; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (depth === 0 && (ch === "," || ch === ";")) return sql.slice(from, i);
  }
  return sql.slice(from);
}

/** Every `add column` in this file that carries a default, is nullable, and is not marked. */
function unmarkedNullableDefaults(file) {
  const sql = blankDollarQuoted(fs.readFileSync(path.join(ROOT, file), "utf8"));
  const lines = sql.split("\n");
  const found = [];
  ADD_COLUMN.lastIndex = 0;
  let m;
  while ((m = ADD_COLUMN.exec(sql)) !== null) {
    const raw = clauseAt(sql, m.index);
    const clause = raw.replace(/--[^\n]*/g, " ");
    if (!/\bdefault\b/i.test(clause)) continue;
    if (/\bnot\s+null\b/i.test(clause)) continue;
    const line = sql.slice(0, m.index).split("\n").length;
    // The marker sits on the clause itself or within the two lines above it.
    const context = lines.slice(Math.max(0, line - 3), line).join("\n");
    if (BACKFILL_MARKER.test(context) || BACKFILL_MARKER.test(raw)) continue;
    found.push({ file, line, column: m[1].replace(/"/g, "") });
  }
  return found;
}

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

/** Collect version -> { path, hash } from (path, hash) pairs, naming any version claimed twice. */
function collect(pairs) {
  const found = new Map();
  const duplicates = [];
  for (const [file, hash] of pairs) {
    const m = VERSIONED.exec(file);
    if (!m) continue;
    const version = m[2];
    if (found.has(version)) duplicates.push(`${version}: ${found.get(version).path} and ${file}`);
    else found.set(version, { path: file, hash });
  }
  return { found, duplicates };
}

/** Every versioned migration recorded in a commit, with its blob hash. */
function treeOf(ref) {
  const out = gitOrNull(["ls-tree", "-r", ref]);
  if (out === null) return null;
  const pairs = [];
  for (const line of out.split("\n")) {
    if (!line) continue;
    // <mode> blob <hash>\t<path>
    const tab = line.indexOf("\t");
    if (tab < 0) continue;
    const parts = line.slice(0, tab).split(/\s+/);
    if (parts[1] !== "blob") continue;
    pairs.push([line.slice(tab + 1), parts[2]]);
  }
  return collect(pairs);
}

/**
 * Every versioned migration as it stands on disk right now, hashed the way git would hash it.
 *
 * The working tree and not HEAD, deliberately. Reading the commit would mean an amendment only
 * becomes visible once it has been committed, so a contributor running this before committing — the
 * one moment the answer is still cheap — would be told the tree is clean. Tracked, staged and new
 * untracked files are all included, which is also what makes a not-yet-committed new migration
 * report as new rather than as missing.
 */
function workingTree() {
  const listed = gitOrNull(["ls-files", "--cached", "--others", "--exclude-standard"]);
  if (listed === null) return null;
  const files = [...new Set(listed.split("\n").filter((f) => VERSIONED.test(f)))];
  if (files.length === 0) return collect([]);
  // One git process for every hash: --stdin-paths answers in the order it was asked.
  let hashes;
  try {
    hashes = execFileSync("git", ["hash-object", "--stdin-paths"], {
      cwd: ROOT,
      encoding: "utf8",
      input: files.join("\n") + "\n",
      stdio: ["pipe", "pipe", "pipe"],
    })
      .trim()
      .split("\n");
  } catch {
    return null;
  }
  if (hashes.length !== files.length) return null;
  return collect(files.map((f, i) => [f, hashes[i]]));
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

const head = workingTree();
const old = treeOf(base);
if (!head || !old) unproven("git could not read one of the two trees");

console.log(`base ${base.slice(0, 12)}: ${old.found.size} versioned migrations`);
console.log(`working tree: ${head.found.size} versioned migrations`);

// One version, one file. Supabase matches by version only, so two files sharing one is ambiguous
// before it is anything else.
record(
  "one file per version",
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

const unmarked = [];
for (const v of added) unmarked.push(...unmarkedNullableDefaults(head.found.get(v).path));
for (const u of unmarked)
  record(
    `${u.file}:${u.line} stamps ${u.column} onto existing rows (ruling 564)`,
    false,
    "a nullable column added with a default reaches every pre-existing row through the catalog's " +
      "missing value; split the statement, or mark the backfill as intended above it",
  );
record(
  "no new migration adds a nullable column with a default (ruling 564)",
  unmarked.length === 0,
  unmarked.length
    ? `${unmarked.length} to split or mark`
    : `${added.length} new migration(s) checked`,
);

console.log(
  `\n${added.length} new, ${moved} moved, ${amended} amended, ${removed} removed, ` +
    `measured against ${base.slice(0, 12)}`,
);
const fails = results.filter((r) => !r.ok);
console.log(`${results.length - fails.length}/${results.length} migration lint checks passed`);
process.exit(fails.length ? 1 : 0);
