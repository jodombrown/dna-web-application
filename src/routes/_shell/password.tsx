// /password (ruling 230): the signed-in change-password path. Renders inside the shell, never its
// own chrome (ruling 69), in the standard 440 content column. There is no settings surface around
// it; this route is the whole of it.
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/strand/Button";
import { Checkbox } from "@/components/strand/Checkbox";
import { Input } from "@/components/strand/Input";
import { AuthAlert, AuthHeading, AuthLead, useHeadingFocus } from "@/components/dna/AuthSurface";
import { useAuth } from "@/lib/auth";
import { COPY, MIN_PASSWORD, passwordFault, signOutOtherSessions } from "@/lib/auth-flow";
import { getSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/_shell/password")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: ChangePassword,
});

type Flag = "current" | "new" | "confirm" | null;

function ChangePassword() {
  const { member } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [flag, setFlag] = useState<Flag>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const headingRef = useHeadingFocus(done);

  const back = () => {
    if (window.history.length > 1) router.history.back();
    else void navigate({ to: "/feed", search: {} });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || !member?.email) return;
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
      // Supabase does not require the current password to change it, so the check the copy promises
      // is made here: a re-authentication that fails is the wrong-current-password state.
      const { error: reauth } = await sb.auth.signInWithPassword({
        email: member.email,
        password: current,
      });
      if (reauth) {
        setFlag("current");
        setAlert(COPY.wrongCurrent);
        return;
      }
      const { error } = await sb.auth.updateUser({ password: next });
      if (error) {
        const fault = passwordFault(error);
        setFlag("new");
        setAlert(fault === "short" ? COPY.tooShort : COPY.breached);
        return;
      }
      // Re-authenticating opened a fresh session for this device, so `others` now covers both the
      // session this device held before and every real other device.
      await signOutOtherSessions(sb);
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  const column = {
    width: "100%",
    maxWidth: 440,
    margin: "0 auto",
    padding: "24px 16px 48px",
    boxSizing: "border-box" as const,
    display: "flex",
    flexDirection: "column" as const,
    gap: 14,
  };

  if (done)
    return (
      <div style={column} data-testid="password-done">
        <AuthHeading headingRef={headingRef}>Password changed</AuthHeading>
        <AuthLead>
          Your password is changed. You stay signed in here. Any other device signed in with the old
          password has been signed out.
        </AuthLead>
        <div>
          <Button variant="secondary" type="button" data-testid="password-back" onClick={back}>
            Back
          </Button>
        </div>
      </div>
    );

  return (
    <form
      onSubmit={(e) => void submit(e)}
      noValidate
      aria-busy={busy}
      data-testid="password"
      style={column}
    >
      <AuthHeading headingRef={headingRef}>Change your password</AuthHeading>
      <AuthLead>Enter your current password, then the new one twice.</AuthLead>
      {alert && <AuthAlert>{alert}</AuthAlert>}
      <Input
        label="Current password"
        type={show ? "text" : "password"}
        value={current}
        onChange={(e) => setCurrent((e.target as HTMLInputElement).value)}
        autoComplete="current-password"
        aria-invalid={flag === "current"}
        required
      />
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
      <Checkbox label="Show passwords" checked={show} onChange={setShow} />
      <div style={{ display: "flex", gap: 12 }}>
        <Button type="submit" disabled={busy}>
          {busy ? "Changing" : "Change password"}
        </Button>
        <Button variant="secondary" type="button" data-testid="password-cancel" onClick={back}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
