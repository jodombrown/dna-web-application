// The Guest sheet (B10-SPEC section 4, Guest; handoff 30-D item 8; rulings 532, 626, 1026, 1034).
// One sheet, six states in the SPEC's own words, and one transient state while a link is checked:
//
//   email       `I am going`, one email Input, `Send me a link`.
//   sent        `Check your email`, the address, `it signs you in for this event only`, `Done`.
//   opening     the link is being verified; nothing to act on yet.
//   returned    `You are going`, `Continue`. Continue makes the conversion offer when the answer
//               said to, once (1034), and otherwise closes.
//   conversion  `Keep this with an account?`, `Continue as a guest` | `Create an account`, which
//               goes to the existing sign-up flow with the address prefilled. No second path.
//   existing    going: `You already said you are going`, `Keep it` | `Withdraw` (danger).
//               not going: `I am going` again, which sends going.
//   expired     `This link has expired`, the email field, `Send a new link`.
//
// The field line reads `One email address, so the door can reach you. Nothing else is asked.`
// rather than the SPEC's line naming a reminder, because nothing sends one yet (item 8.3,
// grounded-or-empty; docs/GAPS.md). A refusal from the database renders under the field in its own
// sentence; anything else is one line. Nothing here names another attendee (626).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/strand/Button";
import { IconButton } from "@/components/strand/IconButton";
import { Input } from "@/components/strand/Input";
import { Sheet } from "@/components/strand/Sheet";
import {
  createAccountPath,
  GuestLinkExpired,
  GuestRefused,
  guestRsvp,
  requestGuestLink,
  type GuestAnswer,
  type GuestStatus,
  GUEST_ANSWER_FAILED,
  GUEST_SEND_FAILED,
} from "@/lib/guest";

export const GUEST_FIELD_LINE =
  "One email address, so the door can reach you. Nothing else is asked.";
export const GUEST_SIGNS_YOU_IN = "It signs you in for this event only.";

export type GuestSheetState =
  | { kind: "email" }
  | { kind: "sent"; email: string }
  | { kind: "opening" }
  | { kind: "returned"; offer: boolean }
  | { kind: "conversion"; email: string }
  | { kind: "existing"; status: GuestStatus; email: string }
  | { kind: "expired" };

export type GuestSheetProps = {
  open: boolean;
  onClose: () => void;
  slug: string;
  compact: boolean;
  /** The state the sheet opens in: `email` from the affordance, `opening` from a `?g=` arrival. */
  initial: GuestSheetState;
  /** The link's token, held in memory for the visit; null until a link has been followed. */
  token: string | null;
  /** Called with every answer the function gives, so the page shows `You are going.` and `Change`. */
  onAnswer: (answer: GuestAnswer) => void;
  /** Called when a followed link turned out bad or expired, so the page forgets it. */
  onExpired: () => void;
};

export function GuestSheet({
  open,
  onClose,
  slug,
  compact,
  initial,
  token,
  onAnswer,
  onExpired,
}: GuestSheetProps) {
  const [state, setState] = useState<GuestSheetState>(initial);
  const [email, setEmail] = useState("");
  /** The address the link named, from the function's answer; the conversion offer prefills it. */
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const opened = useRef<string | null>(null);

  // Each opening starts from what the page asked for, never from the last sheet's state, and a
  // link followed again is opened again: the guard below is per opening, not per token.
  useEffect(() => {
    if (!open) return;
    opened.current = null;
    setState(initial);
    setBusy(false);
    setFieldError(null);
    setError(null);
  }, [open, initial]);

  // A `?g=` arrival: verify the link once, from the browser, and land on the state it names.
  useEffect(() => {
    if (!open || initial.kind !== "opening" || !token || opened.current === token) return;
    opened.current = token;
    let live = true;
    void guestRsvp("open", token)
      .then((answer) => {
        if (!live) return;
        onAnswer(answer);
        setAddress(answer.email);
        if (answer.state === "existing")
          setState({ kind: "existing", status: answer.status ?? "going", email: answer.email });
        else setState({ kind: "returned", offer: answer.offer_conversion });
      })
      .catch((e: unknown) => {
        if (!live) return;
        if (e instanceof GuestLinkExpired) {
          onExpired();
          setState({ kind: "expired" });
        } else {
          setState({ kind: "email" });
          setError(e instanceof GuestRefused ? e.message : GUEST_ANSWER_FAILED);
        }
      });
    return () => {
      live = false;
    };
  }, [open, initial, token, onAnswer, onExpired]);

  const send = async () => {
    const address = email.trim();
    setBusy(true);
    setFieldError(null);
    setError(null);
    try {
      await requestGuestLink(slug, address);
      setState({ kind: "sent", email: address });
    } catch (e) {
      setFieldError(e instanceof GuestRefused ? e.message : GUEST_SEND_FAILED);
    } finally {
      setBusy(false);
    }
  };

  const answer = async (action: "going" | "not_going") => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const a = await guestRsvp(action, token);
      onAnswer(a);
      setAddress(a.email);
      if (a.status === "going" && a.offer_conversion)
        setState({ kind: "conversion", email: a.email });
      else if (a.status === "going") onClose();
      else setState({ kind: "existing", status: "not_going", email: a.email });
    } catch (e) {
      if (e instanceof GuestLinkExpired) {
        onExpired();
        setState({ kind: "expired" });
      } else setError(e instanceof GuestRefused ? e.message : GUEST_ANSWER_FAILED);
    } finally {
      setBusy(false);
    }
  };

  const title =
    state.kind === "sent"
      ? "Check your email"
      : state.kind === "opening"
        ? "Checking your link"
        : state.kind === "returned"
          ? "You are going"
          : state.kind === "conversion"
            ? "Keep this with an account?"
            : state.kind === "existing"
              ? state.status === "going"
                ? "You already said you are going"
                : "You are not going"
              : state.kind === "expired"
                ? "This link has expired"
                : "I am going";

  const emailField = (
    <Input
      label="Email"
      type="email"
      value={email}
      onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
      autoComplete="email"
      inputMode="email"
      hint={GUEST_FIELD_LINE}
      {...(fieldError ? { error: fieldError } : {})}
      disabled={busy}
      required
      data-testid="guest-email"
    />
  );

  const quiet = { margin: 0, fontSize: 15, lineHeight: 1.45, color: "var(--ink-2)" } as const;

  let body: ReactNode;
  let actions: ReactNode;
  switch (state.kind) {
    case "email":
    case "expired":
      body = emailField;
      actions = (
        <Button
          c="convene"
          disabled={busy || !email.trim()}
          onClick={() => void send()}
          data-testid="guest-send"
        >
          {busy ? "Sending" : state.kind === "expired" ? "Send a new link" : "Send me a link"}
        </Button>
      );
      break;
    case "sent":
      body = (
        <>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 500 }} data-testid="guest-sent-to">
            {state.email}
          </p>
          <p style={quiet}>Open the link in it; it signs you in for this event only.</p>
        </>
      );
      actions = (
        <Button variant="secondary" onClick={onClose} data-testid="guest-done">
          Done
        </Button>
      );
      break;
    case "opening":
      body = (
        <p style={quiet} role="status">
          One moment.
        </p>
      );
      actions = null;
      break;
    case "returned":
      body = <p style={quiet}>The door is on this page and in your email.</p>;
      actions = (
        <Button
          c="convene"
          onClick={() => {
            if (state.offer) setState({ kind: "conversion", email: address });
            else onClose();
          }}
          data-testid="guest-continue"
        >
          Continue
        </Button>
      );
      break;
    case "conversion":
      body = <p style={quiet}>An account keeps this event, and the ones after it, in one place.</p>;
      actions = (
        <>
          <Button variant="secondary" onClick={onClose} data-testid="guest-stay">
            Continue as a guest
          </Button>
          <a
            href={createAccountPath(state.email)}
            style={{ textDecoration: "none" }}
            data-testid="guest-create-account"
          >
            <Button c="convene" tabIndex={-1}>
              Create an account
            </Button>
          </a>
        </>
      );
      break;
    case "existing":
      body =
        state.status === "going" ? (
          <p style={quiet}>Keep it, or withdraw and your name is off the host's list.</p>
        ) : (
          <p style={quiet}>You can say you are going again at any time before it happens.</p>
        );
      actions =
        state.status === "going" ? (
          <>
            <Button variant="secondary" disabled={busy} onClick={onClose} data-testid="guest-keep">
              Keep it
            </Button>
            <Button
              variant="danger"
              data-destructive
              disabled={busy}
              onClick={() => void answer("not_going")}
              data-testid="guest-withdraw"
            >
              {busy ? "Saving" : "Withdraw"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" disabled={busy} onClick={onClose}>
              Close
            </Button>
            <Button
              c="convene"
              disabled={busy}
              onClick={() => void answer("going")}
              data-testid="guest-going-again"
            >
              {busy ? "Saving" : "I am going"}
            </Button>
          </>
        );
      break;
  }

  const head = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 56,
        padding: "0 8px 0 20px",
        borderBottom: "1px solid var(--line)",
        flex: "none",
      }}
    >
      <h2
        ref={heading}
        data-sheet-heading
        style={{ flex: 1, margin: 0, fontSize: 17, fontWeight: 700 }}
      >
        {title}
      </h2>
      <IconButton name="x" label="Close" onClick={onClose} />
    </div>
  );

  return (
    <Sheet
      open={open}
      onClose={busy ? undefined : onClose}
      variant={compact ? "sheet" : "drawer"}
      label={title}
      error={error}
      actions={actions}
    >
      {head}
      <div
        data-guest-sheet={state.kind}
        aria-busy={busy || state.kind === "opening" || undefined}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {state.kind === "expired" && (
          <p style={quiet}>Ask for a new one and follow it from your email.</p>
        )}
        {body}
        {state.kind === "email" && <p style={quiet}>{GUEST_SIGNS_YOU_IN}</p>}
      </div>
    </Sheet>
  );
}
