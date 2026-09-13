// Supabase Auth, email and password, plus Google and LinkedIn (rulings 233, 235). The one auth path
// (CLAUDE.md). Sign-up asks for the address and a password only (rulings 432, 384); the name is
// asked once, on onboarding screen one (ruling 307), so nothing is written to user metadata here
// and the composer header and cards read the members row.
//
// Design pass 01, B8. The head is AuthHead, logo 48/56 top-aligned in the fixed band (377, 390,
// 491), and the page's own 80px logo block is gone. The password field is Strand's PasswordField,
// so the eye toggle sits inside the field (392) and a refusal renders in the field's own line,
// carrying Fix PR 02's fault mapping (414). The column holds the top and never centres vertically;
// the footer takes the bottom with an auto margin (487).
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/strand/Button";
import { Input } from "@/components/strand/Input";
import { PasswordField } from "@/components/strand/PasswordField";
import {
  AuthAlert,
  AuthPage,
  AuthStatus,
  CheckEmail,
  FooterLink,
  OrSeparator,
  ProviderButtons,
} from "@/components/dna/AuthSurface";
import { useAuth } from "@/lib/auth";
import {
  COPY,
  MIN_PASSWORD,
  REVEAL_MS,
  delay,
  forgetProvider,
  isEmailShaped,
  passwordFault,
  passwordFaultCopy,
  readProviderReturn,
  startProvider,
  stripAuthFragment,
  type Provider,
} from "@/lib/auth-flow";
import { recoveryPending } from "@/lib/recovery";
import { getSupabase } from "@/lib/supabase";
import { useTheme } from "@/lib/tier";

export const Route = createFileRoute("/sign-in")({
  // ?join=1 opens the form in its sign-up state (the public profile's "Join DNA", Brief 3).
  validateSearch: (search: Record<string, unknown>): { join?: boolean } =>
    search["join"] === true || search["join"] === "1" || search["join"] === 1 ? { join: true } : {},
  component: SignIn,
});

type Flag = "email" | "password" | "both" | null;

function SignIn() {
  const { ready, member } = useAuth();
  const navigate = useNavigate();
  const { join } = Route.useSearch();
  useTheme();
  const [mode, setMode] = useState<"in" | "up">(join ? "up" : "in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [alert, setAlert] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [flag, setFlag] = useState<Flag>(null);
  const [busy, setBusy] = useState(false);
  const [waitingFor, setWaitingFor] = useState<Provider | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  // Ruling 392, B8 item 3: a password refusal renders in the field's own line, where the member is
  // looking, rather than only in the alert block above the form.
  const [refusal, setRefusal] = useState<string | null>(null);

  // A provider round trip that failed comes back here rather than to the Feed, so the two states
  // the copy names have somewhere to render (handoff section 2).
  useEffect(() => {
    const back = readProviderReturn();
    if (!back) return;
    forgetProvider();
    stripAuthFragment();
    if (back.kind === "cancelled") setStatus(COPY.providerCancelled(back.provider));
    else setAlert(COPY.providerError(back.provider));
  }, []);

  // Ruling 240: a recovery session is held at /reset/new by the gate in the root route, so this
  // route must not race it to the Feed.
  useEffect(() => {
    if (ready && member && !recoveryPending()) void navigate({ to: "/feed", search: {} });
  }, [ready, member, navigate]);

  const clear = () => {
    setAlert(null);
    setStatus(null);
    setFlag(null);
    setRefusal(null);
  };

  const onProvider = async (p: Provider) => {
    clear();
    setWaitingFor(p);
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await startProvider(sb, p);
    if (error) {
      setWaitingFor(null);
      setAlert(COPY.providerError(p));
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    clear();
    if (!isEmailShaped(email)) {
      setFlag("email");
      setAlert(COPY.malformed);
      return;
    }
    if (mode === "up" && password.length < MIN_PASSWORD) {
      setFlag("password");
      setRefusal(COPY.tooShort);
      return;
    }
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) {
          // Never says which of the two was wrong (handoff section 2).
          setFlag("both");
          setAlert(COPY.mismatch);
        }
      } else {
        // Ruling 384: no name is collected here, so none is written. Onboarding screen one is the
        // one place a member's name is set (307, 469).
        const signUp = sb.auth.signUp({
          email,
          password,
          // Ruling 432 (U-A1): no display name here; onboarding screen one asks for it (ruling 307).
          options: { emailRedirectTo: window.location.origin + "/feed" },
        });
        // Ruling 234: the state is identical whether or not the address already has an account, so
        // it reveals on a fixed delay and never on the shape of the answer. Only a password the
        // server refuses outright pulls the member back to the form.
        const [{ error }] = await Promise.all([signUp, delay(REVEAL_MS)]);
        if (error) {
          // Ruling 414: every password refusal is named by its real reason. Anything that is not a
          // password fault keeps the anti-enumeration state below (ruling 234).
          const fault = passwordFault(error);
          if (fault !== "other" || /password/i.test(error.message || "")) {
            setFlag("password");
            setRefusal(passwordFaultCopy(fault));
            return;
          }
          // Ruling 496: the page could not create the account, and nothing typed is lost.
          setAlert(COPY.signUpFailed);
          return;
        }
        setSent(email);
      }
    } finally {
      setBusy(false);
    }
  };

  if (sent !== null)
    return (
      <CheckEmail
        heading="Check your email"
        body={`We sent a confirmation link to ${sent}. Open it to finish creating your account. It works once and for one hour.`}
        small="Nothing arrived after a few minutes? Check the address above and your spam folder."
        onUseDifferent={() => {
          setSent(null);
          setPassword("");
        }}
        // Ruling 412 (B10 item 4), verbatim: the second act becomes the footer's linked sentence.
        footer={
          <FooterLink
            before="If you already have an account,"
            link="sign in"
            after=" instead."
            onClick={() => {
              setSent(null);
              setMode("in");
              setPassword("");
            }}
          />
        }
      />
    );

  const flagEmail = flag === "email" || flag === "both";
  const flagPassword = flag === "password" || flag === "both";
  const up = mode === "up";

  return (
    <AuthPage
      heading={up ? "Create your account" : "Sign in"}
      {...(up ? { lead: COPY.signUpLead } : {})}
      footer={
        <FooterLink
          before={up ? "Already a member?" : "New here?"}
          link={up ? "Sign in" : "Create an account"}
          onClick={() => {
            clear();
            setMode(up ? "in" : "up");
          }}
        />
      }
    >
      {/* noValidate: the alert block is the one place a form-level auth message is announced
          (handoff section 2), so the browser's own validation bubble must not pre-empt it. A
          password refusal is the exception ruling 392 names: it renders in the field's own line. */}
      <form
        onSubmit={(e) => void submit(e)}
        noValidate
        aria-busy={busy || waitingFor !== null}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        {alert && <AuthAlert>{alert}</AuthAlert>}
        {status && <AuthStatus>{status}</AuthStatus>}
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          autoComplete="email"
          aria-invalid={flagEmail}
          required
        />
        <PasswordField
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={up ? "new-password" : "current-password"}
          aria-invalid={flagPassword}
          {...(refusal ? { error: refusal } : up ? { hint: COPY.passwordHint } : {})}
          required
        />
        {/* Sign-in additions, in DOM order after the Password field (handoff section 1): the link
            first, left-aligned under the field; the separator and the provider buttons after the
            submit, which is where sign-up carries them too. */}
        {!up && (
          <button
            type="button"
            data-testid="forgot-password"
            onClick={() => void navigate({ to: "/reset" })}
            style={{
              all: "unset",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              minHeight: "var(--target-primary)",
              fontSize: 15,
              fontWeight: 500,
              color: "var(--ink-2)",
            }}
          >
            Forgot your password?
          </button>
        )}
        <Button type="submit" disabled={busy || waitingFor !== null} full>
          {up
            ? busy
              ? "Creating your account"
              : "Create account"
            : busy
              ? "Signing in"
              : "Sign in"}
        </Button>
        <OrSeparator />
        <ProviderButtons
          waitingFor={waitingFor}
          disabled={busy || waitingFor !== null}
          onStart={(p) => void onProvider(p)}
        />
      </form>
    </AuthPage>
  );
}
