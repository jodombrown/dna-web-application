// The shell layout route (ruling 69, 84): mounts the chrome once for Feed, /posts/:id and the five
// C routes, owns the one composer mount (ruling 56, moved here from the root in Brief 2), the c
// keypress, and the published toast. The Feed column stays mounted across /feed and /posts/:id so a
// card expands and collapses in place with the column's scroll position untouched (ruling 105).
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { feedViewOf } from "@/lib/feed-view";
import { lensSearch, parseLens, type LensId } from "@/lib/lens";
import { AppShell, COMPOSER_HOST } from "@/components/dna/AppShell";
import { ComposerShell, PUBLISHED_EVENT } from "@/components/dna/ComposerShell";
import { FeedSurface, toastStyle } from "@/components/dna/FeedSurface";
import { Toast } from "@/components/strand/Toast";
import { C_ORDER, type C } from "@/components/strand/cmeta";
import { useAuth } from "@/lib/auth";
import {
  isUngated,
  loadOnboardingState,
  onboardingQueryKey,
  ONBOARDING_ROUTE,
  type OnboardingState,
} from "@/lib/onboarding";
import { getSupabase } from "@/lib/supabase";
import { openComposer, useComposerState } from "@/lib/composer-store";
import { useTier } from "@/lib/tier";
import { useSearch } from "@tanstack/react-router";

/**
 * Ruling 459 (W49): the onboarding gate decides in the route's load, before any member route
 * renders, and not only in the effect that OnboardingGate runs after the first paint. Every member
 * surface is a child of this layout, so one beforeLoad covers all of them and no route can forget.
 *
 * It runs in the browser only. The session lives in the Supabase client's own storage, not in a
 * cookie, so the server render has no member to gate on; giving it one means a cookie session,
 * which is a second auth path and needs a brief that names it. The half of ruling 459 that does
 * hold on the server is the data: private.admit_member excludes an account that has not onboarded
 * from connect_cards, connect_where and send_introduction, whatever the client does.
 */
export const Route = createFileRoute("/_shell")({
  beforeLoad: async ({ context, location }) => {
    if (typeof window === "undefined") return;
    if (isUngated(location.pathname)) return;
    // The public profile renders its own signed-out chrome for a visitor and for "View as public".
    if (location.pathname.startsWith("/m/")) return;
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.auth.getSession();
    const memberId = data.session?.user.id;
    // No session: ShellLayout sends them to sign-in, and the gate has nothing to decide.
    if (!memberId) return;
    const qc = (context as { queryClient: QueryClient }).queryClient;
    let state: OnboardingState | null = null;
    try {
      state = await qc.ensureQueryData({
        queryKey: onboardingQueryKey(memberId),
        queryFn: loadOnboardingState,
        staleTime: Infinity,
      });
    } catch {
      // A read that failed is not a decision. The effect gate retries and holds the route.
      return;
    }
    if (state?.next) throw redirect({ to: ONBOARDING_ROUTE[state.next] });
  },
  component: ShellLayout,
});

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

function activeC(pathname: string): C | null {
  const seg = pathname.split("/")[1] ?? "";
  return (C_ORDER as string[]).includes(seg) ? (seg as C) : null;
}

function ShellLayout() {
  const { ready, member } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useLocation({ select: (l) => l.pathname });
  const fromFeed = useLocation({ select: (l) => !!l.state.fromFeed });
  const reveal = useLocation({ select: (l) => !!l.state.reveal });
  const search = useSearch({ strict: false }) as { lens?: string; as?: string };
  // /m/:handle (Brief 3) is the one route a signed-out visitor may open: the public profile renders
  // its own signed-out chrome, as does the owner's "View as public" (?as=public), so the shell steps
  // aside for both instead of redirecting to sign-in.
  const profilePath = pathname.startsWith("/m/");
  const bare = profilePath && (!member || search.as === "public");
  const lens = parseLens(search.lens);
  const tier = useTier();
  const { seed } = useComposerState();
  const [toast, setToast] = useState<string | null>(null);

  // The layout renders once more with the outgoing location while a navigation to /sign-in is in
  // flight (the public profile's Sign in and Join DNA); that render must not issue a second
  // redirect, which would drop the search the first one carried (?join=1).
  const leavingShell = pathname === "/sign-in";
  useEffect(() => {
    if (ready && !member && !profilePath && !leavingShell) void navigate({ to: "/sign-in" });
  }, [ready, member, profilePath, leavingShell, navigate]);

  // Publishing returns to Feed on All and toasts for 2.6s (SPEC section 3); the composer itself
  // never navigates (ruling 52), the shell does.
  useEffect(() => {
    if (!member) return;
    const onPublished = () => {
      setToast("Published. It is in the Feed.");
      void qc.invalidateQueries({ queryKey: ["feed", member.id] });
      void qc.invalidateQueries({ queryKey: ["rails", member.id] });
      void navigate({ to: "/feed", search: {} });
      window.setTimeout(() => setToast(null), 2600);
    };
    window.addEventListener(PUBLISHED_EVENT, onPublished);
    return () => window.removeEventListener(PUBLISHED_EVENT, onPublished);
  }, [member, qc, navigate]);

  // Shortcut, additive only (ruling 59): c opens the composer when focus is not in a field.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== "c" || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      // A composer sheet that is still sliding out keeps role="dialog" for 300ms; it does not block
      // reopening. Any other open dialog (notifications, account) does.
      if (document.querySelector('[role="dialog"]:not([aria-label="Compose"])')) return;
      e.preventDefault();
      openComposer({ host: COMPOSER_HOST });
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  if (!ready) return null;
  if (bare) {
    return (
      <>
        <Outlet />
        {member && <ComposerShell />}
      </>
    );
  }
  if (!member) return null;

  const active = activeC(pathname);
  const feedView = feedViewOf(pathname, { fromFeed, reveal, __TSR_index: 0 });
  const setLens = (id: LensId) =>
    void navigate({ to: "/feed", search: lensSearch(id), resetScroll: false });

  return (
    <>
      <AppShell
        member={member}
        active={active}
        homeActive={feedView?.kind === "feed" || feedView?.kind === "expanded"}
        feedView={feedView}
        lens={lens}
        onLens={setLens}
        closeKey={pathname + ":" + seed}
      >
        {feedView && <FeedSurface member={member} view={feedView} />}
        <Outlet />
      </AppShell>
      {/* The one composer mount, owned by the shell (rulings 56, 69). */}
      <ComposerShell />
      {toast && (
        <div style={toastStyle(tier)}>
          <Toast>{toast}</Toast>
        </div>
      )}
    </>
  );
}
