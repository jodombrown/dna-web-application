#!/usr/bin/env bash
# Genuinely idempotent (ruling 147): ask whether the Pages project exists before creating it, and
# treat "already exists" (code 8000002) as the steady state rather than an error. A step that is
# red on every run teaches us to stop reading red. One script for both projects (handoff 40-B
# section 2): the member app's dna-web-application and the admin app's dna-admin.
#
# Usage: PROJECT=<name> CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... scripts/ensure-pages-project.sh
set -uo pipefail

PROJECT="${PROJECT:?PROJECT is required}"
: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required}"

code=$(curl -sS -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT" \
  || echo 000)
if [ "$code" = "200" ]; then
  echo "Pages project $PROJECT already exists; nothing to create."
  exit 0
fi
if [ "$code" != "404" ]; then
  echo "::notice::Could not read the Pages project (HTTP $code). Trying create and tolerating 'already exists'."
fi
# Hold wrangler's output back so a tolerated "already exists" never prints as an error.
out=$(bunx wrangler pages project create "$PROJECT" --production-branch=main 2>&1) && status=0 || status=$?
if [ "$status" -eq 0 ]; then
  echo "Created Pages project $PROJECT."
  exit 0
fi
if printf '%s\n' "$out" | grep -qE '8000002|already exists'; then
  echo "Pages project $PROJECT already exists; nothing to create."
  exit 0
fi
printf '%s\n' "$out"
exit "$status"
