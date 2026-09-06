// Server-side drafts (ruling 56): one row per member per host context, restored on open, cleared on
// publish by publish_post. No localStorage in production.
import type { ComposerImage, ComposerSeed, ComposerState } from "@/components/strand/Composer";
import type { Json } from "./database.types";
import { signedMediaUrl } from "./dia";
import { getSupabase } from "./supabase";

export type DraftPayload = Omit<ComposerState, "images"> & {
  post_id: string;
  images: { storage_path: string; width: number; height: number }[];
};

export async function loadDraft(
  memberId: string,
  hostContext: string,
): Promise<{ seed: ComposerSeed; postId: string } | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("post_drafts")
    .select("payload")
    .eq("member_id", memberId)
    .eq("host_context", hostContext)
    .maybeSingle();
  if (!data || !data.payload || typeof data.payload !== "object") return null;
  const p = data.payload as unknown as Partial<DraftPayload>;
  const images: ComposerImage[] = [];
  for (const m of p.images ?? []) {
    if (!m || !m.storage_path) continue;
    const url = await signedMediaUrl(m.storage_path);
    if (url)
      images.push({ preview: url, storage_path: m.storage_path, width: m.width, height: m.height });
  }
  const seed: ComposerSeed = {
    text: p.text ?? "",
    verb: p.verb ?? null,
    overridden: !!p.overridden,
    fields: p.fields ?? {},
    images,
    link: p.link ?? null,
    audience: p.audience ?? "everyone",
    asSpace: p.asSpace ?? "",
    dia: p.dia ?? { state: null },
    diaRecord: p.diaRecord ?? null,
  };
  return { seed, postId: p.post_id ?? crypto.randomUUID() };
}

export async function saveDraft(
  memberId: string,
  hostContext: string,
  postId: string,
  state: ComposerState | null,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  if (!state) {
    await sb.from("post_drafts").delete().eq("member_id", memberId).eq("host_context", hostContext);
    return;
  }
  const payload: DraftPayload = {
    ...state,
    post_id: postId,
    images: state.images
      .filter((i) => i.storage_path && i.width && i.height)
      .map((i) => ({
        storage_path: i.storage_path as string,
        width: i.width as number,
        height: i.height as number,
      })),
  };
  await sb.from("post_drafts").upsert(
    {
      member_id: memberId,
      host_context: hostContext,
      payload: payload as unknown as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "member_id,host_context" },
  );
}
