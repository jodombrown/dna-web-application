// The console's gate (handoff 40-B section 3). Signed out, every path lands on the sign-in. Signed
// in, the account's standing is read from public.admin_session_state() and the factor list, and
// exactly one of four screens renders: the refusal for an account with no live role, enrolment at
// aal1 with no verified factor, the code step at aal1 with one, and the shell at aal2. The read is
// repeated after every verification and whenever the session's token changes, because the aal is a
// claim of the token and the database answers from that claim (ruling 1265).
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { readAdminState, type AdminState } from "../lib/session";
import { CodeStep } from "../components/CodeStep";
import { Enrolment } from "../components/Enrolment";
import { Failure } from "../components/Failure";
import { Refusal } from "../components/Refusal";
import { Shell } from "../components/Shell";

export const Route = createFileRoute("/_console")({ component: Console });

type Read = { status: "pending" } | { status: "ready"; state: AdminState } | { status: "failed" };

function Console() {
  const { ready, session } = useAuth();
  const navigate = useNavigate();
  const [read, setRead] = useState<Read>({ status: "pending" });
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
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
