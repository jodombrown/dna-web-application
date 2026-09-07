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
- Strand components are ported under `src/components/strand/`; tokens are in `src/styles.css`; assets under `public/strand/`.

## DNA build notes (Brief 2, shell, Feed, minimum notifications)

- Migrations: `20260907010000_b2_notifications.sql` (enum `notification_kind`, table `notifications` with a generated NOT NULL `c_category`, RLS for recipient, actor, admin, service role; `authenticated` may update `read_at` only), `20260907010100_b2_post_saves_reactions.sql` (`post_saves`, `post_reactions`, own-rows RLS, existence only, no counts), `20260907010200_b2_feed_read.sql` (view `feed`, `security_invoker`, so the audience predicate is posts RLS).
- Shell: `src/routes/_shell.tsx` mounts `AppShell` (AppHeader, PulseDock bar above 1024 and dock below, rail slots at the expanded tier) once; `/feed` (Home, `?lens=`), `/posts/:id` (quick-look overlay layered over Feed) and the five C stubs render inside it. The composer mounts once in the shell layout and opens from the header pill, the empty-state action, and the `c` key.
- Matrix: `tests/matrix.cjs` covers the composer, the shell, lenses, the overlay's scroll preservation, and the bell; `CHROME_PATH=/opt/pw-browsers/chromium` points it at a preinstalled Chromium.
