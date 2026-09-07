// The quick-look route body (ruling 85, SPEC section 4): the same PostCard with the Feed anatomy
// and no onReadMore inside PostOverlay, layered over Feed. Seeded from the Feed cache when the post
// is already there; otherwise read by id under RLS. Dismiss is history.back() when opened from
// Feed, else a navigation to Feed. Production addition: while open, the page's own scroll is locked
// so Feed beneath keeps its position (the prototype's frame scroller does this by construction).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PostCardRouter } from "@/components/dna/PostCardRouter";
import { PostOverlay } from "@/components/strand/PostOverlay";
import { Toast } from "@/components/strand/Toast";
import type { Member } from "@/lib/auth";
import { loadMarks, loadPost, setReacted, setSaved } from "@/lib/feed";
import { lensSearch, parseLens } from "@/lib/lens";
import { consumeOpenedFromFeed } from "@/lib/overlay";
import type { PostView } from "@/lib/post-view";
import { useTier } from "@/lib/tier";
import { toastStyle, useShare } from "./FeedSurface";

export function PostQuickLook({ member, id }: { member: Member; id: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();
  const tier = useTier();
  const search = useSearch({ strict: false }) as { lens?: string };
  const lens = parseLens(search.lens);
  const { share, toast } = useShare();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const cached = qc
    .getQueriesData<PostView[]>({ queryKey: ["feed", member.id] })
    .flatMap(([, data]) => data ?? [])
    .find((p) => p.id === id);
  const post = useQuery({
    queryKey: ["post", member.id, id],
    queryFn: () => loadPost(member, id),
    initialData: cached,
    staleTime: cached ? 30_000 : 0,
  });
  const marks = useQuery({
    queryKey: ["marks", member.id, id],
    queryFn: () => loadMarks(member.id, [id]),
  });
  const [local, setLocal] = useState<{ saved?: boolean; reacted?: boolean }>({});
  const saved = local.saved ?? !!marks.data?.saved.has(id);
  const reacted = local.reacted ?? !!marks.data?.reacted.has(id);
  const after = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["marks", member.id] }),
      qc.invalidateQueries({ queryKey: ["rails", member.id] }),
      qc.invalidateQueries({ queryKey: ["feed", member.id, "saved"] }),
    ]).then(() => setLocal({}));
  const onSave = () => {
    setLocal((l) => ({ ...l, saved: !saved }));
    void setSaved(member.id, id, !saved).finally(after);
  };
  const onReact = () => {
    setLocal((l) => ({ ...l, reacted: !reacted }));
    void setReacted(member.id, id, !reacted).finally(after);
  };

  const dismiss = useCallback(() => {
    if (consumeOpenedFromFeed() && window.history.length > 1) router.history.back();
    else void navigate({ to: "/feed", search: lensSearch(lens), replace: true });
  }, [router, navigate, lens]);

  return (
    <PostOverlay open onClose={dismiss} tier={tier === "expanded" ? "expanded" : "compact"}>
      {post.data ? (
        <PostCardRouter
          view={post.data}
          feed
          saved={saved}
          reacted={reacted}
          onSave={onSave}
          onReact={onReact}
          onShare={() => void share(id)}
          onAct={() => {
            const c = post.data?.c_category;
            if (c && c !== "system") void navigate({ to: "/$c", params: { c } });
          }}
        />
      ) : post.isPending ? (
        <p role="status" style={{ margin: "8px 4px", color: "var(--ink-3)", fontSize: 15 }}>
          Loading
        </p>
      ) : (
        <p data-testid="post-missing" style={{ margin: "8px 4px", color: "var(--ink-2)" }}>
          This post is not available.
        </p>
      )}
      {toast && (
        <div style={toastStyle(tier)}>
          <Toast>{toast}</Toast>
        </div>
      )}
    </PostOverlay>
  );
}
