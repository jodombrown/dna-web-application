// /reset (ruling 230): the request half of password reset, reachable from the sign-in page and by
// an anonymous visitor. Ruling 156 applied to auth: the sent state is byte-identical for a known
// and an unknown address, because nothing here branches on what the server answered. GoTrue's
// /recover already returns the same 200 either way, so there is no server-side difference either;
// the fixed reveal closes the client-side one a response-driven transition would open.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/strand/Button";
import { Input } from "@/components/strand/Input";
import {
  AnonAuthLayout,
  AuthAlert,
  AuthHeading,
  AuthLead,
  CheckEmail,
  useHeadingFocus,
} from "@/components/dna/AuthSurface";
import { COPY, REVEAL_MS, delay, isEmailShaped, recoveryRedirect } from "@/lib/auth-flow";
import { getSupabase } from "@/lib/supabase";
import { useTheme } from "@/lib/tier";

export const Route = createFileRoute("/reset")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: ResetRequest,
});

function ResetRequest() {
  useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [alert, setAlert] = useState<string | null>(null);
  const [flag, setFlag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const headingRef = useHeadingFocus(sent === null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    setAlert(null);
    setFlag(false);
    if (!isEmailShaped(email)) {
      setFlag(true);
      setAlert(COPY.malformed);
      return;
    }
    setBusy(true);
    try {
      // The result is deliberately unread. Whether the address has an account, whether the mail
      // queued, whether the project rate-limited the request: none of it may change what this
      // surface renders, because a difference here is an address enumeration oracle on the one
      // surface an anonymous visitor can reach.
      void sb.auth
        .resetPasswordForEmail(email, { redirectTo: recoveryRedirect() })
        .catch(() => undefined);
      // Not awaited on purpose. Awaiting would make the reveal as slow as the answer, and a slow
      // answer for one address and a fast one for another is the same oracle in a different form.
      await delay(REVEAL_MS);
      setSent(email);
    } finally {
      setBusy(false);
    }
  };

  if (sent !== null)
    return (
      <AnonAuthLayout>
        <CheckEmail
          headingRef={headingRef}
          heading="Check your email"
          body={`If ${sent} has a DNA account, a link to set a new password is on its way. It works once and for one hour.`}
          small="Nothing arrived after a few minutes? Check the address above and your spam folder, then request another."
          onUseDifferent={() => setSent(null)}
          onBackToSignIn={() => void navigate({ to: "/sign-in", search: {} })}
        />
      </AnonAuthLayout>
    );

  return (
    <AnonAuthLayout>
      <form
        onSubmit={(e) => void submit(e)}
        noValidate
        aria-busy={busy}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
        data-testid="reset-request"
      >
        <AuthHeading headingRef={headingRef}>Reset your password</AuthHeading>
        <AuthLead>
          Enter the email you use for DNA. If it has an account, we send a link to set a new
          password.
        </AuthLead>
        {alert && <AuthAlert>{alert}</AuthAlert>}
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          autoComplete="email"
          aria-invalid={flag}
          required
        />
        <Button type="submit" disabled={busy} full>
          {busy ? "Sending" : "Send reset link"}
        </Button>
        <Button
          variant="ghost"
          type="button"
          data-testid="back-to-sign-in"
          onClick={() => void navigate({ to: "/sign-in", search: {} })}
        >
          Back to sign in
        </Button>
      </form>
    </AnonAuthLayout>
  );
}
