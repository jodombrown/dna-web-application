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
