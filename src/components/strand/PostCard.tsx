// Ported from Strand components/dna/PostCard.jsx. Behavior unchanged.
// B2-Shell-Feed-v2 (backwards compatible): mode "feed" clamps the body to six lines with a
// "Read more" link and replaces the engagement row with React (heart, one act, no count), Respond,
// Save, Share (ruling 86's card-action correction: no per-C action, no counts, no cross-C logic
// in the card). mode "full" is the same card unclamped inside the quick-look overlay.
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Avatar } from "./Avatar";
import { CBadge } from "./CBadge";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { MediaBlock, type MediaBlockProps } from "./MediaBlock";
import type { CardC } from "./cmeta";

export type PostCardField = {
  label: string;
  icon?: string | undefined;
  value: string;
  mine?: boolean | undefined;
};
export type PostCardLink = {
  url: string;
  domain?: string | undefined;
  title?: string | undefined;
  image?: string | undefined;
};

export type PostCardProps = {
  c?: CardC;
  author?: string | undefined;
  authorKind?: "member" | "space";
  meta?: string | undefined;
  avatarSrc?: string | undefined;
  anchor?: string | undefined;
  audience?: string | undefined;
  kicker?: string | null | undefined;
  title?: string | null | undefined;
  children?: ReactNode;
  fields?: PostCardField[] | undefined;
  media?: MediaBlockProps | undefined;
  link?: PostCardLink | null | undefined;
  actions?: ReactNode;
  saved?: boolean | undefined;
  onSave?: (() => void) | undefined;
  onShare?: (() => void) | undefined;
  onRespond?: (() => void) | undefined;
  respondLabel?: string;
  onClick?: (() => void) | undefined;
  preview?: boolean | undefined;
  /** "feed": clamped body, React/Respond/Save/Share. "full": unclamped, React/Save/Share. Default: the composer preview card. */
  mode?: "preview" | "feed" | "full" | undefined;
  reacted?: boolean | undefined;
  onReact?: (() => void) | undefined;
  /** Feed mode: the quick-look route for this post. Rendered as a real link so it prefetches and opens in a new tab. */
  readMoreHref?: string | undefined;
  onReadMore?: ((e: MouseEvent<HTMLAnchorElement>) => void) | undefined;
  onReadMoreIntent?: (() => void) | undefined;
  style?: CSSProperties | undefined;
};

const CLAMP_LINES = 6;

/** The one card chassis (rule 1). Identity marker is a 1.5px full-frame border in the C color (rule 2).
 *  c="system" is the fallback category: framed in --line-strong, no glyph badge.
 *  fields: structured rows of the created object; a row with mine=true was written by the member (DIA never rewrites it). */
export function PostCard({
  c = "connect",
  author,
  authorKind = "member",
  meta,
  avatarSrc,
  anchor,
  audience,
  kicker,
  title,
  children,
  fields,
  media,
  link,
  actions,
  saved,
  onSave,
  onShare,
  onRespond,
  respondLabel = "Respond",
  onClick,
  preview,
  mode,
  reacted,
  onReact,
  readMoreHref,
  onReadMore,
  onReadMoreIntent,
  style,
}: PostCardProps) {
  const [, setHover] = useState(false);
  const sys = c === "system";
  const frame = sys ? "var(--line-strong)" : "var(--c-" + c + ")";
  const rows = (fields || []).filter((f) => f && f.value);
  const feed = mode === "feed";
  const full = mode === "full";
  const engagement = feed || full;
  const bodyRef = useRef<HTMLDivElement>(null);
  const [clamped, setClamped] = useState(false);
  // Hover intent (ruling 84): the host's prefetch fires after an 80ms mouseenter hold, never on touch.
  const hold = useRef<number | null>(null);
  const clearHold = () => {
    if (hold.current != null) window.clearTimeout(hold.current);
    hold.current = null;
  };
  useEffect(() => {
    if (!feed) return;
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [feed, children]);
  return (
    <article
      aria-label={preview ? "Preview of your post" : undefined}
      data-c={c}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--surface)",
        borderRadius: 14,
        border: "1.5px solid " + frame,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {author && (
          <Avatar
            name={author}
            src={avatarSrc}
            size={40}
            style={authorKind === "space" ? { borderRadius: 6 } : undefined}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {author && (
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {author}
              {authorKind === "space" && (
                <span style={{ fontWeight: 400, color: "var(--ink-3)" }}> · Space</span>
              )}
            </div>
          )}
          {(meta || anchor || audience) && (
            <div
              style={{
                fontSize: 13,
                color: "var(--ink-3)",
                lineHeight: 1.4,
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              {meta && <span>{meta}</span>}
              {anchor && (
                <span>
                  {meta ? "· " : ""}In {anchor}
                </span>
              )}
              {audience && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                  {meta || anchor ? "· " : ""}
                  <Icon
                    name={
                      audience === "Everyone on DNA"
                        ? "globe"
                        : audience === "My connections"
                          ? "users"
                          : "hash"
                    }
                    size={12}
                  />
                  {audience}
                </span>
              )}
            </div>
          )}
        </div>
        {!sys && <CBadge c={c} size={32} />}
      </header>
      <div
        onClick={onClick}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          cursor: onClick ? "pointer" : "default",
        }}
      >
        {kicker && (
          <div
            style={{
              fontSize: 13,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: sys ? "var(--ink-3)" : "var(--c-" + c + ")",
            }}
          >
            {kicker}
          </div>
        )}
        {title && (
          <h3
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: 22,
              lineHeight: 1.25,
              textWrap: "pretty",
            }}
          >
            {title}
          </h3>
        )}
        {children && (
          <div
            ref={bodyRef}
            data-clamped={feed && clamped ? "1" : undefined}
            style={{
              fontSize: 17,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              ...(feed
                ? {
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: CLAMP_LINES,
                    overflow: "hidden",
                  }
                : {}),
            }}
          >
            {children}
          </div>
        )}
        {feed && clamped && readMoreHref && (
          <a
            href={readMoreHref}
            onClick={onReadMore}
            onMouseEnter={
              onReadMoreIntent
                ? () => {
                    clearHold();
                    hold.current = window.setTimeout(onReadMoreIntent, 80);
                  }
                : undefined
            }
            onMouseLeave={onReadMoreIntent ? clearHold : undefined}
            data-read-more
            style={{
              alignSelf: "flex-start",
              fontSize: 15,
              fontWeight: 500,
              color: "var(--ink-2)",
              textDecoration: "none",
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Read more
          </a>
        )}
        {rows.length > 0 && (
          <dl
            style={{
              margin: 0,
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "6px 12px",
              fontSize: 15,
              lineHeight: 1.45,
              padding: "10px 12px",
              background: "var(--bg-sunken)",
              borderRadius: 10,
            }}
          >
            {rows.map((f) => (
              <Fragment key={f.label}>
                <dt
                  style={{ color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 6 }}
                >
                  {f.icon && <Icon name={f.icon} size={16} />}
                  {f.label}
                </dt>
                <dd
                  style={{
                    margin: 0,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {f.value}
                  {preview && f.mine && (
                    <Icon
                      name="pen-line"
                      size={14}
                      title="Written by you"
                      style={{ color: "var(--ink-3)" }}
                    />
                  )}
                </dd>
              </Fragment>
            ))}
          </dl>
        )}
      </div>
      {media && media.kind && media.kind !== "none" && <MediaBlock {...media} />}
      {link && link.url && (
        <MediaBlock
          kind="link"
          src={link.url}
          domain={link.domain}
          title={link.title}
          items={link.image ? [link.image] : []}
        />
      )}
      {!engagement && actions && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>
      )}
      <footer
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginTop: -4,
          marginLeft: -10,
          marginRight: -10,
          pointerEvents: preview ? "none" : "auto",
        }}
      >
        {engagement && (
          <IconButton
            name="heart"
            label={reacted ? "Reacted" : "React"}
            active={reacted}
            aria-pressed={!!reacted}
            onClick={onReact}
            data-testid="react"
          />
        )}
        {!full && (
          <button
            type="button"
            onClick={onRespond}
            data-testid="respond"
            style={{
              all: "unset",
              cursor: "pointer",
              minHeight: 44,
              padding: "0 10px",
              fontSize: 15,
              fontWeight: 500,
              color: "var(--ink-2)",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {engagement ? "Respond" : respondLabel}
          </button>
        )}
        <span style={{ flex: 1 }} />
        <IconButton
          name="bookmark"
          label={saved ? "Saved" : "Save"}
          active={saved}
          aria-pressed={engagement ? !!saved : undefined}
          onClick={onSave}
          data-testid="save"
        />
        <IconButton name="share" label="Share" onClick={onShare} data-testid="share" />
      </footer>
    </article>
  );
}
