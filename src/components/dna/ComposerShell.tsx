// The one composer shell, mounted once by the shell layout (ruling 56; moved from the root in
// Brief 2 so the shell owns the mount). Opened from any surface via openComposer(). Wires the Strand Composer to auth, tiers, DIA, unfurl, media upload, server
// drafts and publish_post. The Composer never navigates (ruling 52); under rulings 665 and 666 it
// closes itself through onClose('published') once the promise resolves, and this host reacts in
// that handler by raising PUBLISHED_EVENT, which the shell layout answers with the Feed and a toast.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Composer,
  type ComposerCloseReason,
  type ComposerFormProps,
  type ComposerSeed,
  type ComposerState,
} from "@/components/strand/Composer";
import { ConveneForm } from "@/components/dna/ConveneForm";
import { SHEET_DUR } from "@/components/strand/Sheet";
import { useAuth } from "@/lib/auth";
import { closeComposer, hostContextOf, useComposerState } from "@/lib/composer-store";
import { makeInfer, makeUpload, unfurl } from "@/lib/dia";
import { loadDraft, saveDraft } from "@/lib/drafts";
import { loadMemberSpaces } from "@/lib/feed";
import { loadMemberHomes, type Home } from "@/lib/homes";
import { browserZone } from "@/lib/when";
import { publishPost } from "@/lib/publish";
import { useMode, useTier } from "@/lib/tier";
import { loadVocabularies } from "@/lib/vocabularies";

export const PUBLISHED_EVENT = "dna:published";

// Convene Pass 1 (correction 7, ruling 53): inside an event the Convene chip stays in the row,
// disabled, with this reason. The wording is the packet's (P1-EXTRACTION, confirmed content).
export const IN_EVENT_REASON =
  "You are inside an event. Host a new one from the Feed or from Convene.";
// Ruling 665: the caller's failure message when the RPC gives nothing a member can act on.
export const PUBLISH_FAILED = "Publishing did not go through. Your draft is here. Try again.";

/**
 * What the error slot shows (665). publish_post refuses in two registers: a plain sentence meant
 * for the member (`An introduction needs a message.`), which is surfaced as written, and a named
 * internal refusal (`publish_post: …`, `send_introduction: …`) or a transport error, which is not a
 * sentence for a member and becomes the one failure line. Nothing else is surfaced.
 */
export function publishFailureMessage(err: unknown): string {
  const raw =
    err && typeof err === "object" && "message" in err && typeof err.message === "string"
      ? err.message.trim()
      : "";
  if (!raw || /^[a-z_]+:/.test(raw) || raw.length > 200) return PUBLISH_FAILED;
  return raw;
}

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
  // Convene Pass 1 (633, 690): the member's homes for the form's place chips; empty means none.
  const [homes, setHomes] = useState<Home[]>([]);
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
      const [restored, memberSpaces, vocab, memberHomes] = await Promise.all([
        request.initialVerb || request.initial
          ? Promise.resolve(null)
          : loadDraft(member.id, hostContext),
        loadMemberSpaces(member.id),
        loadVocabularies().catch(() => null),
        loadMemberHomes(member.id).catch(() => [] as Home[]),
      ]);
      if (!active) return;
      setDraft(restored?.seed ?? null);
      setPostId(restored?.postId ?? crypto.randomUUID());
      setSpaces(memberSpaces);
      setHomes(memberHomes);
      setInstrument((vocab?.instrument ?? []).map((i) => i.label));
      setLoadedSeed(seed);
    })();
    return () => {
      active = false;
    };
  }, [open, seed, member, request, hostContext]);

  const infer = useMemo(() => makeInfer(request?.anchor?.name), [request?.anchor?.name]);
  const upload = useMemo(() => (postId ? makeUpload(postId) : undefined), [postId]);
  // The id publish_post returned, held until the Composer closes itself with 'published' (666).
  const publishedId = useRef<string | null>(null);
  // Correction 7 (ruling 53): inside an event, the Convene chip is disabled with its reason.
  const disabledVerbs = useMemo(
    () => (request?.anchor?.kind === "event" ? { convene: IN_EVENT_REASON } : undefined),
    [request?.anchor?.kind],
  );
  // Ruling 664: Convene supplies its form; the host binds the member's name, homes, Spaces and
  // browser zone to it. Memoised on those so the form's own state survives every other re-render.
  const authorName = member?.name ?? "";
  const forms = useMemo(
    () => ({
      convene: (p: ComposerFormProps) => (
        <ConveneForm
          {...p}
          author={{ name: authorName }}
          homes={homes}
          spaces={spaces}
          browserTz={browserZone()}
        />
      ),
    }),
    [authorName, homes, spaces],
  );
  const lastVerb = useRef<ComposerState["verb"]>(null);

  if (!(open || visible) || !member || !request || loadedSeed !== seed) return null;

  const onDraft = (state: ComposerState | null) => {
    void saveDraft(member.id, hostContext, postId, state);
  };

  // Ruling 665: a promise. Rejection carries the message the Composer lands in Sheet's error slot,
  // with the draft intact; the Composer owns closing on resolution (666).
  const onPublish = async (state: ComposerState) => {
    let id: string;
    try {
      id = await publishPost(state, {
        postId,
        memberId: member.id,
        hostContext,
        anchor: request.anchor,
      });
    } catch (err) {
      throw new Error(publishFailureMessage(err));
    }
    // Ruling 287: the consumed id does not survive in memory. `postId` is state on a shell mounted
    // once for the session; openComposer's load effect mints a fresh uuid only when the draft load
    // returns null, so a successful publish clears it here instead of relying on that path. `upload`
    // is memoised off `postId` and yields undefined on an empty string.
    setPostId("");
    publishedId.current = id;
    lastVerb.current = state.verb;
  };

  // Ruling 666: the Composer closes itself on resolve; the host reacts here. The shell layout
  // answers PUBLISHED_EVENT with the Feed, the fresh read and one toast (ruling 52: the Composer
  // itself never navigates).
  const onClose = (reason?: ComposerCloseReason) => {
    closeComposer();
    if (reason === "published") {
      const id = publishedId.current;
      publishedId.current = null;
      window.dispatchEvent(
        new CustomEvent(PUBLISHED_EVENT, { detail: { id, verb: lastVerb.current } }),
      );
    }
  };

  return (
    <Composer
      key={seed}
      open={open}
      onClose={onClose}
      onPublish={onPublish}
      forms={forms}
      disabledVerbs={disabledVerbs}
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
      // Ruling 492: at a 50 percent side sheet two columns do not fit, so the preview stacks under
      // the fields at every tier. B1's two-column drawer is retired (B13 item 5).
      columns={1}
      maxImages={4}
    />
  );
}
