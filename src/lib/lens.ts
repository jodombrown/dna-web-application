// Feed lenses (rulings 81, 83). Selection lives in ?lens= (omitted for all), survives refresh and
// the back button. for-you renders identically to all until a real personalization signal exists.
import type { Lens } from "@/components/strand/LensBar";

export type LensId = "all" | "for-you" | "network" | "mine" | "saved";

export const LENS_IDS: LensId[] = ["all", "for-you", "network", "mine", "saved"];

export const LENSES: (Lens<LensId> & { scope: string })[] = [
  { id: "all", label: "All", scope: "Everything you can see, newest first." },
  {
    id: "for-you",
    label: "For You",
    icon: "circle-dot",
    scope: "Same as All until DIA has a real signal to work from.",
  },
  {
    id: "network",
    label: "My Network",
    icon: "users",
    scope: "Posts from your connections, newest first.",
  },
  { id: "mine", label: "Mine", icon: "pen-line", scope: "Your own posts." },
  { id: "saved", label: "Saved", icon: "bookmark", scope: "Posts you saved." },
];

export function parseLens(v: unknown): LensId {
  return typeof v === "string" && (LENS_IDS as string[]).includes(v) ? (v as LensId) : "all";
}

/** Search object for a lens: {} for all so the URL stays clean. */
export function lensSearch(lens: LensId): { lens?: LensId } {
  return lens === "all" ? {} : { lens };
}

export type FeedSearch = { lens?: LensId };

/** validateSearch for /feed and /posts/:id: only a known lens survives, and all is omitted. */
export function validateLens(search: Record<string, unknown>): FeedSearch {
  const v = search["lens"];
  return typeof v === "string" && (LENS_IDS as string[]).includes(v) && v !== "all"
    ? { lens: v as LensId }
    : {};
}
