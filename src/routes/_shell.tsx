// The shell layout route (ruling 69, 84): mounts the chrome once for Feed, the quick-look and the
// five C routes, owns the one composer mount (ruling 56, moved here from the root in Brief 2), the
// c keypress, and the published toast. Feed stays mounted beneath /posts/:id so the overlay layers
// over it with Feed's scroll position untouched (ruling 85).
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, COMPOSER_HOST } from "@/components/dna/AppShell";
import { ComposerShell, PUBLISHED_EVENT } from "@/components/dna/ComposerShell";
import { FeedSurface } from "@/components/dna/FeedSurface";
import { Toast } from "@/components/strand/Toast";
import { C_LABEL, C_ORDER, type C } from "@/components/strand/cmeta";
import { useAuth } from "@/lib/auth";
import { openComposer } from "@/lib/composer-store";

export const Route = createFileRoute("/_shell")({ component: ShellLayout });

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

function activeC(pathname: string): C | null {
  const seg = pathname.split("/")[1] ?? "";
  return (C_ORDER as string[]).includes(seg) ? (seg as C) : null;
}

function ShellLayout() {
  const { ready, member } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useLocation({ select: (l) => l.pathname });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !member) void navigate({ to: "/sign-in" });
  }, [ready, member, navigate]);

  // Publish never navigates (ruling 52): a toast, and the Feed refetches wherever it is mounted.
  useEffect(() => {
    if (!member) return;
    const onPublished = () => {
      setToast("Published. It is in the Feed.");
      void qc.invalidateQueries({ queryKey: ["feed", member.id] });
      void qc.invalidateQueries({ queryKey: ["rails", member.id] });
      window.setTimeout(() => setToast(null), 2600);
    };
    window.addEventListener(PUBLISHED_EVENT, onPublished);
    return () => window.removeEventListener(PUBLISHED_EVENT, onPublished);
  }, [member, qc]);

  // Shortcut, additive only (ruling 59): c opens the composer when focus is not in a field.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== "c" || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      openComposer({ host: COMPOSER_HOST });
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  if (!ready || !member) return null;

  const active = activeC(pathname);
  const feedFamily = pathname === "/feed" || pathname.startsWith("/posts/");
  const surface = active ? C_LABEL[active] : "Feed";

  return (
    <>
      <AppShell member={member} active={active} surface={surface}>
        {feedFamily && <FeedSurface member={member} />}
        <Outlet />
      </AppShell>
      {/* The one composer mount, owned by the shell (rulings 56, 69). */}
      <ComposerShell />
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
    </>
  );
}
