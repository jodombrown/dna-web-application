// guest-rsvp: the guest's one write path (handoff 30-D item 3; rulings 1026, 1034 and 1035, on 532,
// 626, 653, 1002 and 1028).
//
// POST { action: "request", slug, email }
//   Asks public.guest_link_request for the facts. When it says send, a signed link is minted and the
//   link email goes out. The answer is 202 { ok: true } whether the link was sent or the address was
//   throttled, so the endpoint never tells a caller whether an address has asked before. A database
//   refusal (22023: not an address, no public page, over, ticketed) is 400 with the database's own
//   sentence, which the sheet shows under the field.
//
// POST { action: "open" | "going" | "not_going", token }
//   Verifies the link's signature in constant time and its expiry; a bad or expired token is 410
//   { expired: true }. Then public.guest_rsvp writes or reports the row. When the row is going and
//   either this was the first open (state `returned`) or the action was going, the going confirmation
//   goes out with a freshly minted seven-day Change link. The answer is 200 with the state, the
//   status, whether to make the conversion offer, and the address.
//
// The token is base64url(payload) + "." + base64url(HMAC-SHA256(GUEST_LINK_SECRET, payload)), the
// payload { e: event_id, m: email, x: expiry seconds }. It binds one address to one event for seven
// days and is the only thing that writes a guest row: an unconfirmed address never registers.
//
// Every caller is signed out, so this deploys with JWT verification off. What it may do is decided by
// the two database functions, which the service role alone may execute; this function's own
// environment is the caller. It logs event names and error codes only: no token, no address, no link.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { goingEmail, linkEmail, readFacts, sendMail } from "../_shared/mail.ts";
import { allowedOrigin, corsHeaders } from "../_shared/origin.ts";

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["request", "open", "going", "not_going"]);
const MAX_BODY = 4096;

type Payload = { e: string; m: string; x: number };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return null;
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  try {
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function signingKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function mintToken(key: CryptoKey, eventId: string, email: string): Promise<string> {
  const payload: Payload = {
    e: eventId,
    m: email,
    x: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const bytes = encoder.encode(JSON.stringify(payload));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, bytes));
  return b64url(bytes) + "." + b64url(sig);
}

/** The payload a token carries, or null: bad shape, bad signature (checked in constant time) or expired. */
async function verifyToken(key: CryptoKey, token: unknown): Promise<Payload | null> {
  if (typeof token !== "string" || token.length > 2048) return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const body = fromB64url(token.slice(0, dot));
  const sig = fromB64url(token.slice(dot + 1));
  if (!body || !sig || sig.length !== 32) return null;
  const valid = await crypto.subtle.verify("HMAC", key, sig, body);
  if (!valid) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoder.decode(body));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;
  if (typeof p.e !== "string" || !UUID.test(p.e)) return null;
  if (typeof p.m !== "string" || !p.m) return null;
  if (typeof p.x !== "number" || !Number.isFinite(p.x)) return null;
  if (p.x <= Math.floor(Date.now() / 1000)) return null;
  return { e: p.e.toLowerCase(), m: p.m, x: p.x };
}

Deno.serve(async (req: Request) => {
  const appOrigin = Deno.env.get("APP_ORIGIN") ?? "";
  const origin = allowedOrigin(req.headers.get("origin"), appOrigin);
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    ...(origin ? corsHeaders(origin) : {}),
  };
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: baseHeaders });

  if (req.method === "OPTIONS") {
    if (!origin)
      return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
    return new Response(null, { status: 204, headers: baseHeaders });
  }
  if (req.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST, OPTIONS", ...baseHeaders } });
  }
  // A browser request from an origin that is not ours gets no answer it can read.
  if (req.headers.get("origin") && !origin) return json({ error: "Not allowed." }, 403);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secret = Deno.env.get("GUEST_LINK_SECRET");
  if (!supabaseUrl || !serviceKey || !secret || !appOrigin) {
    console.log(JSON.stringify({ event: "guest_rsvp_misconfigured" }));
    return json({ error: "Not available right now." }, 500);
  }

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return json({ error: "That is not a request this takes." }, 400);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("shape");
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "That is not a request this takes." }, 400);
  }
  const action = typeof body.action === "string" ? body.action : "";
  if (!ACTIONS.has(action)) return json({ error: "That is not a request this takes." }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const key = await signingKey(secret);
  const app = appOrigin.replace(/\/$/, "");

  if (action === "request") {
    const slug = typeof body.slug === "string" ? body.slug : "";
    const email = typeof body.email === "string" ? body.email : "";
    if (!SLUG.test(slug) || slug.length > 67) {
      return json({ error: "This event is not taking answers here." }, 400);
    }
    if (!email || email.length > 254) return json({ error: "That is not an email address." }, 400);

    const { data, error } = await admin.rpc("guest_link_request", { p_slug: slug, p_email: email });
    if (error) {
      if (error.code === "22023") return json({ error: error.message }, 400);
      console.log(JSON.stringify({ event: "guest_link_request_failed", code: error.code ?? null }));
      return json({ error: "Not available right now." }, 500);
    }
    const answer = (data ?? {}) as Record<string, unknown>;
    if (answer.send === true) {
      const facts = readFacts(answer.facts);
      const to = typeof answer.email === "string" ? answer.email : "";
      if (!facts || !to) {
        console.log(JSON.stringify({ event: "guest_link_request_no_facts" }));
        return json({ error: "Not available right now." }, 500);
      }
      const token = await mintToken(key, facts.event_id, to);
      const link = app + "/e/" + facts.slug + "?g=" + token;
      const mail = linkEmail(facts, link);
      const sent = await sendMail({ to, subject: mail.subject, text: mail.text });
      if (!sent.ok) {
        // Whether this address had asked before is still not told: only that the mail did not go.
        return json({ error: "Could not send the link. Try again in a moment." }, 502);
      }
    }
    return json({ ok: true }, 202);
  }

  const payload = await verifyToken(key, body.token);
  if (!payload) return json({ expired: true }, 410);

  const { data, error } = await admin.rpc("guest_rsvp", {
    p_event: payload.e,
    p_email: payload.m,
    p_action: action,
  });
  if (error) {
    if (error.code === "22023") return json({ error: error.message }, 400);
    console.log(JSON.stringify({ event: "guest_rsvp_failed", code: error.code ?? null }));
    return json({ error: "Not available right now." }, 500);
  }
  const answer = (data ?? {}) as Record<string, unknown>;
  const state = typeof answer.state === "string" ? answer.state : null;
  const status = typeof answer.status === "string" ? answer.status : null;
  const offer = answer.offer_conversion === true;
  const email = typeof answer.email === "string" ? answer.email : payload.m;

  if (status === "going" && (state === "returned" || action === "going")) {
    const facts = readFacts(answer.facts);
    if (facts) {
      const token = await mintToken(key, facts.event_id, email);
      const mail = goingEmail(facts, app + "/e/" + facts.slug + "?g=" + token);
      // The answer stands whatever the mail did (1035): the row is written and the page shows the door.
      await sendMail({
        to: email,
        subject: mail.subject,
        text: mail.text,
        attachments: mail.attachments,
      });
    } else {
      console.log(JSON.stringify({ event: "guest_rsvp_no_facts" }));
    }
  }

  return json({ state, status, offer_conversion: offer, email });
});
