// Ported from Strand components/dna/MediaBlock.jsx. Behavior unchanged. Video and audio kinds are kept
// for parity with the system; the composer never produces them (ruling 55).
import type { CSSProperties } from "react";
import { Icon } from "./Icon";

export type MediaBlockProps = {
  kind?: "none" | "image" | "gallery" | "video" | "link" | "audio";
  src?: string | undefined;
  items?: string[];
  alt?: string;
  title?: string | undefined;
  domain?: string | undefined;
  duration?: string | undefined;
  style?: CSSProperties | undefined;
};

/** Shared media block. kind: none | image | gallery | video | link | audio. Gallery capped at 4. */
export function MediaBlock({
  kind = "none",
  src,
  items = [],
  alt = "",
  title,
  domain,
  duration,
  style,
}: MediaBlockProps) {
  if (kind === "none") return null;
  const frame: CSSProperties = {
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid var(--line)",
    background: "var(--bg-sunken)",
    ...style,
  };
  if (kind === "image")
    return (
      <div style={frame}>
        <img
          src={src}
          alt={alt}
          style={{ display: "block", width: "100%", maxHeight: 420, objectFit: "cover" }}
        />
      </div>
    );
  if (kind === "gallery") {
    const g = items.slice(0, 4);
    return (
      <div
        style={{
          ...frame,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 2,
          aspectRatio: "16/10",
        }}
      >
        {g.map((s, i) => (
          <img
            key={i}
            src={s}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              gridColumn: g.length === 3 && i === 0 ? "span 2" : undefined,
            }}
          />
        ))}
      </div>
    );
  }
  if (kind === "video")
    return (
      <div style={{ ...frame, position: "relative", aspectRatio: "16/9" }}>
        {src && (
          <img
            src={src}
            alt={alt}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: "var(--surface)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ink)",
            }}
          >
            <Icon name="play" size={24} />
          </span>
        </span>
        {duration && (
          <span
            style={{
              position: "absolute",
              right: 10,
              bottom: 10,
              background: "var(--inverse-bg)",
              color: "var(--inverse-ink)",
              fontSize: 13,
              padding: "2px 8px",
              borderRadius: 6,
            }}
          >
            {duration}
          </span>
        )}
      </div>
    );
  if (kind === "link")
    return (
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        style={{ ...frame, display: "flex", textDecoration: "none", color: "inherit" }}
      >
        {items[0] && (
          <img src={items[0]} alt="" style={{ width: 112, objectFit: "cover", flex: "none" }} />
        )}
        <span style={{ padding: "12px 14px", minWidth: 0 }}>
          <span
            style={{
              display: "block",
              fontSize: 13,
              color: "var(--ink-3)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {domain}
          </span>
          <span
            style={{
              display: "block",
              fontSize: 15,
              fontWeight: 500,
              lineHeight: 1.4,
              marginTop: 4,
            }}
          >
            {title}
          </span>
        </span>
      </a>
    );
  if (kind === "audio")
    return (
      <div
        style={{
          ...frame,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 12px",
          background: "var(--surface)",
        }}
      >
        <button
          type="button"
          aria-label="Play"
          style={{
            all: "unset",
            width: 44,
            height: 44,
            borderRadius: 999,
            background: "var(--ink)",
            color: "var(--on-fill)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flex: "none",
          }}
        >
          <Icon name="play" size={20} />
        </button>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: "block",
              fontSize: 15,
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </span>
          <span
            style={{
              display: "block",
              height: 3,
              background: "var(--line)",
              borderRadius: 2,
              marginTop: 8,
            }}
          />
        </span>
        <span style={{ fontSize: 13, color: "var(--ink-3)", flex: "none" }}>{duration}</span>
      </div>
    );
  return null;
}
