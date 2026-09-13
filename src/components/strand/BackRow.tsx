// Design pass 01, strand-patch/BackRow.jsx (rulings 396, 486). One pattern for every surface that
// has a parent:
// - a row at the top of the content column, not a banner and not a floating control, so it never
//   covers content;
// - it scrolls with the page;
// - it names the parent, never the bare word Back, so the destination is readable before the tap;
// - arrow-left at 20, label at 15/500, --ink-2 resting and --ink on hover, height --target-primary;
// - a negative left margin of 6 so the glyph optically aligns with the column edge while the tap
//   area stays full size.
import { useState, type CSSProperties } from "react";
import { Icon } from "./Icon";

export type BackRowProps = {
  /** The parent's name, as the member reads it: "Feed", "Connect". Never "Back". */
  label: string;
  onClick?: (() => void) | undefined;
  style?: CSSProperties | undefined;
};

export function BackRow({ label, onClick, style }: BackRowProps) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      data-back-row
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        all: "unset",
        boxSizing: "border-box",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        minHeight: "var(--target-primary)",
        marginLeft: -6,
        paddingRight: 6,
        fontFamily: "var(--font-sans)",
        fontSize: 15,
        fontWeight: 500,
        color: hover ? "var(--ink)" : "var(--ink-2)",
        transition: "color var(--dur-fast) var(--ease)",
        ...style,
      }}
    >
      <Icon name="arrow-left" size={20} />
      <span>{label}</span>
    </button>
  );
}
