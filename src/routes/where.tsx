// Brief 5, screen two: where you are (SPEC sections 1, 5). The country list is ruling 242's world
// list, read from vocabularies() at runtime and never held in a component.
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { WhereScreen } from "@/components/dna/OnboardingSurface";
import { useAuth } from "@/lib/auth";
import { onboardWhere } from "@/lib/onboarding";
import { useOnboardingState, useRefreshOnboarding } from "@/lib/onboarding-hooks";
import { useTheme } from "@/lib/tier";
import { loadVocabularies } from "@/lib/vocabularies";

export const Route = createFileRoute("/where")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: Where,
});

function Where() {
  useTheme();
  const navigate = useNavigate();
  const { ready, member } = useAuth();
  const { data: state } = useOnboardingState(member?.id);
  const refresh = useRefreshOnboarding(member?.id);
  const vocab = useQuery({
    queryKey: ["vocabularies"],
    queryFn: loadVocabularies,
    enabled: ready && !!member,
    staleTime: Infinity,
  });
  useEffect(() => {
    if (ready && !member) void navigate({ to: "/sign-in" });
  }, [ready, member, navigate]);
  if (!ready || !member || !state) return null;
  return (
    <WhereScreen
      state={state}
      world={vocab.data?.world ?? []}
      onBack={() => void navigate({ to: "/welcome" })}
      onSubmit={async (input) => {
        try {
          const r = await onboardWhere(input);
          if (r.status !== "ok") return "failed";
          await refresh();
          await navigate({ to: "/relationship" });
          return "ok";
        } catch {
          return "failed";
        }
      }}
    />
  );
}
