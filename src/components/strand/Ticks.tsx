// Brief 14 (SPEC 41-14 Part A item 5; extraction 41-14 sections 1.5 and 5.4; ruling 1336), ported
// from the prototype's `ticks()`: one `check` when the row is stored, two overlapping when every
// other member has acknowledged it, two in the thread's C text rung when every other member has read
// it, and the read state only while the viewer's own receipts are on (1345). The accessible name is
// the word, `Sent`, `Delivered`, `Read`; the glyphs carry none. On own rows only; the caller decides.
import type { CSSProperties } from "react";
import { Icon } from "./Icon";
import type { C } from "./cmeta";

export type TickStatus = "stored" | "acknowledged" | "read";

export type TicksProps = {
  status: TickStatus;
  /** The thread's C colours the read state. Absent, --ink for read. */
  c?: C | undefined;
  /** The viewer's own receipts setting (1345): off never renders the read state. */
  receipts?: boolean | undefined;
  style?: CSSProperties | undefined;
};

/** `messenger_messages_view.tick` 1, 2, 3 as the part's status. */
export function tickStatus(tick: number | null | undefined): TickStatus {
  return tick === 3 ? "read" : tick === 2 ? "acknowledged" : "stored";
}

export function Ticks({ status, c, receipts = false, style }: TicksProps) {
  const read = status === "read" && receipts;
  const two = status !== "stored";
  return (
    <span
      role="img"
      aria-label={read ? "Read" : two ? "Delivered" : "Sent"}
      data-ticks={read ? "read" : two ? "delivered" : "sent"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        color: read ? (c ? "var(--c-" + c + "-text)" : "var(--ink)") : "var(--ink-3)",
        ...style,
      }}
    >
      <Icon name="check" size={14} />
      {two && <Icon name="check" size={14} style={{ marginLeft: -9 }} />}
    </span>
  );
}
