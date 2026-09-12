# security.txt: what is served, where it comes from, and when it needs renewing

Ruling 387 (Notion D489). `security.txt` (RFC 9116) is the contact of record for vulnerability
reports against the prototype. It is served at `/.well-known/security.txt` on every Cloudflare
Pages deployment, production and per-branch previews alike.

## Where it comes from

The file is not a static asset under `public/`. It is written by `securityTxt()` in
`src/lib/contact.ts` and returned by the worker entry `src/server.ts` before the request reaches
the TanStack router, as `text/plain; charset=utf-8`. That keeps the address in the one module the
scan in `tests/contact.cjs` allows, and it removes the dependence on how a dot-prefixed directory
survives the Vite copy and Cloudflare Pages' asset rules. There is no route file and no UI.

Fields served: `Contact` (the directory's security address, as a `mailto:`), `Expires`, and
`Preferred-Languages: en`. No `Encryption` field: there is no key to point at, and a dead line is
worse than none. No `Canonical` field: the file is served on every preview host as well as
production, and a canonical URL that names one of them would be false on the others.

## Renewal

RFC 9116 requires `Expires`, and a file past its date is invalid. The value is
`SECURITY_TXT_EXPIRES` in `src/lib/contact.ts` and, value for value, in
`supabase/functions/_shared/contact.ts`. It is set twelve months out from ruling 387:

| Set on            | Expires                    | Renew by       |
| ----------------- | -------------------------- | -------------- |
| 11 September 2026 | `2027-09-11T00:00:00.000Z` | 11 August 2027 |

To renew, move the date forward in both modules (the parity arm fails if only one changes) and
merge. The live arm of `tests/contact.cjs` fetches the deployed file and fails once the served
`Expires` is in the past, so an expired file cannot pass the Pages workflow unnoticed; that check
is the alarm, not a substitute for the calendar entry above.

## Posture

Prototype phase (ruling 140): a report that arrives through this contact is recorded with a
severity and tracked as an invite-boundary gate, never described as a leak or a breach, and never
treated as a merge blocker on its own.
