// Brief 14 (SPEC 41-14 Part A item 5; extraction 41-14 sections 1.5 and 5.4; rulings 1343, 1349,
// 1370, 1371), ported from the prototype's `bubble()` and `rich()`. One message in the log: an own
// row on the right on the thread's C tint, another's on the left on --surface with a 1px line; the
// sender's name above it in a group; a quote block inside it for a reply; media, a voice player and
// a link preview as nodes the caller renders (the Feed card's MediaBlock, the VoicePlayer); the text
// with mentions bold in Connect's text rung and URLs as links in a new tab; the meta line of
// `edited`, `pinned`, the time and the Ticks on own rows; the reaction row as word and names, never
// a count, each a toggle; the five-word picker with Close while it is open; the deleted form as a
// dashed box reading `This message was deleted`. On pointer the row's hover reveals Reply, React and
// the `Message actions` ellipsis, end-aligned; on touch a 450 ms long press opens the menu on the
// bubble and the tap that follows is swallowed (src/lib/long-press.ts). `focused` draws the 2px ring
// a search result or the pinned strip lands on.
import { Fragment, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Button } from "./Button";
import { Chip } from "./Chip";
import { IconButton } from "./IconButton";
import { Menu, type MenuItem, type MenuRule } from "./Menu";
import { Ticks, type TickStatus } from "./Ticks";
import type { C } from "./cmeta";
import { useLongPress } from "@/lib/long-press";
import { useMode, type Mode } from "@/lib/tier";

export type MessageQuote = {
  /** `You` or the author's name; the caller decides. */
  from: string;
  /** One line: the text, `Voice note`, `Image`, `Video` or `This message was deleted`. */
  text: string;
};

export type MessageReaction = {
  word: string;
  /** Already joined in words, with `you` where the viewer reacted: "Ama and Nana", "you". */
  names: string;
  own: boolean;
};

export type MessagePicker = {
  words: string[];
  /** The viewer's current word on this message, selected in the picker. */
  current?: string | undefined;
  onPick: (word: string) => void;
  onClose: () => void;
};

export type MessageBubbleProps = {
  own: boolean;
  c?: C | undefined;
  text?: string | null | undefined;
  quote?: MessageQuote | null | undefined;
  media?: ReactNode;
  voice?: ReactNode;
  link?: ReactNode;
  reactions?: MessageReaction[] | undefined;
  edited?: boolean | undefined;
  pinned?: boolean | undefined;
  deleted?: boolean | undefined;
  time: string;
  status?: TickStatus | undefined;
  receipts?: boolean | undefined;
  /** Groups, other members only. */
  senderName?: string | null | undefined;
  /** The names a mention in `text` may carry, rendered bold; absent, the prototype's `@First Last`. */
  mentionNames?: readonly string[] | undefined;
  focused?: boolean | undefined;
  input?: Mode | undefined;
  onReply?: (() => void) | undefined;
  /** Opens or closes the picker. */
  onReact?: (() => void) | undefined;
  /** A reaction row's toggle, by word. */
  onToggleReaction?: ((word: string) => void) | undefined;
  picker?: MessagePicker | null | undefined;
  menuItems?: (MenuItem | MenuRule | false | null | undefined)[] | undefined;
  /** Fires when the menu opens, from the ellipsis or the long press. */
  onMenu?: (() => void) | undefined;
  /** The log's `data-msg` hook for scrolling, and the id a test reads. */
  id?: string | undefined;
  style?: CSSProperties | undefined;
};

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Mentions bold in Connect's text rung, URLs as links in a new tab; `plain` renders every URL as text (requests, 1335). */
export function richText(
  text: string,
  opts: { mentionNames?: readonly string[] | undefined; plain?: boolean | undefined } = {},
): ReactNode {
  const names = (opts.mentionNames ?? []).filter(Boolean).map(escapeRe);
  const mention = names.length ? "@(?:" + names.join("|") + ")" : "@[A-Z][a-z]+ [A-Z][a-z]+";
  const re = new RegExp("(" + mention + "|https?:\\/\\/[^\\s<>\"']+)", "g");
  const parts = text.split(re);
  return parts.map((p, i) => {
    if (!p) return null;
    if (p.startsWith("@"))
      return (
        <b
          key={i}
          data-mention
          style={{
            fontWeight: "var(--weight-medium)" as unknown as number,
            color: "var(--c-connect-text)",
          }}
        >
          {p}
        </b>
      );
    if (URL_RE.test(p) && !opts.plain) {
      URL_RE.lastIndex = 0;
      return (
        <a
          key={i}
          href={p}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "inherit",
            textDecorationColor: "var(--line-strong)",
            textUnderlineOffset: 2,
            overflowWrap: "anywhere",
          }}
        >
          {p}
        </a>
      );
    }
    URL_RE.lastIndex = 0;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

export function MessageBubble({
  own,
  c,
  text,
  quote,
  media,
  voice,
  link,
  reactions = [],
  edited = false,
  pinned = false,
  deleted = false,
  time,
  status = "stored",
  receipts = false,
  senderName,
  mentionNames,
  focused = false,
  input,
  onReply,
  onReact,
  onToggleReaction,
  picker,
  menuItems = [],
  onMenu,
  id,
  style,
}: MessageBubbleProps) {
  const detected = useMode();
  const mode = input || detected;
  const touch = mode === "touch";
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLSpanElement>(null);
  const hasItems = menuItems.some((it) => !!it && !("rule" in it));
  const summon = () => {
    if (!hasItems || deleted) return;
    setOpen(true);
    onMenu?.();
  };
  const { handlers } = useLongPress<HTMLDivElement>(summon);
  const tint = c ? "var(--c-" + c + "-tint)" : "var(--bg-sunken)";
  const bg = deleted ? "transparent" : own ? tint : "var(--surface)";
  const mediaOnly = !!media && !text && !quote;
  const body = deleted ? (
    <span style={{ color: "var(--ink-3)" }}>This message was deleted</span>
  ) : (
    <>
      {quote && (
        <div
          data-quote
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-badge)",
            background: own ? "var(--surface)" : "var(--bg-sunken)",
            fontSize: "var(--text-xs)",
            lineHeight: "var(--text-xs-lh)",
            marginBottom: "var(--space-2)",
          }}
        >
          <span style={{ fontWeight: "var(--weight-medium)" as unknown as number }}>
            {quote.from}
          </span>
          <span
            style={{
              color: "var(--ink-2)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {quote.text}
          </span>
        </div>
      )}
      {media && (
        <div style={{ margin: text ? "0 0 var(--space-2)" : 0, maxWidth: 320 }}>{media}</div>
      )}
      {voice}
      {text && (
        <span data-body style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {richText(text, { mentionNames })}
        </span>
      )}
      {link && <div style={{ marginTop: "var(--space-2)", maxWidth: 320 }}>{link}</div>}
    </>
  );
  const meta = (
    <span
      data-meta
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: "var(--text-xs)",
        color: "var(--ink-3)",
        lineHeight: 1,
      }}
    >
      {edited && !deleted && <span data-edited>edited</span>}
      {pinned && !deleted && <span data-pinned>pinned</span>}
      <span>{time}</span>
      {own && !deleted && <Ticks status={status} c={c} receipts={receipts} />}
    </span>
  );
  const reactionRow =
    reactions.length > 0 && !deleted ? (
      <div data-reactions style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
        {reactions.map((r) => (
          <button
            key={r.word}
            type="button"
            aria-label={r.word + ", " + r.names}
            aria-pressed={r.own}
            data-reaction={r.word}
            onClick={() => onToggleReaction?.(r.word)}
            style={{
              all: "unset",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              minHeight: "var(--target-min)",
              padding: "0 var(--space-2)",
              borderRadius: 999,
              border: "1px solid " + (r.own ? "var(--line-strong)" : "var(--line)"),
              background: "var(--surface)",
              fontSize: "var(--text-xs)",
              color: "var(--ink-2)",
              fontFamily: "inherit",
            }}
          >
            {r.word}, {r.names}
          </button>
        ))}
      </div>
    ) : null;
  const pickerRow = picker ? (
    <div
      role="group"
      aria-label="React"
      data-picker
      style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4, alignItems: "center" }}
    >
      {picker.words.map((w) => (
        <Chip key={w} selected={picker.current === w} onClick={() => picker.onPick(w)}>
          {w}
        </Chip>
      ))}
      <IconButton name="x" label="Close" input={mode} size={32} onClick={picker.onClose} />
    </div>
  ) : null;
  const cluster =
    !touch && !deleted ? (
      <div
        data-cluster
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          opacity: hover || open ? 1 : 0,
          transition: "opacity var(--dur-default) var(--ease)",
          alignSelf: "center",
        }}
      >
        {onReply && (
          <Button variant="ghost" size="sm" onClick={onReply}>
            Reply
          </Button>
        )}
        {onReact && (
          <Button variant="ghost" size="sm" onClick={onReact}>
            React
          </Button>
        )}
        {hasItems && (
          <span ref={moreRef} style={{ display: "inline-flex" }}>
            <IconButton
              name="ellipsis"
              label="Message actions"
              input={mode}
              size={32}
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => (open ? setOpen(false) : summon())}
            />
          </span>
        )}
      </div>
    ) : null;
  const bubble = (
    <div
      ref={bubbleRef}
      data-bubble
      style={{
        padding: mediaOnly ? "var(--space-1)" : "var(--space-2) var(--space-3)",
        borderRadius: "var(--radius-l)",
        background: bg,
        border: deleted
          ? "1px dashed var(--line-strong)"
          : "1px solid " + (own ? "transparent" : "var(--line)"),
        fontSize: "var(--text-s)",
        lineHeight: "var(--text-s-lh)",
        color: "var(--ink)",
        maxWidth: "100%",
        boxSizing: "border-box",
        outline: focused ? "2px solid var(--ink)" : "none",
        outlineOffset: 2,
        transition: "outline-color var(--dur-slow) var(--ease)",
        userSelect: touch ? "none" : undefined,
        WebkitUserSelect: touch ? "none" : undefined,
      }}
    >
      {body}
    </div>
  );
  return (
    <div
      data-msg={id}
      data-own={own ? "1" : undefined}
      data-deleted={deleted ? "1" : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      {...(touch && !deleted ? handlers : {})}
      style={{
        display: "flex",
        flexDirection: own ? "row-reverse" : "row",
        alignItems: "flex-start",
        gap: "var(--space-2)",
        padding: "2px var(--space-4)",
        touchAction: "pan-y",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      <div style={{ maxWidth: "78%", minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: own ? "flex-end" : "flex-start",
            gap: 4,
            maxWidth: "100%",
            minWidth: 0,
          }}
        >
          {senderName && !own && (
            <span
              data-sender
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: "var(--weight-medium)" as unknown as number,
                color: "var(--ink-2)",
                padding: "0 var(--space-1)",
              }}
            >
              {senderName}
            </span>
          )}
          {bubble}
          {meta}
          {reactionRow}
          {pickerRow}
        </div>
      </div>
      {cluster}
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={touch ? bubbleRef : moreRef}
        items={menuItems}
        label="Message actions"
        input={mode}
        placement={
          touch ? (own ? "bottom-end" : "bottom-start") : own ? "bottom-start" : "bottom-end"
        }
      />
    </div>
  );
}
