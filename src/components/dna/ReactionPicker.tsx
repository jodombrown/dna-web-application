// Brief 14, handoff 56-41E, SPEC-41-E 2.4 (rulings 1405, 1406, 1407, 1576, 1578, 1584): the full
// emoji picker, Frimousse styled to Strand. The caller gives it its container, a Sheet titled React
// on touch and an inline panel in Menu's chrome on pointer (MessengerThread); inside, in order: the
// search (E3), the skin tone row with Not chosen first (E4, E5), Recent (E6, the member's own,
// structure only), then the library's groups under Frimousse's default labels (E7, 1584), each a
// grid of 44 cells on touch and 36 on pointer, native glyphs at 24 with the eight quick glyphs drawn
// as drawn wherever they appear; nothing found reads E8. No GIFs, no stickers, no suggestions
// (1407, 1405). A pick reacts and goes to the front of Recent.
//
// The search field is Frimousse's own input (its filtering reads it), drawn on Input's tokens with
// the search glyph in its place, because Strand's Input cannot be the library's search element.
// Emoji data comes from the app's own origin through src/lib/emoji.ts's resolver and is never
// cached in the browser (1351, 1577).
import { EmojiPicker } from "frimousse";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/components/strand/Icon";
import { ReactionMark } from "@/components/strand/ReactionGlyph";
import { TONES, resolveEmojiData, toneOf, type Tone } from "@/lib/emoji";
import type { Mode } from "@/lib/tier";

const CAPS: CSSProperties = {
  fontSize: "var(--text-xs)",
  lineHeight: "var(--text-xs-lh)",
  letterSpacing: "var(--tracking-caps)",
  textTransform: "uppercase",
  fontWeight: "var(--weight-medium)" as unknown as number,
  color: "var(--ink-3)",
};

export type ReactionPickerProps = {
  /** The member's chosen tone; Not chosen draws the neutral swatch (1576). */
  tone: Tone;
  /** Writes the member's choice: a modifier character, or `none`. */
  onTone: (value: string) => void;
  /** The member's recent emoji, newest first (1405). */
  recent: readonly string[];
  onPick: (emoji: string) => void;
  input: Mode;
  /** Height of the scrolling list on pointer; on touch the Sheet's body gives it. */
  listHeight?: number | undefined;
};

export function ReactionPicker({
  tone,
  onTone,
  recent,
  onPick,
  input,
  listHeight,
}: ReactionPickerProps) {
  const cell = input === "touch" ? 44 : 36;
  const [search, setSearch] = useState("");
  const [focus, setFocus] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  // Frimousse lays its rows by a fixed column count, so the count follows the width it has.
  const [columns, setColumns] = useState(input === "touch" ? 7 : 9);
  useEffect(() => {
    const el = host.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setColumns(Math.max(4, Math.floor(w / (cell + 2))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cell]);
  const cellStyle: CSSProperties = {
    all: "unset",
    cursor: "pointer",
    width: cell,
    height: cell,
    borderRadius: "var(--radius-m)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  };
  return (
    <EmojiPicker.Root
      locale="en"
      resolveEmojiData={resolveEmojiData}
      skinTone={tone.key}
      columns={columns}
      onEmojiSelect={(e) => onPick(e.emoji)}
      data-reaction-picker
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        minHeight: 0,
        flex: 1,
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
      }}
    >
      <div style={{ position: "relative", flex: "none" }}>
        <Icon
          name="search"
          size={18}
          style={{
            position: "absolute",
            left: 14,
            top: 13,
            color: "var(--ink-3)",
            pointerEvents: "none",
          }}
        />
        <EmojiPicker.Search
          placeholder="Search emoji"
          aria-label="Search emoji"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          data-emoji-search
          style={{
            width: "100%",
            boxSizing: "border-box",
            fontFamily: "var(--font-sans)",
            fontSize: 17,
            lineHeight: 1.5,
            color: "var(--ink)",
            background: focus ? "var(--surface)" : "var(--bg-sunken)",
            border: "1px solid " + (focus ? "var(--ink)" : "var(--line)"),
            borderRadius: "var(--radius-m)",
            padding: "0 14px 0 40px",
            minHeight: 44,
            outline: "none",
            transition: "border-color var(--dur-default) var(--ease)",
          }}
        />
      </div>
      <div
        role="radiogroup"
        aria-label="Skin tone"
        data-tone-row
        style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flex: "none" }}
      >
        <span style={CAPS}>Skin tone</span>
        {TONES.map((t) => {
          const on = t.key === tone.key;
          return (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={t.label}
              data-tone={t.key}
              onClick={() => onTone(t.modifier ?? "none")}
              style={{
                all: "unset",
                cursor: "pointer",
                width: 28,
                height: 28,
                borderRadius: "var(--radius-pill)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
                outline: on ? "2px solid var(--ink)" : "1px solid var(--line)",
                outlineOffset: 2,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "var(--radius-pill)",
                  background: t.hex ?? "var(--ink-4)",
                }}
              />
            </button>
          );
        })}
      </div>
      <div
        ref={host}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          minHeight: 0,
          flex: 1,
        }}
      >
        {!search.trim() && recent.length > 0 && (
          <div
            data-recent
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-1)",
              flex: "none",
            }}
          >
            <span style={CAPS}>Recent</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {recent.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-label={e}
                  data-recent-emoji={e}
                  onClick={() => onPick(e)}
                  style={cellStyle}
                >
                  <ReactionMark emoji={e} size={24} toneFill={toneOf(e).hex} />
                </button>
              ))}
            </div>
          </div>
        )}
        <EmojiPicker.Viewport
          data-emoji-viewport
          style={{
            position: "relative",
            // A bounded scroller either way: the Sheet's body on touch, a fixed height on pointer.
            flex: listHeight ? "none" : 1,
            minHeight: 0,
            height: listHeight,
            overflowY: "auto",
            overscrollBehavior: "contain",
          }}
        >
          <EmojiPicker.Loading>
            <span
              role="status"
              aria-label="Loading emoji"
              style={{ display: "block", minHeight: 44 }}
            />
          </EmojiPicker.Loading>
          <EmojiPicker.Empty>
            <span
              data-emoji-empty
              style={{
                display: "block",
                fontSize: "var(--text-s)",
                lineHeight: "var(--text-s-lh)",
                color: "var(--ink-3)",
                padding: "var(--space-2) 0",
              }}
            >
              No emoji match.
            </span>
          </EmojiPicker.Empty>
          <EmojiPicker.List
            components={{
              CategoryHeader: ({ category, ...props }) => (
                <div
                  {...props}
                  style={{
                    ...CAPS,
                    background: "var(--surface)",
                    padding: "var(--space-2) 0 var(--space-1)",
                  }}
                >
                  {category.label}
                </div>
              ),
              Row: ({ children, ...props }) => (
                <div {...props} style={{ display: "flex", gap: 2, scrollMargin: "var(--space-3)" }}>
                  {children}
                </div>
              ),
              Emoji: ({ emoji, ...props }) => (
                <button
                  {...props}
                  style={{
                    ...cellStyle,
                    background: emoji.isActive ? "var(--bg-sunken)" : "transparent",
                  }}
                >
                  <ReactionMark emoji={emoji.emoji} size={24} toneFill={toneOf(emoji.emoji).hex} />
                </button>
              ),
            }}
          />
        </EmojiPicker.Viewport>
      </div>
    </EmojiPicker.Root>
  );
}
