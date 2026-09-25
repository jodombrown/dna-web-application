// Brief 9, Convene Pass 2: the Discovery Dashboard, rebuilt to the ruled set (handoff 32-B items 1 to
// 7 with Addenda 1 to 3; rulings 581, 632, 650, 688, 1044, 1063 to 1068, 1076 to 1079, 1082, 1083,
// 1087, 1092 to 1097, 1099, 1105 to 1107, 1110 to 1112), on the parts handoff 32-A ported: PostCard's
// discovery face, Menu, FacetRail's displays and ladders, Input's combobox and Pane's stepping. Handoff
// 33-A binds what Strand correction 28 added to them (1134): the face's link (G100) and its own title
// clamp (G115), the pane at 520 with its height, toolbar and hidden list (G110, 1127), Topics in two
// columns (G102) and Clear all in the rail's heading row (G111).
//
// One read projection and one write path per surface (CLAUDE.md): everything this surface shows comes
// through `loadDiscovery` (the cards are the Feed's own views, hydrated by post id inside it, 660) and
// Place's options through `convene_places()` (1095). Every menu act is an existing write path (item
// 6): Save is the Feed's `setSaved`, Add to calendar the event page's `.ics`, Follow is Connect's
// `set_follow` wrapper, Subscribe `set_subscription` and Not this `dismiss_discovery_item`. The
// rail's open or collapsed state is the member's own row in `member_rail_state` (1111). Nothing here filters, ranks or counts:
// the projection chose every lane and every item under row policy, and a lane it did not return is
// absent with no heading and no placeholder (632).
//
// Two vocabularies, never one (1093, 1105): the five lenses switch who the events come from, the nine
// lanes are sections of the page. Every lens word comes from `convene_lenses` and every lane name from
// `convene_lanes`; the ids alone live in code.
//
// Layout (1082 as amended by 1094; item 7). The LensBar shows the five lenses with labels always and
// icons at every tier and no seat after the lenses. The FacetRail is collapsed by default at every width: a
// Sheet behind the Filters trigger at compact, and the 64 strip at medium and expanded, opened and
// collapsed by the member and remembered per member per width band. There is no right column. At
// expanded a card opens the event page as Strand's Pane over the lanes (688, 1047): the rail collapses
// to its strip, the card the pane shows is ringed (1083), and Previous and Next step through the lane
// the card was opened from, in its visible order, past what the member dismissed (1044).
//
// A card is a real link to the event's address across its whole face (1067; correction 28, G100): a
// plain click opens the pane at expanded and the route below it, and a new tab, a copied link or a
// middle click is the browser's. At expanded with a pointer, the face's preload warms the event route
// and the page's read under the key EventSurface reads (1067). The read refetches on window focus and
// never live.
//
// No digit renders except in a card's when line: the reason row is words (1096), the where line is a
// format word and places, and there is no count anywhere.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { EVENT_PAGE_KEY } from "@/components/dna/EventSurface";
import { Ghosts } from "@/components/dna/Ghosts";
import { LoadError } from "@/components/dna/LoadError";
import { Button } from "@/components/strand/Button";
import { Chip } from "@/components/strand/Chip";
import { DiaLine } from "@/components/strand/DiaLine";
import { EmptyState } from "@/components/strand/EmptyState";
import {
  FacetRail,
  type FacetAxis,
  type FacetLadder,
  type FacetValue,
} from "@/components/strand/FacetRail";
import { Icon } from "@/components/strand/Icon";
import { IconButton } from "@/components/strand/IconButton";
import { LensBar, type Lens } from "@/components/strand/LensBar";
import type { MenuProps } from "@/components/strand/Menu";
import { Pane } from "@/components/strand/Pane";
import { PostCard } from "@/components/strand/PostCard";
import { Toast } from "@/components/strand/Toast";
import type { Member } from "@/lib/auth";
import {
  dismissDiscoveryItem,
  loadConvenePlaces,
  loadDiscovery,
  setSubscription,
  type ConveneLensId,
  type ConvenePlace,
  type Discovery,
  type DiscoveryFormat,
  type DiscoveryHome,
  type DiscoveryHomeRung,
  type DiscoveryItem,
  type DiscoveryLaneId,
  type DiscoveryPrice,
  type DiscoveryReason,
  type DiscoverySection,
  type DiscoveryWhen,
} from "@/lib/discovery";
import {
  discoveryFacets,
  droppedUnknown,
  facetLists,
  NO_FACETS,
  searchOf,
  type DiscoverySearch,
  type FacetLists,
} from "@/lib/discovery-search";
import { setFollowing } from "@/lib/connect";
import { downloadIcs, loadEventPage } from "@/lib/event-page";
import { setSaved } from "@/lib/feed";
import { setHeaderLens } from "@/lib/header-lens-store";
import { useBackToOrigin, type Origin } from "@/lib/origin";
import type { EventView } from "@/lib/post-view";
import { readRailCollapsed, railBand, writeRailCollapsed, type RailBand } from "@/lib/rail-memory";
import { setLeftRail, setRightRail, setShellLayout } from "@/lib/rail-store";
import { useShellScroll } from "@/lib/shell-scroll";
import { useMode, useTier, useWide } from "@/lib/tier";
import { loadVocabularies } from "@/lib/vocabularies";
import { toastStyle, useShare } from "./FeedSurface";

declare module "@tanstack/history" {
  interface HistoryState {
    /** Handoff 32-B item 7 (1083, 1044): the lane a Discovery card was opened from, for stepping. */
    discoveryLane?: string;
  }
}

const TOAST_MS = 2600;
const RAIL_SURFACE = "discovery";

/**
 * The three structural axes' words (item 2, 1095), in the projection's own facet values. These are
 * words in code rather than a vocabulary table; a gap names it (item 11). Price is Free and Paid only.
 */
const FORMAT_OPTIONS: { id: DiscoveryFormat; label: string }[] = [
  { id: "in_person", label: "In person" },
  { id: "online", label: "Online" },
  { id: "hybrid", label: "Hybrid" },
];
const PRICE_OPTIONS: { id: DiscoveryPrice; label: string }[] = [
  { id: "free", label: "Free" },
  { id: "paid", label: "Paid" },
];
const WHEN_OPTIONS: { id: DiscoveryWhen; label: string }[] = [
  { id: "two_weeks", label: "Next two weeks" },
  { id: "this_month", label: "This month" },
  { id: "later", label: "Later" },
];

/** Place's kind words (1095): each option names what it is. */
const PLACE_KIND: Record<ConvenePlace["kind"], string> = {
  city: "City",
  region: "Region",
  country: "Country",
};

/** `Accra`, `Accra and Nairobi`, `Accra, Nairobi and Lagos`. */
function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? "";
  return words.slice(0, -1).join(", ") + " and " + words[words.length - 1];
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** The four lanes whose reason row speaks (1096); every other lane holds the row empty. */
const REASON_LANES: ReadonlySet<DiscoveryLaneId> = new Set([
  "follow",
  "taste",
  "curated",
  "network",
]);

/**
 * The reason row (1096), composed only from the item's reason, in words. Undefined renders the row
 * empty with its height held: a reason with a null name has nothing to say (grounded-or-empty).
 */
function reasonFor(lane: DiscoveryLaneId, reason: DiscoveryReason): string | undefined {
  if (!REASON_LANES.has(lane)) return undefined;
  switch (reason.kind) {
    case "follow":
      return reason.host.name ? "Because you follow " + reason.host.name + "." : undefined;
    case "taste":
      return reason.label ? "Because you follow " + lowerFirst(reason.label) + "." : undefined;
    case "curated":
      return reason.editor.name ? "Curated by " + reason.editor.name + "." : undefined;
    case "network": {
      if ("host" in reason)
        return reason.host.name ? reason.host.name + ", a connection, is hosting." : undefined;
      const names = reason.going.map((p) => p.name);
      if (names.length === 0 || names.some((n) => !n)) return undefined;
      return names.length === 1
        ? names[0] + " is going."
        : joinWords(names as string[]) + " are going.";
    }
    default:
      return undefined;
  }
}

/** Where (item 4): "In person · Accra", "Online", "Hybrid · Accra and London". */
function whereFor(ev: EventView): string {
  if (ev.mode === "virtual") return "Online";
  const word = ev.mode === "hybrid" ? "Hybrid" : "In person";
  const places = joinWords(ev.places);
  return places ? word + " · " + places : word;
}

/** A home as the ladder names it: its city, else its place. */
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

type SeeAll = { to: "/convene"; search: DiscoverySearch } | { lens: ConveneLensId };

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
  const openLane = useLocation({ select: (l) => l.state.discoveryLane });
  const { scrolled, scrollerRef } = useShellScroll();
  const { share, copy, toast: shareToast } = useShare();
  const [toast, setToast] = useState<string | null>(null);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const [homes, setHomes] = useState<DiscoveryHome[] | null>(null);
  // The member's own acts on a card, held until the reads they change have answered again (item 6).
  const [savedNow, setSavedNow] = useState<Record<string, boolean>>({});
  const [followNow, setFollowNow] = useState<Record<string, boolean>>({});
  const [subscribedNow, setSubscribedNow] = useState<Record<string, boolean>>({});
  const [railNow, setRailNow] = useState<Partial<Record<RailBand, boolean>>>({});

  const vocab = useQuery({ queryKey: ["vocabularies"], queryFn: loadVocabularies });
  const lensRows = useMemo(() => vocab.data?.convene_lenses ?? [], [vocab.data]);
  const laneRows = useMemo(() => vocab.data?.convene_lanes ?? [], [vocab.data]);
  const familyRows = useMemo(() => vocab.data?.convene_families ?? [], [vocab.data]);
  const knownFamilies = useMemo(
    () => (vocab.data ? (vocab.data.convene_families ?? []).map((f) => f.value) : null),
    [vocab.data],
  );
  const placesRead = useQuery({
    queryKey: ["convene-places", member.id],
    queryFn: loadConvenePlaces,
    staleTime: 60_000,
  });
  const places = useMemo(() => placesRead.data ?? [], [placesRead.data]);
  const knownPlaces = useMemo(
    () => (placesRead.data ? placesRead.data.map((p) => p.id) : null),
    [placesRead.data],
  );

  const lists = useMemo(() => facetLists(search), [search]);
  const known = useMemo(
    () => ({ families: knownFamilies, homes, places: knownPlaces }),
    [knownFamilies, homes, knownPlaces],
  );
  const facets = useMemo(() => ({ lens, ...discoveryFacets(lists, known) }), [lens, lists, known]);
  const read = useQuery({
    queryKey: ["discovery", member.id, facets],
    queryFn: () => loadDiscovery(member, facets),
    // A facet change keeps the lens's previous answer on screen until the narrowed one lands; a lens
    // change does not, because the previous lens's lanes are not this lens's.
    placeholderData: (prev: Discovery | null | undefined) =>
      prev && prev.lens === lens ? prev : undefined,
    // 1068: the lanes re-read when the member comes back to the window, never live.
    refetchOnWindowFocus: true,
  });
  const data = read.data ?? null;
  useEffect(() => {
    if (read.data) setHomes(read.data.homes);
  }, [read.data]);

  // An unknown facet value leaves the query once a read has shown it to be unknown (item 2).
  useEffect(() => {
    const next = droppedUnknown(lists, known);
    if (!next) return;
    // `state: true` keeps the history state, so a pane open over the lanes keeps its origin and the
    // lane it steps through while only the search changes.
    void navigate({
      to: ".",
      search: searchOf(next) as never,
      replace: true,
      resetScroll: false,
      state: true,
    });
  }, [lists, known, navigate]);

  // An act's optimistic word stands until every read it changes has answered again (this surface's
  // projection, and the Feed's marks or the event page's follow beside it); then the read is the
  // source, so a change made elsewhere is never hidden behind it. A failed re-read keeps the word.
  const reread = (keys: string[][], drop: () => void) =>
    void Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey }))).then(
      drop,
      () => undefined,
    );
  const unset =
    <V,>(key: string) =>
    (m: Record<string, V>) => {
      const n = { ...m };
      delete n[key];
      return n;
    };

  const say = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), TOAST_MS);
  };

  // The rail's memory (1111): the member's row for this band, else collapsed; never written on load.
  const band = railBand(tier, wide);
  const railRead = useQuery({
    queryKey: ["rail-state", member.id, RAIL_SURFACE, band],
    queryFn: () => readRailCollapsed(member.id, RAIL_SURFACE, band as RailBand),
    enabled: !!band,
    staleTime: Infinity,
  });
  const railCollapsed = band ? (railNow[band] ?? railRead.data ?? true) : true;
  const setRailCollapsed = (collapsed: boolean) => {
    if (!band) return;
    setRailNow((r) => ({ ...r, [band]: collapsed }));
    writeRailCollapsed(member.id, RAIL_SURFACE, band, collapsed).then(
      () => qc.setQueryData(["rail-state", member.id, RAIL_SURFACE, band], collapsed),
      () => {
        setRailNow((r) => ({ ...r, [band]: !collapsed }));
        say("That did not go through. Try again.");
      },
    );
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
  // At expanded the event opens as the pane over the lanes, which stay where they are (688); below it
  // the event page is its own route (1023). Either way it is one navigation, and it carries the origin
  // (1063, 1065) and the lane it was opened from, which Previous and Next step through (1083).
  const origin: Origin =
    lens === "all"
      ? { label: "Discovery", to: "/convene", params: {}, search }
      : { label: "Discovery", to: "/convene/$lens", params: { lens }, search };
  const openEvent = (eventId: string, lane: DiscoveryLaneId, replace = false) =>
    void navigate({
      to: "/convene/events/$id",
      params: { id: eventId },
      search,
      resetScroll: false,
      replace,
      state: (prev) => ({ ...prev, origin, discoveryLane: lane }),
    });
  // G100: the face's address is the location `openEvent` navigates to, facets and all, so the link a
  // member copies or opens in a new tab is the page a plain click shows (1067).
  const eventHref = (eventId: string) =>
    router.buildLocation({ to: "/convene/events/$id", params: { id: eventId }, search }).href;
  // The pane closes to the lens it was opened from, with its facets (1063, 719). An event opened from
  // outside Discovery (the Feed's Event hook) closes to that origin by 1065's rule.
  const toOrigin = useBackToOrigin();
  const closeToDiscovery = () =>
    void (lens === "all"
      ? navigate({ to: "/convene", search, resetScroll: false })
      : navigate({ to: "/convene/$lens", params: { lens }, search, resetScroll: false }));
  const fromElsewhere = !!toOrigin.arrivedFrom && toOrigin.arrivedFrom.to === "/feed";
  const closePane = fromElsewhere ? toOrigin.go : closeToDiscovery;
  // 1067: preload at expanded with a pointer warms the event route and the page's one read under
  // EventSurface's key, so the pane opens with data. Never at compact or medium, never on touch.
  const warmEvent = (eventId: string) => {
    void router.preloadRoute({ to: "/convene/events/$id", params: { id: eventId }, search });
    void qc.prefetchQuery({
      queryKey: [EVENT_PAGE_KEY, member.id, eventId],
      queryFn: () => loadEventPage(eventId),
      staleTime: 30_000,
    });
  };

  const dismiss = async (item: DiscoveryItem, lane: DiscoveryLaneId) => {
    const key = lane + ":" + item.event_id;
    setDismissed((s) => new Set(s).add(key));
    say("Fewer like this in your lanes.");
    try {
      await dismissDiscoveryItem(item.event_id, lane);
    } catch {
      setDismissed((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      });
      say("That did not go through. Try again.");
    }
  };

  // The lens set (693, 1093): every word from the vocabulary; the seat reads `short`.
  const lenses: Lens<ConveneLensId>[] = useMemo(
    () => lensRows.map((l) => ({ id: l.value, label: l.short, icon: l.icon, scope: l.scope })),
    [lensRows],
  );
  const lensScope = lensRows.find((l) => l.value === lens)?.scope;
  const laneOrder = useMemo(
    () => new Map<string, number>(laneRows.map((l, i) => [l.value, i])),
    [laneRows],
  );
  const familyLabel = (family: string | null) =>
    family ? (familyRows.find((f) => f.value === family)?.label ?? null) : null;

  // Place (1095): the first chosen city names the Near lane "While you are in {city}".
  const placeName = (id: string) => places.find((p) => p.id === id)?.name ?? null;
  const chosenCity = lists.place.find((p) => p.startsWith("city|"));
  const nearCity = chosenCity ? placeName(chosenCity) : null;
  const laneName = (id: DiscoveryLaneId) =>
    id === "near" && nearCity
      ? "While you are in " + nearCity
      : (laneRows.find((l) => l.value === id)?.name ?? null);

  // Filters (item 2, 1095, 1110; B9-SPEC Revision 2's Filters line): Format, Price, When, Topics,
  // Home, Place, in that order; no count.
  const ladders: FacetLadder[] = (homes ?? []).flatMap((h) => {
    const w = homeWord(h);
    if (!w) return [];
    const rungs = [
      { id: h.id + ":in", label: "In " + w },
      { id: h.id + ":around", label: "Around " + w },
      ...(h.region ? [{ id: h.id + ":region", label: h.region }] : []),
      ...(h.country ? [{ id: h.id + ":country", label: h.country }] : []),
      { id: "anywhere", label: "Anywhere" },
    ];
    return [{ id: h.id, label: w, rungs }];
  });
  const axes: FacetAxis[] = [
    {
      id: "format",
      label: "Format",
      icon: "map-pin",
      select: "single",
      display: "segment",
      anyLabel: "Any",
      options: FORMAT_OPTIONS,
    },
    {
      id: "price",
      label: "Price",
      icon: "ticket",
      select: "single",
      display: "segment",
      anyLabel: "Any",
      options: PRICE_OPTIONS,
    },
    {
      id: "when",
      label: "When",
      icon: "clock",
      select: "single",
      display: "segment",
      anyLabel: "Any",
      options: WHEN_OPTIONS,
    },
    {
      id: "family",
      label: "Topics",
      icon: "hash",
      display: "checklist",
      // G102 (correction 28): two columns once the checklist is 150 wide, which both rails are.
      columns: 2,
      options: familyRows.map((f) => ({ id: f.value, label: f.label })),
    },
    ...(ladders.length
      ? [{ id: "home", label: "Home", icon: "house", select: "single" as const, ladders }]
      : []),
    {
      id: "place",
      label: "Place",
      icon: "globe",
      display: "combobox",
      placeholder: "Anywhere in the world",
      removeLabel: "Remove",
      options: places.map((p) => ({
        id: p.id,
        label: p.name,
        detail:
          p.kind === "country" || !p.country
            ? PLACE_KIND[p.kind]
            : PLACE_KIND[p.kind] + ", " + p.country,
      })),
    },
  ];
  const railValue: FacetValue = {};
  for (const k of ["format", "price", "when", "family", "place"] as const)
    if (lists[k].length) railValue[k] = [...lists[k]];
  if (lists.home[0]) railValue["home"] = [lists.home[0] + ":" + (lists.rung[0] ?? "in")];
  const onRail = (next: FacetValue) => {
    const rung = (next["home"] ?? [])[0];
    const [homeId, step] = rung && rung !== "anywhere" ? rung.split(":") : [];
    setFacets({
      format: (next["format"] ?? []).filter((v): v is DiscoveryFormat =>
        FORMAT_OPTIONS.some((o) => o.id === v),
      ),
      price: (next["price"] ?? []).filter((v): v is DiscoveryPrice =>
        PRICE_OPTIONS.some((o) => o.id === v),
      ),
      when: (next["when"] ?? [])
        .slice(0, 1)
        .filter((v): v is DiscoveryWhen => WHEN_OPTIONS.some((o) => o.id === v)),
      family: next["family"] ?? [],
      home: homeId ? [homeId] : [],
      rung: homeId && step && step !== "in" ? [step as DiscoveryHomeRung] : [],
      place: next["place"] ?? [],
    });
  };
  const clearFacets = () => setFacets(NO_FACETS);

  // Applied facets as removable Chips at compact (SPEC section 4), each by its own word; a value no
  // read has named yet shows no chip.
  const chips: { key: string; label: string; remove: () => void }[] = [];
  const without = (axis: keyof FacetLists, v: string) =>
    setFacets({ ...lists, [axis]: (lists[axis] as string[]).filter((x) => x !== v) } as FacetLists);
  for (const a of axes) {
    if (a.id === "home") {
      const v = railValue["home"]?.[0];
      const label = v && ladders.flatMap((l) => l.rungs).find((r) => r.id === v)?.label;
      if (label)
        chips.push({
          key: "home:" + v,
          label,
          remove: () => setFacets({ ...lists, home: [], rung: [] }),
        });
      continue;
    }
    for (const v of lists[a.id as keyof FacetLists] ?? []) {
      const label = a.options?.find((o) => o.id === v)?.label;
      if (label)
        chips.push({
          key: a.id + ":" + v,
          label,
          remove: () => without(a.id as keyof FacetLists, v),
        });
    }
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
        // Item 7 and B9-SPEC's tiers: labels always and icons at every tier. At compact the five
        // words and glyphs do not fit five equal seats, so there each seat hugs its word and the
        // bar's root is `max-content` in a row that scrolls sideways (B9-SPEC's compact line): nothing is
        // squeezed and the page does not pan.
        width={compact ? "content" : "fill"}
        labels="always"
        icons
        collapsed={inContent ? scrolled : undefined}
        style={compact ? { width: "max-content", maxWidth: "none" } : undefined}
      />
    ) : null;

  // The shell's `lanes` mode, the rails and the header lens, each set while mounted and cleared on
  // unmount (rail-store.ts, header-lens-store.ts). The key is the lens, so the pane opening over the
  // lanes keeps their scroll and a lens change resets it. There is no right column (item 7).
  const lensKey = lenses.map((l) => l.id + l.label).join("|");
  const railShut = paneOpen || railCollapsed;
  useEffect(() => {
    setShellLayout({
      mode: "lanes",
      rail: railShut ? "collapsed" : "open",
      key: lens,
      top: compact ? null : lensBar(false),
    });
    // lensBar reads the lens set, the lens, its scope and the search; listing those is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, railShut, lens, lensKey, lensScope, search]);
  useEffect(() => {
    if (compact) {
      setLeftRail(null);
      return;
    }
    setLeftRail({
      label: null,
      node: railShut ? (
        <FacetRail
          mode="collapsed"
          axes={axes}
          value={railValue}
          label="Filters"
          expandLabel={paneOpen ? "Back to Discovery and show filters" : "Show filters"}
          onExpand={() => {
            // Item 3 (D6; 1094, 1111): the strip is the rail's own toggle. With the pane open it
            // closes the pane and shows the filters, as its name says; the write is the member's
            // toggle, never the pane's, and nothing is written when the rail is already open.
            if (railCollapsed) setRailCollapsed(false);
            if (paneOpen) closeToDiscovery();
          }}
        />
      ) : (
        <FacetRail
          tier="expanded"
          axes={axes}
          value={railValue}
          onChange={onRail}
          onClear={clearFacets}
          label="Filters"
          // G111 (correction 28): Clear all in the pinned heading row, so it stays in view as the
          // axes scroll beneath it. The rail is its own scroller only when its height is bounded
          // (25 §3), so it takes its column's height less the sticky inset it rests at, and the
          // heading pins inside it rather than scrolling away with the column.
          clearPlacement="heading"
          style={{ maxHeight: "calc(100% - var(--space-4))" }}
          headingAction={
            <IconButton
              name="panel-left-close"
              label="Collapse filters"
              size={touch ? 44 : 36}
              onClick={() => setRailCollapsed(true)}
            />
          }
        />
      ),
    });
    // The rail reads the axes' sources and the current facets; listing those is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    compact,
    railShut,
    railCollapsed,
    paneOpen,
    band,
    touch,
    lists,
    familyRows,
    homes,
    places,
    lens,
    search,
  ]);
  useEffect(() => {
    setRightRail(null);
  }, []);
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

  // The lanes as this member may see them now: the projection's, in the lanes' order, less what they
  // dismissed here.
  const sections: DiscoverySection[] = (data?.sections ?? [])
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => !dismissed.has(s.section + ":" + i.event_id)),
    }))
    .sort((a, b) => (laneOrder.get(a.section) ?? 99) - (laneOrder.get(b.section) ?? 99));

  // 650, 1046: DIA's one sentence for a member who follows no host, in plain text with the host's name
  // unlinked (1053).
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

  const followedIds = new Set((data?.follows ?? []).map((f) => f.id));
  const subscribedFamilies = new Set((data?.subscriptions ?? []).map((s) => s.family));

  /** The menu (1097): items in the ruled order; an item that does not apply is absent. */
  const menuFor = (item: DiscoveryItem, lane: DiscoveryLaneId): MenuProps["items"] => {
    const post = item.post;
    const ev = post.event;
    const postId = post.id ?? "";
    const saved = postId ? (savedNow[postId] ?? !!data?.saved.has(postId)) : false;
    const going = !!data?.going.has(item.event_id);
    const hostId = ev?.hostId ?? "";
    // 1121: the Follow item names the presenter as the pane does, and follows the host as it does.
    const presenter = ev?.presenter?.name ?? post.author_name;
    const presenterKind = ev?.presenter?.kind ?? post.author_kind;
    const canFollow = presenterKind === "member" && !!hostId && hostId !== member.id && !!presenter;
    const following = hostId ? (followNow[hostId] ?? followedIds.has(hostId)) : false;
    const family = ev?.family ?? "";
    const topic = familyLabel(family);
    const subscribed = family ? (subscribedNow[family] ?? subscribedFamilies.has(family)) : false;
    return [
      !!postId && {
        id: "share",
        label: "Share",
        icon: "share",
        onSelect: () => void share(postId),
      },
      !!postId && {
        id: "copy",
        label: "Copy link",
        icon: "link",
        onSelect: () => void copy(postId),
      },
      !!postId && {
        id: "save",
        label: saved ? "Saved" : "Save",
        icon: "bookmark",
        onSelect: () => {
          setSavedNow((s) => ({ ...s, [postId]: !saved }));
          setSaved(member.id, postId, !saved).then(
            () =>
              reread(
                [
                  ["discovery", member.id],
                  ["marks", member.id],
                ],
                () => setSavedNow(unset(postId)),
              ),
            () => {
              setSavedNow((s) => ({ ...s, [postId]: saved }));
              say("That did not go through. Try again.");
            },
          );
        },
      },
      // 1097: only for an event the member is going to, and only one with a date, which is the
      // event page's own rule for its calendar file.
      going &&
        !!ev?.startsAt && {
          id: "calendar",
          label: "Add to calendar",
          icon: "calendar",
          onSelect: () => {
            void qc
              .fetchQuery({
                queryKey: [EVENT_PAGE_KEY, member.id, item.event_id],
                queryFn: () => loadEventPage(item.event_id),
                staleTime: 30_000,
              })
              .then(
                (page) => {
                  if (!page || !downloadIcs(page.calendar, page.event.slug))
                    say("The calendar file could not be made.");
                },
                () => say("The calendar file could not be made."),
              );
          },
        },
      { rule: true },
      canFollow && {
        id: "follow",
        label: (following ? "Following " : "Follow ") + presenter,
        icon: "user-plus",
        onSelect: () => {
          setFollowNow((f) => ({ ...f, [hostId]: !following }));
          setFollowing(hostId, !following).then(
            () =>
              reread(
                [
                  ["discovery", member.id],
                  ["event-follow", member.id],
                ],
                () => setFollowNow(unset(hostId)),
              ),
            () => {
              setFollowNow((f) => ({ ...f, [hostId]: following }));
              say("That did not go through. Try again.");
            },
          );
        },
      },
      !!family &&
        !!topic && {
          id: "subscribe",
          label: (subscribed ? "Subscribed to " : "Subscribe to ") + topic,
          icon: "bell",
          onSelect: () => {
            setSubscribedNow((s) => ({ ...s, [family]: !subscribed }));
            setSubscription(family, !subscribed).then(
              () => reread([["discovery", member.id]], () => setSubscribedNow(unset(family))),
              () => {
                setSubscribedNow((s) => ({ ...s, [family]: subscribed }));
                say("That did not go through. Try again.");
              },
            );
          },
        },
      { rule: true },
      { id: "not", label: "Not this", icon: "x", onSelect: () => void dismiss(item, lane) },
    ];
  };

  const card = (item: DiscoveryItem, lane: DiscoveryLaneId, lensList = false) => {
    const post = item.post;
    const ev = post.event;
    const title = post.fields["title"]?.value;
    const topic = familyLabel(ev?.family ?? null);
    const family = ev?.family ?? null;
    // 1121: the presenter row reads the pane's presenter, name, face and handle from one record; a
    // card the read answered nothing for keeps the author's line (416).
    const shown = ev?.presenter;
    const presenterHandle = shown ? shown.handle : post.author_handle;
    return (
      <div
        key={lane + ":" + item.event_id}
        data-discovery-item={item.event_id}
        data-section={lane}
        style={{ flex: "none", scrollSnapAlign: "start" }}
      >
        <PostCard
          presentation="discovery"
          c="convene"
          // Handoff 32-B's lens list: a lens but All is a vertical list of the same card at 680.
          // B9-SPEC Revision 2's grid at --lane-card-width (1125) is 1131's first handoff.
          style={lensList ? { width: "min(680px, 100%)" } : undefined}
          // G115 (1087; correction 28): the part clamps the title on a span inside its link, so the
          // title is the string itself and the ellipsis is named "More: {title}".
          title={typeof title === "string" ? title : undefined}
          // G100 (1067; correction 28): the face is a real link to the address the plain click
          // navigates to, so a new tab, a copied link and a middle click open the event; a plain
          // primary click is still `onOpen`, the pane at expanded and the route below it.
          href={eventHref(item.event_id)}
          when={ev?.when || undefined}
          where={ev ? whereFor(ev) : undefined}
          presenter={(shown ? shown.name : post.author_name) || undefined}
          presenterSrc={shown ? shown.avatar : post.author_avatar}
          topic={topic ?? undefined}
          reason={reasonFor(lane, item.reason)}
          media={post.media[0]}
          menu={menuFor(item, lane)}
          selected={paneOpen && paneId === item.event_id && (openLane ?? lane) === lane}
          onOpen={() => openEvent(item.event_id, lane)}
          onPreload={expanded && !touch ? () => warmEvent(item.event_id) : undefined}
          onPresenter={
            presenterHandle
              ? () => void navigate({ to: "/m/$handle", params: { handle: presenterHandle } })
              : undefined
          }
          onTopic={
            family && !lists.family.includes(family)
              ? () => setFacets({ ...lists, family: [...lists.family, family] })
              : undefined
          }
        />
      </div>
    );
  };

  const sentenceLine = (
    <DiaLine state="done" text={sentence ?? undefined} style={{ alignItems: "flex-start" }} />
  );

  // See all (item 3; 1092, 1112, 1122): Happening soon applies the two weeks, the four relationship
  // lanes switch to their lens, and This weekend, Join from anywhere, New this week and Near your
  // homes carry none. Format is single-choice, so no See all writes a Format value (1122).
  const seeAllOf = (id: DiscoveryLaneId): SeeAll | null => {
    if (id === "soon") return { to: "/convene", search: { ...search, when: "two_weeks" } };
    if (id === "curated" || id === "follow" || id === "taste" || id === "network")
      return { lens: id };
    return null;
  };
  const seeAllLink = (id: DiscoveryLaneId, to: SeeAll) => (
    <a
      href={
        "lens" in to
          ? router.buildLocation({ to: "/convene/$lens", params: { lens: to.lens }, search }).href
          : router.buildLocation({ to: "/convene", search: to.search }).href
      }
      data-see-all={id}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        if ("lens" in to) setLens(to.lens);
        else void navigate({ to: "/convene", search: to.search, resetScroll: false });
      }}
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
    </a>
  );

  const lane = (id: DiscoveryLaneId, first: boolean, body: ReactNode, withSeeAll: boolean) => {
    const name = laneName(id);
    const hid = "lane-" + id;
    const to = withSeeAll ? seeAllOf(id) : null;
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
          {to && seeAllLink(id, to)}
        </div>
        {body}
      </section>
    );
  };

  // 1065: the router's element restoration keys each lane on its id, so Back returns every lane to
  // where the member left it. The shell's scrollToTopSelectors name the columns only, never a lane.
  const laneRow = (id: DiscoveryLaneId, children: ReactNode) => (
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
        // The selected ring sits 4px outside the card (1083), so the row keeps 4px above it.
        padding: "4px 0 8px",
        // Inline, the padding is drawn back out by a negative margin and repeated as scroll padding,
        // so the first card lines up with the lane's heading. Only expanded rings a card (the pane
        // opens there), so only expanded keeps 4px beside it, drawn back on the left alone: the
        // expanded column has no end padding to take it, and overflow at the start never scrolls.
        // Medium keeps none: with 4px there, Chrome re-snapped the router's restore on Back 4px
        // short (1065).
        ...(compact
          ? { margin: "0 -16px", paddingLeft: 16, paddingRight: 16, scrollPaddingInline: 16 }
          : expanded
            ? {
                marginLeft: -4,
                minWidth: 0,
                paddingLeft: 4,
                paddingRight: 4,
                scrollPaddingInline: 4,
              }
            : { minWidth: 0 }),
      }}
    >
      {children}
    </div>
  );

  // All (685, 1092): each lane the projection returned, in the lanes' order, and the Communities
  // lane as its sentence alone, in its own place in that order, when the member follows no host.
  const followLane = sections.find((s) => s.section === "follow");
  const sentenceLane =
    lens === "all" && !!sentence && (!followLane || followLane.items.length === 0);
  const laneList: { id: DiscoveryLaneId; body: ReactNode; seeAll: boolean }[] = [
    ...sections
      .filter((s) => s.items.length > 0)
      .map((s) => ({
        id: s.section,
        body: laneRow(
          s.section,
          s.items.map((it) => card(it, s.section)),
        ),
        seeAll: lens === "all",
      })),
    ...(sentenceLane ? [{ id: "follow" as const, body: sentenceLine, seeAll: false }] : []),
  ].sort((a, b) => (laneOrder.get(a.id) ?? 99) - (laneOrder.get(b.id) ?? 99));
  const lanesView = (
    <div data-lanes style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      {laneList.map((l, i) => lane(l.id, i === 0, l.body, l.seeAll))}
    </div>
  );

  // A lens (693, 1105): its one lane as a vertical list of the same card at 680 (handoff 32-B;
  // B9-SPEC Revision 2's grid, 1125, is 1131's first handoff), or the EmptyState.
  const lensLane: DiscoveryLaneId | null = lens === "all" ? null : lens;
  const lensSection = lensLane ? sections.find((s) => s.section === lensLane) : undefined;
  const lensView = lensLane ? (
    <div
      data-lens-list={lensLane}
      style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", minWidth: 0 }}
    >
      {laneName(lensLane) && <h2 style={H2}>{laneName(lensLane)}</h2>}
      {lensLane === "follow" && sentence && !lensSection?.items.length ? (
        sentenceLine
      ) : lensSection && lensSection.items.length > 0 ? (
        <div data-lens-cards style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {lensSection.items.map((it) => card(it, lensLane, true))}
        </div>
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
  ) : null;

  const body = read.isError ? (
    <LoadError
      title="Convene could not load."
      body="Check your connection and try again."
      onRetry={() => void read.refetch()}
    />
  ) : !read.data && read.isPending ? (
    <Ghosts label="Loading Convene" lane={lens === "all"} />
  ) : lens === "all" ? (
    lanesView
  ) : (
    lensView
  );

  // Pane stepping (1083, 1044): Previous and Next across the lane the open card came from, in its
  // order, to the nearest neighbours the member has not dismissed. The open card is found in the lane
  // as the projection answered it, so dismissing the card that is open still steps from its place.
  // An event opened from outside Discovery, or not in the lane the projection answered, steps nowhere.
  const stepLane =
    paneOpen && openLane ? (data?.sections ?? []).find((s) => s.section === openLane) : undefined;
  const stepIds = stepLane ? stepLane.items.map((i) => i.event_id) : [];
  const at = paneId ? stepIds.indexOf(paneId) : -1;
  const kept = (id: string) => !dismissed.has(openLane + ":" + id);
  const prevId = at > -1 ? stepIds.slice(0, at).reverse().find(kept) : undefined;
  const nextId = at > -1 ? stepIds.slice(at + 1).find(kept) : undefined;
  const stepping =
    stepLane && at > -1
      ? {
          onPrevious: () => {
            if (prevId) openEvent(prevId, stepLane.section, true);
          },
          onNext: () => {
            if (nextId) openEvent(nextId, stepLane.section, true);
          },
          hasPrevious: !!prevId,
          hasNext: !!nextId,
          previousLabel: "Previous event",
          nextLabel: "Next event",
        }
      : {};

  // G110 (B9-SPEC Revision 2's pane line; 1127, correction 28): the pane at 520 with the list
  // taking the rest, bounded to the feed column's own height so the list column and the pane body
  // each scroll on their own and the column itself never does. The spec writes that height as the
  // frame less the header less 88; this shell's lens row, with its scope line, is 122 tall where
  // that 88 allows for 64 of row and foot, so the literal value overran the column. The pane takes
  // the column's own height instead (see the wrapper below), which is the frame less the header,
  // the lens row and the canvas's foot, and holds at every expanded width.
  //
  // The toolbar (Hide or show the list, Copy link, Share) and the cluster (Previous event, Next
  // event, Back to Discovery) share the pane's top row. Hide list keeps the list the same element,
  // hidden and inert with its scroll kept, and centres the pane at 720; it lasts while the pane is
  // open and resets when it closes. Copy link and Share are the card menu's own share path
  // (`useShare`, 1097) with the open event's post, found in the lanes the projection answered or in
  // the event page's read the pane already made, and absent when neither names one.
  const [listHidden, setListHidden] = useState(false);
  useEffect(() => {
    if (!paneOpen) setListHidden(false);
  }, [paneOpen]);
  const paneItem =
    paneOpen && paneId
      ? (data?.sections ?? []).flatMap((s) => s.items).find((i) => i.event_id === paneId)
      : undefined;
  // An observer only: EventSurface makes this read under the same key, and this never fetches.
  const paneRead = useQuery({
    queryKey: [EVENT_PAGE_KEY, member.id, paneId ?? ""],
    queryFn: () => loadEventPage(paneId ?? ""),
    enabled: false,
  });
  const panePostId = paneItem?.post.id ?? paneRead.data?.post?.id ?? null;
  const paneTitleField = paneItem?.post.fields["title"]?.value;
  // The pane and its toolbar are named by the event; until its title is known, by "Event".
  const paneTitle =
    (typeof paneTitleField === "string" ? paneTitleField : null) ??
    paneRead.data?.event.title ??
    "Event";

  // Previous and Next replace the event under the same pane, so the body starts each one at its top.
  // The body is the part's own scroller (correction 28), reached from this surface's root.
  const paneRoot = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    paneRoot.current?.querySelector<HTMLElement>("[data-pane-body]")?.scrollTo({ top: 0 });
  }, [paneId]);
  // 688: the lanes stay where the member left them. With the pane bounded the feed column cannot
  // scroll (its offset clamps to 0) and the list column scrolls instead. So the card at the list
  // column's top is kept, with its distance from that top, and when the pane closes the feed column
  // is scrolled to put the same card at the same distance. A card, not an offset: a lens list's
  // cards are `min(680px, 100%)`, narrower and so shorter in the list column than in the full one.
  // While the list is hidden its layout has no width, so the place it was hidden at is the one kept.
  const listAnchor = useRef<{ item: string; section: string; at: number } | null>(null);
  const hiddenNow = useRef(listHidden);
  hiddenNow.current = listHidden;
  useLayoutEffect(() => {
    if (!paneOpen) {
      const column = scrollerRef.current;
      const kept = listAnchor.current;
      listAnchor.current = null;
      if (!column || !kept) return;
      const el = Array.from(column.querySelectorAll<HTMLElement>("[data-discovery-item]")).find(
        (e) => e.dataset["discoveryItem"] === kept.item && e.dataset["section"] === kept.section,
      );
      if (el)
        column.scrollTop +=
          el.getBoundingClientRect().top - column.getBoundingClientRect().top - kept.at;
      return;
    }
    const list = paneRoot.current?.querySelector<HTMLElement>("[data-pane-list]");
    if (!list) return;
    const keep = () => {
      if (hiddenNow.current) return;
      if (list.scrollTop <= 0) {
        listAnchor.current = null;
        return;
      }
      const top = list.getBoundingClientRect().top;
      const first = Array.from(list.querySelectorAll<HTMLElement>("[data-discovery-item]")).find(
        (e) => e.getBoundingClientRect().bottom > top,
      );
      listAnchor.current = first
        ? {
            item: first.dataset["discoveryItem"] ?? "",
            section: first.dataset["section"] ?? "",
            at: first.getBoundingClientRect().top - top,
          }
        : null;
    };
    keep();
    list.addEventListener("scroll", keep, { passive: true });
    return () => list.removeEventListener("scroll", keep);
  }, [paneOpen, scrollerRef]);

  // The list follows the open card (1083): Pane's `selectedKey` brings it into the bounded list
  // column's view vertically, and a lane scrolls sideways, so it is brought into its lane's view here.
  // Hidden, the list has no width to follow in. Shown again on the card it was hidden on, it keeps
  // its place (correction 28's hidden list keeps its scroll); shown on another, reached by Previous
  // or Next while it was hidden, it brings that card into view.
  const hiddenOn = useRef<string | null>(null);
  useEffect(() => {
    if (!paneOpen || !paneId) {
      hiddenOn.current = null;
      return;
    }
    if (listHidden) {
      if (hiddenOn.current === null) hiddenOn.current = paneId;
      return;
    }
    const was = hiddenOn.current;
    hiddenOn.current = null;
    if (was === paneId) return;
    // Compared as data, never built into a selector: the id is the route's own param.
    const el = Array.from(
      document.querySelectorAll<HTMLElement>("[data-discovery] [data-discovery-item]"),
    ).find(
      (e) =>
        e.dataset["discoveryItem"] === paneId && (!openLane || e.dataset["section"] === openLane),
    );
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [paneOpen, paneId, openLane, listHidden]);

  const toasts = (
    <>
      {(toast || shareToast) && (
        <div style={toastStyle(tier)}>
          <Toast>{toast ?? shareToast}</Toast>
        </div>
      )}
    </>
  );
  const laneStyle = (
    <style>
      {".dna-lane::-webkit-scrollbar,[data-lens-anchor]::-webkit-scrollbar{display:none}"}
    </style>
  );
  // Medium and expanded: the homes line and the applied chips. With the pane open the row moves
  // into the list column, so rail, list and pane start level (B9-SPEC Revision 2's pane line).
  const headerRow =
    homesLine || chipRow ? (
      <div
        data-header-row
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px 16px",
          ...(paneOpen ? { marginBottom: 16 } : null),
        }}
      >
        {homesLine}
        {chipRow}
      </div>
    ) : null;

  if (paneOpen)
    return (
      <div
        ref={paneRoot}
        data-discovery
        data-lens={lens}
        data-pane-open="1"
        // The feed column is a flex column of a definite height, so this wrapper fills it and the
        // pane's `height` of 100% is the column's own, less this top. The top is the collapsed
        // FacetRail strip's sticky inset, so rail, list and pane start level (the pane line).
        style={{
          flex: "1 1 0",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          paddingTop: "var(--space-4)",
        }}
      >
        {laneStyle}
        <Pane
          tier="expanded"
          list={
            <>
              {headerRow}
              {body}
            </>
          }
          title={paneTitle}
          paneWidth={520}
          height="100%"
          listHidden={listHidden}
          onToggleList={() => setListHidden((h) => !h)}
          onCopyLink={panePostId ? () => void copy(panePostId) : undefined}
          onShare={panePostId ? () => void share(panePostId) : undefined}
          onClose={closePane}
          closeLabel={"Back to " + (fromElsewhere ? toOrigin.origin.label : "Discovery")}
          selectedKey={paneId ?? undefined}
          {...stepping}
        >
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
            // B9-SPEC's compact line: the lens bar's row scrolls sideways at compact; the page never does.
            style={{
              visibility: scrolled ? "hidden" : "visible",
              minHeight: 64,
              overflowX: "auto",
              overflowY: "hidden",
              scrollbarWidth: "none",
              minWidth: 0,
            }}
          >
            {lensBar(true)}
          </div>
          <div
            data-first-row
            // B9-SPEC's compact line: one row of the homes and the Filters trigger. FacetRail's compact
            // Sheet is `contained`: absolute, with no z-index of its own, so the discovery faces
            // after this row (each `position: relative`) painted over it. A flex item's z-index
            // lifts the row, Sheet and all, above the lanes without becoming the Sheet's containing
            // block (G109).
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              zIndex: "var(--z-sheet)" as unknown as number,
            }}
          >
            {homesLine ?? <span />}
            <FacetRail
              tier="compact"
              axes={axes}
              value={railValue}
              onChange={onRail}
              onClear={clearFacets}
              label="Filters"
              open={browseOpen}
              onOpenChange={setBrowseOpen}
              trigger={({ open, onOpen, label }) => (
                <Button
                  variant="secondary"
                  size="sm"
                  aria-expanded={open}
                  aria-haspopup="dialog"
                  onClick={onOpen}
                  data-testid="filters"
                  style={{ minHeight: touch ? "var(--target-primary)" : 36 }}
                >
                  <Icon name="sliders-horizontal" size={16} />
                  {label}
                </Button>
              )}
            />
          </div>
          {/* B9-SPEC's compact line: the applied chips and Clear all, only when a facet is set. */}
          {chipRow && (
            <div
              data-applied-row
              style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}
            >
              {chipRow}
              <Button variant="ghost" size="sm" onClick={clearFacets}>
                Clear all
              </Button>
            </div>
          )}
        </>
      ) : (
        headerRow
      )}
      {body}
      {toasts}
    </div>
  );
}
