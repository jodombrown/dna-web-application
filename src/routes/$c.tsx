// Feed host for one C route (/connect, /convene, /collaborate, /contribute, /convey). Holds the
// composer launcher and the c keypress; every card renders through the card router.
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/dna/AppShell";
import { PUBLISHED_EVENT } from "@/components/dna/ComposerShell";
import { PostCardRouter } from "@/components/dna/PostCardRouter";
import { Avatar } from "@/components/strand/Avatar";
import { Toast } from "@/components/strand/Toast";
import { VerbChip } from "@/components/strand/VerbChip";
import { C_ORDER, type C } from "@/components/strand/cmeta";
import { useAuth } from "@/lib/auth";
import { openComposer } from "@/lib/composer-store";
import { loadFeed } from "@/lib/feed";
import type { PostView } from "@/lib/post-view";

export const Route = createFileRoute("/$c")({
  beforeLoad: ({ params }) => {
    if (!C_ORDER.includes(params.c as C)) throw notFound();
  },
  component: FeedHost,
});

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

function FeedHost() {
  const { c } = Route.useParams();
  const active = c as C;
  const { ready, member } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostView[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const host = "feed:" + active;

  useEffect(() => {
    if (ready && !member) void navigate({ to: "/sign-in" });
  }, [ready, member, navigate]);

  const refresh = useCallback(async () => {
    if (!member) return;
    setPosts(await loadFeed(member));
  }, [member]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onPublished = () => {
      setToast("Published. It is in the Feed.");
      void refresh();
      window.setTimeout(() => setToast(null), 2600);
    };
    window.addEventListener(PUBLISHED_EVENT, onPublished);
    return () => window.removeEventListener(PUBLISHED_EVENT, onPublished);
  }, [refresh]);

  // Shortcut, additive only (ruling 59): c opens the composer when focus is not in a field.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== "c" || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"][aria-label="Compose"]')) return;
      e.preventDefault();
      openComposer({ host });
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [host]);

  if (!ready || !member) return null;

  return (
    <AppShell active={active}>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <button
          type="button"
          data-testid="launcher"
          onClick={() => openComposer({ host })}
          style={{
            all: "unset",
            boxSizing: "border-box",
            cursor: "text",
            display: "flex",
            alignItems: "center",
            gap: 12,
            minHeight: 44,
            padding: "0 4px",
          }}
        >
          <Avatar name={member.name} src={member.avatar} size={36} />
          <span
            style={{ flex: 1, fontFamily: "var(--font-sans)", fontSize: 17, color: "var(--ink-3)" }}
          >
            What is going on with you?
          </span>
        </button>
        <div
          role="group"
          aria-label="Start with a verb"
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            margin: "0 -12px",
            padding: "0 12px",
            scrollbarWidth: "none",
            contain: "inline-size",
          }}
        >
          {C_ORDER.map((v) => (
            <VerbChip
              key={v}
              c={v}
              compact
              onClick={() => openComposer({ host, initialVerb: v })}
            />
          ))}
        </div>
      </div>
      {posts && posts.map((p) => <PostCardRouter key={p.id} view={p} />)}
      {toast && (
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
          <Toast>{toast}</Toast>
        </div>
      )}
    </AppShell>
  );
}
