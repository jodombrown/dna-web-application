// /convene (Brief 9, the Discovery Dashboard; handoff 31-B item 2): Discovery at lens All, and the
// layout every route under /convene renders inside. `/convene/{lens}` (convene.$lens.tsx) sets
// one of the four who-lenses (1093) and `/convene/events/{id}` (convene.events.$id.tsx) is Brief 10's event page, so this
// route owns the facets in the query for all three (586, 1042) and keeps one Discovery mounted
// across them: at expanded the event page is the content of Discovery's Pane with the lanes still
// mounted as its list (688, 1047), whatever the member came from; below expanded the event page is
// its own route and Discovery steps aside (1023). The tier is the shell's own source.
//
// The lens behind the pane (1063): the path's `$lens` when there is one; else, with an event open,
// the lens of the origin Discovery set in history state when it opened the event (src/lib/origin.ts);
// else All. The query key is therefore the one the member opened from and the list does not reload.
// A shared link or a new tab carries no history state and opens behind All, which 1063 accepted.
//
// Signed-in only (662): the shell layout redirects an anonymous visitor to sign in before this
// renders. noindex, as every member surface is until indexability is ruled.
import { createFileRoute, Outlet, useLocation, useParams } from "@tanstack/react-router";
import { DiscoverySurface } from "@/components/dna/DiscoverySurface";
import { useAuth } from "@/lib/auth";
import { isLensId, validateDiscoverySearch } from "@/lib/discovery-search";
import { useTier } from "@/lib/tier";

export const Route = createFileRoute("/_shell/convene")({
  validateSearch: validateDiscoverySearch,
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: ConveneRoute,
});

function ConveneRoute() {
  const { member } = useAuth();
  const search = Route.useSearch();
  const params = useParams({ strict: false }) as { lens?: string; id?: string };
  const originLens = useLocation({ select: (l) => l.state.origin?.params.lens });
  const tier = useTier();
  if (!member) return null;
  if (params.id && tier !== "expanded") return <Outlet />;
  const lens = isLensId(params.lens)
    ? params.lens
    : params.id && isLensId(originLens)
      ? originLens
      : "all";
  return (
    <DiscoverySurface
      member={member}
      lens={lens}
      search={search}
      paneId={params.id ?? null}
      pane={params.id ? <Outlet /> : null}
    />
  );
}
