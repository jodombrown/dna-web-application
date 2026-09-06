// Client side of the three Edge Functions. Every call carries the member's JWT; the functions
// verify it. Inference never includes images or identity beyond the token the function hashes.
import type { Inference, UnfurlMeta, UploadedImage } from "@/components/strand/Composer";
import type { C } from "@/components/strand/cmeta";
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
  fields: Partial<Record<FieldKey, string | boolean>>;
  latency_ms: number;
} | null;

/** dia-compose-read. Resolves an Inference or null; timeouts and errors are null (silence, ruling 54). */
export function makeInfer(
  anchorName?: string | undefined,
): (text: string) => Promise<Inference | null> {
  return async (text) => {
    const headers = await authHeaders();
    if (!headers) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    try {
      const res = await fetch(functionsUrl("dia-compose-read"), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ text, anchor: anchorName ? { name: anchorName } : undefined }),
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as Wire;
      if (!data || !data.verb) return null;
      return {
        c: data.verb,
        fields: data.fields ?? {},
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
