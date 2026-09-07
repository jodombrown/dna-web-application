// Feed (Home). The surface itself is rendered by the shell layout so it stays mounted beneath
// /posts/:id; this route owns the URL and the ?lens= search contract (ruling 83).
import { createFileRoute } from "@tanstack/react-router";
import { validateLens } from "@/lib/lens";

export const Route = createFileRoute("/_shell/feed")({
  validateSearch: validateLens,
  component: () => null,
});
