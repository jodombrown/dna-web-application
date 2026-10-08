// notify-deliver: the outbox's one sender (handoff 55-A; rulings 1321, 1520, 477, 387).
//
// POST, from private.notify_deliver_kick through pg_net once a minute while a queued row is due. The
// caller proves itself with the x-cron-token header, which public.notify_deliver_token_ok compares
// against the vault secret notify_deliver_token; anything else is 401 and nothing is read.
//
// The rows come from public.notify_outbox_claim, which takes due queued rows under for update skip
// locked and marks them sending, so two runs never hold the same row. Each is then settled one at a
// time through public.notify_outbox_settle:
//   suppressed  the address is in private.email_suppressions (a hard bounce or a complaint);
//   failed      no address, or Resend refused the message or returned no id;
//   skipped     the kind carries no copy (1520: a kind enqueues only with both its subject and its
//               line, so this is a row whose copy was withdrawn after it queued), or a digest, which
//               goes out only with RFC 8058's one-click List-Unsubscribe pair (477) and no one-click
//               endpoint exists yet (G245);
//   sent        only once Resend has returned the message's id (1321).
// An immediate row is one message. Transactional mail never carries List-Unsubscribe (477).
//
// Under 1520 no kind carries copy, so nothing is enqueued and this drains an empty queue.
//
// Server to server, so no CORS. It deploys with JWT verification off (verify_jwt = false): the
// cron token is the gate. supabase/config.toml is absent (S54-13, G233), so the setting travels with
// the deploy call, deploy_edge_function's verify_jwt, and this line records it. It logs counts and
// states only: no address, no subject, no body.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendMail } from "../_shared/mail.ts";

const CLAIM_LIMIT = 50;

type Claimed = {
  id: string;
  mode: "immediate" | "digest";
  member_id: string;
  email: string | null;
  suppressed: boolean;
  kind: string;
  c: string;
  subject: string | null;
  line: string | null;
  transactional: boolean;
  created_at: string;
};

function readClaimed(value: unknown): Claimed[] {
  if (!Array.isArray(value)) return [];
  const out: Claimed[] = [];
  for (const v of value) {
    if (!v || typeof v !== "object") continue;
    const r = v as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.member_id !== "string") continue;
    if (r.mode !== "immediate" && r.mode !== "digest") continue;
    out.push({
      id: r.id,
      mode: r.mode,
      member_id: r.member_id,
      email: typeof r.email === "string" && r.email ? r.email : null,
      suppressed: r.suppressed === true,
      kind: typeof r.kind === "string" ? r.kind : "",
      c: typeof r.c === "string" ? r.c : "",
      subject: typeof r.subject === "string" && r.subject.trim() ? r.subject : null,
      line: typeof r.line === "string" && r.line.trim() ? r.line : null,
      transactional: r.transactional === true,
      created_at: typeof r.created_at === "string" ? r.created_at : "",
    });
  }
  return out;
}

Deno.serve(async (req: Request) => {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });

  if (req.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST", ...headers } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.log(JSON.stringify({ event: "notify_deliver_misconfigured" }));
    return json({ error: "Not available right now." }, 500);
  }
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = req.headers.get("x-cron-token") ?? "";
  if (!token || token.length > 512) return json({ error: "Not allowed." }, 401);
  const check = await admin.rpc("notify_deliver_token_ok", { p_token: token });
  if (check.error) {
    console.log(
      JSON.stringify({ event: "notify_deliver_token_check_failed", code: check.error.code }),
    );
    return json({ error: "Not available right now." }, 500);
  }
  if (check.data !== true) return json({ error: "Not allowed." }, 401);

  const claim = await admin.rpc("notify_outbox_claim", { p_limit: CLAIM_LIMIT });
  if (claim.error) {
    console.log(JSON.stringify({ event: "notify_deliver_claim_failed", code: claim.error.code }));
    return json({ error: "Not available right now." }, 500);
  }
  const rows = readClaimed(claim.data);

  const tally: Record<string, number> = {};
  const settle = async (id: string, state: string, resendId?: string, error?: string) => {
    tally[state] = (tally[state] ?? 0) + 1;
    const r = await admin.rpc("notify_outbox_settle", {
      p_id: id,
      p_state: state,
      p_resend_id: resendId ?? null,
      p_error: error ?? null,
    });
    if (r.error)
      console.log(JSON.stringify({ event: "notify_deliver_settle_failed", code: r.error.code }));
  };

  for (const row of rows) {
    if (!row.email) {
      await settle(row.id, "failed", undefined, "no_address");
      continue;
    }
    if (row.suppressed) {
      await settle(row.id, "suppressed", undefined, "suppressed_address");
      continue;
    }
    if (!row.subject || !row.line) {
      await settle(row.id, "skipped", undefined, "no_copy");
      continue;
    }
    if (row.mode === "digest") {
      // 477: a digest carries List-Unsubscribe and List-Unsubscribe-Post or it does not go. The
      // one-click endpoint those headers must name is not built (G245), so a digest is held back
      // rather than sent without them.
      await settle(row.id, "skipped", undefined, "no_one_click_unsubscribe");
      continue;
    }
    // Immediate. A transactional kind never carries List-Unsubscribe (477); a non-transactional
    // immediate message carries none either until the one-click endpoint exists (G245).
    const sent = await sendMail({ to: row.email, subject: row.subject, text: row.line + "\n" });
    if (sent.ok && sent.id) await settle(row.id, "sent", sent.id);
    else
      await settle(row.id, "failed", undefined, sent.ok ? "no_resend_id" : "status_" + sent.status);
  }

  console.log(JSON.stringify({ event: "notify_deliver_run", claimed: rows.length, ...tally }));
  return json({ ok: true, claimed: rows.length });
});
