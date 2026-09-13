#!/usr/bin/env node
// Ruling 485, delivered by Design pass 01's B14 item 3: every token a surface cites resolves in
// both themes. A token that is declared only under [data-theme="dark"] resolves to nothing on the
// light theme, and a token that is cited but declared nowhere resolves to nothing on either; both
// render as an unstyled value rather than an error, which is why this is a CI check and not a
// runtime one. W59 found the Feed citing a token that did not exist at all.
//
// The check is static, so it needs no browser and no deployment: it reads the declarations out of
// src/styles/strand.css and every var(--x) out of the sources that ship.
//
// Usage: node scripts/token-check.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOKENS = path.join(ROOT, "src/styles/strand.css");
const SCAN = [path.join(ROOT, "src"), path.join(ROOT, "public/strand")];
const EXT = new Set([".ts", ".tsx", ".css", ".svg", ".html"]);

/**
 * Tailwind's own generated layer (src/styles.css) declares and consumes a separate shadcn ramp that
 * Strand does not own. It is excluded from both halves so this check speaks only for Strand's
 * tokens; rulings 70 and 72 keep the two apart, and mixing them here would report noise.
 */
const EXCLUDE = new Set([path.join(ROOT, "src/styles.css")]);

/**
 * src/components/ui is the shadcn layer Lovable generates, on its own ramp and on Radix's runtime
 * custom properties (--radix-*). Rulings 70 and 72 keep Strand and that layer apart; a Strand token
 * check that walked into it would report Radix's properties as missing declarations.
 */
const EXCLUDE_DIRS = [path.join(ROOT, "src/components/ui")];

/** Local custom properties a component declares on itself, resolved on the element, not the theme. */
const LOCAL = /^--_/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(p)) walk(p, out);
    } else if (EXT.has(path.extname(e.name)) && !EXCLUDE.has(p)) out.push(p);
  }
  return out;
}

/** The custom properties declared inside one CSS block, by selector. */
function declaredIn(css, selector) {
  const names = new Set();
  const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{", "g");
  let m;
  while ((m = re.exec(css))) {
    let depth = 1;
    let i = re.lastIndex;
    for (; i < css.length && depth > 0; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
    }
    for (const d of css.slice(re.lastIndex, i).matchAll(/(^|[;{\s])(--[A-Za-z0-9_-]+)\s*:/g))
      names.add(d[2]);
  }
  return names;
}

const css = fs.readFileSync(TOKENS, "utf8");
const light = declaredIn(css, ":root");
const dark = declaredIn(css, '[data-theme="dark"]');

// Every token the sources cite, with the first file that cites it.
const cited = new Map();
for (const file of SCAN.flatMap((d) => walk(d))) {
  const text = fs.readFileSync(file, "utf8");
  // A bare var(--x) must resolve. var(--x, fallback) already carries its own answer, which is how
  // env(safe-area-inset-bottom, var(--safe-bottom, 0px)) is written and why it is not a defect.
  for (const m of text.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*([,)])/g)) {
    const name = m[1];
    if (LOCAL.test(name) || m[2] === ",") continue;
    // A component may build a token name, e.g. "var(--c-" + c + ")". The trailing hyphen is the
    // tell: the prefix is checked instead of the literal.
    const key = name.endsWith("-") ? name + "*" : name;
    if (!cited.has(key)) cited.set(key, path.relative(ROOT, file));
  }
  for (const m of text.matchAll(/"var\(\s*(--[A-Za-z0-9_-]*-)"\s*\+/g))
    if (!cited.has(m[1] + "*")) cited.set(m[1] + "*", path.relative(ROOT, file));
}

const missing = [];
const lightOnlyDark = [];
for (const [name, where] of cited) {
  if (name.endsWith("*")) {
    // A computed prefix: at least one token with that prefix must exist in :root.
    const stem = name.slice(0, -1);
    const any = [...light].some((t) => t.startsWith(stem));
    if (!any) missing.push({ name, where });
    continue;
  }
  if (light.has(name)) continue;
  if (dark.has(name)) lightOnlyDark.push({ name, where });
  else missing.push({ name, where });
}

// A dark override with no light declaration is the same defect seen from the other side.
const darkOnly = [...dark].filter((t) => !light.has(t));

const lines = [];
for (const { name, where } of missing)
  lines.push(`${name} is cited by ${where} and declared in neither theme`);
for (const { name, where } of lightOnlyDark)
  lines.push(`${name} is cited by ${where} and declared only under [data-theme="dark"]`);
for (const name of darkOnly)
  if (!lines.some((l) => l.startsWith(name + " ")))
    lines.push(
      `${name} is declared only under [data-theme="dark"] and resolves to nothing on light`,
    );

console.log(
  `token check (ruling 485): ${light.size} declared on :root, ${dark.size} overridden on dark, ` +
    `${cited.size} cited across src and public/strand`,
);
if (lines.length === 0) {
  console.log("every cited token resolves in both themes");
  process.exit(0);
}
console.error("\nFAIL: a token does not resolve in both themes\n");
for (const l of lines) console.error("  " + l);
process.exit(1);
