// The one shell, mounted once at the app root by the _shell layout route (ruling 69): AppHeader,
// the five-C nav as PulseDock in bar (expanded) and dock (compact, medium) variants (rulings 78, 87),
// and the expanded canvas with its rail slots (rulings 79, 86). Matches B2-Shell-Feed-v2 SPEC.md
// sections 1 and 2. Feed is Home and neutral; no route composes its own chrome; transitions are
// client-side and the shell never remounts (ruling 84).
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppHeader } from "@/components/strand/AppHeader";
import { Button } from "@/components/strand/Button";
import { PulseDock } from "@/components/strand/PulseDock";
import { Switch } from "@/components/strand/Switch";
import type { C } from "@/components/strand/cmeta";
import { LeftRail, RightRail } from "@/components/dna/Rails";
import { NotificationPanel } from "@/components/dna/NotificationPanel";
import type { Member } from "@/lib/auth";
import { openComposer } from "@/lib/composer-store";
import { getSupabase } from "@/lib/supabase";
import { useTheme, useTier, useWide } from "@/lib/tier";

export const COMPOSER_HOST = "feed";

/** Popover chrome shared by the expanded notification list and the account panel (SPEC section 6). */
export const POPOVER_STYLE = {
  position: "fixed" as const,
  top: 60,
  right: 32,
  width: 380,
  maxHeight: 560,
  zIndex: 50,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 14,
  boxShadow: "var(--shadow-stack)",
  display: "flex",
  flexDirection: "column" as const,
  overflow: "hidden",
  animation: "strand-fade var(--dur-base) var(--ease)",
};

export function AppShell({
  member,
  active,
  homeActive,
  closeKey,
  children,
}: {
  member: Member;
  /** The C whose route is showing; null on Feed (Home) and the overlay. */
  active: C | null;
  homeActive: boolean;
  /** Changes on route change or composer open; open panels close (prototype behaviour). */
  closeKey: string;
  children: ReactNode;
}) {
  const tier = useTier();
  const wide = useWide();
  const navigate = useNavigate();
  const router = useRouter();
  const [theme, setTheme] = useTheme();
  const [account, setAccount] = useState(false);
  const expanded = tier === "expanded";
  const compact = tier === "compact";
  // Proof the shell mounted once: the stamp is set on mount and never changes across routes.
  const mounted = useRef<string>("");
  if (!mounted.current) mounted.current = String(Date.now());
  useEffect(() => {
    document.documentElement.setAttribute("data-shell", mounted.current);
  }, []);
  useEffect(() => {
    setAccount(false);
  }, [closeKey]);
  useEffect(() => {
    if (!account) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccount(false);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [account]);

  const go = (c: C) => {
    setAccount(false);
    void navigate({ to: "/$c", params: { c } });
  };
  const warm = (c: C) => void router.preloadRoute({ to: "/$c", params: { c } });
  const homeHref = router.buildLocation({ to: "/feed", search: {} }).href;
  const signOut = async () => {
    await getSupabase()?.auth.signOut();
    void navigate({ to: "/sign-in" });
  };
  const bottomPad = compact
    ? "calc(112px + env(safe-area-inset-bottom))"
    : "calc(96px + env(safe-area-inset-bottom))";
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
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "var(--bg)" }}>
        <AppHeader
          variant={expanded ? "expanded" : "compact"}
          homeActive={homeActive}
          homeHref={homeHref}
          onHome={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey) return;
            e.preventDefault();
            setAccount(false);
            void navigate({ to: "/feed", search: {} });
          }}
          onHomeIntent={() => void router.preloadRoute({ to: "/feed", search: {} })}
          member={{ name: member.name, src: member.avatar }}
          onCompose={() => {
            setAccount(false);
            openComposer({ host: COMPOSER_HOST });
          }}
          onAvatar={() => setAccount((v) => !v)}
          avatarActive={account}
          style={{
            paddingTop: "env(safe-area-inset-top)",
            height: "auto",
            minHeight: expanded ? 64 : 56,
          }}
        >
          <NotificationPanel
            member={member}
            tier={tier}
            onOpen={() => setAccount(false)}
            closeKey={closeKey}
          />
        </AppHeader>
        {expanded && (
          <PulseDock
            bar
            active={active ?? undefined}
            onSelect={go}
            onIntent={warm}
            style={{ padding: "0 24px" }}
          />
        )}
      </div>
      {expanded ? (
        <div
          style={{
            flex: 1,
            width: "100%",
            maxWidth: 1440,
            margin: "0 auto",
            boxSizing: "border-box",
            display: "grid",
            gridTemplateColumns: wide
              ? "260px minmax(680px, 760px) 320px"
              : "260px minmax(680px, 760px)",
            gap: 24,
            justifyContent: "center",
            padding: "24px 32px 48px",
          }}
        >
          <aside
            aria-label="Your quick state"
            style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}
          >
            <LeftRail member={member} />
          </aside>
          <main style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            {children}
          </main>
          {wide && (
            <aside
              aria-label="DIA suggests"
              style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}
            >
              <RightRail />
            </aside>
          )}
        </div>
      ) : (
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: compact ? `12px 16px ${bottomPad}` : `24px 32px ${bottomPad}`,
            maxWidth: 680,
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {children}
        </main>
      )}
      {!expanded && (
        <PulseDock
          fixed
          active={active ?? undefined}
          onSelect={go}
          style={compact ? undefined : { padding: "0 120px" }}
        />
      )}
      {account && (
        <>
          {expanded && (
            <button
              type="button"
              aria-label="Close account panel"
              onClick={() => setAccount(false)}
              style={{ all: "unset", position: "fixed", inset: 0, zIndex: 40, cursor: "default" }}
            />
          )}
          <div
            role="dialog"
            aria-label="Account"
            data-testid="account-panel"
            style={
              expanded
                ? POPOVER_STYLE
                : {
                    position: "fixed",
                    inset: 0,
                    paddingTop: "env(safe-area-inset-top)",
                    zIndex: 50,
                    background: "var(--bg)",
                    display: "flex",
                    flexDirection: "column",
                    boxSizing: "border-box",
                    animation: "strand-slide var(--dur-base) var(--ease)",
                  }
            }
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                height: 56,
                padding: "0 8px 0 16px",
                borderBottom: "1px solid var(--line)",
                flex: "none",
              }}
            >
              <span style={{ flex: 1, fontSize: 17, fontWeight: 500 }}>{member.name}</span>
              <Button variant="ghost" size="sm" onClick={() => setAccount(false)}>
                Close
              </Button>
            </div>
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
              {member.email && (
                <span style={{ fontSize: 15, color: "var(--ink-3)" }}>{member.email}</span>
              )}
              <Switch
                label="Dark theme"
                checked={theme === "dark"}
                onChange={(on) => setTheme(on ? "dark" : "light")}
              />
              <Button variant="secondary" size="sm" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
