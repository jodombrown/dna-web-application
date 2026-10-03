// The admin app's one read of its own standing (Brief 12 12A, ruling 1265): public.admin_session_state()
// answers holds_role, the JWT's aal and the roles at aal2, and the gate is the database. What this
// module adds is the MFA half, through the one client's auth.mfa: whether a verified TOTP factor
// exists, enrolment, the challenge and the verification. The client checks are decoration; nothing
// here decides what the account may read.
import type { AuthError } from "@supabase/supabase-js";
import type { Supabase } from "@/lib/supabase";

export type AdminState = {
  holds_role: boolean;
  aal: string | null;
  roles: string[];
  /** A verified TOTP factor exists on the account, so the step is the code, not enrolment. */
  verified_factor: boolean;
};

function readState(json: unknown): Omit<AdminState, "verified_factor"> | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  return {
    holds_role: o["holds_role"] === true,
    aal: typeof o["aal"] === "string" ? o["aal"] : null,
    roles: Array.isArray(o["roles"]) ? o["roles"].filter((r) => typeof r === "string") : [],
  };
}

export async function readAdminState(sb: Supabase): Promise<AdminState> {
  const { data, error } = await sb.rpc("admin_session_state");
  if (error) throw error;
  const state = readState(data);
  if (!state) throw new Error("admin_session_state answered no object");
  const factors = await sb.auth.mfa.listFactors();
  if (factors.error) throw factors.error;
  return { ...state, verified_factor: factors.data.totp.length > 0 };
}

export type Enrolment = { factorId: string; qrCode: string; secret: string };

/**
 * Enrol a TOTP factor. An unverified TOTP factor already on the account is an enrolment that was
 * abandoned, this screen's own earlier attempt or one from another device; it can never be used, so
 * it is removed first and the account holds at most one. Supabase answers the QR code as a data:
 * URL, which the admin policy's img-src admits.
 */
export async function enrolTotp(sb: Supabase): Promise<Enrolment> {
  const factors = await sb.auth.mfa.listFactors();
  if (factors.error) throw factors.error;
  for (const f of factors.data.all)
    if (f.factor_type === "totp" && f.status === "unverified") {
      const { error } = await sb.auth.mfa.unenroll({ factorId: f.id });
      if (error) throw error;
    }
  const { data, error } = await sb.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "DNA Admin",
  });
  if (error) throw error;
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/** The factor the code step verifies against: the account's one verified TOTP factor. */
export async function verifiedTotpFactor(sb: Supabase): Promise<string | null> {
  const { data, error } = await sb.auth.mfa.listFactors();
  if (error) throw error;
  return data.totp[0]?.id ?? null;
}

export type VerifyOutcome = "ok" | "wrong" | "failed";

/** Challenge and verify one six-digit code. On "ok" the session is now at aal2. */
export async function verifyCode(
  sb: Supabase,
  factorId: string,
  code: string,
): Promise<VerifyOutcome> {
  const challenge = await sb.auth.mfa.challenge({ factorId });
  if (challenge.error) return "failed";
  const { error } = await sb.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code });
  if (!error) return "ok";
  return isWrongCode(error) ? "wrong" : "failed";
}

function isWrongCode(error: AuthError): boolean {
  const code = (error.code || "").toLowerCase();
  const message = (error.message || "").toLowerCase();
  return code === "mfa_verification_failed" || message.includes("invalid totp");
}

/** Section 3 item 6: the project setting the founder owns, named by its code so the report can say so. */
export function totpDisabled(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code ?? "";
  return code.toLowerCase() === "mfa_totp_enroll_not_enabled";
}

/** This browser's session only: a member signed in on the app elsewhere stays signed in there. */
export async function signOutHere(sb: Supabase): Promise<void> {
  await sb.auth.signOut({ scope: "local" });
}

/**
 * Sign out everywhere (handoff 45-D Part B item 5): `signOut({ scope: "global" })` revokes every
 * refresh token of the account, so every session ends, this one included, and the local session is
 * cleared. Throws on failure so the page can stay signed in and say so.
 */
export async function signOutEverywhere(sb: Supabase): Promise<void> {
  const { error } = await sb.auth.signOut({ scope: "global" });
  if (error) throw error;
}

// ---------------------------------------------------------------------------------------------------
// Re-enrolment (handoff 45-D Part B item 5; extraction §2d S3). In order: a current code is checked
// on the existing verified factor (`mfa.challenge` and `mfa.verify` on it); only then is a new TOTP
// factor enrolled (`mfa.enroll`); its first code is verified (`mfa.challenge` and `mfa.verify` on
// the new factor), which makes it a verified factor; only then is the old one removed
// (`mfa.unenroll`), which needs the aal2 session the verification has just given. Cancelling
// between the two steps removes the new, still unverified factor, so nothing half-made is left.
// ---------------------------------------------------------------------------------------------------

/** Step 1: the current code on the existing factor. Answers its id when the code matched. */
export async function checkCurrentCode(
  sb: Supabase,
  code: string,
): Promise<{ outcome: VerifyOutcome; factorId: string | null }> {
  const factorId = await verifiedTotpFactor(sb);
  if (!factorId) return { outcome: "failed", factorId: null };
  return { outcome: await verifyCode(sb, factorId, code), factorId };
}

/**
 * Step 2's enrolment. Supabase refuses a second factor with a friendly name the account already
 * holds, so the new entry is named with the moment it was made; any unverified TOTP factor left by
 * an abandoned attempt is removed first, as `enrolTotp` does.
 */
export async function enrolReplacement(sb: Supabase): Promise<Enrolment> {
  const factors = await sb.auth.mfa.listFactors();
  if (factors.error) throw factors.error;
  for (const f of factors.data.all)
    if (f.factor_type === "totp" && f.status === "unverified") {
      const { error } = await sb.auth.mfa.unenroll({ factorId: f.id });
      if (error) throw error;
    }
  const { data, error } = await sb.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "DNA Admin " + new Date().toISOString().slice(0, 16).replace("T", " "),
  });
  if (error) throw error;
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/** Step 2's finish: verify the new factor's code, then remove the old factor. */
export async function finishReplacement(
  sb: Supabase,
  oldFactorId: string,
  newFactorId: string,
  code: string,
): Promise<VerifyOutcome> {
  const outcome = await verifyCode(sb, newFactorId, code);
  if (outcome !== "ok") return outcome;
  const { error } = await sb.auth.mfa.unenroll({ factorId: oldFactorId });
  return error ? "failed" : "ok";
}

/** Cancel between the steps: the new factor was never verified, so it is removed. */
export async function abandonReplacement(sb: Supabase, newFactorId: string): Promise<void> {
  await sb.auth.mfa.unenroll({ factorId: newFactorId }).catch(() => undefined);
}
