// Feed (Home). LensBar wired to ?lens=, strict reverse-chronological posts through the card router
// in feed mode, honest empty states per lens, Save and React as existence toggles, Read more into
// the quick-look route with Feed's scroll position untouched (rulings 80 to 86).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PostCardRouter } from "@/components/dna/PostCardRouter";
import { Button } from "@/components/strand/Button";
import { LensBar } from "@/components/strand/LensBar";
import { Toast } from "@/components/strand/Toast";
import type { Member } from "@/lib/auth";
import { openComposer } from "@/lib/composer-store";
import { loadFeed, loadMarks, loadPost, setReacted, setSaved } from "@/lib/feed";
import { LENSES, lensSearch, parseLens, type LensId } from "@/lib/lens";
import { markOpenedFromFeed } from "@/lib/overlay";
import type { PostView } from "@/lib/post-view";
import { useTier } from "@/lib/tier";
import { COMPOSER_HOST } from "./AppShell";

const EMPTY: Record<LensId, { text: string; compose: boolean }> = {
  all: { text: "Nothing in the Feed yet. Be the first to post.", compose: true },
  "for-you": { text: "Nothing in the Feed yet. Be the first to post.", compose: true },
  "my-network": {
    text: "Nothing from your network yet. Posts from members you are connected to and Spaces you are in appear here.",
    compose: true,
  },
  mine: { text: "You have not posted yet.", compose: true },
  saved: { text: "Nothing saved yet. Save a post and it appears here.", compose: false },
};

export function useShare() {
  const [toast, setToast] = useState<string | null>(null);
  const share = async (id: string) => {
    const url = window.location.origin + "/posts/" + id;
    try {
      if (navigator.share) {
        await navigator.share({ url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast("Link copied.");
    } catch {
      setToast(url);
    }
    window.setTimeout(() => setToast(null), 2600);
  };
  return { share, toast };
}

export function FeedSurface({ member }: { member: Member }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const tier = useTier();
  const search = useSearch({ strict: false }) as { lens?: string };
  const lens = parseLens(search.lens);
  const pathname = useLocation({ select: (l) => l.pathname });
  const onFeed = pathname === "/feed";
  const { share, toast: shareToast } = useShare();

  // Feed's scroll position is captured when the quick-look route layers over it and restored
  // when the member comes back, so open and dismiss leave the Feed exactly where it was.
  const scrollAt = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!onFeed) {
      scrollAt.current = window.scrollY;
      return;
    }
    if (scrollAt.current != null) {
      const y = scrollAt.current;
      scrollAt.current = null;
      if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
    }
  }, [onFeed]);

  const feed = useQuery({
    queryKey: ["feed", member.id, lens],
    queryFn: () => loadFeed(member, lens),
  });
  const ids = (feed.data ?? []).map((p) => p.id).filter((i): i is string => !!i);
  const marks = useQuery({
    queryKey: ["marks", member.id, ids.join(",")],
    queryFn: () => loadMarks(member.id, ids),
    enabled: ids.length > 0,
  });
  const invalidateMarks = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["marks", member.id] }),
      qc.invalidateQueries({ queryKey: ["rails", member.id] }),
      lens === "saved" ? qc.invalidateQueries({ queryKey: ["feed", member.id, "saved"] }) : null,
    ]);
  const save = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => setSaved(member.id, id, on),
    onSettled: () => void invalidateMarks(),
  });
  const react = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => setReacted(member.id, id, on),
    onSettled: () => void invalidateMarks(),
  });
  const [pending, setPending] = useState<{ saved: Set<string>; reacted: Set<string> }>({
    saved: new Set(),
    reacted: new Set(),
  });
  const savedOf = (id: string) =>
    pending.saved.has(id) ? !marks.data?.saved.has(id) : !!marks.data?.saved.has(id);
  const reactedOf = (id: string) =>
    pending.reacted.has(id) ? !marks.data?.reacted.has(id) : !!marks.data?.reacted.has(id);
  useEffect(() => {
    setPending({ saved: new Set(), reacted: new Set() });
  }, [marks.data]);
  const toggle = (kind: "saved" | "reacted", id: string) => {
    const on = kind === "saved" ? !savedOf(id) : !reactedOf(id);
    setPending((p) => {
      const next = new Set(p[kind]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...p, [kind]: next };
    });
    if (kind === "saved") save.mutate({ id, on });
    else react.mutate({ id, on });
  };

  const setLens = (id: LensId) => void navigate({ to: "/feed", search: lensSearch(id) });
  const openPost = (id: string) => {
    markOpenedFromFeed();
    void navigate({
      to: "/posts/$id",
      params: { id },
      search: lensSearch(lens),
      resetScroll: false,
    });
  };
  const warmPost = (view: PostView) => {
    if (tier !== "expanded" || !view.id) return;
    const id = view.id;
    void router.preloadRoute({ to: "/posts/$id", params: { id }, search: lensSearch(lens) });
    void qc.prefetchQuery({
      queryKey: ["post", member.id, id],
      queryFn: () => loadPost(member, id),
      staleTime: 30_000,
    });
  };
  const compose = () => openComposer({ host: COMPOSER_HOST });

  const posts = feed.data;
  const empty = EMPTY[lens];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} data-feed>
      <h1
        style={{
          margin: "4px 0 0",
          fontFamily: "var(--font-display)",
          fontWeight: 400,
          fontSize: 26,
          lineHeight: 1.2,
        }}
      >
        Feed
      </h1>
      <LensBar lenses={LENSES} value={lens} onChange={setLens} compact={tier === "compact"} />
      {posts === undefined && (
        <p role="status" style={{ margin: "8px 4px", color: "var(--ink-3)", fontSize: 15 }}>
          Loading the Feed
        </p>
      )}
      {posts && posts.length === 0 && (
        <div
          data-testid="feed-empty"
          data-lens={lens}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 14,
            padding: "28px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 14,
          }}
        >
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, color: "var(--ink-2)" }}>
            {empty.text}
          </p>
          {empty.compose && (
            <Button onClick={compose} size="sm">
              Compose
            </Button>
          )}
        </div>
      )}
      {posts &&
        posts.map((p) => {
          const id = p.id ?? "";
          const href = router.buildLocation({
            to: "/posts/$id",
            params: { id },
            search: lensSearch(lens),
          }).href;
          return (
            <PostCardRouter
              key={id}
              view={p}
              mode="feed"
              saved={savedOf(id)}
              reacted={reactedOf(id)}
              onSave={() => toggle("saved", id)}
              onReact={() => toggle("reacted", id)}
              onShare={() => void share(id)}
              onRespond={() => openPost(id)}
              readMoreHref={href}
              onReadMore={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                openPost(id);
              }}
              onReadMoreIntent={() => warmPost(p)}
            />
          );
        })}
      {shareToast && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: "calc(88px + env(safe-area-inset-bottom))",
            display: "flex",
            justifyContent: "center",
            zIndex: 70,
            pointerEvents: "none",
          }}
        >
          <Toast>{shareToast}</Toast>
        </div>
      )}
    </div>
  );
}
