// Ported from Strand components/dna/Composer.jsx (extraction 3654dd17). Member-facing behavior is
// unchanged. Production hooks replace the prototype's localStorage draft and data-URL images:
// `draft` + `onDraft` (server-side drafts per member and host context, ruling 56), `upload` (media
// goes through the media-upload Edge Function and Tinify, ruling 55), and the preview renders
// through the shared card router (brief: one PostCard renderer).
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import { PostCardRouter } from "@/components/dna/PostCardRouter";
import type { PostView } from "@/lib/post-view";
import { domainOf } from "@/lib/post-view";
import { AudienceSelect, AUDIENCE_LABEL, type Audience } from "./AudienceSelect";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { DiaLine, type DiaLineState } from "./DiaLine";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { Input } from "./Input";
import { Sheet } from "./Sheet";
import { Switch } from "./Switch";
import { C_ORDER, type C } from "./cmeta";
import { VERB_ACT, VerbChip } from "./VerbChip";
import {
  UNTYPED,
  VERB_SCHEMA,
  type FieldKey,
  type FieldValues,
  type VerbField,
} from "./verb-schema";

export { VERB_SCHEMA } from "./verb-schema";

// DIA inference budget. Ruling 54 set 2.5 s; ruling 74 (D176) raises it to 3.5 s after Sonnet-class
// latency measured at 2.2 to 2.9 s per call. The server mirrors this in dia-compose-read.
export const THINK_BUDGET = 3500;
const INFER_DEBOUNCE = 700;
const DRAFT_DEBOUNCE = 800;
const MIN_INFER_CHARS = 8;

export type Inference = {
  c: C;
  fields: Partial<Record<FieldKey, string | boolean>>;
  line?: string | undefined;
  confidence?: number | undefined;
  latency_ms?: number | undefined;
};
export type UnfurlMeta = {
  title?: string | null | undefined;
  description?: string | null | undefined;
  image?: string | null | undefined;
  domain?: string | undefined;
};
export type ComposerLink = {
  url: string;
  domain: string;
  title?: string | undefined;
  description?: string | undefined;
  image?: string | undefined;
};
export type ComposerImage = {
  preview: string;
  storage_path?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
  pending?: boolean | undefined;
};
export type UploadedImage = { storage_path: string; width: number; height: number };

export type DiaRecord = {
  verb: C | null;
  confidence: number | null;
  proposed_fields: Partial<Record<FieldKey, string | boolean>>;
  accepted: boolean;
  member_overrode: boolean;
  latency_ms: number | null;
};

/** What the composer persists as a draft and hands back on publish. */
export type ComposerState = {
  text: string;
  verb: C | null;
  overridden: boolean;
  fields: FieldValues;
  images: ComposerImage[];
  link: ComposerLink | null;
  audience: Audience;
  asSpace: string;
  dia: { state: DiaLineState; text?: string | undefined };
  diaRecord: DiaRecord | null;
};

export type ComposerSeed = Partial<ComposerState> & { hold?: boolean | undefined };

export type ComposerProps = {
  open: boolean;
  onClose?: (() => void) | undefined;
  onPublish?: ((state: ComposerState) => Promise<void> | void) | undefined;
  tier?: "compact" | "expanded";
  mode?: "touch" | "pointer" | undefined;
  author?: { name: string; avatar?: string | undefined };
  spaces?: { id: string; name: string }[];
  anchor?: { kind: string; id: string; name: string } | undefined;
  infer?: ((text: string) => Promise<Inference | null>) | undefined;
  unfurl?: ((url: string) => Promise<UnfurlMeta | null>) | undefined;
  upload?: ((file: File) => Promise<UploadedImage | null>) | undefined;
  initialVerb?: C | null | undefined;
  initial?: ComposerSeed | null | undefined;
  draft?: ComposerSeed | null | undefined;
  onDraft?: ((state: ComposerState | null) => void) | undefined;
  contained?: boolean | undefined;
  maxImages?: number;
};

/** Software keyboard height on touch devices, from visualViewport. 0 when no keyboard or API. */
function useKeyboardHeight(active: boolean): number {
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!active || !vv) {
      setKb(0);
      return;
    }
    const f = () => {
      const h = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKb(h > 80 ? h : 0);
    };
    f();
    vv.addEventListener("resize", f);
    vv.addEventListener("scroll", f);
    return () => {
      vv.removeEventListener("resize", f);
      vv.removeEventListener("scroll", f);
    };
  }, [active]);
  return kb;
}

const DIA_LINE: Record<C, string> = {
  connect: "DIA read this as an Intro.",
  convene: "DIA read this as an Event.",
  collaborate: "DIA read this as a Space.",
  contribute: "DIA read this as a Need.",
  convey: "DIA read this as a Story.",
};

/** The Universal Post Composer (Brief 1). One shell for every verb; DIA suggests, the member decides. */
export function Composer({
  open,
  onClose,
  onPublish,
  tier = "compact",
  mode,
  author = { name: "You" },
  spaces = [],
  anchor,
  infer,
  unfurl,
  upload,
  initialVerb,
  initial,
  draft,
  onDraft,
  contained,
  maxImages = 4,
}: ComposerProps) {
  const touch = (mode || (tier === "compact" ? "touch" : "pointer")) === "touch";
  const seed: ComposerSeed = useMemo(
    () => initial || (!initialVerb && draft) || {},
    [initial, initialVerb, draft],
  );
  const [text, setText] = useState(seed.text || "");
  const [verb, setVerb] = useState<C | null>(seed.verb || initialVerb || null);
  const [overridden, setOverridden] = useState(!!(seed.overridden || initialVerb));
  const [fv, setFv] = useState<FieldValues>(seed.fields || {});
  const [images, setImages] = useState<ComposerImage[]>(seed.images || []);
  const [link, setLink] = useState<ComposerLink | null>(seed.link || null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [audience, setAudience] = useState<Audience>(
    seed.audience || (anchor ? "anchored" : "everyone"),
  );
  const [asSpace, setAsSpace] = useState(seed.asSpace || "");
  const [dia, setDia] = useState<{ state: DiaLineState; text?: string | undefined }>(
    seed.dia || { state: null },
  );
  const [diaRecord, setDiaRecord] = useState<DiaRecord | null>(seed.diaRecord || null);
  const [drafted, setDrafted] = useState(!!draft && !initial);
  const [picker, setPicker] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const run = useRef(0);
  const kb = useKeyboardHeight(open && touch && tier === "compact");
  const c: C = verb || "convey";
  const schema = verb ? VERB_SCHEMA[verb] : UNTYPED;
  const uploading = images.some((i) => i.pending);
  const has =
    text.trim().length > 0 ||
    images.length > 0 ||
    !!link ||
    Object.values(fv).some((f) => f && f.value);
  const setField = (key: FieldKey, value: string | boolean, mine = true) =>
    setFv((s) => ({ ...s, [key]: { value, mine } }));

  // Inference: debounce, pending state, resolve or stay silent. Never after the member has chosen.
  useEffect(() => {
    if (!open || overridden || !infer || (initial && initial.hold)) return;
    const t = text.trim();
    if (t.length < MIN_INFER_CHARS) {
      if (!overridden) {
        setVerb(null);
        setDia({ state: null });
      }
      return;
    }
    const id = ++run.current;
    const h = setTimeout(async () => {
      setDia({ state: "thinking" });
      const started = Date.now();
      const res = await Promise.race([
        infer(t),
        new Promise<null>((r) => setTimeout(() => r(null), THINK_BUDGET)),
      ]).catch(() => null);
      if (id !== run.current) return;
      if (!res || !res.c) {
        setDia({ state: null });
        return;
      }
      setVerb(res.c);
      setFv((s) => {
        const n: FieldValues = { ...s };
        (Object.entries(res.fields || {}) as [FieldKey, string | boolean][]).forEach(([k, v]) => {
          const cur = n[k];
          if (!cur || !cur.mine) n[k] = { value: v, mine: false };
        });
        return n;
      });
      setDiaRecord({
        verb: res.c,
        confidence: res.confidence ?? null,
        proposed_fields: res.fields || {},
        accepted: true,
        member_overrode: false,
        latency_ms: res.latency_ms ?? Date.now() - started,
      });
      setDia({ state: "done", text: res.line || DIA_LINE[res.c] });
    }, INFER_DEBOUNCE);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, open, overridden]);

  // Draft autosave (ruling 56): server-side through onDraft. The indicator is the only trace.
  const snapshot = (): ComposerState => ({
    text,
    verb,
    overridden,
    fields: fv,
    images: images.filter((i) => !i.pending && i.storage_path),
    link,
    audience,
    asSpace,
    dia,
    diaRecord,
  });
  const latest = useRef<{ has: boolean; state: ComposerState; dirty: boolean; published: boolean }>(
    {
      has,
      state: snapshot(),
      dirty: false,
      published: false,
    },
  );
  latest.current = { ...latest.current, has, state: snapshot() };
  useEffect(() => {
    if (!open || !onDraft) return;
    latest.current.dirty = true;
    const h = setTimeout(() => {
      latest.current.dirty = false;
      if (has) {
        onDraft(latest.current.state);
        setDrafted(true);
      } else {
        onDraft(null);
        setDrafted(false);
      }
    }, DRAFT_DEBOUNCE);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, verb, fv, images, link, audience, asSpace, has, open]);
  // Closing with content keeps the draft: flush a pending debounce when the composer unmounts.
  useEffect(() => {
    return () => {
      const l = latest.current;
      if (onDraft && l.dirty && !l.published) onDraft(l.has ? l.state : null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open && taRef.current && !touch) taRef.current.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || touch) return;
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && has && !uploading && !publishing)
        void publish();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const notThis = () => {
    setOverridden(true);
    setVerb(null);
    setDia({ state: null });
    setFv(
      (s) => Object.fromEntries(Object.entries(s).filter(([, f]) => f && f.mine)) as FieldValues,
    );
    setDiaRecord((r) => (r ? { ...r, accepted: false, member_overrode: true } : r));
  };
  const choose = (v: C) => {
    setOverridden(true);
    setVerb(v);
    setDia({ state: null });
    setDiaRecord((r) => (r ? { ...r, accepted: r.verb === v, member_overrode: r.verb !== v } : r));
  };

  const addFiles = (files: FileList | File[] | null) => {
    const list = Array.from(files || [])
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, Math.max(0, maxImages - images.length));
    list.forEach((f) => {
      const preview = URL.createObjectURL(f);
      const img: ComposerImage = { preview, pending: !!upload };
      setImages((s) => (s.length < maxImages ? [...s, img] : s));
      if (upload) {
        upload(f)
          .then((res) => {
            setImages((s) =>
              res
                ? s.map((i) =>
                    i.preview === preview
                      ? {
                          ...i,
                          storage_path: res.storage_path,
                          width: res.width,
                          height: res.height,
                          pending: false,
                        }
                      : i,
                  )
                : s.filter((i) => i.preview !== preview),
            );
          })
          .catch(() => setImages((s) => s.filter((i) => i.preview !== preview)));
      }
    });
    setPicker(false);
  };

  const addLink = async () => {
    const u = url.trim();
    if (!u) return;
    const host = domainOf(u);
    setLink({ url: u, domain: host });
    setLinkOpen(false);
    setUrl("");
    if (unfurl) {
      const meta = await unfurl(u).catch(() => null);
      if (meta)
        setLink((l) =>
          l && l.url === u
            ? {
                ...l,
                title: meta.title ?? undefined,
                description: meta.description ?? undefined,
                image: meta.image ?? undefined,
                domain: meta.domain ?? l.domain,
              }
            : l,
        );
    }
  };

  const space = spaces.find((s) => s.id === asSpace);
  const view: PostView = {
    c_category: c,
    verb,
    author_kind: space ? "space" : "member",
    author_name: space ? space.name : author.name,
    author_avatar: space ? undefined : author.avatar,
    body: text,
    anchor_name: anchor && anchor.name,
    audience,
    fields: fv,
    media: images.map((i) => i.preview),
    link: link
      ? { url: link.url, domain: link.domain, title: link.title, image: link.image }
      : null,
  };

  const publish = async () => {
    if (!onPublish || publishing) return;
    setPublishing(true);
    // Mark before the host closes the shell so the unmount flush never re-saves a published draft.
    latest.current.published = true;
    try {
      await onPublish({
        text,
        verb,
        overridden,
        fields: fv,
        images,
        link,
        audience,
        asSpace,
        dia,
        diaRecord,
      });
    } catch (err) {
      latest.current.published = false;
      throw err;
    } finally {
      setPublishing(false);
    }
  };

  const preview = has ? <PostCardRouter view={view} preview /> : null;

  const diaTag = (
    <span
      style={{
        marginLeft: 8,
        fontSize: 11,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--ink-3)",
        fontWeight: 500,
      }}
    >
      DIA
    </span>
  );

  const fieldEl = (f: VerbField): ReactNode => {
    const v = fv[f.key] || { value: "", mine: true };
    const filled = v.value != null && v.value !== "" && v.value !== false;
    const lab = (
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        {f.label}
        {filled && !v.mine && diaTag}
      </span>
    );
    if (f.kind === "toggle")
      return (
        <Switch
          key={f.key}
          label={f.label}
          checked={!!v.value}
          onChange={(x) => setField(f.key, x)}
          style={{ width: "100%", paddingRight: 2 }}
        />
      );
    if (f.kind === "segment")
      return (
        <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink-2)" }}>{lab}</div>
          <div
            role="radiogroup"
            aria-label={f.label}
            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            {(f.options || []).map((o) => {
              const on = v.value === o;
              return (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setField(f.key, o)}
                  style={{
                    all: "unset",
                    boxSizing: "border-box",
                    cursor: "pointer",
                    height: 44,
                    padding: "0 16px",
                    borderRadius: 999,
                    fontFamily: "var(--font-sans)",
                    fontSize: 15,
                    fontWeight: 500,
                    color: on ? "var(--on-fill)" : "var(--ink)",
                    background: on ? "var(--ink)" : "transparent",
                    border: "1px solid " + (on ? "var(--ink)" : "var(--line)"),
                  }}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      );
    return (
      <Input
        key={f.key}
        label={lab}
        multiline={f.multiline}
        rows={2}
        value={typeof v.value === "string" ? v.value : ""}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setField(f.key, e.target.value)
        }
      />
    );
  };

  const attach = (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {touch ? (
          <IconButton
            name="image"
            label="Add an image"
            active={picker}
            onClick={() => setPicker((p) => !p)}
            disabled={images.length >= maxImages}
          />
        ) : (
          <IconButton
            name="image"
            label="Add an image"
            onClick={() => fileRef.current && fileRef.current.click()}
            disabled={images.length >= maxImages}
          />
        )}
        <IconButton
          name="link"
          label="Add a link"
          active={linkOpen}
          onClick={() => setLinkOpen((o) => !o)}
        />
        <span style={{ flex: 1 }} />
        {!touch && (
          <span style={{ fontSize: 13, color: "var(--ink-3)" }}>Drop images on the text</span>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
        <input
          ref={camRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>
      {picker && touch && (
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" onClick={() => camRef.current && camRef.current.click()}>
            <Icon name="camera" size={20} />
            Take a photo
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current && fileRef.current.click()}>
            <Icon name="images" size={20} />
            Choose from library
          </Button>
        </div>
      )}
      {linkOpen && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <Input
            label="Link"
            placeholder="https://"
            value={url}
            onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              setUrl(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addLink();
              }
            }}
            style={{ flex: 1 }}
          />
          <Button variant="secondary" onClick={() => void addLink()} disabled={!url.trim()}>
            Add
          </Button>
        </div>
      )}
      {images.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {images.map((img, i) => (
            <span
              key={img.preview + i}
              style={{
                position: "relative",
                width: 72,
                height: 72,
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid var(--line)",
              }}
            >
              <img
                src={img.preview}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  opacity: img.pending ? 0.6 : 1,
                }}
              />
              <IconButton
                name="x"
                label="Remove image"
                size={44}
                onClick={() => setImages((s) => s.filter((_, j) => j !== i))}
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  color: "var(--on-fill)",
                  background: "var(--scrim)",
                }}
              />
            </span>
          ))}
        </div>
      )}
      {link && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 6px 6px 12px",
            border: "1px solid var(--line)",
            borderRadius: 10,
            fontSize: 15,
          }}
        >
          <Icon name="link" size={18} style={{ color: "var(--ink-3)" }} />
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {link.title || link.domain}
          </span>
          <IconButton name="x" label="Remove link" onClick={() => setLink(null)} />
        </div>
      )}
    </div>
  );

  const fields = (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <textarea
        ref={taRef}
        aria-label="What is going on with you"
        placeholder="What is going on with you?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={tier === "compact" ? 4 : 6}
        onDragOver={(e: DragEvent<HTMLTextAreaElement>) => {
          if (!touch) e.preventDefault();
        }}
        onDrop={(e: DragEvent<HTMLTextAreaElement>) => {
          if (touch) return;
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: "none",
          outline: "none",
          resize: "none",
          background: "transparent",
          color: "var(--ink)",
          fontFamily: "var(--font-sans)",
          fontSize: 19,
          lineHeight: 1.5,
          padding: 0,
          minHeight: 44,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          role="radiogroup"
          aria-label="What kind of post"
          style={
            tier === "compact"
              ? {
                  display: "flex",
                  gap: 8,
                  overflowX: "auto",
                  margin: "0 -20px",
                  padding: "2px 20px",
                  scrollbarWidth: "none",
                  // The scrolling row must not widen the layout viewport on touch devices.
                  contain: "inline-size",
                }
              : { display: "flex", gap: 8, flexWrap: "wrap" }
          }
        >
          {C_ORDER.map((v) => (
            <VerbChip
              key={v}
              c={v}
              compact={tier === "compact"}
              selected={verb === v}
              onClick={() => choose(v)}
            />
          ))}
        </div>
        <DiaLine state={dia.state} text={dia.text} onNotThis={notThis} />
      </div>
      {verb && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            paddingTop: 4,
            borderTop: "1px solid var(--line)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: "var(--c-" + verb + ")",
              paddingTop: 12,
            }}
          >
            {VERB_ACT[verb]}
          </div>
          {schema.fields.map(fieldEl)}
        </div>
      )}
      {attach}
      <AudienceSelect value={audience} onChange={setAudience} anchor={anchor && anchor.name} />
    </div>
  );

  const header = (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: tier === "compact" ? "0 8px 8px 16px" : "12px 12px 12px 24px",
        borderBottom: "1px solid var(--line)",
        flex: "none",
      }}
    >
      <Avatar
        name={view.author_name}
        src={view.author_avatar}
        size={32}
        style={space ? { borderRadius: 6 } : undefined}
      />
      {spaces.length ? (
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
          <select
            aria-label="Post as"
            value={asSpace}
            onChange={(e) => setAsSpace(e.target.value)}
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              fontWeight: 700,
              color: "var(--ink)",
              padding: "0 24px 0 4px",
              minHeight: 44,
              cursor: "pointer",
            }}
          >
            <option value="">{author.name}</option>
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Icon
            name="chevron-down"
            size={16}
            style={{ position: "absolute", right: 4, color: "var(--ink-3)", pointerEvents: "none" }}
          />
        </div>
      ) : (
        <span style={{ fontSize: 15, fontWeight: 700, padding: "0 4px" }}>{author.name}</span>
      )}
      {anchor && (
        <span
          style={{
            fontSize: 13,
            color: "var(--ink-3)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          in {anchor.name}
        </span>
      )}
      <span style={{ flex: 1 }} />
      {drafted && has && <span style={{ fontSize: 13, color: "var(--ink-3)" }}>Draft saved</span>}
      <IconButton name="x" label="Close" onClick={onClose} />
    </header>
  );

  const publishBtn = (
    <Button
      c={verb || undefined}
      disabled={!has || uploading || publishing}
      onClick={() => void publish()}
      full={tier === "compact"}
    >
      Publish
    </Button>
  );
  const col = {
    width: "100%",
    maxWidth: "var(--content-max, 680px)",
    margin: "0 auto",
    boxSizing: "border-box" as const,
  };
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      variant={tier === "compact" ? "sheet" : "drawer"}
      label="Compose"
      contained={contained}
      keyboardHeight={kb}
      width={1000}
    >
      {header}
      {tier === "compact" ? (
        <Fragment>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px 24px" }}>
            <div style={{ ...col, display: "flex", flexDirection: "column", gap: 24 }}>
              {fields}
              {preview && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div
                    style={{
                      fontSize: 13,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      fontWeight: 500,
                      color: "var(--ink-3)",
                    }}
                  >
                    How it will appear
                  </div>
                  {preview}
                </div>
              )}
            </div>
          </div>
          <div
            style={{
              flex: "none",
              padding: "12px 20px 12px",
              borderTop: "1px solid var(--line)",
              background: "var(--surface)",
            }}
          >
            <div style={col}>{publishBtn}</div>
          </div>
        </Fragment>
      ) : (
        <Fragment>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) 400px",
            }}
          >
            <div
              style={{
                overflowY: "auto",
                padding: "20px 24px 24px",
                borderRight: "1px solid var(--line)",
              }}
            >
              {fields}
            </div>
            <div style={{ overflowY: "auto", padding: "20px 24px", background: "var(--bg)" }}>
              {preview}
            </div>
          </div>
          <div
            style={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 12,
              padding: "12px 24px",
              borderTop: "1px solid var(--line)",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>
              {isMac ? "⌘ Enter to publish · Esc to close" : "Ctrl Enter to publish · Esc to close"}
            </span>
            {publishBtn}
          </div>
        </Fragment>
      )}
    </Sheet>
  );
}

export { AUDIENCE_LABEL };
