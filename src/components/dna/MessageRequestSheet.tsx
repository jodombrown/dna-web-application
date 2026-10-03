// Brief 14 (extraction 41-14 section 1.8, "Request composer sheet"; SPEC 41-14 Part C item 4;
// rulings 1330, 1341): the request a reachable non-connection receives before a thread exists.
// Name, headline and stance above one field, the line about how it lands, Not now and Send; the
// write is messenger_request_send and the toast is the caller's. Every word is the extraction's.
import { useRef, useState, type ReactNode } from "react";
import { Avatar } from "@/components/strand/Avatar";
import { Button } from "@/components/strand/Button";
import { IconButton } from "@/components/strand/IconButton";
import { Input } from "@/components/strand/Input";
import { Sheet } from "@/components/strand/Sheet";
import { firstName } from "@/lib/names";

export type MessageRequestMember = {
  id: string;
  name: string;
  headline?: string | null | undefined;
  stance?: string | null | undefined;
  avatarUrl?: string | undefined;
};

export type MessageRequestSheetProps = {
  open: boolean;
  member: MessageRequestMember | null;
  compact: boolean;
  onClose: () => void;
  /** The write; rejects with a MessengerError whose line the sheet shows. */
  onSend: (body: string) => Promise<void>;
};

export function MessageRequestSheet({
  open,
  member,
  compact,
  onClose,
  onSend,
}: MessageRequestSheetProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = member ? firstName(member.name) : "";
  const sub = member ? [member.headline, member.stance].filter(Boolean).join(" · ") : "";
  const submit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await onSend(text.trim());
      setText("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Not sent. Your message is still here.");
    } finally {
      setSending(false);
    }
  };
  const head = (title: string): ReactNode => (
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
      onClose={sending ? undefined : onClose}
      variant={compact ? "sheet" : "drawer"}
      label="Send a request"
      error={error}
      actions={
        <>
          <Button variant="secondary" disabled={sending} onClick={onClose}>
            Not now
          </Button>
          <Button
            c="connect"
            disabled={!text.trim() || sending}
            onClick={() => void submit()}
            data-testid="request-send"
          >
            Send
          </Button>
        </>
      }
    >
      {member && (
        <>
          {head("Send a request")}
          <div
            data-request-sheet
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <Avatar name={member.name} src={member.avatarUrl} size={44} />
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={{ fontSize: "var(--text-s)", fontWeight: 700 }}>{member.name}</span>
                {sub && (
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)" }}>{sub}</span>
                )}
              </div>
            </div>
            <Input
              multiline
              rows={4}
              label="Your message"
              value={text}
              onChange={(e) => setText((e.target as HTMLTextAreaElement).value)}
              placeholder={
                "Say how you know of " + first + " and what you would like to talk about."
              }
              data-testid="request-message"
            />
            <p
              style={{
                margin: 0,
                fontSize: "var(--text-s)",
                lineHeight: "var(--text-s-lh)",
                color: "var(--ink-3)",
                textWrap: "pretty",
              }}
            >
              {first} will see this as a request, with your name, headline and stance, and can
              accept, decline or block.
            </p>
          </div>
        </>
      )}
    </Sheet>
  );
}
