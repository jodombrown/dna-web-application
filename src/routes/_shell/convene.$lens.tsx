// /convene/{lens} (Brief 9, 693; handoff 31-B item 2; handoff 32-B item 1): one lens of Discovery.
// The surface is rendered by the /convene layout route so it stays mounted across a lens change; this
// route owns the path segment and accepts the four who-lenses of 1093 (All is /convene itself, never
// /convene/all). The facets in the query are the layout's.
//
// Three paths were lenses before 1093 made them lanes, and each goes to the All view with what it used
// to show, as a facet where one expresses it (item 1): /convene/soon to `when=two_weeks`,
// /convene/online to `format=online`, one value because Format is single-choice (1122), /convene/near
// to /convene. The query the member arrived with is kept, and the redirect's own facet replaces its
// axis. Anything else is not found.
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { isLensId, type DiscoverySearch } from "@/lib/discovery-search";

const FORMER: Record<string, (s: DiscoverySearch) => DiscoverySearch> = {
  soon: (s) => ({ ...s, when: "two_weeks" }),
  online: (s) => ({ ...s, format: "online" }),
  near: (s) => s,
};

export const Route = createFileRoute("/_shell/convene/$lens")({
  beforeLoad: ({ params, search }) => {
    const former = FORMER[params.lens];
    if (former)
      throw redirect({ to: "/convene", search: former(search as DiscoverySearch), replace: true });
    if (!isLensId(params.lens)) throw notFound();
  },
  component: () => null,
});
