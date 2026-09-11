// Brief 5: the one read of onboarding_state() the gate and the three screens share. One query key
// per member, refetched by the screen that wrote and read by the gate that decides the route, so
// the client never holds two opinions about which screen is next.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadOnboardingState, onboardingQueryKey, type OnboardingState } from "./onboarding";

export function useOnboardingState(memberId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: onboardingQueryKey(memberId ?? "anon"),
    queryFn: loadOnboardingState,
    enabled: enabled && !!memberId,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
}

/** After a write: the fresh state into the cache before the client moves, so the gate agrees. */
export function useRefreshOnboarding(memberId: string | undefined) {
  const qc = useQueryClient();
  return async (): Promise<OnboardingState | null> => {
    if (!memberId) return null;
    return qc.fetchQuery({
      queryKey: onboardingQueryKey(memberId),
      queryFn: loadOnboardingState,
      staleTime: 0,
    });
  };
}
