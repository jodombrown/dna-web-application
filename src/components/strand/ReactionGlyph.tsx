// Proposed to Strand (ruling 1533, SPEC-41-E section 8): the reaction glyph set, drawn from the
// page `messages/B14-Messenger-v3.dc.html` at `v1791487330148240`, its `glyph(id, size, fill)`.
// Strand carries no such part at compile v1790724894917128; this file is the build's port of the
// page's drawing until Strand lands one, and it is listed in `docs/strand-ports/` as proposed.
//
// The eight quick glyphs are drawn, never platform emoji (1404): 24px SVGs in Strand's palette.
// Faces are a --c-contribute disc with --ink features and --info tears; the heart is --c-convey; the
// party is a --c-convene cone with confetti in --c-contribute, --c-collaborate and --c-convey; the
// three hands take the fill the caller passes, the stored reaction's own tone or --ink-4 when it
// carries none (1576), with a 1.2 --ink outline. The glyph is keyed by the character it draws, so a
// stored reaction finds its drawing by its base; the label it is named by comes from the
// `message_reaction_quick` vocabulary, never from here.
import type { CSSProperties, ReactNode } from "react";

export type ReactionGlyphId =
  "thumbs_up" | "heart" | "folded_hands" | "clap" | "party" | "laugh" | "surprised" | "cry";

/** The base character each glyph draws, without a variation selector or a modifier. */
const BY_BASE: Record<string, ReactionGlyphId> = {
  "\u{1F44D}": "thumbs_up",
  "❤": "heart",
  "\u{1F64F}": "folded_hands",
  "\u{1F44F}": "clap",
  "\u{1F389}": "party",
  "\u{1F602}": "laugh",
  "\u{1F62E}": "surprised",
  "\u{1F622}": "cry",
};

const HANDS: ReactionGlyphId[] = ["thumbs_up", "folded_hands", "clap"];

/** The drawn glyph for an emoji string, or null where the glyph set holds none (a native emoji). */
export function reactionGlyphId(emoji: string | null | undefined): ReactionGlyphId | null {
  const base = (emoji ?? "").replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "").replace(/️/g, "");
  return BY_BASE[base] ?? null;
}

/** Whether the glyph is one of the three hands, which take a tone fill. */
export function reactionGlyphTakesTone(id: ReactionGlyphId): boolean {
  return HANDS.includes(id);
}

export type ReactionGlyphProps = {
  id: ReactionGlyphId;
  size?: number | undefined;
  /** The hands' fill: a tone's hex, or nothing for --ink-4. Ignored by the faces, heart and party. */
  fill?: string | null | undefined;
  style?: CSSProperties | undefined;
};

export function ReactionGlyph({ id, size = 24, fill, style }: ReactionGlyphProps) {
  const tone = fill || "var(--ink-4)";
  const ink = "var(--ink)";
  const gold = "var(--c-contribute)";
  const s: CSSProperties = { width: size, height: size, display: "block", flex: "none", ...style };
  const svg = (children: ReactNode) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={s} data-glyph={id}>
      {children}
    </svg>
  );
  const face = (children: ReactNode) =>
    svg(
      <>
        <circle cx={12} cy={12} r={10} fill={gold} />
        {children}
      </>,
    );
  switch (id) {
    case "thumbs_up":
      return svg(
        <>
          <path
            d="M7 10v10.5H4.5A1.5 1.5 0 0 1 3 19V11.5A1.5 1.5 0 0 1 4.5 10H7z"
            fill={tone}
            stroke={ink}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
          <path
            d="M7 10l4.1-7A2.1 2.1 0 0 1 15 4.2L14.2 9h4.6a2 2 0 0 1 2 2.3l-1.1 7.2a2.4 2.4 0 0 1-2.4 2H7z"
            fill={tone}
            stroke={ink}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
        </>,
      );
    case "heart":
      return svg(
        <path
          d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
          fill="var(--c-convey)"
        />,
      );
    case "folded_hands":
      return svg(
        <>
          <rect
            x={6.2}
            y={3.5}
            width={5.2}
            height={17}
            rx={2.6}
            transform="rotate(-13 8.8 12)"
            fill={tone}
            stroke={ink}
            strokeWidth={1.2}
          />
          <rect
            x={12.6}
            y={3.5}
            width={5.2}
            height={17}
            rx={2.6}
            transform="rotate(13 15.2 12)"
            fill={tone}
            stroke={ink}
            strokeWidth={1.2}
          />
        </>,
      );
    case "clap":
      return svg(
        <>
          <path
            d="M12 2.5v3M8.2 3.6l1.4 2.6M15.8 3.6l-1.4 2.6"
            stroke={ink}
            strokeWidth={1.3}
            strokeLinecap="round"
            fill="none"
          />
          <rect
            x={3.5}
            y={9}
            width={5.4}
            height={12}
            rx={2.7}
            transform="rotate(-32 6.2 15)"
            fill={tone}
            stroke={ink}
            strokeWidth={1.2}
          />
          <rect
            x={15.1}
            y={9}
            width={5.4}
            height={12}
            rx={2.7}
            transform="rotate(32 17.8 15)"
            fill={tone}
            stroke={ink}
            strokeWidth={1.2}
          />
        </>,
      );
    case "party":
      return svg(
        <>
          <path d="M3 21l5.6-14.2 8.6 8.6z" fill="var(--c-convene)" />
          <path
            d="M13.5 9.5c2.2-2.2 3.4-1.2 5.5-3.3"
            stroke={gold}
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
          />
          <circle cx={16} cy={4} r={1.6} fill={gold} />
          <circle cx={20.5} cy={8.5} r={1.5} fill="var(--c-collaborate)" />
          <circle cx={12.5} cy={3.2} r={1.2} fill="var(--c-convey)" />
          <circle cx={21} cy={3} r={1.2} fill="var(--c-convey)" />
        </>,
      );
    case "laugh":
      return face(
        <>
          <path
            d="M7 10c1-1.6 2.6-1.6 3.6 0M13.4 10c1-1.6 2.6-1.6 3.6 0"
            stroke={ink}
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
          />
          <path d="M7 13.4h10c0 3.1-2.2 5.2-5 5.2s-5-2.1-5-5.2z" fill={ink} />
          <path
            d="M4.1 12.6c-1 1.6-1 3 0 3s1-1.4 0-3zM19.9 12.6c-1 1.6-1 3 0 3s1-1.4 0-3z"
            fill="var(--info)"
          />
        </>,
      );
    case "surprised":
      return face(
        <>
          <circle cx={9} cy={9.6} r={1.3} fill={ink} />
          <circle cx={15} cy={9.6} r={1.3} fill={ink} />
          <ellipse cx={12} cy={15.2} rx={2} ry={2.7} fill={ink} />
        </>,
      );
    case "cry":
      return face(
        <>
          <circle cx={9} cy={10} r={1.2} fill={ink} />
          <circle cx={15} cy={10} r={1.2} fill={ink} />
          <path
            d="M8.4 16.6c1.3-1.7 5.9-1.7 7.2 0"
            stroke={ink}
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
          />
          <path d="M15.4 11.6c-1.3 2.1-1.5 3.8 0 3.8s1.3-1.7 0-3.8z" fill="var(--info)" />
        </>,
      );
    default:
      return null;
  }
}

/**
 * One reaction's visual at `size`: the drawn glyph for the eight, with the stored character's own
 * tone on a hand (2.1), and the native character for everything else (2.3).
 */
export function ReactionMark({
  emoji,
  size,
  toneFill,
  style,
}: {
  emoji: string;
  size: number;
  /** The hex of the tone the character's own modifier names, or null for --ink-4. */
  toneFill: string | null;
  style?: CSSProperties | undefined;
}) {
  const id = reactionGlyphId(emoji);
  if (id) return <ReactionGlyph id={id} size={size} fill={toneFill} style={style} />;
  return (
    <span
      aria-hidden="true"
      data-native-emoji
      style={{
        fontSize: Math.round(size * 0.86),
        lineHeight: 1,
        display: "block",
        flex: "none",
        ...style,
      }}
    >
      {emoji}
    </span>
  );
}
