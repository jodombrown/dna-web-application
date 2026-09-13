// The one card renderer keyed on c_category (brief: card router). The composer preview, the Feed
// list, the in-place expansion and the direct-link view all render through here; there is no second
// renderer (rulings 52, 105).
import type { MouseEvent, ReactNode } from "react";
import { AUDIENCE_LABEL } from "@/components/strand/AudienceSelect";
import { Button } from "@/components/strand/Button";
import { PostCard, type PostCardProps } from "@/components/strand/PostCard";
import { CARD_SCHEMA, fieldRows, UNTYPED } from "@/components/strand/verb-schema";
import type { PostView } from "@/lib/post-view";

export type RouterOptions = {
  preview?: boolean | undefined;
  /** PostCard's Feed anatomy (ruling 69). Default: the composer card. */
  feed?: boolean | undefined;
  onMenu?: (() => void) | undefined;
  onClick?: (() => void) | undefined;
  onAct?: (() => void) | undefined;
  saved?: boolean | undefined;
  reacted?: boolean | undefined;
  onReact?: (() => void) | undefined;
  onRespond?: (() => void) | undefined;
  onSave?: (() => void) | undefined;
  onShare?: (() => void) | undefined;
  readMoreHref?: string | undefined;
  onReadMore?: ((e: MouseEvent<HTMLElement>) => void) | undefined;
  onReadMoreIntent?: (() => void) | undefined;
  expanded?: boolean | undefined;
  onCollapse?: (() => void) | undefined;
  actions?: ReactNode;
};

/** Map a PostView to PostCard props. Untyped posts: convey frame, no kicker, no title, no action (ruling 68). */
export function postCardProps(view: PostView, opts: RouterOptions = {}): PostCardProps {
  const schema = view.verb ? CARD_SCHEMA[view.verb] : UNTYPED;
  const c = view.c_category;
  const title = view.verb ? view.fields.title?.value : undefined;
  const media: PostCardProps["media"] =
    view.media.length > 1
      ? { kind: "gallery", items: view.media }
      : view.media.length === 1
        ? { kind: "image", src: view.media[0], alt: "" }
        : undefined;
  // The post's own act in its C (rule 3). In the Feed it goes to that C's route; in the composer
  // preview it is inert.
  const actions =
    opts.actions ??
    (schema.action && c !== "system" ? (
      <Button c={c} size="sm" onClick={opts.feed ? opts.onAct : opts.onRespond}>
        {schema.action}
      </Button>
    ) : undefined);
  return {
    c,
    author: view.author_name,
    authorHandle: view.author_handle,
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
    feed: opts.feed,
    onMenu: opts.onMenu,
    onClick: opts.onClick,
    saved: opts.saved,
    reacted: opts.reacted,
    onReact: opts.onReact,
    onRespond: opts.onRespond,
    onSave: opts.onSave,
    onShare: opts.onShare,
    readMoreHref: opts.readMoreHref,
    onReadMore: opts.onReadMore,
    onReadMoreIntent: opts.onReadMoreIntent,
    expanded: opts.expanded,
    onCollapse: opts.onCollapse,
  };
}

export function PostCardRouter({ view, ...opts }: { view: PostView } & RouterOptions) {
  const props = postCardProps(view, opts);
  return <PostCard {...props}>{view.body || undefined}</PostCard>;
}
