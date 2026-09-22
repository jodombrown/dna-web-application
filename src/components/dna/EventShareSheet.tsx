// Brief 10's Share sheet (B10-SPEC section 4; rulings 679, 88, 1028; handoff 30-C item 9).
//
// The copy row carries the public URL, `/e/{slug}` on this origin, when the event has a public page
// (1028), and the member link otherwise; the page-link code renders only beside the public URL,
// because its own line says it scans to the public page. The code is generated from the URL at
// runtime by `qrcode` (pinned in package.json) into a data URL the page's CSP already admits, and it
// is a distinct object from an admit token: a plain square, labelled as a page link, with the line
// that says it admits nobody (88). `Share via` uses the Web Share API where the browser has it.
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/strand/Button";
import { Icon } from "@/components/strand/Icon";
import { IconButton } from "@/components/strand/IconButton";
import { Sheet } from "@/components/strand/Sheet";

export type EventShareSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** The link the row carries. */
  url: string;
  /** Whether that link is the public page, which alone earns the code (1028). */
  isPublic: boolean;
  compact: boolean;
  onToast: (text: string) => void;
};

export const SHARE_COPIED = "Link copied.";

export function EventShareSheet({
  open,
  onClose,
  title,
  url,
  isPublic,
  compact,
  onToast,
}: EventShareSheetProps) {
  const [code, setCode] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    if (!open || !isPublic) {
      setCode(null);
      return;
    }
    let live = true;
    QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 1, width: 240 })
      .then((data) => {
        if (live) setCode(data);
      })
      .catch(() => {
        if (live) setCode(null);
      });
    return () => {
      live = false;
    };
  }, [open, isPublic, url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      onToast(SHARE_COPIED);
    } catch {
      onToast(url);
    }
  };
  const shareVia = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      /* the member dismissed the share sheet, or the browser declined */
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      variant={compact ? "sheet" : "drawer"}
      label="Share this event"
      actions={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
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
          Share this event
        </h2>
        <IconButton name="x" label="Close" onClick={onClose} />
      </div>
      <div
        data-share-sheet
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
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: "var(--ink-3)" }}>
          {isPublic
            ? "Anyone with this link can read the event page."
            : "Only members who can see this event can open this link."}
        </p>
        <div
          data-share-url
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 8px 8px 14px",
            borderRadius: "var(--radius-m)",
            background: "var(--bg-sunken)",
          }}
        >
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 15,
              color: "var(--ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {url}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void copy()}
            data-testid="share-copy"
          >
            Copy
          </Button>
        </div>
        {isPublic && (
          <div
            data-share-code
            style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}
          >
            <span
              aria-label="Page link, as a code"
              role="img"
              style={{
                width: 120,
                height: 120,
                flex: "none",
                borderRadius: "var(--radius-m)",
                border: "1px solid var(--line)",
                background: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {code ? (
                <img
                  src={code}
                  alt=""
                  width={112}
                  height={112}
                  style={{ display: "block", width: 112, height: 112 }}
                />
              ) : (
                <Icon name="link" size={24} style={{ color: "var(--ink-3)" }} />
              )}
            </span>
            <span
              style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}
            >
              <span style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>
                Page link, as a code
              </span>
              <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink-3)" }}>
                Scans to the public page. It is not a ticket and admits nobody.
              </span>
            </span>
          </div>
        )}
        {canShare && (
          <div>
            <Button c="convene" onClick={() => void shareVia()} data-testid="share-via">
              Share via
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
