// The one composer shell, mounted once in the app root (ruling 56). Opened from any surface via
// openComposer(). Wires the Strand Composer to auth, tiers, DIA, unfurl, media upload, server
// drafts and publish_post. Never navigates on publish (ruling 52).
import { useEffect, useMemo, useState } from "react";
import { Composer, type ComposerSeed, type ComposerState } from "@/components/strand/Composer";
import { useAuth } from "@/lib/auth";
import { closeComposer, hostContextOf, useComposerState } from "@/lib/composer-store";
import { makeInfer, makeUpload, unfurl } from "@/lib/dia";
import { loadDraft, saveDraft } from "@/lib/drafts";
import { loadMemberSpaces } from "@/lib/feed";
import { publishPost } from "@/lib/publish";
import { useMode, useTier } from "@/lib/tier";

export const PUBLISHED_EVENT = "dna:published";

export function ComposerShell() {
  const { member } = useAuth();
  const { open, request, seed } = useComposerState();
  const tier = useTier();
  const mode = useMode();
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<ComposerSeed | null>(null);
  const [postId, setPostId] = useState<string>("");
  const [spaces, setSpaces] = useState<{ id: string; name: string }[]>([]);

  const hostContext = request ? hostContextOf(request) : "feed";

  useEffect(() => {
    if (!open || !member || !request) {
      setReady(false);
      return;
    }
    let active = true;
    setReady(false);
    void (async () => {
      const [restored, memberSpaces] = await Promise.all([
        request.initialVerb ? Promise.resolve(null) : loadDraft(member.id, hostContext),
        loadMemberSpaces(member.id),
      ]);
      if (!active) return;
      setDraft(restored?.seed ?? null);
      setPostId(restored?.postId ?? crypto.randomUUID());
      setSpaces(memberSpaces);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [open, seed, member, request, hostContext]);

  const infer = useMemo(() => makeInfer(request?.anchor?.name), [request?.anchor?.name]);
  const upload = useMemo(() => (postId ? makeUpload(postId) : undefined), [postId]);

  if (!open || !member || !request || !ready) return null;

  const onDraft = (state: ComposerState | null) => {
    void saveDraft(member.id, hostContext, postId, state);
  };

  const onPublish = async (state: ComposerState) => {
    const id = await publishPost(state, {
      postId,
      memberId: member.id,
      hostContext,
      anchor: request.anchor,
    });
    closeComposer();
    window.dispatchEvent(new CustomEvent(PUBLISHED_EVENT, { detail: { id } }));
  };

  return (
    <Composer
      key={seed}
      open
      onClose={closeComposer}
      onPublish={onPublish}
      tier={tier === "expanded" ? "expanded" : "compact"}
      mode={mode}
      author={{ name: member.name, avatar: member.avatar }}
      spaces={spaces}
      anchor={request.anchor}
      infer={infer}
      unfurl={unfurl}
      upload={upload}
      initialVerb={request.initialVerb ?? null}
      draft={draft}
      onDraft={onDraft}
      maxImages={4}
    />
  );
}
