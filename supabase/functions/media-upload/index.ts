// media-upload: accept one image from a signed-in member, run it through Tinify (compress and fit
// within 2000 px), store the result in post-media under {member_id}/{post_id}/{uuid}.{ext}, and
// return { storage_path, width, height }. The original bytes are never stored (ruling 55).
// multipart/form-data: file (image/jpeg | image/png | image/webp), post_id (uuid minted by the composer).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "post-media";
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_EDGE = 2000;
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function sniff(bytes: Uint8Array): string | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "image/png";
  if (
    bytes.length > 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "image/webp";
  return null;
}

async function tinify(
  bytes: Uint8Array,
  apiKey: string,
): Promise<{ data: Uint8Array; width: number; height: number; type: string } | null> {
  const auth = "Basic " + btoa("api:" + apiKey);
  const shrink = await fetch("https://api.tinify.com/shrink", {
    method: "POST",
    headers: { Authorization: auth },
    body: bytes,
  });
  if (shrink.status !== 201) {
    console.log(JSON.stringify({ event: "tinify_shrink_failed", status: shrink.status }));
    return null;
  }
  const info = (await shrink.json()) as {
    output?: { url?: string; width?: number; height?: number; type?: string };
  };
  const outUrl = shrink.headers.get("location") ?? info.output?.url;
  if (!outUrl) return null;
  // Fit within MAX_EDGE (scale down only). Tinify returns the final image bytes with its dimensions in headers.
  const fitted = await fetch(outUrl, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ resize: { method: "fit", width: MAX_EDGE, height: MAX_EDGE } }),
  });
  if (!fitted.ok) {
    console.log(JSON.stringify({ event: "tinify_resize_failed", status: fitted.status }));
    return null;
  }
  const data = new Uint8Array(await fitted.arrayBuffer());
  const width = Number(fitted.headers.get("image-width") ?? info.output?.width ?? 0);
  const height = Number(fitted.headers.get("image-height") ?? info.output?.height ?? 0);
  const type = fitted.headers.get("content-type") ?? info.output?.type ?? "image/jpeg";
  if (!width || !height) return null;
  return { data, width, height, type };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  // GET: operator health check behind the JWT. Reports whether the processor key resolves; never its value.
  if (req.method === "GET") return json({ ok: true, processor: !!Deno.env.get("TINIFY_API_KEY") });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const tinifyKey = Deno.env.get("TINIFY_API_KEY");
  const authHeader = req.headers.get("authorization") ?? "";

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);
  const uid = userData.user.id;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "bad_form" }, 400);
  }
  const file = form.get("file");
  const postId = String(form.get("post_id") ?? "");
  if (!(file instanceof File)) return json({ error: "no_file" }, 400);
  if (!UUID.test(postId)) return json({ error: "bad_post_id" }, 400);
  if (file.size > MAX_INPUT_BYTES) return json({ error: "too_large" }, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type || !ALLOWED[type]) return json({ error: "not_an_image" }, 415);

  if (!tinifyKey) return json({ error: "no_processor" }, 500);
  const processed = await tinify(bytes, tinifyKey);
  if (!processed) return json({ error: "processing_failed" }, 502);

  const ext = ALLOWED[processed.type] ?? ALLOWED[type]!;
  const storagePath = `${uid}/${postId}/${crypto.randomUUID()}.${ext}`;
  const admin = createClient(supabaseUrl, serviceKey);
  const { error: upErr } = await admin.storage.from(BUCKET).upload(storagePath, processed.data, {
    contentType: processed.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (upErr) {
    console.log(JSON.stringify({ event: "upload_failed", message: upErr.message }));
    return json({ error: "store_failed" }, 502);
  }
  console.log(
    JSON.stringify({
      event: "media_uploaded",
      bytes_in: bytes.byteLength,
      bytes_out: processed.data.byteLength,
    }),
  );
  return json({ storage_path: storagePath, width: processed.width, height: processed.height });
});
