// Ported from Strand components/dna/MediaBlock.jsx; reconciled at compile v1790366257373061
// (correction 28, ratified 1134), after corrections 26 and 27 (rulings 1115, 1117, 1118) at
// v1790279130697923. Video and audio kinds are kept for parity with the system; the composer never
// produces them (ruling 55).
//
// Correction 26 (1115): `ratio` fixes the frame of image, gallery and video. With it, an image fills
// its frame (object-fit: cover, no 420 cap) and a gallery declares its rows so the tiles fill the
// frame; the two ratio branches are separate branches, as compiled, and video reads `ratio || "16/9"`.
// Link and audio ignore it. Absent, image, video, link and audio run the code they ran before.
// Correction 27 (1118): the gallery without a ratio declares the same rows and `minHeight: 0` on each
// image, so three and four images fill the 16/10 frame instead of spilling past it; two images keep
// every box size.
// Correction 28 (item 7, G116; 1134): the compile lays the ratioed image out in one declared grid
// cell, `minmax(0,1fr)` by `minmax(0,1fr)` with `minHeight: 0` on the image, as the ratioed galleries
// are. That is the layout this port carried as a divergence at v1790279130697923, and its
// declarations were already the compile's in property, value and order, so no declaration changed:
// the divergence is now the compile's own form and is no longer kept. The ratioed video frame is not
// in correction 28 (its poster stays in flow at `height: 100%`, as compiled), so G116's video half
// is not in this compile. The one divergence kept from the compile is 439's guard on a non-web link,
// below. docs/strand-ports/v1790366257373061.md holds the dispositions.
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
  /** Fixes the media frame to a ratio, in CSS aspect-ratio form ("16/9"). Ruling 1115. image: the
   *  frame holds the ratio and the image fills it (object-fit: cover; no 420 cap), laid out as one
   *  declared grid cell (correction 28, G116). gallery: replaces 16/10; tiles fill one row (two
   *  images) or two equal rows (three or four). video: replaces 16/9. link and audio ignore it.
   *  Absent, image, video, link and audio render as before, and a gallery declares the same rows
   *  inside its 16/10 frame (correction 27, 1118). */
  ratio?: string | undefined;
  style?: CSSProperties | undefined;
};

/** Shared media block. kind: none | image | gallery | video | link | audio. Gallery capped at 4.
 *  ratio (1115) fixes image, gallery and video frames; link and audio ignore it. */
export function MediaBlock({
  kind = "none",
  src,
  items = [],
  alt = "",
  title,
  domain,
  duration,
  ratio,
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
  // Correction 28 (G116): one declared grid cell, so the image's height resolves against the grid
  // area inside the frame's 1px edge. The former in-flow `height: 100%` ran past that edge on WebKit
  // (run 347) and, by the extraction's item 7, in Chrome by 2.3 to 2.4px. The compile was measured in
  // Chrome only; G116 closes on a green `matrix (webkit)` arm reading the image inside its frame.
  if (kind === "image" && ratio)
    return (
      <div
        style={{
          ...frame,
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr)",
          gridTemplateRows: "minmax(0,1fr)",
          aspectRatio: ratio,
        }}
      >
        <img
          src={src}
          alt={alt}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            minHeight: 0,
            objectFit: "cover",
          }}
        />
      </div>
    );
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
  if (kind === "gallery" && ratio) {
    const g = items.slice(0, 4);
    return (
      <div
        style={{
          ...frame,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: g.length > 2 ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)",
          gap: 2,
          aspectRatio: ratio,
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
              minHeight: 0,
              objectFit: "cover",
              display: "block",
              gridColumn: g.length === 3 && i === 0 ? "span 2" : undefined,
            }}
          />
        ))}
      </div>
    );
  }
  if (kind === "gallery") {
    const g = items.slice(0, 4);
    return (
      <div
        style={{
          ...frame,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: g.length > 2 ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)",
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
              minHeight: 0,
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
      <div style={{ ...frame, position: "relative", aspectRatio: ratio || "16/9" }}>
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
  // Ruling 439 (F20): a link card is an anchor only for a web address. Anything else renders the
  // text without an anchor, so a javascript: or data: URL never becomes navigable in-origin.
  if (kind === "link" && !/^https?:\/\//i.test(src || ""))
    return (
      <span style={{ ...frame, display: "block", padding: "12px 14px", color: "var(--ink-2)" }}>
        {title || src}
      </span>
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
