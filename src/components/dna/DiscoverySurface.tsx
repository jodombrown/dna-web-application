// Brief 9, Convene Pass 2: the Discovery Dashboard (B9-SPEC section 0, sections 2 to 7; handoff 31-B
// items 3 to 14; rulings 581, 586, 631, 632, 650, 660, 661, 685 to 690, 693, 700, 719, 723 to 731, 944
// to 948, 1039 to 1050).
//
// One read projection and one write path (CLAUDE.md): everything this surface shows comes through
// `loadDiscovery` (the cards are the Feed's own views, hydrated by post id inside it, 660), and the one
// thing it writes is DIA's `Not this?` through `dismissDiscoveryItem` (1044). Nothing here filters,
// ranks or counts: the projection chose every section and every item under row policy, and a section
// it did not return is absent with no heading and no placeholder (632). The one vocabulary read
// supplies every word a lens, a lane or a family shows (194, 1041).
//
// Layout, per tier, in the shell's `lanes` mode (src/lib/rail-store.ts):
//   compact   the LensBar (into the header past 72px, 947), the Browse pill and applied Chips, the
//             homes line, then the lanes, bleeding 16 into the gutters.
//   medium    the LensBar as its own row (946); the FacetRail in the left column and the lanes, each
//             scrolling on its own (945).
//   expanded  the same with `labels="always"` (946) and, at 1440, the right column's two RailWidgets
//             (730). A card opens the event page as Strand's Pane over the lanes (688, 1047): the rail
//             collapses to its strip, the right column goes, and no DIA line renders (612).
//
// The pane canvas keeps the member's place (handoff 31-D; 1063, 1065, 1067, 1068). A card's open is
// its `Read more` anchor to the member event path: a plain primary click navigates with the origin
// record (src/lib/origin.ts) and without a scroll reset, and a modified or middle click is the
// browser's. At expanded with a pointer, hover intent preloads the event route and prefetches the
// page's read under the key EventSurface reads. The pane closes to the origin. Each lane keeps its
// horizontal position through the router's own element restoration, keyed on its section. The read
// refetches on window focus and never live: no Realtime subscription here.
//
// No digit renders except in a date. The only dates are DIA's own, from src/lib/when.ts's `dateLine`,
// which is the event page's date helper; the cards carry their own meta as the Feed renders it.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { EVENT_PAGE_KEY } from "@/components/dna/EventSurface";
import { Ghosts } from "@/components/dna/Ghosts";
import { LoadError } from "@/components/dna/LoadError";
import { PostCardRouter } from "@/components/dna/PostCardRouter";
import { Button } from "@/components/strand/Button";
import { Chip } from "@/components/strand/Chip";
import { DiaLine } from "@/components/strand/DiaLine";
import { EmptyState } from "@/components/strand/EmptyState";
import { FacetRail, type FacetAxis, type FacetValue } from "@/components/strand/FacetRail";
import { Icon } from "@/components/strand/Icon";
import { LensBar, type Lens } from "@/components/strand/LensBar";
import { Pane } from "@/components/strand/Pane";
import { RailWidget } from "@/components/strand/RailWidget";
import { Toast } from "@/components/strand/Toast";
import type { Member } from "@/lib/auth";
import {
  dismissDiscoveryItem,
  loadDiscovery,
  type ConveneLensId,
  type Discovery,
  type DiscoveryFormat,
  type DiscoveryHome,
  type DiscoveryItem,
  type DiscoveryPrice,
  type DiscoveryReason,
  type DiscoverySection,
  type DiscoverySectionId,
  type DiscoveryWhen,
} from "@/lib/discovery";
import {
  discoveryFacets,
  droppedUnknown,
  facetLists,
  searchOf,
  type DiscoverySearch,
  type FacetLists,
} from "@/lib/discovery-search";
import { loadEventPage, memberEventPath } from "@/lib/event-page";
import { setHeaderLens } from "@/lib/header-lens-store";
import type { Origin } from "@/lib/origin";
import { setLeftRail, setRightRail, setShellLayout } from "@/lib/rail-store";
import { useShellScroll } from "@/lib/shell-scroll";
import { useMode, useTier, useWide } from "@/lib/tier";
import { loadVocabularies } from "@/lib/vocabularies";
import { browserZone, dateLine } from "@/lib/when";
import { toastStyle, useShare } from "./FeedSurface";

const TOAST_MS = 2600;

/**
 * The three structural axes' words, as SPEC section 4 and the extraction name them. The values are
 * the projection's own facet branches (`p_format`, `p_price`, `p_when`), in the shape the Convene
 * form already keeps its format and price words (ConveneForm.tsx's `seg`). The two runtime axes,
 * category family and home, read their options from the vocabulary and the member's homes.
 */
const FORMAT_OPTIONS: { id: DiscoveryFormat; label: string }[] = [
  { id: "in_person", label: "In person" },
  { id: "online", label: "Online" },
  { id: "hybrid", label: "Hybrid" },
];
const PRICE_OPTIONS: { id: DiscoveryPrice; label: string }[] = [
  { id: "free", label: "Free" },
  { id: "paid", label: "Paid" },
  { id: "donation", label: "Donation" },
];
const WHEN_OPTIONS: { id: DiscoveryWhen; label: string }[] = [
  { id: "two_weeks", label: "Next two weeks" },
  { id: "this_month", label: "This month" },
  { id: "later", label: "Later" },
];

/** `Accra`, `Accra and Nairobi`, `Accra, Nairobi and Lagos`. */
function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? "";
  return words.slice(0, -1).join(", ") + " and " + words[words.length - 1];
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * DIA's line above a card (581, 1049), composed only from the item's reason, in words. Null renders
 * no line: a reason with a null name has nothing to say (grounded-or-empty).
 */
function diaLineFor(reason: DiscoveryReason, zone: string): string | null {
  const date = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : dateLine(d, zone);
  };
  switch (reason.kind) {
    case "follow":
      return reason.host.name ? "Because you follow " + reason.host.name + "." : null;
    case "taste":
      return reason.label ? "Because you follow " + lowerFirst(reason.label) + "." : null;
    case "soon": {
      const d = date(reason.starts_at);
      if (!d) return null;
      return reason.mode === "in_person" ? d + "." : d + ", online.";
    }
    case "online": {
      if (!reason.starts_at) return "Online.";
      const d = date(reason.starts_at);
      return d ? "Online, " + d + "." : null;
    }
    case "curated":
      return reason.editor.name && reason.line
        ? reason.editor.name + " picked this: " + reason.line
        : null;
    case "near":
      return reason.home.city ? "Near " + reason.home.city + "." : null;
    case "network": {
      if ("host" in reason)
        return reason.host.name ? reason.host.name + ", a connection, is hosting." : null;
      const names = reason.going.map((p) => p.name);
      if (names.length === 0 || names.some((n) => !n)) return null;
      return names.length === 1
        ? names[0] + " is going."
        : joinWords(names as string[]) + " are going.";
    }
  }
}

/** The member's homes as the homes line and the Home facet name them: the city, else the place. */
function homeWord(h: DiscoveryHome): string | null {
  return h.city ?? h.place_name ?? null;
}

const H2: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 22,
  lineHeight: 1.25,
  fontWeight: 400,
  color: "var(--ink)",
};

export function DiscoverySurface({
  member,
  lens,
  search,
  paneId,
  pane,
}: {
  member: Member;
  lens: ConveneLensId;
  search: DiscoverySearch;
  /** The event open in the pane at expanded, or null. */
  paneId: string | null;
  /** The pane's content: the event route's own outlet. */
  pane: ReactNode;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const tier = useTier();
  const wide = useWide();
  const touch = useMode() === "touch";
  const compact = tier === "compact";
  const expanded = tier === "expanded";
  const paneOpen = expanded && !!paneId;
  const { scrolled } = useShellScroll();
  const { share, toast: shareToast } = useShare();
  const [toast, setToast] = useState<string | null>(null);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const [homes, setHomes] = useState<DiscoveryHome[] | null>(null);
  const zone = useMemo(() => browserZone(), []);

  const vocab = useQuery({ queryKey: ["vocabularies"], queryFn: loadVocabularies });
  const lensRows = useMemo(() => vocab.data?.convene_lenses ?? [], [vocab.data]);
  const familyRows = useMemo(() => vocab.data?.convene_families ?? [], [vocab.data]);
  const knownFamilies = useMemo(
    () => (vocab.data ? (vocab.data.convene_families ?? []).map((f) => f.value) : null),
    [vocab.data],
  );

  const lists = useMemo(() => facetLists(search), [search]);
  const facets = useMemo(
    () => ({ lens, ...discoveryFacets(lists, { families: knownFamilies, homes }) }),
    [lens, lists, knownFamilies, homes],
  );
  const read = useQuery({
    queryKey: ["discovery", member.id, facets],
    queryFn: () => loadDiscovery(member, facets),
    // A facet change keeps the lens's previous answer on screen until the narrowed one lands; a lens
    // change does not, because the previous lens's sections are not this lens's.
    placeholderData: (prev: Discovery | null | undefined) =>
      prev && prev.lens === lens ? prev : undefined,
    // 1068: the lanes re-read when the member comes back to the window, never live, whatever the
    // client's default is.
    refetchOnWindowFocus: true,
  });
  const data = read.data ?? null;
  useEffect(() => {
    if (read.data) setHomes(read.data.homes);
  }, [read.data]);

  // An unknown facet value leaves the query once a read has shown it to be unknown (item 2).
  useEffect(() => {
    const next = droppedUnknown(lists, { families: knownFamilies, homes });
    if (!next) return;
    void navigate({
      to: ".",
      search: searchOf(next) as never,
      replace: true,
      resetScroll: false,
    });
  }, [lists, knownFamilies, homes, navigate]);

  const say = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), TOAST_MS);
  };

  // Navigation. The lens is the path, the facets the query; a lens change keeps the facets (693).
  const setLens = (id: ConveneLensId) =>
    void (id === "all"
      ? navigate({ to: "/convene", search, resetScroll: false })
      : navigate({ to: "/convene/$lens", params: { lens: id }, search, resetScroll: false }));
  const setFacets = (next: FacetLists) =>
    void (lens === "all"
      ? navigate({ to: "/convene", search: searchOf(next), resetScroll: false })
      : navigate({
          to: "/convene/$lens",
          params: { lens },
          search: searchOf(next),
          resetScroll: false,
        }));
  // At expanded the event opens as the pane over the lanes, which stay where they are (688); below
  // it the event page is its own route (1023). Either way it is one navigation, and it carries the
  // origin (1063, 1065): this lens and these facets, so the list behind the pane stays this lens
  // and the page's Back row names Discovery and returns here.
  const origin: Origin =
    lens === "all"
      ? { label: "Discovery", to: "/convene", params: {}, search }
      : { label: "Discovery", to: "/convene/$lens", params: { lens }, search };
  const openEvent = (eventId: string) =>
    void navigate({
      to: "/convene/events/$id",
      params: { id: eventId },
      search,
      resetScroll: false,
      state: (prev) => ({ ...prev, origin }),
    });
  // The pane closes to the lens it was opened from, with its facets (1063, 719). `lens` is the
  // origin's while the pane is open (convene.tsx), so this is the origin's route and search.
  const closePane = () =>
    void (lens === "all"
      ? navigate({ to: "/convene", search, resetScroll: false })
      : navigate({ to: "/convene/$lens", params: { lens }, search, resetScroll: false }));
  // 1067: hover intent at expanded with a pointer warms the event route and the page's one read
  // under EventSurface's key, so the pane opens with data. Never at compact or medium, never on touch.
  const warmEvent = (eventId: string) => {
    void router.preloadRoute({ to: "/convene/events/$id", params: { id: eventId }, search });
    void qc.prefetchQuery({
      queryKey: [EVENT_PAGE_KEY, member.id, eventId],
      queryFn: () => loadEventPage(eventId),
      staleTime: 30_000,
    });
  };

  const dismiss = async (item: DiscoveryItem, section: DiscoverySectionId) => {
    const key = section + ":" + item.event_id;
    setDismissed((s) => new Set(s).add(key));
    try {
      await dismissDiscoveryItem(item.event_id, section);
    } catch {
      setDismissed((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      });
      say("That did not go through. Try again.");
    }
  };

  // The lens set (693, 948): every word from the vocabulary; the seat reads `short`.
  const lenses: Lens<ConveneLensId>[] = useMemo(
    () => lensRows.map((l) => ({ id: l.value, label: l.short, icon: l.icon, scope: l.scope })),
    [lensRows],
  );
  const lensScope = lensRows.find((l) => l.value === lens)?.scope;
  const nameOf = (id: DiscoverySectionId) => lensRows.find((l) => l.value === id)?.name ?? null;

  // Browse (586, 661, 1042, 1050): five axes, Home absent with no homes, no count anywhere.
  const homeOptions = (homes ?? []).flatMap((h) => {
    const w = homeWord(h);
    return w ? [{ id: h.id, label: w }] : [];
  });
  const axes: FacetAxis[] = [
    { id: "format", label: "Format", icon: "map-pin", options: FORMAT_OPTIONS },
    { id: "price", label: "Price", icon: "ticket", options: PRICE_OPTIONS },
    { id: "when", label: "When", icon: "clock", options: WHEN_OPTIONS },
    {
      id: "family",
      label: "Category family",
      icon: "hash",
      options: familyRows.map((f) => ({ id: f.value, label: f.label })),
    },
    ...(homeOptions.length
      ? [{ id: "home", label: "Home", icon: "house", options: homeOptions }]
      : []),
  ];
  const railValue: FacetValue = {};
  for (const k of ["format", "price", "when", "family", "home"] as const)
    if (lists[k].length) railValue[k] = [...lists[k]];
  // When and Home are single-select (item 9): the rail toggles, so the newest choice replaces the old.
  const onRail = (next: FacetValue) => {
    const pickOne = (axis: "when" | "home") => {
      const was: string[] = lists[axis];
      const now = next[axis] ?? [];
      const added = now.filter((v) => !was.includes(v));
      return added.length ? added.slice(-1) : now.slice(0, 1);
    };
    setFacets({
      format: (next["format"] ?? []).filter((v): v is DiscoveryFormat =>
        FORMAT_OPTIONS.some((o) => o.id === v),
      ),
      price: (next["price"] ?? []).filter((v): v is DiscoveryPrice =>
        PRICE_OPTIONS.some((o) => o.id === v),
      ),
      when: pickOne("when").filter((v): v is DiscoveryWhen => WHEN_OPTIONS.some((o) => o.id === v)),
      family: next["family"] ?? [],
      home: pickOne("home"),
    });
  };
  const clearFacets = () => setFacets({ format: [], price: [], when: [], family: [], home: [] });

  // Applied facets as removable Chips (SPEC section 4), each by its own word; a value no read has
  // named yet shows no chip.
  const chips: { key: string; label: string; remove: () => void }[] = [];
  const without = (axis: keyof FacetLists, v: string) =>
    setFacets({ ...lists, [axis]: (lists[axis] as string[]).filter((x) => x !== v) } as FacetLists);
  for (const a of axes)
    for (const v of lists[a.id as keyof FacetLists] ?? []) {
      const label = a.options?.find((o) => o.id === v)?.label;
      if (label)
        chips.push({
          key: a.id + ":" + v,
          label,
          remove: () => without(a.id as keyof FacetLists, v),
        });
    }
  const chipRow = chips.length ? (
    <div data-applied-facets style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {chips.map((c) => (
        <Chip key={c.key} onRemove={c.remove}>
          {c.label}
        </Chip>
      ))}
    </div>
  ) : null;

  // The homes line (690, 726, 1050): map-pin and the homes in order, absent with none.
  const homeWords = (homes ?? []).map(homeWord).filter((w): w is string => !!w);
  const homesLine = homeWords.length ? (
    <div
      data-homes-line
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-sans)",
        fontSize: 15,
        lineHeight: 1.4,
        color: "var(--ink-2)",
      }}
    >
      <Icon name="map-pin" size={16} />
      <span>{joinWords(homeWords)}</span>
    </div>
  ) : null;

  const lensBar = (inContent: boolean) =>
    lenses.length ? (
      <LensBar
        lenses={lenses}
        value={lens}
        onChange={setLens}
        scope={lensScope}
        c="convene"
        label="Convene lens"
        width="fill"
        labels={expanded ? "always" : undefined}
        icons={expanded}
        collapsed={inContent ? scrolled : undefined}
      />
    ) : null;

  // The shell's `lanes` mode, the rails and the header lens, each set while mounted and cleared on
  // unmount (rail-store.ts, header-lens-store.ts). The key is the lens, so the pane opening over the
  // lanes keeps their scroll and a lens change resets it.
  const lensKey = lenses.map((l) => l.id + l.label).join("|");
  useEffect(() => {
    setShellLayout({
      mode: "lanes",
      rail: paneOpen ? "collapsed" : "open",
      key: lens,
      top: compact ? null : lensBar(false),
    });
    // lensBar reads the lens set, the lens, its scope and the search; listing those is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, expanded, paneOpen, lens, lensKey, lensScope, search]);
  useEffect(() => {
    if (compact) {
      setLeftRail(null);
      return;
    }
    setLeftRail({
      label: null,
      node: paneOpen ? (
        <FacetRail
          mode="collapsed"
          axes={axes}
          value={railValue}
          label="Browse"
          expandLabel="Back to Discovery and show browse"
          onExpand={closePane}
        />
      ) : (
        <FacetRail
          tier="expanded"
          axes={axes}
          value={railValue}
          onChange={onRail}
          onClear={clearFacets}
          label="Browse"
        />
      ),
    });
    // The rail reads the axes' sources and the current facets; listing those is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, paneOpen, lists, familyRows, homes, lens, search]);
  const follows = data?.follows ?? [];
  const subscriptions = data?.subscriptions ?? [];
  useEffect(() => {
    if (!wide || paneOpen || !data) {
      setRightRail(null);
      return;
    }
    setRightRail({
      label: null,
      node: (
        <>
          <RailWidget
            title="You follow"
            empty="You follow no host yet. Follow one from an event and their events start your dashboard."
          >
            {follows.flatMap((f) =>
              f.name
                ? [
                    f.handle ? (
                      <Link
                        key={f.id}
                        to="/m/$handle"
                        params={{ handle: f.handle }}
                        search={{}}
                        data-follow={f.id}
                        style={{
                          fontSize: 15,
                          lineHeight: 1.45,
                          color: "var(--ink)",
                          textDecoration: "none",
                        }}
                      >
                        {f.name}
                      </Link>
                    ) : (
                      <span key={f.id} style={{ fontSize: 15, lineHeight: 1.45 }}>
                        {f.name}
                      </span>
                    ),
                  ]
                : [],
            )}
          </RailWidget>
          {/* 1039: the second sentence of the empty line waits for the Subscribe control. */}
          <RailWidget title="You subscribe to" empty="No category family yet.">
            {subscriptions.map((s) => (
              <span key={s.family} style={{ fontSize: 15, lineHeight: 1.45 }}>
                {s.label}
              </span>
            ))}
          </RailWidget>
        </>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wide, paneOpen, data]);
  useEffect(() => {
    if (!compact || lenses.length === 0) {
      setHeaderLens(null);
      return;
    }
    setHeaderLens({
      lenses,
      value: lens,
      onChange: (id: string) => setLens(id as ConveneLensId),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, lenses, lens, search]);
  useEffect(
    () => () => {
      setShellLayout(null);
      setLeftRail(null);
      setRightRail(null);
      setHeaderLens(null);
    },
    [],
  );

  // The sections as this member may see them now: the projection's, in the vocabulary's order, less
  // what they dismissed here.
  const order = new Map(lensRows.map((l, i) => [l.value as string, i]));
  const sections: DiscoverySection[] = (data?.sections ?? [])
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => !dismissed.has(s.section + ":" + i.event_id)),
    }))
    .sort((a, b) => (order.get(a.section) ?? 99) - (order.get(b.section) ?? 99));

  // 650, 1046: DIA's one sentence for a member who follows no host, in plain text with the host's
  // name unlinked (1053).
  const suggest = data?.suggest ?? null;
  const sentence =
    suggest && suggest.host.name && (lens === "all" || lens === "follow")
      ? "You follow no host yet. " +
        suggest.host.name +
        " hosts " +
        suggest.title +
        (suggest.city ? " in " + suggest.city : "") +
        "; follow them and their events start here."
      : null;

  const withDia = !paneOpen;
  const card = (item: DiscoveryItem, section: DiscoverySectionId, inLane: boolean) => {
    const line = withDia ? diaLineFor(item.reason, zone) : null;
    const open = () => openEvent(item.event_id);
    return (
      <div
        key={section + ":" + item.event_id}
        data-discovery-item={item.event_id}
        data-section={section}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          ...(inLane
            ? { flex: "none", width: "var(--lane-card-width)", scrollSnapAlign: "start" }
            : null),
        }}
      >
        {line && <DiaLine state="done" text={line} onNotThis={() => void dismiss(item, section)} />}
        <PostCardRouter
          view={item.post}
          feed
          onClick={open}
          onRespond={open}
          onAct={open}
          onShare={() => item.post.id && void share(item.post.id)}
          readMoreHref={memberEventPath(item.event_id)}
          onReadMore={(e) => {
            // A modified or non-primary click is the browser's: new tab, new window, download.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            open();
          }}
          onReadMoreIntent={expanded && !touch ? () => warmEvent(item.event_id) : undefined}
        />
      </div>
    );
  };

  const sentenceLine = (
    <DiaLine state="done" text={sentence ?? undefined} style={{ alignItems: "flex-start" }} />
  );

  const lane = (id: DiscoverySectionId, first: boolean, body: ReactNode, seeAll: boolean) => {
    const name = nameOf(id);
    const hid = "lane-" + id;
    return (
      <section
        key={id}
        data-lane={id}
        aria-labelledby={name ? hid : undefined}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minWidth: 0,
          ...(first ? null : { borderTop: "1px solid var(--line)", paddingTop: 20, marginTop: 20 }),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {name && (
            <h2 id={hid} style={H2}>
              {name}
            </h2>
          )}
          {seeAll && (
            <Link
              to="/convene/$lens"
              params={{ lens: id }}
              search={search}
              resetScroll={false}
              data-see-all={id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                flex: "none",
                minHeight: touch ? "var(--target-primary)" : 36,
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                fontWeight: 500,
                color: "var(--c-convene-text)",
                textDecoration: "underline",
                textDecorationColor: "var(--line-strong)",
                textUnderlineOffset: 2,
              }}
            >
              See all
            </Link>
          )}
        </div>
        {body}
      </section>
    );
  };

  // 1065: the router's element restoration keys each lane on its section, so Back returns every lane
  // to where the member left it. The shell's scrollToTopSelectors name the columns only, never a lane.
  const laneRow = (id: DiscoverySectionId, children: ReactNode) => (
    <div
      className="dna-lane"
      data-lane-row
      data-scroll-restoration-id={"discovery-lane-" + id}
      style={{
        display: "flex",
        gap: 12,
        overflowX: "auto",
        overscrollBehaviorX: "contain",
        scrollSnapType: "x proximity",
        scrollbarWidth: "none",
        alignItems: "flex-start",
        ...(compact
          ? { margin: "0 -16px", padding: "0 16px", scrollPaddingInline: 16 }
          : { minWidth: 0 }),
      }}
    >
      {children}
    </div>
  );

  // All (685): each section the projection returned, as a lane; the first as its sentence alone when
  // the member follows no host.
  const followLane = sections.find((s) => s.section === "follow");
  const sentenceFirst = !!sentence && (!followLane || followLane.items.length === 0);
  const laneSections = sections.filter((s) => s.items.length > 0);
  const lanesView = (
    <div data-lanes style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      {sentenceFirst && lane("follow", true, sentenceLine, false)}
      {laneSections.map((s, i) =>
        lane(
          s.section,
          i === 0 && !sentenceFirst,
          laneRow(
            s.section,
            s.items.map((it) => card(it, s.section, true)),
          ),
          true,
        ),
      )}
    </div>
  );

  // A lens (693, 724): its one section as a vertical list in a 680 column, or the EmptyState.
  const lensSection = lens === "all" ? null : sections.find((s) => s.section === lens);
  const lensView =
    lens === "all" ? null : (
      <div
        data-lens-list={lens}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          width: "100%",
          maxWidth: 680,
          margin: "0 auto",
          minWidth: 0,
        }}
      >
        {nameOf(lens) && <h2 style={H2}>{nameOf(lens)}</h2>}
        {lens === "follow" && sentence && !lensSection?.items.length ? (
          sentenceLine
        ) : lensSection && lensSection.items.length > 0 ? (
          lensSection.items.map((it) => card(it, lens, false))
        ) : (
          <EmptyState
            c="convene"
            title="Nothing in this lens yet."
            body="Widen the lens or browse another way."
            action={
              <Button variant="secondary" onClick={() => setLens("all")}>
                Back to All
              </Button>
            }
          />
        )}
      </div>
    );

  const body = read.isError ? (
    <LoadError
      title="Convene could not load."
      body="Check your connection and try again."
      onRetry={() => void read.refetch()}
    />
  ) : !read.data && read.isPending ? (
    <Ghosts label="Loading Convene" lane={lens === "all"} />
  ) : lens === "all" || paneOpen ? (
    lanesView
  ) : (
    lensView
  );

  const toasts = (
    <>
      {(toast || shareToast) && (
        <div style={toastStyle(tier)}>
          <Toast>{toast ?? shareToast}</Toast>
        </div>
      )}
    </>
  );
  const laneStyle = <style>{".dna-lane::-webkit-scrollbar{display:none}"}</style>;

  if (paneOpen)
    return (
      <div data-discovery data-lens={lens} data-pane-open="1" style={{ paddingTop: 4 }}>
        {laneStyle}
        <Pane tier="expanded" list={body} onClose={closePane} closeLabel="Back to Discovery">
          {pane}
        </Pane>
        {toasts}
      </div>
    );

  return (
    <div
      data-discovery
      data-lens={lens}
      style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}
    >
      {laneStyle}
      {compact ? (
        <>
          <div
            data-lens-anchor
            style={{ visibility: scrolled ? "hidden" : "visible", minHeight: 64 }}
          >
            {lensBar(true)}
          </div>
          <div
            data-first-row
            style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}
          >
            <FacetRail
              tier="compact"
              axes={axes}
              value={railValue}
              onChange={onRail}
              onClear={clearFacets}
              label="Browse"
              open={browseOpen}
              onOpenChange={setBrowseOpen}
              trigger={({ open, onOpen, label }) => (
                <Button
                  variant="secondary"
                  size="sm"
                  aria-expanded={open}
                  aria-haspopup="dialog"
                  onClick={onOpen}
                  data-testid="browse"
                  style={{ minHeight: touch ? "var(--target-primary)" : 36 }}
                >
                  <Icon name="sliders-horizontal" size={16} />
                  {label}
                </Button>
              )}
            />
            {chipRow}
          </div>
          {homesLine}
        </>
      ) : (
        (homesLine || chipRow) && (
          <div
            data-header-row
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px 16px",
            }}
          >
            {homesLine}
            {chipRow}
          </div>
        )
      )}
      {body}
      {toasts}
    </div>
  );
}
