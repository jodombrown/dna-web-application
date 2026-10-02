// /messages (Brief 14, handoff 41-C, SPEC 41-14 Part C item 1; rulings 1334, 1047, 1023, 1368): the
// Messenger's list, and the layout `/messages/{thread}` renders inside. At expanded the thread is the
// content of the Pane beside the list column, with the URL still /messages/{thread}; below expanded
// the thread is its own route (messages.$thread.tsx) and the list steps aside, as /convene does for
// its event page. Signed-in only (156): the shell layout redirects an anonymous visitor to sign in
// before this renders. noindex, as every member surface is until indexability is ruled.
import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { MessengerSurface } from "@/components/dna/MessengerSurface";
import { useAuth } from "@/lib/auth";
import { useTier } from "@/lib/tier";

export const Route = createFileRoute("/_shell/messages")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: MessagesRoute,
});

function MessagesRoute() {
  const { member } = useAuth();
  const params = useParams({ strict: false }) as { thread?: string };
  const tier = useTier();
  if (!member) return null;
  if (params.thread && tier !== "expanded") return <Outlet />;
  return (
    <MessengerSurface
      member={member}
      threadId={params.thread ?? null}
      pane={params.thread ? <Outlet /> : null}
    />
  );
}
