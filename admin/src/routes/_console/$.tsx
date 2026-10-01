// Any other path: signed out it lands on the sign-in through the console's gate, and signed in it
// returns to the shell's root, because the shell has no other page yet.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_console/$")({ component: Elsewhere });

function Elsewhere() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/", replace: true });
  }, [navigate]);
  return null;
}
