// Supabase Auth, email and password, plus Google and LinkedIn (rulings 233, 235). The one auth path
// (CLAUDE.md). Sign-up collects a display name into user metadata; the composer header and cards
// read it from there. Brief 4B grafts onto the layout on main rather than re-laying it out
// (handoff section 1): the logo, the fields, the submit and the mode-switch line are untouched
// above and below the additions.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/strand/Button";
import { Input } from "@/components/strand/Input";
import { assetBase } from "@/components/strand/cmeta";
import {
  AuthAlert,
  AuthHeading,
  AuthStatus,
  CheckEmail,
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
  const [name, setName] = useState("");
  const [alert, setAlert] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [flag, setFlag] = useState<Flag>(null);
  const [busy, setBusy] = useState(false);
  const [waitingFor, setWaitingFor] = useState<Provider | null>(null);
  const [sent, setSent] = useState<string | null>(null);

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
      setAlert(COPY.tooShort);
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
        const signUp = sb.auth.signUp({
          email,
          password,
          options: { data: { full_name: name }, emailRedirectTo: window.location.origin + "/feed" },
        });
        // Ruling 234: the state is identical whether or not the address already has an account, so
        // it reveals on a fixed delay and never on the shape of the answer. Only a password the
        // server refuses outright pulls the member back to the form.
        const [{ error }] = await Promise.all([signUp, delay(REVEAL_MS)]);
        if (error) {
          const fault = passwordFault(error);
          if (fault === "breached") {
            setFlag("password");
            setAlert(COPY.breached);
            return;
          }
          if (fault === "short") {
            setFlag("password");
            setAlert(COPY.tooShort);
            return;
          }
        }
        setSent(email);
      }
    } finally {
      setBusy(false);
    }
  };

  if (sent !== null)
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          background: "var(--bg)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 400,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <img
            src={assetBase() + "logo.png"}
            alt="DNA"
            style={{ height: 80, width: "auto", alignSelf: "center", display: "block" }}
          />
          <CheckEmail
            heading="Check your email"
            body={`We sent a confirmation link to ${sent}. Open it to finish creating your account. It works once and for one day.`}
            small="Nothing arrived after a few minutes? Check the address above and your spam folder."
            onUseDifferent={() => {
              setSent(null);
              setPassword("");
            }}
            onBackToSignIn={() => {
              setSent(null);
              setMode("in");
              setPassword("");
            }}
          />
        </div>
      </div>
    );

  const flagEmail = flag === "email" || flag === "both";
  const flagPassword = flag === "password" || flag === "both";

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "var(--bg)",
      }}
    >
      {/* noValidate: the alert block is the one place an auth message is announced (handoff
          section 2), so the browser's own validation bubble must not pre-empt it. */}
      <form
        onSubmit={(e) => void submit(e)}
        noValidate
        aria-busy={busy || waitingFor !== null}
        style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 14 }}
      >
        {/* The live look carries no visible heading; the landmark still names itself (section 3). */}
        <AuthHeading hidden>{mode === "in" ? "Sign in" : "Create your account"}</AuthHeading>
        <img
          src={assetBase() + "logo.png"}
          alt="DNA"
          style={{
            height: 80,
            width: "auto",
            alignSelf: "center",
            display: "block",
            transform: "translateY(-44px)",
          }}
        />
        {alert && <AuthAlert>{alert}</AuthAlert>}
        {status && <AuthStatus>{status}</AuthStatus>}
        {mode === "up" && (
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName((e.target as HTMLInputElement).value)}
            autoComplete="name"
            required
          />
        )}
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          autoComplete="email"
          aria-invalid={flagEmail}
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          aria-invalid={flagPassword}
          {...(mode === "up" ? { hint: COPY.passwordHint } : {})}
          required
        />
        {/* Sign-in additions, in DOM order after the Password field (handoff section 1): the link
            first, left-aligned under the field; the separator and the provider buttons after the
            submit, which is where sign-up carries them too. */}
        {mode === "in" && (
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
              minHeight: 44,
              fontSize: 15,
              fontWeight: 500,
              color: "var(--ink-2)",
            }}
          >
            Forgot your password?
          </button>
        )}
        <Button type="submit" disabled={busy || waitingFor !== null} full>
          {mode === "in"
            ? busy
              ? "Signing in"
              : "Sign in"
            : busy
              ? "Creating your account"
              : "Create account"}
        </Button>
        <OrSeparator />
        <ProviderButtons
          waitingFor={waitingFor}
          disabled={busy || waitingFor !== null}
          onStart={(p) => void onProvider(p)}
        />
        <Button
          variant="ghost"
          type="button"
          onClick={() => {
            clear();
            setMode(mode === "in" ? "up" : "in");
          }}
        >
          {mode === "in" ? "New here? Create an account" : "Already a member? Sign in"}
        </Button>
      </form>
    </div>
  );
}
