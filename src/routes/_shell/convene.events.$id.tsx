// /convene/events/:id (Brief 10, ruling 1023): the member's event page, inside the shell. The static
// segments take precedence over _shell/$c.tsx, so /convene alone stays the C stub and this path
// renders the page. Signed-in only (156): the shell layout redirects an anonymous visitor to sign in
// before this renders. noindex, as every member surface is until indexability is ruled.
import { createFileRoute } from "@tanstack/react-router";
import { EventSurface } from "@/components/dna/EventSurface";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_shell/convene/events/$id")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: EventRoute,
});

function EventRoute() {
  const { id } = Route.useParams();
  const { member } = useAuth();
  if (!member) return null;
  return <EventSurface member={member} id={id} />;
}
