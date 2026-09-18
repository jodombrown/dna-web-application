// Convene Pass 4, the place section's plate, its two pin kinds and the host-placed chip
// (P4-SPEC sections 5 and 6; rulings 790, 792). Mounted by ConveneForm inside
// `data-convene="place-block"`, and kept out of that file so the form gains a mount rather than
// two hundred lines (P4-SPEC guardrail: surgical edits, the file is not rewritten).
//
// The plate is drawn, not fetched. A hairline grid on `--bg-sunken` with the matched area named in
// a chip, and in this build it renders no tiles and no invented geography (P4-SPEC guardrail 3).
// That has one consequence the spec does not spell out and this file will not paper over: **a
// plate with no tiles carries no projection, so a position on it is not a location.** The host's
// point is therefore held as a fraction of the plate in each axis, it is not a coordinate, and
// nothing publishes it as one. The map's own point, which does have a coordinate behind it
// (event_delivery.lng and .lat, written by place-resolve), renders at the plate's centre as the
// token for "the map holds a point", never as where that point is. Logged as gap G43.
//
// Nothing here computes or renders a number: no distance, no zoom level, no coordinate, no match
// quality. The only thing the two pins say is who put them there.
import { useRef, type CSSProperties } from "react";
import { Button } from "@/components/strand/Button";
import type { Mode } from "@/lib/tier";

/** Who is reading the pin. The composer is always the host; an attendee reads the event page. */
export type PinViewer = "host" | "attendee";

export type HostPoint = { x: number; y: number };

export type ConvenePlateProps = {
  /** Input mode. It changes rendered copy in two states only (P4-SPEC section 5). */
  mode: Mode;
  viewer: PinViewer;
  /** The area the map matched, named in the plate's chip. Empty renders no chip. */
  areaName: string;
  /** Whether the resolver holds a point for this place (event_delivery.lng, .lat). */
  mapPoint: boolean;
  /** The host's own point, as a fraction of the plate in each axis. Null is unplaced. */
  hostPoint: HostPoint | null;
  dragging: boolean;
  /** The lookup found nothing for the words (P4-SPEC section 4's state). */
  nothingFound: boolean;
  /** A resolved area rather than a venue: the point is the area, not the venue. */
  area: boolean;
  onPlace: (p: HostPoint) => void;
  onDragging: (d: boolean) => void;
};

const QUIET = { fontSize: 15, lineHeight: 1.45, color: "var(--ink-3)" };
const PLATE_H = 176;
// The hairline grid. Two repeating gradients in `--line`, so the plate reads as a plate in both
// themes and carries no image, no tile and no street.
const GRID: CSSProperties = {
  position: "relative",
  height: PLATE_H,
  borderRadius: "var(--radius-m)",
  border: "1px solid var(--line)",
  background:
    "repeating-linear-gradient(to right, var(--line) 0 1px, transparent 1px 32px)," +
    "repeating-linear-gradient(to bottom, var(--line) 0 1px, transparent 1px 32px)," +
    "var(--bg-sunken)",
  touchAction: "none",
  overflow: "hidden",
};

/**
 * The chip, one visual in every case and four readings (P4-SPEC section 6). Convene copper on
 * `--surface` with a `--c-convene` hairline and `--c-convene-text` ink, and the words change by who
 * is reading and by what the pin is, never by a note beside it.
 */
export function PinChip({
  viewer,
  source,
  dragging,
}: {
  viewer: PinViewer;
  /** `host` is the copper ringed dot; `map` is the resolver's ink dot. */
  source: "host" | "map";
  dragging: boolean;
}) {
  const words =
    source === "map"
      ? "From the map's records"
      : viewer === "attendee"
        ? "Placed by the host"
        : dragging
          ? "Moving your point"
          : "Placed by you";
  return (
    <span
      data-convene="pin-chip"
      data-pin-source={source}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        alignSelf: "flex-start",
        padding: "4px 10px",
        minHeight: 28,
        borderRadius: "var(--radius-pill)",
        background: "var(--surface)",
        border: "1px solid " + (source === "host" ? "var(--c-convene)" : "var(--line)"),
        color: source === "host" ? "var(--c-convene-text)" : "var(--ink-3)",
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      {source === "host" ? <HostDot /> : <MapDot />}
      {words}
    </span>
  );
}

/** The host's point: a copper dot inside a dashed `--c-convene` ring. */
function HostDot() {
  return (
    <span
      aria-hidden
      data-pin-kind="host"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        borderRadius: "var(--radius-pill)",
        border: "1px dashed var(--c-convene)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "var(--radius-pill)",
          background: "var(--c-convene)",
        }}
      />
    </span>
  );
}

/** The map's own point: an ink dot, no ring, a `--line` hairline. They never read the same. */
function MapDot() {
  return (
    <span
      aria-hidden
      data-pin-kind="map"
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "var(--radius-pill)",
        background: "var(--ink)",
        border: "1px solid var(--line)",
        boxSizing: "border-box",
      }}
    />
  );
}

/**
 * The instruction beside the plate. Input mode changes the words in two states only, `Map shown,
 * pin unplaced` and `Pin being dragged`; everywhere else it changes hit behaviour and not copy
 * (P4-SPEC section 5).
 */
function instructionFor(p: ConvenePlateProps): string {
  const touch = p.mode === "touch";
  if (p.hostPoint && p.dragging)
    return touch ? "Keep dragging. Lift your finger to place it." : "Release to place it.";
  if (p.hostPoint && p.mapPoint)
    return "Ink is the point the map holds. Copper, ringed, is the point you placed.";
  if (p.hostPoint) return "You placed this point. People see it as your own, not as the map's.";
  if (p.nothingFound) return "The map has no record here, so the point is yours to place.";
  if (p.area) return "This point is the area the map matched, not the venue.";
  if (p.mapPoint) return "This point is the map's. If it is not your venue, place your own.";
  return touch
    ? "Press the map where the venue is, then drag to adjust."
    : "Click the map where the venue is, or drag the pin.";
}

/** The pin's act, by state (P4-SPEC section 5). It is also the keyboard path onto the plate. */
function actFor(p: ConvenePlateProps): string {
  if (p.hostPoint) return "Move the pin";
  if (p.mapPoint && !p.area) return "Place it yourself";
  return "Place the pin";
}

const clamp = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export function ConvenePlate(props: ConvenePlateProps) {
  const { areaName, mapPoint, hostPoint, dragging, onPlace, onDragging } = props;
  const plate = useRef<HTMLDivElement>(null);

  const pointAt = (clientX: number, clientY: number): HostPoint | null => {
    const el = plate.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { x: clamp((clientX - r.left) / r.width), y: clamp((clientY - r.top) / r.height) };
  };

  return (
    <div
      data-convene="map-plate"
      data-pin-state={
        hostPoint ? (dragging ? "dragging" : "placed") : mapPoint ? "map" : "unplaced"
      }
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      <div
        ref={plate}
        data-convene="plate-grid"
        role="group"
        aria-label="Where the venue is on the map"
        style={GRID}
        onPointerDown={(e) => {
          const p = pointAt(e.clientX, e.clientY);
          if (!p) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          onDragging(true);
          onPlace(p);
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          const p = pointAt(e.clientX, e.clientY);
          if (p) onPlace(p);
        }}
        onPointerUp={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
          onDragging(false);
        }}
        onPointerCancel={() => onDragging(false)}
        // The capture is what makes a release outside the plate still arrive here. If it is lost
        // some other way — the element re-rendering under the drag when a lookup settles — the
        // drag has to end anyway, or the chip reads `Moving your point` for a point nobody is
        // moving.
        onLostPointerCapture={() => onDragging(false)}
      >
        {areaName && (
          <span
            data-convene="plate-area"
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              padding: "3px 9px",
              borderRadius: "var(--radius-pill)",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              color: "var(--ink-2)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {areaName}
          </span>
        )}
        {/* The map's own point. The plate carries no projection, so this sits at the centre as the
            token for "the map holds a point" and never as where that point is. */}
        {mapPoint && (
          <span
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <MapDot />
          </span>
        )}
        {hostPoint && (
          <span
            style={{
              position: "absolute",
              left: hostPoint.x * 100 + "%",
              top: hostPoint.y * 100 + "%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <HostDot />
          </span>
        )}
      </div>
      {/* The plate's own line, in the unplaced state (P4-SPEC section 5). */}
      {!hostPoint && !mapPoint && (
        <div data-convene="plate-line" style={QUIET}>
          No point yet. Map tiles come from the provider in the built surface.
        </div>
      )}
      {(hostPoint || mapPoint) && (
        <PinChip
          viewer={props.viewer}
          source={hostPoint ? "host" : "map"}
          dragging={!!hostPoint && dragging}
        />
      )}
      <div data-convene="pin-instruction" style={QUIET}>
        {instructionFor(props)}
      </div>
      <Button
        variant="secondary"
        size="sm"
        data-convene="pin-act"
        style={{ alignSelf: "flex-start" }}
        onClick={() => onPlace(hostPoint ?? { x: 0.5, y: 0.5 })}
      >
        {actFor(props)}
      </Button>
    </div>
  );
}
