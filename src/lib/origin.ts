// The origin an item was opened from (handoff 31-D; rulings 1063, 1065). One typed record, set in
// router history state by the surface that opens an item and read by the item's route and by the
// pane's close, so the list behind the pane is the one the member opened from and the Back row
// returns there. It rides history state and never the URL (1063): a shared link or a new tab carries
// none and opens behind the default corpus, which is the risk 1063 accepted.
//
// Discovery is the only surface that sets it today. `feed-view.ts` augments the same interface for
// the Feed's own expansion flags; declaration merging keeps the two independent.
import type { DiscoverySearch } from "./discovery-search";

/** The routes an origin can name. A surface that starts setting an origin adds its route here. */
export type OriginRoute = "/convene" | "/convene/$lens";

export type Origin = {
  /** The origin's name as the Back row reads it, never the bare word Back (396). */
  label: string;
  to: OriginRoute;
  params: { lens?: string };
  search: DiscoverySearch;
};

declare module "@tanstack/history" {
  interface HistoryState {
    /** Set by the surface that opened this item (1063, 1065). */
    origin?: Origin;
  }
}

/** The origin a cold arrival falls back to: Discovery, Convene's front door (628, 1047). */
export const DISCOVERY_ORIGIN: Origin = {
  label: "Discovery",
  to: "/convene",
  params: {},
  search: {},
};
