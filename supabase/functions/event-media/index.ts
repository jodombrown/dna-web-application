// event-media: the one image path of the public event page (ruling 1029, on 662 and 1028).
//
// GET ?e={slug}&m={position}  the cover or another of the event post's images, by position
// GET ?e={slug}&p={party_id}  an accepted speaker's photo, by their event_parties row
//
// The public page and every link-preview crawler that reads it call this signed out, so it is deployed
// with JWT verification off. What it may serve is decided in the database and nowhere here:
// public.event_media_object(p_slug, p_kind, p_key) names the one storage object a public page may show,
// the post's image at a position or an accepted party's photo, and answers nothing for any other event,
// any unpublished or cancelled event, any post that is not to everyone, and any party who has not
// accepted. Only the service role may call it, so this function's own environment is the caller. No row
// is a 404 with an empty body: the answer never says why, because "this slug exists but is not public"
// is itself a fact a signed-out reader is not owed.
//
// One row is downloaded from its bucket and streamed back with its own content type. The function never
// lists a bucket, never redirects to a signed URL and never returns a storage path: the URL a page
// carries names a slug and a position or a party, and nothing about where the bytes live.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const POSITION = /^[0-3]$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CACHE_CONTROL = "public, max-age=86400";

const notFound = () =>
  new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") {
    return new Response(null, { status: 405, headers: { Allow: "GET" } });
  }

  const params = new URL(req.url).searchParams;
  const slug = params.get("e") ?? "";
  const position = params.get("m");
  const party = params.get("p");

  // Exactly one of m or p, and every value in the shape the lookup expects, or nothing.
  if (!SLUG.test(slug) || slug.length > 67) return notFound();
  if ((position === null) === (party === null)) return notFound();
  let kind: "media" | "photo";
  let key: string;
  if (position !== null) {
    if (!POSITION.test(position)) return notFound();
    kind = "media";
    key = position;
  } else {
    if (!UUID.test(party ?? "")) return notFound();
    kind = "photo";
    key = (party ?? "").toLowerCase();
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.log(JSON.stringify({ event: "event_media_misconfigured" }));
    return new Response(null, { status: 500 });
  }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await admin.rpc("event_media_object", {
    p_slug: slug,
    p_kind: kind,
    p_key: key,
  });
  if (error) {
    console.log(JSON.stringify({ event: "event_media_lookup_failed", message: error.message }));
    return new Response(null, { status: 502 });
  }
  const row = Array.isArray(data) ? data[0] : null;
  const bucket = typeof row?.bucket === "string" ? row.bucket : "";
  const path = typeof row?.path === "string" ? row.path : "";
  if (!bucket || !path) return notFound();

  const file = await admin.storage.from(bucket).download(path);
  if (file.error || !file.data) {
    console.log(
      JSON.stringify({ event: "event_media_download_failed", message: file.error?.message ?? "" }),
    );
    return notFound();
  }

  const blob = file.data;
  const type =
    blob.type && blob.type !== "application/octet-stream" ? blob.type : contentType(path);
  return new Response(blob.stream(), {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Length": String(blob.size),
      "Cache-Control": CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
    },
  });
});

// The master's own type, from the extension media-upload wrote it under, when storage reports none.
function contentType(path: string): string {
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
