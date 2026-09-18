// The backing shape every card renders from (brief section 3). Built by the composer for its
// preview and by the Feed host from database rows; both go through PostCardRouter.
import type { Audience } from "@/components/strand/AudienceSelect";
import type { C, CardC } from "@/components/strand/cmeta";
import type { FieldValues } from "@/components/strand/verb-schema";

export type LinkView = {
  url: string;
  domain?: string | undefined;
  title?: string | undefined;
  image?: string | undefined;
};

/**
 * Convene Pass 1 (P1-SPEC section 2): what the card needs of the event beyond the meta line, all of
 * it derived at read. `past` from the start or the window's end (ruling owed 5), never stored;
 * `cancelled` from status, with the sentence the card renders in place of the body; `space` only
 * when the event is linked to one (Canon 6), for the expanded card's hook row.
 */
export type EventView = {
  cancelled: boolean;
  past: boolean;
  /** The cancelled card's body: the fact and the host's reason verbatim (SPEC 2). */
  cancelledBody: string | null;
  space: { id: string; name: string } | null;
};

export type PostView = {
  id?: string | undefined;
  c_category: CardC;
  /** The verb that created an object; null for an untyped Convey post. */
  verb: C | null;
  author_kind: "member" | "space";
  author_name: string;
  /** Ruling 416: the handle line under the name, only when the viewer may see the core row. */
  author_handle?: string | undefined;
  author_avatar?: string | undefined;
  body: string;
  anchor_name?: string | undefined;
  audience: Audience;
  fields: FieldValues;
  /** Image URLs (signed or object URLs), at most four. */
  media: string[];
  link?: LinkView | null | undefined;
  meta?: string | undefined;
  /** Present on a Convene card (created object of kind event). */
  event?: EventView | undefined;
};

export function domainOf(url: string): string {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : "https://" + url).hostname.replace(
      /^www\./,
      "",
    );
  } catch {
    return url;
  }
}
