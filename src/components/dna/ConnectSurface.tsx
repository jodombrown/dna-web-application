// Connect (Brief 4, B4-Connect-v4, rulings 153 to 182). Four lenses on one column: Members (found by
// attribute, the only lens filters touch, ruling 173), Suggested (DIA's reason on every card, or
// nothing, ruling 113), My Network (Requests, Sent, Connections, Following) and Where (country tiles
// above the floor, nobody plotted, rulings 158, 159). Cards, skeleton and tiles mount from
// src/components/strand/MemberCard.tsx and PlaceTile.tsx (ruling 179). The lens column sits on
// --bg-sunken (ruling 181). Rails: Filters on Members, DIA once per screen (rulings 162, 167, 170).
// Nothing here computes eligibility, counts or scores: the projection decides and this renders it.
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type TouchEvent,
} from "react";
import { Avatar } from "@/components/strand/Avatar";
import { Button } from "@/components/strand/Button";
import { Chip } from "@/components/strand/Chip";
import { EmptyState } from "@/components/strand/EmptyState";
import { Icon } from "@/components/strand/Icon";
import { IconButton } from "@/components/strand/IconButton";
import { Input } from "@/components/strand/Input";
import { LensBar } from "@/components/strand/LensBar";
import {
  MemberCard,
  MemberCardSkeleton,
  type MemberCardContext,
  type MemberRel,
} from "@/components/strand/MemberCard";
import { PlaceTile } from "@/components/strand/PlaceTile";
import { RailWidget } from "@/components/strand/RailWidget";
import { Select } from "@/components/strand/Select";
import { Sheet } from "@/components/strand/Sheet";
import { Toast } from "@/components/strand/Toast";
import { toastStyle } from "@/components/dna/FeedSurface";
import type { Member } from "@/lib/auth";
import {
  CONNECT_LENSES,
  FILTER_AXES,
  NETWORK_SECTIONS,
  dismissSuggestion,
  filtersOf,
  hasFilters,
  loadFilterOptions,
  loadMembers,
  loadNetwork,
  loadSuggestions,
  loadWhere,
  respondToRequest,
  sendIntroduction,
  setFollowing,
  toMember,
  type ConnectCard,
  type ConnectFilters,
  type ConnectLens,
  type ConnectSearch,
  type FilterKey,
  type FilterOptions,
} from "@/lib/connect";
import { setLeftRail, setRightRail, setSurfaceGround } from "@/lib/rail-store";
import { useMode, useTier, useWide } from "@/lib/tier";

const MESSAGE_MAX = 300;
const TOAST_MS = 2400;
const SWIPE_PX = 60;

const DIA_EMPTY =
  "DIA has nothing to suggest yet. It suggests someone when you share an event, a Space, a corridor, or a connection with them.";
const WHERE_CAPTION =
  "Countries by where members are now. Nobody is plotted. A country appears once enough members are there to be shown as a group, and not before. Open one to see its members.";

const capsHeader: CSSProperties = {
  margin: 0,
  fontSize: 13,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: "var(--ink-3)",
};

const linkButton: CSSProperties = {
  appearance: "none",
  border: 0,
  background: "none",
  padding: "0 4px",
  margin: 0,
  font: "inherit",
  fontSize: 15,
  fontWeight: 500,
  color: "var(--c-connect-text)",
  cursor: "pointer",
  textDecoration: "underline",
  textUnderlineOffset: 2,
  minHeight: 36,
};

type Override = { rel?: MemberRel; following?: boolean; gone?: boolean };

function firstName(name: string): string {
  return name.split(" ")[0] || name;
}

/** The ten Select controls, "Any" first; the Corridor axis renders only once corridors has rows (ruling 154). */
function FilterControls({
  options,
  filters,
  onChange,
}: {
  options: FilterOptions | null | undefined;
  filters: ConnectFilters;
  onChange: (key: FilterKey, value: string | undefined) => void;
}) {
  const values = (key: FilterKey): { value: string; label: string }[] => {
    if (!options) return [];
    switch (key) {
      case "segment":
        return options.segments;
      case "location":
        return options.locations.map((v) => ({ value: v, label: v }));
      case "origin":
        return options.origins.map((v) => ({ value: v, label: v }));
      case "heritage":
        return options.heritage.map((v) => ({ value: v, label: v }));
      case "pathway":
        return options.pathway.map((v) => ({ value: v, label: v }));
      case "corridor":
        return options.corridors.map((c) => ({ value: c.id, label: c.label }));
      case "focus":
        return options.focus.map((v) => ({ value: v, label: v }));
      case "industry":
        return options.industries.map((v) => ({ value: v, label: v }));
      case "skill":
        return options.skills.map((v) => ({ value: v, label: v }));
      case "region":
        return options.regions.map((v) => ({ value: v, label: v }));
    }
  };
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
      data-testid="filter-controls"
    >
      {FILTER_AXES.map(({ key, label }) => {
        const opts = values(key);
        if (key === "corridor" && opts.length === 0) return null;
        return (
          <Select
            key={key}
            label={label}
            data-filter={key}
            value={filters[key] ?? ""}
            onChange={(e) => onChange(key, (e.target as HTMLSelectElement).value || undefined)}
            options={[{ value: "", label: "Any" }, ...opts]}
          />
        );
      })}
    </div>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      style={{
        background: "var(--surface)",
        borderRadius: 14,
        border: "1px solid var(--error)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "flex-start",
      }}
    >
      <span style={{ fontSize: 17, fontWeight: 700 }}>Connect could not load.</span>
      <span style={{ fontSize: 15, color: "var(--ink-2)" }}>
        Check your connection and try again. Nothing you did was lost.
      </span>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function Ghosts({ compact, label }: { compact: boolean; label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        display: "grid",
        gridTemplateColumns: compact ? "minmax(0,1fr)" : "repeat(2, minmax(0,1fr))",
        gap: 14,
      }}
    >
      <MemberCardSkeleton compact={compact} />
      <MemberCardSkeleton compact={compact} />
      <MemberCardSkeleton compact={compact} />
    </div>
  );
}

export function ConnectSurface({ member, search }: { member: Member; search: ConnectSearch }) {
  const tier = useTier();
  const wide = useWide();
  const mode = useMode();
  const pointer = mode === "pointer";
  const compact = tier === "compact";
  const expanded = tier === "expanded";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const lens: ConnectLens = search.lens ?? "members";
  const filters = useMemo(() => filtersOf(search), [search]);
  const filtered = hasFilters(filters);
  const scopeOf = CONNECT_LENSES.find((l) => l.id === lens)?.scope;

  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [intro, setIntro] = useState<ConnectCard | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const say = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
  }, []);
  useEffect(
    () => () => {
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  // URL is the state (ruling 84). Filters stay on every lens; only Members reads them (ruling 173).
  const go = useCallback(
    (next: ConnectSearch) => void navigate({ to: "/connect", search: next, resetScroll: false }),
    [navigate],
  );
  const setLens = useCallback(
    (id: ConnectLens) => go({ ...filters, ...(id === "members" ? {} : { lens: id }) }),
    [filters, go],
  );
  const setFilter = useCallback(
    (key: FilterKey, value: string | undefined) => {
      const next: ConnectSearch = { ...filters, ...(lens === "members" ? {} : { lens }) };
      if (value) next[key] = value;
      else delete next[key];
      go(next);
    },
    [filters, lens, go],
  );
  const clearFilters = useCallback(() => go(lens === "members" ? {} : { lens }), [lens, go]);

  // Ground (ruling 181), for the whole life of the surface.
  useEffect(() => {
    setSurfaceGround("sunken");
    return () => setSurfaceGround(null);
  }, []);

  // Reads. Every list is the projection's answer; nothing is filtered here.
  const options = useQuery({
    queryKey: ["connect", "options"],
    queryFn: loadFilterOptions,
    staleTime: 10 * 60_000,
  });
  const members = useInfiniteQuery({
    queryKey: ["connect", "members", member.id, filters],
    queryFn: ({ pageParam }) => loadMembers(filters, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: lens === "members",
  });
  const network = useQuery({
    queryKey: ["connect", "network", member.id],
    queryFn: loadNetwork,
    enabled: lens === "network",
  });
  const where = useQuery({
    queryKey: ["connect", "where", member.id],
    queryFn: loadWhere,
    enabled: lens === "where",
  });
  // DIA appears once per screen (ruling 167): the right rail at 1440, the left rail on My Network and
  // Where at 1280, the lens itself on Suggested.
  const railWantsDia = expanded && (wide || lens === "network" || lens === "where");
  const suggested = useQuery({
    queryKey: ["connect", "suggested", member.id],
    queryFn: () => loadSuggestions(12),
    staleTime: 5 * 60_000,
    enabled: lens === "suggested" || railWantsDia,
  });

  const invalidate = useCallback(
    (...keys: string[]) => {
      for (const k of keys) void qc.invalidateQueries({ queryKey: ["connect", k, member.id] });
    },
    [qc, member.id],
  );

  const view = useCallback(
    (c: ConnectCard): ConnectCard => {
      const o = overrides[c.id];
      return o ? { ...c, rel: o.rel ?? c.rel, following: o.following ?? c.following } : c;
    },
    [overrides],
  );
  const gone = useCallback((c: ConnectCard) => !!overrides[c.id]?.gone, [overrides]);
  const patch = useCallback(
    (id: string, o: Override) => setOverrides((s) => ({ ...s, [id]: { ...s[id], ...o } })),
    [],
  );

  // Actions. The server enforces the state machine; the card reflects the answer.
  const act = useCallback(
    async (fn: () => Promise<void>, after?: () => void) => {
      try {
        await fn();
        after?.();
      } catch (e) {
        say(e instanceof Error ? e.message : "That did not go through. Try again.");
      }
    },
    [say],
  );
  const onAccept = (c: ConnectCard) =>
    void act(
      () => respondToRequest(c.id, true),
      () => {
        patch(c.id, { rel: "connected" });
        say("You and " + firstName(c.name) + " are connected.");
        invalidate("network", "members", "suggested");
      },
    );
  const onDecline = (c: ConnectCard) =>
    void act(
      () => respondToRequest(c.id, false),
      () => {
        patch(c.id, { rel: "none", gone: true });
        invalidate("network", "members");
      },
    );
  const onFollow = (c: ConnectCard) => {
    const next = !view(c).following;
    patch(c.id, { following: next });
    void act(
      () => setFollowing(c.id, next),
      () => invalidate("network"),
    );
  };
  const onDismiss = (c: ConnectCard) => {
    patch(c.id, { gone: true });
    void act(
      () => dismissSuggestion(c.id),
      () => invalidate("suggested"),
    );
  };
  const openIntro = (c: ConnectCard) => {
    openerRef.current = document.activeElement as HTMLElement | null;
    setMessage("");
    setIntro(c);
  };
  const closeIntro = () => {
    setIntro(null);
    openerRef.current?.focus?.();
  };
  const send = async () => {
    if (!intro || !message.trim() || sending) return;
    setSending(true);
    const c = intro;
    await act(
      () => sendIntroduction(c.id, message),
      () => {
        patch(c.id, { rel: "sent" });
        say("Your introduction is with " + firstName(c.name) + ".");
        invalidate("network", "suggested");
        closeIntro();
      },
    );
    setSending(false);
  };
  const openProfile = (c: ConnectCard) =>
    void navigate({ to: "/m/$handle", params: { handle: c.handle }, search: {} });

  const card = (c0: ConnectCard, context: MemberCardContext) => {
    const c = view(c0);
    return (
      <MemberCard
        key={c.id}
        member={toMember(c)}
        rel={c.rel}
        following={c.following}
        context={context}
        compact={compact}
        pointer={pointer}
        onOpen={() => openProfile(c)}
        onConnect={() => openIntro(c)}
        onAccept={() => onAccept(c)}
        onDecline={() => onDecline(c)}
        onFollow={() => onFollow(c)}
        onDismiss={() => onDismiss(c)}
      />
    );
  };

  // DIA rows for a rail: the first three of the same rule-ranked set, dismissed excluded (ruling 153).
  const diaRows = (suggested.data ?? []).filter((c) => !gone(c)).slice(0, 3);
  const diaWidget = (
    <RailWidget title="DIA suggests" empty={DIA_EMPTY}>
      {diaRows.map((c0) => {
        const c = view(c0);
        return (
          <div
            key={c.id}
            data-testid="dia-row"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: "10px 0",
              borderTop: "1px solid var(--line)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar name={c.name} src={c.avatarUrl} size={28} />
              <span style={{ fontSize: 15, fontWeight: 500 }}>{c.name}</span>
            </div>
            {c.reason && (
              <span style={{ fontSize: 15, fontStyle: "italic", color: "var(--ink-2)" }}>
                {c.reason}
              </span>
            )}
            {c.rel === "none" && (
              <div>
                <Button variant="secondary" size="sm" c="connect" onClick={() => openIntro(c)}>
                  Connect
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </RailWidget>
  );

  // Rails (rulings 162, 167, 170). Expanded only; the shell owns the columns.
  const optionsData = options.data;
  useEffect(() => {
    if (!expanded) {
      setLeftRail(null);
      setRightRail(null);
      return;
    }
    if (lens === "members") {
      setLeftRail({
        label: "Filters",
        node: (
          <RailWidget
            title="Filters"
            empty=""
            action={
              filtered ? (
                <button
                  type="button"
                  style={linkButton}
                  onClick={clearFilters}
                  data-testid="clear-all"
                >
                  Clear all
                </button>
              ) : undefined
            }
          >
            <FilterControls options={optionsData} filters={filters} onChange={setFilter} />
          </RailWidget>
        ),
      });
    } else if (!wide && (lens === "network" || lens === "where") && diaRows.length > 0) {
      setLeftRail({ label: "DIA suggests", node: diaWidget });
    } else {
      setLeftRail({ label: null, node: null });
    }
    setRightRail(wide ? { label: "DIA suggests", node: diaWidget } : null);
    // diaWidget and the filter controls re-render with their inputs; listing those inputs is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    expanded,
    wide,
    lens,
    filtered,
    filters,
    optionsData,
    suggested.data,
    overrides,
    clearFilters,
    setFilter,
  ]);
  useEffect(
    () => () => {
      setLeftRail(null);
      setRightRail(null);
    },
    [],
  );

  // Swipe between lenses on compact and medium (SPEC section 3).
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    touchX.current = expanded ? null : (e.touches[0]?.clientX ?? null);
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (touchX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < SWIPE_PX) return;
    const i = CONNECT_LENSES.findIndex((l) => l.id === lens);
    const j = Math.min(CONNECT_LENSES.length - 1, Math.max(0, i + (dx < 0 ? 1 : -1)));
    if (j !== i) setLens(CONNECT_LENSES[j]?.id ?? lens);
  };

  // Applied filters as chips (Members only).
  const chipLabel = (key: FilterKey, value: string) => {
    if (key === "segment")
      return optionsData?.segments.find((s) => s.value === value)?.label ?? value;
    if (key === "corridor")
      return optionsData?.corridors.find((c) => c.id === value)?.label ?? value;
    return value;
  };
  const applied = FILTER_AXES.filter(({ key }) => filters[key]);

  // -------------------------------------------------------------------------
  // Lenses
  // -------------------------------------------------------------------------
  const cardsGap: CSSProperties = { display: "flex", flexDirection: "column", gap: 14 };

  let body: ReactNode;
  if (lens === "members") {
    const items = (members.data?.pages ?? []).flatMap((p) => p.items).filter((c) => !gone(c));
    body = (
      <>
        <div
          data-testid="filter-row"
          style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minHeight: 44 }}
        >
          {!expanded && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFiltersOpen(true)}
              data-testid="open-filters"
            >
              <Icon name="sliders-horizontal" size={16} />
              Filters
            </Button>
          )}
          {applied.map(({ key }) => (
            <Chip key={key} onRemove={() => setFilter(key, undefined)}>
              {chipLabel(key, filters[key] as string)}
            </Chip>
          ))}
          {filtered && (
            <button
              type="button"
              style={linkButton}
              onClick={clearFilters}
              data-testid="clear-filters"
            >
              Clear all
            </button>
          )}
        </div>
        <section aria-label="Members" style={cardsGap} data-testid="lens-members">
          {members.isPending ? (
            <Ghosts compact={compact} label="Loading Connect" />
          ) : members.isError ? (
            <ErrorCard onRetry={() => void members.refetch()} />
          ) : items.length === 0 ? (
            filtered ? (
              <EmptyState
                c="connect"
                pattern="kente"
                title="Nobody matches these filters."
                body="Clear one and try again."
                action={
                  <Button variant="secondary" c="connect" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                c="connect"
                pattern="kente"
                title="Nobody here yet."
                body="Members appear as they join. Yours is the first profile they will see."
                action={
                  <Button
                    variant="secondary"
                    c="connect"
                    onClick={() =>
                      member.handle &&
                      void navigate({
                        to: "/m/$handle",
                        params: { handle: member.handle },
                        search: {},
                      })
                    }
                  >
                    Open your profile
                  </Button>
                }
              />
            )
          ) : (
            <>
              {items.map((c) => card(c, "members"))}
              {members.hasNextPage && (
                <div style={{ display: "flex", justifyContent: "center", paddingTop: 6 }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    c="connect"
                    disabled={members.isFetchingNextPage}
                    onClick={() => void members.fetchNextPage()}
                  >
                    More members
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </>
    );
  } else if (lens === "suggested") {
    const items = (suggested.data ?? []).filter((c) => !gone(c));
    body = (
      <section aria-label="Suggested" style={cardsGap} data-testid="lens-suggested">
        {suggested.isPending ? (
          <Ghosts compact={compact} label="Loading Connect" />
        ) : suggested.isError ? (
          <ErrorCard onRetry={() => void suggested.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            c="connect"
            pattern="kente"
            title="No suggestions with a real reason yet."
            body="DIA suggests someone when you share an event, a Space, a corridor, or a connection with them. Until then, this stays empty."
            action={
              <Button variant="secondary" c="connect" onClick={() => setLens("members")}>
                Browse members
              </Button>
            }
          />
        ) : (
          items.map((c) => card(c, "suggested"))
        )}
      </section>
    );
  } else if (lens === "network") {
    const d = network.data;
    const sections = NETWORK_SECTIONS.map((s) => ({
      ...s,
      items: (d?.[s.key] ?? []).filter((c) => !gone(c)),
    }));
    const allEmpty = !!d && sections.every((s) => s.items.length === 0);
    body = network.isPending ? (
      <Ghosts compact={compact} label="Loading Connect" />
    ) : network.isError ? (
      <ErrorCard onRetry={() => void network.refetch()} />
    ) : allEmpty ? (
      <EmptyState
        c="connect"
        pattern="kente"
        title="Your network starts here."
        body="Connections you make and members you follow gather here."
        action={
          <Button variant="secondary" c="connect" onClick={() => setLens("members")}>
            Browse members
          </Button>
        }
      />
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }} data-testid="lens-network">
        {sections.map((s) => (
          <section
            key={s.key}
            aria-label={s.label}
            data-section={s.key}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <h2 style={capsHeader}>{s.label}</h2>
            {s.items.length === 0 ? (
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: "var(--ink-2)" }}>
                {s.empty}
              </p>
            ) : (
              s.items.map((c) => card(c, s.context))
            )}
          </section>
        ))}
      </div>
    );
  } else {
    const d = where.data;
    const cols = compact ? "repeat(2, minmax(0,1fr))" : "repeat(4, minmax(0,1fr))";
    const group = (label: string, names: string[]) =>
      names.length === 0 ? null : (
        <section
          key={label}
          aria-label={label}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <h2 style={capsHeader}>{label}</h2>
          <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12 }}>
            {names.map((n) => (
              <PlaceTile
                key={n}
                name={n}
                pointer={pointer}
                onPick={() => go({ ...filters, location: n })}
              />
            ))}
          </div>
        </section>
      );
    body = where.isPending ? (
      <div
        role="status"
        aria-label="Loading Where"
        style={{ display: "grid", gridTemplateColumns: cols, gap: 12 }}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{
              minHeight: 104,
              borderRadius: 14,
              background: "var(--bg-sunken)",
              border: "1px solid var(--line)",
              display: "block",
            }}
          />
        ))}
      </div>
    ) : where.isError ? (
      <ErrorCard onRetry={() => void where.refetch()} />
    ) : !d || (d.continent.length === 0 && d.diaspora.length === 0) ? (
      <EmptyState
        c="connect"
        pattern="kente"
        title="No country has reached the floor yet."
        body="Where shows a country once enough members are there to appear as a group, never as individuals."
      />
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }} data-testid="lens-where">
        {group("On the continent", d.continent)}
        {group("In the diaspora", d.diaspora)}
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: "var(--ink-3)" }}>
          {WHERE_CAPTION}
        </p>
      </div>
    );
  }

  const first = intro ? firstName(intro.name) : "";
  const left = MESSAGE_MAX - message.length;
  const sheetVariant = compact ? "sheet" : "drawer";
  const sheetHead = (title: string, extra: ReactNode, onClose: () => void) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 56,
        padding: "0 8px 0 20px",
        borderBottom: "1px solid var(--line)",
        flex: "none",
      }}
    >
      <span style={{ flex: 1, fontSize: 17, fontWeight: 700 }}>{title}</span>
      {extra}
      <IconButton name="x" label="Close" onClick={onClose} />
    </div>
  );
  const sheetFoot = (children: ReactNode) => (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
        padding: compact ? "12px 20px 42px" : "12px 20px",
        borderTop: "1px solid var(--line)",
        flex: "none",
      }}
    >
      {children}
    </div>
  );

  return (
    <div
      data-testid="connect"
      data-lens={lens}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
      }}
    >
      <div
        data-testid="lens-bar-wrap"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 3,
          background: "var(--bg-sunken)",
          padding: expanded ? "24px 0 8px" : "8px 0",
          marginBottom: -8,
        }}
      >
        <LensBar
          lenses={CONNECT_LENSES}
          value={lens}
          onChange={setLens}
          scope={scopeOf}
          c="connect"
          label="Connect lens"
          labels={expanded}
        />
      </div>
      {body}

      <Sheet
        open={!!intro}
        onClose={closeIntro}
        variant={sheetVariant}
        width="65%"
        label={intro ? "Introduce yourself to " + intro.name : "Introduce yourself"}
        style={compact ? { height: "80%" } : undefined}
      >
        {intro && (
          <>
            {sheetHead("Introduce yourself", null, closeIntro)}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={intro.name} src={intro.avatarUrl} size={48} />
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span
                    style={{ fontFamily: "var(--font-display)", fontSize: 26, lineHeight: 1.15 }}
                  >
                    {intro.name}
                  </span>
                  {intro.headline && (
                    <span style={{ fontSize: 15, color: "var(--ink-2)" }}>{intro.headline}</span>
                  )}
                </div>
              </div>
              <Input
                multiline
                rows={6}
                label={"Your message to " + first}
                maxLength={MESSAGE_MAX}
                value={message}
                onChange={(e) =>
                  setMessage((e.target as HTMLTextAreaElement).value.slice(0, MESSAGE_MAX))
                }
                placeholder="Why you, why now. What you noticed on their profile, what you are working on, what you hope comes of it."
                hint={left === 1 ? "1 character left" : left + " characters left"}
                autoFocus
                data-testid="intro-message"
              />
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: "var(--ink-3)" }}>
                One message, sent once. It cannot be edited after sending. {first} decides in their
                own time and you will hear when they accept.
              </p>
            </div>
            {sheetFoot(
              <>
                <Button variant="ghost" onClick={closeIntro}>
                  Cancel
                </Button>
                <Button
                  c="connect"
                  disabled={!message.trim() || sending}
                  onClick={() => void send()}
                  data-testid="send-intro"
                >
                  Send introduction
                </Button>
              </>,
            )}
          </>
        )}
      </Sheet>

      {!expanded && (
        <Sheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          variant={sheetVariant}
          width="65%"
          label="Filters"
          style={compact ? { height: "80%" } : undefined}
        >
          {sheetHead(
            "Filters",
            filtered ? (
              <button type="button" style={linkButton} onClick={clearFilters}>
                Clear all
              </button>
            ) : null,
            () => setFiltersOpen(false),
          )}
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            <FilterControls options={optionsData} filters={filters} onChange={setFilter} />
          </div>
          {sheetFoot(
            <Button c="connect" onClick={() => setFiltersOpen(false)} data-testid="show-members">
              Show members
            </Button>,
          )}
        </Sheet>
      )}

      {toast && (
        <div style={toastStyle(tier)}>
          <Toast>{toast}</Toast>
        </div>
      )}
    </div>
  );
}
