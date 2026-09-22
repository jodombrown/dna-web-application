// Brief 10's RSVP sheet (B10-SPEC section 4; rulings 561, 584, 680, 1030). One decision, the page
// live beneath, calling `public.rsvp_event` and nothing else (handoff 30-C item 7).
//
// The first RSVP offers the three scopes once, connections preselected, and the server makes the
// chosen scope the member's convene default in the same transaction (1030): the response's
// `default_set` says so, and the page re-reads its projection rather than guessing. Later answers
// show the default's line with one override, revealed by `Change for this event`, and send the
// override alone. Not going and a withdrawal both send `not_going` (item 7.3).
//
// Accessibility (SPEC section 7): on a first RSVP the dialog carries two radiogroups, the answer
// and the scope; thereafter one, until the override is revealed. The server's `This event is
// full.` is the at-capacity state; every other failure is the SPEC's one error line (item 7.4).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/strand/Button";
import { IconButton } from "@/components/strand/IconButton";
import { Segment } from "@/components/strand/Segment";
import { Sheet } from "@/components/strand/Sheet";
import {
  rsvpEvent,
  RsvpError,
  SCOPES,
  scopeOf,
  type Audience,
  type EventPage,
  type RegistrationStatus,
} from "@/lib/event-page";

export const RSVP_TOASTS = {
  going: "You are going. The door is on the page and in your email.",
  not_going: "Saved. You are not going.",
  withdrawn: "Withdrawn. Your name is off the list.",
} as const;

export const RSVP_ERROR = "Could not save your answer. Check your connection and try again.";

export type RsvpSheetProps = {
  open: boolean;
  onClose: () => void;
  page: EventPage;
  compact: boolean;
  /** The answer the sheet opens on when the member has none yet: `I am going` or `Not going`. */
  initial?: RegistrationStatus | undefined;
  /** Called after a saved answer with the toast the page shows; the page re-reads its projection. */
  onSaved: (toast: string) => void;
};

type Mode = "answer" | "full" | "closed";

export function RsvpSheet({ open, onClose, page, compact, initial, onSaved }: RsvpSheetProps) {
  const reg = page.viewer.registration;
  const changing = !!reg;
  const first = !page.viewer.has_default;
  const defaultScope = scopeOf(page.viewer.default_audience);
  const [status, setStatus] = useState<RegistrationStatus>(reg?.status ?? initial ?? "going");
  const [scope, setScope] = useState<Audience>(
    reg?.audience_override ?? (first ? "connections" : page.viewer.default_audience),
  );
  const [override, setOverride] = useState(!!reg?.audience_override);
  const [withdrawing, setWithdrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(
    page.event.past || page.event.cancelled
      ? "closed"
      : page.event.full && reg?.status !== "going"
        ? "full"
        : "answer",
  );
  const heading = useRef<HTMLHeadingElement>(null);

  // Each opening starts from the projection's own answer, never from the last sheet's state.
  useEffect(() => {
    if (!open) return;
    setStatus(reg?.status ?? initial ?? "going");
    setScope(reg?.audience_override ?? (first ? "connections" : page.viewer.default_audience));
    setOverride(!!reg?.audience_override);
    setWithdrawing(false);
    setSaving(false);
    setError(null);
    setMode(
      page.event.past || page.event.cancelled
        ? "closed"
        : page.event.full && reg?.status !== "going"
          ? "full"
          : "answer",
    );
  }, [
    open,
    reg,
    first,
    initial,
    page.event.past,
    page.event.cancelled,
    page.event.full,
    page.viewer.default_audience,
  ]);

  const submit = async (next: RegistrationStatus, toast: string) => {
    setSaving(true);
    setError(null);
    try {
      // First RSVP: the chosen scope becomes the default server-side (1030). Later: an override
      // only when the member changed it for this event; otherwise the default stands, sent as null.
      const audience: Audience | null =
        next === "going" ? (first ? scope : override ? scope : null) : null;
      await rsvpEvent(page.event.id, next, audience);
      onSaved(toast);
    } catch (e) {
      if (e instanceof RsvpError && e.full) setMode("full");
      else setError(RSVP_ERROR);
      setSaving(false);
    }
  };

  const title =
    mode === "full"
      ? "This event is full"
      : mode === "closed"
        ? page.event.cancelled
          ? "This event was cancelled"
          : "This event has happened"
        : changing
          ? "Change your answer"
          : "Are you going?";

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

  let body: ReactNode;
  let actions: ReactNode;
  if (mode === "full") {
    body = (
      <p
        data-rsvp-full
        style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: "var(--ink-2)" }}
      >
        The host has no more room.
      </p>
    );
    actions = (
      <Button variant="secondary" onClick={onClose}>
        Close
      </Button>
    );
  } else if (mode === "closed") {
    body = (
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: "var(--ink-2)" }}>
        {page.event.cancelled
          ? "This event is not taking answers."
          : "This event has happened, so there is nothing to answer."}
      </p>
    );
    actions = (
      <Button variant="secondary" onClick={onClose}>
        Close
      </Button>
    );
  } else {
    const chosen = scopeOf(scope);
    body = (
      <>
        <Segment
          label="Your answer"
          options={[
            { value: "going", label: "Going" },
            { value: "not_going", label: "Not going" },
          ]}
          value={status}
          onChange={(v) => setStatus(v as RegistrationStatus)}
          disabled={saving}
        />
        {status === "going" && first && (
          <div
            data-rsvp-scope="first"
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
              }}
            >
              Who can see you are going
            </div>
            <Segment
              label="Who can see you are going"
              options={SCOPES.map((s) => ({ value: s.value, label: s.label }))}
              value={scope}
              onChange={(v) => setScope(v as Audience)}
              disabled={saving}
            />
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: "var(--ink-3)" }}>
              {chosen.line} You choose this once; it becomes your default and you can change it on
              any event.
            </p>
          </div>
        )}
        {status === "going" && !first && (
          <div
            data-rsvp-scope="default"
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: "var(--ink-2)" }}>
              {override ? chosen.visible : defaultScope.visible}
            </p>
            {!override ? (
              <button
                type="button"
                data-testid="rsvp-override"
                onClick={() => setOverride(true)}
                disabled={saving}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  alignSelf: "flex-start",
                  minHeight: 44,
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: 15,
                  fontWeight: 500,
                  color: "var(--ink)",
                  textDecoration: "underline",
                  textDecorationColor: "var(--line-strong)",
                  textUnderlineOffset: 2,
                }}
              >
                Change for this event
              </button>
            ) : (
              <Segment
                label="Who can see you are going"
                options={SCOPES.map((s) => ({ value: s.value, label: s.label }))}
                value={scope}
                onChange={(v) => setScope(v as Audience)}
                disabled={saving}
              />
            )}
          </div>
        )}
        {status === "not_going" && (
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: "var(--ink-3)" }}>
            Only the host sees a not going.
          </p>
        )}
        {withdrawing && (
          <div
            data-rsvp-withdraw
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              padding: 14,
              borderRadius: "var(--radius-m)",
              background: "var(--bg-sunken)",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 500 }}>Withdraw your answer?</span>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => setWithdrawing(false)}>
                Keep it
              </Button>
              <Button
                variant="danger"
                size="sm"
                data-destructive
                disabled={saving}
                onClick={() => void submit("not_going", RSVP_TOASTS.withdrawn)}
              >
                {saving ? "Saving" : "Withdraw"}
              </Button>
            </div>
          </div>
        )}
      </>
    );
    actions = (
      <>
        {changing ? (
          <Button
            variant="danger"
            data-destructive
            disabled={saving || withdrawing}
            onClick={() => setWithdrawing(true)}
            data-testid="rsvp-withdraw"
          >
            Withdraw
          </Button>
        ) : (
          <Button variant="ghost" disabled={saving} onClick={onClose}>
            Not yet
          </Button>
        )}
        <Button
          c="convene"
          disabled={saving || withdrawing}
          data-testid="rsvp-confirm"
          onClick={() =>
            void submit(status, status === "going" ? RSVP_TOASTS.going : RSVP_TOASTS.not_going)
          }
        >
          {saving ? "Saving" : "Confirm"}
        </Button>
      </>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={saving ? undefined : onClose}
      variant={compact ? "sheet" : "drawer"}
      label={title}
      error={error}
      actions={actions}
    >
      {head}
      <div
        data-rsvp-sheet
        aria-busy={saving || undefined}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {body}
      </div>
    </Sheet>
  );
}
