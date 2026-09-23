// /convene (Brief 9, the Discovery Dashboard; handoff 31-B item 2): Discovery at lens All, and the
// layout every route under /convene renders inside. `/convene/{section}` (convene.$lens.tsx) sets
// one lens and `/convene/events/{id}` (convene.events.$id.tsx) is Brief 10's event page, so this
// route owns the facets in the query for all three (586, 1042) and keeps one Discovery mounted
// across them: at expanded the event page is the content of Discovery's Pane with the lanes still
// mounted as its list (688, 1047), whatever the member came from; below expanded the event page is
// its own route and Discovery steps aside (1023). The tier is the shell's own source.
//
// Signed-in only (662): the shell layout redirects an anonymous visitor to sign in before this
// renders. noindex, as every member surface is until indexability is ruled.
import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { DiscoverySurface } from "@/components/dna/DiscoverySurface";
import { useAuth } from "@/lib/auth";
import { isSectionId, validateDiscoverySearch } from "@/lib/discovery-search";
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
  const tier = useTier();
  if (!member) return null;
  if (params.id && tier !== "expanded") return <Outlet />;
  return (
    <DiscoverySurface
      member={member}
      lens={isSectionId(params.lens) ? params.lens : "all"}
      search={search}
      paneId={params.id ?? null}
      pane={params.id ? <Outlet /> : null}
    />
  );
}
