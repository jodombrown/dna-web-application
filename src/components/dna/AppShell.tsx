// The one shell, mounted once at the app root by the _shell layout route (ruling 69): AppHeader,
// the five-C nav as PulseDock in bar (expanded) and dock (compact, medium) variants (rulings 78, 87),
// and the expanded canvas with its rail slots (rulings 79, 86). Feed is Home and neutral; no route
// composes its own chrome; transitions are client-side and the shell never remounts (ruling 84).
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { AppHeader } from "@/components/strand/AppHeader";
import { IconButton } from "@/components/strand/IconButton";
import { PulseDock } from "@/components/strand/PulseDock";
import type { C } from "@/components/strand/cmeta";
import { LeftRail, RightRail } from "@/components/dna/Rails";
import { NotificationPanel } from "@/components/dna/NotificationPanel";
import type { Member } from "@/lib/auth";
import { openComposer } from "@/lib/composer-store";
import { getSupabase } from "@/lib/supabase";
import { useTheme, useTier, useWide } from "@/lib/tier";

export const COMPOSER_HOST = "feed";

export function AppShell({
  member,
  active,
  surface,
  children,
}: {
  member: Member;
  /** The C whose route is showing; null on Feed (Home) and the overlay. */
  active: C | null;
  /** Human label of the current surface, for the right rail's scope. */
  surface: string;
  children: ReactNode;
}) {
  const tier = useTier();
  const wide = useWide();
  const navigate = useNavigate();
  const router = useRouter();
  const [theme, setTheme] = useTheme();
  const expanded = tier === "expanded";
  const compact = tier === "compact";
  // Proof the shell mounted once: the stamp is set on mount and never changes across routes.
  const mounted = useRef<string>("");
  if (!mounted.current) mounted.current = String(Date.now());
  useEffect(() => {
    document.documentElement.setAttribute("data-shell", mounted.current);
  }, []);

  const go = (c: C) => void navigate({ to: "/$c", params: { c } });
  const warm = (c: C) => void router.preloadRoute({ to: "/$c", params: { c } });
  const signOut = async () => {
    await getSupabase()?.auth.signOut();
    void navigate({ to: "/sign-in" });
  };
  const controls = (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <IconButton
        name={theme === "dark" ? "circle" : "circle-dot"}
        label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        data-testid="theme-toggle"
      />
      <IconButton name="arrow-left" label="Sign out" onClick={() => void signOut()} />
    </div>
  );
  const home = (
    <Link
      to="/feed"
      search={{}}
      aria-label="Home"
      preload="intent"
      preloadDelay={80}
      data-testid="home"
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 22,
        lineHeight: 1,
        color: "var(--ink)",
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        minHeight: 44,
      }}
    >
      DNA
    </Link>
  );
  const dockPad = "calc(var(--dock-height) + 24px + env(safe-area-inset-bottom))";
  return (
    <div
      data-tier={tier}
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        color: "var(--ink)",
      }}
    >
      <AppHeader
        compact={compact}
        home={home}
        onCompose={() => openComposer({ host: COMPOSER_HOST })}
        bell={<NotificationPanel member={member} tier={tier} />}
        controls={controls}
        nav={
          expanded ? (
            <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 12px" }}>
              <PulseDock
                bar
                active={active ?? undefined}
                onSelect={go}
                onIntent={warm}
                style={{ borderBottom: "none", height: 52 }}
              />
            </div>
          ) : undefined
        }
      />
      <div
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 1440,
          margin: "0 auto",
          boxSizing: "border-box",
          display: "grid",
          gridTemplateColumns: expanded
            ? wide
              ? "260px minmax(0, 760px) 320px"
              : "260px minmax(0, 760px)"
            : "minmax(0, 1fr)",
          justifyContent: "center",
          columnGap: 24,
          alignItems: "start",
          padding: expanded
            ? "24px 24px 48px"
            : compact
              ? `12px 16px ${dockPad}`
              : `20px 24px ${dockPad}`,
        }}
      >
        {expanded && (
          <aside aria-label="Your quick state" style={{ position: "sticky", top: 140 }}>
            <LeftRail member={member} />
          </aside>
        )}
        <main
          style={{
            width: "100%",
            maxWidth: expanded ? undefined : "var(--content-max)",
            margin: expanded ? undefined : "0 auto",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {children}
        </main>
        {expanded && wide && (
          <aside aria-label="Suggestions" style={{ position: "sticky", top: 140 }}>
            <RightRail surface={surface} />
          </aside>
        )}
      </div>
      {!expanded && <PulseDock fixed active={active ?? undefined} onSelect={go} />}
    </div>
  );
}
