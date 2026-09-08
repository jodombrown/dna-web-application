<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Roles in this repository

Claude Code is the sole developer of core code: schema, RLS, Edge Functions, routes, components, tests. Work is done on a feature branch and merged through a pull request after the responsive matrix passes on the deployed preview URL.

The founder makes occasional surface-level visual and content edits through Lovable on mobile. Those commit directly to `main` via two-way sync, outside the brief and prototype loop. Treat every `lovable-bot` commit as intentional.

## Sync discipline

Fetch and rebase on `origin/main` before creating a branch, and again before pushing. Never force-push, never rebase or amend published commits; it breaks Lovable's sync irrecoverably.

If a push is rejected or a conflict arises with a `lovable-bot` commit: preserve the founder's visual or content change, preserve the logic, structure, and types this repository's briefs established, and report the conflict and how you resolved it in the closing report. Never resolve a conflict by discarding either side silently.

If a `lovable-bot` commit has changed a surface that has an approved Claude Design prototype, say so explicitly in the closing report. That is a drift from the approved design and needs a ruling, not a fix.

## Framework note

This app is TanStack Start with SSR (Nitro, Cloudflare Pages preset), not a Vite SPA. Do not restructure it toward an SPA shape, and do not remove SSR entry points (`src/server.ts`, `src/start.ts`, `src/router.tsx`, `routeTree.gen.ts`) to make any tool's preview work.

Supabase holds Auth, Postgres, RLS, Storage, Edge Functions, and secrets. Cloudflare Pages hosts and deploys from GitHub Actions. Lovable hosts nothing and holds no credentials.

[absolute] Lovable never creates or alters schema. If a sync introduces a change under `supabase/`, revert it and report it.
