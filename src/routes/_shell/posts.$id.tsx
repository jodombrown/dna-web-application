// /posts/:id (ruling 105): one history entry for an expanded card. Reached from the Feed it is the
// same list with that card expanded in place; landed on directly it is the expanded card as page
// content. The shell layout renders the Feed column for both, so this route owns only the URL and
// the ?lens= search contract the Feed beneath keeps.
import { createFileRoute } from "@tanstack/react-router";
import { validateLens } from "@/lib/lens";

export const Route = createFileRoute("/_shell/posts/$id")({
  validateSearch: validateLens,
  component: () => null,
});
