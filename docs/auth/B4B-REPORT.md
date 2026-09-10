# Brief 4B: authentication, reset and OAuth

Code report for the handoff of 9 September 2026 (`auth/HANDOFF.md`). Rulings created by the brief:
230 to 236. Governing: 62, 65, 67, 76, 90, 94, 97, 107, 140, 156, 180, 181, 184, 199, 222, 228, 240.

## 1. What shipped

| Surface                                            | Route                                | File                             |
| -------------------------------------------------- | ------------------------------------ | -------------------------------- |
| Sign in and sign up, with the additions grafted on | `/sign-in` (`?join=1` opens sign-up) | `src/routes/sign-in.tsx`         |
| Reset request                                      | `/reset`                             | `src/routes/reset.tsx`           |
| Reset landing                                      | `/reset/new`                         | `src/routes/reset_.new.tsx`      |
| Change password, signed in, inside the shell       | `/password`                          | `src/routes/_shell/password.tsx` |

Shared: `src/lib/auth-flow.ts` (provider calls, password rules, every string of copy),
`src/lib/recovery.ts` (ruling 240's handler), `src/components/dna/AuthSurface.tsx` (the anonymous
layout, the focusable alert, the separator, the provider buttons, the shared "Check your email"
state), `src/components/strand/Checkbox.tsx` (a Strand port, see G9).

Sign-in and sign-up keep the layout on main, including the founder's logo edits (ruling 184). The
additions are grafted after the Password field: the "Forgot your password?" link under the field,
then the existing submit, then the separator and the two provider buttons, then the existing
"New here? Create an account" line last. Nothing above the Password field moved, and the matrix
asserts it.

## 2. Ruling 240: the recovery link is no longer a silent sign-in

The failure was observed live: a valid recovery token reached the app, no route read it, and the
member landed on the Feed already signed in without ever being asked for a password.

Two things close it, and only one of them is code.

**Code.** `src/lib/recovery.ts` reads the recovery fragment off the URL _before_ the Supabase client
is created — `getSupabase()` calls it first — because `detectSessionInUrl` consumes and strips the
fragment, which is why the app could not previously tell a recovery sign-in from any other one. The
`PASSWORD_RECOVERY` auth event marks the same flag as a second reading. `RecoveryGate` in
`src/routes/__root.tsx` then holds every route at `/reset/new` until a password is set, so the
session the token created is not usable for anything else. The flag lives in `localStorage` with a
one-hour TTL, matching the life of a reset link, so a tab closed mid-flow cannot strand a member and
a second tab cannot walk around the gate. The matrix asserts the observed failure directly: a
recovery fragment landed on the Site URL renders `/reset/new`, the Feed never renders, and a
deliberate navigation to `/feed` is pulled back.

**Console.** Registering `/reset/new` as the recovery redirect removes the detour entirely. Section
4 lists it. The code half holds whether or not the console half is done.

## 3. The two things that had to be identical, not similar

**The reset "sent" states.** `/reset` never branches on what the server answered. The request is
fired and deliberately not awaited; the state reveals on a fixed 900ms delay, so a fast answer for
an unknown address and a slow one for a known address land at the same moment. Awaiting would have
made the reveal as slow as the answer, which is the same enumeration oracle in a different form.
GoTrue's `/recover` already returns the same 200 either way, so there is no server-side difference
left to hide. The matrix proves it rather than asserting it: the same address is submitted twice,
once against a 200 and once against a 400 delayed by 1500ms, and the rendered `outerHTML` of the
sent state must be byte-identical while the reveal times must agree.

**The sign-up "Check your email" state.** One render path, one component
(`CheckEmail` in `AuthSurface.tsx`), shared with `/reset`. The matrix runs sign-up twice, once
against a new address and once against GoTrue's obfuscated answer for an existing one, and compares
the markup byte for byte. Only a password the server refuses outright (too short, in a breach)
returns the member to the form.

## 4. Console changes to make, not code

The deployed origins are already registered in Supabase's URL configuration, Resend already carries
auth mail, and the Confirm sign up and Reset password templates are already installed. What remains:

1. **Redirect URLs.** Add `/reset/new` and `/sign-in` under each deployed origin to Supabase's URL
   configuration allow list — `https://app.diasporanetwork.africa/reset/new`,
   `https://app.diasporanetwork.africa/sign-in`, and the same two paths under the Pages preview
   origins. `/reset/new` is where `resetPasswordForEmail` sends the recovery token; `/sign-in` is
   where a provider round trip returns, including a cancelled one, because that is where the copy
   for a cancelled or failed provider lives.
2. **Reset password template.** Confirm its link target follows `{{ .RedirectTo }}` rather than a
   hardcoded Site URL, or the token keeps landing on `/` and the gate keeps doing work the console
   should be doing.
3. **Identity linking.** Confirm "link identities with the same verified email" is on and manual
   linking is off (ruling 234). This is the setting the shipped code assumes; nothing in the client
   forks on provider.
4. **Ruling 234's test.** Sign in to one address by both providers once, then run
   `SUPABASE_SERVICE_ROLE_KEY=… IDENTITY_EMAIL=… node tests/auth-identity.cjs`. Until then its three
   arms report UNPROVEN and are counted apart from the passes (ruling 228). See G11.

Nothing above is a code change and none of it is in this PR.

## 5. Claims in the copy that are now true rather than assumed

"Any other device signed in with the old password has been signed out" is made true by
`signOutOtherSessions`, which calls `signOut({ scope: "others" })` after the password is written.
`others` revokes every session but the one making the call, so this device stays signed in and every
other refresh token is dead. `/reset/new` and `/password` both do it, and the matrix asserts the
`others` scope actually reached the server on both.

`/password` also makes "That is not your current password" real. Supabase does not require the
current password to change it, so the route re-authenticates first and treats a failure as the
wrong-current-password state. Re-authenticating opens a fresh session for this device, which is why
`others` afterwards covers both the session this device held before and every real other device.

"One address is one account" is a project setting, not a client call, and is verified by
`tests/auth-identity.cjs` rather than assumed. See section 4 item 4 and G11.

## 6. Provider marks and wording

Placeholders, deliberately neutral rather than imitations of either trademark, at
`public/strand/marks/google.svg` and `public/strand/marks/linkedin.svg`. Both resolve by path and are
never imported as a module, so the official assets land as a file overwrite. The build ships
"Continue with Google" (which Google permits) and "Sign in with LinkedIn" on both surfaces, because
LinkedIn's terms favour that wording and carry no sign-up variant; confirm before shipping. Recorded
as G10. Ruling 232 holds: a provider mark appears on its own button and nowhere else, and OAuth
confers no tier.

## 7. Judgment calls, stated

- **No design extraction accompanied the handoff.** The brief said no spec and none was written, and
  the base layout is locked to the live sign-in on main rather than to an extraction, so ruling 90's
  stop-and-report condition does not apply: there was no extraction to arrive empty. The handoff's
  own measurements and verbatim copy are the visual contract, and it is normative. Recorded here
  rather than assumed away.
- **`/password` needed an entry point.** Ruling 230 asks for a signed-in change-password _path_, and
  a route nothing links to is not one. One "Change password" row was added to the account panel,
  beside "View my profile" and "Edit profile". No settings surface was built.
- **The forms carry `noValidate`.** The browser's own validation bubble would otherwise pre-empt the
  alert block on a malformed address, and the handoff makes that block the one place a message is
  announced.
- **A flagged field is styled from `aria-invalid`, not Strand's `error` prop.** Passing `error`
  prints the message a second time under the field, which the handoff forbids. One rule in
  `src/styles/strand.css` gives an `aria-invalid` input the danger border and nothing else.

## 8. Exit check

Ruling 61's matrix on the deployed URL, Chromium and WebKit, nine viewports including 1024 in both
orientations, both themes. Results per tier are recorded on the PR at merge time (ruling 199).

The auth arm is split the way `tests/block.cjs` and `tests/vocabulary.cjs` are split, and for the
same reason. `runAuthLayout` is the responsive half — every new surface rendered, the additions in
place, no horizontal overflow — and runs at all nine viewports in both themes. `runAuthFlows` is the
state half — the two identities the brief names, ruling 240's gate, and every error state — and runs
on the two representative layouts in both themes. The first shape of this arm ran all nine flows at
all eighteen combinations in both engines and was heading for the job's 45-minute timeout, which
would have produced no matrix at all: the failure ruling 237 named. The split is a change to how the
arm is scheduled, not to what it asserts.
