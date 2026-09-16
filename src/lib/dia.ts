// Client side of the four Edge Functions. Every call carries the member's JWT; the functions
// verify it. Inference never includes images or identity beyond the token the function hashes.
import {
  THINK_BUDGET,
  type Inference,
  type UnfurlMeta,
  type UploadedImage,
} from "@/components/strand/Composer";
import type { C, ComposerVerb } from "@/components/strand/cmeta";
import type { FieldKey } from "@/components/strand/verb-schema";
import { functionsUrl, getSupabase, SUPABASE_PUBLISHABLE_KEY } from "./supabase";

async function authHeaders(): Promise<Record<string, string> | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { Authorization: "Bearer " + token, apikey: SUPABASE_PUBLISHABLE_KEY };
}

type Wire = {
  verb: C;
  confidence: number;
  fields: Record<string, string | boolean>;
  latency_ms: number;
} | null;

// Convene Pass 1 (SPEC section 1, ruling 664): the host namespaces DIA's fills for the supplied
// form as `convene.{key}` before they reach the Composer, and only these four keys pass. DIA may
// fill the title, when as the member's own words, the venue name and the doors time; never the
// city (Digital Trust Layer) and never the format. Anything else DIA returns for convene is dropped.
const CONVENE_FILLS: Record<string, FieldKey> = {
  title: "convene.title",
  when: "convene.when",
  place_name: "convene.place_query",
  doors: "convene.doors",
};

function namespaceFills(
  verb: ComposerVerb,
  fields: Record<string, string | boolean>,
): Partial<Record<FieldKey, string | boolean>> {
  if (verb !== "convene") return fields as Partial<Record<FieldKey, string | boolean>>;
  const out: Partial<Record<FieldKey, string | boolean>> = {};
  for (const [k, v] of Object.entries(fields)) {
    const to = CONVENE_FILLS[k];
    if (to && typeof v === "string" && v.trim()) out[to] = v.trim();
  }
  return out;
}

/** dia-compose-read. Resolves an Inference or null; timeouts and errors are null (silence, ruling 54; budget amended to 3.5 s by ruling 74, D176). */
export function makeInfer(
  anchorName?: string | undefined,
): (text: string) => Promise<Inference | null> {
  return async (text) => {
    const headers = await authHeaders();
    if (!headers) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), THINK_BUDGET);
    try {
      const res = await fetch(functionsUrl("dia-compose-read"), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ text, anchor: anchorName ? { name: anchorName } : undefined }),
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as Wire;
      // Ruling 400: the composer carries no Connect verb, so a connect reading is silence.
      if (!data || !data.verb || data.verb === "connect") return null;
      return {
        c: data.verb as ComposerVerb,
        fields: namespaceFills(data.verb as ComposerVerb, data.fields ?? {}),
        confidence: data.confidence,
        latency_ms: data.latency_ms,
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
}

/** link-unfurl. Null on any failure; the composer shows the domain only. */
export async function unfurl(url: string): Promise<UnfurlMeta | null> {
  const headers = await authHeaders();
  if (!headers) return null;
  try {
    const res = await fetch(functionsUrl("link-unfurl"), {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      url: string;
      title: string | null;
      description: string | null;
      image_url: string | null;
    } | null;
    if (!data) return null;
    return { title: data.title, description: data.description, image: data.image_url };
  } catch {
    return null;
  }
}

// Convene Pass 1 (PR 2, SPEC section 3 "Place, resolved never typed"): the one client for the
// place-resolve Edge Function. The token never reaches the browser; the function holds it.
export type ResolvedPlace = {
  place_id: string;
  place_name: string;
  area: string | null;
  city: string | null;
  country: string | null;
  lng: number;
  lat: number;
  timezone: string;
  label: string;
};
export type SuggestedPlace = Omit<ResolvedPlace, "lng" | "lat" | "timezone">;
export type PlaceState =
  | { state: "one"; place: ResolvedPlace }
  | { state: "several"; places: SuggestedPlace[] }
  | { state: "none" };

/** place-resolve. Any failure is `none`: the member's words stand in place_text (publishable). */
export async function resolvePlace(body: {
  action: "suggest" | "retrieve";
  q: string;
  session_token: string;
  proximity?: { lng: number; lat: number } | null;
  mapbox_id?: string;
}): Promise<PlaceState> {
  const headers = await authHeaders();
  if (!headers) return { state: "none" };
  try {
    const res = await fetch(functionsUrl("place-resolve"), {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { state: "none" };
    const data = (await res.json()) as PlaceState | null;
    if (!data || typeof data !== "object" || typeof data.state !== "string")
      return { state: "none" };
    if (data.state === "one" && data.place && data.place.place_id) return data;
    if (data.state === "several" && Array.isArray(data.places) && data.places.length) return data;
    return { state: "none" };
  } catch {
    return { state: "none" };
  }
}

/** media-upload. The composer mints the post id first so the path is {member}/{post}/{file}. */
export function makeUpload(postId: string): (file: File) => Promise<UploadedImage | null> {
  return async (file) => {
    const headers = await authHeaders();
    if (!headers) return null;
    const form = new FormData();
    form.append("file", file);
    form.append("post_id", postId);
    try {
      const res = await fetch(functionsUrl("media-upload"), {
        method: "POST",
        headers,
        body: form,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { storage_path?: string; width?: number; height?: number };
      if (!data.storage_path || !data.width || !data.height) return null;
      return { storage_path: data.storage_path, width: data.width, height: data.height };
    } catch {
      return null;
    }
  };
}

/** Signed URL for an image in post-media (private bucket; storage RLS decides). */
export async function signedMediaUrl(storagePath: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.storage.from("post-media").createSignedUrl(storagePath, 60 * 60);
  return data?.signedUrl ?? null;
}
