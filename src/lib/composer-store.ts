// One composer shell mounted at the app root, opened from any surface through this store (ruling 56).
import { useSyncExternalStore } from "react";
import type { ComposerSeed } from "@/components/strand/Composer";
import type { C } from "@/components/strand/cmeta";

export type ComposerAnchor = {
  kind: "space" | "event" | "member" | "opportunity";
  id: string;
  name: string;
};

export type ComposerRequest = {
  anchor?: ComposerAnchor | undefined;
  initialVerb?: C | undefined;
  /** Prefilled fields (a Connect from a profile carries the member's name, Brief 3); skips the draft. */
  initial?: ComposerSeed | undefined;
  /** Host surface the composer opened from; also the draft key (one draft per member per host context). */
  host: string;
};

type State = { open: boolean; request: ComposerRequest | null; seed: number };

let state: State = { open: false, request: null, seed: 0 };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function openComposer(request: ComposerRequest) {
  state = { open: true, request, seed: state.seed + 1 };
  emit();
}

export function closeComposer() {
  if (!state.open) return;
  state = { ...state, open: false };
  emit();
}

export function useComposerState(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

/** Host context string for a request: "feed:convene", "space:{id}", "event:{id}". */
export function hostContextOf(req: ComposerRequest): string {
  if (req.anchor) return req.anchor.kind + ":" + req.anchor.id;
  return req.host;
}
