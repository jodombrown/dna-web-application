// Loads the member's visible posts (RLS decides) and the objects they created, and maps every row to
// the PostView the card router renders. Ranking is not in this brief: newest first.
import type { C } from "@/components/strand/cmeta";
import type { FieldValues } from "@/components/strand/verb-schema";
import type { Member } from "./auth";
import type { Tables } from "./database.types";
import { signedMediaUrl } from "./dia";
import { domainOf, type PostView } from "./post-view";
import { getSupabase } from "./supabase";

const INSTRUMENT_LABEL: Record<Tables<"opportunities">["instrument"], string> = {
  time: "Time",
  skills: "Skills",
  in_kind: "In-kind",
};

function verbOf(kind: Tables<"posts">["created_object_kind"]): C | null {
  switch (kind) {
    case "connection_request":
      return "connect";
    case "event":
      return "convene";
    case "space":
      return "collaborate";
    case "opportunity":
      return "contribute";
    case "story":
      return "convey";
    default:
      return null;
  }
}

function mine(
  value: string | boolean | null | undefined,
): FieldValues[keyof FieldValues] | undefined {
  if (value == null || value === "" || value === false) return undefined;
  return { value, mine: true };
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return m + " min ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + " h ago";
  const d = Math.round(h / 24);
  return d + " d ago";
}

export async function loadFeed(member: Member, limit = 50): Promise<PostView[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: posts } = await sb
    .from("posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (!posts || posts.length === 0) return [];
  const ids = posts.map((p) => p.id);
  const by = <T extends string>(kind: T) =>
    posts.filter((p) => p.created_object_kind === kind).map((p) => p.created_object_id as string);
  const spaceIds = new Set<string>([
    ...by("space"),
    ...posts.filter((p) => p.author_kind === "space").map((p) => p.author_id),
    ...posts.filter((p) => p.anchor_kind === "space").map((p) => p.anchor_id as string),
  ]);
  const eventIds = new Set<string>([
    ...by("event"),
    ...posts.filter((p) => p.anchor_kind === "event").map((p) => p.anchor_id as string),
  ]);

  const [media, links, events, spaces, opps, reqs, stories] = await Promise.all([
    sb.from("post_media").select("*").in("post_id", ids).order("position"),
    sb.from("post_links").select("*").in("post_id", ids),
    eventIds.size
      ? sb
          .from("events")
          .select("*")
          .in("id", [...eventIds])
      : Promise.resolve({ data: [] as Tables<"events">[] }),
    spaceIds.size
      ? sb
          .from("spaces")
          .select("*")
          .in("id", [...spaceIds])
      : Promise.resolve({ data: [] as Tables<"spaces">[] }),
    by("opportunity").length
      ? sb.from("opportunities").select("*").in("id", by("opportunity"))
      : Promise.resolve({ data: [] as Tables<"opportunities">[] }),
    by("connection_request").length
      ? sb.from("connection_requests").select("*").in("id", by("connection_request"))
      : Promise.resolve({ data: [] as Tables<"connection_requests">[] }),
    by("story").length
      ? sb.from("stories").select("*").in("id", by("story"))
      : Promise.resolve({ data: [] as Tables<"stories">[] }),
  ]);

  const eventMap = new Map((events.data ?? []).map((e) => [e.id, e]));
  const spaceMap = new Map((spaces.data ?? []).map((s) => [s.id, s]));
  const oppMap = new Map((opps.data ?? []).map((o) => [o.id, o]));
  const reqMap = new Map((reqs.data ?? []).map((r) => [r.id, r]));
  const storyMap = new Map((stories.data ?? []).map((s) => [s.id, s]));

  const mediaUrls = new Map<string, string[]>();
  for (const m of media.data ?? []) {
    const url = await signedMediaUrl(m.storage_path);
    if (!url) continue;
    const list = mediaUrls.get(m.post_id) ?? [];
    list.push(url);
    mediaUrls.set(m.post_id, list);
  }
  const linkMap = new Map((links.data ?? []).map((l) => [l.post_id, l]));

  return posts.map((p): PostView => {
    const verb = verbOf(p.created_object_kind);
    const fields: FieldValues = {};
    const oid = p.created_object_id ?? "";
    if (verb === "convene") {
      const e = eventMap.get(oid);
      if (e) {
        const [date, ...rest] = e.when_text.split("\n");
        const loc =
          e.location && typeof e.location === "object" && !Array.isArray(e.location)
            ? (e.location as { text?: string }).text
            : undefined;
        Object.assign(fields, {
          title: mine(e.title),
          date: mine(date),
          time: mine(rest.join("\n")),
          place: mine(e.virtual_url ?? loc ?? undefined),
          hybrid: mine(e.mode === "hybrid"),
          ticket: mine(e.ticket_kind === "paid" ? "Paid" : "Free"),
        });
      }
    } else if (verb === "collaborate") {
      const s = spaceMap.get(oid);
      if (s) {
        const roles = Array.isArray(s.roles_sought)
          ? (s.roles_sought as unknown[]).map(String).join(", ")
          : "";
        Object.assign(fields, {
          title: mine(s.title),
          category: mine(s.category),
          roles: mine(roles),
        });
      }
    } else if (verb === "contribute") {
      const o = oppMap.get(oid);
      if (o)
        Object.assign(fields, {
          title: mine(o.title),
          instrument: mine(INSTRUMENT_LABEL[o.instrument]),
          need: mine(o.need),
          by: mine(o.by_text),
        });
    } else if (verb === "connect") {
      const r = reqMap.get(oid);
      if (r) Object.assign(fields, { who: mine(r.to_name), why: mine(r.why) });
    } else if (verb === "convey") {
      const s = storyMap.get(oid);
      if (s) Object.assign(fields, { title: mine(s.title) });
    }
    const link = linkMap.get(p.id);
    const authorSpace = p.author_kind === "space" ? spaceMap.get(p.author_id) : undefined;
    const anchorName =
      p.anchor_kind === "space"
        ? spaceMap.get(p.anchor_id ?? "")?.title
        : p.anchor_kind === "event"
          ? eventMap.get(p.anchor_id ?? "")?.title
          : undefined;
    // Member display names come from auth metadata; only the signed-in member's own name is known here.
    const authorName =
      p.author_kind === "space"
        ? (authorSpace?.title ?? "Space")
        : p.author_id === member.id
          ? member.name
          : "Member";
    return {
      id: p.id,
      c_category: p.c_category,
      verb,
      author_kind: p.author_kind === "space" ? "space" : "member",
      author_name: authorName,
      author_avatar:
        p.author_kind === "member" && p.author_id === member.id ? member.avatar : undefined,
      body: p.body,
      anchor_name: anchorName,
      audience: p.audience,
      fields,
      media: mediaUrls.get(p.id) ?? [],
      link: link
        ? {
            url: link.url,
            domain: domainOf(link.url),
            title: link.title ?? undefined,
            image: link.image_url ?? undefined,
          }
        : null,
      meta: timeAgo(p.published_at),
    };
  });
}

/** Spaces where the member holds an active role: the "Post as" dropdown (RPC re-checks server-side). */
export async function loadMemberSpaces(memberId: string): Promise<{ id: string; name: string }[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: roles } = await sb
    .from("space_roles")
    .select("space_id")
    .eq("member_id", memberId)
    .eq("status", "active");
  const ids = (roles ?? []).map((r) => r.space_id);
  if (ids.length === 0) return [];
  const { data: spaces } = await sb.from("spaces").select("id,title").in("id", ids).order("title");
  return (spaces ?? []).map((s) => ({ id: s.id, name: s.title }));
}
