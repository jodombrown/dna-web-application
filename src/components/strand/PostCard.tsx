// Ported from Strand components/dna/PostCard.jsx. Behavior unchanged.
import { Fragment, useState, type CSSProperties, type ReactNode } from "react";
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
  style?: CSSProperties | undefined;
};

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
  style,
}: PostCardProps) {
  const [, setHover] = useState(false);
  const sys = c === "system";
  const frame = sys ? "var(--line-strong)" : "var(--c-" + c + ")";
  const rows = (fields || []).filter((f) => f && f.value);
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
            style={{
              fontSize: 17,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {children}
          </div>
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
      {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
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
        <button
          type="button"
          onClick={onRespond}
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
          {respondLabel}
        </button>
        <span style={{ flex: 1 }} />
        <IconButton
          name="bookmark"
          label={saved ? "Saved" : "Save"}
          active={saved}
          onClick={onSave}
        />
        <IconButton name="share" label="Share" onClick={onShare} />
      </footer>
    </article>
  );
}
