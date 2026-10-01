// The admin host's sign-in (handoff 40-B section 4, ruling 1291): the member app's SignInForm,
// rendered with no sign-up, no provider buttons and the admin copy. Password reset stays in the
// member app, so the line under the field names it and nothing here resets a password.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, type FormEvent } from "react";
import { AuthPage } from "@/components/dna/AuthSurface";
import { SignInForm, useSignInForm } from "@/components/dna/SignInForm";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { ADMIN_COPY } from "../lib/copy";

export const Route = createFileRoute("/sign-in")({ component: AdminSignIn });

function AdminSignIn() {
  const { ready, session } = useAuth();
  const navigate = useNavigate();
  const form = useSignInForm();

  // A session, whatever its standing, is read by the console: refusal, enrolment, the code step or
  // the shell are its decision and never this screen's.
  useEffect(() => {
    if (ready && session) void navigate({ to: "/", replace: true });
  }, [ready, session, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    await form.signIn(sb, ADMIN_COPY.mismatch);
  };

  return (
    <AuthPage heading={ADMIN_COPY.signInHeading} data-testid="admin-sign-in">
      <SignInForm
        form={form}
        onSubmit={(e) => void submit(e)}
        submitLabel={ADMIN_COPY.signInButton}
        forgot={
          <p
            data-testid="admin-reset-line"
            style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: "var(--ink-2)" }}
          >
            {ADMIN_COPY.resetBefore}
            <a
              href={"https://" + ADMIN_COPY.resetHost}
              rel="noopener"
              style={{ color: "var(--ink)", fontWeight: 500, textUnderlineOffset: 3 }}
            >
              {ADMIN_COPY.resetHost}
            </a>
          </p>
        }
      />
    </AuthPage>
  );
}
