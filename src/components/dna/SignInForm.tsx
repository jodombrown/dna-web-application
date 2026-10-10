// One identity system, two front doors (ruling 1291, handoff 40-B section 4). The email-and-password
// form that signs a member in, as one component both the member app's /sign-in and the admin app's
// /sign-in render, so there is one sign-in implementation and never a second. The state lives in the
// hook rather than in the component, because the member route keeps the form mounted across its
// sign-up state and its provider round trips and must be able to clear and read it from outside.
//
// The markup is the member route's own, moved and not changed: alert, status, Email, Password, the
// caller's line after the password field, the submit, and whatever the caller renders after it.
// Nothing here knows about sign-up, providers or the admin host; the caller supplies those as slots
// and copy, and the admin route supplies none of the first two.
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/strand/Button";
import { Input } from "@/components/strand/Input";
import { PasswordField } from "@/components/dna/PasswordField";
import { AuthAlert, AuthStatus } from "@/components/dna/AuthSurface";
import { COPY, forgetProvider, isEmailShaped, signInFailureClass } from "@/lib/auth-flow";
import { record } from "@/lib/record";
import type { Supabase } from "@/lib/supabase";

/** Which fields carry the invalid border for the current alert. */
export type SignInFlag = "email" | "password" | "both" | null;

export type SignInFormState = {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  alert: string | null;
  setAlert: (v: string | null) => void;
  status: string | null;
  setStatus: (v: string | null) => void;
  flag: SignInFlag;
  setFlag: (v: SignInFlag) => void;
  /** Ruling 392: a password refusal renders in the field's own line. */
  refusal: string | null;
  setRefusal: (v: string | null) => void;
  busy: boolean;
  setBusy: (v: boolean) => void;
  /** Clears every message and flag; the typed values stay. */
  clear: () => void;
  /**
   * The sign-in itself: the shape check, then signInWithPassword. `mismatch` is the line for a
   * refused pair, which never says which of the two was wrong (Brief 4B handoff section 2); the
   * member app and the admin app each supply their own. Resolves true when a session was created.
   */
  signIn: (sb: Supabase, mismatch: string) => Promise<boolean>;
};

export function useSignInForm(initialEmail = ""): SignInFormState {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [alert, setAlert] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [flag, setFlag] = useState<SignInFlag>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const clear = () => {
    setAlert(null);
    setStatus(null);
    setFlag(null);
    setRefusal(null);
  };

  const signIn = async (sb: Supabase, mismatch: string): Promise<boolean> => {
    clear();
    if (!isEmailShaped(email)) {
      setFlag("email");
      setAlert(COPY.malformed);
      return false;
    }
    setBusy(true);
    // A provider round trip the member abandoned leaves its marker behind; a password sign-in is not
    // that round trip, so the marker goes before the request and SIGNED_IN below records nothing
    // for it (handoff 58-12C2, sign_in_succeeded).
    forgetProvider();
    try {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        // 12C part 2: the refusal is classified from the error's code and recorded with no member
        // and no address (1361, 1616); the line the member reads does not change.
        record("sign_in_failed", { reason_class: signInFailureClass(error) });
        setFlag("both");
        setAlert(mismatch);
        return false;
      }
      // 12C part 2: the one password sign-in, recorded here at the moment it completes and never
      // from SIGNED_IN, which auth-js also raises on a tab refocus.
      record("sign_in_succeeded", { method: "password" });
      return true;
    } finally {
      setBusy(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    alert,
    setAlert,
    status,
    setStatus,
    flag,
    setFlag,
    refusal,
    setRefusal,
    busy,
    setBusy,
    clear,
    signIn,
  };
}

export function SignInForm({
  form,
  onSubmit,
  submitLabel,
  busyLabel,
  pending = false,
  passwordAutoComplete = "current-password",
  passwordHint,
  forgot,
  children,
}: {
  form: SignInFormState;
  onSubmit: (e: FormEvent) => void;
  submitLabel: string;
  /** The submit's label while the request is in flight; the label itself when omitted. */
  busyLabel?: string | undefined;
  /** True while something outside the form holds it (a provider round trip). */
  pending?: boolean | undefined;
  passwordAutoComplete?: "current-password" | "new-password" | undefined;
  /** The password field's hint when no refusal is showing (sign-up's rule line). */
  passwordHint?: ReactNode;
  /** Rendered after the password field, before the submit: the member's Forgot link, the admin's reset line. */
  forgot?: ReactNode;
  /** Rendered after the submit: the member's separator and provider buttons. */
  children?: ReactNode;
}) {
  const flagEmail = form.flag === "email" || form.flag === "both";
  const flagPassword = form.flag === "password" || form.flag === "both";
  const held = form.busy || pending;
  return (
    // noValidate: the alert block is the one place a form-level auth message is announced (Brief 4B
    // handoff section 2), so the browser's own validation bubble must not pre-empt it. A password
    // refusal is the exception ruling 392 names: it renders in the field's own line.
    <form
      onSubmit={onSubmit}
      noValidate
      aria-busy={held}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      {form.alert && <AuthAlert>{form.alert}</AuthAlert>}
      {form.status && <AuthStatus>{form.status}</AuthStatus>}
      <Input
        label="Email"
        type="email"
        value={form.email}
        onChange={(e) => form.setEmail((e.target as HTMLInputElement).value)}
        autoComplete="email"
        aria-invalid={flagEmail}
        required
      />
      <PasswordField
        label="Password"
        value={form.password}
        onChange={(e) => form.setPassword(e.target.value)}
        autoComplete={passwordAutoComplete}
        aria-invalid={flagPassword}
        {...(form.refusal ? { error: form.refusal } : passwordHint ? { hint: passwordHint } : {})}
        required
      />
      {forgot}
      <Button type="submit" disabled={held} full>
        {form.busy ? (busyLabel ?? submitLabel) : submitLabel}
      </Button>
      {children}
    </form>
  );
}
