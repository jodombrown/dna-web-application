// The header's lens slot (rulings 99, 107, 947), set by the surface that owns the lens rather than
// read by the shell from one surface's props. Below expanded, once the member has scrolled the
// shell's scroller past 72px, the header takes the registered LensBar in its compact rendering; with
// nothing registered it keeps the composer entry. The Feed registered nothing before handoff 31-B
// because the shell read the Feed's lens directly (`onFeed` and `LENSES` in AppShell); Discovery is
// the second surface with a header lens, so the slot moved here beside rail-store.ts and the Feed
// registers through it with no change in what it holds (1041).
//
// A surface sets the slot while it is mounted and clears it on unmount. Null means no header lens.
import { useSyncExternalStore } from "react";
import type { HeaderLensBar } from "@/components/strand/AppHeader";

let current: HeaderLensBar | null = null;
const listeners = new Set<() => void>();

export function setHeaderLens(lens: HeaderLensBar | null) {
  current = lens;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useHeaderLens(): HeaderLensBar | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
