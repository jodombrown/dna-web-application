// The guest path's one client (handoff 30-D item 8; rulings 532, 626, 1026, 1034). Everything a
// signed-out visitor writes about an event goes through the guest-rsvp Edge Function and nothing
// else: it asks for the link, and it opens or answers with the link's token. The function decides
// nothing itself; public.guest_link_request and public.guest_rsvp do (1026).
//
// What this never carries: another attendee (626), a count, or the address in any URL. The token
// arrives in `?g=` once, is read after hydration, and lives in component state for the visit.
import { functionsUrl } from "./supabase";

export type GuestStatus = "going" | "not_going";

export type GuestAnswer = {
  /** `returned`: this open wrote the going row. `existing`: a row stood. `answered`: going or not_going was written. */
  state: "returned" | "existing" | "answered";
  status: GuestStatus | null;
  /** 1034: make the once-only offer to keep this with an account. */
  offer_conversion: boolean;
  email: string;
};

/** A bad, tampered or expired link (410). The sheet asks for a new one. */
export class GuestLinkExpired extends Error {
  constructor() {
    super("This link has expired.");
  }
}

/** The database's own sentence (400), shown under the field, or the one line for anything else. */
export class GuestRefused extends Error {}

export const GUEST_SEND_FAILED = "Could not send the link. Check your connection and try again.";
export const GUEST_ANSWER_FAILED =
  "Could not save your answer. Check your connection and try again.";

async function post(body: Record<string, unknown>): Promise<Response> {
  return fetch(functionsUrl("guest-rsvp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "omit",
  });
}

async function refusal(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error) return body.error;
  } catch {
    /* no body */
  }
  return fallback;
}

/** Ask for the link. 202 whether it was sent or throttled; the sheet says "Check your email" either way. */
export async function requestGuestLink(slug: string, email: string): Promise<void> {
  let res: Response;
  try {
    res = await post({ action: "request", slug, email: email.trim() });
  } catch {
    throw new GuestRefused(GUEST_SEND_FAILED);
  }
  if (res.status === 202) return;
  if (res.status === 400) throw new GuestRefused(await refusal(res, GUEST_SEND_FAILED));
  throw new GuestRefused(GUEST_SEND_FAILED);
}

/** Open, go, or withdraw with the link's token. */
export async function guestRsvp(
  action: "open" | "going" | "not_going",
  token: string,
): Promise<GuestAnswer> {
  let res: Response;
  try {
    res = await post({ action, token });
  } catch {
    throw new GuestRefused(GUEST_ANSWER_FAILED);
  }
  if (res.status === 410) throw new GuestLinkExpired();
  if (res.status === 400) throw new GuestRefused(await refusal(res, GUEST_ANSWER_FAILED));
  if (!res.ok) throw new GuestRefused(GUEST_ANSWER_FAILED);
  const body = (await res.json()) as Partial<GuestAnswer>;
  const state = body.state;
  if (state !== "returned" && state !== "existing" && state !== "answered")
    throw new GuestRefused(GUEST_ANSWER_FAILED);
  return {
    state,
    status: body.status === "going" || body.status === "not_going" ? body.status : null,
    offer_conversion: body.offer_conversion === true,
    email: typeof body.email === "string" ? body.email : "",
  };
}

/** The sign-up flow with the address prefilled (item 8.5): the existing one, never a second path. */
export function createAccountPath(email: string): string {
  return "/sign-in?join=1&email=" + encodeURIComponent(email);
}
