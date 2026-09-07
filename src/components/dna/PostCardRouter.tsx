// The one card renderer keyed on c_category (brief: card router). The composer preview, the Feed and
// the quick-look overlay all render through here; there is no second renderer (rulings 52, 85).
import type { MouseEvent, ReactNode } from "react";
import { AUDIENCE_LABEL } from "@/components/strand/AudienceSelect";
import { Button } from "@/components/strand/Button";
import { PostCard, type PostCardProps } from "@/components/strand/PostCard";
import { fieldRows, UNTYPED, VERB_SCHEMA } from "@/components/strand/verb-schema";
import type { PostView } from "@/lib/post-view";

export type RouterOptions = {
  preview?: boolean | undefined;
  /** "feed" and "full" are PostCard's engagement modes (React, Respond, Save, Share). Default: the composer card. */
  mode?: "feed" | "full" | undefined;
  saved?: boolean | undefined;
  reacted?: boolean | undefined;
  onReact?: (() => void) | undefined;
  onRespond?: (() => void) | undefined;
  onSave?: (() => void) | undefined;
  onShare?: (() => void) | undefined;
  readMoreHref?: string | undefined;
  onReadMore?: ((e: MouseEvent<HTMLAnchorElement>) => void) | undefined;
  onReadMoreIntent?: (() => void) | undefined;
  actions?: ReactNode;
};

/** Map a PostView to PostCard props. Untyped posts: convey frame, no kicker, no title, no action (ruling 68). */
export function postCardProps(view: PostView, opts: RouterOptions = {}): PostCardProps {
  const schema = view.verb ? VERB_SCHEMA[view.verb] : UNTYPED;
  const c = view.c_category;
  const title = view.verb ? view.fields.title?.value : undefined;
  const media: PostCardProps["media"] =
    view.media.length > 1
      ? { kind: "gallery", items: view.media }
      : view.media.length === 1
        ? { kind: "image", src: view.media[0], alt: "" }
        : undefined;
  // The per-C action button belongs to the composer preview only; feed mode has no fifth action.
  const actions = opts.mode
    ? undefined
    : (opts.actions ??
      (schema.action && c !== "system" ? (
        <Button c={c} size="sm" onClick={opts.onRespond}>
          {schema.action}
        </Button>
      ) : undefined));
  return {
    c,
    author: view.author_name,
    authorKind: view.author_kind,
    avatarSrc: view.author_avatar,
    meta: view.meta,
    anchor: view.anchor_name,
    audience: AUDIENCE_LABEL(view.audience, view.anchor_name),
    kicker: schema.kicker,
    title: typeof title === "string" && title ? title : undefined,
    fields: fieldRows(view.verb, view.fields),
    media,
    link: view.link ?? undefined,
    actions,
    respondLabel: c === "convene" ? "Ask the host" : "Respond",
    preview: opts.preview,
    mode: opts.mode,
    saved: opts.saved,
    reacted: opts.reacted,
    onReact: opts.onReact,
    onRespond: opts.onRespond,
    onSave: opts.onSave,
    onShare: opts.onShare,
    readMoreHref: opts.readMoreHref,
    onReadMore: opts.onReadMore,
    onReadMoreIntent: opts.onReadMoreIntent,
  };
}

export function PostCardRouter({ view, ...opts }: { view: PostView } & RouterOptions) {
  const props = postCardProps(view, opts);
  return <PostCard {...props}>{view.body || undefined}</PostCard>;
}
