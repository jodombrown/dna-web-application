import { createFileRoute, redirect } from "@tanstack/react-router";

// Feed is Home (ruling 69). Sheets, drawers and the composer have no route.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/feed", search: {} });
  },
});
