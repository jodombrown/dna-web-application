// Strand `components/admin/DiaNote.jsx` at compile v1790885781186000 (proposals 40, rulings 1306
// and 1308, ratified 1309 and 1310; handoff 40-D items 1 and 5). Behavior unchanged. The card form
// of DIA's voice, ported beside DiaLine, the one-line member form, which it changes nothing in
// (extraction §8). `hasNumber` is exported beside it (1310). Dispositions are in
// docs/strand-ports/v1790885781186000.md.
import { useEffect, useState, type CSSProperties } from "react";

export type DiaStatement = {
  /** One sentence in words only: no digit, no number word (ruling 1301). */
  text: string;
  /** The block it rests on, e.g. "Mobilization", "By corridor". Rendered as a small caps link after the sentence. */
  block?: string | undefined;
  /** Called with `block`; the page scrolls its column so the block's top sits under the top bar. */
  onGo?: ((block: string) => void) | undefined;
};

export type DiaNoteProps = {
  /** Default "DIA's note". */
  title?: string | undefined;
  statements?: DiaStatement[] | undefined;
  /** Three ghost lines, role status. */
  loading?: boolean | undefined;
  /** Shown when there are no statements. Default "DIA has nothing to add for this period." */
  emptyText?: string | undefined;
  /** The fixed doctrine line; default "DIA suggests what might explain a change. It reads the same aggregates as this page and never a member. The numbers above are the record." */
  closing?: string | undefined;
  /** Default 720. */
  maxWidth?: number | string | undefined;
  style?: CSSProperties | undefined;
};

/** DiaNote (1306, 1308). A card holding DIA's statements for a page: a list, each statement followed by a small caps link naming the block it rests on, closed by the fixed doctrine line.
 *  This is the one sanctioned place for --glow-dia on a card (colors.css: the glow is DIA only; DiaLine remains the one-line form). Nothing else may carry it.
 *  Ruling 1301: a DIA statement never contains a number, in digits or in words. In development the component warns on the console for any statement that does; it does not rewrite it.
 *  States: loading (three ghost lines, role status, aria-label "Loading DIA's note"); statements (the list); none (one line, `emptyText`). Always closes with the doctrine line.
 *  Pointer: the block link underlines on hover and darkens to --ink; click calls onGo(block). Touch: the link is a 24px-tall inline target inside a line of text (--target-min; it sits in prose, so 44 would break the line). Both themes from tokens.
 *  Accessibility: region labelled by its title; list semantics; links are buttons (they move the page, they do not navigate) with aria-label "Go to <block>". */
const NUMBER_WORDS =
  /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|half|third|quarter|dozen|percent|per cent)\b/i;
/** True when a string contains a digit or a number word. Used by DiaNote's development warning. */
export const hasNumber = (s: string): boolean => /\d/.test(s) || NUMBER_WORDS.test(s);
const DOCTRINE =
  "DIA suggests what might explain a change. It reads the same aggregates as this page and never a member. The numbers above are the record.";
export function DiaNote({
  title = "DIA's note",
  statements = [],
  loading,
  emptyText = "DIA has nothing to add for this period.",
  closing = DOCTRINE,
  maxWidth = 720,
  style,
}: DiaNoteProps) {
  useEffect(() => {
    if (typeof console === "undefined") return;
    statements.forEach((s) => {
      if (s && hasNumber(s.text || ""))
        console.warn('DiaNote (1301): a DIA statement contains a number: "' + s.text + '"');
    });
  }, [statements]);
  const card: CSSProperties = {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: "var(--space-5)",
    maxWidth,
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: "var(--radius-l)",
    boxShadow: "var(--glow-dia)",
    fontFamily: "var(--font-sans)",
    color: "var(--ink)",
    ...style,
  };
  const h = (
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
      {title}
    </h3>
  );
  const close = (
    <p
      style={{
        margin: 0,
        paddingTop: 12,
        borderTop: "1px solid var(--line)",
        fontSize: 15,
        lineHeight: 1.45,
        color: "var(--ink-3)",
        textWrap: "pretty",
      }}
    >
      {closing}
    </p>
  );
  if (loading)
    return (
      <section role="status" aria-busy="true" aria-label="Loading DIA's note" style={card}>
        {h}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            aria-hidden="true"
            style={{
              height: 14,
              width: ["92%", "78%", "85%"][i],
              borderRadius: "var(--radius-s)",
              background: "var(--bg-sunken)",
            }}
          />
        ))}
        {close}
      </section>
    );
  return (
    <section aria-label={title} style={card}>
      {h}
      {statements.length ? (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {statements.map((s, i) => (
            <li key={i} style={{ margin: 0, fontSize: 17, lineHeight: 1.5, textWrap: "pretty" }}>
              <span>{s.text}</span>
              {s.block && (
                <>
                  {" "}
                  <BlockLink block={s.block} onGo={s.onGo} />
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, color: "var(--ink-2)" }}>
          {emptyText}
        </p>
      )}
      {close}
    </section>
  );
}
function BlockLink({ block, onGo }: { block: string; onGo: DiaStatement["onGo"] }) {
  const [hot, setHot] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onGo && onGo(block)}
      aria-label={"Go to " + block}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      style={{
        all: "unset",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        minHeight: 24,
        verticalAlign: "baseline",
        fontSize: 13,
        lineHeight: 1,
        letterSpacing: "var(--tracking-caps)",
        textTransform: "uppercase",
        fontWeight: 500,
        color: hot ? "var(--ink)" : "var(--ink-2)",
        textDecoration: hot ? "underline" : "none",
        textUnderlineOffset: 3,
        borderRadius: "var(--radius-s)",
        transition: "color var(--dur-default) var(--ease)",
      }}
    >
      {block}
    </button>
  );
}
