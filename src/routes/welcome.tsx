// Brief 5, screen one: who you are (SPEC sections 1, 4). Signed-in only (ruling 156); the gate in
// the root route decides whether this is the member's next screen.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { WhoScreen } from "@/components/dna/OnboardingSurface";
import { useAuth } from "@/lib/auth";
import { onboardWho } from "@/lib/onboarding";
import { useOnboardingState, useRefreshOnboarding } from "@/lib/onboarding-hooks";
import { useTheme } from "@/lib/tier";

export const Route = createFileRoute("/welcome")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: Welcome,
});

function Welcome() {
  useTheme();
  const navigate = useNavigate();
  const { ready, member } = useAuth();
  const { data: state } = useOnboardingState(member?.id);
  const refresh = useRefreshOnboarding(member?.id);
  useEffect(() => {
    if (ready && !member) void navigate({ to: "/sign-in" });
  }, [ready, member, navigate]);
  if (!ready || !member || !state) return null;
  return (
    <WhoScreen
      state={state}
      onSubmit={async (input) => {
        try {
          const r = await onboardWho(input);
          if (r.status === "taken") return "taken";
          if (r.status !== "ok") return "failed";
          await refresh();
          await navigate({ to: "/where" });
          return "ok";
        } catch {
          return "failed";
        }
      }}
    />
  );
}
