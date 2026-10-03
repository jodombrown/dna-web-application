// Brief 14 (SPEC 41-14 Part A item 5; extraction 41-14 sections 1.3 and 5.4; rulings 1322, 82, 1335,
// 1339, 1344, 1348), ported from the prototype's `rowNode()`: NotificationListItem's row shape, an
// Avatar for a one-to-one and a group mark otherwise, the name, the last line, the time in words,
// `Muted` and `Pinned` as words, a dot and the heavier name and last line when unread, never a count.
// The row opens the thread; its actions are a Menu in place. On pointer the row's hover reveals the
// `Actions for {name}` ellipsis; on touch a 450 ms long press opens the menu anchored on the row and
// the tap that follows is swallowed for 700 ms (src/lib/long-press.ts). `selected` is the expanded
// tier's open row: a 2px ink ring and the sunken ground (`data-selected`, which Pane's follow reads).
// Links: the row is an anchor when `href` is given, so it preloads on hover intent and opens in a new
// tab (1067); a plain primary click calls `onOpen` and prevents the default.
import { useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { Menu, type MenuItem, type MenuRule } from "./Menu";
import { useLongPress } from "@/lib/long-press";
import { useMode, type Mode } from "@/lib/tier";

export type ThreadRowKind = "one" | "group" | "space" | "event";

export type ThreadRowProps = {
  name: string;
  kind: ThreadRowKind;
  /** A one-to-one's other member's photo; initials otherwise. Groups draw the mark. */
  src?: string | undefined;
  lastLine: string;
  time: string;
  unread?: boolean | undefined;
  muted?: boolean | undefined;
  pinned?: boolean | undefined;
  selected?: boolean | undefined;
  archived?: boolean | undefined;
  input?: Mode | undefined;
  href?: string | undefined;
  onOpen?: (() => void) | undefined;
  onIntent?: (() => void) | undefined;
  /** Fires when the actions menu opens, from the ellipsis or the long press. */
  onActions?: (() => void) | undefined;
  /** The row's acts, in order, rules between (Menu's entries). */
  items: (MenuItem | MenuRule | false | null | undefined)[];
  style?: CSSProperties | undefined;
};

/** The group mark: a sunken square with the users glyph, the shape every Messenger surface draws for a thread that is not a pair. */
export function GroupMark({ size, style }: { size: number; style?: CSSProperties | undefined }) {
  return (
    <span
      aria-hidden="true"
      data-group-mark
      style={{
        width: size,
        height: size,
        borderRadius: "var(--radius-m)",
        background: "var(--bg-sunken)",
        border: "1px solid var(--line)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--ink-3)",
        flex: "none",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <Icon name="users" size={Math.round(size * 0.45)} />
    </span>
  );
}

export function ThreadRow({
  name,
  kind,
  src,
  lastLine,
  time,
  unread = false,
  muted = false,
  pinned = false,
  selected = false,
  archived = false,
  input,
  href,
  onOpen,
  onIntent,
  onActions,
  items,
  style,
}: ThreadRowProps) {
  const detected = useMode();
  const mode = input || detected;
  const touch = mode === "touch";
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLSpanElement>(null);
  const summon = () => {
    setOpen(true);
    onActions?.();
  };
  const { handlers, guard } = useLongPress<HTMLDivElement>(summon);
  const openRow = guard(() => onOpen?.());
  const Tag = href ? "a" : "button";
  const tagProps = href
    ? {
        href,
        onClick: (e: MouseEvent<HTMLElement>) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          openRow();
        },
      }
    : { type: "button" as const, onClick: openRow };
  const label = "Actions for " + name;
  return (
    <div
      ref={rowRef}
      role="listitem"
      data-thread-row
      data-kind={kind}
      data-unread={unread ? "1" : undefined}
      data-selected={selected ? "true" : undefined}
      data-archived={archived ? "1" : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      {...(touch ? handlers : {})}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-2) var(--space-3) var(--space-2) var(--space-4)",
        minHeight: 56,
        background: hover || selected ? "var(--bg-sunken)" : "transparent",
        transition: "background var(--dur-default) var(--ease)",
        outline: selected ? "2px solid var(--ink)" : "none",
        outlineOffset: -2,
        borderRadius: selected ? "var(--radius-m)" : 0,
        touchAction: "pan-y",
        userSelect: touch ? "none" : undefined,
        WebkitUserSelect: touch ? "none" : undefined,
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        ...style,
      }}
    >
      <Tag
        {...tagProps}
        onMouseEnter={onIntent}
        aria-current={selected ? "true" : undefined}
        data-thread-open
        style={{
          all: "unset",
          boxSizing: "border-box",
          cursor: "pointer",
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          textAlign: "left",
          color: "inherit",
          fontFamily: "inherit",
          minHeight: "var(--target-primary)",
        }}
      >
        {kind === "one" ? <Avatar name={name} src={src} size={44} /> : <GroupMark size={44} />}
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)", minWidth: 0 }}
          >
            <span
              data-thread-name
              style={{
                fontSize: "var(--text-s)",
                lineHeight: "var(--text-s-lh)",
                fontWeight: (unread
                  ? "var(--weight-bold)"
                  : "var(--weight-medium)") as unknown as number,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {name}
            </span>
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--ink-3)",
                flex: "none",
                marginLeft: "auto",
              }}
            >
              {time}
            </span>
          </span>
          <span
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", minWidth: 0 }}
          >
            <span
              data-thread-last
              style={{
                fontSize: "var(--text-xs)",
                lineHeight: "var(--text-xs-lh)",
                color: unread ? "var(--ink)" : "var(--ink-3)",
                fontWeight: (unread
                  ? "var(--weight-medium)"
                  : "var(--weight-regular)") as unknown as number,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                minWidth: 0,
              }}
            >
              {lastLine}
            </span>
            {muted && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-4)", flex: "none" }}>
                Muted
              </span>
            )}
            {pinned && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-4)", flex: "none" }}>
                Pinned
              </span>
            )}
          </span>
        </span>
        {unread && (
          <span
            role="img"
            aria-label="Unread"
            data-unread-dot
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "var(--pulse-for-you)",
              flex: "none",
            }}
          />
        )}
      </Tag>
      {!touch && (
        <span ref={moreRef} style={{ display: "inline-flex", flex: "none" }}>
          <IconButton
            name="ellipsis"
            label={label}
            input={mode}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => (open ? setOpen(false) : summon())}
            style={{
              opacity: hover || open ? 1 : 0,
              transition: "opacity var(--dur-default) var(--ease)",
            }}
          />
        </span>
      )}
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={touch ? rowRef : moreRef}
        items={items}
        label={label}
        input={mode}
        placement={touch ? "bottom-start" : "bottom-end"}
      />
    </div>
  );
}
