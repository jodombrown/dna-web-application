// link-unfurl: fetch a public page's title, description and image for the composer's link card.
// Input { url }  Output { url, title, description, image_url } | null
// SSRF guard: http(s) only, hostname resolved and checked against private ranges, redirects followed
// manually (max 3) with the same check on every hop, 3 s total budget, 512 KB read cap, HTML only.
// This function never writes; publish_post writes post_links from the payload on publish.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const BUDGET_MS = 3000;
const MAX_BYTES = 512 * 1024;
const MAX_HOPS = 3;

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

function ipv4Private(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = p as [number, number, number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function ipv6Private(ip: string): boolean {
  const s = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (s === "::" || s === "::1") return true;
  if (s.startsWith("fe8") || s.startsWith("fe9") || s.startsWith("fea") || s.startsWith("feb"))
    return true; // link-local
  if (s.startsWith("fc") || s.startsWith("fd")) return true; // unique local
  if (s.startsWith("ff")) return true; // multicast
  const m = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (m) return ipv4Private(m[1]!);
  return false;
}

function isIpLiteral(host: string): boolean {
  return /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":");
}

async function hostIsPublic(host: string): Promise<boolean> {
  const h = host.toLowerCase().replace(/\.$/, "");
  if (
    !h ||
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal")
  )
    return false;
  if (isIpLiteral(h)) return h.includes(":") ? !ipv6Private(h) : !ipv4Private(h);
  let addrs: string[] = [];
  try {
    const a = await Deno.resolveDns(h, "A").catch(() => [] as string[]);
    const aaaa = await Deno.resolveDns(h, "AAAA").catch(() => [] as string[]);
    addrs = [...a, ...aaaa];
  } catch {
    return false;
  }
  if (addrs.length === 0) return false;
  return addrs.every((ip) => (ip.includes(":") ? !ipv6Private(ip) : !ipv4Private(ip)));
}

function normalize(input: string): URL | null {
  const raw = input.trim();
  if (!raw || raw.length > 2048) return null;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  if (u.port && !["", "80", "443"].includes(u.port)) return null;
  u.hash = "";
  return u;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

function meta(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key.replace(/:/g, "\\:")}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key.replace(/:/g, "\\:")}["']`,
      "i",
    );
    const m = html.match(re);
    const v = m && (m[1] ?? m[2]);
    if (v && v.trim()) return decode(v);
  }
  return null;
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  try {
    await reader.cancel();
  } catch {
    /* closed */
  }
  const all = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    all.set(c, o);
    o += c.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(all);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(null, 405);

  let url: URL | null = null;
  try {
    const body = await req.json();
    url = normalize(typeof body?.url === "string" ? body.url : "");
  } catch {
    return json(null);
  }
  if (!url) return json(null);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BUDGET_MS);
  try {
    let current = url;
    let res: Response | null = null;
    for (let hop = 0; hop <= MAX_HOPS; hop++) {
      if (!(await hostIsPublic(current.hostname))) return json(null);
      const r = await fetch(current.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; DNA-LinkUnfurl/1.0; +https://app.diasporanetwork.africa)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      if (r.status >= 300 && r.status < 400) {
        const loc = r.headers.get("location");
        try {
          await r.body?.cancel();
        } catch {
          /* ignore */
        }
        if (!loc || hop === MAX_HOPS) return json(null);
        const next = normalize(new URL(loc, current).toString());
        if (!next) return json(null);
        current = next;
        continue;
      }
      res = r;
      break;
    }
    if (!res || !res.ok) return json(null);
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
      try {
        await res.body?.cancel();
      } catch {
        /* ignore */
      }
      return json(null);
    }
    const html = await readCapped(res);
    const head = html.slice(0, MAX_BYTES);
    const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title =
      meta(head, ["og:title", "twitter:title"]) ?? (titleTag ? decode(titleTag[1]!) : null);
    const description = meta(head, ["og:description", "twitter:description", "description"]);
    let image_url: string | null = meta(head, ["og:image", "og:image:url", "twitter:image"]);
    if (image_url) {
      try {
        const abs = new URL(image_url, current);
        image_url = abs.protocol === "https:" || abs.protocol === "http:" ? abs.toString() : null;
      } catch {
        image_url = null;
      }
    }
    if (!title && !description) return json(null);
    return json({
      url: current.toString(),
      title: title ? title.slice(0, 200) : null,
      description: description ? description.slice(0, 400) : null,
      image_url,
    });
  } catch {
    return json(null);
  } finally {
    clearTimeout(timer);
  }
});
