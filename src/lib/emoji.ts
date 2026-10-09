// Brief 14, handoff 56-41E (SPEC-41-E 2.1, 2.4; rulings 1351, 1404, 1405, 1406, 1576, 1577, 1578,
// 1584): the Messenger's emoji helpers and the one source Frimousse reads its data from.
//
// A reaction is the emoji character with at most one skin tone modifier, U+1F3FB to U+1F3FF, where
// its base takes one (1577). The five tones are emoji's own modifiers, not palette values (1404),
// each with the swatch the tone row draws and the key Frimousse names it by. Unchosen is no
// modifier (1576): the hands draw in --ink-4 and a native hand emoji carries no modifier.
//
// Frimousse's default resolver fetches emojibase-data from cdn.jsdelivr.net, which the CSP's
// connect-src 'self' refuses, and caches what it fetched in localStorage and sessionStorage, which
// 1351 bars from the Messenger. `resolveEmojiData` is the resolver the picker passes instead: it
// fetches the same two English files from the app's own origin, under public/emojibase/{version}/en/,
// shapes them exactly as Frimousse's own resolver does, filters to the emoji version this engine
// draws, and caches nothing anywhere. `defaultEmojiDataResolver` and `createEmojiDataCache` are never
// imported.
import type { EmojiData, EmojiDataResolver, SkinTone } from "frimousse";

/** The emojibase-data version self-hosted under public/emojibase/, the one message_reaction_emoji was seeded from. */
export const EMOJIBASE_VERSION = "17.0.0";

export type Tone = {
  /** Frimousse's key; `none` is unchosen. */
  key: SkinTone;
  /** The modifier character, or null for unchosen. */
  modifier: string | null;
  /** E5's label. */
  label: string;
  /** The swatch; null draws --ink-4. */
  hex: string | null;
};

/** E5, Not chosen first then the five, in modifier order. */
export const TONES: readonly Tone[] = [
  { key: "none", modifier: null, label: "Not chosen", hex: null },
  { key: "light", modifier: "\u{1F3FB}", label: "Light", hex: "#F7D7C4" },
  { key: "medium-light", modifier: "\u{1F3FC}", label: "Medium light", hex: "#E0BB95" },
  { key: "medium", modifier: "\u{1F3FD}", label: "Medium", hex: "#BF8F68" },
  { key: "medium-dark", modifier: "\u{1F3FE}", label: "Medium dark", hex: "#9B643D" },
  { key: "dark", modifier: "\u{1F3FF}", label: "Dark", hex: "#594539" },
];

const MODIFIER_RE = /[\u{1F3FB}-\u{1F3FF}]/u;

/** The tone a stored reaction carries, by its own modifier (2.1); unchosen when it carries none. */
export function toneOf(emoji: string | null | undefined): Tone {
  const m = MODIFIER_RE.exec(emoji ?? "");
  return (m && TONES.find((t) => t.modifier === m[0])) || (TONES[0] as Tone);
}

/** The tone a stored modifier character names; unchosen for null or anything else. */
export function toneFor(modifier: string | null | undefined): Tone {
  return TONES.find((t) => t.modifier === modifier) || (TONES[0] as Tone);
}

/** The base: the character with its modifier and variation selector removed, for comparing. */
export function baseOf(emoji: string | null | undefined): string {
  return (emoji ?? "").replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "").replace(/️/g, "");
}

/** The character to store: the base with the member's modifier where the base takes a tone. */
export function withTone(emoji: string, takesTone: boolean, modifier: string | null): string {
  if (!modifier || !takesTone) return emoji;
  return emoji.replace(/️/g, "") + modifier;
}

// ---------------------------------------------------------------------------------------------------
// The data resolver.
// ---------------------------------------------------------------------------------------------------

type RawSkin = { emoji: string; tone?: number | number[] | undefined };
type RawEmoji = {
  emoji: string;
  label: string;
  version: number;
  group?: number | undefined;
  subgroup?: number | undefined;
  tags?: string[] | undefined;
  skins?: RawSkin[] | undefined;
};
type RawMessages = {
  groups: { key: string; order: number; message: string }[];
  subgroups: { key: string; order: number; message: string }[];
  skinTones: { key: string; message: string }[];
};

const TONE_KEYS: Exclude<SkinTone, "none">[] = [
  "light",
  "medium-light",
  "medium",
  "medium-dark",
  "dark",
];

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Where the two files live on the app's own origin. */
export function emojiDataUrl(file: "data" | "messages"): string {
  return "/emojibase/" + EMOJIBASE_VERSION + "/en/" + file + ".json";
}

/**
 * Whether this engine draws `emoji` as one glyph rather than two: measured on a 2 px canvas in two
 * colours, as Frimousse's own resolver measures it, so an emoji newer than the platform's font is
 * left out rather than drawn as a box. A canvas that cannot be made answers true, which keeps the
 * whole set.
 */
function drawsAsOne(emoji: string): boolean {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return true;
    const px = 2;
    canvas.width = px;
    canvas.height = px;
    ctx.font =
      "2px 'Apple Color Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', 'Android Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', EmojiSymbols, sans-serif";
    ctx.textBaseline = "middle";
    if (ctx.measureText(emoji).width >= px * 2) return false;
    ctx.fillStyle = "#00f";
    ctx.fillText(emoji, 0, 0);
    const a = ctx.getImageData(0, 0, px, px).data;
    ctx.clearRect(0, 0, px, px);
    ctx.fillStyle = "#f00";
    ctx.fillText(emoji, 0, 0);
    const b = ctx.getImageData(0, 0, px, px).data;
    for (let i = 0; i < px * px * 4; i += 4)
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) return false;
    return true;
  } catch {
    return true;
  }
}

/** The newest emoji version this engine draws, from one sample emoji per version, newest first. */
function supportedVersion(emojis: RawEmoji[]): number {
  const sample = new Map<number, string>();
  for (const e of emojis) if (!sample.has(e.version)) sample.set(e.version, e.emoji);
  const versions = [...sample.keys()].sort((x, y) => y - x);
  for (const v of versions) if (drawsAsOne(sample.get(v) as string)) return v;
  return versions[0] ?? 0;
}

/**
 * Frimousse's `resolveEmojiData`: the two files from the app's origin, shaped as the library's own
 * resolver shapes them, nothing cached. The locale is always `en` here (E7, 1584: the library's
 * English group labels stand until localisation).
 */
export const resolveEmojiData: EmojiDataResolver = async (_locale, options) => {
  const signal = options.signal ?? null;
  const [emojis, messages] = await Promise.all([
    fetch(emojiDataUrl("data"), { signal, cache: "default" }).then((r) => {
      if (!r.ok) throw new Error("emoji data " + r.status);
      return r.json() as Promise<RawEmoji[]>;
    }),
    fetch(emojiDataUrl("messages"), { signal, cache: "default" }).then((r) => {
      if (!r.ok) throw new Error("emoji messages " + r.status);
      return r.json() as Promise<RawMessages>;
    }),
  ]);
  signal?.throwIfAborted();
  const grouped = emojis.filter((e) => typeof e.group === "number");
  const version = options.emojiVersion ?? supportedVersion(grouped);
  const flags = messages.subgroups.find(
    (s) => s.key === "country-flag" || s.key === "subdivision-flag",
  );
  const groups = messages.groups.filter((g) => g.key !== "component");
  const countryFlags = drawsAsOne("\u{1F1EA}\u{1F1FA}");
  const data: EmojiData = {
    locale: "en",
    categories: groups.map((g) => ({ index: g.order, label: capitalise(g.message) })),
    skinTones: messages.skinTones.reduce(
      (acc, t) => {
        if ((TONE_KEYS as string[]).includes(t.key))
          acc[t.key as Exclude<SkinTone, "none">] = capitalise(t.message);
        return acc;
      },
      {} as Record<Exclude<SkinTone, "none">, string>,
    ),
    emojis: grouped
      .filter((e) => e.version <= version)
      .filter((e) => countryFlags || !(flags && e.subgroup === flags.order))
      .map((e) => {
        const toned = (e.skins ?? []).filter((s) => typeof s.tone === "number");
        const skins = toned.length
          ? toned.reduce(
              (acc, s) => {
                const key = TONE_KEYS[(s.tone as number) - 1];
                if (key) acc[key] = s.emoji;
                return acc;
              },
              {} as Record<Exclude<SkinTone, "none">, string>,
            )
          : undefined;
        const aliases = (e.skins ?? []).filter((s) => Array.isArray(s.tone)).map((s) => s.emoji);
        return {
          emoji: e.emoji,
          category: e.group as number,
          version: e.version,
          label: capitalise(e.label),
          tags: e.tags ?? [],
          ...(flags && e.subgroup === flags.order ? { countryFlag: true as const } : {}),
          ...(skins ? { skins } : {}),
          ...(aliases.length ? { aliases } : {}),
        };
      }),
  };
  return data;
};
