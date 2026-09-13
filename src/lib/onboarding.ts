// Brief 5: onboarding's one read projection and three write paths, and nothing else touches the
// onboarding columns. onboarding_state() decides the gate server-side (the client never infers a
// screen from a row it read); the writes go through the onboarding Edge Function, which calls the
// SECURITY DEFINER RPC under the member's own JWT and emits the company-facing signal (ruling 311)
// where connect-suggest already logs.
import type { Stance } from "@/components/strand/SegmentBlock";
import { deliverImageUrl, uploadImage, type ImageUpload } from "./media";
import { functionsUrl, getSupabase, SUPABASE_PUBLISHABLE_KEY } from "./supabase";

export type OnboardingScreen = "who" | "where" | "relationship";

export type OnboardingState = {
  /** The first incomplete screen; null once onboarded_at is set. */
  next: OnboardingScreen | null;
  who: {
    name: string;
    /** Null until screen one has been written, even though a placeholder handle exists. */
    username: string | null;
    /** The server's derivation from the name, the same steps as deriveUsername below; null when the name folds to nothing (ruling 343). */
    suggestion: string | null;
    avatar_path: string | null;
    completed: boolean;
  };
  where: { city: string | null; country: string | null; completed: boolean };
  relationship: {
    stance: Stance;
    stance_label: string | null;
    /** True only once a member touched a card, or changed stance later. Never from the default. */
    declared: boolean;
    completed: boolean;
  };
  onboarded_at: string | null;
};

/**
 * Ruling 343, mirrored exactly by private.derive_username: trim, NFKD, strip combining marks
 * (the five Unicode combining-mark blocks), then SPEC section 9's rules: lowercase, strip
 * everything except a-z 0-9 space and hyphen, spaces to hyphens, collapse runs, trim hyphens.
 * "Jaûne" derives jaune, "José Núñez-Ålund" derives jose-nunez-alund. A name in a script that
 * folds to nothing derives "", and the field stays empty (gap G15). The forty-character cut is
 * the handle column's, not the SPEC's.
 */
// The five Unicode combining-mark blocks, the same class private.derive_username strips. A class
// made only of combining marks is what no-misleading-character-class exists to flag; here it is
// the point.
// eslint-disable-next-line no-misleading-character-class
const COMBINING_MARKS = /[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/g;

export function deriveUsername(name: string): string {
  return name
    .trim()
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/ /g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "");
}

export async function loadOnboardingState(): Promise<OnboardingState | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("onboarding_state");
  if (error) throw error;
  return (data as unknown as OnboardingState | null) ?? null;
}

export type WhoResult =
  | {
      status: "ok";
      name: string;
      username: string;
      avatar_path: string | null;
      suggestion: string | null;
      username_changes: number;
    }
  | { status: "taken"; suggestion: string | null }
  | { status: "invalid"; suggestion: string | null };

export type WhereResult = { status: "ok"; city: string; country: string };

export type RelationshipResult = {
  status: "ok";
  stance: Stance;
  stance_declared_at: string | null;
  onboarded_at: string;
};

export class OnboardingRefused extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function post<T>(body: Record<string, unknown>): Promise<T> {
  const sb = getSupabase();
  if (!sb) throw new OnboardingRefused("no_client", "Not signed in.");
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new OnboardingRefused("unauthorized", "Not signed in.");
  const res = await fetch(functionsUrl("onboarding"), {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const out = (await res.json().catch(() => null)) as
    { ok: true; result?: T } | { ok: false; error?: { code?: string; message?: string } } | null;
  if (!out || !out.ok) {
    const err = out && !out.ok ? out.error : undefined;
    throw new OnboardingRefused(err?.code ?? "refused", err?.message ?? "That did not save.");
  }
  return out.result as T;
}

/** Screen one. A taken or invalid username writes nothing; the suggestion stays available. */
export function onboardWho(input: {
  name: string;
  username?: string | null;
  avatarPath?: string | null;
}): Promise<WhoResult> {
  return post<WhoResult>({
    screen: "who",
    name: input.name,
    username: input.username ?? null,
    avatar_path: input.avatarPath ?? null,
  });
}

/** Screen two. The country must be a value from vocabularies().world. */
export function onboardWhere(input: { city: string; country: string }): Promise<WhereResult> {
  return post<WhereResult>({ screen: "where", city: input.city, country: input.country });
}

/**
 * Screen three, the only path that sets onboarded_at. `touched` is SPEC section 6's flag: true on
 * any selection including re-selecting the default, never on opening the explainer. `elapsedMs`
 * is time on the screen, company-facing only.
 */
export function onboardRelationship(input: {
  stance: Stance;
  touched: boolean;
  elapsedMs?: number;
}): Promise<RelationshipResult> {
  return post<RelationshipResult>({
    screen: "relationship",
    stance: input.stance,
    touched: input.touched,
    elapsed_ms: input.elapsedMs ?? null,
  });
}

/** Explainer opens are company-facing only (ruling 311) and never set anything on the row. */
export function emitExplainerOpened(stance?: Stance): void {
  void post({ event: "explainer_opened", stance: stance ?? null }).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// The routes, the gate's reading of a path, and the photo path (SPEC sections 1 and 4).
// ---------------------------------------------------------------------------

export const ONBOARDING_ORDER: OnboardingScreen[] = ["who", "where", "relationship"];
export const ONBOARDING_ROUTE: Record<OnboardingScreen, "/welcome" | "/where" | "/relationship"> = {
  who: "/welcome",
  where: "/where",
  relationship: "/relationship",
};

/** The onboarding screen a path renders, or null for any other route. */
export function screenOfPath(pathname: string): OnboardingScreen | null {
  const p = pathname.replace(/\/$/, "") || "/";
  for (const s of ONBOARDING_ORDER) if (ONBOARDING_ROUTE[s] === p) return s;
  return null;
}

/** Routes the gate never holds: the auth surfaces a signed-in member may still need to reach. */
export function isUngated(pathname: string): boolean {
  const p = pathname.replace(/\/$/, "") || "/";
  return p === "/sign-in" || p === "/reset" || p === "/reset/new";
}

/** Ruling 334: three to forty characters, in the handle column's shape; the server enforces it too. */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 40;
export function usernameValid(u: string): boolean {
  return (
    /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(u) &&
    u.length >= USERNAME_MIN &&
    u.length <= USERNAME_MAX
  );
}

export type UsernameRefusal = "accented" | "characters" | "short" | "long" | "hyphen";

/**
 * Ruling 434 (W17, U-O2): every reason a username is refused, each its own line on the screen,
 * so Continue never disables in silence. An accented letter that would fold away (José, Søren)
 * is named as such; a character that is neither a letter, a digit nor a hyphen is named as such;
 * length and the hyphen rule each have their own line. The numbers in the copy are words.
 */
export const USERNAME_REFUSAL: Record<UsernameRefusal, string> = {
  accented:
    "Accented and special letters do not fit a username. Use plain letters a to z, numbers and hyphens.",
  characters: "Use lowercase letters, numbers and hyphens only.",
  short: "A username needs at least three characters.",
  long: "A username can be up to forty characters.",
  hyphen: "A username cannot begin or end with a hyphen.",
};

export function usernameRefusals(u: string): UsernameRefusal[] {
  const out: UsernameRefusal[] = [];
  if (u === "") return out;
  // eslint-disable-next-line no-control-regex
  if (/[^\x00-\x7f]/.test(u)) out.push("accented");
  else if (/[^a-z0-9-]/.test(u)) out.push("characters");
  if (u.length < USERNAME_MIN) out.push("short");
  if (u.length > USERNAME_MAX) out.push("long");
  if (/^-|-$/.test(u)) out.push("hyphen");
  return out;
}

/** The size the avatar renders at, delivered from the one master through a Storage transform. */
export const AVATAR_DELIVERY_PX = 480;

export type PhotoUpload = ImageUpload;

/**
 * One step, no crop (ruling 324): the picked file goes through the one client half of the media
 * pipeline (uploadImage in lib/media.ts, rulings 345, 346, 424), which converts, bounds the request
 * and hands back the master's storage path for onboard_who. The profile's avatar and cover call
 * the same helper, so there is one conversion, one mime rule and one timeout, not three.
 */
export function uploadOnboardingPhoto(file: File): Promise<PhotoUpload> {
  return uploadImage(file, "avatar");
}

/** A signed, delivery-sized URL for a stored avatar master, for the chosen state on resume. */
export async function onboardingPhotoUrl(
  path: string | null | undefined,
): Promise<string | undefined> {
  return deliverImageUrl("profile-media", path, {
    width: AVATAR_DELIVERY_PX,
    height: AVATAR_DELIVERY_PX,
    resize: "cover",
  });
}

/** The query key every onboarding read and write shares, so the gate and the screens see one state. */
export const onboardingQueryKey = (memberId: string) => ["onboarding", memberId] as const;

/**
 * SPEC section 3: on resume the lead reads Welcome back. Resume is a session that opened with a
 * screen already written, read once from the first state this page load resolves, so moving from
 * one screen to the next inside a session never turns into a resume.
 */
let resumedSession: boolean | null = null;
export function noteInitialState(state: OnboardingState | null): void {
  if (resumedSession === null && state) resumedSession = state.who.completed && state.next !== null;
}
export function isResumedSession(): boolean {
  return resumedSession === true;
}
