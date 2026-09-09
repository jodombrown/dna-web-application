// A surface may replace the expanded canvas's rails with its own context (ruling 79; the profile's
// "In common", "See it as" and "Who sees what", SPEC section 0.1; Connect's Filters and DIA rails,
// rulings 162, 167, 170). The shell reads the slots; the surface sets them on mount and clears them
// on unmount. Null means the shell's default rail.
//
// A slot carries the landmark's accessible name with its content. A slot whose label is null renders
// no landmark at all: the column stays reserved by a bare div with no role, name or content, so the
// reading column never shifts on a lens change (ruling 170).
//
// The surface may also ask for the lens column's ground (ruling 181): "sunken" puts the content
// column on --bg-sunken so --surface cards read as raised without a shadow.
import { useSyncExternalStore, type ReactNode } from "react";

export type RailSlot = { label: string | null; node: ReactNode } | null;
export type SurfaceGround = "sunken" | null;

type State = { left: RailSlot; right: RailSlot; ground: SurfaceGround };

let state: State = { left: null, right: null, ground: null };
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

export function setSurfaceGround(ground: SurfaceGround) {
  state = { ...state, ground };
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

export function useSurfaceGround(): SurfaceGround {
  return useSyncExternalStore(
    subscribe,
    () => state.ground,
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
