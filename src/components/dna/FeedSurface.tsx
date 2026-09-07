// Feed (Home), SPEC section 3. LensBar wired to ?lens=, strict reverse-chronological posts through
// the card router with the Feed anatomy, three ghost cards while loading, EmptyState per lens, Save
// and React as existence toggles, Read more / title / body into the quick-look route with Feed's
// scroll position untouched (rulings 80 to 86).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PostCardRouter } from "@/components/dna/PostCardRouter";
import { Button } from "@/components/strand/Button";
import { EmptyState } from "@/components/strand/EmptyState";
import { LensBar } from "@/components/strand/LensBar";
import { Toast } from "@/components/strand/Toast";
import type { C } from "@/components/strand/cmeta";
import type { Member } from "@/lib/auth";
import { openComposer } from "@/lib/composer-store";
import { loadFeed, loadMarks, loadPost, setReacted, setSaved } from "@/lib/feed";
import { LENSES, lensSearch, parseLens, type LensId } from "@/lib/lens";
import { markOpenedFromFeed } from "@/lib/overlay";
import type { PostView } from "@/lib/post-view";
import { useTier } from "@/lib/tier";
import { COMPOSER_HOST } from "./AppShell";

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

export function toastStyle(tier: "compact" | "medium" | "expanded") {
  return {
    position: "fixed" as const,
    left: 0,
    right: 0,
    bottom:
      tier === "compact"
        ? "calc(76px + env(safe-area-inset-bottom))"
        : tier === "medium"
          ? "calc(80px + env(safe-area-inset-bottom))"
          : 24,
    display: "flex",
    justifyContent: "center",
    zIndex: 70,
    pointerEvents: "none" as const,
  };
}

function Ghosts() {
  const block = (h: number, w: string) => (
    <span style={{ height: h, width: w, borderRadius: 6, background: "var(--bg-sunken)" }} />
  );
  return (
    <div
      role="status"
      aria-label="Loading Feed"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      {[1, 2, 3].map((g) => (
        <div
          key={g}
          aria-hidden="true"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 14,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span
              style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-sunken)" }}
            />
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              {block(12, "40%")}
              {block(10, "60%")}
            </span>
          </div>
          {block(18, "80%")}
          {block(12, "100%")}
          {block(12, "70%")}
        </div>
      ))}
    </div>
  );
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
  const compose = (verb: C) => openComposer({ host: COMPOSER_HOST, initialVerb: verb });
  const act = (c: C) => (
    <Button c={c} onClick={() => compose(c)}>
      {c === "connect" ? "Make an Intro" : "Share a Story"}
    </Button>
  );
  const firstName = member.name.split(/\s+/)[0] || member.name;
  const empty =
    lens === "network"
      ? {
          c: "connect" as const,
          title: "Nobody in your network yet.",
          body: "Make an intro. Posts from your connections appear here.",
          action: act("connect"),
        }
      : lens === "mine"
        ? {
            c: "convey" as const,
            title: "You have not posted yet.",
            body: "Start with what is going on with you.",
            action: act("convey"),
          }
        : lens === "saved"
          ? {
              c: "brand" as const,
              title: "Nothing saved yet.",
              body: "Use the bookmark on any post and find it here.",
              action: undefined,
            }
          : {
              c: "brand" as const,
              title: "Welcome to DNA, " + firstName + ".",
              body: "Feed fills as members post and as you connect. Start with what is going on with you.",
              action: act("convey"),
            };

  const posts = feed.data;
  const scope = LENSES.find((l) => l.id === lens)?.scope;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} data-feed>
      <LensBar lenses={LENSES} value={lens} onChange={setLens} scope={scope} />
      {posts === undefined && <Ghosts />}
      {posts && posts.length === 0 && (
        <div data-testid="feed-empty" data-lens={lens}>
          <EmptyState c={empty.c} title={empty.title} body={empty.body} action={empty.action} />
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
              feed
              saved={savedOf(id)}
              reacted={reactedOf(id)}
              onSave={() => toggle("saved", id)}
              onReact={() => toggle("reacted", id)}
              onShare={() => void share(id)}
              onRespond={() => openPost(id)}
              onClick={() => openPost(id)}
              onAct={() => {
                if (p.c_category !== "system")
                  void navigate({ to: "/$c", params: { c: p.c_category } });
              }}
              readMoreHref={href}
              onReadMore={(e) => {
                const me = e as unknown as {
                  metaKey?: boolean;
                  ctrlKey?: boolean;
                  shiftKey?: boolean;
                };
                if (me.metaKey || me.ctrlKey || me.shiftKey) return;
                e.preventDefault();
                openPost(id);
              }}
              onReadMoreIntent={() => warmPost(p)}
            />
          );
        })}
      {shareToast && (
        <div style={toastStyle(tier)}>
          <Toast>{shareToast}</Toast>
        </div>
      )}
    </div>
  );
}
