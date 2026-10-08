// resend-webhook: Resend's delivery events, verified, taken once (handoff 55-A; rulings 1321, 477).
//
// POST from Resend. The signature is checked over the raw body before anything is parsed:
//   - the secret is RESEND_WEBHOOK_SECRET, Resend's signing secret, `whsec_` then base64 key bytes;
//     with no secret the function refuses every call (fails closed);
//   - the signed content is `{id}.{timestamp}.{body}`, HMAC-SHA256 under the key, base64;
//   - the signature header holds one or more space-separated `v1,{signature}` entries, any of which
//     may match, compared in constant time;
//   - a timestamp more than five minutes from now, either way, is refused.
// This is the Standard Webhooks scheme Resend signs with through Svix. The algorithm is read from
// Resend's own Node SDK (resend 6.32.1, `webhooks.verify`, which calls standardwebhooks 1.1.1); the
// header names are read as `svix-id`, `svix-timestamp` and `svix-signature`, with the Standard
// Webhooks names `webhook-id`, `webhook-timestamp` and `webhook-signature` accepted as the same three
// (G248: Resend's documentation page was not reachable from the session that wrote this).
//
// The event id is recorded once through public.notify_webhook_take, so a redelivery changes nothing.
// email.bounced with a Permanent bounce and email.complained suppress the recipient's lowercased
// address and mark the outbox row that carried the Resend id; every other type is recorded and
// otherwise ignored. A transient bounce does not suppress.
//
// Server to server, so no CORS. It deploys with JWT verification off (verify_jwt = false): the
// signature is the gate. supabase/config.toml is absent (S54-13, G233), so the setting travels with
// the deploy call, deploy_edge_function's verify_jwt, and this line records it. It logs the event
// type and outcome only: never an address, a payload or the secret. Registering the webhook with
// Resend and setting the secret wait for 1520's ruling on the first send (G240).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const TOLERANCE_SECONDS = 5 * 60;
const MAX_BODY = 256 * 1024;

const encoder = new TextEncoder();

function fromBase64(s: string): Uint8Array | null {
  try {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function constantTimeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** True only when one of the header's v1 signatures is the body's, under the secret, in time. */
async function verified(
  secret: string,
  id: string,
  timestamp: string,
  signatures: string,
  body: string,
): Promise<boolean> {
  if (!/^\d{1,12}$/.test(timestamp)) return false;
  const ts = Number(timestamp);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > TOLERANCE_SECONDS) return false;
  const keyBytes = fromBase64(secret.startsWith("whsec_") ? secret.slice(6) : secret);
  if (!keyBytes || keyBytes.length === 0) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(id + "." + ts + "." + body)),
  );
  const expected = toBase64(mac);
  let match = false;
  for (const entry of signatures.split(" ")) {
    const [version, signature] = entry.split(",");
    if (version !== "v1" || !signature) continue;
    if (constantTimeEqual(signature, expected)) match = true;
  }
  return match;
}

/** The suppression reason an event carries: a Permanent bounce or a complaint, else null. */
function reasonOf(type: string, data: Record<string, unknown>): "bounce" | "complaint" | null {
  if (type === "email.complained") return "complaint";
  if (type !== "email.bounced") return null;
  const bounce = data.bounce;
  if (!bounce || typeof bounce !== "object") return null;
  const kind = (bounce as Record<string, unknown>).type;
  return typeof kind === "string" && kind.toLowerCase() === "permanent" ? "bounce" : null;
}

Deno.serve(async (req: Request) => {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });

  if (req.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST", ...headers } });
  }

  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || !supabaseUrl || !serviceKey) {
    console.log(JSON.stringify({ event: "resend_webhook_misconfigured" }));
    return json({ error: "Not available right now." }, 503);
  }

  const h = (svix: string, standard: string) =>
    req.headers.get(svix) ?? req.headers.get(standard) ?? "";
  const id = h("svix-id", "webhook-id");
  const timestamp = h("svix-timestamp", "webhook-timestamp");
  const signatures = h("svix-signature", "webhook-signature");
  if (!id || !timestamp || !signatures || id.length > 256) {
    return json({ error: "Not allowed." }, 401);
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: "Too large." }, 413);
  if (!(await verified(secret, id, timestamp, signatures, raw))) {
    console.log(JSON.stringify({ event: "resend_webhook_unverified" }));
    return json({ error: "Not allowed." }, 401);
  }

  let event: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return json({ error: "Not an event." }, 400);
    event = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "Not an event." }, 400);
  }
  const type = typeof event.type === "string" ? event.type : "";
  if (!type) return json({ error: "Not an event." }, 400);
  const data =
    event.data && typeof event.data === "object" ? (event.data as Record<string, unknown>) : {};
  const reason = reasonOf(type, data);
  const to = Array.isArray(data.to) && typeof data.to[0] === "string" ? data.to[0] : null;
  const resendId = typeof data.email_id === "string" ? data.email_id : null;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const took = await admin.rpc("notify_webhook_take", {
    p_event_id: id,
    p_type: type,
    p_email: reason ? to : null,
    p_resend_id: reason ? resendId : null,
    p_reason: reason,
  });
  if (took.error) {
    console.log(JSON.stringify({ event: "resend_webhook_take_failed", code: took.error.code }));
    // 500 so Resend retries; the take is idempotent on the event id.
    return json({ error: "Not available right now." }, 500);
  }
  console.log(
    JSON.stringify({ event: "resend_webhook_taken", type, fresh: took.data === true, reason }),
  );
  return json({ ok: true });
});
