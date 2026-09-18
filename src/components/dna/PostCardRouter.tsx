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

/**
 * Map a PostView to PostCard props. Untyped posts take the convey frame and, under ruling 546 (W54),
 * Convey's kicker; they still carry no title and no action (ruling 68). UNTYPED is that one row.
 */
export function postCardProps(view: PostView, opts: RouterOptions = {}): PostCardProps {
  const schema = view.verb ? CARD_SCHEMA[view.verb] : UNTYPED;
  const c = view.c_category;
  const titleWords = view.verb ? view.fields.title?.value : undefined;
  // Convene Pass 1 (P1-SPEC section 2). Cancelled is the full treatment inside 69's anatomy: kicker
  // `Event cancelled`, the title struck in --ink-3, the body the fact and the host's reason, never
  // clamped, no media, no hook rows, no tap into the event page. Past keeps the kicker and the
  // meta line says `Happened`. The Space hook (Canon 6, 642) renders in the expanded card only,
  // as a text link in Collaborate's text colour, and only when the event is linked to a Space.
  const ev = view.event;
  const cancelled = !!ev?.cancelled;
  const media: PostCardProps["media"] = cancelled
    ? undefined
    : view.media.length > 1
      ? { kind: "gallery", items: view.media }
      : view.media.length === 1
        ? { kind: "image", src: view.media[0], alt: "" }
        : undefined;
  const title: ReactNode =
    typeof titleWords === "string" && titleWords ? (
      cancelled ? (
        <span
          data-cancelled-title
          style={{
            color: "var(--ink-3)",
            textDecoration: "line-through",
            textDecorationColor: "var(--line-strong)",
          }}
        >
          {titleWords}
        </span>
      ) : (
        titleWords
      )
    ) : undefined;
  const hookRows: PostCardProps["fields"] =
    ev && !cancelled && opts.expanded && ev.space
      ? [
          {
            label: "Space",
            icon: "hash",
            value: (
              <a
                href="/collaborate"
                data-hook="space"
                onClick={(e) => e.stopPropagation()}
                style={{
                  color: "var(--c-collaborate-text)",
                  fontWeight: 500,
                  textDecoration: "underline",
                  textDecorationColor: "var(--line-strong)",
                  textUnderlineOffset: 2,
                }}
              >
                {ev.space.name}
              </a>
            ),
          },
        ]
      : [];
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
    kicker: ev ? (cancelled ? "Event cancelled" : "Event") : schema.kicker,
    title,
    fields: [...fieldRows(view.verb, view.fields), ...hookRows],
    media,
    link: cancelled ? undefined : (view.link ?? undefined),
    actions,
    respondLabel: c === "convene" ? "Ask the host" : "Respond",
    preview: opts.preview,
    feed: opts.feed,
    onMenu: opts.onMenu,
    onClick: cancelled ? undefined : opts.onClick,
    saved: opts.saved,
    reacted: opts.reacted,
    onReact: opts.onReact,
    onRespond: opts.onRespond,
    onSave: opts.onSave,
    onShare: opts.onShare,
    readMoreHref: cancelled ? undefined : opts.readMoreHref,
    onReadMore: cancelled ? undefined : opts.onReadMore,
    onReadMoreIntent: cancelled ? undefined : opts.onReadMoreIntent,
    expanded: cancelled ? true : opts.expanded,
    onCollapse: cancelled ? undefined : opts.onCollapse,
  };
}

export function PostCardRouter({ view, ...opts }: { view: PostView } & RouterOptions) {
  const props = postCardProps(view, opts);
  const body = view.event?.cancelled ? view.event.cancelledBody : view.body;
  return <PostCard {...props}>{body || undefined}</PostCard>;
}
