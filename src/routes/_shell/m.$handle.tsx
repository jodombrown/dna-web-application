// /m/:handle (Brief 3, rulings 122 to 136): the member profile in three views plus editing mode.
// Owner and visitor render inside the shell; a signed-out request and the owner's "View as public"
// (?as=public) render the public page with its own signed-out chrome (the shell layout steps
// aside for both). ?edit=1 is the Edit profile mode (ruling 126). Public profiles ship noindex
// until ruling 27 is decided (ruling 127).
import { createFileRoute } from "@tanstack/react-router";
import { ProfileSurface } from "@/components/dna/ProfileSurface";

export type ProfileSearch = { edit?: boolean; as?: "public" };

export const Route = createFileRoute("/_shell/m/$handle")({
  validateSearch: (search: Record<string, unknown>): ProfileSearch => {
    const out: ProfileSearch = {};
    if (search["edit"] === true || search["edit"] === "1" || search["edit"] === 1) out.edit = true;
    if (search["as"] === "public") out.as = "public";
    return out;
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: ProfileRoute,
});

function ProfileRoute() {
  const { handle } = Route.useParams();
  const { edit, as } = Route.useSearch();
  return <ProfileSurface handle={handle} edit={!!edit} asPublic={as === "public"} />;
}
