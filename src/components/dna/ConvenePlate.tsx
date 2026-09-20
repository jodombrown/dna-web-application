// Convene Pass 4, the place section's plate (P4-SPEC sections 5 and 6; rulings 790, 792, 929).
// Mounted by ConveneForm inside `data-convene="place-block"`, and kept out of that file so the form
// gains a mount rather than two hundred lines (P4-SPEC guardrail: surgical edits, the file is not
// rewritten).
//
// The plate is drawn, not fetched. A hairline grid on `--bg-sunken` with the matched area named in
// a chip, and in this build it renders no tiles and no invented geography (P4-SPEC guardrail 3).
// That has one consequence the spec does not spell out and this file will not paper over: **a
// plate with no tiles carries no projection, so a position on it is not a location.**
//
// Ruling 929 is what that consequence cost. Pass 4 shipped a host-placed pin on this plate: the
// host pressed the grid, a copper dot followed the pointer, and the fraction of the plate it landed
// on was held in the composer's `pin_x` and `pin_y`. `publish_post` read neither, because writing a
// fraction of a drawn plate into `event_delivery.lng` and `.lat` would be invented geography in the
// database. So the control named an act — `Place the pin`, `Move the pin` — and did not perform it,
// which is the defect commit `c4acd39` was written about, and the panel beside it told the host the
// pin travelled with the event when only the words did. Gap G43 is the finding. The pin is removed
// here rather than hidden: it comes back in the pass that gives this plate real tiles from the
// provider, because that is the moment a point on it becomes a coordinate.
//
// What is left is the map's own point, which does have a coordinate behind it
// (event_delivery.lng and .lat, from place-resolve). It renders at the plate's centre as the token
// for "the map holds a point", never as where that point is, and it is a mark rather than a
// control: it claims nothing the build cannot keep.
//
// Nothing here computes or renders a number: no distance, no zoom level, no coordinate, no match
// quality.
import type { CSSProperties } from "react";

export type ConvenePlateProps = {
  /** The area the map matched, named in the plate's chip. Empty renders no chip. */
  areaName: string;
  /** Whether the resolver holds a point for this place (event_delivery.lng, .lat). */
  mapPoint: boolean;
  /** The lookup found nothing for the words (P4-SPEC section 4's state). */
  nothingFound: boolean;
  /** A resolved area rather than a venue: the point is the area, not the venue. */
  area: boolean;
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
  overflow: "hidden",
};

/**
 * The chip (P4-SPEC section 6). One visual, and since 929 one reading: the point on the plate is
 * the map's own record and there is no other kind to tell it apart from. The host's readings
 * ("Placed by you", "Moving your point") went with the control that produced them.
 */
export function PinChip() {
  return (
    <span
      data-convene="pin-chip"
      data-pin-source="map"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        alignSelf: "flex-start",
        padding: "4px 10px",
        minHeight: 28,
        borderRadius: "var(--radius-pill)",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        color: "var(--ink-3)",
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <MapDot />
      {/* A straight apostrophe, as a string rather than JSX text: this is the ratified wording
          (P4-SPEC section 6) and the arm compares it exactly. */}
      {"From the map's records"}
    </span>
  );
}

/** The map's own point: an ink dot, no ring, a `--line` hairline. */
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
 * The line beside the plate. Since 929 it describes the map's point and never instructs the host to
 * place one, so there is nothing left for input mode to change: P4-SPEC section 5's two mode-varying
 * states were both host-pin states, which is why `mode` is no longer a prop.
 */
function lineFor(p: ConvenePlateProps): string {
  if (p.nothingFound) return "The map has no record here. Your words are what the event carries.";
  if (p.area) return "This point is the area the map matched, not the venue.";
  if (p.mapPoint) return "This point is the map's own record for the place you picked.";
  return "No point yet. Pick a place above and the map shows the point it holds for it.";
}

export function ConvenePlate(props: ConvenePlateProps) {
  const { areaName, mapPoint } = props;
  return (
    <div
      data-convene="map-plate"
      data-pin-state={mapPoint ? "map" : "unplaced"}
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      <div data-convene="plate-grid" style={GRID}>
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
      </div>
      {/* The plate's own line, in the unplaced state (P4-SPEC section 5). */}
      {!mapPoint && (
        <div data-convene="plate-line" style={QUIET}>
          No point yet. Map tiles come from the provider in the built surface.
        </div>
      )}
      {mapPoint && <PinChip />}
      <div data-convene="pin-instruction" style={QUIET}>
        {lineFor(props)}
      </div>
    </div>
  );
}
