// connect-suggest: DIA writes the reason for each rules-ranked suggestion (Brief 4, rulings 113,
// 115, 153). Input { limit? }  Output { items: Card[] } where every item carries `reason`.
//
// The candidates and their structured facts come from connect_cards('suggested') called with the
// member's own JWT, so RLS and auth.uid() decide what is a fact. The facts are words only (event
// titles, Space titles, corridor labels, vocabulary values, mutual names); DIA on the Anthropic API
// turns them into one or two plain sentences. DIA never receives or emits a number. On timeout,
// error, refusal or an off-contract sentence the suggestion does not render at all rather than
// rendering without its reason (grounded-or-empty). Facts never reach the client.
// Logs latency and counts only. Never logs names or facts.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "claude-sonnet-5";
const THINK_BUDGET_MS = 6000;
const MAX_ITEMS = 12;
const MAX_REASON_CHARS = 240;

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

type Facts = {
  events?: string[];
  spaces?: string[];
  corridors?: string[];
  overlap?: Partial<Record<"focus" | "industries" | "regions" | "skills" | "languages", string[]>>;
  mutuals?: string[];
};
type Card = { id: string; name: string; facts?: Facts; [k: string]: unknown };

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reasons"],
  properties: {
    reasons: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "reason"],
        properties: { id: { type: "string" }, reason: { type: "string" } },
      },
    },
  },
} as const;

const SYSTEM = `You are DIA, the assistant inside DNA (Diaspora Network Africa). For each candidate you receive the member's first name and the facts that made the network suggest them to the reader. Write the reason the reader sees, in one or two plain sentences, addressed to the reader as "you".

Rules, all binding:
- Use only the facts given. Name the event, Space, corridor, shared value or mutual connection exactly as written. Never invent, infer, or embellish, and never speculate about what the two people could do together.
- Never use a number, a digit, a count, a percentage, a ranking word (top, best, most) or a strength word (strong, likely, close match). Say "you share" or "you were both at", never how many or how much.
- Mutual connections are named, never counted: "Lerato and Kwame are connections you share", never "two mutual connections".
- Sentence case. No exclamation marks, no em dashes, no emoji, no quotation marks around titles.
- Under two hundred characters per reason. Return one reason per candidate id, and skip a candidate rather than pad a thin fact set.`;

function factsText(f: Facts | undefined): string {
  if (!f) return "";
  const parts: string[] = [];
  for (const v of [f.events, f.spaces, f.corridors, f.mutuals]) if (v) parts.push(...v);
  if (f.overlap) for (const v of Object.values(f.overlap)) if (v) parts.push(...v);
  return parts.join(" ");
}

// A reason is valid when it is a short sentence with no numeral of its own, no percent sign and no
// exclamation. A digit run is allowed only when it appears verbatim in that candidate's facts (an
// event title carrying a year, for instance).
function validReason(reason: unknown, facts: Facts | undefined): string | null {
  if (typeof reason !== "string") return null;
  const r = reason.trim().replace(/\s+/g, " ");
  if (r.length < 12 || r.length > MAX_REASON_CHARS) return null;
  if (/[%!]/.test(r)) return null;
  const allowed = factsText(facts);
  for (const run of r.match(/\d+/g) ?? []) if (!allowed.includes(run)) return null;
  return r;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ items: [] }, 405);
  const started = Date.now();
  const auth = req.headers.get("authorization") ?? "";
  if (!/^Bearer\s+\S+/i.test(auth)) return json({ items: [] }, 401);

  let limit = MAX_ITEMS;
  try {
    const body = (await req.json().catch(() => ({}))) as { limit?: unknown };
    if (typeof body.limit === "number" && body.limit >= 1)
      limit = Math.min(MAX_ITEMS, Math.floor(body.limit));
  } catch {
    limit = MAX_ITEMS;
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return json({ items: [] }, 500);

  // The member's own JWT: connect_cards runs as them, so nothing they may not see is ever a fact.
  const sb = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data, error } = await sb.rpc("connect_cards", { p_lens: "suggested", p_limit: limit });
  if (error || !data || typeof data !== "object") {
    console.log(
      JSON.stringify({
        event: "connect_suggest_no_candidates",
        latency_ms: Date.now() - started,
        error: error?.code ?? null,
      }),
    );
    return json({ items: [] });
  }
  const cards = ((data as { items?: Card[] }).items ?? []).filter(
    (c) => c && typeof c.id === "string",
  );
  if (cards.length === 0) return json({ items: [] });

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.log(JSON.stringify({ event: "connect_suggest_no_key" }));
    return json({ items: [] });
  }

  const client = new Anthropic({ apiKey, maxRetries: 0 });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), THINK_BUDGET_MS);
  const input = cards.map((c) => ({
    id: c.id,
    first_name: String(c.name ?? "").split(" ")[0] ?? "",
    facts: c.facts ?? {},
  }));
  try {
    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 120 * cards.length + 100,
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        thinking: { type: "disabled" },
        output_config: { effort: "low", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
        messages: [{ role: "user", content: "Candidates:\n" + JSON.stringify(input) }],
      } as unknown as Anthropic.MessageCreateParamsNonStreaming,
      { signal: controller.signal, timeout: THINK_BUDGET_MS },
    );
    clearTimeout(timer);
    if (response.stop_reason === "refusal") {
      console.log(
        JSON.stringify({ event: "connect_suggest_refusal", latency_ms: Date.now() - started }),
      );
      return json({ items: [] });
    }
    const block = response.content.find((b) => b.type === "text");
    let parsed: { reasons?: { id?: unknown; reason?: unknown }[] } | null = null;
    try {
      parsed = block && block.type === "text" ? JSON.parse(block.text) : null;
    } catch {
      parsed = null;
    }
    const byId = new Map<string, string>();
    for (const r of parsed?.reasons ?? []) {
      if (typeof r.id !== "string") continue;
      const card = cards.find((c) => c.id === r.id);
      const ok = card ? validReason(r.reason, card.facts) : null;
      if (ok) byId.set(r.id, ok);
    }
    const items = cards
      .filter((c) => byId.has(c.id))
      .map((c) => {
        const { facts: _facts, ...rest } = c;
        return { ...rest, reason: byId.get(c.id) };
      });
    console.log(
      JSON.stringify({
        event: "connect_suggest",
        candidates: cards.length,
        rendered: items.length,
        latency_ms: Date.now() - started,
      }),
    );
    return json({ items });
  } catch (err) {
    clearTimeout(timer);
    console.log(
      JSON.stringify({
        event: controller.signal.aborted ? "connect_suggest_timeout" : "connect_suggest_error",
        latency_ms: Date.now() - started,
        status: (err as { status?: number })?.status ?? null,
      }),
    );
    return json({ items: [] });
  }
});
