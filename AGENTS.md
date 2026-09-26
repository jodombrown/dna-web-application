## Roles in this repository

Claude Code is the sole developer of core code: schema, RLS, Edge Functions, routes, components, tests. Work is done on a feature branch and merged through a pull request after the responsive matrix passes on the deployed preview URL.

The founder removed this repository from Lovable on 25 September 2026 (ruling 1142). Every change to `main` arrives through a `claude/*` branch and a merge Chat has cleared.

## Git discipline

Fetch and rebase on `origin/main` before creating a branch, and again before pushing. Never rebase or amend published commits on `main`.

Never force push to `main` (ruling 541) `[absolute]`. Force-with-lease is permitted on a Claude working branch, and only after a rebase that was instructed, pinned to the exact prior head. Plain force, without a lease, is refused everywhere.

`gpt-engineer-app[bot]`, Lovable's app id `159125892`, is an identity that should never appear on `main` again. If a commit from it does, report it by SHA and by the paths it touched and stop: it is not rebased onto, worked around or resolved against, and it needs a ruling, not a fix. Never resolve any conflict by discarding either side silently.

## Framework note

This app is TanStack Start with SSR (Nitro, Cloudflare Pages preset), not a Vite SPA. Do not restructure it toward an SPA shape, and do not remove SSR entry points (`src/server.ts`, `src/start.ts`, `src/router.tsx`, `routeTree.gen.ts`) to make any tool's preview work.

Supabase holds Auth, Postgres, RLS, Storage, Edge Functions, and secrets. Cloudflare Pages hosts and deploys from GitHub Actions.

[absolute] Nothing outside a `claude/*` merge alters schema.
