// The feed read. Rows come from the `feed` view (security_invoker over posts, so the audience
// predicate is RLS on posts, never a client filter) in strict reverse-chronological order (ruling
// 80). Lens filters are PostgREST predicates on that view. Every row is mapped to the PostView the
// card router renders; the composer preview and the Feed share that one shape.
import type { C } from "@/components/strand/cmeta";
import type { FieldValues } from "@/components/strand/verb-schema";
import type { Member } from "./auth";
import type { Tables, Views } from "./database.types";
import { signedMediaUrl } from "./dia";
import type { LensId } from "./lens";
import { domainOf, type PostView } from "./post-view";
import { getSupabase, type Supabase } from "./supabase";
import { whenLabel } from "./when";

type FeedRow = Views<"feed">;
type PostRow = Tables<"posts">;

const INSTRUMENT_LABEL: Record<Tables<"opportunities">["instrument"], string> = {
  time: "Time",
  skills: "Skills",
  in_kind: "In-kind",
};

function verbOf(kind: PostRow["created_object_kind"]): C | null {
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

/** The view's columns are nullable in the generated types; a published row always has these. */
function asPost(r: FeedRow): PostRow | null {
  if (!r.id || !r.author_kind || !r.author_id || !r.created_by || !r.c_category) return null;
  return {
    id: r.id,
    author_kind: r.author_kind,
    author_id: r.author_id,
    created_by: r.created_by,
    c_category: r.c_category,
    body: r.body ?? "",
    anchor_kind: r.anchor_kind,
    anchor_id: r.anchor_id,
    created_object_kind: r.created_object_kind,
    created_object_id: r.created_object_id,
    audience: r.audience ?? "everyone",
    status: r.status ?? "published",
    published_at: r.published_at,
    created_at: r.created_at ?? r.published_at ?? new Date().toISOString(),
  };
}

/** Resolve the created objects, media and links for a page of posts and map them to PostViews. */
export async function hydratePosts(
  sb: Supabase,
  member: Member,
  posts: PostRow[],
): Promise<PostView[]> {
  if (posts.length === 0) return [];
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
      // The meta line is the absolute time; city and zone arrive with member profiles.
      meta: whenLabel(p.published_at),
    };
  });
}

/** Ids of members with an accepted connection to this member, and Spaces where they hold an active role. */
async function networkIds(sb: Supabase, memberId: string) {
  const [{ data: conns }, { data: roles }] = await Promise.all([
    sb
      .from("connection_requests")
      .select("from_member_id,to_member_id")
      .eq("status", "accepted")
      .or(`from_member_id.eq.${memberId},to_member_id.eq.${memberId}`),
    sb.from("space_roles").select("space_id").eq("member_id", memberId).eq("status", "active"),
  ]);
  const members = new Set<string>();
  for (const c of conns ?? []) {
    const other = c.from_member_id === memberId ? c.to_member_id : c.from_member_id;
    if (other) members.add(other);
  }
  return { members: [...members], spaces: (roles ?? []).map((r) => r.space_id) };
}

const inList = (ids: string[]) => "(" + ids.map((i) => '"' + i + '"').join(",") + ")";

/** The Feed for one lens: the `feed` view (RLS-visible, newest first) with the lens as a server-side predicate. */
export async function loadFeed(
  member: Member,
  lens: LensId = "all",
  limit = 50,
): Promise<PostView[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let q = sb.from("feed").select("*");
  if (lens === "mine") {
    q = q.or(`author_id.eq.${member.id},created_by.eq.${member.id}`);
  } else if (lens === "network") {
    const { members, spaces } = await networkIds(sb, member.id);
    if (members.length === 0 && spaces.length === 0) return [];
    const parts: string[] = [];
    if (members.length) parts.push(`and(author_kind.eq.member,author_id.in.${inList(members)})`);
    if (spaces.length) parts.push(`and(author_kind.eq.space,author_id.in.${inList(spaces)})`);
    q = q.or(parts.join(","));
  } else if (lens === "saved") {
    const { data: saves } = await sb
      .from("post_saves")
      .select("post_id")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    const ids = (saves ?? []).map((s) => s.post_id);
    if (ids.length === 0) return [];
    q = q.in("id", ids);
  }
  const { data } = await q
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  const posts = (data ?? []).map(asPost).filter((p): p is PostRow => p !== null);
  return hydratePosts(sb, member, posts);
}

/** One post by id, under the caller's posts RLS. Null when it does not exist or is not visible. */
export async function loadPost(member: Member, id: string): Promise<PostView | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from("feed").select("*").eq("id", id).maybeSingle();
  const post = data ? asPost(data) : null;
  if (!post) return null;
  const [view] = await hydratePosts(sb, member, [post]);
  return view ?? null;
}

/** The member's own save and react state for a set of posts: existence only, never a count. */
export async function loadMarks(
  memberId: string,
  postIds: string[],
): Promise<{ saved: Set<string>; reacted: Set<string> }> {
  const sb = getSupabase();
  const saved = new Set<string>();
  const reacted = new Set<string>();
  if (!sb || postIds.length === 0) return { saved, reacted };
  const [s, r] = await Promise.all([
    sb.from("post_saves").select("post_id").eq("member_id", memberId).in("post_id", postIds),
    sb.from("post_reactions").select("post_id").eq("member_id", memberId).in("post_id", postIds),
  ]);
  for (const row of s.data ?? []) saved.add(row.post_id);
  for (const row of r.data ?? []) reacted.add(row.post_id);
  return { saved, reacted };
}

export async function setSaved(memberId: string, postId: string, on: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  if (on) {
    const { error } = await sb.from("post_saves").insert({ member_id: memberId, post_id: postId });
    if (error && error.code !== "23505") throw error;
  } else {
    const { error } = await sb
      .from("post_saves")
      .delete()
      .eq("member_id", memberId)
      .eq("post_id", postId);
    if (error) throw error;
  }
}

export async function setReacted(memberId: string, postId: string, on: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  if (on) {
    const { error } = await sb
      .from("post_reactions")
      .insert({ member_id: memberId, post_id: postId });
    if (error && error.code !== "23505") throw error;
  } else {
    const { error } = await sb
      .from("post_reactions")
      .delete()
      .eq("member_id", memberId)
      .eq("post_id", postId);
    if (error) throw error;
  }
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
