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
  /** The event's id: the expanded card's hook into its page (Brief 10, ruling 1023). */
  id: string;
  cancelled: boolean;
  past: boolean;
  /** The cancelled card's body: the fact and the host's reason verbatim (SPEC 2). */
  cancelledBody: string | null;
  space: { id: string; name: string } | null;
  /** Brief 10 (679): the accepted speakers, from `event_speakers`, for the card's row. */
  speakers: EventSpeakerView[];
  /**
   * Handoff 32-B (1076 to 1079, 1099): what Discovery's fixed-size face reads beside the meta line,
   * from the same rows the meta line is built from. `when` is the meta line's own when, the viewer's
   * zone first and the event's local time second; `places` is each physical row's city in position
   * order (its place words where it names no city), empty for an online event; `family` is the
   * convene_families value, whose label comes from the vocabulary. `startsAt` is the row's own
   * start, null for an event with no date yet, which has no calendar file (1097).
   */
  mode: "in_person" | "virtual" | "hybrid";
  family: string | null;
  hostId: string;
  when: string;
  startsAt: string | null;
  places: string[];
  /**
   * Addendum 4 item 1 (674, 1079, 1121): the presenter line as the event pane names it, read from
   * `event_presenters`: the latest published post's author, a member or a Space, else the host. The
   * avatar is the pane's (a member presenter's own, otherwise the host's) and the handle is a member
   * presenter's own. Null where the read answered nothing, and the line keeps the author's (416).
   */
  presenter: EventPresenterView | null;
};

export type EventPresenterView = {
  kind: "member" | "space";
  id: string;
  name: string;
  handle?: string | undefined;
  avatar?: string | undefined;
};

export type EventSpeakerView = {
  party_id: string;
  name: string;
  label: string;
  avatar?: string | undefined;
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
