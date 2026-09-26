// Ported from Strand components/dna/MediaBlock.jsx; reconciled at compile v1790410319010950
// (corrections 30 and 31, ratified together under 1153; handoff 33-D), after correction 28 at
// v1790366257373061 (1134) and corrections 26 and 27 (rulings 1115, 1117, 1118) at
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
// the divergence is now the compile's own form and is no longer kept.
// Correction 30 (G119): the ratioed video's poster takes the same declared grid cell, with play and
// duration absolute over it; unratioed video is unchanged. Correction 30 adds `kind="strip"`, the
// group of four square cells, and `kind="carousel"`, one to five 16:9 slides that snap, whose row
// takes ArrowLeft and ArrowRight and marks them handled so a Pane around it does not step; neither
// reads `ratio`. Correction 31 item 2: the carousel scrolls smoothly, and instantly under
// `prefers-reduced-motion: reduce`, and nothing in the part reads a global. The one divergence
// kept from the compile is 439's guard on a non-web link, below.
// docs/strand-ports/v1790410319010950.md holds the dispositions.
import { useRef, type CSSProperties, type KeyboardEvent } from "react";
import { Icon } from "./Icon";

export type MediaBlockProps = {
  kind?: "none" | "image" | "gallery" | "video" | "link" | "audio" | "strip" | "carousel";
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
   *  inside its 16/10 frame (correction 27, 1118). A ratioed video's poster takes one declared grid
   *  cell (correction 30, G119). strip and carousel ignore it. */
  ratio?: string | undefined;
  style?: CSSProperties | undefined;
};

/** Shared media block. kind: none | image | gallery | video | link | audio | strip | carousel (correction 30). Gallery capped at 4. ratio (1115) fixes image, gallery and video frames; link and audio ignore it.
 *  Correction 28 (G116): a ratioed image is laid out as the ratioed galleries are, one declared grid cell (minmax(0,1fr) by minmax(0,1fr)) with minHeight 0,
 *  so its height resolves against the grid area inside the 1px edge; WebKit resolved the former height:100% against the border box and ran 2px past it.
 *  Correction 30 (G119): a ratioed video's poster takes the same declared grid cell; play and duration stay absolute over it. Unratioed video is unchanged. */
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
  if (kind === "strip") return <Strip items={items} style={style} />;
  if (kind === "carousel") return <Carousel items={items} title={title} style={style} />;
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
  // Correction 30 (G119): the ratioed video's poster in one declared grid cell, as the ratioed image.
  if (kind === "video" && ratio)
    return (
      <div
        style={{
          ...frame,
          position: "relative",
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr)",
          gridTemplateRows: "minmax(0,1fr)",
          aspectRatio: ratio,
        }}
      >
        {src && (
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

/** Correction 30 (Part A, from v5's body blocks): the group of four. Four images in one row of square cells, no outer frame; v5 draws 4 × 1fr, gap 6, cell radius 10, a 1px line
 *  edge per cell. Carried to tokens: gap --space-2, radius --radius-m, edge --border-thin --line. Fewer than four renders what is passed in the same four tracks; none renders nothing. */
function Strip({ items, style }: { items: string[]; style?: CSSProperties | undefined }) {
  const g = items.slice(0, 4);
  if (!g.length) return null;
  return (
    <div
      data-media="strip"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0,1fr))",
        gap: "var(--space-2)",
        ...style,
      }}
    >
      {g.map((s, i) => (
        <div
          key={i}
          style={{
            borderRadius: "var(--radius-m)",
            overflow: "hidden",
            border: "var(--border-thin) solid var(--line)",
            background: "var(--bg-sunken)",
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr)",
            gridTemplateRows: "minmax(0,1fr)",
            aspectRatio: "1 / 1",
          }}
        >
          <img
            src={s}
            alt=""
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              minHeight: 0,
              objectFit: "cover",
            }}
          />
        </div>
      ))}
    </div>
  );
}

/** Correction 30 (Part A): the carousel. One to five 16:9 slides that snap one at a time, as v5 draws it: a row scrolling sideways, gap 8 (--space-2), each slide --carousel-slide (86%) of the row so the next
 *  slide's edge shows, radius 14 (--radius-l), a 1px line edge, --bg-sunken behind the image; the scrollbar is hidden. v5 draws no position indicator and none is drawn here (no digit anywhere).
 *  Keyboard: the row takes focus; ArrowLeft and ArrowRight move one slide and mark the event handled, so a Pane around it does not step. */
/** Correction 31 item 2: the carousel scrolls smoothly, and instantly under prefers-reduced-motion: reduce. No other switch. */
const reduced = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
function Carousel({
  items,
  title = "Images",
  style,
}: {
  items: string[];
  title?: string | undefined;
  style?: CSSProperties | undefined;
}) {
  const g = items.slice(0, 5);
  const ref = useRef<HTMLDivElement>(null);
  if (!g.length) return null;
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const row = ref.current;
    if (!row) return;
    const kids = Array.from(row.children) as HTMLElement[];
    const first = kids[0];
    if (!first) return;
    e.preventDefault();
    const second = kids[1];
    const step = second ? second.offsetLeft - first.offsetLeft : row.clientWidth;
    const i = Math.round(row.scrollLeft / step);
    const to = Math.max(0, Math.min(kids.length - 1, i + (e.key === "ArrowRight" ? 1 : -1)));
    const target = kids[to] ?? first;
    row.scrollTo({
      left: target.offsetLeft - first.offsetLeft,
      behavior: reduced() ? "auto" : "smooth",
    });
  };
  return (
    <div
      ref={ref}
      data-media="carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={title}
      tabIndex={0}
      onKeyDown={onKey}
      style={{
        display: "flex",
        gap: "var(--space-2)",
        overflowX: "auto",
        overflowY: "hidden",
        scrollSnapType: "x mandatory",
        scrollbarWidth: "none",
        outlineOffset: "var(--focus-offset)",
        borderRadius: "var(--radius-l)",
        ...style,
      }}
    >
      {g.map((s, i) => (
        <div
          key={i}
          role="group"
          aria-roledescription="slide"
          style={{
            flex: "none",
            width: "var(--carousel-slide)",
            scrollSnapAlign: "start",
            borderRadius: "var(--radius-l)",
            overflow: "hidden",
            border: "var(--border-thin) solid var(--line)",
            background: "var(--bg-sunken)",
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr)",
            gridTemplateRows: "minmax(0,1fr)",
            aspectRatio: "16 / 9",
          }}
        >
          <img
            src={s}
            alt=""
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              minHeight: 0,
              objectFit: "cover",
            }}
          />
        </div>
      ))}
    </div>
  );
}
