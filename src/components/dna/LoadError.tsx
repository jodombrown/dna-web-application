// A surface's one alert when its read fails: a title, one line and `Try again`, which re-runs the read.
// Connect drew it first (Brief 4); handoff 31-B item 13 asks for "the Feed's one alert", and the Feed
// has none, so this is Connect's alert moved here unchanged and given its words by the caller, which
// is what lets Discovery render `Convene could not load.` through the same part (ruling 555: the
// mechanism is what the tree holds). Connect passes its own two lines and renders exactly as before.
import { useEffect } from "react";
import { Button } from "@/components/strand/Button";
import { record } from "@/lib/record";

export function LoadError({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry: () => void;
}) {
  // 12C part 2: an in-surface load failure, recorded once per appearance by its code and never
  // the message; the caller's words are the member's and are not sent.
  useEffect(() => {
    record("client_error", { code: "load_failed" });
  }, []);
  return (
    <div
      role="alert"
      style={{
        background: "var(--surface)",
        borderRadius: 14,
        border: "1px solid var(--error)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "flex-start",
      }}
    >
      <span style={{ fontSize: 17, fontWeight: 700 }}>{title}</span>
      <span style={{ fontSize: 15, color: "var(--ink-2)" }}>{body}</span>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
