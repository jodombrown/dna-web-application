// A surface may replace the expanded canvas's left rail with its own context (ruling 79; the
// profile's "In common", "See it as" and "Who sees what", SPEC section 0.1). The shell reads the
// override; the surface sets it on mount and clears it on unmount. Null means the Feed's rail.
import { useSyncExternalStore, type ReactNode } from "react";

let rail: ReactNode = null;
const listeners = new Set<() => void>();

export function setRail(node: ReactNode) {
  rail = node;
  listeners.forEach((l) => l());
}

export function useRailOverride(): ReactNode {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => rail,
    () => null,
  );
}
