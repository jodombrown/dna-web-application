// The platform's one name-joiner (ruled in Chat, handoff 41-C): every surface that turns a list of
// names or words into a sentence calls `joinNames`, and no component keeps a copy. MemberCard's
// mutuals, Discovery's going names, places and homes, and the Messenger's member lines, read-by,
// reactions and request context all read it. Ruling 1317's names up to three then "and others"
// arrive from the projections already cut at three with `others` beside them
// (private.messenger_names); with `others` true the shape is Discovery's, the names comma-joined
// then one "and others" ("Ama, Kofi, Nana and others"), never ", and others".

/** "A", "A and B", "A, B and C"; with others true, "A and others", "A, B, C and others". */
export function joinNames(names: readonly string[], others = false): string {
  if (others) return names.length ? names.join(", ") + " and others" : "others";
  if (names.length <= 1) return names[0] ?? "";
  return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}

/** The first word of a member's name, for the "{first name}: …" lines the brief writes. */
export function firstName(name: string | null | undefined): string {
  if (!name) return "";
  return name.split(/\s+/)[0] || name;
}

/** Null or an array of strings, as the views type their Json name lists. */
export function nameList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
