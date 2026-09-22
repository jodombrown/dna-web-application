// event-mail: the member's going email (handoff 30-D item 4; ruling 1035, on 387, 1025 and 1032).
//
// POST { event_id } with the member's own Authorization header.
//   A client built with the caller's token reads public.event_page(p_event) as them, so the meeting
//   link in the email is the one their own page shows and nothing the projection withholds. It sends
//   only when the viewer's registration is going, to the caller's own confirmed address as
//   auth.getUser() reports it and never to an address in the request. The Change link is the member
//   page. 202 when it sent, 204 when there was nothing to send: not going, no row, no page, or an
//   address that is not confirmed.
//
// Deployed with JWT verification on: the gateway refuses a call without a token before this runs,
// and the check below is the same refusal for a call that reaches it another way. It logs event
// names and error codes only: no address, no link.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { goingEmail, readFacts, sendMail } from "../_shared/mail.ts";
import { allowedOrigin, corsHeaders } from "../_shared/origin.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY = 1024;

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
  const empty = (status: number) => new Response(null, { status, headers: baseHeaders });

  if (req.method === "OPTIONS") {
    if (!origin)
      return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
    return new Response(null, { status: 204, headers: baseHeaders });
  }
  if (req.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST, OPTIONS", ...baseHeaders } });
  }
  if (req.headers.get("origin") && !origin) return json({ sent: false }, 403);

  const auth = req.headers.get("authorization") ?? "";
  if (!/^Bearer\s+\S+/i.test(auth)) return json({ sent: false }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey || !appOrigin) {
    console.log(JSON.stringify({ event: "event_mail_misconfigured" }));
    return json({ sent: false }, 500);
  }

  let eventId = "";
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return json({ sent: false }, 400);
    const parsed: unknown = JSON.parse(raw);
    const v =
      parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>).event_id : null;
    eventId = typeof v === "string" ? v.toLowerCase() : "";
  } catch {
    return json({ sent: false }, 400);
  }
  if (!UUID.test(eventId)) return json({ sent: false }, 400);

  // The member's own JWT: event_page runs as them, so the door in the email is the door on their page.
  const sb = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: auth } },
  });

  const { data: userData, error: userError } = await sb.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return json({ sent: false }, 401);
  const to = typeof user.email === "string" ? user.email.trim() : "";
  const confirmed = !!user.email_confirmed_at || !!user.confirmed_at;
  if (!to || !confirmed) return empty(204);

  const { data, error } = await sb.rpc("event_page", { p_event: eventId });
  if (error) {
    if (error.code === "42501") return json({ sent: false }, 401);
    console.log(JSON.stringify({ event: "event_mail_page_failed", code: error.code ?? null }));
    return json({ sent: false }, 500);
  }
  const page = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  if (!page) return empty(204);
  const viewer =
    page.viewer && typeof page.viewer === "object"
      ? (page.viewer as Record<string, unknown>)
      : null;
  const registration =
    viewer?.registration && typeof viewer.registration === "object"
      ? (viewer.registration as Record<string, unknown>)
      : null;
  if (registration?.status !== "going") return empty(204);

  const event =
    page.event && typeof page.event === "object" ? (page.event as Record<string, unknown>) : {};
  const facts = readFacts({
    event_id: event.id,
    slug: event.slug,
    title: event.title,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    doors_at: event.doors_at,
    timezone: event.timezone,
    when_text: event.when_text,
    mode: event.mode,
    place: page.place,
    meeting_url: page.meeting_url,
  });
  if (!facts) {
    console.log(JSON.stringify({ event: "event_mail_no_facts" }));
    return json({ sent: false }, 500);
  }

  const mail = goingEmail(
    facts,
    appOrigin.replace(/\/$/, "") + "/convene/events/" + facts.event_id,
  );
  const sent = await sendMail({
    to,
    subject: mail.subject,
    text: mail.text,
    attachments: mail.attachments,
  });
  // The answer to the RSVP stands whatever the mail did (item 10.3); the client only chooses its toast.
  return sent.ok ? json({ sent: true }, 202) : json({ sent: false }, 502);
});
