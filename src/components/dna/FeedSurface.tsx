// Feed (Home), SPEC v3 section 3. Expanded: the composer control (track-shaped), the greeting, then
// the LensBar and the list; the control and the LensBar pin together as one block once the greeting
// has left the column (ruling 104). Compact and medium: the LensBar then the list; the in-flow bar
// hides (keeping its height) while the header holds the compact LensBar past 72px. Read more expands
// the same PostCard in place at /posts/:id and Show less or back collapses it; a direct landing on
// /posts/:id renders the expanded card as page content with "Back to Feed" (ruling 105). Strict
// reverse-chronological posts through the one card router, three ghost cards while loading,
// EmptyState per lens, Save and React as existence toggles (rulings 80 to 86).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PostCardRouter } from "@/components/dna/PostCardRouter";
import { Button } from "@/components/strand/Button";
import { EmptyState } from "@/components/strand/EmptyState";
import { Icon } from "@/components/strand/Icon";
import { IconButton } from "@/components/strand/IconButton";
import { LensBar } from "@/components/strand/LensBar";
import { Toast } from "@/components/strand/Toast";
import type { ComposerVerb } from "@/components/strand/cmeta";
import type { Member } from "@/lib/auth";
import { openComposer } from "@/lib/composer-store";
import { loadFeed, loadMarks, loadPost, setReacted, setSaved } from "@/lib/feed";
import type { FeedView } from "@/lib/feed-view";
import { LENSES, lensSearch, parseLens, type LensId } from "@/lib/lens";
import type { PostView } from "@/lib/post-view";
import { useShellScroll } from "@/lib/shell-scroll";
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

function greetingFor(name: string, now: Date) {
  const hr = now.getHours();
  const first = name.split(/\s+/)[0] || name;
  const part = hr < 12 ? "Good morning, " : hr < 18 ? "Good afternoon, " : "Good evening, ";
  const today = now
    .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    .replace(",", "");
  return { greeting: part + first + ".", today };
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function FeedSurface({ member, view }: { member: Member; view: FeedView }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const tier = useTier();
  const expandedTier = tier === "expanded";
  const search = useSearch({ strict: false }) as { lens?: string };
  const lens = parseLens(search.lens);
  const { share, toast: shareToast } = useShare();
  const { scrollerRef, scrolled } = useShellScroll();

  // Expanded: the composer control pins once the greeting has fully left the column's own viewport
  // (IntersectionObserver, root = the column, threshold 0). It releases only once the greeting
  // re-emerges beneath the pinned control (a second observer whose root is inset by the control's
  // measured height), so a lens change that lands the new list exactly beneath the pinned block
  // (ruling 109) leaves the greeting under the control without unpinning. Toggling only position,
  // ground and z-index (never the wrapper's size) keeps the boundary free of layout feedback.
  const greetRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const g = greetRef.current;
    const root = scrollerRef.current;
    if (!g || !root || !expandedTier) {
      setStuck(false);
      return;
    }
    const pillH = pillRef.current?.offsetHeight ?? 80;
    const leave = new IntersectionObserver(
      ([e]) => {
        if (e && !e.isIntersecting) setStuck(true);
      },
      { root, threshold: 0 },
    );
    const back = new IntersectionObserver(
      ([e]) => {
        if (e && e.isIntersecting) setStuck(false);
      },
      { root, threshold: 0, rootMargin: `-${pillH + 2}px 0px 0px 0px` },
    );
    leave.observe(g);
    back.observe(g);
    return () => {
      leave.disconnect();
      back.disconnect();
    };
  }, [expandedTier, scrollerRef, view.kind]);

  const listMode = view.kind !== "direct";
  const feed = useQuery({
    queryKey: ["feed", member.id, lens],
    queryFn: () => loadFeed(member, lens),
    enabled: listMode,
  });
  const posts = listMode ? feed.data : undefined;
  // In-place expansion needs the post in this list; otherwise the direct view carries it.
  const directId =
    view.kind === "direct"
      ? view.id
      : view.kind === "expanded" && posts && !posts.some((p) => p.id === view.id)
        ? view.id
        : null;
  const expandedId = view.kind === "expanded" && !directId ? view.id : null;
  const cached = directId
    ? qc
        .getQueriesData<PostView[]>({ queryKey: ["feed", member.id] })
        .flatMap(([, data]) => data ?? [])
        .find((p) => p.id === directId)
    : undefined;
  const single = useQuery({
    queryKey: ["post", member.id, directId ?? ""],
    queryFn: () => loadPost(member, directId ?? ""),
    enabled: !!directId,
    initialData: cached,
    staleTime: cached ? 30_000 : 0,
  });

  const ids = (directId ? [directId] : (posts ?? []).map((p) => p.id)).filter(
    (i): i is string => !!i,
  );
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

  // Lens selection is a history entry (?lens=). Selecting from the pinned bar or the header slot
  // never moves the bar: on expanded the column scrolls so the first item of the new list sits
  // exactly beneath the pinned block, offset by the block's measured height (ruling 109); on compact
  // and medium the scroller is set just below the hidden in-flow bar so the header stays in lens mode.
  const anchorRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const setLens = (id: LensId) => {
    void navigate({ to: "/feed", search: lensSearch(id), resetScroll: false });
  };
  const placeRef = useRef<{ lens: LensId; stuck: boolean; scrolled: boolean }>({
    lens,
    stuck,
    scrolled,
  });
  placeRef.current.stuck = stuck;
  placeRef.current.scrolled = scrolled;
  useIsoLayoutEffect(() => {
    if (placeRef.current.lens === lens) return;
    placeRef.current.lens = lens;
    const a = anchorRef.current;
    const sc = scrollerRef.current;
    if (!a || !sc) return;
    if (expandedTier) {
      const list = listRef.current;
      if (placeRef.current.stuck && list) {
        // The block's extent is measured live: control wrapper plus the LensBar wrapper as pinned.
        const blockBottom = a.getBoundingClientRect().bottom - sc.getBoundingClientRect().top;
        sc.scrollTop = Math.max(0, Math.round(list.offsetTop - blockBottom));
      }
    } else if (placeRef.current.scrolled) {
      sc.scrollTop = a.offsetTop + a.offsetHeight;
    }
  }, [lens, expandedTier, scrollerRef]);

  // Read more expands in place: a pushState to /posts/:id carrying fromFeed, scroll untouched.
  const openPost = (id: string) => {
    void navigate({
      to: "/posts/$id",
      params: { id },
      search: lensSearch(lens),
      resetScroll: false,
      state: { fromFeed: true },
    });
  };
  // Show less pops the entry the expansion pushed; a landing without that entry returns to Feed.
  const collapse = () => {
    if (view.kind === "expanded" && window.history.length > 1) router.history.back();
    else void navigate({ to: "/feed", search: lensSearch(lens), replace: true });
  };
  const goFeed = () => {
    const sc = scrollerRef.current;
    if (sc) sc.scrollTop = 0;
    void navigate({ to: "/feed", search: lensSearch(lens) });
  };
  useEffect(() => {
    if (!expandedId || !(view.kind === "expanded" && view.reveal)) return;
    const card = listRef.current?.querySelector<HTMLElement>(
      `[data-post-id="${CSS.escape(expandedId)}"]`,
    );
    card?.scrollIntoView({ block: "nearest" });
  }, [expandedId, view]);
  const warmPost = (p: PostView) => {
    if (!expandedTier || !p.id) return;
    const id = p.id;
    void qc.prefetchQuery({
      queryKey: ["post", member.id, id],
      queryFn: () => loadPost(member, id),
      staleTime: 30_000,
    });
  };
  const compose = (verb: ComposerVerb) => openComposer({ host: COMPOSER_HOST, initialVerb: verb });
  const act = (c: ComposerVerb) => (
    <Button c={c} onClick={() => compose(c)}>
      Share a Story
    </Button>
  );
  const firstName = member.name.split(/\s+/)[0] || member.name;
  const empty =
    lens === "network"
      ? {
          c: "connect" as const,
          title: "Nobody in your network yet.",
          // Ruling 418: the action leaves the composer (ruling 400) and goes to Connect.
          body: "Posts from your connections appear here.",
          action: (
            <Button c="connect" onClick={() => void navigate({ to: "/connect", search: {} })}>
              Find people on Connect
            </Button>
          ),
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

  const { greeting, today } = greetingFor(member.name, new Date());
  const scope = LENSES.find((l) => l.id === lens)?.scope;
  const cardFor = (p: PostView, opts: { expanded: boolean; inPlace: boolean }) => {
    const id = p.id ?? "";
    const href = router.buildLocation({
      to: "/posts/$id",
      params: { id },
      search: lensSearch(lens),
    }).href;
    return (
      <div key={id} data-post-id={id}>
        <PostCardRouter
          view={p}
          feed
          saved={savedOf(id)}
          reacted={reactedOf(id)}
          onSave={() => toggle("saved", id)}
          onReact={() => toggle("reacted", id)}
          onShare={() => void share(id)}
          onRespond={opts.inPlace && !opts.expanded ? () => openPost(id) : undefined}
          onClick={opts.inPlace ? () => openPost(id) : undefined}
          onAct={() => {
            if (p.c_category !== "system")
              void navigate({ to: "/$c", params: { c: p.c_category } });
          }}
          readMoreHref={opts.inPlace ? href : undefined}
          onReadMore={
            opts.inPlace
              ? (e) => {
                  const me = e as unknown as {
                    metaKey?: boolean;
                    ctrlKey?: boolean;
                    shiftKey?: boolean;
                  };
                  if (me.metaKey || me.ctrlKey || me.shiftKey) return;
                  e.preventDefault();
                  openPost(id);
                }
              : undefined
          }
          onReadMoreIntent={opts.inPlace ? () => warmPost(p) : undefined}
          expanded={opts.expanded}
          onCollapse={opts.inPlace && opts.expanded ? collapse : undefined}
        />
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} data-feed>
      {directId ? (
        <div
          data-direct-post={directId}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            paddingTop: expandedTier ? 24 : 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              minHeight: 44,
              margin: "-8px 0 0 -10px",
            }}
          >
            <IconButton name="arrow-left" label="Back to Feed" onClick={goFeed} />
            <button
              type="button"
              onClick={goFeed}
              data-testid="back-to-feed"
              style={{
                all: "unset",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 500,
                color: "var(--ink)",
                minHeight: 44,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Back to Feed
            </button>
          </div>
          {single.data ? (
            cardFor(single.data, { expanded: true, inPlace: false })
          ) : single.isPending ? (
            <p role="status" style={{ margin: "8px 4px", color: "var(--ink-3)", fontSize: 15 }}>
              Loading
            </p>
          ) : (
            <p data-testid="post-missing" style={{ margin: "8px 4px", color: "var(--ink-2)" }}>
              This post is not available.
            </p>
          )}
        </div>
      ) : (
        <>
          {expandedTier && (
            <>
              <div
                ref={pillRef}
                data-compose-wrap
                data-stuck={stuck ? "1" : "0"}
                style={{
                  position: stuck ? "sticky" : "static",
                  top: 0,
                  zIndex: stuck ? 6 : undefined,
                  background: stuck ? "var(--bg)" : "transparent",
                  padding: "24px 0 12px",
                  marginBottom: -12,
                }}
              >
                <button
                  type="button"
                  onClick={() => openComposer({ host: COMPOSER_HOST })}
                  aria-label="Open the composer"
                  data-testid="compose"
                  style={{
                    all: "unset",
                    boxSizing: "border-box",
                    cursor: "text",
                    width: "100%",
                    minHeight: 44,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "0 14px",
                    background: "var(--bg-sunken)",
                    borderRadius: "var(--radius-m)",
                    color: "var(--ink-3)",
                    fontSize: 15,
                  }}
                >
                  <Icon name="pen-line" size={16} />
                  <span>What is going on with you?</span>
                </button>
              </div>
              <div
                ref={greetRef}
                data-greeting
                style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 0 4px" }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 400,
                    fontSize: 26,
                    lineHeight: 1.2,
                  }}
                >
                  {greeting}
                </span>
                <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{today}</span>
              </div>
            </>
          )}
          <div
            ref={anchorRef}
            data-lens-anchor
            data-stuck={expandedTier ? (stuck ? "1" : "0") : undefined}
            style={
              expandedTier
                ? {
                    position: "sticky",
                    top: stuck ? 80 : 0,
                    zIndex: 5,
                    background: "var(--bg)",
                    padding: "12px 0",
                    margin: "-12px 0",
                    boxShadow: "0 -12px 0 0 var(--bg)",
                  }
                : {
                    visibility: scrolled ? "hidden" : "visible",
                    // Tall enough that "just below the bar" is past the 72px header swap.
                    minHeight: 64,
                  }
            }
          >
            <LensBar
              lenses={LENSES}
              value={lens}
              onChange={setLens}
              scope={scope}
              labels={expandedTier}
              collapsed={expandedTier ? stuck : scrolled}
            />
          </div>
          <div ref={listRef} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {posts === undefined && <Ghosts />}
            {posts && posts.length === 0 && (
              <div data-testid="feed-empty" data-lens={lens}>
                <EmptyState
                  c={empty.c}
                  title={empty.title}
                  body={empty.body}
                  action={empty.action}
                />
              </div>
            )}
            {posts &&
              posts.map((p) => cardFor(p, { expanded: p.id === expandedId, inPlace: true }))}
          </div>
        </>
      )}
      {shareToast && (
        <div style={toastStyle(tier)}>
          <Toast>{shareToast}</Toast>
        </div>
      )}
    </div>
  );
}
