// /connect (Brief 4, rulings 153 to 182): four lenses (Members, Suggested, My Network, Where) with the
// lens and the ten single-value filters in the URL (rulings 84, 163). Signed-in only (ruling 156):
// the shell layout redirects an anonymous visitor to sign in before this renders. Renders inside
// the shell, never its own chrome (ruling 69). noindex until indexability is ruled.
import { createFileRoute } from "@tanstack/react-router";
import { ConnectSurface } from "@/components/dna/ConnectSurface";
import { useAuth } from "@/lib/auth";
import { validateConnectSearch } from "@/lib/connect";

export const Route = createFileRoute("/_shell/connect")({
  validateSearch: validateConnectSearch,
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: ConnectRoute,
});

function ConnectRoute() {
  const search = Route.useSearch();
  const { member } = useAuth();
  if (!member) return null;
  return <ConnectSurface member={member} search={search} />;
}
