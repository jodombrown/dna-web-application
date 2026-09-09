#!/usr/bin/env node
// Ruling 200. Turns gdb's absolute frame addresses into library-relative offsets.
//
// The shipped WPE build has no debug info and gdb prints "??" for every WebKit frame, which means
// these are internal functions with no exported symbol near them. Resolving to the nearest exported
// symbol from .dynsym would therefore name a function that is not the one in the frame, so this
// deliberately does not do that. What it produces instead is the offset into the mapped library
// plus that library's build id, which is an exact, checkable anchor: anyone with a debug build or
// the matching WebKit source can map these to lines, and anyone with a different build can tell
// immediately that they cannot.
//
// Usage: node scripts/frame-offsets.mjs <gdb-output-file> [buildid-file]
import { readFileSync } from "node:fs";

const [, , gdbPath, buildIdPath] = process.argv;
if (!gdbPath) {
  console.error("usage: frame-offsets.mjs <gdb-output-file> [buildid-file]");
  process.exit(2);
}
const text = readFileSync(gdbPath, "utf8");

/** `info sharedlibrary` rows: From, To, Syms, path. Only the mapped range and the path matter. */
function libraries(src) {
  const out = [];
  for (const line of src.split("\n")) {
    const m = line.match(/^(0x[0-9a-f]+)\s+(0x[0-9a-f]+)\s+\S+(?:\s+\(\*\))?\s+(\/\S+)/i);
    if (m) out.push({ from: BigInt(m[1]), to: BigInt(m[2]), path: m[3] });
  }
  return out;
}

/**
 * Backtrace frames, grouped by whatever header precedes them.
 *
 * gdb's `bt` on the current thread — which in a core is the thread that faulted, and so the only
 * one worth reading — emits frames with NO `Thread N` header at all. Grouping strictly by that
 * header silently drops exactly those frames, which is what happened to run 40. Frames are
 * therefore attached to the most recent header of either kind, and frames that appear before any
 * header open an implicit group rather than being discarded.
 */
function threads(src) {
  const out = [];
  let cur = null;
  const open = (name) => {
    cur = { name, frames: [] };
    out.push(cur);
    return cur;
  };
  for (const line of src.split("\n")) {
    const marker = line.match(/^===\s*(.+?)\s*===$/);
    if (marker) {
      open(marker[1]);
      continue;
    }
    const t = line.match(/^Thread\s+(\d+)\s+\(([^)]*)\)/);
    if (t) {
      open(`Thread ${t[1]} (${t[2]})`);
      continue;
    }
    const f = line.match(/^#(\d+)\s+(0x[0-9a-f]+)\s+in\s+(.*)$/i);
    if (!f) continue;
    if (!cur) open("current thread (no header; gdb bt)");
    cur.frames.push({ n: Number(f[1]), addr: BigInt(f[2]), what: f[3].trim() });
  }
  return out.filter((g) => g.frames.length);
}

const libs = libraries(text);
const ts = threads(text);
const hex = (v) => "0x" + v.toString(16);

if (buildIdPath) {
  try {
    const id = readFileSync(buildIdPath, "utf8").match(/Build ID:?\s*([0-9a-f]+)/i);
    if (id) console.log(`library build id: ${id[1]}`);
  } catch {}
}
if (!libs.length) console.log("no `info sharedlibrary` table found; offsets cannot be computed");

for (const t of ts) {
  console.log(`\n${t.name}`);
  // A frame whose address falls in no mapped library is left absolute rather than guessed at.
  const seen = new Map();
  for (const f of t.frames) {
    const lib = libs.find((l) => f.addr >= l.from && f.addr < l.to);
    const rel = lib ? f.addr - lib.from : null;
    const base = lib ? lib.path.replace(/^.*\//, "") : "";
    const label = rel === null ? `${hex(f.addr)} (unmapped)` : `${base}+${hex(rel)}`;
    if (rel !== null) seen.set(label, (seen.get(label) || 0) + 1);
    console.log(`  #${String(f.n).padStart(2)} ${label}   ${f.what}`);
  }
  const repeats = [...seen.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
  if (repeats.length) {
    console.log("  repeating offsets (a cycle here means a recursive walk):");
    for (const [label, n] of repeats) console.log(`    ${n}x  ${label}`);
  }
}
