// Brief 4B: the page-level compositions the auth surfaces share. Handoff section 4 records the
// three Strand gaps these work around — Input has no show-password affordance and no eye icon
// exists, Button has no loading prop, and the separator, the provider buttons and the focusable
// alert are compositions rather than components. They are staged for Strand, not patched locally.
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Button } from "@/components/strand/Button";
import { Icon } from "@/components/strand/Icon";
import { assetBase } from "@/components/strand/cmeta";
import {
  PROVIDERS,
  PROVIDER_BUTTON_LABEL,
  PROVIDER_MARK,
  PROVIDER_WAITING_LABEL,
  type Provider,
} from "@/lib/auth-flow";

/** Sign-in and sign-up keep their live look and carry no visible heading (handoff section 3). */
export const VISUALLY_HIDDEN: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * Focus the h1 on a route change and whenever the surface swaps state (rulings 180, 222). Never a
 * submit, never a destructive control. `state` is whatever distinguishes one state of the surface
 * from the next; changing it re-focuses the heading.
 */
export function useHeadingFocus(state?: unknown) {
  const ref = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    ref.current?.focus();
  }, [state]);
  return ref;
}

export function AuthHeading({
  children,
  headingRef,
  hidden,
}: {
  children: ReactNode;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
  hidden?: boolean;
}) {
  return (
    <h1
      ref={headingRef ?? null}
      tabIndex={-1}
      style={
        hidden
          ? VISUALLY_HIDDEN
          : {
              fontFamily: "var(--font-display)",
              fontSize: 32,
              lineHeight: 1.15,
              fontWeight: 400,
              color: "var(--ink)",
              margin: 0,
              outline: "none",
            }
      }
    >
      {children}
    </h1>
  );
}

export function AuthLead({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontSize: 17, lineHeight: 1.5, color: "var(--ink-2)", margin: 0 }}>{children}</p>
  );
}

export function AuthSmall({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink-3)", margin: 0 }}>{children}</p>
  );
}

/**
 * One alert block under the heading and lead, above the form. It takes focus when it appears
 * (ruling 222, Done Means 8); the offending fields carry the red border and nothing else, so the
 * message is announced once.
 */
export function AuthAlert({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    ref.current?.focus();
  }, [children]);
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      data-testid="auth-alert"
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        border: "1px solid var(--error)",
        background: "var(--surface)",
        borderRadius: "var(--radius-m)",
        padding: "12px 14px",
        fontSize: 15,
        lineHeight: 1.45,
        color: "var(--ink)",
        outline: "none",
      }}
    >
      <span style={{ color: "var(--error)", display: "flex", flex: "none", paddingTop: 1 }}>
        <Icon name="info" size={18} />
      </span>
      <span>{children}</span>
    </div>
  );
}

/** Provider cancelled is a status line and moves no focus (handoff section 2). */
export function AuthStatus({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      data-testid="auth-status"
      style={{ fontSize: 15, lineHeight: 1.45, color: "var(--ink-2)" }}
    >
      {children}
    </div>
  );
}

export function OrSeparator() {
  return (
    <div
      role="separator"
      aria-label="Or"
      style={{ display: "flex", alignItems: "center", gap: 12 }}
    >
      <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
      <span style={{ fontSize: 13, color: "var(--ink-3)" }}>or</span>
      <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
    </div>
  );
}

/**
 * The two provider buttons, stacked, gap 12. Ruling 232: a provider mark appears on its own button
 * and nowhere else — no badge, no "verified with", no tier. The mark is alt="" and the label
 * carries the name.
 */
export function ProviderButtons({
  waitingFor,
  disabled,
  onStart,
}: {
  waitingFor: Provider | null;
  disabled: boolean;
  onStart: (p: Provider) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {PROVIDERS.map((p) => (
        <Button
          key={p}
          type="button"
          variant="secondary"
          full
          data-testid={"provider-" + p}
          disabled={disabled}
          onClick={() => onStart(p)}
        >
          <img
            src={PROVIDER_MARK[p]}
            alt=""
            width={18}
            height={18}
            style={{ height: 18, width: "auto", display: "block" }}
          />
          {waitingFor === p ? PROVIDER_WAITING_LABEL[p] : PROVIDER_BUTTON_LABEL[p]}
        </Button>
      ))}
    </div>
  );
}

/** The anonymous auth layout: centred logo, 400-wide column, vertically centred (handoff section 1). */
export function AnonAuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Ruling 184: the wordmark resolves by path and is sized by height, width auto. */}
        <img
          src={assetBase() + "logo.png"}
          alt="DNA"
          style={{ height: 80, width: "auto", alignSelf: "center", display: "block" }}
        />
        {children}
      </div>
    </div>
  );
}

/**
 * The "Check your email" state, shared by sign-up (ruling 234: identical whether or not the address
 * already has an account) and by /reset (ruling 156 applied to auth: byte-identical for a known and
 * an unknown address). Neither caller branches on what the server answered, so there is one render
 * path and the markup cannot differ.
 */
export function CheckEmail({
  heading,
  body,
  small,
  onUseDifferent,
  onBackToSignIn,
  headingRef,
}: {
  heading: string;
  body: ReactNode;
  small: string;
  onUseDifferent: () => void;
  onBackToSignIn: () => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div data-testid="check-email" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <AuthHeading {...(headingRef ? { headingRef } : {})}>{heading}</AuthHeading>
      <AuthLead>{body}</AuthLead>
      <AuthSmall>{small}</AuthSmall>
      <Button
        type="button"
        variant="secondary"
        full
        data-testid="use-different"
        onClick={onUseDifferent}
      >
        Use a different address
      </Button>
      <Button type="button" variant="ghost" data-testid="back-to-sign-in" onClick={onBackToSignIn}>
        Back to sign in
      </Button>
    </div>
  );
}
