// Convene Pass 1, step 3: the form Convene supplies to Strand's Composer through `forms.convene`
// (P1-SPEC section 3, rulings 580, 621, 664 to 668, 671, 673, 676, 520, 521, 633, 634). Five named
// sections in order (the invitation, the moment, the door, the program, the send-off), then More
// options in place. Fields that do not apply are absent, never disabled. Every control is
// Strand's; Format and Tickets are the Segment part (673). Keys are un-prefixed here and stored as
// `convene.{key}` by the Composer (664); the read-back lines and the meta line are derived from
// the store and written back as fields of their own (starts_at, ends_at, doors_at, timezone,
// place_text, delivery_intent, expected_window_start, expected_window_end, meta) so publish_post
// reads instants and sentences, never words it has to parse.
//
// Ported from the packet's `convene/p1-convene-form.js` with two stand-ins replaced: place lookup
// is the place-resolve Edge Function (PR 2) and date parsing is src/lib/when.ts. The copy is the
// packet's confirmed content, byte for byte.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/strand/Button";
import { Chip } from "@/components/strand/Chip";
import type { ComposerFormProps } from "@/components/strand/Composer";
import { Icon } from "@/components/strand/Icon";
import { Input } from "@/components/strand/Input";
import { Segment } from "@/components/strand/Segment";
import { Select } from "@/components/strand/Select";
import { resolvePlace, type ResolvedPlace, type SuggestedPlace } from "@/lib/dia";
import type { Home } from "@/lib/homes";
import {
  dateInZone,
  instantFor,
  knownZone,
  parseTimeWords,
  parseWhen,
  timeInZone,
  windowFor,
  zoneAbbr,
} from "@/lib/when";

export type ConveneFormProps = ComposerFormProps & {
  /** The poster: `Presented by` reads their name and is not editable at launch (674). */
  author: { name: string };
  /** The member's homes (633); with none, the line and the chips are absent (690). */
  homes: Home[];
  /** The member's Spaces, for More options (Canon 6). */
  spaces: { id: string; name: string }[];
  /** The host's browser zone: an online-only event's zone until a first home exists (ruling owed 7). */
  browserTz: string;
};

type Format = "" | "in_person" | "online" | "hybrid";
type Lookup =
  { state: "idle" } | { state: "none" } | { state: "several"; places: SuggestedPlace[] };

const LOOKUP_PAUSE_MS = 400;
const MIN_QUERY = 3;

const CAPS = {
  fontSize: 13,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  fontWeight: 500,
  color: "var(--ink-3)",
};
const QUIET = { fontSize: 15, lineHeight: 1.45, color: "var(--ink-3)" };
const TEXTBTN = {
  all: "unset" as const,
  cursor: "pointer",
  minHeight: 44,
  display: "inline-flex",
  alignItems: "center",
  fontSize: 15,
  fontWeight: 500,
  color: "var(--ink)",
  textDecoration: "underline",
  textDecorationColor: "var(--line-strong)",
  textUnderlineOffset: 2,
  fontFamily: "var(--font-sans)",
};
const ROW_BOX = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap" as const,
  gap: 10,
  padding: "6px 12px",
  minHeight: 44,
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-m)",
  fontSize: 15,
  boxSizing: "border-box" as const,
};

const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());

export function ConveneForm({
  fields,
  setField,
  mine,
  tier,
  diaTag,
  reportValidity,
  author,
  homes,
  spaces,
  browserTz,
}: ConveneFormProps) {
  const v = (k: string): string => {
    const f = fields[k]?.value;
    return typeof f === "string" ? f : "";
  };
  const flag = (k: string): boolean => fields[k]?.value === true;
  const wide = tier !== "compact";
  const [more, setMore] = useState(false);
  const [windowMode, setWindowMode] = useState(!!v("when_window"));
  const [homeId, setHomeId] = useState<string | null>(null);
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  const session = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "s-" + Math.random().toString(36).slice(2),
  );

  // ---- the door -------------------------------------------------------------------------------
  const format = (v("format") || "") as Format;
  const physical = format === "in_person" || format === "hybrid";
  const virtual = format === "online" || format === "hybrid";
  const placeId = v("place_id");
  const query = v("place_query");
  const home = homes.find((h) => h.id === homeId) ?? null;
  const placeLabel = placeId
    ? [v("place_name"), v("place_area"), v("city")].filter(Boolean).join(", ")
    : "";
  const placeText = physical && !placeId && query.trim().length >= MIN_QUERY ? query.trim() : "";
  const link = v("link").trim();
  const linkTba = flag("link_tba");
  const linkOk = isUrl(link);

  // The zone is derived, never asked (SPEC 4): the place's for in person and hybrid, the host's
  // browser zone for online (ruling owed 7), and the browser's again while a place stands as words
  // only, because words carry no zone.
  const placeTz = v("place_tz");
  const tz: string | null = !format
    ? null
    : physical
      ? knownZone(placeTz)
        ? placeTz
        : browserTz
      : browserTz;
  const tzFromPlace = physical && !!placeId && knownZone(placeTz);

  // ---- the moment ------------------------------------------------------------------------------
  const whenWords = v("when");
  const parsed = useMemo(() => (whenWords.trim() ? parseWhen(whenWords) : null), [whenWords]);
  const parseFailed = !windowMode && whenWords.trim() !== "" && !(parsed && parsed.time);
  const date = parsed?.date ?? (v("when_date") || null);
  const time = parsed?.time ?? (v("when_time") || null);
  const zoneForInstants = tz ?? browserTz;
  const startsAt = !windowMode && date && time ? instantFor(date, time, zoneForInstants) : null;
  const endsTime = parseTimeWords(v("ends"));
  const endsRaw = startsAt && date && endsTime ? instantFor(date, endsTime, zoneForInstants) : null;
  // 634: no end invented, and an end has to follow its start; anything else is left unwritten.
  const endsAt = endsRaw && startsAt && endsRaw > startsAt ? endsRaw : null;
  const doorsTime = parseTimeWords(v("doors"));
  const doorsAt =
    startsAt && date && doorsTime ? instantFor(date, doorsTime, zoneForInstants) : null;
  const windowWords = windowMode ? v("when_window").trim() : "";
  const window = windowWords ? windowFor(windowWords) : null;

  const startDate = startsAt ? new Date(startsAt) : null;
  const whenText = windowMode
    ? windowWords
      ? windowWords + ", date to be confirmed"
      : ""
    : startDate
      ? dateInZone(startDate, zoneForInstants) +
        ", " +
        timeInZone(startDate, zoneForInstants) +
        (tz ? " " + zoneAbbr(tz, startDate) : "") +
        (endsAt ? " to " + timeInZone(new Date(endsAt), zoneForInstants) : "")
      : "";
  const whenSuffix = windowMode
    ? ""
    : tz
      ? tzFromPlace
        ? ", the time at the place"
        : physical
          ? ", time zone from the place once it is set"
          : ", your home time zone"
      : ", time zone from the place once it is set";

  // ---- where, intent, validity, meta ------------------------------------------------------------
  const whereText = placeId ? placeLabel : placeText;
  const where =
    format === "online"
      ? "Online"
      : format === "hybrid"
        ? (v("city") || whereText) + (v("city") || whereText ? " and online" : "Online")
        : whereText;
  const intent = !format
    ? ""
    : [
        physical && whereText ? "In person at " + whereText : null,
        virtual
          ? linkOk
            ? "Online, link with your ticket"
            : linkTba
              ? "Online, link to be announced"
              : null
          : null,
      ]
        .filter(Boolean)
        .join(" and ");
  const physicalOk = !!placeId || !!placeText;
  const virtualOk = linkOk || linkTba;
  const valid =
    !!v("title").trim() &&
    !!format &&
    (windowMode ? !!windowWords : !!startsAt) &&
    (!physical || physicalOk) &&
    (!virtual || virtualOk);
  const meta = ["Presented by " + author.name, whenText || null, where || null]
    .filter(Boolean)
    .join(" · ");

  // Reports on first render and on every change (664).
  useEffect(() => {
    reportValidity(valid);
  }, [valid, reportValidity]);

  // The derived fields publish_post reads (and the preview's meta, 671), written only when they
  // change so the store settles in one pass.
  const derived: Record<string, string> = {
    starts_at: startsAt ?? "",
    ends_at: endsAt ?? "",
    doors_at: doorsAt ?? "",
    timezone: tz ?? "",
    place_text: placeText,
    delivery_intent: intent ? intent + "." : "",
    expected_window_start: window?.start ?? "",
    expected_window_end: window?.end ?? "",
    meta,
  };
  const derivedKey = JSON.stringify(derived);
  useEffect(() => {
    for (const [k, val] of Object.entries(derived)) if (v(k) !== val) setField(k, val, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derivedKey]);

  // ---- place lookup, resolved never typed (633, SPEC 3) ----------------------------------------
  const pick = (p: ResolvedPlace) => {
    setField("place_id", p.place_id);
    setField("place_name", p.place_name);
    setField("place_area", p.area ?? "");
    setField("city", p.city ?? "");
    setField("country", p.country ?? "");
    setField("lng", String(p.lng));
    setField("lat", String(p.lat));
    setField("place_tz", p.timezone);
    setLookup({ state: "idle" });
  };
  const unpick = () => {
    for (const k of [
      "place_id",
      "place_name",
      "place_area",
      "city",
      "country",
      "lng",
      "lat",
      "place_tz",
    ])
      setField(k, "");
    setLookup({ state: "idle" });
  };
  const choose = async (s: SuggestedPlace) => {
    const r = await resolvePlace({
      action: "retrieve",
      q: query,
      session_token: session.current,
      mapbox_id: s.place_id,
    });
    if (r.state === "one") pick(r.place);
    else setLookup({ state: "none" });
  };
  useEffect(() => {
    if (!physical || placeId) return;
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      setLookup({ state: "idle" });
      return;
    }
    let live = true;
    const t = setTimeout(async () => {
      const r = await resolvePlace({
        action: "suggest",
        q,
        session_token: session.current,
        proximity: home ? { lng: home.lng, lat: home.lat } : null,
      });
      if (!live) return;
      if (r.state === "one") pick(r.place);
      else if (r.state === "several") setLookup({ state: "several", places: r.places });
      else setLookup({ state: "none" });
    }, LOOKUP_PAUSE_MS);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, placeId, physical, homeId]);

  // ---- parts -------------------------------------------------------------------------------------
  const lab = (text: string, key: string): ReactNode => (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {text}
      {v(key) !== "" && !mine(key) ? diaTag : null}
    </span>
  );
  const input = (
    key: string,
    label: string,
    extra: {
      placeholder?: string;
      hint?: ReactNode;
      type?: string;
      inputMode?: "url" | "numeric";
    } = {},
  ) => (
    <Input
      key={key}
      data-convene={key}
      label={lab(label, key)}
      value={v(key)}
      onChange={(e) => setField(key, e.target.value)}
      placeholder={extra.placeholder}
      hint={extra.hint}
      type={extra.type}
      inputMode={extra.inputMode}
    />
  );
  const seg = (key: string, label: string, opts: [string, string][]) => (
    <div key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink-2)" }}>{lab(label, key)}</div>
      <Segment
        label={label}
        options={opts.map(([value, text]) => ({ value, label: text }))}
        value={v(key) || undefined}
        onChange={(val) => setField(key, val)}
      />
    </div>
  );
  const section = (name: string, ...kids: ReactNode[]) => (
    <div
      key={name}
      data-convene-section={name}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div style={CAPS}>{name}</div>
      {kids}
    </div>
  );
  const grid = (...kids: ReactNode[]) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: wide ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)",
        gap: 12,
      }}
    >
      {kids}
    </div>
  );

  // The invitation. 674: Presented by reads the poster's name and is not editable at launch.
  const invitation = section(
    "The invitation",
    input("title", "Title"),
    <Input key="presented_by" label="Presented by" value={author.name} readOnly aria-readonly />,
  );

  // The moment.
  const moment = section(
    "The moment",
    windowMode ? (
      <div key="window" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {input("when_window", "Window", {
          placeholder: "November",
          hint: windowWords
            ? "The card will say: " + windowWords + ", date to be confirmed."
            : "A month or a season. The card says the date is to be confirmed.",
        })}
        <button
          type="button"
          data-convene="have-date"
          onClick={() => {
            setWindowMode(false);
            setField("when_window", "");
          }}
          style={TEXTBTN}
        >
          I have a date
        </button>
      </div>
    ) : (
      <div key="when" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {grid(
          input("when", "When", {
            placeholder: "Thu 16 Oct at 19:00",
            hint: parseFailed
              ? "That did not read as a date and time. Pick them below."
              : undefined,
          }),
          input("ends", "Ends", {
            placeholder: "Optional",
            hint:
              v("ends").trim() && !endsTime
                ? "That did not read as a time."
                : endsRaw && !endsAt
                  ? "Ends after it starts."
                  : undefined,
          }),
        )}
        {parseFailed &&
          grid(
            <Input
              key="when_date"
              data-convene="when_date"
              label="Date"
              type="date"
              value={v("when_date") || parsed?.date || ""}
              onChange={(e) => setField("when_date", e.target.value)}
            />,
            <Input
              key="when_time"
              data-convene="when_time"
              label="Time"
              type="time"
              value={v("when_time")}
              onChange={(e) => setField("when_time", e.target.value)}
            />,
          )}
        <button
          type="button"
          data-convene="give-window"
          onClick={() => {
            setWindowMode(true);
            setField("when", "");
            setField("when_date", "");
            setField("when_time", "");
          }}
          style={TEXTBTN}
        >
          No date yet? Give a window
        </button>
      </div>
    ),
    whenText ? (
      <div key="when-read" data-convene="when-line" style={QUIET}>
        {whenText + whenSuffix}
      </div>
    ) : null,
  );

  // The door: format first, then only what the format needs (621, 521).
  const placeBlock = placeId ? (
    <div
      key="place"
      data-convene="place-resolved"
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink-2)" }}>
        {lab("Place", "place_query")}
      </div>
      <div style={ROW_BOX}>
        <Icon name="map-pin" size={18} style={{ color: "var(--ink-3)", flex: "none" }} />
        <span style={{ flex: 1, minWidth: 0 }}>{placeLabel}</span>
        <Button variant="secondary" size="sm" onClick={unpick}>
          Change
        </Button>
      </div>
      {tzFromPlace && startDate && (
        <div style={QUIET}>Time zone {zoneAbbr(placeTz, startDate)}, from the place.</div>
      )}
      {tzFromPlace && !startDate && (
        <div style={QUIET}>Time zone {zoneAbbr(placeTz, new Date())}, from the place.</div>
      )}
    </div>
  ) : (
    <div
      key="place"
      data-convene="place-block"
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      {input("place_query", "Place", {
        placeholder: "A venue name",
        hint:
          lookup.state === "none"
            ? "No place found for that. It is kept as you wrote it."
            : lookup.state === "several"
              ? "Several places match. Pick one, or leave it as you wrote it."
              : undefined,
      })}
      {!query.trim() && homes.length > 0 && (
        <div data-convene="homes" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={QUIET}>Near one of your homes</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {homes.map((h) => (
              <Chip
                key={h.id}
                selected={homeId === h.id}
                onClick={() => setHomeId(homeId === h.id ? null : h.id)}
              >
                {h.city}
              </Chip>
            ))}
          </div>
        </div>
      )}
      {lookup.state === "several" && (
        <div
          role="listbox"
          aria-label="Places that match"
          style={{
            display: "flex",
            flexDirection: "column",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-m)",
            overflow: "hidden",
          }}
        >
          {lookup.places.map((p, i) => (
            <button
              key={p.place_id}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => void choose(p)}
              style={{
                all: "unset",
                boxSizing: "border-box",
                cursor: "pointer",
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                minHeight: 44,
                padding: "10px 12px",
                borderTop: i ? "1px solid var(--line)" : 0,
                fontFamily: "var(--font-sans)",
                fontSize: 15,
              }}
            >
              <span style={{ fontWeight: 500 }}>{p.place_name}</span>
              <span style={{ color: "var(--ink-3)" }}>
                {[p.area, p.city].filter(Boolean).join(", ")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
  const linkBlock = linkTba ? (
    <div
      key="link"
      data-convene="link-tba"
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink-2)" }}>Meeting link</div>
      <div style={ROW_BOX}>
        <Icon name="link" size={18} style={{ color: "var(--ink-3)", flex: "none" }} />
        <span style={{ flex: 1 }}>Link to be announced</span>
        <Button variant="secondary" size="sm" onClick={() => setField("link_tba", false)}>
          Add it now
        </Button>
      </div>
      <div style={QUIET}>People who are going get it by email when you add it.</div>
    </div>
  ) : (
    <div
      key="link"
      data-convene="link-block"
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      {input("link", "Meeting link", {
        placeholder: "https://",
        type: "url",
        inputMode: "url",
        hint:
          link && !linkOk
            ? "A link starts with http:// or https://"
            : "Shared with the ticket, never on the card.",
      })}
      <button
        type="button"
        data-convene="announce-later"
        onClick={() => {
          setField("link_tba", true);
          setField("link", "");
        }}
        style={TEXTBTN}
      >
        Announce the link later
      </button>
    </div>
  );
  const door = section(
    "The door",
    seg("format", "Format", [
      ["in_person", "In person"],
      ["online", "Online"],
      ["hybrid", "Hybrid"],
    ]),
    format ? (
      format === "hybrid" && tier === "expanded" ? (
        <div key="rows">{grid(placeBlock, linkBlock)}</div>
      ) : (
        <div key="rows" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {physical && placeBlock}
          {virtual && linkBlock}
        </div>
      )
    ) : null,
    intent ? (
      <div key="intent" data-convene="intent" style={QUIET}>
        {intent + "."}
      </div>
    ) : null,
  );

  // The program (675).
  const program = section(
    "The program",
    <div key="program-line" style={QUIET}>
      Your words above are the program. Media goes with them.
    </div>,
    grid(input("doors", "Doors open", { placeholder: "Optional" })),
  );

  // The send-off.
  const price = v("price_nature");
  const sendoff = section(
    "The send-off",
    seg("price_nature", "Tickets", [
      ["free", "Free"],
      ["paid", "Paid"],
      ["donation", "Donation"],
    ]),
    price === "paid" || price === "donation" ? (
      <div key="amounts" style={QUIET}>
        Amounts are set with ticketing, after this.
      </div>
    ) : null,
    <div key="posting" style={{ fontSize: 15, lineHeight: 1.45, color: "var(--ink-2)" }}>
      Posting publishes this event. It goes to the Feed and to Convene.
    </div>,
  );

  // More options, in place (580). Sponsor is absent until Brief 8's relationships (Pass 1 handoff,
  // ruling owed 3).
  const moreBlock = (
    <div key="more" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <button
        type="button"
        aria-expanded={more}
        data-convene="more"
        onClick={() => setMore((m) => !m)}
        style={{ ...TEXTBTN, gap: 6, textDecoration: "none" }}
      >
        <Icon
          name="chevron-down"
          size={18}
          style={{
            transform: more ? "rotate(180deg)" : "none",
            transition: "transform var(--dur-default) var(--ease)",
          }}
        />
        {more ? "Fewer options" : "More options"}
      </button>
      {more && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {input("capacity", "Capacity", {
            placeholder: "Optional",
            inputMode: "numeric",
            hint: "Only you see this. It never shows on the event.",
          })}
          <Select
            label="Space"
            data-convene="space"
            value={v("space_id")}
            onChange={(e) => setField("space_id", e.target.value)}
            options={[
              { value: "", label: "Not linked to a Space" },
              ...spaces.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
        </div>
      )}
    </div>
  );

  return (
    <div data-convene-form style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {invitation}
      {moment}
      {door}
      {program}
      {sendoff}
      {moreBlock}
    </div>
  );
}
