#!/usr/bin/env bash
# Ruling 217: the gate depends only on what the project uses, and its gating steps retry.
#
# Every path the suites open in a browser or fetch over REST is confirmed to serve from the
# deployment before any suite runs, and every one of them is polled rather than fetched once.
# Run 86 returned 404 on a single unretried GET of /connect seconds after a fresh direct upload and
# took the whole matrix with it while every assertion that had run passed. The paths added after
# that fix were still single GETs, so the same failure was one propagation delay away on any of
# them. One place, one policy.
#
# Usage: BASE=https://<deployment> scripts/deployment-serves.sh
set -uo pipefail

BASE="${BASE:?BASE is required}"
BASE="${BASE%/}"
TRIES="${TRIES:-12}"
DELAY="${DELAY:-10}"
failed=0

# Polls one path until it answers 200, or gives up and marks the run failed. Never exits itself:
# the report names every path that did not serve, rather than the first.
serves() {
  local path="$1" out="${2:-/dev/null}" code=000 i
  for ((i = 1; i <= TRIES; i++)); do
    code=$(curl -sS -o "$out" -w '%{http_code}' --max-time 30 "$BASE$path" || echo 000)
    [ "$code" = "200" ] && break
    [ "$i" -lt "$TRIES" ] && sleep "$DELAY"
  done
  echo "GET $path -> $code"
  [ "$code" = "200" ] || failed=1
}

echo "Confirming $BASE serves every path the suites open"

serves /sign-in /tmp/sign-in.html
serves /connect /dev/null
# Brief 4B's routes, opened by tests/auth.cjs.
serves /reset
serves /reset/new
serves /password
# Brief 5's routes, opened by tests/onboarding.cjs.
serves /welcome
serves /where
serves /relationship
serves /strand/adinkra/mate-masie.svg
# Ruling 184's asset contract: every path in the table serves, so the redesign stays a file
# overwrite. favicon.ico is absent by the founder's 9 September edit and is deliberately not here.
serves /strand/logo.png
serves /favicon.png
serves /apple-touch-icon.png
serves /icon-192.png
serves /icon-512.png
serves /manifest.webmanifest /tmp/manifest.json

if [ "$failed" -ne 0 ]; then
  echo "::error::The deployment did not serve every path the suites open. Nothing was tested."
  exit 1
fi

# Content, not just status: a 200 that is not the app is the failure a status check cannot see.
grep -q '<title>DNA</title>' /tmp/sign-in.html || { echo "::error::/sign-in is not the app"; exit 1; }
grep -q 'manifest.webmanifest' /tmp/sign-in.html || { echo "::error::/sign-in links no manifest"; exit 1; }
grep -q '/icon-192.png' /tmp/manifest.json || { echo "::error::manifest names no 192 icon"; exit 1; }
grep -q '/icon-512.png' /tmp/manifest.json || { echo "::error::manifest names no 512 icon"; exit 1; }
! grep -q 'mate-masie' /tmp/manifest.json || { echo "::error::manifest still names the Adinkra mark"; exit 1; }

echo "The deployment serves every path the suites open."
