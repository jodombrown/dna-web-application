// Migration drift (ruling 444, F25). The repo tree under supabase/migrations against the live
// supabase_migrations.schema_migrations, read through LIVE_DB_URL as live_arms (select only).
// Usage: LIVE_DB_URL=postgres://... node tests/migration-drift.cjs
//
// Three outcomes per row, stated by name:
//   PASS      the version exists on both sides and the recorded statement text matches the file
//             (trailing whitespace trimmed on both sides; the project records the file without its
//             final newline).
//   FAIL      a version on one side and not the other, or a statement text that differs from the
//             file. The run exits 1.
//   EMPTY     a recorded row whose statements are empty (the ruling 225 aftermath PASS-01 recorded:
//             fix_pr_01 and r229). Reported by name, not repaired here, and not counted as a pass.
// Without LIVE_DB_URL the arm reports UNPROVEN and exits 0 (ruling 228): nothing was measured.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { clientConfig } = require("./live-db.cjs");

const DIR = path.join(__dirname, "../supabase/migrations");

function md5(s) {
  return crypto.createHash("md5").update(s, "utf8").digest("hex");
}

(async () => {
  const url = process.env.LIVE_DB_URL;
  const files = fs
    .readdirSync(DIR)
    .filter((f) => /^\d{14}_.+\.sql$/.test(f))
    .sort();
  const repo = new Map(
    files.map((f) => {
      const version = f.slice(0, 14);
      const name = f.slice(15, -4);
      const text = fs.readFileSync(path.join(DIR, f), "utf8").replace(/\s+$/, "");
      return [version, { file: f, name, md5: md5(text) }];
    }),
  );
  console.log(`repo tree: ${repo.size} migrations`);
  if (!url) {
    console.log("UNPROVEN migration drift (ruling 444)  (set LIVE_DB_URL; nothing was measured)");
    process.exit(0);
  }
  let pg;
  try {
    pg = require("pg");
  } catch {
    console.log("UNPROVEN migration drift (ruling 444)  (the pg package is not installed)");
    process.exit(0);
  }
  const config = clientConfig(url);
  if (!config) {
    console.log(
      "UNPROVEN migration drift (ruling 444)  (LIVE_DB_URL is not a postgres:// connection string this arm can parse)",
    );
    process.exit(0);
  }
  let client;
  try {
    client = new pg.Client(config);
    await client.connect();
  } catch (e) {
    console.log(
      "UNPROVEN migration drift (ruling 444)  (could not connect: " + (e.message || e) + ")",
    );
    process.exit(0);
  }
  let rows;
  try {
    const r = await client.query(
      `select version, name,
              coalesce(array_length(statements, 1), 0) as n,
              md5(regexp_replace(array_to_string(statements, E'\\n'), '\\s+$', '')) as md5
       from supabase_migrations.schema_migrations order by version`,
    );
    rows = r.rows;
  } finally {
    await client.end().catch(() => {});
  }
  console.log(`live schema_migrations: ${rows.length} rows`);
  let fails = 0;
  let passes = 0;
  const empty = [];
  const seen = new Set();
  for (const row of rows) {
    seen.add(row.version);
    const local = repo.get(row.version);
    if (!local) {
      fails++;
      console.log(`FAIL ${row.version} ${row.name}: recorded on the project, no file in the tree`);
      continue;
    }
    if (!row.n) {
      empty.push(`${row.version} ${row.name}`);
      console.log(
        `EMPTY ${row.version} ${row.name}: recorded with empty statements; file ${local.file} carries the content`,
      );
      continue;
    }
    if (row.md5 !== local.md5) {
      fails++;
      console.log(
        `FAIL ${row.version} ${row.name}: statement md5 ${row.md5} differs from ${local.file} ${local.md5}`,
      );
      continue;
    }
    passes++;
    console.log(`PASS ${row.version} ${row.name}`);
  }
  for (const [version, local] of repo) {
    if (seen.has(version)) continue;
    fails++;
    console.log(
      `FAIL ${version} ${local.name}: in the tree as ${local.file}, not recorded on the project`,
    );
  }
  console.log(
    `\n${passes} matched, ${fails} drift, ${empty.length} empty (reported, not repaired: ${empty.join("; ") || "none"})`,
  );
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
