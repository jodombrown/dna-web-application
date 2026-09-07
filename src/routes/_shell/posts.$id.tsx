// /posts/:id, the quick-look overlay (ruling 85): a real route layered over Feed, not a route swap.
// Carries ?lens= so the Feed beneath keeps the lens the member was reading.
import { createFileRoute } from "@tanstack/react-router";
import { PostQuickLook } from "@/components/dna/PostQuickLook";
import { useAuth } from "@/lib/auth";
import { validateLens } from "@/lib/lens";

export const Route = createFileRoute("/_shell/posts/$id")({
  validateSearch: validateLens,
  component: PostRoute,
});

function PostRoute() {
  const { id } = Route.useParams();
  const { member } = useAuth();
  if (!member) return null;
  return <PostQuickLook member={member} id={id} />;
}
