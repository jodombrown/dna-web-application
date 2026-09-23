// /convene/{section} (Brief 9, 693; handoff 31-B item 2): one lens of Discovery. The surface is
// rendered by the /convene layout route so it stays mounted across a lens change; this route owns
// the path segment and refuses anything that is not one of the projection's seven sections (All is
// /convene itself, never /convene/all). The facets in the query are the layout's.
import { createFileRoute, notFound } from "@tanstack/react-router";
import { isSectionId } from "@/lib/discovery-search";

export const Route = createFileRoute("/_shell/convene/$lens")({
  beforeLoad: ({ params }) => {
    if (!isSectionId(params.lens)) throw notFound();
  },
  component: () => null,
});
