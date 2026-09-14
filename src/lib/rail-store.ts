// A surface may replace the expanded canvas's rails with its own context (ruling 79; the profile's
// "In common", "See it as" and "Who sees what", SPEC section 0.1; Connect's Filters and DIA rails,
// rulings 162, 167, 170). The shell reads the slots; the surface sets them on mount and clears them
// on unmount. Null means the shell's default rail.
//
// A slot carries the landmark's accessible name with its content. A slot whose label is null renders
// no landmark at all: the column stays reserved by a bare div with no role, name or content, so the
// reading column never shifts on a lens change (ruling 170).
//
// The surface may also ask the shell for the content column's own padding: "inset" is Connect's
// 0/24/48 (Connect SPEC 2) in place of the Feed's zero-inset column with its tall bottom pad.
//
// This axis used to be a ground colour, `setSurfaceGround("sunken")` under ruling 181, and the
// shell read it for two unrelated things: the column's background AND that padding. Ruling 590
// revokes 181, so the colour half is gone and Connect's column sits on --bg like every other list
// surface. The padding half is Connect's own layout and outlives 181, so the axis is named for
// what is left of it rather than deleted with the colour (ruling 555: the mechanism is what the
// tree holds, not what a name remembers).
import { useSyncExternalStore, type ReactNode } from "react";

export type RailSlot = { label: string | null; node: ReactNode } | null;
export type ColumnPad = "inset" | null;

type State = { left: RailSlot; right: RailSlot; pad: ColumnPad };

let state: State = { left: null, right: null, pad: null };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Brief 3 form: replace the left rail's content under the shell's default landmark name. */
export function setRail(node: ReactNode) {
  state = { ...state, left: node ? { label: "Your quick state", node } : null };
  emit();
}

export function setLeftRail(slot: RailSlot) {
  state = { ...state, left: slot };
  emit();
}

export function setRightRail(slot: RailSlot) {
  state = { ...state, right: slot };
  emit();
}

export function setColumnPad(pad: ColumnPad) {
  state = { ...state, pad };
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useLeftRail(): RailSlot {
  return useSyncExternalStore(
    subscribe,
    () => state.left,
    () => null,
  );
}

export function useRightRail(): RailSlot {
  return useSyncExternalStore(
    subscribe,
    () => state.right,
    () => null,
  );
}

export function useColumnPad(): ColumnPad {
  return useSyncExternalStore(
    subscribe,
    () => state.pad,
    () => null,
  );
}

/** Kept for the profile: the left override's content, or null for the Feed's rail. */
export function useRailOverride(): ReactNode {
  return useSyncExternalStore(
    subscribe,
    () => state.left?.node ?? null,
    () => null,
  );
}
