// The one composer shell, mounted once by the shell layout (ruling 56; moved from the root in
// Brief 2 so the shell owns the mount). Opened from any surface via openComposer(). Wires the Strand Composer to auth, tiers, DIA, unfurl, media upload, server
// drafts and publish_post. Never navigates on publish (ruling 52).
import { useEffect, useMemo, useState } from "react";
import { Composer, type ComposerSeed, type ComposerState } from "@/components/strand/Composer";
import { SHEET_DUR } from "@/components/strand/Sheet";
import { useAuth } from "@/lib/auth";
import { closeComposer, hostContextOf, useComposerState } from "@/lib/composer-store";
import { makeInfer, makeUpload, unfurl } from "@/lib/dia";
import { loadDraft, saveDraft } from "@/lib/drafts";
import { loadMemberSpaces } from "@/lib/feed";
import { publishPost } from "@/lib/publish";
import { useMode, useTier } from "@/lib/tier";
import { loadVocabularies } from "@/lib/vocabularies";

export const PUBLISHED_EVENT = "dna:published";

export function ComposerShell() {
  const { member } = useAuth();
  const { open, request, seed } = useComposerState();
  const tier = useTier();
  const mode = useMode();
  // The seed whose draft and Spaces have loaded. The Composer mounts only for that seed, so a new
  // open never renders an empty instance before its draft arrives (an empty instance would flush a
  // null draft on unmount and delete the member's saved draft).
  const [loadedSeed, setLoadedSeed] = useState(-1);
  const [draft, setDraft] = useState<ComposerSeed | null>(null);
  const [postId, setPostId] = useState<string>("");
  const [spaces, setSpaces] = useState<{ id: string; name: string }[]>([]);
  // Ruling 193: Contribute's instrument options are the contribute_instrument vocabulary, read at
  // runtime through the one vocabulary path. Ruling 194: a read that fails leaves this empty and the
  // control renders no options; nothing here substitutes a default.
  const [instrument, setInstrument] = useState<string[]>([]);

  const hostContext = request ? hostContextOf(request) : "feed";

  // The sheet slides out over 300ms (ruling 107): keep the composer mounted with open=false until
  // the exit transition has finished, then unmount.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (open) {
      setVisible(true);
      return;
    }
    const t = window.setTimeout(() => setVisible(false), SHEET_DUR + 40);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || !member || !request) return;
    let active = true;
    void (async () => {
      const [restored, memberSpaces, vocab] = await Promise.all([
        request.initialVerb || request.initial
          ? Promise.resolve(null)
          : loadDraft(member.id, hostContext),
        loadMemberSpaces(member.id),
        loadVocabularies().catch(() => null),
      ]);
      if (!active) return;
      setDraft(restored?.seed ?? null);
      setPostId(restored?.postId ?? crypto.randomUUID());
      setSpaces(memberSpaces);
      setInstrument((vocab?.instrument ?? []).map((i) => i.label));
      setLoadedSeed(seed);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seed, member, request, hostContext]);

  const infer = useMemo(() => makeInfer(request?.anchor?.name), [request?.anchor?.name]);
  const upload = useMemo(() => (postId ? makeUpload(postId) : undefined), [postId]);

  if (!(open || visible) || !member || !request || loadedSeed !== seed) return null;

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
    // Ruling 287: the consumed id does not survive in memory. `postId` is state on a shell mounted
    // once for the session; openComposer's load effect mints a fresh uuid only when the draft load
    // returns null, so a successful publish clears it here instead of relying on that path. `upload`
    // is memoised off `postId` and yields undefined on an empty string.
    setPostId("");
    closeComposer();
    window.dispatchEvent(new CustomEvent(PUBLISHED_EVENT, { detail: { id } }));
  };

  return (
    <Composer
      key={seed}
      open={open}
      onClose={closeComposer}
      onPublish={onPublish}
      tier={tier}
      mode={mode}
      author={{ name: member.name, avatar: member.avatar }}
      spaces={spaces}
      anchor={request.anchor}
      infer={infer}
      unfurl={unfurl}
      upload={upload}
      initialVerb={request.initialVerb ?? null}
      initial={request.initial ?? null}
      draft={draft}
      onDraft={onDraft}
      fieldOptions={{ instrument }}
      maxImages={4}
    />
  );
}
