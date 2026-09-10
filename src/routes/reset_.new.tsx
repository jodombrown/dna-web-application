// /reset/new (ruling 240). A valid recovery token lands here and nowhere else. The page asks for a
// password; the session is not usable for anything until one is set, which the gate in the root
// route enforces. Never a redirect to the Feed.
//
// The trailing underscore on `reset_` opts this route out of nesting under /reset, which has its
// own component and no Outlet.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/strand/Button";
import { Checkbox } from "@/components/strand/Checkbox";
import { Input } from "@/components/strand/Input";
import {
  AnonAuthLayout,
  AuthAlert,
  AuthHeading,
  AuthLead,
  AuthSmall,
  useHeadingFocus,
} from "@/components/dna/AuthSurface";
import { useAuth } from "@/lib/auth";
import { COPY, MIN_PASSWORD, passwordFault, signOutOtherSessions } from "@/lib/auth-flow";
import { captureRecoveryFromUrl, clearRecovery, recoveryState } from "@/lib/recovery";
import { getSupabase } from "@/lib/supabase";
import { useTheme } from "@/lib/tier";

export const Route = createFileRoute("/reset_/new")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: ResetLanding,
});

type Stage = "resolving" | "form" | "expired" | "done";
type Flag = "new" | "confirm" | null;

function ResetLanding() {
  useTheme();
  const navigate = useNavigate();
  const { ready, session } = useAuth();
  const [stage, setStage] = useState<Stage>("resolving");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [flag, setFlag] = useState<Flag>(null);
  const [busy, setBusy] = useState(false);
  const headingRef = useHeadingFocus(stage);

  useEffect(() => {
    if (!ready) return;
    // Idempotent: supabase-js has already consumed the fragment by now, so this reads what was
    // recorded before the client was created.
    captureRecoveryFromUrl();
    const state = recoveryState();
    if (state === "expired" || !session) {
      // Nothing is being protected in this state, so the flag is dropped and the gate lets go.
      clearRecovery();
      setStage("expired");
      return;
    }
    setStage("form");
  }, [ready, session]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    setAlert(null);
    setFlag(null);
    if (next.length < MIN_PASSWORD) {
      setFlag("new");
      setAlert(COPY.tooShort);
      return;
    }
    if (next !== confirm) {
      setFlag("confirm");
      setAlert(COPY.differ);
      return;
    }
    setBusy(true);
    try {
      const { error } = await sb.auth.updateUser({ password: next });
      if (error) {
        const fault = passwordFault(error);
        if (fault === "breached") {
          setFlag("new");
          setAlert(COPY.breached);
          return;
        }
        if (fault === "short") {
          setFlag("new");
          setAlert(COPY.tooShort);
          return;
        }
        clearRecovery();
        setStage("expired");
        return;
      }
      // Makes the copy true rather than assumed: every other device signed in with the old
      // password loses its refresh token, and this one keeps its session.
      await signOutOtherSessions(sb);
      clearRecovery();
      setStage("done");
    } finally {
      setBusy(false);
    }
  };

  if (stage === "resolving") return <AnonAuthLayout>{null}</AnonAuthLayout>;

  if (stage === "expired")
    return (
      <AnonAuthLayout>
        <div
          data-testid="reset-expired"
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <AuthHeading headingRef={headingRef}>This link no longer works</AuthHeading>
          <AuthLead>
            Reset links work once and for one hour. This one has been used, or its hour has passed.
          </AuthLead>
          <AuthSmall>
            Nothing about your account has changed. Your current password still works.
          </AuthSmall>
          <Button
            type="button"
            full
            data-testid="request-new-link"
            onClick={() => void navigate({ to: "/reset" })}
          >
            Request a new link
          </Button>
          <Button
            variant="ghost"
            type="button"
            data-testid="back-to-sign-in"
            onClick={() => void navigate({ to: "/sign-in", search: {} })}
          >
            Back to sign in
          </Button>
        </div>
      </AnonAuthLayout>
    );

  if (stage === "done")
    return (
      <AnonAuthLayout>
        <div data-testid="reset-done" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <AuthHeading headingRef={headingRef}>You are signed in</AuthHeading>
          <AuthLead>
            Your new password is set and you are signed in here. Any other device signed in with the
            old password has been signed out.
          </AuthLead>
          <Button
            type="button"
            full
            data-testid="continue-to-dna"
            onClick={() => void navigate({ to: "/feed", search: {} })}
          >
            Continue to DNA
          </Button>
        </div>
      </AnonAuthLayout>
    );

  return (
    <AnonAuthLayout>
      <form
        onSubmit={(e) => void submit(e)}
        noValidate
        aria-busy={busy}
        data-testid="reset-new"
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <AuthHeading headingRef={headingRef}>Set a new password</AuthHeading>
        <AuthLead>You followed a reset link. Choose a new password to finish signing in.</AuthLead>
        {alert && <AuthAlert>{alert}</AuthAlert>}
        <Input
          label="New password"
          type={show ? "text" : "password"}
          value={next}
          onChange={(e) => setNext((e.target as HTMLInputElement).value)}
          autoComplete="new-password"
          hint={COPY.passwordHint}
          aria-invalid={flag === "new"}
          required
        />
        <Input
          label="Confirm new password"
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm((e.target as HTMLInputElement).value)}
          autoComplete="new-password"
          aria-invalid={flag === "confirm"}
          required
        />
        {/* Strand gap (handoff section 4): Input has no show-password affordance and no eye icon
            exists, so the page uses a Checkbox. Staged for Strand, not patched locally. */}
        <Checkbox label="Show passwords" checked={show} onChange={setShow} />
        <Button type="submit" disabled={busy} full>
          {busy ? "Setting your password" : "Set new password"}
        </Button>
      </form>
    </AnonAuthLayout>
  );
}
