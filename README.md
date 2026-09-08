# DNA | Web Application (Sept 3, 2026)

we are going to start blank

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3be10572-d30e-4274-a37b-225b9cbd10fd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## DNA build notes (Brief 1, composer)

- Supabase project: `dgspjevjoblujcoljvkn` (canonical). Migrations live in `supabase/migrations/`; Edge Functions in `supabase/functions/` (`dia-compose-read`, `link-unfurl`, `media-upload`, all `verify_jwt`).
- Deploy: Cloudflare Pages, project `dna-web-application`, build output `dist/` (Nitro preset `cloudflare-pages`). `.github/workflows/pages.yml` deploys every branch as its own preview (`<branch>.dna-web-application.pages.dev`) and needs the repository secrets `CLOUDFLARE_API_TOKEN` (Pages:Edit) and `CLOUDFLARE_ACCOUNT_ID`. Alternatively connect the repo in the Cloudflare dashboard with build command `bun run build` and output directory `dist`.
- Client env (optional, defaults point at the canonical project): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Strand components are ported under `src/components/strand/`; tokens are in `src/styles/strand.css` (the extraction's five token files, verbatim); assets under `public/strand/`.

## DNA build notes (Brief 2, shell, Feed, minimum notifications)

- Migrations: `20260907010000_b2_notifications.sql` (enum `notification_kind`, table `notifications` with a generated NOT NULL `c_category`, RLS for recipient, actor, admin, service role; `authenticated` may update `read_at` only), `20260907010100_b2_post_saves_reactions.sql` (`post_saves`, `post_reactions`, own-rows RLS, existence only, no counts), `20260907010200_b2_feed_read.sql` (view `feed`, `security_invoker`, so the audience predicate is posts RLS).
- Shell: `src/routes/_shell.tsx` mounts `AppShell` once; `/feed` (Home, `?lens=`), `/posts/:id` and the five C stubs render inside it. The composer mounts once in the shell layout and opens from the composer entry, the floating entry, the empty-state action, and the `c` key.
- Matrix: `tests/matrix.cjs` covers the composer, the shell, lenses, in-place expansion, the bell, and the B2.1 targeted checks; `CHROME_PATH=/opt/pw-browsers/chromium` points it at a preinstalled Chromium.

## DNA build notes (B2.1 refinement, shell/Feed v3 and composer v3)

- Specs: `docs/shell/SPEC.md`, `docs/shell/LENS_BAR_SPEC.md`, `docs/composer/SPEC.md` (from the `app_diasporanetwork_africa-3` extraction). No schema change in this pass.
- Header is one row on every tier (`AppHeader`): expanded carries the five Cs inline (`PulseDock inline`) and an unlabelled Home icon; compact and medium carry the composer entry, which swaps to the compact `LensBar` past 72px of the Feed column's scroll (`src/lib/shell-scroll.tsx`).
- The document never scrolls inside the shell. Expanded has three independent scroll containers (`[data-scroller="left|feed|right"]`); compact and medium scroll the content under the header. The composer control and the LensBar pin as one block once the greeting has left the column, and release only once the greeting re-emerges beneath the pinned control; a lens change while pinned scrolls the column so the first item of the new list sits exactly beneath the block's measured height (ruling 109). The floating composer entry (handle behind the dock, wall tab on medium) shows while scrolling and hides 2.5s after.
- `/posts/:id` expands the same `PostCard` in place when reached from the Feed (history state `fromFeed`) and renders the expanded card as page content with "Back to Feed" on a direct landing (`src/lib/feed-view.ts`). `PostOverlay` is gone.
- Composer: `Sheet` slides 300ms both ways and stays mounted until the exit finishes; wheel and touchmove are cancelled at the scrim and consumed inside the dialog; a file drag over the fields column arms it before the drop. Drawer geometry: 80% bottom sheet under 640, 65% right drawer to 1024, min(1000, 100%) above.

## DNA build notes (Brief 3, member Profile)

- Migrations: `20260908090000_b3_profile_tables.sql` (`members` plus the per-section tables, the vocabulary tables seeded verbatim from SPEC.md, `member_visibility`, `member_follows`, `attestations`, the private `profile-media` bucket), `20260908090100_b3_profile_rls.sql` (the audience rules as row policies: `private.admit_section` decides owner, Everyone on DNA, My connections and Anchored per section; `anon` reads the core columns of a shared profile only; caps enforced by trigger), `20260908090200_b3_profile_rpcs.sql` (the sign-up trigger that mints a handle, `save_profile_section(section, payload)` as the one write path, `profile_view(p_handle, p_as_public)` as the one read projection, `profile_vocabularies()`, `public_attestations()`).
- Route: `src/routes/_shell/m.$handle.tsx` is `/m/:handle`; `?edit=1` is Edit profile mode, `?as=public` is the owner's View as public (the same anonymous projection). The shell steps aside for a signed-out visitor and for View as public, so the public page carries its own chrome and ships `noindex`. `ProfileSurface` (`src/components/dna/`) renders the three views; the Profile components are under `src/components/strand/`.
- Media: `media-upload` accepts a `slot` (`avatar`, `cover`) and writes to `profile-media/{member}/{slot}/`; the client reads through signed URLs, so storage RLS decides who sees a cover or portrait.
- Rulings 141, 142, 144 (`20260908150000_b3_rulings_141_142_144.sql`): `world_countries` is the Current location list (`members.current_country`), `countries` stays the African list for origin and heritage; on a signed-out surface a third party is named only when their own Share switch is on, otherwise they render as a role (`private.third_party_label`); accepting a connection request writes a `connection_accepted` notification to the requester by trigger, declining writes nothing; anon's grant on `members` is the core row only.
- Matrix: `tests/profile.cjs` runs the public page, the members-only prompt, the owner (switches, edit mode, View as public) and three visitor personas against the shared mock; `SPECIAL=profile` runs only those flows. Local preview of the Pages build: `bunx wrangler pages dev dist --port 4173`.
