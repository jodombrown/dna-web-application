// The one shell, mounted once at the app root by the _shell layout route (ruling 69): AppHeader as
// one row (five Cs inline plus the Home icon on expanded; composer entry or LensBar in the centre
// slot on compact and medium, rulings 99, 107), the dock on compact and medium (ruling 100), and the
// expanded canvas as three independent scroll containers (ruling 104). Matches B2-Shell-Feed-v3
// SPEC.md sections 1 and 2. The document never scrolls inside the shell: every tier scrolls its own
// Feed column, and the 72px header swap plus the 2.5s floating composer entry read that scroller.
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { AppHeader } from "@/components/strand/AppHeader";
import { Button } from "@/components/strand/Button";
import { Icon } from "@/components/strand/Icon";
import { PulseDock } from "@/components/strand/PulseDock";
import { Switch } from "@/components/strand/Switch";
import type { C } from "@/components/strand/cmeta";
import { LeftRail, RightRail } from "@/components/dna/Rails";
import { NotificationPanel } from "@/components/dna/NotificationPanel";
import type { Member } from "@/lib/auth";
import { openComposer, useComposerState } from "@/lib/composer-store";
import type { FeedView } from "@/lib/feed-view";
import { LENSES, type LensId } from "@/lib/lens";
import { useLeftRail, useRightRail, useSurfaceGround } from "@/lib/rail-store";
import { ShellScrollProvider, useScrollState } from "@/lib/shell-scroll";
import { getSupabase } from "@/lib/supabase";
import { useTheme, useTier, useWide } from "@/lib/tier";

export const COMPOSER_HOST = "feed";

/** Popover chrome shared by the expanded notification list and the account panel (SPEC section 6). */
export const POPOVER_STYLE = {
  position: "fixed" as const,
  top: 60,
  right: 32,
  width: 380,
  maxHeight: 560,
  zIndex: 50,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 14,
  boxShadow: "var(--shadow-stack)",
  display: "flex",
  flexDirection: "column" as const,
  overflow: "hidden",
  animation: "strand-fade var(--dur-base) var(--ease)",
};

const DRAG_OPEN_PX = 24;

export function AppShell({
  member,
  active,
  homeActive,
  feedView,
  lens,
  onLens,
  closeKey,
  children,
}: {
  member: Member;
  /** The C whose route is showing; null on Feed (Home) and /posts/:id. */
  active: C | null;
  homeActive: boolean;
  /** What the Feed column shows; null on a C route. */
  feedView: FeedView | null;
  lens: LensId;
  onLens: (lens: LensId) => void;
  /** Changes on route change or composer open; open panels close (prototype behaviour). */
  closeKey: string;
  children: ReactNode;
}) {
  const tier = useTier();
  const wide = useWide();
  const navigate = useNavigate();
  const router = useRouter();
  const [theme, setTheme] = useTheme();
  const [account, setAccount] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const composer = useComposerState();
  const leftRail = useLeftRail();
  const rightRail = useRightRail();
  // Brief 4 (ruling 181): a surface may ask for the lens column to sit on --bg-sunken.
  const sunken = useSurfaceGround() === "sunken";
  const expanded = tier === "expanded";
  const compact = tier === "compact";
  const scrollerRef = useRef<HTMLElement | null>(null);
  // A stable ref callback: an inline one is detached (null) during every commit and re-attached
  // after the children's layout effects, which would leave the Feed's placement effect without
  // its scroller on a lens change.
  const attachScroller = useCallback((el: HTMLElement | null) => {
    scrollerRef.current = el;
  }, []);
  const { scrolled, moving, onScroll, scrollToTop } = useScrollState(scrollerRef);
  // Proof the shell mounted once: the stamp is set on mount and never changes across routes.
  const mounted = useRef<string>("");
  if (!mounted.current) mounted.current = String(Date.now());
  useEffect(() => {
    document.documentElement.setAttribute("data-shell", mounted.current);
  }, []);
  useEffect(() => {
    setAccount(false);
  }, [closeKey]);
  useEffect(() => {
    if (!account) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccount(false);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [account]);

  const go = (c: C) => {
    setAccount(false);
    void navigate({ to: "/$c", params: { c } });
  };
  const warm = (c: C) => void router.preloadRoute({ to: "/$c", params: { c } });
  const homeHref = router.buildLocation({ to: "/feed", search: {} }).href;
  const goHome = () => {
    setAccount(false);
    scrollToTop();
    void navigate({ to: "/feed", search: {} });
  };
  const compose = () => {
    setAccount(false);
    openComposer({ host: COMPOSER_HOST });
  };
  const signOut = async () => {
    await getSupabase()?.auth.signOut();
    void navigate({ to: "/sign-in" });
  };

  // The floating composer entry (ruling 107): mounted on Feed while nothing sits over it; shown while
  // the member is scrolling past 72px and for 2.5s after the last scroll event. Tap or a 24px drag
  // (up on compact, left on medium) opens the composer.
  const onFeed = feedView?.kind === "feed" || feedView?.kind === "expanded";
  const fabMount = !expanded && onFeed && !composer.open && !notifOpen;
  const fabShown = fabMount && moving;
  const drag = useRef<{ x: number; y: number } | null>(null);
  const tabDown = (e: PointerEvent<HTMLButtonElement>) => {
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const tabMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    if (d.x - e.clientX > DRAG_OPEN_PX || d.y - e.clientY > DRAG_OPEN_PX) {
      drag.current = null;
      compose();
    }
  };
  const tabEnd = () => {
    drag.current = null;
  };

  const headerLens =
    !expanded && scrolled && onFeed
      ? {
          lenses: LENSES,
          value: lens,
          onChange: (id: string) => onLens(id as LensId),
          dense: compact,
        }
      : null;
  const bottomPad = compact
    ? "calc(112px + env(safe-area-inset-bottom))"
    : "calc(96px + env(safe-area-inset-bottom))";
  // Scroll anchoring is off on every column: the pinned block toggles position on the greeting's
  // visibility, and Chrome's anchoring would otherwise walk scrollTop back across the threshold.
  const column = {
    minWidth: 0,
    minHeight: 0,
    overflowY: "auto" as const,
    overscrollBehavior: "contain" as const,
    overflowAnchor: "none" as const,
    position: "relative" as const,
  };

  return (
    <ShellScrollProvider value={{ scrollerRef, scrolled, moving, scrollToTop }}>
      <div
        data-tier={tier}
        data-scrolled={scrolled ? "1" : "0"}
        data-moving={moving ? "1" : "0"}
        style={{
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "var(--bg)",
          color: "var(--ink)",
        }}
      >
        <AppHeader
          variant={expanded ? "expanded" : "compact"}
          homeActive={homeActive}
          homeHref={homeHref}
          onHome={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey) return;
            e.preventDefault();
            goHome();
          }}
          onHomeIntent={() => void router.preloadRoute({ to: "/feed", search: {} })}
          member={{ name: member.name, src: member.avatar }}
          onCompose={compose}
          onAvatar={() => setAccount((v) => !v)}
          avatarActive={account}
          cActive={active}
          onSelectC={go}
          onIntentC={warm}
          lensBar={headerLens}
          style={{
            paddingTop: "env(safe-area-inset-top)",
            height: "auto",
            minHeight: expanded ? 64 : 56,
            zIndex: 20,
          }}
        >
          <NotificationPanel
            member={member}
            tier={tier}
            onOpen={() => setAccount(false)}
            onChange={setNotifOpen}
            closeKey={closeKey}
          />
        </AppHeader>
        {expanded ? (
          <div
            data-canvas
            style={{
              flex: 1,
              minHeight: 0,
              width: "100%",
              maxWidth: 1440,
              margin: "0 auto",
              boxSizing: "border-box",
              display: "grid",
              gridTemplateColumns: wide
                ? "260px minmax(680px, 760px) 320px"
                : "260px minmax(680px, 760px)",
              gap: 24,
              justifyContent: "center",
              alignItems: "stretch",
              padding: "0 32px",
              overflow: "hidden",
            }}
          >
            {/* main precedes both rails in the DOM (ruling 174); grid placement puts the rails in
                columns 1 and 3, so keyboard order reaches the content before any rail control. */}
            <main
              ref={attachScroller}
              data-scroller="feed"
              onScroll={onScroll}
              style={{
                ...column,
                gridColumn: 2,
                gridRow: 1,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                // No top padding of its own: the composer control's wrapper carries it (SPEC 3.0).
                // The bottom pad keeps a short list able to hold the pinned block's scroll position.
                // A sunken surface (Connect) carries its own padding: 0 24 48 (Connect SPEC 2).
                padding: sunken ? "0 24px 48px" : "0 0 calc(100dvh - 240px)",
                background: sunken ? "var(--bg-sunken)" : undefined,
              }}
            >
              {children}
            </main>
            {leftRail && leftRail.label === null ? (
              // An empty rail renders no landmark (ruling 170): the column stays reserved.
              <div data-scroller="left" style={{ ...column, gridColumn: 1, gridRow: 1 }} />
            ) : (
              <aside
                aria-label={leftRail?.label ?? "Your quick state"}
                data-scroller="left"
                style={{
                  ...column,
                  gridColumn: 1,
                  gridRow: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                  padding: "24px 0 48px",
                }}
              >
                {leftRail ? leftRail.node : <LeftRail member={member} />}
              </aside>
            )}
            {wide &&
              (rightRail && rightRail.label === null ? (
                <div data-scroller="right" style={{ ...column, gridColumn: 3, gridRow: 1 }} />
              ) : (
                <aside
                  aria-label={rightRail?.label ?? "DIA suggests"}
                  data-scroller="right"
                  style={{
                    ...column,
                    gridColumn: 3,
                    gridRow: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 24,
                    padding: "24px 0 48px",
                  }}
                >
                  {rightRail ? rightRail.node : <RightRail />}
                </aside>
              ))}
          </div>
        ) : (
          <div
            ref={attachScroller}
            data-scroller="feed"
            onScroll={onScroll}
            style={{
              ...column,
              flex: 1,
              WebkitOverflowScrolling: "touch",
              background: sunken ? "var(--bg-sunken)" : undefined,
            }}
          >
            <main
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: compact ? `12px 16px ${bottomPad}` : `24px 32px ${bottomPad}`,
                maxWidth: 680,
                margin: "0 auto",
                width: "100%",
                boxSizing: "border-box",
                // Viewport plus 40 so a short list can still hold the header's lens position (SPEC 1).
                minHeight: "calc(100dvh + 40px)",
              }}
            >
              {children}
            </main>
          </div>
        )}
        {!expanded && (
          <PulseDock
            fixed
            active={active ?? undefined}
            onSelect={go}
            style={compact ? undefined : { padding: "0 120px" }}
          />
        )}
        {fabMount && (
          <div
            aria-hidden={!fabShown}
            data-fab={compact ? "handle" : "tab"}
            data-shown={fabShown ? "1" : "0"}
            style={
              compact
                ? {
                    position: "fixed",
                    left: "50%",
                    marginLeft: -32,
                    bottom: "calc(65px + env(safe-area-inset-bottom, 0px))",
                    width: 64,
                    height: 30,
                    overflow: "hidden",
                    zIndex: 15,
                    pointerEvents: fabShown ? "auto" : "none",
                  }
                : {
                    position: "fixed",
                    right: 0,
                    top: "50%",
                    marginTop: -28,
                    width: 32,
                    height: 56,
                    overflow: "hidden",
                    zIndex: 30,
                    pointerEvents: fabShown ? "auto" : "none",
                  }
            }
          >
            <button
              type="button"
              onClick={compose}
              onPointerDown={tabDown}
              onPointerMove={tabMove}
              onPointerUp={tabEnd}
              onPointerCancel={tabEnd}
              aria-label="Open the composer"
              tabIndex={fabShown ? 0 : -1}
              data-testid="compose-floating"
              style={
                compact
                  ? {
                      appearance: "none",
                      border: 0,
                      padding: 0,
                      margin: 0,
                      font: "inherit",
                      cursor: "pointer",
                      touchAction: "none",
                      width: 64,
                      height: 30,
                      borderRadius: "var(--radius-m) var(--radius-m) 0 0",
                      background: "var(--c-connect)",
                      color: "var(--c-connect-ink)",
                      display: "inline-flex",
                      alignItems: "flex-start",
                      paddingTop: 6,
                      boxSizing: "border-box",
                      justifyContent: "center",
                      transform: fabShown ? "translateY(0)" : "translateY(30px)",
                      transition: "transform var(--dur-base) var(--ease)",
                    }
                  : {
                      appearance: "none",
                      border: 0,
                      padding: 0,
                      margin: 0,
                      font: "inherit",
                      cursor: "pointer",
                      touchAction: "none",
                      width: 32,
                      height: 56,
                      borderRadius: "var(--radius-m) 0 0 var(--radius-m)",
                      background: "var(--c-connect)",
                      color: "var(--c-connect-ink)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "var(--shadow-2)",
                      opacity: 0.92,
                      transform: fabShown ? "translateX(0)" : "translateX(40px)",
                      transition: "transform var(--dur-base) var(--ease)",
                    }
              }
            >
              <Icon name="pen-line" size={18} />
            </button>
          </div>
        )}
        {account && (
          <>
            {expanded && (
              <button
                type="button"
                aria-label="Close account panel"
                onClick={() => setAccount(false)}
                style={{ all: "unset", position: "fixed", inset: 0, zIndex: 40, cursor: "default" }}
              />
            )}
            <div
              role="dialog"
              aria-label="Account"
              data-testid="account-panel"
              style={
                expanded
                  ? POPOVER_STYLE
                  : {
                      position: "fixed",
                      inset: 0,
                      paddingTop: "env(safe-area-inset-top)",
                      zIndex: 50,
                      background: "var(--bg)",
                      display: "flex",
                      flexDirection: "column",
                      boxSizing: "border-box",
                      animation: "strand-slide var(--dur-base) var(--ease)",
                    }
              }
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  height: 56,
                  padding: "0 8px 0 16px",
                  borderBottom: "1px solid var(--line)",
                  flex: "none",
                }}
              >
                <span style={{ flex: 1, fontSize: 17, fontWeight: 500 }}>{member.name}</span>
                <Button variant="ghost" size="sm" onClick={() => setAccount(false)}>
                  Close
                </Button>
              </div>
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
                {member.email && (
                  <span style={{ fontSize: 15, color: "var(--ink-3)" }}>{member.email}</span>
                )}
                {member.handle && (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 4, margin: "-4px 0" }}
                  >
                    <button
                      type="button"
                      data-testid="view-my-profile"
                      onClick={() => {
                        setAccount(false);
                        void navigate({
                          to: "/m/$handle",
                          params: { handle: member.handle as string },
                          search: {},
                        });
                      }}
                      style={{
                        all: "unset",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        minHeight: 44,
                        fontSize: 15,
                        fontWeight: 500,
                      }}
                    >
                      View my profile
                    </button>
                    <button
                      type="button"
                      data-testid="edit-my-profile"
                      onClick={() => {
                        setAccount(false);
                        void navigate({
                          to: "/m/$handle",
                          params: { handle: member.handle as string },
                          search: { edit: true },
                        });
                      }}
                      style={{
                        all: "unset",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        minHeight: 44,
                        fontSize: 15,
                        fontWeight: 500,
                      }}
                    >
                      Edit profile
                    </button>
                  </div>
                )}
                {/* Ruling 230: the signed-in change-password path. /password is the whole of it;
                    there is no settings surface, so this row is its entry point. */}
                <button
                  type="button"
                  data-testid="change-password"
                  onClick={() => {
                    setAccount(false);
                    void navigate({ to: "/password" });
                  }}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    minHeight: 44,
                    margin: "-4px 0",
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                >
                  Change password
                </button>
                <Switch
                  label="Dark theme"
                  checked={theme === "dark"}
                  onChange={(on) => setTheme(on ? "dark" : "light")}
                />
                <Button variant="secondary" size="sm" onClick={() => void signOut()}>
                  Sign out
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </ShellScrollProvider>
  );
}
