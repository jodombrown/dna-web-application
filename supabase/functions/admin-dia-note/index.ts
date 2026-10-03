// admin-dia-note: DIA's note for the Overview (Brief 12 12B, SPEC-40-12B Part D, handoff 45-B Part D;
// rulings 1273, 1301, 1311). Input { grain, compare, tz }. Output { statements: [{ text, block }] }.
//
// The caller's own JWT is the only credential: the five projections and the note cache run as the
// caller, so the projections' own gate (admin or analyst at aal2, 1311) and read log (1178) apply,
// and this function holds no service key. The cache is read first and a hit is returned as it is.
// On a miss the five projections are read, DIA on the Anthropic API receives the aggregates only
// (1273: never a member) and is asked for short statements, each naming one of the page's blocks.
// A statement that names no block, or trips hasNumber (1301, the one rule shared with the part), is
// dropped and never rewritten. The survivors are written to the cache and returned. On timeout,
// error, refusal or no surviving statement the answer is none, and DiaNote renders its empty
// sentence; the page never waits on this. Logs latency and counts only; never a statement.
//
// CORS answers the admin origin, ADMIN_ORIGIN, and the dna-admin Pages previews, and nothing else
// (_shared/origin.ts's rule, with the admin host in place of the app's).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";
import { hasNumber } from "../_shared/has-number.ts";

const MODEL = "claude-sonnet-5";
const THINK_BUDGET_MS = 8000;
const MAX_STATEMENTS = 5;
const MAX_STATEMENT_CHARS = 240;
const GRAINS = new Set(["now", "hour", "day", "week", "month", "quarter", "year"]);
const COMPARES = new Set(["previous", "last_year"]);
/** The blocks a statement may name, as the page labels them for DiaNote's link. */
const BLOCKS = ["Mobilization", "By corridor", "Source", "The levers", "The network", "Controls"];

// The deploy-admin job uploads to the Pages project `dna-admin`, and Pages served that project at
// the subdomain `dna-admin-1oz` because `dna-admin.pages.dev` was taken: a preview deployment's own
// origin is `https://<id>.dna-admin-1oz.pages.dev` (handoff 45-C item 3, ruling 1379).
const ADMIN_PREVIEW = /^https:\/\/[a-z0-9-]+\.dna-admin-1oz\.pages\.dev$/i;

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const admin = (Deno.env.get("ADMIN_ORIGIN") ?? "https://admin.diasporanetwork.africa").replace(
    /\/$/,
    "",
  );
  if (origin === admin) return origin;
  if (ADMIN_PREVIEW.test(origin)) return origin;
  return null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const o = allowedOrigin(origin);
  if (!o) return {};
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

type Statement = { text: string; block: string };

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["statements"],
  properties: {
    statements: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "block"],
        properties: {
          text: { type: "string" },
          block: { type: "string", enum: BLOCKS },
        },
      },
    },
  },
} as const;

const SYSTEM = `You are DIA, the assistant inside DNA (Diaspora Network Africa). You are reading the company's Overview: aggregate figures for one period against its comparison period, for the founder's weekly review. Write short statements that suggest what might explain a change, each resting on one block of the page.

Rules, all binding:
- Use only the aggregates given. Never name, describe or infer a person. There are no people in the data and there must be none in your words.
- Never use a number, a digit, a count, a percentage, a fraction, or a number in words (no "two", "half", "a dozen", "a third"). Say "rose", "fell", "held steady", "most of", "the rise", never how many or how much.
- Each statement is one or two plain sentences, under two hundred characters, in sentence case, with no exclamation mark, no em dash and no emoji.
- Each statement names the block it rests on in the block field: Mobilization, By corridor, Source, The levers, The network, or Controls.
- Direction, Depth and Source are part of the Mobilization block. A statement about direction, depth or source names Mobilization.
- The network block describes all joined members as of now, not the period. A statement about it never calls them new, recent or joiners in the period.
- A source or lever marked not_connected is not data; you may say that it is not yet connected, and nothing more about it.
- When the comparison is null, say once, resting on Controls, that there is no comparison period for this grain and the notes describe the period on its own.
- When the period holds no acts, say so once, resting on Mobilization, and say nothing that the figures do not support.
- Return at most five statements. Return fewer rather than pad.`;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ statements: [] }, 405);
  const started = Date.now();
  const auth = req.headers.get("authorization") ?? "";
  if (!/^Bearer\s+\S+/i.test(auth)) return json({ statements: [] }, 401);

  let grain = "week",
    compare = "previous",
    tz = "UTC";
  try {
    const body = (await req.json().catch(() => ({}))) as {
      grain?: unknown;
      compare?: unknown;
      tz?: unknown;
    };
    if (typeof body.grain === "string" && GRAINS.has(body.grain)) grain = body.grain;
    else return json({ statements: [] }, 400);
    if (typeof body.compare === "string" && COMPARES.has(body.compare)) compare = body.compare;
    else return json({ statements: [] }, 400);
    if (typeof body.tz === "string" && body.tz.length <= 64) tz = body.tz;
    else return json({ statements: [] }, 400);
  } catch {
    return json({ statements: [] }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return json({ statements: [] }, 500);

  // The caller's own JWT: the projections' gate and read log are theirs (1311, 1178).
  const sb = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const period = { p_grain: grain, p_compare: compare, p_tz: tz };

  const cached = await sb.rpc("admin_dia_note_read", period);
  if (cached.error) {
    console.log(
      JSON.stringify({
        event: "admin_dia_note_refused",
        latency_ms: Date.now() - started,
        code: cached.error.code ?? null,
      }),
    );
    return json({ statements: [] }, cached.error.code === "42501" ? 403 : 200);
  }
  const hit = cached.data as { statements?: unknown } | null;
  if (hit && Array.isArray(hit.statements)) {
    const statements = (hit.statements as Statement[]).filter(valid);
    console.log(
      JSON.stringify({
        event: "admin_dia_note_cached",
        statements: statements.length,
        latency_ms: Date.now() - started,
      }),
    );
    return json({ statements });
  }

  const [win, mob, lev, net, co] = await Promise.all([
    sb.rpc("admin_overview_window", period),
    sb.rpc("admin_overview_mobilization", period),
    sb.rpc("admin_overview_levers", period),
    sb.rpc("admin_overview_network", { p_tz: tz }),
    sb.rpc("admin_overview_company"),
  ]);
  const failed = [win, mob, lev, net, co].filter((r) => r.error).length;
  if (failed) {
    console.log(
      JSON.stringify({
        event: "admin_dia_note_no_aggregates",
        failed,
        latency_ms: Date.now() - started,
      }),
    );
    return json({ statements: [] });
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.log(JSON.stringify({ event: "admin_dia_note_no_key" }));
    return json({ statements: [] });
  }

  // Aggregates only (1273). The projections return no member in any key or value (1281); the
  // series are left out as noise DIA does not need, and the window's words stay the page's.
  const aggregates = {
    window: win.data,
    mobilization: strip(mob.data),
    levers: strip(lev.data),
    network: net.data,
    company: co.data,
  };

  const client = new Anthropic({ apiKey, maxRetries: 0 });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), THINK_BUDGET_MS);
  try {
    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 700,
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        thinking: { type: "disabled" },
        output_config: { effort: "low", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
        messages: [{ role: "user", content: "Aggregates:\n" + JSON.stringify(aggregates) }],
      } as unknown as Anthropic.MessageCreateParamsNonStreaming,
      { signal: controller.signal, timeout: THINK_BUDGET_MS },
    );
    clearTimeout(timer);
    if (response.stop_reason === "refusal") {
      console.log(
        JSON.stringify({ event: "admin_dia_note_refusal", latency_ms: Date.now() - started }),
      );
      return json({ statements: [] });
    }
    const block = response.content.find((b) => b.type === "text");
    let parsed: { statements?: unknown } | null = null;
    try {
      parsed = block && block.type === "text" ? JSON.parse(block.text) : null;
    } catch {
      parsed = null;
    }
    const raw = Array.isArray(parsed?.statements) ? (parsed!.statements as unknown[]) : [];
    const statements = raw.filter(valid).slice(0, MAX_STATEMENTS);
    const dropped = raw.length - statements.length;

    if (statements.length) {
      const wrote = await sb.rpc("admin_dia_note_write", { ...period, p_statements: statements });
      if (wrote.error)
        console.log(
          JSON.stringify({
            event: "admin_dia_note_cache_write_failed",
            code: wrote.error.code ?? null,
          }),
        );
    }
    console.log(
      JSON.stringify({
        event: "admin_dia_note",
        returned: raw.length,
        dropped,
        statements: statements.length,
        latency_ms: Date.now() - started,
      }),
    );
    return json({ statements });
  } catch (err) {
    clearTimeout(timer);
    console.log(
      JSON.stringify({
        event: controller.signal.aborted ? "admin_dia_note_timeout" : "admin_dia_note_error",
        latency_ms: Date.now() - started,
        status: (err as { status?: number })?.status ?? null,
      }),
    );
    return json({ statements: [] });
  }
});

/** A statement is kept when it names one of the blocks and carries no number (1301). Never rewritten. */
function valid(s: unknown): s is Statement {
  if (!s || typeof s !== "object") return false;
  const { text, block } = s as { text?: unknown; block?: unknown };
  if (typeof text !== "string" || typeof block !== "string") return false;
  const t = text.trim();
  if (t.length < 12 || t.length > MAX_STATEMENT_CHARS) return false;
  if (!BLOCKS.includes(block)) return false;
  if (/[%!]/.test(t)) return false;
  return !hasNumber(t);
}

/** The projection without its per-bucket series: the figures DIA reasons over are the period's. */
function strip(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
        if (k === "series" || k === "points") continue;
        out[k] = walk(x);
      }
      return out;
    }
    return v;
  };
  return walk(data);
}
