// Ported from connect/strand-patch/Connect.jsx (Brief 4, rulings 165, 169, 179; canonical for Code).
// Structure matches the source one to one: Actions, MemberCard, MemberCardSkeleton, MEMBER_REL.
// Differences from the Claude Design runtime copy, and nothing else: the design-system globals
// (window.StrandDNADesignSystem_3654dd, window.StrandPatch) are the repo's own Strand components
// (Button, Icon, Avatar, Chip, BadgeRow, IdentityMark); the injected <style> for :focus-visible is
// the repo's stylesheet (src/styles/strand.css, .strand-mc-name); and the name button and tile reset
// their chrome property by property rather than with `all: unset`, so the stylesheet's emerald focus
// ring (ruling 97) still reaches them.
//
// MemberCard: the Connect card. Portrait-led (ruling 175). Compact: portrait row (portrait left,
// actions right) then content. Above compact: two-column grid, portrait column plus content, actions
// top-right on the name line (ruling 176). DOM order is name and meta first, then the body, then the
// portrait, then the actions (ruling 180, the 174 principle): the visual arrangement is produced by
// grid placement, never by source order. Not a PostCard: 1px --line border, never a C frame, no
// shadow (ruling 181: the lens column sits on --bg-sunken so --surface cards read as raised).
// Rulings 117 to 120, 157, 161, 168.
import { useState, type CSSProperties, type ReactNode } from "react";
import { Avatar } from "./Avatar";
import { BadgeRow, type Badge } from "./BadgeRow";
import { Button } from "./Button";
import { Chip } from "./Chip";
import { Icon } from "./Icon";
import { IdentityMark } from "./IdentityMark";

// Ruling 214: there is no window state on a surface. private.relationship_display maps it to
// sent before the projection returns, so the sender sees the Pending pill and nothing else, and
// cannot separate a decline inside the window from a request still waiting.
export const MEMBER_REL = ["none", "sent", "received", "connected"] as const;
export type MemberRel = (typeof MEMBER_REL)[number];
export type MemberCardContext =
  "members" | "suggested" | "requests" | "sent" | "connections" | "following";

export type MemberMutual = { name: string; avatar?: string | undefined };

export type MemberCardMember = {
  name: string;
  avatar?: string | undefined;
  identified?: boolean | undefined;
  headline?: string | undefined;
  stanceLabel?: string | undefined;
  place?: string | undefined;
  origin?: string | undefined;
  heritage?: string | undefined;
  corridorLabel?: string | undefined;
  chips?: string[] | undefined;
  badges?: Badge[] | undefined;
  mutuals?: MemberMutual[] | undefined;
  reason?: string | undefined;
  message?: string | undefined;
};

export type MemberCardProps = {
  member: MemberCardMember;
  rel?: MemberRel;
  following?: boolean;
  context?: MemberCardContext;
  compact?: boolean;
  onOpen?: (() => void) | undefined;
  onConnect?: (() => void) | undefined;
  onAccept?: (() => void) | undefined;
  onDecline?: (() => void) | undefined;
  onFollow?: (() => void) | undefined;
  onDismiss?: (() => void) | undefined;
  pointer?: boolean | undefined;
  style?: CSSProperties | undefined;
};

/** "A", "A and B", "A, B and C". */
export function joinNames(a: string[]): string {
  return a.length <= 1
    ? (a[0] ?? "")
    : a.length === 2
      ? a[0] + " and " + a[1]
      : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
}

// The reset the source achieves with `all: unset`, written out so the stylesheet focus ring applies.
const UNSET: CSSProperties = {
  appearance: "none",
  border: 0,
  background: "none",
  padding: 0,
  margin: 0,
  font: "inherit",
  color: "inherit",
  textAlign: "left",
};

type ActionsProps = {
  rel: MemberRel;
  following: boolean;
  context: MemberCardContext;
  compact: boolean;
  onConnect?: (() => void) | undefined;
  onAccept?: (() => void) | undefined;
  onDecline?: (() => void) | undefined;
  onFollow?: (() => void) | undefined;
  onDismiss?: (() => void) | undefined;
};

function Actions({
  rel,
  following,
  context,
  compact,
  onConnect,
  onAccept,
  onDecline,
  onFollow,
  onDismiss,
}: ActionsProps) {
  const pill = (bg: string, fg: string, border: string, child: ReactNode) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minHeight: 36,
        padding: "0 12px",
        borderRadius: "var(--radius-m)",
        background: bg,
        color: fg,
        border,
        fontSize: 15,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {child}
    </span>
  );
  // Compact received: three controls beside a 96 portrait. Accept and Decline take one row, Follow
  // sits under them, right aligned. Nothing shrinks (ruling 176). The same design applies to compact
  // Suggested (Connect, Follow, Dismiss): three controls beside the portrait overflowed the 360 and
  // 390 frames in the source, so Connect takes the first row and Follow and Dismiss the second.
  const received = rel === "received";
  const stacked = compact && (received || context === "suggested");
  const follow = (
    <Button
      variant={following ? "secondary" : "ghost"}
      size="sm"
      aria-pressed={!!following}
      onClick={onFollow}
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
  const dismiss =
    context === "suggested" ? (
      <Button variant="ghost" size="sm" onClick={onDismiss}>
        Dismiss
      </Button>
    ) : null;
  return (
    <div
      data-testid="card-actions"
      style={{
        display: "flex",
        flexDirection: stacked ? "column" : "row",
        flexWrap: "wrap",
        gap: 8,
        justifyContent: "flex-end",
        alignItems: stacked ? "flex-end" : "center",
        flex: "none",
        marginLeft: "auto",
      }}
    >
      {received ? (
        <div style={{ display: "flex", gap: 8 }}>
          <Button c="connect" size="sm" onClick={onAccept}>
            Accept
          </Button>
          <Button variant="secondary" size="sm" onClick={onDecline}>
            Decline
          </Button>
        </div>
      ) : null}
      {rel === "none" && (
        <Button c="connect" size="sm" onClick={onConnect}>
          Connect
        </Button>
      )}
      {rel === "sent" && pill("transparent", "var(--ink-3)", "1px solid var(--line)", "Pending")}
      {rel === "connected" &&
        pill(
          "var(--c-connect-tint)",
          "var(--c-connect-text)",
          "none",
          <>
            <Icon name="check" size={14} />
            Connected
          </>,
        )}
      {stacked ? (
        <div style={{ display: "flex", gap: 8 }}>
          {follow}
          {dismiss}
        </div>
      ) : (
        <>
          {follow}
          {dismiss}
        </>
      )}
    </div>
  );
}

export function MemberCard({
  member,
  rel = "none",
  following = false,
  context = "members",
  compact = false,
  onOpen,
  onConnect,
  onAccept,
  onDecline,
  onFollow,
  onDismiss,
  pointer,
  style,
}: MemberCardProps) {
  const [hov, setHov] = useState(false);
  const m = member;
  const mut = (m.mutuals ?? []).slice(0, 3);
  const connected = rel === "connected";
  const size = compact ? 96 : 120;
  const actions = (
    <Actions
      rel={rel}
      following={following}
      context={context}
      compact={compact}
      onConnect={onConnect}
      onAccept={onAccept}
      onDecline={onDecline}
      onFollow={onFollow}
      onDismiss={onDismiss}
    />
  );
  const originLine = [
    m.origin ? "From " + m.origin : "",
    m.heritage && m.heritage !== "Continental" ? m.heritage : "",
  ]
    .filter(Boolean)
    .join(", ");
  const chips = context === "members" ? (m.chips ?? []).slice(0, 2) : [];
  // Visual: compact = row 1 [portrait | actions], row 2 content. Wide = column 1 portrait (both
  // rows), column 2 row 1 [name block | actions], row 2 rest.
  // DOM: name block, then the rest of the content, then portrait, then actions. Grid areas place them.
  const grid: CSSProperties = compact
    ? {
        gridTemplateColumns: "minmax(0,1fr) auto",
        gridTemplateRows: "auto auto",
        gridTemplateAreas: '"portrait actions" "head head" "body body"',
      }
    : {
        gridTemplateColumns: size + "px minmax(0,1fr) auto",
        gridTemplateAreas: '"portrait head actions" "portrait body body"',
      };
  const head = (
    <div
      style={{ gridArea: "head", display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="strand-mc-name"
        style={{
          ...UNSET,
          cursor: "pointer",
          fontFamily: "var(--font-display)",
          fontSize: 24,
          lineHeight: 1.1,
          letterSpacing: "-0.01em",
          textWrap: "balance",
        }}
      >
        {m.name}
      </button>
      {m.headline && (
        <span style={{ fontSize: 15, lineHeight: 1.4, color: "var(--ink-2)", textWrap: "pretty" }}>
          {m.headline}
        </span>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          marginTop: 2,
          fontSize: 13,
          lineHeight: 1.4,
          color: "var(--ink-3)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {m.stanceLabel && (
            <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>{m.stanceLabel}</span>
          )}
          {m.stanceLabel && originLine && <span aria-hidden="true">·</span>}
          {originLine && <span>{originLine}</span>}
        </span>
        {m.place && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Icon name="map-pin" size={13} />
            {m.place}
            {m.corridorLabel && (
              <>
                <span aria-hidden="true">·</span>
                <span>{m.corridorLabel} corridor</span>
              </>
            )}
          </span>
        )}
      </div>
      {chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {chips.map((v) => (
            <Chip key={v}>{v}</Chip>
          ))}
        </div>
      )}
    </div>
  );
  const hasBody =
    (m.badges ?? []).length > 0 ||
    (!connected && mut.length > 0) ||
    (context === "suggested" && !!m.reason) ||
    (context === "requests" && !!m.message);
  const body = hasBody ? (
    <div
      style={{ gridArea: "body", display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}
    >
      {(m.badges ?? []).length > 0 && <BadgeRow badges={m.badges ?? []} />}
      {!connected && mut.length > 0 && (
        <div
          data-testid="mutuals"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            fontSize: 15,
            lineHeight: 1.4,
            color: "var(--ink-2)",
          }}
        >
          <span style={{ display: "inline-flex", gap: 4 }}>
            {mut.map((n) => (
              <Avatar key={n.name} name={n.name} src={n.avatar} size={24} />
            ))}
          </span>
          <span>
            <span style={{ fontWeight: 500 }}>{joinNames(mut.map((n) => n.name))}</span>{" "}
            <span style={{ color: "var(--ink-3)" }}>
              {mut.length === 1 ? "is a connection you share" : "are connections you share"}
            </span>
          </span>
        </div>
      )}
      {context === "suggested" && m.reason && (
        <p
          data-testid="reason"
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.45,
            color: "var(--ink-2)",
            fontStyle: "italic",
            textWrap: "pretty",
          }}
        >
          {m.reason}
        </p>
      )}
      {context === "requests" && m.message && (
        <blockquote
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 10,
            background: "var(--bg-sunken)",
            fontSize: 15,
            lineHeight: 1.5,
            color: "var(--ink-2)",
            textWrap: "pretty",
          }}
        >
          {m.message}
        </blockquote>
      )}
    </div>
  ) : null;
  return (
    <article
      aria-label={m.name}
      data-testid="member-card"
      data-rel={rel}
      onMouseEnter={() => pointer && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "grid",
        ...grid,
        columnGap: compact ? 12 : 18,
        rowGap: compact ? 12 : 10,
        alignItems: "start",
        padding: 16,
        borderRadius: 16,
        background: "var(--surface)",
        border: "1px solid " + (hov ? "var(--line-strong)" : "var(--line)"),
        boxSizing: "border-box",
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        transition: "border-color 150ms var(--ease)",
        ...style,
      }}
    >
      {head}
      {body}
      <span
        data-testid="portrait"
        style={{ gridArea: "portrait", position: "relative", width: size, height: size }}
      >
        <Avatar name={m.name} src={m.avatar} size={size} />
        {m.identified && (
          <span style={{ position: "absolute", right: -5, bottom: -5 }}>
            <IdentityMark size={24} />
          </span>
        )}
      </span>
      <div style={{ gridArea: "actions", justifySelf: "end" }}>{actions}</div>
    </article>
  );
}

/** Loading shape matches the card (ruling 164). */
export function MemberCardSkeleton({
  compact = false,
  style,
}: {
  compact?: boolean;
  style?: CSSProperties | undefined;
}) {
  const size = compact ? 96 : 120;
  const bar = (w: string, h: number) => (
    <span
      style={{
        height: h,
        width: w,
        borderRadius: 6,
        background: "var(--bg-sunken)",
        display: "block",
      }}
    />
  );
  return (
    <div
      aria-hidden="true"
      style={{
        display: "grid",
        gridTemplateColumns: compact ? "minmax(0,1fr)" : size + "px minmax(0,1fr)",
        gap: compact ? 12 : 18,
        padding: 16,
        borderRadius: 16,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <span
        style={{
          width: size,
          height: size,
          borderRadius: 14,
          background: "var(--bg-sunken)",
          display: "block",
        }}
      />
      <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {bar("45%", 20)}
        {bar("80%", 12)}
        {bar("35%", 12)}
      </span>
    </div>
  );
}
