// Brief 10's invitation sheet (B10-SPEC section 4; rulings 736, 752, 1027; handoff 30-C item 11).
// `{Verb} {event title}?`, one body line, the when and place rows, then Decline and Accept through
// `public.respond_to_event_role`. The sheet does not carry `Your profile lists the role once you
// accept (Brief 7).`: ruling 1027 withdrew that line (G60), because Brief 7 draws no accepted-role
// state for it to promise.
import { useRef, useState } from "react";
import { Button } from "@/components/strand/Button";
import { Icon } from "@/components/strand/Icon";
import { IconButton } from "@/components/strand/IconButton";
import { Sheet } from "@/components/strand/Sheet";
import { respondToEventRole, type EventInvitation } from "@/lib/event-page";

export const INVITATION_ERROR = "Could not send your answer. Check your connection and try again.";

export type RoleInvitationSheetProps = {
  open: boolean;
  onClose: () => void;
  invitation: EventInvitation | null;
  eventTitle: string;
  hostName: string;
  whenLine: string;
  placeLine: string;
  compact: boolean;
  /** After an answer the page re-reads its projection (1027: accepted stops rendering, declined is gone). */
  onAnswered: (accepted: boolean) => void;
};

function capitalise(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function RoleInvitationSheet({
  open,
  onClose,
  invitation,
  eventTitle,
  hostName,
  whenLine,
  placeLine,
  compact,
  onAnswered,
}: RoleInvitationSheetProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const verb = invitation?.verb ?? "";
  const title = capitalise(verb) + " " + eventTitle + "?";

  const answer = async (accept: boolean) => {
    if (!invitation) return;
    setSaving(true);
    setError(null);
    try {
      await respondToEventRole(invitation.party_id, accept);
      setSaving(false);
      onAnswered(accept);
    } catch {
      setError(INVITATION_ERROR);
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={saving ? undefined : onClose}
      variant={compact ? "sheet" : "drawer"}
      label={title}
      error={error}
      actions={
        <>
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => void answer(false)}
            data-testid="invitation-decline"
          >
            Decline
          </Button>
          <Button
            c="convene"
            disabled={saving}
            onClick={() => void answer(true)}
            data-testid="invitation-accept"
          >
            {saving ? "Saving" : "Accept"}
          </Button>
        </>
      }
    >
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
      <div
        data-invitation-sheet
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
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: "var(--ink)" }}>
          {hostName} invited you to {verb} this event.
        </p>
        {whenLine && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <Icon name="calendar" size={18} style={{ marginTop: 2, color: "var(--ink-2)" }} />
            <span style={{ fontSize: 15, lineHeight: 1.45 }}>{whenLine}</span>
          </div>
        )}
        {placeLine && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <Icon name="map-pin" size={18} style={{ marginTop: 2, color: "var(--ink-2)" }} />
            <span style={{ fontSize: 15, lineHeight: 1.45 }}>{placeLine}</span>
          </div>
        )}
      </div>
    </Sheet>
  );
}
