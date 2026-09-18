// The one dedupe every composed place line goes through (ruling 807).
//
// A place arrives in parts: the member's own words, the resolved place's name, the area it sits in,
// the city, and the host's country. Mapbox names the same thing in two of them often enough that a
// naive join prints it twice — `Labadi Villas, Labadi Villas, Accra`, seen by the founder on 17
// September against a Ghana area whose `place_name` and `area` are the same string. The Edge
// function already drops a repeat when it builds its own `label`; the surfaces composed from the
// parts directly did not, so the rule lives here and the row, the intent line and the card's where
// line all read it.
//
// Equality is on a fold: trimmed, accent-stripped, case-insensitive, whitespace collapsed, because
// the reader sees `Accra` and `accra` as one repeat. Containment is deliberately not a repeat —
// `Accra Mall` inside `Accra` names two different things and both belong on the line.

const foldPart = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** The parts that survive: trimmed, empties dropped, and a part equal to an earlier one dropped. */
export function placeParts(...parts: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const raw of parts) {
    const part = typeof raw === "string" ? raw.trim() : "";
    if (!part) continue;
    const key = foldPart(part);
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(part);
  }
  return kept;
}

/** The same parts as one line, `a, b, c`, with no part repeating another. */
export function placeLine(...parts: (string | null | undefined)[]): string {
  return placeParts(...parts).join(", ");
}
