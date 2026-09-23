// /convene/events/:id (Brief 10, ruling 1023): the member's event page, inside the shell. At
// expanded it renders as the content of Discovery's Pane, which the /convene layout route draws
// around it whatever the member came from (Brief 9, 688, 1047; handoff 31-B item 12), and the page
// omits its own Back row because the pane's `Back to Discovery` is the way back. Below expanded it
// is its own page with its Back row, unchanged. Signed-in only (156): the shell layout redirects an
// anonymous visitor to sign in before this renders. noindex, as every member surface is until
// indexability is ruled.
import { createFileRoute } from "@tanstack/react-router";
import { EventSurface } from "@/components/dna/EventSurface";
import { useAuth } from "@/lib/auth";
import { useTier } from "@/lib/tier";

export const Route = createFileRoute("/_shell/convene/events/$id")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: EventRoute,
});

function EventRoute() {
  const { id } = Route.useParams();
  const { member } = useAuth();
  const tier = useTier();
  if (!member) return null;
  return <EventSurface member={member} id={id} inPane={tier === "expanded"} />;
}
