// Ported from Strand components/core/Toast.jsx. Behavior unchanged.
import type { CSSProperties, ReactNode } from "react";

export type ToastProps = {
  children?: ReactNode;
  action?: ReactNode;
  onAction?: (() => void) | undefined;
  style?: CSSProperties | undefined;
};

/** Transient confirmation. Static component; the host controls mounting. */
export function Toast({ children, action, onAction, style }: ToastProps) {
  return (
    <div
      role="status"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 16,
        background: "var(--inverse-bg)",
        color: "var(--inverse-ink)",
        borderRadius: "var(--radius-m)",
        padding: "12px 16px",
        fontSize: 15,
        lineHeight: 1.4,
        boxShadow: "var(--shadow-stack)",
        maxWidth: 420,
        ...style,
      }}
    >
      <span>{children}</span>
      {action && (
        <button
          type="button"
          onClick={onAction}
          style={{
            all: "unset",
            cursor: "pointer",
            fontWeight: 700,
            textDecoration: "underline",
            textUnderlineOffset: 2,
          }}
        >
          {action}
        </button>
      )}
    </div>
  );
}
