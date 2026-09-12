// Company email addresses, Deno mirror (ruling 387, Notion D489; supersedes ruling 385 / D487).
//
// Edge functions cannot import from src/, so this file mirrors src/lib/contact.ts value for value.
// Edit both together: the parity arm of tests/contact.cjs fails the build when they differ, and the
// scan arm fails it when an address literal appears anywhere but these two files. The DNA Email
// Directory in Notion is the source of truth for every address, its purpose and where it is
// published. Import as `import { NOTIFICATION_SENDER } from "../_shared/contact.ts"`.
//
// The domain is diasporanetwork.africa. The app subdomain is never an email domain.

/** Where the directory records an address as published. Mirrors the Notion "Published Where" options. */
export type Surface =
  | "site_footer"
  | "privacy_policy"
  | "terms_of_service"
  | "security_txt"
  | "in_app"
  | "stripe"
  | "resend_sender"
  | "supabase_auth_sender"
  | "dns_dmarc_rua";

/** Surfaces a member or a signed-out visitor can read, as opposed to a vendor console or DNS. */
export type MemberSurface = Extract<
  Surface,
  "site_footer" | "privacy_policy" | "terms_of_service" | "security_txt" | "in_app"
>;

/** Surfaces reachable signed out. An address published here is a phishing pretext to plan for. */
export type PublicSurface = Extract<
  Surface,
  "site_footer" | "privacy_policy" | "terms_of_service" | "security_txt"
>;

export type Direction = "receive" | "send" | "send_and_receive" | "machine";

/**
 * live: a Workspace alias on the hello@ mailbox, usable.
 * reserved: exists in the directory but refused by Google Workspace as an RFC 2142 reserved word;
 *   never published on any surface until it is wired (a Google Group is the planned shape).
 * retired: kept so a grep for it has one hit here; nothing sends from it and nothing may import it.
 */
export type Status = "live" | "reserved" | "retired";

export type ContactEntry = {
  readonly address: `${string}@diasporanetwork.africa`;
  readonly direction: Direction;
  readonly published: readonly Surface[];
  readonly status: Status;
};

/** Keyed by function, not by local part. Order follows the directory's Alphabetical view by address. */
export const CONTACT = {
  /** Reserved (RFC 2142). Misconduct, spam and abuse reports; routes to super admins by default. */
  abuse: {
    address: "abuse@diasporanetwork.africa",
    direction: "receive",
    published: ["terms_of_service", "in_app"],
    status: "reserved",
  },
  /** Supabase Auth (GoTrue) sender: password reset, confirmation, magic link, OAuth notices. */
  authSender: {
    address: "accounts@diasporanetwork.africa",
    direction: "send",
    published: ["supabase_auth_sender"],
    status: "live",
  },
  /** Developer and API-product inbound. Unpublished until the API product ships. */
  developer: {
    address: "api@diasporanetwork.africa",
    direction: "receive",
    published: [],
    status: "live",
  },
  /** Stripe receipts and invoices out; vendor invoices and disputes in. Never on a public surface. */
  billing: {
    address: "billing@diasporanetwork.africa",
    direction: "send_and_receive",
    published: ["stripe"],
    status: "live",
  },
  /** Company hiring. Unpublished until there is a role to fill. */
  careers: {
    address: "careers@diasporanetwork.africa",
    direction: "receive",
    published: [],
    status: "live",
  },
  /** DMARC aggregate (rua) report destination. Machine mail only. */
  dmarc: {
    address: "dmarc@diasporanetwork.africa",
    direction: "machine",
    published: ["dns_dmarc_rua"],
    status: "live",
  },
  /** Convene operations: organiser contact, ticket confirmations, event reminders. */
  events: {
    address: "events@diasporanetwork.africa",
    direction: "send_and_receive",
    published: ["site_footer", "in_app", "stripe"],
    status: "live",
  },
  /** General inbound and the public face contact. The one licensed mailbox every alias resolves into. */
  general: {
    address: "hello@diasporanetwork.africa",
    direction: "send_and_receive",
    published: ["site_footer"],
    status: "live",
  },
  /** Terms of Service contact, IP claims, takedown notices, law enforcement requests. */
  legal: {
    address: "legal@diasporanetwork.africa",
    direction: "receive",
    published: ["terms_of_service"],
    status: "live",
  },
  /** Retired legacy sender. Nothing sends from it; the lint rule refuses any import of this key. */
  legacySender: {
    address: "noreply@diasporanetwork.africa",
    direction: "send",
    published: [],
    status: "retired",
  },
  /** Resend sender for platform notifications: requests, attestations, reminders, digests. */
  notificationSender: {
    address: "notifications@diasporanetwork.africa",
    direction: "send",
    published: ["resend_sender"],
    status: "live",
  },
  /** Corridor partners, institutions, sponsors, facilitation counterparties. */
  partnerships: {
    address: "partnerships@diasporanetwork.africa",
    direction: "receive",
    published: ["site_footer"],
    status: "live",
  },
  /** Reserved (RFC 2142). Mail operations contact; default super admin routing satisfies the RFC. */
  postmaster: {
    address: "postmaster@diasporanetwork.africa",
    direction: "receive",
    published: [],
    status: "reserved",
  },
  /** Media enquiries, speaking and quote requests. */
  press: {
    address: "press@diasporanetwork.africa",
    direction: "receive",
    published: ["site_footer"],
    status: "live",
  },
  /** GDPR Article 13 controller contact: access, deletion, export and consent requests. */
  privacy: {
    address: "privacy@diasporanetwork.africa",
    direction: "receive",
    published: ["privacy_policy", "in_app"],
    status: "live",
  },
  /** Vulnerability reports and responsible disclosure; the contact of record in security.txt. */
  security: {
    address: "security@diasporanetwork.africa",
    direction: "receive",
    published: ["security_txt", "site_footer"],
    status: "live",
  },
  /** Member support and first response; the Reply-To on every transactional send. */
  support: {
    address: "support@diasporanetwork.africa",
    direction: "receive",
    published: ["site_footer", "in_app", "resend_sender", "supabase_auth_sender"],
    status: "live",
  },
  /** Internal distribution. Never on a public surface. */
  team: {
    address: "team@diasporanetwork.africa",
    direction: "receive",
    published: [],
    status: "live",
  },
  /** Moderation appeals, attestation disputes, identity tier escalation. In-app only by design. */
  trust: {
    address: "trust@diasporanetwork.africa",
    direction: "receive",
    published: ["in_app"],
    status: "live",
  },
} as const satisfies Record<string, ContactEntry>;

export type ContactKey = keyof typeof CONTACT;

type Entries = typeof CONTACT;
type PublishedOn<K extends ContactKey> = Entries[K]["published"][number];

/** Keys whose address is live and published on a surface a member can read. The only keys `mailto` accepts. */
export type SurfaceKey = {
  [K in ContactKey]: Entries[K]["status"] extends "live"
    ? [Extract<PublishedOn<K>, MemberSurface>] extends [never]
      ? never
      : K
    : never;
}[ContactKey];

/** Keys whose address is live and published where a signed-out visitor can read it. */
export type PublicKey = {
  [K in ContactKey]: Entries[K]["status"] extends "live"
    ? [Extract<PublishedOn<K>, PublicSurface>] extends [never]
      ? never
      : K
    : never;
}[ContactKey];

export type ContactAddress = Entries[ContactKey]["address"];

/** Every address, live or not, for the parity and scan tests and for a directory-wide audit. */
export const CONTACT_ADDRESSES: readonly ContactAddress[] = (
  Object.keys(CONTACT) as ContactKey[]
).map((key) => CONTACT[key].address);

const MEMBER_SURFACES: ReadonlySet<Surface> = new Set<Surface>([
  "site_footer",
  "privacy_policy",
  "terms_of_service",
  "security_txt",
  "in_app",
]);
const PUBLIC_SURFACES: ReadonlySet<Surface> = new Set<Surface>([
  "site_footer",
  "privacy_policy",
  "terms_of_service",
  "security_txt",
]);

/** Live and published where a member can read it, so a component may place it. */
export function isSurfaceKey(key: ContactKey): key is SurfaceKey {
  const entry: ContactEntry = CONTACT[key];
  return entry.status === "live" && entry.published.some((s) => MEMBER_SURFACES.has(s));
}

/** Live and published where a signed-out visitor can read it. */
export function isPublicKey(key: ContactKey): key is PublicKey {
  const entry: ContactEntry = CONTACT[key];
  return entry.status === "live" && entry.published.some((s) => PUBLIC_SURFACES.has(s));
}

/**
 * The href for a contact link. Takes a key, never an address, so a component cannot concatenate a
 * string, and only a key that is live and published on a member-readable surface type-checks.
 */
export function mailto(key: SurfaceKey, subject?: string): string {
  const base = `mailto:${CONTACT[key].address}`;
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base;
}

/** An outbound sender pairing. Reply-To is mandatory: a member who replies must reach a human. */
export type Sender = {
  readonly from: ContactAddress;
  readonly replyTo: ContactAddress;
  readonly displayName: string;
};

export const SENDER_DISPLAY_NAME = "DNA";

/** Supabase Auth mail: accounts@ with Reply-To support@ (ruling 387; ruling 385's no-reply sender is not built). */
export const AUTH_SENDER: Sender = {
  from: CONTACT.authSender.address,
  replyTo: CONTACT.support.address,
  displayName: SENDER_DISPLAY_NAME,
};

/** Platform notifications through Resend: notifications@ with Reply-To support@. */
export const NOTIFICATION_SENDER: Sender = {
  from: CONTACT.notificationSender.address,
  replyTo: CONTACT.support.address,
  displayName: SENDER_DISPLAY_NAME,
};

/** The From header value for a sender, e.g. for Resend's `from` field. */
export function fromHeader(sender: Sender): string {
  return `${sender.displayName} <${sender.from}>`;
}

/**
 * security.txt (RFC 9116). Expires twelve months from ruling 387; docs/security/SECURITY-TXT.md
 * records the renewal. The live arm of tests/contact.cjs fails once this date is in the past. No
 * Encryption field: there is no key to point at, and a dead line is worse than none.
 */
export const SECURITY_TXT_EXPIRES = "2027-09-11T00:00:00.000Z";

export const SECURITY_TXT_PATH = "/.well-known/security.txt";

export function securityTxt(): string {
  return [
    `Contact: mailto:${CONTACT.security.address}`,
    `Expires: ${SECURITY_TXT_EXPIRES}`,
    "Preferred-Languages: en",
    "",
  ].join("\n");
}
