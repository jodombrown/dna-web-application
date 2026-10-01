// The empty shell's one child: nothing yet. 12B onward adds the consoles here.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_console/")({ component: () => null });
