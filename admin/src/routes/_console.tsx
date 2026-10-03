// The console's gate (handoff 40-B section 3). Signed out, every path lands on the sign-in. Signed
// in, the account's standing is read from public.admin_session_state() and the factor list, and
// exactly one of four screens renders: the refusal for an account with no live role, enrolment at
// aal1 with no verified factor, the code step at aal1 with one, and the shell at aal2. The read is
// repeated after every verification and whenever the session's token changes, because the aal is a
// claim of the token and the database answers from that claim (ruling 1265).
//
// Handoff 45-B Part C item 1: the chrome at aal2 is Strand's ConsoleShell (compile
// v1790885781186000, 1309), which replaced the empty Shell of 40-B. The gate is unchanged above it:
// ConsoleShell is the chrome at aal2 and nothing more. `access` is full when the roles hold admin
// or analyst (1311) and none otherwise, in which case the shell keeps its bar and shows the one
// sentence and never the page. The staff name is the member's own, read the way the member app's
// shell reads it (useAuth's members row), and the role is the first live role's label from the
// platform_role_kinds vocabulary, never a label map in code.
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ConsoleShell } from "@/components/strand/ConsoleShell";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { loadVocabularies } from "@/lib/vocabularies";
import { readAdminState, signOutHere, type AdminState } from "../lib/session";
import { ADMIN_COPY, CONSOLE_DESTINATIONS, OVERVIEW_ROLES } from "../lib/copy";
import { CodeStep } from "../components/CodeStep";
import { Enrolment } from "../components/Enrolment";
import { Failure } from "../components/Failure";
import { Refusal } from "../components/Refusal";

export const Route = createFileRoute("/_console")({ component: Console });

type Read = { status: "pending" } | { status: "ready"; state: AdminState } | { status: "failed" };

function Console() {
  const { ready, session, member } = useAuth();
  const navigate = useNavigate();
  const [read, setRead] = useState<Read>({ status: "pending" });
  const [roleLabels, setRoleLabels] = useState<Record<string, string>>({});
  const token = session?.access_token ?? null;

  useEffect(() => {
    if (ready && !session) void navigate({ to: "/sign-in", replace: true });
  }, [ready, session, navigate]);

  const reread = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    try {
      const state = await readAdminState(sb);
      setRead({ status: "ready", state });
    } catch (error) {
      console.warn(
        JSON.stringify({
          event: "admin_session_state_failed",
          code: (error as { code?: string } | null)?.code ?? null,
        }),
      );
      setRead({ status: "failed" });
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setRead({ status: "pending" });
      return;
    }
    void reread();
  }, [token, reread]);

  // The role's label is vocabulary (1177): read once the shell is about to render.
  const atShell = read.status === "ready" && read.state.holds_role && read.state.aal === "aal2";
  useEffect(() => {
    if (!atShell) return;
    let live = true;
    loadVocabularies()
      .then((v) => {
        if (!live || !v || !Array.isArray(v.platform_role_kinds)) return;
        setRoleLabels(Object.fromEntries(v.platform_role_kinds.map((k) => [k.value, k.label])));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [atShell]);

  // Nothing renders until the standing is known, so the shell never flashes before a refusal.
  if (!ready || !session) return null;
  if (read.status === "pending") return null;
  if (read.status === "failed") return <Failure onRetry={() => void reread()} />;
  const { state } = read;
  if (!state.holds_role) return <Refusal />;
  if (state.aal !== "aal2")
    return state.verified_factor ? (
      <CodeStep onVerified={() => void reread()} />
    ) : (
      <Enrolment onVerified={() => void reread()} />
    );
  const access = state.roles.some((r) => (OVERVIEW_ROLES as readonly string[]).includes(r))
    ? "full"
    : "none";
  const firstRole = state.roles[0];
  const role = firstRole ? (roleLabels[firstRole] ?? firstRole) : undefined;
  return (
    <div data-testid="admin-shell" data-access={access} style={{ height: "100dvh" }}>
      <ConsoleShell
        staff={{ name: member?.name ?? "", role }}
        destinations={CONSOLE_DESTINATIONS}
        current="overview"
        word={ADMIN_COPY.shellHeading}
        access={access}
        noRoleText={ADMIN_COPY.noRole}
        menuTitle={ADMIN_COPY.menuTitle}
        onNavigate={(id) => {
          if (id === "overview") void navigate({ to: "/" });
        }}
        onSignOut={() => {
          const sb = getSupabase();
          if (sb) void signOutHere(sb);
        }}
        style={{ height: "100%" }}
      >
        <Outlet />
      </ConsoleShell>
    </div>
  );
}
