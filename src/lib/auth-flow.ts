// Brief 4B: the one place the auth surfaces get their provider calls, their password rules and
// their error copy. Sign-in, sign-up, /reset, /reset/new and /password all read from here, so the
// two states that must be identical rather than similar are identical because they are one string.
import { getSupabase, type Supabase } from "./supabase";

export type Provider = "google" | "linkedin_oidc";

export const PROVIDER_LABEL: Record<Provider, string> = {
  google: "Google",
  linkedin_oidc: "LinkedIn",
};

/** Ruling 233: email and password, Google and LinkedIn. Apple is not built. */
export const PROVIDERS: Provider[] = ["google", "linkedin_oidc"];

export const PROVIDER_MARK: Record<Provider, string> = {
  // Placeholders (handoff section 5). Resolved by path so the official downloadable assets land as
  // a file overwrite with no component edited.
  google: "/strand/marks/google.svg",
  linkedin_oidc: "/strand/marks/linkedin.svg",
};

/**
 * Handoff section 5: Google permits "Continue with Google"; LinkedIn's terms favour "Sign in with
 * LinkedIn". Both surfaces use the same verb for a provider so a member is never offered a
 * sign-up variant that LinkedIn's terms do not carry.
 */
export const PROVIDER_BUTTON_LABEL: Record<Provider, string> = {
  google: "Continue with Google",
  linkedin_oidc: "Sign in with LinkedIn",
};

export const PROVIDER_WAITING_LABEL: Record<Provider, string> = {
  google: "Waiting for Google",
  linkedin_oidc: "Waiting for LinkedIn",
};

/** Handoff section 2: at least ten characters. Checked here before the request so the message is ours. */
export const MIN_PASSWORD = 10;

export const COPY = {
  mismatch:
    "That email and password do not match an account. Check both and try again, or reset your password.",
  malformed: "Enter an email address, like name@example.com.",
  tooShort: "Use at least ten characters for your password.",
  breached:
    "This password appears in a known data breach, so it cannot protect your account. Choose a different one.",
  differ: "The two passwords do not match. Type the new password the same way twice.",
  // Ruling 414 (W22): the server's refusals each get their own line. "Should be different from the
  // old password" used to match the too-short rule on the words "should be", so a sixteen-character
  // password was told it needed ten.
  samePassword: "That is the password you already use. Choose a different one.",
  passwordRefused: "That password was not accepted. Choose a different one and try again.",
  wrongCurrent:
    "That is not your current password. Check it and try again. If you have forgotten it, sign out and use Forgot your password.",
  passwordHint: "At least ten characters. A phrase you can remember beats a word you will forget.",
  providerError: (p: Provider) =>
    `${PROVIDER_LABEL[p]} could not sign you in just now. Try again, or use your email and password.`,
  providerCancelled: (p: Provider) =>
    `You closed the ${PROVIDER_LABEL[p]} window before finishing. Nothing has changed. Try again, or use your email and password.`,
} as const;

/**
 * The reset "sent" state and the sign-up "Check your email" state reveal at a fixed delay rather
 * than when the server answers, so an address that has an account and one that does not are
 * indistinguishable to a visitor watching the surface. GoTrue's /recover already answers 200 for
 * both, so there is no server-side difference to hide; this closes the client-side one that a
 * response-driven transition would open.
 */
export const REVEAL_MS = 900;

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Deliberately permissive: the server is the authority. This only catches an address with no shape. */
export function isEmailShaped(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function siteOrigin(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}

/** Registered in Supabase's URL configuration for every deployed origin (see the report). */
export function oauthRedirect(): string {
  return siteOrigin() + "/sign-in";
}

/** Ruling 240: the recovery token lands on the landing route and nowhere else. */
export function recoveryRedirect(): string {
  return siteOrigin() + "/reset/new";
}

const OAUTH_PROVIDER_KEY = "dna.auth.oauth-provider";

export function rememberProvider(p: Provider): void {
  try {
    window.sessionStorage.setItem(OAUTH_PROVIDER_KEY, p);
  } catch {
    /* the returning hash still tells us something went wrong, just not which provider. */
  }
}

export function lastProvider(): Provider | null {
  try {
    const v = window.sessionStorage.getItem(OAUTH_PROVIDER_KEY);
    return v === "google" || v === "linkedin_oidc" ? v : null;
  } catch {
    return null;
  }
}

export function forgetProvider(): void {
  try {
    window.sessionStorage.removeItem(OAUTH_PROVIDER_KEY);
  } catch {
    /* nothing to forget */
  }
}

export type ProviderReturn = { provider: Provider; kind: "cancelled" | "error" } | null;

/**
 * Reads a failed provider round trip off the URL the provider sent the member back to. Success
 * carries a token and is handled by supabase-js; only the failures land here.
 */
export function readProviderReturn(): ProviderReturn {
  if (typeof window === "undefined") return null;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const error = hash.get("error") || query.get("error");
  if (!error) return null;
  if ((hash.get("error_code") || query.get("error_code")) === "otp_expired") return null;
  const provider = lastProvider();
  if (!provider) return null;
  return { provider, kind: error === "access_denied" ? "cancelled" : "error" };
}

/** Clears an auth fragment off the URL so a reload does not replay the state it produced. */
export function stripAuthFragment(): void {
  if (typeof window === "undefined") return;
  if (!window.location.hash && !window.location.search.includes("error")) return;
  const url = new URL(window.location.href);
  for (const key of ["error", "error_code", "error_description", "code", "type"])
    url.searchParams.delete(key);
  url.hash = "";
  window.history.replaceState(window.history.state, "", url.pathname + url.search);
}

/**
 * Ruling 234: one address is one account. Identity linking on a verified matching email is a
 * project setting, not a client call, so nothing here forks on provider; the surface offers the
 * same member the same account whichever button they press. Verified by tests/auth-identity.cjs.
 */
export async function startProvider(sb: Supabase, provider: Provider): Promise<{ error: boolean }> {
  rememberProvider(provider);
  const { error } = await sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo: oauthRedirect() },
  });
  if (error) {
    forgetProvider();
    return { error: true };
  }
  return { error: false };
}

export type PasswordFault = "short" | "breached" | "same" | "other";

type PasswordError = {
  message?: string | undefined;
  code?: string | undefined;
  weak_password?: { reasons?: string[] | undefined } | null | undefined;
} | null;

/**
 * Ruling 414 (W22): GoTrue's password rejections mapped to their real reasons. The code is read
 * first (weak_password carries its reasons: pwned, length, characters; same_password is its own
 * code), the message second, and nothing is inferred from a fragment two refusals share.
 */
export function passwordFault(error: PasswordError): PasswordFault {
  const message = (error?.message || "").toLowerCase();
  const code = (error?.code || "").toLowerCase();
  const reasons = (error?.weak_password?.reasons || []).map((r) => String(r).toLowerCase());
  if (code === "same_password" || message.includes("different from the old")) return "same";
  if (reasons.includes("pwned")) return "breached";
  if (reasons.includes("length")) return "short";
  if (
    message.includes("pwned") ||
    message.includes("breach") ||
    message.includes("known to be weak")
  )
    return "breached";
  if (/at least \d+ characters/.test(message) || message.includes("too short")) return "short";
  return "other";
}

/** The alert line for a fault, from the one copy table (ruling 414). */
export function passwordFaultCopy(fault: PasswordFault): string {
  if (fault === "short") return COPY.tooShort;
  if (fault === "breached") return COPY.breached;
  if (fault === "same") return COPY.samePassword;
  return COPY.passwordRefused;
}

/**
 * Makes the copy true rather than assumed: "Any other device signed in with the old password has
 * been signed out." `others` revokes every session but the one making the call, so this device
 * stays signed in and every other refresh token is dead.
 */
export async function signOutOtherSessions(sb: Supabase): Promise<boolean> {
  const { error } = await sb.auth.signOut({ scope: "others" });
  return !error;
}

export function client(): Supabase | null {
  return getSupabase();
}
