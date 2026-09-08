// Ported from Strand components/core/Chip.jsx (extraction 3654dd17). Behavior unchanged.
import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./Icon";
import type { C } from "./cmeta";

export type ChipProps = {
  children?: ReactNode;
  c?: C | undefined;
  selected?: boolean | undefined;
  onRemove?: (() => void) | undefined;
  onClick?: (() => void) | undefined;
  style?: CSSProperties | undefined;
};

/** Neutral or C-tinted chip. A button when onClick is set, a span otherwise. */
export function Chip({ children, c, selected, onRemove, onClick, style }: ChipProps) {
  const color = c ? "var(--c-" + c + ")" : "var(--ink)";
  const text = c ? "var(--c-" + c + "-text)" : "var(--ink)";
  const onFill = c ? "var(--c-" + c + "-ink)" : "var(--on-fill)";
  const tint = c ? "var(--c-" + c + "-tint)" : "var(--bg-sunken)";
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 32,
        padding: "0 12px",
        borderRadius: 999,
        fontFamily: "var(--font-sans)",
        fontSize: 15,
        fontWeight: 500,
        lineHeight: 1,
        cursor: onClick ? "pointer" : "default",
        background: selected ? color : tint,
        color: selected ? onFill : text,
        border: "1px solid " + (selected ? color : "transparent"),
        ...style,
      }}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{ all: "unset", display: "inline-flex", cursor: "pointer", marginRight: -4 }}
        >
          <Icon name="x" size={14} />
        </button>
      )}
    </Tag>
  );
}
