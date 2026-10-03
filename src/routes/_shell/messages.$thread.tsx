// /messages/:thread (Brief 14, handoff 41-C, SPEC 41-14 Part C item 2; rulings 1368, 1369, 1047,
// 1023): the thread. Below expanded it is its own route on Pane's extended route bar, no dock, the
// composer on the safe-area inset; at expanded the same component renders inside the Pane that
// /messages (messages.tsx) draws around it. A search result or the pinned strip opens it with
// `focusSeq` in history state, and the thread lands on that message, ringed. Signed-in only (156).
import { createFileRoute } from "@tanstack/react-router";
import { MessengerThread } from "@/components/dna/MessengerThread";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_shell/messages/$thread")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: ThreadRoute,
});

function ThreadRoute() {
  const { thread } = Route.useParams();
  const { member } = useAuth();
  if (!member) return null;
  return <MessengerThread member={member} threadId={thread} />;
}
