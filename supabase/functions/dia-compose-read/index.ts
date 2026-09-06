// dia-compose-read: DIA reads free text and proposes a verb and fields (Brief 1, rulings 39, 52, 54).
// Input  { text, anchor?, spaces? }   Output  Inference | null
// Anthropic API, Sonnet-class, low effort, 2.5 s hard timeout, structured JSON validated against
// VERB_SCHEMA, confidence floor 0.6 (constant), per-session rate limit on a hashed key.
// Logs latency and verb only. Never logs text. Never returns an error body: silence is null.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk";

const MODEL = "claude-sonnet-5";
const THINK_BUDGET_MS = 2400; // inside the client's 2.5 s budget
const CONFIDENCE_FLOOR = 0.6;
const MIN_CHARS = 8;
const MAX_CHARS = 4000;
const RATE_LIMIT = 30; // requests per window per session key
const RATE_WINDOW_MS = 60_000;

type Verb = "connect" | "convene" | "collaborate" | "contribute" | "convey";
const VERBS: Verb[] = ["connect", "convene", "collaborate", "contribute", "convey"];

// Mirrors VERB_SCHEMA in src/components/strand/Composer.tsx: the only fields DIA may fill per verb.
const VERB_SCHEMA: Record<Verb, string[]> = {
  connect: ["who", "why"],
  convene: ["title", "date", "time", "place", "hybrid", "ticket"],
  collaborate: ["title", "category", "roles"],
  contribute: ["title", "instrument", "need", "by"],
  convey: ["title"],
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Structured output schema (Anthropic JSON schema subset: additionalProperties false, no min/max).
// Fields are optional so the model emits only what the text states; fewer output tokens, lower latency.
const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verb", "confidence", "fields"],
  properties: {
    verb: { anyOf: [{ type: "string", enum: VERBS }, { type: "null" }] },
    confidence: { type: "number" },
    fields: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        who: { type: "string" },
        why: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        place: { type: "string" },
        hybrid: { type: "boolean" },
        ticket: { type: "string", enum: ["Free", "Paid"] },
        category: { type: "string" },
        roles: { type: "string" },
        instrument: { type: "string", enum: ["Time", "Skills", "In-kind"] },
        need: { type: "string" },
        by: { type: "string" },
      },
    },
  },
} as const;

const SYSTEM = `You read a short post a member of DNA (Diaspora Network Africa) is typing and decide which of five acts it is, if any.

Acts (verb): connect = Make an Intro (asking to be introduced to, or to meet, a specific person or kind of person). convene = Host an Event (a gathering with a time or place: dinner, meetup, workshop, panel, call). collaborate = Start a Space (starting a group, project, working group, cohort, initiative and looking for people to build with). contribute = Post a Need (asking for time, skills, or in-kind help; volunteers, mentors, equipment, a venue). convey = Share a Story (a written piece, reflection, lesson, account of something that happened).

Return verb null when the text is a plain update or does not clearly fit one act. Confidence is your probability (0 to 1) that the verb is right.

Fields: include only fields that belong to the chosen verb and that the text states explicitly, copying the member's own words; never invent, infer, or complete a detail that is not there; omit anything absent. connect: who, why. convene: title, date, time, place, hybrid, ticket. collaborate: title, category, roles. contribute: title, instrument, need, by. convey: title. title: a short title in the member's words (under 80 characters) when one is clearly implied. date and time: the raw text as written (for example "Thu 16 Oct", "19:00"). place: the venue, city, or link. hybrid: true only if the text says online, hybrid, zoom, stream, or similar alongside a physical place. ticket: "Paid" only when the text mentions a price, ticket cost, or currency; "Free" when it says free. instrument: "Skills" for expertise or professional help, "In-kind" for goods, equipment, or a venue, "Time" for hours, volunteering, or presence. roles: the people sought, as written. need: what is needed, as written. by: the deadline text as written. who: the person or kind of person to be introduced to. why: the reason given.`;

const rate = new Map<string, number[]>();
function limited(key: string): boolean {
  const now = Date.now();
  const hits = (rate.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) {
    rate.set(key, hits);
    return true;
  }
  hits.push(now);
  rate.set(key, hits);
  if (rate.size > 5000) rate.clear();
  return false;
}

async function sessionKey(req: Request): Promise<string> {
  // Hash of the JWT subject with a per-project salt: never the identity itself.
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let sub = "";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")));
    sub = String(payload.sub ?? payload.session_id ?? "");
  } catch {
    sub = "";
  }
  const salt = Deno.env.get("DIA_RATE_SALT") ?? Deno.env.get("SUPABASE_URL") ?? "dna";
  const bytes = new TextEncoder().encode(salt + ":" + sub);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type Fields = Record<string, string | boolean>;
type Inference = { verb: Verb; confidence: number; fields: Fields; latency_ms: number };

// Validate the model output against VERB_SCHEMA. Anything off-contract becomes null (silence).
function validate(raw: unknown, latency: number): Inference | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { verb?: unknown; confidence?: unknown; fields?: unknown };
  if (typeof r.verb !== "string" || !VERBS.includes(r.verb as Verb)) return null;
  const verb = r.verb as Verb;
  const confidence =
    typeof r.confidence === "number" && Number.isFinite(r.confidence)
      ? Math.max(0, Math.min(1, r.confidence))
      : 0;
  if (confidence < CONFIDENCE_FLOOR) return null;
  const fields: Fields = {};
  const src = (r.fields && typeof r.fields === "object" ? r.fields : {}) as Record<string, unknown>;
  for (const key of VERB_SCHEMA[verb]) {
    const v = src[key];
    if (key === "hybrid") {
      if (v === true) fields[key] = true;
      continue;
    }
    if (typeof v === "string") {
      const t = v.trim();
      if (!t) continue;
      if (key === "ticket" && t !== "Free" && t !== "Paid") continue;
      if (key === "instrument" && !["Time", "Skills", "In-kind"].includes(t)) continue;
      fields[key] = t.slice(0, key === "title" ? 120 : 400);
    }
  }
  return { verb, confidence, fields, latency_ms: latency };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(null, 405);

  const started = Date.now();
  let text = "";
  let anchorName: string | undefined;
  try {
    const body = await req.json();
    text = typeof body?.text === "string" ? body.text.trim() : "";
    if (body?.anchor && typeof body.anchor === "object" && typeof body.anchor.name === "string") {
      anchorName = body.anchor.name.slice(0, 120);
    }
  } catch {
    return json(null);
  }
  if (text.length < MIN_CHARS) return json(null);
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);

  const key = await sessionKey(req);
  if (limited(key)) {
    console.log(JSON.stringify({ event: "dia_rate_limited", latency_ms: Date.now() - started }));
    return json(null);
  }

  // Canonical name first; the project currently stores the key under "dna-dia-anthropic-api-supabase".
  const apiKey =
    Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("dna-dia-anthropic-api-supabase");
  if (!apiKey) {
    // Names only, never values: tells an operator which secret is missing or misnamed.
    const names = Object.keys(Deno.env.toObject()).filter((k) =>
      /ANTHROPIC|TINIFY|CLAUDE/i.test(k),
    );
    console.log(JSON.stringify({ event: "dia_no_key", candidate_env_names: names }));
    return json(null);
  }

  const client = new Anthropic({ apiKey, maxRetries: 0 });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), THINK_BUDGET_MS);

  try {
    const user = anchorName
      ? `The member is writing inside "${anchorName}".\n\nText:\n${text}`
      : `Text:\n${text}`;
    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 300,
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        thinking: { type: "disabled" },
        output_config: { effort: "low", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
        messages: [{ role: "user", content: user }],
      } as unknown as Anthropic.MessageCreateParamsNonStreaming,
      { signal: controller.signal, timeout: THINK_BUDGET_MS },
    );
    clearTimeout(timer);
    const latency = Date.now() - started;
    if (response.stop_reason === "refusal") {
      console.log(JSON.stringify({ event: "dia_refusal", latency_ms: latency }));
      return json(null);
    }
    const block = response.content.find((b) => b.type === "text");
    let parsed: unknown = null;
    try {
      parsed = block && block.type === "text" ? JSON.parse(block.text) : null;
    } catch {
      parsed = null;
    }
    const result = validate(parsed, latency);
    console.log(
      JSON.stringify({ event: "dia_read", verb: result?.verb ?? null, latency_ms: latency }),
    );
    return json(result);
  } catch (err) {
    clearTimeout(timer);
    const latency = Date.now() - started;
    const kind = controller.signal.aborted ? "dia_timeout" : "dia_error";
    console.log(
      JSON.stringify({
        event: kind,
        latency_ms: latency,
        status: (err as { status?: number })?.status ?? null,
      }),
    );
    return json(null);
  }
});
