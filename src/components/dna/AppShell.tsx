// Host chrome for the five C surfaces: Pulse bar (expanded, medium) or dock (compact), theme toggle
// (ruling 57), sign out. The composer has no route; it opens over whatever host is showing.
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { IconButton } from "@/components/strand/IconButton";
import { PulseDock } from "@/components/strand/PulseDock";
import type { C } from "@/components/strand/cmeta";
import { getSupabase } from "@/lib/supabase";
import { useTheme, useTier } from "@/lib/tier";

export function AppShell({ active, children }: { active: C; children: ReactNode }) {
  const tier = useTier();
  const navigate = useNavigate();
  const [theme, setTheme] = useTheme();
  const compact = tier === "compact";
  const go = (c: C) => void navigate({ to: "/$c", params: { c } });
  const signOut = async () => {
    await getSupabase()?.auth.signOut();
    void navigate({ to: "/sign-in" });
  };
  const controls = (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
      <IconButton
        name={theme === "dark" ? "circle" : "circle-dot"}
        label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        data-testid="theme-toggle"
      />
      <IconButton name="arrow-left" label="Sign out" onClick={() => void signOut()} />
    </div>
  );
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        color: "var(--ink)",
      }}
    >
      {compact ? (
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 8px 0 16px",
            paddingTop: "env(safe-area-inset-top)",
            minHeight: 56,
            borderBottom: "1px solid var(--line)",
            background: "var(--surface-glass)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <span style={{ fontFamily: "var(--font-display)", fontSize: 22, lineHeight: 1 }}>
            DNA
          </span>
          {controls}
        </header>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 20,
            background: "var(--bg)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          {tier === "expanded" && (
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                lineHeight: 1,
                padding: "0 20px",
                flex: "none",
              }}
            >
              DNA
            </span>
          )}
          {/* The bar scrolls inside its slot when it must; it never widens the layout viewport (medium tier). */}
          <div style={{ flex: 1, minWidth: 0, overflowX: "auto", scrollbarWidth: "none" }}>
            <PulseDock bar active={active} onSelect={go} style={{ borderBottom: "none" }} />
          </div>
          <div style={{ paddingRight: 12, flex: "none" }}>{controls}</div>
        </div>
      )}
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "var(--content-max)",
          margin: "0 auto",
          boxSizing: "border-box",
          padding: compact
            ? "12px 16px calc(96px + env(safe-area-inset-bottom))"
            : "24px 32px 48px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {children}
      </main>
      {compact && <PulseDock fixed active={active} onSelect={go} />}
    </div>
  );
}
