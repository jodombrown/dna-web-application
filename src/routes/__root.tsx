import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useLocation,
  useNavigate,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider, useAuth } from "../lib/auth";
import {
  isUngated,
  noteInitialState,
  ONBOARDING_ORDER,
  ONBOARDING_ROUTE,
  screenOfPath,
} from "../lib/onboarding";
import { useOnboardingState } from "../lib/onboarding-hooks";
import { captureRecoveryFromUrl, recoveryPending } from "../lib/recovery";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/feed"
            search={{}}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "DNA" },
      { name: "description", content: "Diaspora Network Africa" },
      { name: "theme-color", content: "#faf7f2" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { property: "og:title", content: "DNA" },
      { property: "og:type", content: "website" },
    ],
    links: [
      // Ruling 433 (U-S10): the two brand faces are self-hosted under public/strand/fonts, so no
      // third party is contacted for type and no preconnect is needed.
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      // Ruling 184's asset contract: every icon resolves by path from public/, so the redesign is
      // a file overwrite in one directory. The favicon.png line is the founder's own 9 September
      // edit and is left exactly as they set it.
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // Ruling 438: the CSP nonce this response was rendered with, echoed for the client-side router
  // (it reads meta[property="csp-nonce"] at hydration). Absent when no nonce was minted.
  const nonce = useRouter().options.ssr?.nonce;
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {nonce && <meta property="csp-nonce" content={nonce} />}
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Ruling 240: the recovery handler renders /reset/new and never the Feed. A recovery token that
 * lands anywhere in the app — the Site URL included, which is where it lands today — is held here
 * until a password is set, so the session it created is not usable for anything else. Registering
 * /reset/new as the recovery redirect in Supabase's URL configuration removes the detour; this
 * removes the silent sign-in whether or not it is registered.
 */
function RecoveryGate() {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (l) => l.pathname });
  useEffect(() => {
    captureRecoveryFromUrl();
    if (!recoveryPending()) return;
    if (pathname.replace(/\/$/, "") === "/reset/new") return;
    void navigate({ to: "/reset/new", replace: true });
  }, [pathname, navigate]);
  return null;
}

/**
 * Brief 5 (SPEC section 1, ruling 307): every guarded route redirects to the first incomplete
 * onboarding screen until onboarded_at is set, decided by onboarding_state() and never inferred
 * client-side. One place, like RecoveryGate above it, so no route can forget. A member who has
 * onboarded and opens an onboarding route is sent to the Feed; a screen already completed is
 * reachable (Back reaches it), a screen ahead of the next one is not. Guarded routes render
 * nothing until the state is known, so the Feed never flashes before the redirect.
 */
function OnboardingGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (l) => l.pathname });
  const { ready, member } = useAuth();
  const enabled = ready && !!member && !recoveryPending();
  const q = useOnboardingState(member?.id, enabled);
  const state = q.data ?? null;
  useEffect(() => {
    if (state) noteInitialState(state);
  }, [state]);

  const screen = screenOfPath(pathname);
  const ungated = isUngated(pathname);
  let target: "/feed" | "/welcome" | "/where" | "/relationship" | null = null;
  if (enabled && q.status === "success" && state) {
    const next = state.next;
    if (next === null) {
      if (screen) target = "/feed";
    } else {
      const want = ONBOARDING_ROUTE[next];
      if (screen) {
        if (ONBOARDING_ORDER.indexOf(screen) > ONBOARDING_ORDER.indexOf(next)) target = want;
      } else if (!ungated) target = want;
    }
  }
  // Only once the router is idle. While a transition is pending the router still renders the
  // previous match (sign-in, after its own redirect to the Feed), and a redirect issued into that
  // window keeps the previous match mounted and its redirect firing: a loop between the two.
  const routerStatus = useRouterState({ select: (s) => s.status });
  // While a transition is pending the router still renders the resolved (previous) match, so a
  // guarded route that is being left must stay held too, or the Feed flashes on its way out.
  const resolvedPath = useRouterState({
    select: (s) => (s.resolvedLocation ?? s.location).pathname,
  });
  const issued = useRef<string | null>(null);
  useEffect(() => {
    if (!target) {
      issued.current = null;
      return;
    }
    if (routerStatus !== "idle") return;
    const key = pathname + " -> " + target;
    if (issued.current === key) return;
    issued.current = key;
    void navigate({ to: target, replace: true, search: {} });
  }, [target, pathname, routerStatus, navigate]);

  const leavingGuarded =
    routerStatus !== "idle" && !isUngated(resolvedPath) && !screenOfPath(resolvedPath);
  const holding =
    enabled &&
    ((!ungated && (q.status === "pending" || target !== null)) ||
      (leavingGuarded && q.status === "success" && !!state && state.next !== null));
  if (holding) return null;
  return <>{children}</>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RecoveryGate />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        {/* The composer mounts once inside the shell layout (src/routes/_shell.tsx), not here. */}
        <OnboardingGate>
          <Outlet />
        </OnboardingGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
