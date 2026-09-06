// The one card renderer keyed on c_category (brief: card router). The composer preview and the
// Feed both render through here; there is no second renderer.
import type { ReactNode } from "react";
import { AUDIENCE_LABEL } from "@/components/strand/AudienceSelect";
import { Button } from "@/components/strand/Button";
import { PostCard, type PostCardProps } from "@/components/strand/PostCard";
import { fieldRows, UNTYPED, VERB_SCHEMA } from "@/components/strand/verb-schema";
import type { PostView } from "@/lib/post-view";

export type RouterOptions = {
  preview?: boolean | undefined;
  onRespond?: (() => void) | undefined;
  onSave?: (() => void) | undefined;
  onShare?: (() => void) | undefined;
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
  const actions =
    opts.actions ??
    (schema.action && c !== "system" ? (
      <Button c={c} size="sm" onClick={opts.onRespond}>
        {schema.action}
      </Button>
    ) : undefined);
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
    onRespond: opts.onRespond,
    onSave: opts.onSave,
    onShare: opts.onShare,
  };
}

export function PostCardRouter({ view, ...opts }: { view: PostView } & RouterOptions) {
  const props = postCardProps(view, opts);
  return <PostCard {...props}>{view.body || undefined}</PostCard>;
}
