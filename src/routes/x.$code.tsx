// /x/:code (handoff 32-B item 9; rulings 1081, 1109): an event's short path, outside the shell and
// resolved on the server like /e/. The code is six characters minted when the event is created and
// never changed; `public.resolve_event_link('x', code)` answers the canonical slug only when the event
// has a public page, and the answer is a permanent redirect (308) to /e/{slug}. Anything else is the
// router's notFound, so the response is a 404, as an unknown /e/ slug is. Nothing renders here.
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { resolveEventLink } from "@/lib/event-public";
import { ErrorComponent } from "./__root";

export const Route = createFileRoute("/x/$code")({
  loader: async ({ params }) => {
    const slug = await resolveEventLink("x", params.code);
    if (!slug) throw notFound();
    throw redirect({ to: "/e/$slug", params: { slug }, statusCode: 308 });
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: () => null,
  // A failed read (the project unreachable) renders the system page, never the router's default.
  errorComponent: ErrorComponent,
});
