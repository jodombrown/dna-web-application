import { createFileRoute, redirect } from "@tanstack/react-router";

// The app opens on Convene (ruling 67 default route). Sheets and drawers have no route.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/$c", params: { c: "convene" } });
  },
});
