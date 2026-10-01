// The empty shell at aal2 with a live role (handoff 40-B section 3, item 5): a heading, the line
// under it, a sign-out, and the Outlet the consoles of 12B onward render into. Nothing here looks
// like the member Feed; 12B's shell replaces this one when its design lands.
import type { ReactNode } from "react";
import { Button } from "@/components/strand/Button";
import { AuthLead } from "@/components/dna/AuthSurface";
import { getSupabase } from "@/lib/supabase";
import { ADMIN_COPY } from "../lib/copy";
import { signOutHere } from "../lib/session";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <main
      data-testid="admin-shell"
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        color: "var(--ink)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "16px 24px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: 24,
              lineHeight: 1.15,
              fontWeight: 400,
            }}
          >
            {ADMIN_COPY.shellHeading}
          </h1>
          <AuthLead>{ADMIN_COPY.shellLine}</AuthLead>
        </div>
        <Button
          type="button"
          variant="secondary"
          data-testid="admin-sign-out"
          onClick={() => {
            const sb = getSupabase();
            if (sb) void signOutHere(sb);
          }}
        >
          {ADMIN_COPY.signOut}
        </Button>
      </header>
      <div style={{ flex: 1, padding: 24 }}>{children}</div>
    </main>
  );
}
