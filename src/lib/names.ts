// Brief 14 (ruling 1317): names up to three then "and others", never a number. The projections
// already cut the list at three and answer `others` beside it (private.messenger_names); this joins
// what they answer, in words, the one way every Messenger surface reads it. Ported from the
// prototype's `B14.names` and `B14.upToThree`.

/** "A", "A and B", "A, B and C"; with others true, "A, B and C, and others". */
export function joinNames(names: readonly string[], others = false): string {
  const list = names.filter((n) => !!n);
  let out: string;
  if (list.length === 0) out = "";
  else if (list.length === 1) out = list[0] as string;
  else out = list.slice(0, -1).join(", ") + " and " + list[list.length - 1];
  if (others) out = out ? out + ", and others" : "others";
  return out;
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
