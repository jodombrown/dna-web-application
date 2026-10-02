// Strand `components/admin/MeasureCard.jsx` at compile v1790885781186000 (proposals 40, rulings
// 1306 and 1308, ratified 1309; handoff 40-D item 1). Behavior unchanged. Its error state carries
// the LoadError drawing, so LoadError stays in src/components/dna/ and is not ported (1309,
// extraction §10). Dispositions are in docs/strand-ports/v1790885781186000.md.
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { Sparkline } from "./Sparkline";
import { Button } from "./Button";

export type MeasureCardProps = {
  /** Caps label, e.g. "Mobilized members". Never a person's name. */
  label: string;
  /** The window and comparison in short, e.g. "Week to Thu 1 Oct, vs the week before". Always named. */
  window?: string | undefined;
  /** The figure, already formatted. A count, duration or ratio; never a score or composite. */
  value?: string | number | undefined;
  /** Sans unit beside the figure, e.g. "sent", "days, median". */
  unit?: string | undefined;
  /** Change in words against the named comparison: "Up 18 from 94", "Down 0.6 from 2.4", "No change from 112", "No comparison". Never coloured. */
  change?: string | undefined;
  /** Series for the Sparkline; omitted when flat. */
  trend?: number[] | undefined;
  /** [startLabel, endLabel] under the trend (size l and xl). */
  trendLabels?: [string, string] | undefined;
  /** One or two explanatory lines under the figure. */
  lines?: string[] | undefined;
  /** Small caps tag, e.g. "Intent" for RSVPs, follows, saves, hearts. */
  tag?: string | undefined;
  /** Figure rung: m = --display-l 32, l = --figure-l 40, xl = --figure-xl 56. Default m. */
  size?: "m" | "l" | "xl" | undefined;
  /** data | empty | notConnected | loading | error. Default data. */
  state?: "data" | "empty" | "notConnected" | "loading" | "error" | undefined;
  /** The empty state's own sentence, e.g. "No invites sent in this period." Required when state is empty. Never a zero. */
  emptyText?: string | undefined;
  /** Default "Not yet connected." Name what connects it, e.g. "Arrives with the mobilization ledger (12C). Not yet connected." */
  notConnectedText?: string | undefined;
  /** Error title; default "<label> could not load." */
  errorTitle?: string | undefined;
  /** Error body, e.g. "The corridor projection did not answer. The rest of the page is current." */
  errorText?: string | undefined;
  /** Renders "Try again" (Button secondary sm) in the error state. */
  onRetry?: (() => void) | undefined;
  /** Extra content under the lines (a BarList, StackedBars or DataTable). */
  children?: ReactNode;
  style?: CSSProperties | undefined;
};

/** MeasureCard (1306, 1308). One measure: caps label, window line (period and comparison, always named), figure with unit, change written in words
 *  (never colour-coded: Strand has no rung for a rise, and the words carry the comparison), optional trend (Sparkline, omitted when flat), optional lines, optional tag (e.g. "Intent").
 *  Rules: no score or composite, no person's name or photo, change always against a named comparison ("Up 18 from 94", "No comparison"), charts line and bar only.
 *  Figure sizes: "m" --display-l 32, "l" --figure-l 40, "xl" --figure-xl 56 (figure rungs, not heading rungs). Sans unit beside the serif figure.
 *  States: data; empty (keeps the label, shows `emptyText`, its own sentence, never a zero); notConnected (`notConnectedText`, --ink-3); loading (ghost figure, role status); error (--error border, role alert, `errorTitle`, `errorText`, "Try again" secondary sm when onRetry).
 *  Both themes from tokens. Pointer: none beyond Try again's hover. Touch: Try again is a 36px Button sm inside a 44px row. The card is a section labelled by its label. */
const SIZE: Record<NonNullable<MeasureCardProps["size"]>, [string, string]> = {
  m: ["var(--display-l)", "var(--display-l-lh)"],
  l: ["var(--figure-l)", "var(--figure-l-lh)"],
  xl: ["var(--figure-xl)", "var(--figure-xl-lh)"],
};
export function MeasureCard({
  label,
  window: win,
  value,
  unit,
  change,
  trend,
  trendLabels,
  lines = [],
  tag,
  size = "m",
  state = "data",
  emptyText,
  notConnectedText = "Not yet connected.",
  errorTitle,
  errorText,
  onRetry,
  children,
  style,
}: MeasureCardProps) {
  const [fs, lh] = SIZE[size] || SIZE.m;
  const isErr = state === "error";
  const card: CSSProperties = {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: "var(--space-5)",
    background: "var(--surface)",
    border: "1px solid " + (isErr ? "var(--error)" : "var(--line)"),
    borderRadius: "var(--radius-l)",
    fontFamily: "var(--font-sans)",
    color: "var(--ink)",
    minWidth: 0,
    ...style,
  };
  const head = (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        minHeight: 20,
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.4,
          letterSpacing: "var(--tracking-caps)",
          textTransform: "uppercase",
          fontWeight: 500,
          color: "var(--ink-3)",
        }}
      >
        {label}
      </h3>
      {tag && (
        <span
          style={{
            fontSize: 13,
            lineHeight: 1,
            letterSpacing: "var(--tracking-caps)",
            textTransform: "uppercase",
            fontWeight: 500,
            color: "var(--ink-2)",
            border: "1px solid var(--line-strong)",
            borderRadius: "var(--radius-s)",
            padding: "3px 6px",
          }}
        >
          {tag}
        </span>
      )}
    </header>
  );
  const line = (t: string) => (
    <p
      style={{
        margin: 0,
        fontSize: 15,
        lineHeight: 1.45,
        color: "var(--ink-2)",
        textWrap: "pretty",
      }}
    >
      {t}
    </p>
  );
  if (state === "loading")
    return (
      <section aria-label={label} role="status" aria-busy="true" style={card}>
        {head}
        <div
          aria-hidden="true"
          style={{
            height: parseInt(fs) || 32,
            width: "40%",
            borderRadius: "var(--radius-s)",
            background: "var(--bg-sunken)",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            height: 14,
            width: "70%",
            borderRadius: "var(--radius-s)",
            background: "var(--bg-sunken)",
          }}
        />
      </section>
    );
  if (state === "error")
    return (
      <section aria-label={label} role="alert" style={card}>
        {head}
        <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, fontWeight: 700 }}>
          {errorTitle || label + " could not load."}
        </p>
        {errorText && line(errorText)}
        {onRetry && (
          <div style={{ display: "flex", alignItems: "center", minHeight: 44 }}>
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </div>
        )}
      </section>
    );
  if (state === "empty" || state === "notConnected")
    return (
      <section aria-label={label} style={card}>
        {head}
        {win && (
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: "var(--ink-3)" }}>{win}</p>
        )}
        <p
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.45,
            color: state === "notConnected" ? "var(--ink-3)" : "var(--ink-2)",
            textWrap: "pretty",
          }}
        >
          {state === "empty" ? emptyText : notConnectedText}
        </p>
      </section>
    );
  return (
    <section aria-label={label} style={card}>
      {head}
      {win && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: "var(--ink-3)" }}>{win}</p>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <p
            style={{ margin: 0, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: fs,
                lineHeight: lh,
                fontWeight: 400,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.01em",
              }}
            >
              {value}
            </span>
            {unit && (
              <span style={{ fontSize: 15, lineHeight: 1.45, color: "var(--ink-2)" }}>{unit}</span>
            )}
          </p>
          {change && (
            <p
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.45,
                color: "var(--ink)",
                fontWeight: 500,
              }}
            >
              {change}
            </p>
          )}
        </div>
        {trend && trend.length > 1 && (
          <Sparkline
            values={trend}
            variant={size === "m" ? "small" : "default"}
            width={size === "m" ? 96 : 200}
            height={size === "m" ? 28 : 56}
            area={size !== "m"}
            startLabel={trendLabels && trendLabels[0]}
            endLabel={trendLabels && trendLabels[1]}
          />
        )}
      </div>
      {lines.filter(Boolean).map((t, i) => (
        <Fragment key={i}>{line(t)}</Fragment>
      ))}
      {children}
    </section>
  );
}
