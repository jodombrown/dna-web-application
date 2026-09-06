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
