// W91 (Fix PR 10 item 6; handoff 59-FIX-10): the Messenger's avatar cache in src/lib/messenger-media.ts
// keeps the time each signed URL was signed and signs again once an entry is older than the signing
// lifetime less its margin, both named in src/lib/media.ts beside the lifetime deliverImageUrl asks
// for. Static: the module is transpiled with its two imports stubbed, React's hooks as no-ops and
// deliverImageUrl as a counter, so the arm reads the cache's own decisions and nothing else.
//
// Arms:
//   held     a second ask inside the margin answers the first signing, with one call to the signer;
//   aged     an ask past the margin signs again, and the aged entry is replaced, not kept beside;
//   dropped  dropAvatarUrl forgets an entry, so the next ask signs again whatever its age;
//   named    the margin is read from media.ts's constants, never a number repeated here.
//
// Usage: node tests/avatar-cache.cjs
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..");
const MODULE = "src/lib/messenger-media.ts";
const MEDIA = "src/lib/media.ts";

const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  (" + detail + ")" : ""));
};

/** The two constants as media.ts declares them, read from the source rather than retyped. */
function mediaConstants() {
  const src = fs.readFileSync(path.join(ROOT, MEDIA), "utf8");
  const seconds = /export const SIGNED_URL_SECONDS = ([^;]+);/.exec(src);
  const margin = /export const SIGNED_URL_MARGIN_SECONDS = ([^;]+);/.exec(src);
  if (!seconds || !margin) return null;
  return {
    SIGNED_URL_SECONDS: Function("return (" + seconds[1] + ")")(),
    SIGNED_URL_MARGIN_SECONDS: Function("return (" + margin[1] + ")")(),
  };
}

function load(constants) {
  const source = fs.readFileSync(path.join(ROOT, MODULE), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: MODULE,
  });
  const calls = [];
  const noop = () => undefined;
  const stubs = {
    react: {
      useCallback: (f) => f,
      useEffect: noop,
      useRef: (v) => ({ current: v }),
      useState: (v) => [v, noop],
    },
    "./media": {
      ...constants,
      deliverImageUrl: async (bucket, p, transform) => {
        calls.push({ bucket, p, transform });
        return "https://signed.invalid/" + p + "?n=" + calls.length;
      },
      fetchMessageMedia: async () => null,
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(
    outputText,
    {
      module,
      exports: module.exports,
      require: (name) => {
        if (!(name in stubs)) throw new Error("unexpected import " + name);
        return stubs[name];
      },
      Image: undefined,
    },
    { filename: MODULE },
  );
  return { api: module.exports, calls };
}

(async () => {
  const constants = mediaConstants();
  if (!constants) {
    record("named: media.ts declares SIGNED_URL_SECONDS and SIGNED_URL_MARGIN_SECONDS", false);
  } else {
    const { api, calls } = load(constants);
    const resignMs = (constants.SIGNED_URL_SECONDS - constants.SIGNED_URL_MARGIN_SECONDS) * 1000;
    record(
      "named: the cache's re-sign age is the lifetime less the margin, from media.ts's constants",
      api.AVATAR_RESIGN_MS === resignMs && constants.SIGNED_URL_MARGIN_SECONDS > 0,
      "AVATAR_RESIGN_MS " + api.AVATAR_RESIGN_MS + ", expected " + resignMs,
    );
    const t0 = 1_000_000;
    const first = await api.avatarUrl("m/avatar.png", 44, t0);
    const held = await api.avatarUrl("m/avatar.png", 44, t0 + resignMs - 1);
    record(
      "held: a second ask inside the margin answers the first signing with one call to the signer",
      first === held && calls.length === 1,
      "calls " + calls.length,
    );
    const aged = await api.avatarUrl("m/avatar.png", 44, t0 + resignMs);
    const agedAgain = await api.avatarUrl("m/avatar.png", 44, t0 + resignMs + 10);
    record(
      "aged: an ask past the margin signs again, and the new entry is the one held after it",
      aged !== first && calls.length === 2 && agedAgain === aged,
      "calls " + calls.length,
    );
    api.dropAvatarUrl("m/avatar.png", 44);
    const dropped = await api.avatarUrl("m/avatar.png", 44, t0 + resignMs + 20);
    record(
      "dropped: dropAvatarUrl forgets the entry, so the next ask signs again whatever its age",
      dropped !== aged && calls.length === 3,
      "calls " + calls.length,
    );
    const other = await api.avatarUrl("m/avatar.png", 88, t0 + resignMs + 20);
    record(
      "a different size is its own entry",
      other !== dropped && calls.length === 4 && calls[3].transform.width === 176,
      "calls " + calls.length,
    );
  }
  const fails = results.filter((r) => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} avatar cache checks passed`);
  process.exit(fails.length ? 1 : 0);
})();
